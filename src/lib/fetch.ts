import {
    FetchResponse,
    RequestType,
    SigninResponse,
    XhrRequest
} from '../types/types';

type Fetch = typeof fetch;

const fetchRequest = async (
    obj: XhrRequest,
    fetchInstance: Fetch
): Promise<FetchResponse<unknown>> => {
    if (typeof obj.type === 'undefined') {
        obj.type = 'GET';
    }

    if ((Boolean(obj.user) && Boolean(obj.password)) || obj.withCredentials) {
        obj.withCredentials = true;
    }

    const requestInit: RequestInit = {
        method: obj.type,
        headers: obj.headers ?? {}
    };

    if (obj.data) {
        requestInit.body = obj.data;
    }

    if (obj.withCredentials) {
        requestInit.credentials = 'include';
    }

    let request: Response;
    return await fetchInstance(obj.url, requestInit)
        .then((_request) => {
            request = _request;
            let responseType = 'text';
            if (obj.responseType === 'arraybuffer') {
                responseType = 'arrayBuffer';
            } else if (obj.responseType) {
                responseType = obj.responseType;
            }

            return (request as any)[responseType]();
        })
        .then(async (res: any) => {
            const response = {
                status: request.status,
                statusText: request.statusText,
                response: res,
                responseURL: request.url,
                getAllResponseHeaders: () => {
                    const headersArray: string[] = [];
                    request.headers.forEach((value, key) => {
                        headersArray.push(`${key}: ${value}`);
                    });
                    return headersArray.join('\r\n');
                }
            };

            if (response.status >= 200 && response.status < 300) {
                return await Promise.resolve(response);
            }

            return await Promise.reject(response);
        });
};

export const resolveRequest = (
    customRequest?: (obj: XhrRequest) => Promise<XMLHttpRequest>
): RequestType => {
    if (customRequest) {
        return customRequest;
    } else if (typeof fetch === 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodeFetch = require('node-fetch') as unknown as Fetch;
        return async (obj: XhrRequest) => await fetchRequest(obj, nodeFetch);
    } else {
        return async (obj: XhrRequest) => await fetchRequest(obj, fetch);
    }
};

export const requestWithAuth = (
    getAccess: () => Promise<SigninResponse | null>,
    customRequest?: (obj: XhrRequest) => Promise<XMLHttpRequest>
): RequestType => {
    const request = resolveRequest(customRequest);
    let retryRequest = true;

    const retry = async (
        obj: XhrRequest
    ): Promise<XMLHttpRequest | FetchResponse<unknown>> => {
        if (retryRequest) {
            retryRequest = false;
            const auth = await getAccess();
            if (auth) {
                obj.headers = {
                    ...obj.headers,
                    Authorization: `${auth.token_type} ${auth.access_token}`
                };
            }
            return await request(obj);
        } else {
            throw new Error('No access token available.');
        }
    };

    return async (
        obj: XhrRequest
    ): Promise<XMLHttpRequest | FetchResponse<unknown>> => {
        const auth = await getAccess();

        if (!obj.headers) {
            obj.headers = {};
        }

        if (auth) {
            obj.headers = {
                ...obj.headers,
                Authorization: `${auth.token_type} ${auth.access_token}`
            };
        }

        const requestPromise = await request(obj);

        if (requestPromise.status === 403) {
            return await retry(obj);
        }

        return requestPromise;
    };
};
