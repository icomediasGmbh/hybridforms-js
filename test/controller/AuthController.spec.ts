import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clientFor } from '../helpers/client';
import { FakeServerHandle } from '../server/fakeServer';
import { CLIENT_ID, userData, userDataWithClient } from '../server/fixtures';
import { createHybridFormsServer } from '../server/hybridForms';

describe('AuthController against an ADFS server', () => {
    let server: FakeServerHandle;

    beforeAll(async () => {
        server = await createHybridFormsServer({ loginMethod: 'ADFS' });
    });

    afterAll(async () => {
        await server.close();
    });

    beforeEach(() => {
        server.reset();
    });

    it('.getAccess() exchanges credentials for a bearer token', async () => {
        const auth = await clientFor(server).auth.getAccess();

        expect(auth.token_type).to.equal('bearer');
        expect(auth.access_token).to.be.a('string');
        expect(auth.access_token.split('.')).to.have.length(3);
    });

    it('.getAccess() reads the login method from the gateway first', async () => {
        await clientFor(server).auth.getAccess();

        const paths = server.requests.map((request) => request.path);
        expect(paths[0].toLowerCase()).to.equal('/api/app/gatewaydata');
        expect(paths[1].toLowerCase()).to.equal('/api/app/token');
    });

    it('.getAccess() reuses a token that has not expired', async () => {
        const client = clientFor(server);

        const first = await client.auth.getAccess();
        const second = await client.auth.getAccess();

        expect(second.access_token).to.equal(first.access_token);
        expect(server.state.tokenRequests).to.equal(1);
    });

    it('.getUserData() returns every client the user may access', async () => {
        const response = await clientFor(server).auth.getUserData();

        expect(response.status).to.equal(200);
        expect(response.response.id).to.equal(userData.id);
        expect(response.response.accountName).to.equal(userData.accountName);
        expect(response.response.options).to.deep.equal({});
        expect(response.response.clients).to.have.length(2);
    });

    it('.getUserData() sends the bearer token it was issued', async () => {
        const client = clientFor(server);
        const auth = await client.auth.getAccess();
        server.clearRequests();

        await client.auth.getUserData();

        const [request] = server.requestsFor('/api/app/userData');
        expect(request.headers.authorization).to.equal(
            `bearer ${auth.access_token}`
        );
    });

    it('.getUserDataWithClient() narrows to the configured client', async () => {
        const response = await clientFor(server).auth.getUserDataWithClient();

        expect(response.response.clients).to.have.length(1);
        expect(response.response.clients?.[0].id).to.equal(Number(CLIENT_ID));
        expect(response.response.options.googleMapsApiKey).to.equal(
            userDataWithClient.options.googleMapsApiKey
        );
    });

    it('.getUserDataWithClient() is a POST', async () => {
        await clientFor(server).auth.getUserDataWithClient();

        const [request] = server.requestsFor(`/api/app/userData/${CLIENT_ID}`);
        expect(request.method).to.equal('POST');
    });
});
