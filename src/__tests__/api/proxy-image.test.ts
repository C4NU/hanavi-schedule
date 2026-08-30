import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => {
    class MockNextResponse extends Response {
        static json(data: unknown, init?: ResponseInit) {
            return new Response(JSON.stringify(data), {
                ...init,
                headers: { 'Content-Type': 'application/json', ...init?.headers },
            });
        }

        static redirect(url: string | URL, status = 307) {
            return new Response(null, { status, headers: { Location: url.toString() } });
        }
    }

    return {
        NextResponse: MockNextResponse,
        NextRequest: class {},
    };
});

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

    it('rejects protocol-relative paths instead of redirecting externally', async () => {
        const res = await GET(makeRequest('//evil.example/image.png'));
        expect(res.status).toBe(400);
    });

    it('rejects backslash paths that URL parsing could turn into an external redirect', async () => {
        const res = await GET(makeRequest('/\\evil.example/image.png'));
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
        expect(res.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith('https://i.ytimg.com/vi/abc/hq.jpg', { redirect: 'manual' });

        vi.unstubAllGlobals();
    });

    it('accepts ci.me host', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            blob: () => Promise.resolve(new Blob()),
            headers: { get: () => 'image/png' },
        });
        vi.stubGlobal('fetch', fetchMock);

        const req = makeRequest('https://ci.me/image.png');
        const res = await GET(req);
        expect(res.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith('https://ci.me/image.png', { redirect: 'manual' });

        vi.unstubAllGlobals();
    });

    it('accepts ci.me subdomain hosts', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            blob: () => Promise.resolve(new Blob()),
            headers: { get: () => 'image/jpeg' },
        });
        vi.stubGlobal('fetch', fetchMock);

        const url = 'https://streaming.cf.ci.me/common/lambda/img/test.jpg?f=jpeg';
        const req = makeRequest(url);
        const res = await GET(req);
        expect(res.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith(url, { redirect: 'manual' });

        vi.unstubAllGlobals();
    });

    it('accepts the Naver profile-image host used by member avatars', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            blob: () => Promise.resolve(new Blob()),
            headers: { get: () => 'image/jpeg' },
        });
        vi.stubGlobal('fetch', fetchMock);

        const url = 'https://nng-phinf.pstatic.net/profile/image.jpg';
        const res = await GET(makeRequest(url));
        expect(res.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith(url, { redirect: 'manual' });

        vi.unstubAllGlobals();
    });

    it('does not return a successful image response for an upstream failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            blob: () => Promise.resolve(new Blob()),
            headers: { get: () => 'text/html' },
        }));

        const res = await GET(makeRequest('https://i.ytimg.com/vi/missing/hq.jpg'));
        expect(res.status).toBe(404);

        vi.unstubAllGlobals();
    });

    it('blocks a redirect to a disallowed host before fetching it', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            status: 302,
            headers: { get: (name: string) => name === 'location' ? 'https://evil.example/image.jpg' : null },
        });
        vi.stubGlobal('fetch', fetchMock);

        const res = await GET(makeRequest('https://i.ytimg.com/vi/redirect/hq.jpg'));
        expect(res.status).toBe(400);
        expect(fetchMock).toHaveBeenCalledTimes(1);

        vi.unstubAllGlobals();
    });
});
