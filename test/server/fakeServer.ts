import {
    createServer,
    IncomingMessage,
    Server,
    ServerResponse
} from 'node:http';
import { AddressInfo } from 'node:net';

export type LoginMethod =
    'WindowsAuthentication' | 'BasicAuthentication' | 'ADFS' | 'AzureAD';

export interface FakeServerOptions {
    /** Drives which branch of `Authentication.getAccess()` the client takes. */
    loginMethod?: LoginMethod;
    /** Lifetime of issued JWTs. Pass a negative value to force a refresh. */
    tokenLifetimeSeconds?: number;
    /** Merged into the `/api/app/gatewayData` payload; `null` drops a key. */
    gatewayOverrides?: Record<string, unknown>;
}

export interface RecordedRequest {
    method: string;
    path: string;
    query: URLSearchParams;
    headers: Record<string, string | undefined>;
    body: string;
}

export interface RouteContext {
    params: Record<string, string>;
    query: URLSearchParams;
    body: string;
    headers: Record<string, string | undefined>;
    method: string;
}

export interface Reply {
    status: number;
    body?: unknown;
    contentType?: string;
    headers?: Record<string, string>;
}

type Handler = (ctx: RouteContext) => Reply;

interface Route {
    method: string;
    pattern: RegExp;
    keys: string[];
    handler: Handler;
    /** Routes reachable without an Authorization header. */
    anonymous?: boolean;
}

export const json = (body: unknown, status = 200): Reply => ({
    status,
    body,
    contentType: 'application/json'
});

export const text = (body: string, status = 200): Reply => ({
    status,
    body,
    contentType: 'text/plain'
});

/**
 * Compiles `/api/app/:clientId/formdefinitions` into a case-insensitive matcher.
 * The real HybridForms server runs on ASP.NET, whose routing ignores case —
 * `src/lib/auth.ts` asks for `/api/app/gatewayData` while other callers use
 * `/api/app/gatewaydata`, and both must work.
 */
const compile = (path: string): { pattern: RegExp; keys: string[] } => {
    const keys: string[] = [];
    const source = path
        .split('/')
        .map((segment) => {
            if (!segment.startsWith(':')) {
                return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
            keys.push(segment.slice(1));
            return '([^/]+)';
        })
        .join('/');
    return { pattern: new RegExp(`^${source}$`, 'i'), keys };
};

const readBody = async (req: IncomingMessage): Promise<string> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks).toString('utf8');
};

export class FakeServerBuilder {
    private readonly routes: Route[] = [];

    public add(
        method: string,
        path: string,
        handler: Handler,
        anonymous = false
    ): this {
        const { pattern, keys } = compile(path);
        this.routes.push({ method, pattern, keys, handler, anonymous });
        return this;
    }

    public match(
        method: string,
        path: string
    ): { route: Route; params: Record<string, string> } | null {
        for (const route of this.routes) {
            if (route.method !== method) {
                continue;
            }
            const match = route.pattern.exec(path);
            if (!match) {
                continue;
            }
            const params: Record<string, string> = {};
            route.keys.forEach((key, index) => {
                params[key] = decodeURIComponent(match[index + 1]);
            });
            return { route, params };
        }
        return null;
    }

    /** True when a path exists under some other verb — lets us answer 405 vs 404. */
    public hasPath(path: string): boolean {
        return this.routes.some((route) => route.pattern.test(path));
    }
}

export class FakeServerHandle {
    constructor(
        private readonly server: Server,
        public readonly baseUrl: string,
        public readonly requests: RecordedRequest[],
        public readonly state: ServerState
    ) {}

    public async close(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            this.server.close((error) => (error ? reject(error) : resolve()));
        });
    }

    /** Drops the request log but keeps issued tokens and stored data. */
    public clearRequests(): void {
        this.requests.length = 0;
    }

    /** Drops the request log and returns server state to its initial value. */
    public reset(): void {
        this.clearRequests();
        this.state.reset();
    }

    /** Requests recorded for a path, oldest first. Case-insensitive like the router. */
    public requestsFor(path: string): RecordedRequest[] {
        return this.requests.filter(
            (request) => request.path.toLowerCase() === path.toLowerCase()
        );
    }
}

export interface ServerState {
    reset: () => void;
    [key: string]: unknown;
}

export interface CreateFakeServerArgs {
    options: FakeServerOptions;
    state: ServerState;
    register: (builder: FakeServerBuilder, state: ServerState) => void;
    /** Returns null when the request is authorised, or a Reply to short-circuit. */
    authorize: (ctx: RouteContext, state: ServerState) => Reply | null;
}

export const startFakeServer = async ({
    state,
    register,
    authorize
}: CreateFakeServerArgs): Promise<FakeServerHandle> => {
    const builder = new FakeServerBuilder();
    register(builder, state);
    const requests: RecordedRequest[] = [];

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
        void (async () => {
            const url = new URL(req.url ?? '/', 'http://localhost');
            const body = await readBody(req);
            const headers: Record<string, string | undefined> = {};
            for (const [key, value] of Object.entries(req.headers)) {
                headers[key.toLowerCase()] = Array.isArray(value)
                    ? value.join(', ')
                    : value;
            }

            requests.push({
                method: req.method ?? 'GET',
                path: url.pathname,
                query: url.searchParams,
                headers,
                body
            });

            const matched = builder.match(req.method ?? 'GET', url.pathname);
            if (!matched) {
                send(
                    res,
                    json(
                        {
                            error: builder.hasPath(url.pathname)
                                ? 'Method not allowed'
                                : 'Not found',
                            path: url.pathname
                        },
                        builder.hasPath(url.pathname) ? 405 : 404
                    )
                );
                return;
            }

            const ctx: RouteContext = {
                params: matched.params,
                query: url.searchParams,
                body,
                headers,
                method: req.method ?? 'GET'
            };

            if (!matched.route.anonymous) {
                const denied = authorize(ctx, state);
                if (denied) {
                    send(res, denied);
                    return;
                }
            }

            try {
                send(res, matched.route.handler(ctx));
            } catch (error) {
                send(res, json({ error: (error as Error).message }, 500));
            }
        })();
    });

    await new Promise<void>((resolve) =>
        server.listen(0, '127.0.0.1', resolve)
    );
    const { port } = server.address() as AddressInfo;

    return new FakeServerHandle(
        server,
        `http://127.0.0.1:${port}`,
        requests,
        state
    );
};

const send = (res: ServerResponse, reply: Reply): void => {
    const headers: Record<string, string> = { ...reply.headers };
    let payload: Buffer;

    if (reply.body === undefined) {
        payload = Buffer.alloc(0);
    } else if (Buffer.isBuffer(reply.body)) {
        payload = reply.body;
    } else if (typeof reply.body === 'string') {
        payload = Buffer.from(reply.body, 'utf8');
    } else {
        payload = Buffer.from(JSON.stringify(reply.body), 'utf8');
    }

    if (reply.contentType) {
        headers['Content-Type'] = reply.contentType;
    }
    headers['Content-Length'] = String(payload.byteLength);

    res.writeHead(reply.status, headers);
    res.end(payload);
};
