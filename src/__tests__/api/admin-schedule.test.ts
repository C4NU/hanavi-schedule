import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
    },
}));

const saveScheduleToSupabase = vi.fn();
const checkIsAdmin = vi.fn();
const getUser = vi.fn();

vi.mock('@/utils/supabase', () => ({ saveScheduleToSupabase, checkIsAdmin }));
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({ auth: { getUser } })),
}));

const body = {
    weekRange: '08.24 - 08.30',
    characters: [{ id: 'cherii', name: '체리', schedule: { SUN: { time: '', content: '', type: 'off' } } }],
};

function request(auth?: string, payload = body) {
    const headers = new Headers({ 'Content-Type': 'application/json' });
    if (auth) headers.set('Authorization', auth);
    return new Request('http://localhost/api/admin/schedule', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
    });
}

describe('admin/schedule route', () => {
    let POST: (request: Request) => Promise<{ status: number; data?: unknown }>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
        getUser.mockResolvedValue({ data: { user: { id: 'admin-user' } }, error: null });
        checkIsAdmin.mockResolvedValue(true);
        saveScheduleToSupabase.mockResolvedValue({ success: true, scheduleId: '33333333-3333-4333-8333-333333333333' });
        const mod = await import('@/app/api/admin/schedule/route');
        POST = mod.POST as unknown as typeof POST;
    });

    it('requires a bearer token', async () => {
        expect((await POST(request())).status).toBe(401);
    });

    it('rejects a non-admin user before database writes', async () => {
        checkIsAdmin.mockResolvedValue(false);
        expect((await POST(request('Bearer member-token'))).status).toBe(403);
        expect(saveScheduleToSupabase).not.toHaveBeenCalled();
    });

    it('uses the service-role event transition and returns the schedule id', async () => {
        const response = await POST(request('Bearer admin-token'));

        expect(response.status).toBe(200);
        expect(saveScheduleToSupabase).toHaveBeenCalledWith(
            expect.objectContaining({ weekRange: body.weekRange }),
            expect.anything(),
            { skipItems: true },
        );
        expect(response.data).toEqual({ success: true, scheduleId: '33333333-3333-4333-8333-333333333333' });
    });

    it('does not turn a failed save result into a false success', async () => {
        saveScheduleToSupabase.mockResolvedValue({ success: false });
        expect((await POST(request('Bearer admin-token'))).status).toBe(500);
    });

    it('rejects non-HTTPS replay URLs before database writes', async () => {
        const payload = {
            ...body,
            characters: [{
                ...body.characters[0],
                schedule: {
                    SUN: { time: '14:00', content: '방송', type: 'stream', videoUrl: 'data:text/html,alert(1)' },
                },
            }],
        };

        expect((await POST(request('Bearer admin-token', payload))).status).toBe(400);
        expect(saveScheduleToSupabase).not.toHaveBeenCalled();
    });
});
