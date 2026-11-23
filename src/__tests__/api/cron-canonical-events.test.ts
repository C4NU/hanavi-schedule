import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
    NextResponse: {
        json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
    },
}));

const from = vi.fn();
const fetchRecentVideos = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({ from })),
}));
vi.mock('@/utils/youtube', () => ({ fetchRecentVideos }));

function builder(result: unknown) {
    const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        not: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve(result)),
        maybeSingle: vi.fn(() => Promise.resolve(result)),
        update: vi.fn(() => chain),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
    };
    return chain;
}

const scheduleId = '33333333-3333-4333-8333-333333333333';
const eventId = '44444444-4444-4444-8444-444444444444';

describe('YouTube replay cron with canonical events', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
        vi.stubEnv('CRON_SECRET', 'cron-secret');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
        vi.stubEnv('YOUTUBE_API_KEY', 'youtube-key');
    });

    it('updates schedule_events for a member instead of frozen schedule_items', async () => {
        const eventUpdate = builder({ error: null });
        from.mockImplementation((table: string) => {
            if (table === 'schedules') return builder({
                data: { id: scheduleId, week_range: '08.24 - 08.30', is_active: true },
                error: null,
            });
            if (table === 'schedule_events') {
                if (from.mock.calls.filter(([name]) => name === table).length === 1) {
                    return builder({ data: [{ id: eventId, day: 'SUN', video_url: null }], error: null });
                }
                return eventUpdate;
            }
            if (table === 'schedule_event_members') return builder({ data: [{ event_id: eventId, character_id: 'cherii' }], error: null });
            if (table === 'characters') return builder({ data: [{ id: 'cherii', name: '체리', youtube_channel_id: 'channel' }], error: null });
            throw new Error(`unexpected table ${table}`);
        });
        fetchRecentVideos.mockResolvedValue([{
            title: '다시보기',
            // The cron's KST conversion must land on the Sunday date key.
            publishedAt: '2026-08-29T15:00:00Z',
            url: 'https://youtu.be/replay',
        }]);

        const { GET } = await import('@/app/api/cron/update-replays/route');
        const response = await GET(new Request('http://localhost/api/cron/update-replays', {
            headers: { authorization: 'Bearer cron-secret' },
        }));

        expect(response.status).toBe(200);
        expect((response as any).data.updated).toBe(1);
        expect(from.mock.calls.map(([table]) => table)).not.toContain('schedule_items');
        expect(eventUpdate.update).toHaveBeenCalledWith(expect.objectContaining({ video_url: 'https://youtu.be/replay' }));
    });
});

describe('Ci.me replay cron with canonical events', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.resetAllMocks();
        vi.stubEnv('CRON_SECRET', 'cron-secret');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    });

    it.each([false, true])('matches the KST date and writes only during a real run (dryRun=%s)', async (dryRun) => {
        const eventUpdate = builder({ error: null });
        from.mockImplementation((table: string) => {
            if (table === 'schedules') return builder({ data: [{ id: scheduleId, week_range: '08.24 - 08.30' }], error: null });
            if (table === 'schedule_events') return from.mock.calls.filter(([name]) => name === table).length === 1
                ? builder({ data: [{ id: eventId, schedule_id: scheduleId, day: 'SUN', video_url: null }], error: null })
                : eventUpdate;
            if (table === 'schedule_event_members') return builder({ data: [{ event_id: eventId, character_id: 'cherii' }], error: null });
            if (table === 'characters') return builder({ data: [{ id: 'cherii', name: '체리', chzzk_url: 'cherii' }], error: null });
            throw new Error(`unexpected table ${table}`);
        });
        const replay = { id: '123', state: 'ACTIVE', liveOpenedAt: '2026-08-30T15:09:00Z' };
        const vodData = { section: { items: [replay, { ...replay, id: '124' }] } };
        const page = JSON.stringify({ args: [{ bodyData: { vodData } }] });
        const script = `window.__RUNE_DATA__.push(JSON.parse('${page}'))`;
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(script)));

        const { GET } = await import('@/app/api/cron/update-cime-replays/route');
        const response = await GET(new Request(`http://localhost/api/cron/update-cime-replays?dryRun=${dryRun ? '1' : '0'}`, {
            headers: { authorization: 'Bearer cron-secret' },
        }));

        expect(response.status).toBe(200);
        expect((response as any).data.updated).toBe(dryRun ? 0 : 1);
        if (dryRun) {
            expect((response as any).data.candidates).toBe(1);
            expect(eventUpdate.update).not.toHaveBeenCalled();
        } else {
            expect(eventUpdate.update).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ video_url: 'https://ci.me/@cherii/vods/123' }));
        }
        expect(from.mock.calls.map(([table]) => table)).not.toContain('schedule_items');
    });
});
