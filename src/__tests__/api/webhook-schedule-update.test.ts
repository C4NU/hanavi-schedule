import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
    },
}));

vi.mock('@/lib/notifications', () => ({
    sendMulticastNotification: vi.fn().mockResolvedValue({ success: true }),
}));

type MockResponse = { status: number };

function makeRequest(authHeader: string | null, body: unknown = {}) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (authHeader) headers.set('Authorization', authHeader);
    return new Request('http://localhost/api/webhook/schedule-update', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
}

describe('webhook/schedule-update route', () => {
    let POST: (req: Request) => Promise<MockResponse>;

    beforeEach(async () => {
        vi.resetModules();
        vi.stubEnv('ADMIN_SECRET', 'test-secret-1234567890');
        const mod = await import('@/app/api/webhook/schedule-update/route');
        POST = mod.POST as unknown as typeof POST;
    });

    it('returns 401 when no auth header', async () => {
        const req = makeRequest(null);
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 401 when wrong secret', async () => {
        const req = makeRequest('Bearer wrong-secret');
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 401 when header is not Bearer format', async () => {
        const req = makeRequest('test-secret-1234567890');
        const res = await POST(req);
        expect(res.status).toBe(401);
    });

    it('returns 200 with correct secret', async () => {
        const req = makeRequest('Bearer test-secret-1234567890', { title: '테스트', body: '내용' });
        const res = await POST(req);
        expect(res.status).toBe(200);
    });
});
