import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import { requestWithAuth, resolveRequest } from '../../src/lib/fetch';
import {
    FetchResponse,
    SigninResponse,
    XhrRequest
} from '../../src/types/types';
import { FakeServerHandle } from '../server/fakeServer';
import { OCTET_FILE_BODY } from '../server/fixtures';
import { createHybridFormsServer } from '../server/hybridForms';

let server: FakeServerHandle;
const url = (path: string): string => `${server.baseUrl}${path}`;

beforeAll(async () => {
    server = await createHybridFormsServer();
});

afterAll(async () => {
    await server.close();
});

beforeEach(() => {
    server.reset();
});

describe('resolveRequest()', () => {
    it('defaults to GET when no type is given', async () => {
        const response = await resolveRequest()({ url: url('/__test__/echo') });
        expect(JSON.parse(response.response).method).to.equal('GET');
    });

    it('parses the body when responseType is json', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/echo'),
            responseType: 'json'
        });
        expect(response.response.method).to.equal('GET');
    });

    it('returns a string when responseType is text', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/text'),
            responseType: 'text'
        });
        expect(response.response).to.equal('plain body');
    });

    it('returns a Blob when responseType is blob', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/binary'),
            responseType: 'blob'
        });
        expect(response.response.type).to.equal('application/octet-stream');
        expect(response.response.size).to.equal(OCTET_FILE_BODY.byteLength);
    });

    it('maps responseType arraybuffer onto Response.arrayBuffer()', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/binary'),
            responseType: 'arraybuffer'
        });
        expect(response.response).to.be.instanceOf(ArrayBuffer);
        expect(Buffer.from(response.response).toString('utf8')).to.equal(
            OCTET_FILE_BODY.toString('utf8')
        );
    });

    it('sends the request body and custom headers', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/echo'),
            type: 'POST',
            responseType: 'json',
            headers: { 'Content-Type': 'application/json', 'X-HF-Test': 'yes' },
            data: JSON.stringify({ hello: 'world' })
        });

        expect(response.response.method).to.equal('POST');
        expect(response.response.headers['x-hf-test']).to.equal('yes');
        expect(JSON.parse(response.response.body)).to.deep.equal({
            hello: 'world'
        });
    });

    it('reports the resolved status and url', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/echo?a=1'),
            responseType: 'json'
        });

        expect(response.status).to.equal(200);
        expect(response.statusText).to.equal('OK');
        expect(response.responseURL).to.equal(url('/__test__/echo?a=1'));
    });

    it('joins response headers with CRLF, one "name: value" per line', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/header'),
            responseType: 'json'
        });

        const lines = response.getAllResponseHeaders().split('\r\n');
        expect(lines).to.contain('x-hf-custom: first');
        expect(lines).to.contain('x-hf-version: HybridForms 10.7');
        expect(lines.every((line) => line.includes(': '))).to.equal(true);
    });

    it('rejects on a 4xx with the same response shape', async () => {
        await expect(
            resolveRequest()({
                url: url('/__test__/status/418'),
                responseType: 'json'
            })
        ).rejects.toMatchObject({
            status: 418,
            response: { requested: 418 }
        });
    });

    it('rejects on a 5xx', async () => {
        await expect(
            resolveRequest()({
                url: url('/__test__/status/503'),
                responseType: 'json'
            })
        ).rejects.toMatchObject({ status: 503 });
    });

    it('resolves for a 204, which carries no body', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/status/204')
        });
        expect(response.status).to.equal(204);
    });

    /**
     * `user`/`password` on an XhrRequest only flip `withCredentials`; the fetch
     * transport never turns them into an Authorization header the way XHR would.
     */
    it('sends no Authorization header for a request carrying user and password', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/echo'),
            responseType: 'json',
            user: 'someone',
            password: 'secret'
        });

        expect(response.response.headers.authorization).to.equal(undefined);
        expect(response.status).to.equal(200);
    });

    it('still succeeds when withCredentials is requested explicitly', async () => {
        const response = await resolveRequest()({
            url: url('/__test__/echo'),
            responseType: 'json',
            withCredentials: true
        });

        expect(response.status).to.equal(200);
    });

    it('returns the custom request function untouched when one is supplied', () => {
        const custom = vi.fn();
        expect(resolveRequest(custom as never)).to.equal(custom);
    });
});

