import { createClient } from '../../src';
import HybridFormsClient from '../../src/HybridFormsClient';
import { FakeServerHandle } from '../server/fakeServer';
import { CLIENT_ID, PASSWORD, USER } from '../server/fixtures';

/** A client authenticating against a running fake server with valid credentials. */
export const clientFor = (
    server: FakeServerHandle,
    overrides: Partial<Parameters<typeof createClient>[0]> = {}
): HybridFormsClient =>
    createClient({
        baseUrl: server.baseUrl,
        clientId: CLIENT_ID,
        user: USER,
        password: PASSWORD,
        ...overrides
    });
