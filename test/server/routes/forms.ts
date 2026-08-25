import { FormFullServerFormat } from '../../../src/types/formTypes';
import { FakeServerBuilder, Reply, json } from '../fakeServer';
import {
    FORM_ID,
    OCTET_FILE_BODY,
    PDF_FILE_BODY,
    buildForm,
    toMinimalForm
} from '../fixtures';
import { HybridFormsState } from '../state';

const notFound = (what: string): Reply =>
    json({ error: `${what} not found` }, 404);

/** Bodies for the attachments listed on a form item. */
const formFileBodies: Record<string, { body: string | Buffer; type: string }> =
    {
        'Basistest-Controls_.pdf': {
            body: PDF_FILE_BODY,
            type: 'application/pdf'
        },
        'hybridforms-icon.jpg': { body: OCTET_FILE_BODY, type: 'image/jpeg' },
        'a-sample-textfile.txt': {
            body: 'This is just text.',
            type: 'text/plain'
        }
    };

const applySimpleApiData = (
    form: FormFullServerFormat,
    payload: Record<string, unknown>
): FormFullServerFormat => {
    const fields = (payload.fields ?? {}) as Record<string, never>;
    const merged = { ...form.fields, ...fields };
    return {
        ...form,
        title: (payload.title as string) ?? form.title,
        fields: merged,
        // The server mirrors mapped fields into listData.
        listData: { ...form.listData, ...fields },
        pictures: (payload.pictures as never[]) ?? form.pictures,
        documents: (payload.documents as never[]) ?? form.documents
    };
};

export const registerFormRoutes = (
    builder: FakeServerBuilder,
    state: HybridFormsState
): void => {
    const base = '/api/app/:clientId/formdefinitions';

    builder.add('GET', `${base}/:formID/forms`, (ctx) => {
        if (ctx.params.formID !== FORM_ID) {
            return notFound('Form definition');
        }
        const all = [...state.forms.values()];
        const forms =
            ctx.query.get('format') === 'minimal' || !ctx.query.get('format')
                ? all.map(toMinimalForm)
                : all;
        return json({
            forms,
            queryDate: new Date().toISOString(),
            isPaged: false,
            page: 1,
            hitsPerPage: Number(ctx.query.get('hitsPerPage') ?? 100),
            totalCount: forms.length,
            totalPages: 1
        });
    });

    // Registered before `/forms/:itemID` so "sapi" is not read as an item id.
    builder.add('POST', `${base}/:formID/forms/sapi`, (ctx) => {
        if (ctx.params.formID !== FORM_ID) {
            return notFound('Form definition');
        }
        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(ctx.body);
        } catch {
            return json({ error: 'Malformed JSON body' }, 400);
        }
        const itemID = `00000000-0000-4000-8000-${String(state.nextItemId++).padStart(12, '0')}`;
        const created = applySimpleApiData(buildForm({ itemID }), payload);
        state.forms.set(itemID, created);
        return json(created, 201);
    });

    builder.add('PUT', `${base}/:formID/forms/sapi/:itemID`, (ctx) => {
        const existing = state.forms.get(ctx.params.itemID);
        if (!existing) {
            return notFound(`Form item "${ctx.params.itemID}"`);
        }
        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(ctx.body);
        } catch {
            return json({ error: 'Malformed JSON body' }, 400);
        }
        const updated = applySimpleApiData(
            { ...existing, version: existing.version + 1 },
            payload
        );
        state.forms.set(ctx.params.itemID, updated);
        return json(updated);
    });

    builder.add('GET', `${base}/:formID/forms/:itemID/files`, (ctx) => {
        const form = state.forms.get(ctx.params.itemID);
        return form ? json(form.files) : notFound('Form item');
    });

    builder.add(
        'GET',
        `${base}/:formID/forms/:itemID/files/:filename`,
        (ctx) => {
            const form = state.forms.get(ctx.params.itemID);
            if (!form) {
                return notFound('Form item');
            }
            const listed = form.files.some(
                (file) => file.filename === ctx.params.filename
            );
            const file = formFileBodies[ctx.params.filename];
            if (!listed || !file) {
                return notFound(`File "${ctx.params.filename}"`);
            }
            return { status: 200, body: file.body, contentType: file.type };
        }
    );

    builder.add('GET', `${base}/:formID/forms/:itemID`, (ctx) => {
        const form = state.forms.get(ctx.params.itemID);
        return form ? json(form) : notFound('Form item');
    });
};
