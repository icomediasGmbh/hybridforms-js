import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clientFor } from '../helpers/client';
import { FakeServerHandle } from '../server/fakeServer';
import {
    FORM_ID,
    ITEM_ID,
    PDF_FILE_BODY,
    formFileNames,
    pdfFileSize
} from '../server/fixtures';
import { createHybridFormsServer } from '../server/hybridForms';

describe('FormsController', () => {
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

    it('.listForms() returns a paged envelope', async () => {
        const response = await clientFor(server).forms.listForms(FORM_ID);

        expect(response.response.forms).to.be.an('array');
        expect(response.response.forms).to.have.length(1);
        expect(response.response.totalCount).to.equal(1);
        expect(response.response.isPaged).to.equal(false);
    });

    it('.listForms() defaults to the minimal format', async () => {
        const response = await clientFor(server).forms.listForms(FORM_ID);

        expect(response.response.forms[0]).to.have.property('itemID');
        expect(response.response.forms[0]).to.not.have.property('fields');
    });

    it('.listForms() forwards params as query string', async () => {
        await clientFor(server).forms.listForms(FORM_ID, {
            format: 'full',
            status: 'Edit',
            hitsPerPage: 25
        });

        const [request] = server.requestsFor(
            `/api/app/1/formdefinitions/${FORM_ID}/forms`
        );
        expect(request.query.get('format')).to.equal('full');
        expect(request.query.get('status')).to.equal('Edit');
        expect(request.query.get('hitsPerPage')).to.equal('25');
    });

    it('.listForms() returns full records when format=full', async () => {
        const response = await clientFor(server).forms.listForms(FORM_ID, {
            format: 'full'
        });

        expect(response.response.forms[0]).to.have.property('fields');
    });

    it('.getForm() returns one form with its files', async () => {
        const response = await clientFor(server).forms.getForm(
            FORM_ID,
            ITEM_ID
        );

        expect(response.response.itemID).to.equal(ITEM_ID);
        expect(response.response.version).to.equal(11);
        expect(response.response.files).to.have.length(formFileNames.length);
    });

    it('.getForm() rejects with 404 for an unknown item', async () => {
        await expect(
            clientFor(server).forms.getForm(FORM_ID, 'no-such-item')
        ).rejects.toMatchObject({ status: 404 });
    });

    it('.listFormFiles() lists the attachments', async () => {
        const response = await clientFor(server).forms.listFormFiles(
            FORM_ID,
            ITEM_ID
        );

        expect(response.response.map((file) => file.filename)).to.deep.equal(
            formFileNames
        );
    });

    it('.getFormFile() returns the PDF as a blob', async () => {
        const response = await clientFor(server).forms.getFormFile(
            FORM_ID,
            ITEM_ID,
            'Basistest-Controls_.pdf'
        );

        expect(response.response.type).to.equal('application/pdf');
        expect(response.response.size).to.equal(pdfFileSize());
        expect(await response.response.text()).to.equal(PDF_FILE_BODY);
    });

    it('.getFormFile() rejects with 404 for an attachment that does not exist', async () => {
        await expect(
            clientFor(server).forms.getFormFile(FORM_ID, ITEM_ID, 'nope.pdf')
        ).rejects.toMatchObject({ status: 404 });
    });
});
