import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
    },
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        auth: {
            getUser: (token: string) => Promise.resolve({
                data: { user: token === 'admin-token' ? { id: 'admin-user' } : null },
                error: token === 'admin-token' ? null : new Error('invalid token'),
            }),
        },
        from: (table: string) => ({
            select: () => ({
                eq: () => ({
                    single: () => table === 'user_roles'
                        ? ({ data: { role: 'admin' }, error: null })
                        : ({ data: null, error: null }),
                    maybeSingle: () => ({ data: null }),
                    order: () => ({ limit: () => ({ data: [] }) }),
                }),
                order: () => ({ limit: () => ({ data: [] }) }),
                single: () => ({ data: null, error: null }),
            }),
            update: () => ({ eq: () => ({ data: null }) }),
        }),
    }),
}));

vi.mock('@/utils/youtube', () => ({
    fetchRecentVideos: vi.fn().mockResolvedValue([]),
}));

type MockResponse = { status: number };

function makeRequest(authHeader: string | null) {
    const headers = new Headers();
    if (authHeader) headers.set('authorization', authHeader);
    return new Request('http://localhost/api/cron/update-replays', { headers });
}

describe('cron/update-replays auth', () => {
    let GET: (req: Request) => Promise<MockResponse>;

    beforeEach(async () => {
        vi.resetModules();
        vi.stubEnv('CRON_SECRET', 'my-cron-secret');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
        vi.stubEnv('YOUTUBE_API_KEY', 'youtube-key');
        const mod = await import('@/app/api/cron/update-replays/route');
        GET = mod.GET as unknown as typeof GET;
    });

    it('returns 401 when no auth header', async () => {
        const res = await GET(makeRequest(null));
        expect(res.status).toBe(401);
    });

    it('returns 401 when wrong secret', async () => {
        const res = await GET(makeRequest('Bearer wrong-secret'));
        expect(res.status).toBe(401);
    });

    it('returns 401 even when NODE_ENV is development', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        const res = await GET(makeRequest(null));
        expect(res.status).toBe(401);
        vi.unstubAllEnvs();
    });

    it('passes auth with correct secret', async () => {
        const res = await GET(makeRequest('Bearer my-cron-secret'));
        expect(res.status).toBe(200);
    });
});

describe('cron/update-cime-replays auth', () => {
    let GET: (req: Request) => Promise<MockResponse>;
    let POST: (req: Request) => Promise<MockResponse>;

    beforeEach(async () => {
        vi.resetModules();
        vi.stubEnv('CRON_SECRET', 'my-cron-secret');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
        const mod = await import('@/app/api/cron/update-cime-replays/route');
        GET = mod.GET as unknown as typeof GET;
        POST = mod.POST as unknown as typeof POST;
    });

    it('returns 401 when no auth header', async () => {
        const res = await GET(makeRequest(null));
        expect(res.status).toBe(401);
    });

    it('returns 401 when wrong secret', async () => {
        const res = await GET(makeRequest('Bearer wrong-secret'));
        expect(res.status).toBe(401);
    });

    it('returns 401 in development without secret', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        const res = await GET(makeRequest(null));
        expect(res.status).toBe(401);
        vi.unstubAllEnvs();
    });

    it('rejects a manual sync without an administrator JWT', async () => {
        const res = await POST(makeRequest(null));
        expect(res.status).toBe(401);
    });

    it('allows a manual sync with an administrator JWT', async () => {
        const res = await POST(makeRequest('Bearer admin-token'));
        expect(res.status).toBe(200);
    });
});
