import { UserResponse } from '../../src/types/authTypes';
import {
    CatalogListResponse,
    JsonExportCatalog
} from '../../src/types/catalogTypes';
import {
    ACL,
    Area,
    FormDefinitionResponse,
    GroupResponse,
    IFormDefinitionStructure,
    ServerFile
} from '../../src/types/formDefinitionTypes';
import {
    FileServer,
    FormFullServerFormat,
    FormMinimalServerFormat
} from '../../src/types/formTypes';

export const FORM_ID = '3ee88190-749a-4c65-8437-e392f6eabf71';
export const ITEM_ID = '3bd1644a-e841-4e17-84f2-8bf2b28b04f1';
export const CLIENT_ID = '1';

export const USER = 'rsi@icomedias.com';
export const PASSWORD = 'correct-horse-battery-staple';
export const ADFS_CLIENT_ID = 'hybridforms-test-client';
export const AZURE_SCOPE = 'api://hybridforms-test/user_impersonation';

const MODIFIED = '2024-05-06T09:12:33Z';

const acl = (id: number, title: string): ACL => ({
    id,
    title,
    upn: `${title.toLowerCase()}@icomedias.com`,
    email: `${title.toLowerCase()}@icomedias.com`,
    isGroup: false
});

const area: Area = {
    id: 3,
    clientId: 1,
    title: 'Testing',
    modified: MODIFIED,
    modifiedBy: USER
};

/** Bytes served by the file endpoints. Sizes are asserted on, so keep them stable. */
export const HTML_FILE_BODY = `<!doctype html>
<html lang="de">
    <head><meta charset="utf-8"><title>testForm</title></head>
    <body><div id="hf-form">Basistest Controls</div></body>
</html>
`;

/** A syntactically valid single-page PDF, small enough to inline. */
export const PDF_FILE_BODY = [
    '%PDF-1.4',
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj',
    'trailer<</Root 1 0 R>>',
    '%%EOF',
    ''
].join('\n');

export const OCTET_FILE_BODY = Buffer.from([
    0x48, 0x79, 0x62, 0x72, 0x69, 0x64, 0x46, 0x6f, 0x72, 0x6d, 0x73
]);

export const htmlFileSize = (): number => Buffer.byteLength(HTML_FILE_BODY);
export const pdfFileSize = (): number => Buffer.byteLength(PDF_FILE_BODY);

const clients = [
    {
        id: 1,
        title: 'icomedias',
        remark: 'Primary client',
        errorMail: 'errors@icomedias.com',
        acl: null,
        modified: MODIFIED,
        modifiedBy: USER,
        role: 'admin'
    },
    {
        id: 2,
        title: 'Demo',
        remark: 'Demo client',
        errorMail: 'errors@icomedias.com',
        acl: null,
        modified: MODIFIED,
        modifiedBy: USER,
        role: 'user'
    }
];

/** `GET /api/app/userData` — every client the user may access, no client options. */
export const userData: UserResponse = {
    displayName: 'Raphael Stärk',
    accountName: USER,
    companyName: 'icomedias GmbH',
    id: '135',
    firstname: 'Raphael',
    lastname: 'Stärk',
    email: USER,
    features: {},
    sigCrypto: 'none',
    options: {},
    clients,
    roamingData: { subscribedFormdefinitions: [FORM_ID] }
};

/** `POST /api/app/userData/{clientId}` — scoped to one client, with its options. */
export const userDataWithClient: UserResponse = {
    ...userData,
    options: {
        googleMapsApiKey: 'test-google-maps-key',
        maxFileSizeMb: 50
    },
    clients: [clients[0]]
};

const definitionFiles: ServerFile[] = [
    'testForm.html',
    'testForm.css',
    'testForm.js',
    'structure.json',
    'stages.json'
].map((filename, index) => ({
    filename,
    size: filename === 'testForm.html' ? htmlFileSize() : 1024 + index,
    contentType: filename.endsWith('.html')
        ? 'text/html'
        : filename.endsWith('.css')
          ? 'text/css'
          : filename.endsWith('.js')
            ? 'application/javascript'
            : 'application/json',
    modified: MODIFIED,
    version: 11,
    fileID: 100 + index,
    isReachoutExcluded: false
}));

export const formDefinition: FormDefinitionResponse = {
    id: 38,
    formID: FORM_ID,
    version: 11,
    title: 'Basistest Controls',
    description: 'Form definition used by the hybridforms-js test suite',
    culture: 'de-AT',
    archiveDays: null,
    approvedSyncDays: 30,
    deleteDays: 90,
    deleteEditDays: null,
    deleteGroupDays: null,
    purgeDeletedDays: 365,
    files: definitionFiles,
    flags: { isTemplate: false, allowOffline: true },
    created: MODIFIED,
    createdBy: USER,
    modified: MODIFIED,
    modifiedBy: USER,
    areaId: area.id,
    useACL: [acl(1, 'Everyone')],
    editACL: [acl(2, 'Editors')],
    adminACL: [acl(3, 'Admins')],
    readonlyACL: [],
    role: 'admin',
    isExtendedReader: false,
    area,
    subtitle: 'Controls',
    info: {
        version: '11',
        date: MODIFIED,
        minAppVersion: '10.0.0',
        minServerVersion: '10.7.0',
        conditionsOnRender: true
    },
    isReachout: false,
    reachoutUrl: '',
    mayUse: true,
    stageDefinition: {
        stages: {
            S1: {
                key: 'S1',
                label: 'Erfassung',
                first: true,
                next: { workflows: [], stage: 'S2' },
                appKioskMode: false,
                stateChanges: {},
                expiry: []
            },
            S2: {
                key: 'S2',
                label: 'Freigabe',
                first: false,
                next: { workflows: [] },
                appKioskMode: false,
                stateChanges: {},
                expiry: []
            }
        }
    }
};

