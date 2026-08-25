import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SimpleAPIData } from '../../src/types/formTypes';
import { clientFor } from '../helpers/client';
import { FakeServerHandle } from '../server/fakeServer';
import { FORM_ID, USER } from '../server/fixtures';
import { createHybridFormsServer } from '../server/hybridForms';

const formData: SimpleAPIData = {
    title: 'A sample form created by the test suite',
    owner: USER,
    fields: {
        ma_name: 'Erwin Schrödinger',
        tab1_textfield_email: 'erwin.schroedinger@genius.net',
        checkboxv1: true,
        tab1_numeric: 34,
        tab1_datepicker: '2019-02-01T00:00:00Z',
        tab1_combobox_statisch: 'Selection 03'
    },
    repeatingUnits: {
        repeating1: [
            {
                operation: 'create',
                fields: { repeating_first_name: 'Row 1' }
            },
            { fields: { repeating_first_name: 'Row 2' } }
        ]
    },
    pictures: [
        {
            filename: 'hybridforms-icon.jpg',
            content: 'VGhpcyBpcyBub3QgYSBqcGVnLg=='
        }
    ],
    documents: [
        {
            filename: 'a-sample-textfile.txt',
            content: 'VGhpcyBpcyBqdXN0IHRleHQu',
            hideInPDF: true
        }
    ]
};

describe('SimpleAPIController', () => {
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

    it('.post() creates a form item and echoes the mapped list data', async () => {
        const response = await clientFor(server).simpleAPI.post(
            FORM_ID,
            formData
        );

        expect(response.status).to.equal(201);
        expect(response.response.itemID).to.be.a('string');
        expect(response.response.title).to.equal(formData.title);
        expect(response.response.listData.ma_name).to.equal(
            'Erwin Schrödinger'
        );
    });

    it('.post() sends JSON with the right content type', async () => {
        await clientFor(server).simpleAPI.post(FORM_ID, formData);

        const [request] = server.requestsFor(
            `/api/app/1/formdefinitions/${FORM_ID}/forms/sapi`
        );
        expect(request.method).to.equal('POST');
        expect(request.headers['content-type']).to.equal('application/json');
        expect(JSON.parse(request.body).fields.ma_name).to.equal(
            'Erwin Schrödinger'
        );
    });

    it('.post() creates a distinct item on each call', async () => {
        const client = clientFor(server);

        const first = await client.simpleAPI.post(FORM_ID, formData);
        const second = await client.simpleAPI.post(FORM_ID, formData);

        expect(second.response.itemID).to.not.equal(first.response.itemID);
    });

    it('.put() updates the item created by .post()', async () => {
        const client = clientFor(server);
        const created = await client.simpleAPI.post(FORM_ID, formData);

        const updated = await client.simpleAPI.put(
            FORM_ID,
            created.response.itemID,
            { fields: { ma_name: 'Erwin Schrödinger Update' } }
        );

        expect(updated.response.itemID).to.equal(created.response.itemID);
        expect(updated.response.listData.ma_name).to.equal(
            'Erwin Schrödinger Update'
        );
    });

    it('.put() leaves fields the payload does not mention untouched', async () => {
        const client = clientFor(server);
        const created = await client.simpleAPI.post(FORM_ID, formData);

        const updated = await client.simpleAPI.put(
            FORM_ID,
            created.response.itemID,
            { fields: { ma_name: 'Someone Else' } }
        );

        expect(updated.response.fields.tab1_numeric).to.equal(34);
    });

    it('.put() bumps the form version', async () => {
        const client = clientFor(server);
        const created = await client.simpleAPI.post(FORM_ID, formData);

        const updated = await client.simpleAPI.put(
            FORM_ID,
            created.response.itemID,
            { fields: {} }
        );

        expect(updated.response.version).to.equal(created.response.version + 1);
    });

    it('.put() rejects with 404 for an unknown item', async () => {
        await expect(
            clientFor(server).simpleAPI.put(FORM_ID, 'no-such-item', {
                fields: {}
            })
        ).rejects.toMatchObject({ status: 404 });
    });

    it('.post() is visible to .listForms()', async () => {
        const client = clientFor(server);
        await client.simpleAPI.post(FORM_ID, formData);

        const forms = await client.forms.listForms(FORM_ID);

        expect(forms.response.forms).to.have.length(2);
    });
});
