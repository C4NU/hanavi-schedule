type Failure = 'BAD_REQUEST' | 'NOT_FOUND' | 'UPSTREAM_UNAVAILABLE';

const statusFor: Record<Failure, number> = {
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    UPSTREAM_UNAVAILABLE: 503,
};
const headers = { 'Cache-Control': 'no-store' };

export function mobileData<T>(data: T) {
    return Response.json({ schemaVersion: 1, syncedAt: new Date().toISOString(), data }, { headers });
}

export function mobileError(code: Failure, message: string) {
    return Response.json(
        { error: { code, message, requestId: crypto.randomUUID() } },
        { status: statusFor[code], headers },
    );
}
