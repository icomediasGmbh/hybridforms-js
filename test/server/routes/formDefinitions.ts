import { FakeServerBuilder, Reply, json } from '../fakeServer';
import {
    FORM_ID,
    HTML_FILE_BODY,
    formDefinition,
    formDefinitionStructure,
    myGroups,
    secondFormDefinition
} from '../fixtures';
import { HybridFormsState } from '../state';

const definitions = [formDefinition, secondFormDefinition];

const notFound = (what: string): Reply =>
    json({ error: `${what} not found` }, 404);

/** Bodies for the definition files listed in `formDefinition.files`. */
const definitionFileBodies: Record<string, { body: string; type: string }> = {
    'testForm.html': { body: HTML_FILE_BODY, type: 'text/html' },
    'structure.json': {
        body: JSON.stringify(formDefinitionStructure),
        type: 'application/json'
    }
};

export const registerFormDefinitionRoutes = (
    builder: FakeServerBuilder,
    state: HybridFormsState
): void => {
    void state;
    const base = '/api/app/:clientId/formdefinitions';

    builder.add('GET', base, () => json(definitions));

    builder.add('GET', `${base}/:formID/mygroups`, (ctx) =>
        ctx.params.formID === FORM_ID
            ? json(myGroups)
            : notFound('Form definition')
    );

    builder.add('GET', `${base}/:formID/structure`, (ctx) =>
        ctx.params.formID === FORM_ID
            ? json(formDefinitionStructure)
            : notFound('Form definition')
    );

    builder.add('GET', `${base}/:formID/files/:filename`, (ctx) => {
        const definition = definitions.find(
            (entry) => entry.formID === ctx.params.formID
        );
        if (!definition) {
            return notFound('Form definition');
        }
        const file = definitionFileBodies[ctx.params.filename];
        if (!file) {
            return notFound(`File "${ctx.params.filename}"`);
        }
        return { status: 200, body: file.body, contentType: file.type };
    });

    builder.add('GET', `${base}/:formID`, (ctx) => {
        const definition = definitions.find(
            (entry) => entry.formID === ctx.params.formID
        );
        return definition ? json(definition) : notFound('Form definition');
    });
};
