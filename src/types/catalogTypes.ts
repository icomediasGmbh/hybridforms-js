export interface ModifiedBy {
    id: number;
    title: string;
    upn: string;
    email: string;
    isGroup: boolean;
}

export interface CatalogListResponse {
    name: string;
    count: number;
    modified: string;
    modifiedUtc: string;
    modifiedBy: ModifiedBy;
    hasACL: boolean;
    clientId: number;
    clientName: string;
    remark: string;
    isReachout: boolean;
    version: string;
    XSLFilename: null;
    useXSL: boolean;
    originalFilename: string;
}

export interface JsonExportCatalogEntry {
    Fields: Record<string, string>;
    Users: string[];
    Groups: string[];
}

export interface JsonExportCatalog {
    Name: string;
    Version: string;
    Remark: string;
    entries: JsonExportCatalogEntry[];
    IgnoreColumns: string[];
}

export interface ExportCatalogMapping {
    json: JsonExportCatalog;
    xml: string;
    csv: string;
    excel: string;
}

export interface ExportCatalogParams<T> {
    format?: T;
}

export interface GetCatalogParams {
    $select?: string;
    $orderby?: string;
    $top?: number;
    $filter?: string;
    $skip?: number;
    [key: string]: any;
}

export interface GetCatalogResponse {
    d: ODataResult;
}

export interface ODataResult {
    results: Record<string, string>[];
    __count: number | null;
    __next: number | null;
}

export interface DeleteCatalogResponse {
    deleted: boolean;
}
