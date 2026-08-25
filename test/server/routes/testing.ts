import { FakeServerBuilder, json, text } from '../fakeServer';
import { OCTET_FILE_BODY } from '../fixtures';
import { HybridFormsState } from '../state';

/**
 * Routes that exist only to drive `src/lib/fetch.ts` directly. They are
 * anonymous so `resolveRequest()` (which never attaches credentials) can
 * reach them.
 */
export const registerTestingRoutes = (
    builder: FakeServerBuilder,
    state: HybridFormsState
): void => {
    const echo = (method: string): void => {
        builder.add(
            method,
            '/__test__/echo',
            (ctx) =>
                json({
                    method: ctx.method,
                    headers: ctx.headers,
                    body: ctx.body,
                    query: Object.fromEntries(ctx.query.entries())
                }),
            true
        );
    };
    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].forEach(echo);

    builder.add(
        'GET',
        '/__test__/status/:code',
        (ctx) =>
            json(
                { requested: Number(ctx.params.code) },
                Number(ctx.params.code)
            ),
        true
    );

    builder.add('GET', '/__test__/text', () => text('plain body'), true);

    builder.add(
        'GET',
        '/__test__/binary',
        () => ({
            status: 200,
            body: OCTET_FILE_BODY,
            contentType: 'application/octet-stream'
        }),
        true
    );

    builder.add(
        'GET',
        '/__test__/header',
        () => ({
            status: 200,
            body: { ok: true },
            contentType: 'application/json',
            headers: {
                'X-HF-Custom': 'first',
                'X-HF-Version': 'HybridForms 10.7'
            }
        }),
        true
    );

    /** 403 on the first hit, 200 afterwards — exercises the retry branch. */
    builder.add(
        'GET',
        '/__test__/forbidden-once',
        () => {
            state.forbiddenHits += 1;
            return state.forbiddenHits === 1
                ? json({ error: 'Forbidden' }, 403)
                : json({ hits: state.forbiddenHits });
        },
        true
    );
};