describe('requestWithAuth()', () => {
    const token: SigninResponse = {
        access_token: 'abc.def.ghi',
        token_type: 'bearer'
    };

    it('adds an Authorization header built from the access token', async () => {
        const request = requestWithAuth(async () => token);

        const response = (await request({
            url: url('/__test__/echo'),
            responseType: 'json'
        })) as FetchResponse<{ headers: Record<string, string> }>;

        expect(response.response.headers.authorization).to.equal(
            'bearer abc.def.ghi'
        );
    });

    it('keeps headers the caller already set', async () => {
        const request = requestWithAuth(async () => token);

        const response = (await request({
            url: url('/__test__/echo'),
            responseType: 'json',
            headers: { 'X-HF-Test': 'kept' }
        })) as FetchResponse<{ headers: Record<string, string> }>;

        expect(response.response.headers['x-hf-test']).to.equal('kept');
        expect(response.response.headers.authorization).to.equal(
            'bearer abc.def.ghi'
        );
    });

    it('sends no Authorization header when getAccess resolves to null', async () => {
        const request = requestWithAuth(async () => null);

        const response = (await request({
            url: url('/__test__/echo'),
            responseType: 'json'
        })) as FetchResponse<{ headers: Record<string, string> }>;

        expect(response.response.headers.authorization).to.equal(undefined);
    });

    it('delegates to a custom request function instead of fetch', async () => {
        const custom = vi.fn(async (obj: XhrRequest) => ({
            status: 200,
            headers: obj.headers
        }));
        const request = requestWithAuth(async () => token, custom as never);

        await request({ url: url('/__test__/echo') });

        expect(custom).toHaveBeenCalledOnce();
        expect(custom.mock.calls[0][0].headers?.Authorization).to.equal(
            'bearer abc.def.ghi'
        );
    });

    it('calls getAccess once per request', async () => {
        const getAccess = vi.fn(async () => token);
        const request = requestWithAuth(getAccess);

        await request({ url: url('/__test__/echo') });
        await request({ url: url('/__test__/echo') });

        expect(getAccess).toHaveBeenCalledTimes(2);
    });

    /**
     * Documents current behaviour, not desired behaviour: `fetchRequest`
     * rejects on every non-2xx status, so the `status === 403` retry branch in
     * `requestWithAuth` is unreachable through the fetch transport. The server
     * route would answer 200 on a second hit — it never gets one.
     */
    it('does not retry a 403 when using the fetch transport', async () => {
        const request = requestWithAuth(async () => token);

        await expect(
            request({
                url: url('/__test__/forbidden-once'),
                responseType: 'json'
            })
        ).rejects.toMatchObject({ status: 403 });
        expect(server.state.forbiddenHits).to.equal(1);
    });

    it('retries once when a custom transport resolves with 403', async () => {
        const custom = vi.fn();
        custom.mockResolvedValueOnce({ status: 403 });
        custom.mockResolvedValueOnce({ status: 200, response: 'ok' });
        const request = requestWithAuth(async () => token, custom as never);

        const response = await request({ url: url('/__test__/echo') });

        expect(custom).toHaveBeenCalledTimes(2);
        expect(response.status).to.equal(200);
    });

    /**
     * `retryRequest` is a closure flag that is never reset, so the retry budget
     * is one per client instance rather than one per request. The first request
     * spends it and surfaces the retry's 403; every later 403 throws instead.
     */
    it('spends its only retry on the first 403 and surfaces the retry response', async () => {
        const custom = vi.fn().mockResolvedValue({ status: 403 });
        const request = requestWithAuth(async () => token, custom as never);

        const first = await request({ url: url('/__test__/echo') });

        expect(first.status).to.equal(403);
        expect(custom).toHaveBeenCalledTimes(2);
    });

    it('throws on a later 403 because the retry budget is never reset', async () => {
        const custom = vi.fn().mockResolvedValue({ status: 403 });
        const request = requestWithAuth(async () => token, custom as never);

        await request({ url: url('/__test__/echo') });

        await expect(request({ url: url('/__test__/echo') })).rejects.toThrow(
            'No access token available.'
        );
    });
});
