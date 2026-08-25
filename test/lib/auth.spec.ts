import { afterEach, describe, expect, it } from 'vitest';
import { LoginMethodEnum } from '../../src/lib/auth';
import { clientFor } from '../helpers/client';
import { FakeServerHandle } from '../server/fakeServer';
import { PASSWORD, USER } from '../server/fixtures';
import { createHybridFormsServer } from '../server/hybridForms';

let server: FakeServerHandle;

afterEach(async () => {
    await server?.close();
});

describe('Authentication.getAccess() per login method', () => {
    it('builds a Basic header locally for Windows authentication', async () => {
        server = await createHybridFormsServer({
            loginMethod: 'WindowsAuthentication'
        });

        const auth = await clientFor(server).auth.getAccess();

        expect(auth.token_type).to.equal('Basic');
        expect(
            Buffer.from(auth.access_token, 'base64').toString('utf8')
        ).to.equal(`${USER}:${PASSWORD}`);
    });

    it('never calls the token endpoint for Windows authentication', async () => {
        server = await createHybridFormsServer({
            loginMethod: 'WindowsAuthentication'
        });

        await clientFor(server).auth.getUserData();

        expect(server.state.tokenRequests).to.equal(0);
    });

    it('requests a password grant for ADFS', async () => {
        server = await createHybridFormsServer({ loginMethod: 'ADFS' });

        await clientFor(server).auth.getAccess();

        const [request] = server.requestsFor('/api/app/token');
        const form = new URLSearchParams(request.body);
        expect(form.get('grant_type')).to.equal('password');
        expect(form.get('username')).to.equal(USER);
        expect(form.get('resource')).to.equal(`${server.baseUrl}/`);
    });

    it('requests a client_credentials grant for Azure AD', async () => {
        server = await createHybridFormsServer({ loginMethod: 'AzureAD' });

        await clientFor(server).auth.getAccess();

        const [request] = server.requestsFor('/api/app/token');
        const form = new URLSearchParams(request.body);
        expect(form.get('grant_type')).to.equal('client_credentials');
        expect(form.get('client_id')).to.equal(USER);
        expect(form.get('client_secret')).to.equal(PASSWORD);
    });

    it('derives the Azure AD scope by replacing the last segment with .default', async () => {
        server = await createHybridFormsServer({ loginMethod: 'AzureAD' });

        await clientFor(server).auth.getAccess();

        const [request] = server.requestsFor('/api/app/token');
        expect(new URLSearchParams(request.body).get('scope')).to.equal(
            'api://hybridforms-test/.default'
        );
    });

    it('rejects when the server refuses the credentials', async () => {
        server = await createHybridFormsServer({ loginMethod: 'ADFS' });

        await expect(
            clientFor(server, { password: 'wrong' }).auth.getAccess()
        ).rejects.toMatchObject({ status: 400 });
    });

    it('throws when ADFS gateway data carries no client id', async () => {
        server = await createHybridFormsServer({
            loginMethod: 'ADFS',
            gatewayOverrides: { clientID: null }
        });

        await expect(clientFor(server).auth.getAccess()).rejects.toThrow(
            'Cannot fetch HybridForms token.'
        );
    });

    it('throws for a login method the switch does not handle', async () => {
        // LoginMethodEnum.Basic is declared but has no case in getAccess().
        server = await createHybridFormsServer({
            loginMethod: LoginMethodEnum.Basic
        });

        await expect(clientFor(server).auth.getAccess()).rejects.toThrow(
            /trying to get login method/
        );
    });
});

describe('Authentication token caching', () => {
    it('fetches a new token once the cached one has expired', async () => {
        server = await createHybridFormsServer({
            loginMethod: 'ADFS',
            tokenLifetimeSeconds: -60
        });
        const client = clientFor(server);

        const first = await client.auth.getAccess();
        const second = await client.auth.getAccess();

        expect(second.access_token).to.not.equal(first.access_token);
        expect(server.state.tokenRequests).to.equal(2);
    });

    it('reads gateway data only once per client', async () => {
        server = await createHybridFormsServer({
            loginMethod: 'ADFS',
            tokenLifetimeSeconds: -60
        });
        const client = clientFor(server);

        await client.auth.getAccess();
        await client.auth.getAccess();

        expect(server.requestsFor('/api/app/gatewayData')).to.have.length(1);
    });
});
