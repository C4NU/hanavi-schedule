import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeekEvent, WeeklySchedule } from '@/types/schedule';
import { applyEventsToCells, cellsToEvents } from '@/utils/events';
import { updateCollaborationEvent, updateScheduleItem, updateSchedulePart } from '@/utils/scheduleEditor';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
    },
}));

const checkIsAdmin = vi.fn();
const getUser = vi.fn();
const rpc = vi.fn();
const from = vi.fn();

vi.mock('@/utils/supabase', () => ({ checkIsAdmin }));
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: { getUser },
        rpc,
        from,
    })),
}));

function request(events: unknown, saveId?: string) {
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
            saveId,
        }),
    });
}

describe('admin/events route', () => {
    let POST: (request: Request) => Promise<{ status: number; data: { deliveryKey?: string } }>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
        getUser.mockResolvedValue({ data: { user: { id: 'admin-user' } }, error: null });
        checkIsAdmin.mockResolvedValue(true);
        from.mockReturnValue({ select: () => ({ limit: async () => ({ error: null }) }) });
        rpc.mockResolvedValue({ data: { upserted: 1, deleted: 0 }, error: null });
        const mod = await import('@/app/api/admin/events/route');
        POST = mod.POST as unknown as typeof POST;
    });

    it('rejects unauthenticated malformed bodies before reading JSON', async () => {
        const req = new Request('http://localhost/api/admin/test', { method: 'POST', body: '{' });
        const parse = vi.spyOn(req, 'json');
        expect((await POST(req)).status).toBe(401);
        expect(parse).not.toHaveBeenCalled();
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

    it('keeps a retry key stable and sends a new key when a separate save restores the same schedule', async () => {
        const events = [{ day: 'SUN', startTime: '14:00', title: 'A', type: 'stream', memberIds: ['cherii'] }];
        const firstId = '11111111-1111-4111-8111-111111111111';
        const otherId = '22222222-2222-4222-8222-222222222222';
        const restoreId = '33333333-3333-4333-8333-333333333333';

        const first = await POST(request(events, firstId));
        const retry = await POST(request(events, firstId));
        const other = await POST(request([{ ...events[0], title: 'B' }], otherId));
        const restored = await POST(request(events, restoreId));

        expect(first.data.deliveryKey).toMatch(/^[a-f0-9]{64}$/);
        expect(retry.data.deliveryKey).toBe(first.data.deliveryKey);
        expect(new Set([first.data.deliveryKey, other.data.deliveryKey, restored.data.deliveryKey]).size).toBe(3);
    });

    it('rejects malformed save identifiers before persisting the schedule', async () => {
        expect((await POST(request([], 'invalid'))).status).toBe(400);
        expect(rpc).not.toHaveBeenCalled();
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
    it('blocks member-time writes until the schema is available', async () => {
        from.mockReturnValue({ select: () => ({ limit: async () => ({ error: { code: '42703' } }) }) });
        const response = await POST(request([{
            day: 'SUN', startTime: '16:00', title: '합방', type: 'collab',
            memberIds: ['cherii', 'nemu'], memberStartTimes: { nemu: '18:00' },
        }]));
        expect(response.status).toBe(503);
        expect(rpc).not.toHaveBeenCalled();
    });
    it('passes validated member times to the transaction', async () => {
        const response = await POST(request([{
            day: 'SUN', startTime: '16:00', title: '합방', type: 'collab',
            memberIds: ['cherii', 'nemu'], memberStartTimes: { nemu: '18:00' },
        }]));
        expect(response.status).toBe(200);
        expect(rpc).toHaveBeenCalledWith('save_schedule_events', expect.objectContaining({
            p_events: [expect.objectContaining({ memberStartTimes: { nemu: '18:00' } })],
        }));
    });

    it.each(['inline', 'split part', 'edit sheet'])('saves a cleared join time as unknown from the %s editor', async (editor) => {
        const event: WeekEvent = {
            id: '11111111-1111-4111-8111-111111111111',
            scheduleId: '33333333-3333-4333-8333-333333333333',
            day: 'SUN', startTime: '16:00', title: '합방', type: 'collab',
            memberIds: ['cherii', 'nemu'], memberStartTimes: { nemu: '18:00' },
        };
        const createCells = (): WeeklySchedule['characters'] => event.memberIds.map((id) => ({
            id, name: id, avatarUrl: '', colorTheme: id,
            schedule: { SUN: { time: '', content: '', type: 'stream', placeholder: true } },
        }));
        const input: WeeklySchedule = { weekRange: '08.24 - 08.30', characters: createCells() };
        applyEventsToCells(input.characters, [event]);

        const edited = editor === 'edit sheet'
            ? updateCollaborationEvent(input, {
                characterId: 'nemu', day: 'SUN', eventId: event.id, time: '',
                content: event.title, type: event.type, participantIds: event.memberIds,
            })
            : editor === 'split part'
                ? updateSchedulePart(input, 'nemu', 'SUN', 0, 'time', ' ')
                : updateScheduleItem(input, 'nemu', 'SUN', 'time', '');

        const { events } = cellsToEvents(edited.characters, [event]);
        expect((await POST(request(events))).status).toBe(200);
        expect(edited.characters[1].schedule.SUN.time).toBe('??:??');

        const [saved] = rpc.mock.calls[0][1].p_events as WeekEvent[];
        expect(saved.memberStartTimes).toEqual({ nemu: '??:??' });
        const reloaded = createCells();
        applyEventsToCells(reloaded, [saved]);
        expect(reloaded.map((member) => member.schedule.SUN.time)).toEqual(['16:00', '??:??']);
    });

});
