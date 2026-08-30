import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
    },
}));

const checkIsAdmin = vi.fn();
const getUser = vi.fn();
const rpc = vi.fn();

vi.mock('@/utils/supabase', () => ({ checkIsAdmin }));
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: { getUser },
        rpc,
    })),
}));

function request(events: unknown) {
    return new Request('http://localhost/api/admin/events', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer admin-token',
        },
        body: JSON.stringify({
            scheduleId: '33333333-3333-4333-8333-333333333333',
            events,
            deletedIds: [],
        }),
    });
}

describe('admin/events route', () => {
    let POST: (request: Request) => Promise<{ status: number }>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
        getUser.mockResolvedValue({ data: { user: { id: 'admin-user' } }, error: null });
        checkIsAdmin.mockResolvedValue(true);
        rpc.mockResolvedValue({ data: { upserted: 1, deleted: 0 }, error: null });
        const mod = await import('@/app/api/admin/events/route');
        POST = mod.POST as unknown as typeof POST;
    });

    it('sends the complete event replacement to the transactional RPC', async () => {
        const response = await POST(request([{
            day: 'SUN',
            startTime: '14:00',
            title: '하나비 합방',
            type: 'collab',
            memberIds: ['cherii', 'nemu'],
        }]));

        expect(response.status).toBe(200);
        expect(rpc).toHaveBeenCalledWith('save_schedule_events', expect.objectContaining({
            p_schedule_id: '33333333-3333-4333-8333-333333333333',
            p_events: [expect.objectContaining({ day: 'SUN', memberIds: ['cherii', 'nemu'] })],
            p_deleted_ids: [],
        }));
    });

    it('rejects pseudo ids before any write', async () => {
        const response = await POST(request([{
            id: 'new-cherii-SUN-0',
            day: 'SUN',
            startTime: '14:00',
            title: '잘못된 ID',
            type: 'stream',
            memberIds: ['cherii'],
        }]));

        expect(response.status).toBe(400);
        expect(rpc).not.toHaveBeenCalled();
    });

    it('rejects non-HTTPS replay URLs before any write', async () => {
        const response = await POST(request([{
            day: 'SUN',
            startTime: '14:00',
            title: '잘못된 링크',
            type: 'stream',
            memberIds: ['cherii'],
            videoUrl: 'javascript:alert(1)',
        }]));

        expect(response.status).toBe(400);
        expect(rpc).not.toHaveBeenCalled();
    });

    it('returns a generic server error when the transaction is rejected', async () => {
        rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'db failure' } });

        const response = await POST(request([{
            day: 'SUN',
            startTime: '14:00',
            title: '하나비 합방',
            type: 'collab',
            memberIds: ['cherii', 'nemu'],
        }]));

        expect(response.status).toBe(500);
    });

    it('rejects one-member internal collaborations before the transaction', async () => {
        const response = await POST(request([{
            day: 'SUN',
            startTime: '14:00',
            title: '잘못된 합방',
            type: 'collab',
            memberIds: ['cherii'],
        }]));

        expect(response.status).toBe(400);
        expect(rpc).not.toHaveBeenCalled();
    });
});
