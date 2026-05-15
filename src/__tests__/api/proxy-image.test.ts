import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
        redirect: (url: URL) => ({ redirect: url.toString() }),
    },
    NextRequest: class {},
}));

type MockResponse = { status: number };

function makeRequest(url: string) {
    return new Request(`http://localhost/api/proxy/image?url=${encodeURIComponent(url)}`);
}

describe('proxy/image route', () => {
    let GET: (req: Request) => Promise<MockResponse>;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import('@/app/api/proxy/image/route');
        GET = mod.GET as unknown as typeof GET;
    });

    it('returns 400 when url is missing', async () => {
        const req = new Request('http://localhost/api/proxy/image');
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it('returns 400 for a non-HTTPS URL', async () => {
        const req = makeRequest('http://i.ytimg.com/vi/abc/hq.jpg');
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it('returns 400 for a disallowed host', async () => {
        const req = makeRequest('https://evil.com/image.png');
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it('returns 400 for invalid URL', async () => {
        const req = makeRequest('not-a-url');
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it('accepts allowed YouTube image hosts', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            blob: () => Promise.resolve(new Blob()),
            headers: { get: () => 'image/jpeg' },
        });
        vi.stubGlobal('fetch', fetchMock);

        const req = makeRequest('https://i.ytimg.com/vi/abc/hq.jpg');
        const res = await GET(req);
        expect(res.status).not.toBe(400);
        expect(fetchMock).toHaveBeenCalledWith('https://i.ytimg.com/vi/abc/hq.jpg');

        vi.unstubAllGlobals();
    });

    it('accepts ci.me host', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            blob: () => Promise.resolve(new Blob()),
            headers: { get: () => 'image/png' },
        });
        vi.stubGlobal('fetch', fetchMock);

        const req = makeRequest('https://ci.me/image.png');
        await GET(req);
        expect(fetchMock).toHaveBeenCalledWith('https://ci.me/image.png');

        vi.unstubAllGlobals();
    });
});