/** A second definition, so list endpoints return more than one entry. */
export const secondFormDefinition: FormDefinitionResponse = {
    ...formDefinition,
    id: 39,
    formID: '9f1c2d5e-0a4b-4c8d-9e3f-1a2b3c4d5e6f',
    title: 'Zweitformular',
    files: []
};

export const myGroups: GroupResponse[] = [
    'Innendienst',
    'Aussendienst',
    'Technik',
    'Verwaltung'
].map((title, index) => ({
    id: 10 + index,
    title,
    upn: `${title.toLowerCase()}@icomedias.com`,
    email: `${title.toLowerCase()}@icomedias.com`,
    isGroup: true,
    address: 'Graz',
    company: 'icomedias GmbH',
    logoUrl: ''
}));

export const formDefinitionStructure: IFormDefinitionStructure = {
    sections: [
        {
            id: 'section1',
            title: 'Stammdaten',
            tabs: []
        },
        {
            id: 'section2',
            title: 'Details',
            tabs: []
        }
    ] as unknown as IFormDefinitionStructure['sections'],
    features: {} as IFormDefinitionStructure['features'],
    ListDataMapping: { ma_name: 'Name' },
    TitleTemplate: '{{ma_name}}',
    templates: {
        titleTemplate: '{{ma_name}}',
        listTemplate: '{{ma_name}}',
        headerTitleTemplate: '{{ma_name}}'
    },
    legacyTemplate: false,
    version: 11
};

const formFiles: FileServer[] = [
    { filename: 'Basistest-Controls_.pdf', contentType: 'application/pdf' },
    { filename: 'hybridforms-icon.jpg', contentType: 'image/jpeg' },
    { filename: 'a-sample-textfile.txt', contentType: 'text/plain' }
].map((file, index) => ({
    ...file,
    size: file.contentType === 'application/pdf' ? pdfFileSize() : 512 + index,
    modified: MODIFIED,
    version: 3,
    fileID: 200 + index
}));

export const formFileNames = formFiles.map((file) => file.filename);

const statistic = {
    offline: 0,
    open: 1,
    pages: {},
    statusGroupToEdit: 0,
    statusEditToGroup: 1,
    time: 4200,
    oneColumn: 1,
    twoColumns: 0
};

export const buildForm = (
    overrides: Partial<FormFullServerFormat> = {}
): FormFullServerFormat => ({
    itemID: ITEM_ID,
    version: 11,
    displayVersion: '11.0',
    title: 'Basistest Controls',
    status: 'Edit',
    isExtendedRead: false,
    completion: 42,
    feedback: '',
    modified: MODIFIED,
    created: MODIFIED,
    pdfDate: MODIFIED,
    pdfReady: true,
    pdfVersion: 3,
    stage: 'S1',
    reachOutUrl: '',
    reachOutDate: '',
    badges: [],
    scheduledDate: '',
    saveStatus: 'saved',
    listData: { ma_name: 'Erwin Schrödinger' },
    modifiedBy: USER,
    modifiedUser: acl(135, 'Raphael') as never,
    createdBy: USER,
    createdUser: acl(135, 'Raphael') as never,
    group: myGroups[0] as never,
    owner: acl(135, 'Raphael') as never,
    fields: { ma_name: 'Erwin Schrödinger' },
    files: formFiles,
    audio: [],
    documents: [],
    links: [],
    maps: [],
    pictures: [],
    sketches: [],
    models: [],
    statistic,
    ...overrides
});

export const toMinimalForm = (
    form: FormFullServerFormat
): FormMinimalServerFormat => ({
    itemID: form.itemID,
    version: form.version,
    displayVersion: form.displayVersion,
    title: form.title,
    status: form.status,
    isExtendedRead: form.isExtendedRead,
    completion: form.completion,
    feedback: form.feedback,
    modified: form.modified,
    created: form.created,
    pdfDate: form.pdfDate,
    pdfReady: form.pdfReady,
    pdfVersion: form.pdfVersion,
    stage: form.stage,
    reachOutUrl: form.reachOutUrl,
    reachOutDate: form.reachOutDate,
    badges: form.badges,
    scheduledDate: form.scheduledDate
});

export const catalogMeta = (
    name: string,
    count: number
): CatalogListResponse => ({
    name,
    count,
    modified: MODIFIED,
    modifiedUtc: MODIFIED,
    modifiedBy: {
        id: 135,
        title: 'Raphael Stärk',
        upn: USER,
        email: USER,
        isGroup: false
    },
    hasACL: false,
    clientId: 1,
    clientName: 'icomedias',
    remark: '',
    isReachout: false,
    version: '1',
    XSLFilename: null,
    useXSL: false,
    originalFilename: `${name}.json`
});

export const dummyCatalog: JsonExportCatalog = {
    Name: 'DummyCatalog',
    Version: '1',
    Remark: '',
    entries: [
        { Fields: { ID: '1', KatalogText: 'gelb' }, Users: [], Groups: [] },
        { Fields: { ID: '2', KatalogText: 'rot' }, Users: [], Groups: [] },
        { Fields: { ID: '3', KatalogText: 'blau' }, Users: [], Groups: [] }
    ],
    IgnoreColumns: []
};
