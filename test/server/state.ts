import { JsonExportCatalog } from '../../src/types/catalogTypes';
import { FormFullServerFormat } from '../../src/types/formTypes';
import { FakeServerOptions, ServerState } from './fakeServer';
import { ITEM_ID, buildForm, dummyCatalog } from './fixtures';

export interface HybridFormsState extends ServerState {
    loginMethod: string;
    tokenLifetimeSeconds: number;
    issuedTokens: Set<string>;
    tokenRequests: number;
    forms: Map<string, FormFullServerFormat>;
    catalogs: Map<string, JsonExportCatalog>;
    /** Counter backing the `/__test__/forbidden-once` route. */
    forbiddenHits: number;
    nextItemId: number;
    gatewayOverrides: Record<string, unknown>;
}

const seedForms = (): Map<string, FormFullServerFormat> =>
    new Map([[ITEM_ID, buildForm()]]);

const seedCatalogs = (): Map<string, JsonExportCatalog> =>
    new Map([[dummyCatalog.Name, structuredClone(dummyCatalog)]]);

export const createState = (options: FakeServerOptions): HybridFormsState => {
    const state: HybridFormsState = {
        loginMethod: options.loginMethod ?? 'ADFS',
        tokenLifetimeSeconds: options.tokenLifetimeSeconds ?? 3600,
        issuedTokens: new Set<string>(),
        tokenRequests: 0,
        forms: seedForms(),
        catalogs: seedCatalogs(),
        forbiddenHits: 0,
        nextItemId: 1,
        gatewayOverrides: options.gatewayOverrides ?? {},
        reset: () => {
            state.issuedTokens.clear();
            state.tokenRequests = 0;
            state.forms = seedForms();
            state.catalogs = seedCatalogs();
            state.forbiddenHits = 0;
            state.nextItemId = 1;
        }
    };
    return state;
};
