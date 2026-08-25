import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clientFor } from '../helpers/client';
import { FakeServerHandle } from '../server/fakeServer';
import { dummyCatalog } from '../server/fixtures';
import { createHybridFormsServer } from '../server/hybridForms';

const NEW_CATALOG = 'DummyCatalog_Test';

const catalogBody = (entries: Record<string, string>[]) => ({
    Name: NEW_CATALOG,
    entries: entries.map((Fields) => ({ Fields }))
});

describe('CatalogsController', () => {
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

    it('.listCatalogs() returns catalog metadata', async () => {
        const response = await clientFor(server).catalogs.listCatalogs();

        expect(response.response).to.have.length(1);
        expect(response.response[0].name).to.equal(dummyCatalog.Name);
        expect(response.response[0].count).to.equal(
            dummyCatalog.entries.length
        );
    });

    it('.getCatalog() returns entries in an OData envelope', async () => {
        const response = await clientFor(server).catalogs.getCatalog(
            dummyCatalog.Name
        );

        expect(response.response.d.results).to.have.length(3);
        expect(response.response.d.results[0]).to.deep.equal({
            ID: '1',
            KatalogText: 'gelb'
        });
        expect(response.response.d.__count).to.equal(3);
    });

    it('.getCatalog() forwards OData params', async () => {
        const response = await clientFor(server).catalogs.getCatalog(
            dummyCatalog.Name,
            { $top: 2, $skip: 1 }
        );

        expect(response.response.d.results).to.have.length(2);
        expect(response.response.d.results[0].ID).to.equal('2');
    });

    it('.getCatalog() honours $select', async () => {
        const response = await clientFor(server).catalogs.getCatalog(
            dummyCatalog.Name,
            { $select: 'KatalogText' }
        );

        expect(response.response.d.results[0]).to.deep.equal({
            KatalogText: 'gelb'
        });
    });

    it('.getCatalog() rejects with 404 for an unknown catalog', async () => {
        await expect(
            clientFor(server).catalogs.getCatalog('NoSuchCatalog')
        ).rejects.toMatchObject({ status: 404 });
    });

    it('.exportCatalog() returns a parsed object for format=json', async () => {
        const response = await clientFor(server).catalogs.exportCatalog(
            dummyCatalog.Name,
            { format: 'json' }
        );

        expect(response.response.Name).to.equal(dummyCatalog.Name);
        expect(response.response.entries).to.have.length(3);
    });

    it('.exportCatalog() returns a string for format=csv', async () => {
        const response = await clientFor(server).catalogs.exportCatalog(
            dummyCatalog.Name,
            { format: 'csv' }
        );

        expect(response.response).to.be.a('string');
        expect(response.response.split('\n')[0]).to.equal('ID;KatalogText');
    });

    it('.exportCatalog() returns a string for format=xml', async () => {
        const response = await clientFor(server).catalogs.exportCatalog(
            dummyCatalog.Name,
            { format: 'xml' }
        );

        expect(response.response).to.be.a('string');
        expect(response.response).to.contain('<KatalogText>gelb</KatalogText>');
    });

    it('.createCatalog() stores a new catalog and returns its ids', async () => {
        const response = await clientFor(server).catalogs.createCatalog(
            NEW_CATALOG,
            catalogBody([{ ID: '1', KatalogText: 'gelb' }])
        );

        expect(response.status).to.equal(201);
        expect(response.response).to.deep.equal(['1']);
    });

    it('.createCatalog() serialises objects and sets a JSON content type', async () => {
        await clientFor(server).catalogs.createCatalog(
            NEW_CATALOG,
            catalogBody([{ ID: '1', KatalogText: 'gelb' }])
        );

        const [request] = server.requestsFor(`/api/catalogs/${NEW_CATALOG}`);
        expect(request.headers['content-type']).to.equal('application/json');
        expect(JSON.parse(request.body).Name).to.equal(NEW_CATALOG);
    });

    it('.createCatalog() accepts a pre-serialised string body', async () => {
        const response = await clientFor(server).catalogs.createCatalog(
            NEW_CATALOG,
            JSON.stringify(catalogBody([{ ID: '7', KatalogText: 'grün' }]))
        );

        expect(response.response).to.deep.equal(['7']);
    });

    it('.createCatalog() rejects with 409 when the catalog already exists', async () => {
        await expect(
            clientFor(server).catalogs.createCatalog(
                dummyCatalog.Name,
                catalogBody([{ ID: '1', KatalogText: 'gelb' }])
            )
        ).rejects.toMatchObject({ status: 409 });
    });

    it('.updateCatalog() replaces the entries and uses PUT', async () => {
        const client = clientFor(server);
        await client.catalogs.createCatalog(
            NEW_CATALOG,
            catalogBody([{ ID: '1', KatalogText: 'gelb' }])
        );

        const response = await client.catalogs.updateCatalog(
            NEW_CATALOG,
            catalogBody([
                { ID: '1', KatalogText: 'gelb' },
                { ID: '2', KatalogText: 'rot' }
            ])
        );

        expect(response.response).to.deep.equal(['1', '2']);
        expect(
            server
                .requestsFor(`/api/catalogs/${NEW_CATALOG}`)
                .map((r) => r.method)
        ).to.deep.equal(['POST', 'PUT']);
    });

    it('.updateCatalog() is visible to a following .getCatalog()', async () => {
        const client = clientFor(server);
        await client.catalogs.createCatalog(
            NEW_CATALOG,
            catalogBody([{ ID: '1', KatalogText: 'gelb' }])
        );
        await client.catalogs.updateCatalog(
            NEW_CATALOG,
            catalogBody([{ ID: '9', KatalogText: 'lila' }])
        );

        const read = await client.catalogs.getCatalog(NEW_CATALOG);

        expect(read.response.d.results).to.deep.equal([
            { ID: '9', KatalogText: 'lila' }
        ]);
    });

    it('.updateCatalog() rejects with 404 for an unknown catalog', async () => {
        await expect(
            clientFor(server).catalogs.updateCatalog(
                'NoSuchCatalog',
                catalogBody([])
            )
        ).rejects.toMatchObject({ status: 404 });
    });

    it('.deleteCatalog() removes the catalog', async () => {
        const client = clientFor(server);
        await client.catalogs.createCatalog(
            NEW_CATALOG,
            catalogBody([{ ID: '1', KatalogText: 'gelb' }])
        );

        const response = await client.catalogs.deleteCatalog(NEW_CATALOG);

        expect(response.response.deleted).to.equal(true);
        await expect(
            client.catalogs.getCatalog(NEW_CATALOG)
        ).rejects.toMatchObject({ status: 404 });
    });

    it('.deleteCatalog() rejects with 404 for an unknown catalog', async () => {
        await expect(
            clientFor(server).catalogs.deleteCatalog('NoSuchCatalog')
        ).rejects.toMatchObject({ status: 404 });
    });
});
