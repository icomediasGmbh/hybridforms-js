import {
    FakeServerBuilder,
    FakeServerHandle,
    FakeServerOptions,
    startFakeServer
} from './fakeServer';
import { authorize, registerAuthRoutes } from './routes/auth';
import { registerCatalogRoutes } from './routes/catalogs';
import { registerFormDefinitionRoutes } from './routes/formDefinitions';
import { registerFormRoutes } from './routes/forms';
import { registerTestingRoutes } from './routes/testing';
import { HybridFormsState, createState } from './state';

export type { HybridFormsState } from './state';

const register = (
    builder: FakeServerBuilder,
    state: HybridFormsState
): void => {
    registerTestingRoutes(builder, state);
    registerAuthRoutes(builder, state);
    registerFormDefinitionRoutes(builder, state);
    registerFormRoutes(builder, state);
    registerCatalogRoutes(builder, state);
};

/**
 * Starts an in-process stand-in for a HybridForms Core Server on an ephemeral
 * port. Each call gets its own state, so spec files run in parallel safely.
 */
export const createHybridFormsServer = async (
    options: FakeServerOptions = {}
): Promise<FakeServerHandle> =>
    await startFakeServer({
        options,
        state: createState(options),
        register: register as never,
        authorize: authorize as never
    });
