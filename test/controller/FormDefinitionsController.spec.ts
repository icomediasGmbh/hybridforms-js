import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clientFor } from '../helpers/client';
import { FakeServerHandle } from '../server/fakeServer';
import {
    CLIENT_ID,
    FORM_ID,
    HTML_FILE_BODY,
    formDefinition,
    htmlFileSize,
    myGroups,
    secondFormDefinition
} from '../server/fixtures';
import { createHybridFormsServer } from '../server/hybridForms';

describe('FormDefinitionsController', () => {
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

    it('.getFormDefinitions() lists every definition for the client', async () => {
        const response =
            await clientFor(server).formDefinitions.getFormDefinitions();

        expect(response.status).to.equal(200);
        expect(response.response).to.have.length(2);
        expect(response.response.map((entry) => entry.formID)).to.deep.equal([
            formDefinition.formID,
            secondFormDefinition.formID
        ]);
    });

    it('.getFormDefinitions() scopes the path to the configured client', async () => {
        await clientFor(server).formDefinitions.getFormDefinitions();

        expect(
            server.requestsFor(`/api/app/${CLIENT_ID}/formdefinitions`)
        ).to.have.length(1);
    });

    it('.getFormDefinition() returns a single definition', async () => {
        const response =
            await clientFor(server).formDefinitions.getFormDefinition(FORM_ID);

        expect(response.response.id).to.equal(formDefinition.id);
        expect(response.response.version).to.equal(formDefinition.version);
        expect(response.response.files).to.have.length(
            formDefinition.files.length
        );
    });

    it('.getFormDefinition() rejects with 404 for an unknown form', async () => {
        await expect(
            clientFor(server).formDefinitions.getFormDefinition(
                'does-not-exist'
            )
        ).rejects.toMatchObject({ status: 404 });
    });

    it('.getMyGroups() returns the groups the user belongs to', async () => {
        const response =
            await clientFor(server).formDefinitions.getMyGroups(FORM_ID);

        expect(response.response).to.have.length(myGroups.length);
        expect(response.response[0].isGroup).to.equal(true);
    });

    it('.getFormDefinitionFile() returns a typed blob', async () => {
        const response = await clientFor(
            server
        ).formDefinitions.getFormDefinitionFile(FORM_ID, 'testForm.html');

        expect(response.response.type).to.equal('text/html');
        expect(response.response.size).to.equal(htmlFileSize());
        expect(await response.response.text()).to.equal(HTML_FILE_BODY);
    });

    it('.getFormDefinitionFile() rejects with 404 for an unknown file', async () => {
        await expect(
            clientFor(server).formDefinitions.getFormDefinitionFile(
                FORM_ID,
                'nope.html'
            )
        ).rejects.toMatchObject({ status: 404 });
    });

    it('.getFormDefinitionStructure() returns sections and mappings', async () => {
        const response =
            await clientFor(server).formDefinitions.getFormDefinitionStructure(
                FORM_ID
            );

        expect(response.response.sections).to.have.length(2);
        expect(response.response.ListDataMapping).to.deep.equal({
            ma_name: 'Name'
        });
        expect(response.response.legacyTemplate).to.equal(false);
    });
});
