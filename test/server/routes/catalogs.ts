import { JsonExportCatalog } from '../../../src/types/catalogTypes';
import { FakeServerBuilder, Reply, json, text } from '../fakeServer';
import { catalogMeta } from '../fixtures';
import { HybridFormsState } from '../state';

const notFound = (name: string): Reply =>
    json({ error: `Catalog "${name}" not found` }, 404);

const toCsv = (catalog: JsonExportCatalog): string => {
    const columns = Object.keys(catalog.entries[0]?.Fields ?? {});
    const rows = catalog.entries.map((entry) =>
        columns.map((column) => entry.Fields[column] ?? '').join(';')
    );
    return [columns.join(';'), ...rows].join('\n');
};

const toXml = (catalog: JsonExportCatalog): string =>
    [
        '<?xml version="1.0" encoding="utf-8"?>',
        `<catalog name="${catalog.Name}">`,
        ...catalog.entries.map(
            (entry) =>
                `  <entry>${Object.entries(entry.Fields)
                    .map(([key, value]) => `<${key}>${value}</${key}>`)
                    .join('')}</entry>`
        ),
        '</catalog>'
    ].join('\n');

/** Applies the `$top`/`$skip`/`$select` subset of OData the real endpoint supports. */
const applyODataParams = (
    entries: Record<string, string>[],
    query: URLSearchParams
): Record<string, string>[] => {
    let results = entries;

    const skip = Number(query.get('$skip') ?? 0);
    if (skip > 0) {
        results = results.slice(skip);
    }

    const top = query.get('$top');
    if (top) {
        results = results.slice(0, Number(top));
    }

    const select = query.get('$select');
    if (select) {
        const columns = select.split(',').map((column) => column.trim());
        results = results.map((row) =>
            Object.fromEntries(
                columns
                    .filter((column) => column in row)
                    .map((c) => [c, row[c]])
            )
        );
    }

    return results;
};

const parseCatalogBody = (
    body: string,
    name: string
): JsonExportCatalog | null => {
    try {
        const parsed = JSON.parse(body) as Partial<JsonExportCatalog>;
        return {
            Name: parsed.Name ?? name,
            Version: parsed.Version ?? '1',
            Remark: parsed.Remark ?? '',
            entries: (parsed.entries ?? []).map((entry) => ({
                Fields: entry.Fields ?? {},
                Users: entry.Users ?? [],
                Groups: entry.Groups ?? []
            })),
            IgnoreColumns: parsed.IgnoreColumns ?? []
        };
    } catch {
        return null;
    }
};

export const registerCatalogRoutes = (
    builder: FakeServerBuilder,
    state: HybridFormsState
): void => {
    builder.add('GET', '/api/catalogs', () =>
        json(
            [...state.catalogs.values()].map((catalog) =>
                catalogMeta(catalog.Name, catalog.entries.length)
            )
        )
    );

    // Registered before `/:catalogName` so "export" is not read as a catalog name.
    builder.add('GET', '/api/catalogs/:catalogName/export', (ctx) => {
        const catalog = state.catalogs.get(ctx.params.catalogName);
        if (!catalog) {
            return notFound(ctx.params.catalogName);
        }
        switch (ctx.query.get('format')) {
            case 'json':
                return json(catalog);
            case 'xml':
                return {
                    status: 200,
                    body: toXml(catalog),
                    contentType: 'text/xml'
                };
            case 'csv':
                return text(toCsv(catalog));
            default:
                return text(toCsv(catalog));
        }
    });

    builder.add('GET', '/api/catalogs/:catalogName', (ctx) => {
        const catalog = state.catalogs.get(ctx.params.catalogName);
        if (!catalog) {
            return notFound(ctx.params.catalogName);
        }
        const results = applyODataParams(
            catalog.entries.map((entry) => entry.Fields),
            ctx.query
        );
        return json({
            d: {
                results,
                __count: catalog.entries.length,
                __next: null
            }
        });
    });

    builder.add('POST', '/api/catalogs/:catalogName', (ctx) => {
        const name = ctx.params.catalogName;
        if (state.catalogs.has(name)) {
            return json({ error: `Catalog "${name}" already exists` }, 409);
        }
        const catalog = parseCatalogBody(ctx.body, name);
        if (!catalog) {
            return json({ error: 'Malformed catalog body' }, 400);
        }
        state.catalogs.set(name, catalog);
        return json(
            catalog.entries.map((entry) => entry.Fields.ID ?? ''),
            201
        );
    });

    builder.add('PUT', '/api/catalogs/:catalogName', (ctx) => {
        const name = ctx.params.catalogName;
        if (!state.catalogs.has(name)) {
            return notFound(name);
        }
        const catalog = parseCatalogBody(ctx.body, name);
        if (!catalog) {
            return json({ error: 'Malformed catalog body' }, 400);
        }
        state.catalogs.set(name, catalog);
        return json(catalog.entries.map((entry) => entry.Fields.ID ?? ''));
    });

    builder.add('DELETE', '/api/catalogs/:catalogName', (ctx) => {
        const deleted = state.catalogs.delete(ctx.params.catalogName);
        return deleted
            ? json({ deleted: true })
            : notFound(ctx.params.catalogName);
    });
};
