import { FakeServerBuilder, Reply, RouteContext, json } from '../fakeServer';
import {
    ADFS_CLIENT_ID,
    AZURE_SCOPE,
    PASSWORD,
    USER,
    userData,
    userDataWithClient
} from '../fixtures';
import { makeJwt } from '../jwt';
import { HybridFormsState } from '../state';

const unauthorized = (reason: string): Reply =>
    json({ error: 'Unauthorized', reason }, 401);

/**
 * Mirrors what the real server accepts for the configured login method:
 * `Basic base64(user:password)` for Windows auth, or a bearer token this
 * server previously issued for the OAuth methods.
 */
export const authorize = (
    ctx: RouteContext,
    state: HybridFormsState
): Reply | null => {
    const header = ctx.headers.authorization;
    if (!header) {
        return unauthorized('missing Authorization header');
    }

    const separator = header.indexOf(' ');
    const scheme = header.slice(0, separator).toLowerCase();
    const credentials = header.slice(separator + 1);

    if (state.loginMethod === 'WindowsAuthentication') {
        if (scheme !== 'basic') {
            return unauthorized(`expected Basic auth, got "${scheme}"`);
        }
        if (
            Buffer.from(credentials, 'base64').toString('utf8') !==
            `${USER}:${PASSWORD}`
        ) {
            return unauthorized('bad basic credentials');
        }
        return null;
    }

    if (scheme !== 'bearer') {
        return unauthorized(`expected Bearer auth, got "${scheme}"`);
    }
    if (!state.issuedTokens.has(credentials)) {
        return unauthorized('unknown bearer token');
    }
    return null;
};

const issueToken = (state: HybridFormsState): Reply => {
    state.tokenRequests += 1;
    const accessToken = makeJwt(
        { sub: USER, nonce: `${state.tokenRequests}` },
        state.tokenLifetimeSeconds
    );
    state.issuedTokens.add(accessToken);
    return json({
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: state.tokenLifetimeSeconds,
        resource: 'hybridforms'
    });
};

export const registerAuthRoutes = (
    builder: FakeServerBuilder,
    state: HybridFormsState
): void => {
    builder.add(
        'GET',
        '/api/app/gatewayData',
        () => {
            const payload: Record<string, unknown> = {
                baseUrl: '/',
                clientID: ADFS_CLIENT_ID,
                gatewayVersion: '10.7.0',
                loginMethod: state.loginMethod,
                metaDataAddress: 'https://adfs.example.com/metadata',
                product: 'HybridForms Server',
                scope: AZURE_SCOPE,
                maxFileSizeMb: 50,
                preLoginScreen: false,
                ...state.gatewayOverrides
            };
            // A null override means "the real server omitted this key".
            for (const [key, value] of Object.entries(payload)) {
                if (value === null) {
                    delete payload[key];
                }
            }
            return json(payload);
        },
        true
    );

    builder.add(
        'POST',
        '/api/app/token',
        (ctx) => {
            const form = new URLSearchParams(ctx.body);

            if (state.loginMethod === 'AzureAD') {
                if (form.get('grant_type') !== 'client_credentials') {
                    return json({ error: 'unsupported_grant_type' }, 400);
                }
                if (
                    form.get('client_id') !== USER ||
                    form.get('client_secret') !== PASSWORD
                ) {
                    return json({ error: 'invalid_client' }, 400);
                }
                if (!form.get('scope')?.endsWith('/.default')) {
                    return json({ error: 'invalid_scope' }, 400);
                }
                return issueToken(state);
            }

            if (form.get('grant_type') !== 'password') {
                return json({ error: 'unsupported_grant_type' }, 400);
            }
            if (
                form.get('username') !== USER ||
                form.get('password') !== PASSWORD
            ) {
                return json({ error: 'invalid_grant' }, 400);
            }
            if (form.get('client_id') !== ADFS_CLIENT_ID) {
                return json({ error: 'invalid_client' }, 400);
            }
            return issueToken(state);
        },
        true
    );

    builder.add('GET', '/api/app/userData', () => json(userData));

    builder.add('POST', '/api/app/userData/:clientId', (ctx) => {
        const clientId = Number(ctx.params.clientId);
        const client = userDataWithClient.clients?.find(
            (entry) => entry.id === clientId
        );
        if (!client) {
            return json({ error: 'Unknown client' }, 404);
        }
        return json({ ...userDataWithClient, clients: [client] });
    });
};
