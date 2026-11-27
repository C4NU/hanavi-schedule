type Failure = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'PAYLOAD_TOO_LARGE' | 'RATE_LIMITED' | 'UPSTREAM_UNAVAILABLE';

const statusFor: Record<Failure, number> = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    RATE_LIMITED: 429,
    UPSTREAM_UNAVAILABLE: 503,
};
const headers = { 'Cache-Control': 'no-store' };

export function mobileData<T>(data: T, status = 200) {
    return Response.json({ schemaVersion: 1, syncedAt: new Date().toISOString(), data }, { headers, status });
}

export function mobileError(code: Failure, message: string) {
    return Response.json(
        { error: { code, message, requestId: crypto.randomUUID() } },
        { status: statusFor[code], headers: code === 'RATE_LIMITED' ? { ...headers, 'Retry-After': '600' } : headers },
    );
}
