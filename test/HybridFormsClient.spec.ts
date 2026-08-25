import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi
} from 'vitest';
import { createClient } from '../src';
import { XhrRequest } from '../src/types/types';
import { clientFor } from './helpers/client';
import { FakeServerHandle } from './server/fakeServer';
import { CLIENT_ID, PASSWORD, USER } from './server/fixtures';
import { createHybridFormsServer } from './server/hybridForms';

describe('createClient() authentication modes', () => {
    let server: FakeServerHandle;

    beforeAll(async () => {
        server = await createHybridFormsServer();
    });

    afterAll(async () => {
        await server.close();
    });

    beforeEach(() => {
        server.reset();
    });

    it('throws when no authentication method is configured', () => {
        expect(() =>
            createClient({ baseUrl: server.baseUrl, clientId: CLIENT_ID })
        ).to.throw('No authentication method provided.');
    });

    it('throws when only a user is given without a password', () => {
        expect(() =>
            createClient({
                baseUrl: server.baseUrl,
                clientId: CLIENT_ID,
                user: USER
            })
        ).to.throw('No authentication method provided.');
    });

    it('exposes every controller', () => {
        const client = clientFor(server);

        expect(client.auth).to.be.an('object');
        expect(client.formDefinitions).to.be.an('object');
        expect(client.forms).to.be.an('object');
        expect(client.simpleAPI).to.be.an('object');
        expect(client.catalogs).to.be.an('object');
    });

    it('splits a pre-issued token into type and value', async () => {
        const issued = await clientFor(server).auth.getAccess();
        server.clearRequests();

        const client = createClient({
            baseUrl: server.baseUrl,
            clientId: CLIENT_ID,
            token: `bearer ${issued.access_token}`
        });
        await client.auth.getUserData();

        const [request] = server.requestsFor('/api/app/userData');
        expect(request.headers.authorization).to.equal(
            `bearer ${issued.access_token}`
        );
    });

    it('never contacts the gateway when a token is supplied', async () => {
        const issued = await clientFor(server).auth.getAccess();
        server.clearRequests();

        await createClient({
            baseUrl: server.baseUrl,
            clientId: CLIENT_ID,
            token: `bearer ${issued.access_token}`
        }).auth.getUserData();

        expect(server.requestsFor('/api/app/gatewayData')).to.have.length(0);
    });

    it('rejects .getAccess() when built from a token rather than credentials', async () => {
        const client = createClient({
            baseUrl: server.baseUrl,
            clientId: CLIENT_ID,
            token: 'bearer whatever'
        });

        await expect(client.auth.getAccess()).rejects.toThrow(
            'No authentication method provided.'
        );
    });

    it('routes every request through a supplied xhr function', async () => {
        const xhr = vi.fn(async () => ({ status: 200, response: [] }));
        const client = createClient({
            baseUrl: server.baseUrl,
            clientId: CLIENT_ID,
            xhr: xhr as never
        });

        await client.formDefinitions.getFormDefinitions();

        expect(xhr).toHaveBeenCalledOnce();
        expect(server.requests).to.have.length(0);
    });

    it('sends no Authorization header in xhr mode', async () => {
        const calls: XhrRequest[] = [];
        const xhr = vi.fn(async (obj: XhrRequest) => {
            calls.push(obj);
            return { status: 200, response: [] };
        });

        await createClient({
            baseUrl: server.baseUrl,
            clientId: CLIENT_ID,
            xhr: xhr as never
        }).formDefinitions.getFormDefinitions();

        expect(calls[0].headers?.Authorization).to.equal(undefined);
    });

    it('prefers a token over credentials when both are configured', async () => {
        const issued = await clientFor(server).auth.getAccess();
        server.clearRequests();
        const tokenRequestsBefore = server.state.tokenRequests;

        await createClient({
            baseUrl: server.baseUrl,
            clientId: CLIENT_ID,
            user: USER,
            password: PASSWORD,
            token: `bearer ${issued.access_token}`
        }).auth.getUserData();

        expect(server.state.tokenRequests).to.equal(tokenRequestsBefore);
    });
});

describe('HybridFormsClient.request()', () => {
    let server: FakeServerHandle;

    beforeAll(async () => {
        server = await createHybridFormsServer();
    });

    afterAll(async () => {
        await server.close();
    });

    beforeEach(() => {
        // Keep issued tokens, but start each test with an empty request log so
        // `requestsFor()` cannot pick up an earlier test's call.
        server.clearRequests();
    });

    it('performs an unauthenticated request', async () => {
        const response = await clientFor(server).request({
            url: `${server.baseUrl}/api/app/gatewaydata`,
            type: 'GET',
            responseType: 'json'
        });

        expect(response.response.product).to.equal('HybridForms Server');
        expect(response.response.gatewayVersion).to.equal('10.7.0');
    });

    it('attaches no credentials, unlike .requestWithAuth()', async () => {
        const client = clientFor(server);

        await client.request({
            url: `${server.baseUrl}/__test__/echo`,
            responseType: 'json'
        });

        const [request] = server.requestsFor('/__test__/echo');
        expect(request.headers.authorization).to.equal(undefined);
    });

    it('.requestWithAuth() attaches credentials', async () => {
        const client = clientFor(server);

        await client.requestWithAuth({
            url: `${server.baseUrl}/__test__/echo`,
            responseType: 'json'
        });

        const [request] = server.requestsFor('/__test__/echo');
        expect(request.headers.authorization).to.match(/^bearer /);
    });
});
