import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
    },
}));

type MockResponse = { status: number };

function makeRequest(channelId?: string) {
    const url = channelId
        ? `http://localhost/api/cime/profile?channelId=${channelId}`
        : 'http://localhost/api/cime/profile';
    return new Request(url);
}

describe('cime/profile route', () => {
    let GET: (req: Request) => Promise<MockResponse>;

    beforeEach(async () => {
        vi.resetModules();
        vi.stubEnv('CIME_CLIENT_ID', 'client-id');
        vi.stubEnv('CIME_CLIENT_SECRET', 'client-secret');
        const mod = await import('@/app/api/cime/profile/route');
        GET = mod.GET as unknown as typeof GET;
    });

    it('returns 400 when channelId is missing', async () => {
        const res = await GET(makeRequest());
        expect(res.status).toBe(400);
    });

    it('returns 400 for channelId with invalid characters', async () => {
        const req = new Request('http://localhost/api/cime/profile?channelId=abc%3Cscript%3E');
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it('returns 400 for channelId that is too long', async () => {
        const res = await GET(makeRequest('a'.repeat(65)));
        expect(res.status).toBe(400);
    });

    it('returns 400 for channelId with spaces', async () => {
        const res = await GET(makeRequest('abc def'));
        expect(res.status).toBe(400);
    });

    it('calls CIME API with encodeURIComponent for valid channelId', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                code: 200,
                content: { data: [{ channelImageUrl: 'https://ci.me/img.jpg', channelName: '테스트' }] }
            }),
        });
        vi.stubGlobal('fetch', fetchMock);

        const res = await GET(makeRequest('validChannel123'));
        expect(res.status).toBe(200);
        expect(fetchMock.mock.calls[0][0]).toContain('validChannel123');

        vi.unstubAllGlobals();
    });
});
