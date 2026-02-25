export const getUrl = (
    url: string,
    baseUrl: string,
    params?: URLSearchParams
): string => {
    if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
    }
    const urlInstance = new URL(baseUrl + url);
    if (params) {
        urlInstance.search = params.toString();
    }
    return urlInstance.toString();
};

export const paramsFromObject = (obj: Record<string, any>): URLSearchParams => {
    const params = new URLSearchParams();
    Object.keys(obj).forEach((key) => {
        params.append(key, obj[key]);
    });
    return params;
};
