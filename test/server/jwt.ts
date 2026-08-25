const base64url = (value: string): string =>
    Buffer.from(value, 'utf8').toString('base64url');

/**
 * Builds an unsigned JWT. `jwt-decode` (used by src/lib/auth.ts) never verifies
 * the signature, so an `alg: none` token is enough to exercise the expiry logic.
 */
export const makeJwt = (
    payload: Record<string, unknown>,
    expiresInSeconds: number
): string => {
    const now = Math.floor(Date.now() / 1000);
    const body = {
        iat: now,
        exp: now + expiresInSeconds,
        ...payload
    };
    return [
        base64url(JSON.stringify({ alg: 'none', typ: 'JWT' })),
        base64url(JSON.stringify(body)),
        'not-a-real-signature'
    ].join('.');
};
