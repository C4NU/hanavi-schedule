import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
    supabaseMock: { from: vi.fn() },
}));

vi.mock('@/lib/supabaseClient', () => ({ supabase: supabaseMock }));

const SCHEDULE_ID = '33333333-3333-4333-8333-333333333333';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

type ResponseValue = { data: unknown; error: unknown };

function queryBuilder(response: ResponseValue) {
    const promise = Promise.resolve(response);
    const builder: Record<string, any> = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        limit: vi.fn(() => builder),
        maybeSingle: vi.fn(() => promise),
        then: (onFulfilled: (value: ResponseValue) => unknown, onRejected?: (reason: unknown) => unknown) =>
            promise.then(onFulfilled, onRejected),
    };
    return builder;
}

function configureSupabase(options: { memberError?: boolean; eventQueryError?: boolean; emptyEvents?: boolean; memberlessEvent?: boolean; scheduleError?: boolean } = {}) {
    const responses = new Map<string, ResponseValue[]>([
        ['schedules', [options.scheduleError
            ? { data: null, error: { message: 'schedule unavailable' } }
            : { data: { id: SCHEDULE_ID, week_range: '08.24 - 08.30' }, error: null }]],
        ['characters', [{
            data: [{
                id: 'cherii',
                name: '체리',
                color_theme: 'cherii',
                avatar_url: '',
                default_time: '19:00',
                status: 'active',
            }, {
                id: 'nemu',
                name: '네무',
                color_theme: 'nemu',
                avatar_url: '',
                default_time: '19:00',
                status: 'active',
            }],
            error: null,
        }]],
        ['schedule_items', [{
            data: [{ id: 'item-1', character_id: 'cherii', day: 'SUN', time: '19:00', content: '레거시 방송', type: 'stream' }],
            error: null,
        }]],
        ['schedule_item_memos', [{ data: [], error: null }, { data: [], error: null }]],
        ['schedule_events', options.eventQueryError
            ? [{ data: null, error: { message: 'events unavailable' } }, { data: null, error: { message: 'legacy events unavailable' } }]
            : [{ data: options.emptyEvents ? [] : [{ id: EVENT_ID, day: 'SUN', start_time: '14:00', title: '하나비 합방', type: 'collab', video_url: null, category: null }], error: null }]],
        ['schedule_event_members', options.memberError
            ? [{ data: null, error: { message: 'members unavailable' } }]
            : options.memberlessEvent
                ? [{ data: [], error: null }]
            : [{ data: [
                { event_id: EVENT_ID, character_id: 'cherii', role: 'member' },
                { event_id: EVENT_ID, character_id: 'nemu', role: 'member' },
            ], error: null }]],
        ['schedule_event_guests', [{ data: [], error: null }]],
    ]);

    supabaseMock.from.mockImplementation((table: string) => {
        const queue = responses.get(table) || [{ data: [], error: null }];
        const response = queue.shift() || { data: [], error: null };
        responses.set(table, queue);
        return queryBuilder(response);
    });
}

describe('canonical schedule event loading', () => {
    let getScheduleFromSupabase: (weekRange?: string) => Promise<any>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
        const mod = await import('@/utils/supabase');
        getScheduleFromSupabase = mod.getScheduleFromSupabase;
    });

    it('marks relationship failures unavailable and preserves legacy cells without applying partial events', async () => {
        configureSupabase({ memberError: true });

        const result = await getScheduleFromSupabase('08.24 - 08.30');

        expect(result?.canonicalEventsStatus).toBe('unavailable');
        expect(result?.events).toBeUndefined();
        expect(result?.characters.find((character: any) => character.id === 'cherii')?.schedule.SUN.content).toBe('레거시 방송');
        expect(result?.characters.find((character: any) => character.id === 'cherii')?.schedule.SUN.eventId).toBeUndefined();
    });

    it('projects canonical events only after all relationships load', async () => {
        configureSupabase();

        const result = await getScheduleFromSupabase('08.24 - 08.30');

        expect(result?.canonicalEventsStatus).toBe('available');
        expect(result?.events).toHaveLength(1);
        expect(result?.characters.find((character: any) => character.id === 'cherii')?.schedule.SUN).toMatchObject({
            eventId: EVENT_ID,
            content: '하나비 합방',
            type: 'collab',
        });
    });

    it('marks both canonical query attempts unavailable instead of allowing a legacy save', async () => {
        configureSupabase({ eventQueryError: true });

        const result = await getScheduleFromSupabase('08.24 - 08.30');

        expect(result?.canonicalEventsStatus).toBe('unavailable');
        expect(result?.events).toBeUndefined();
        expect(result?.characters.find((character: any) => character.id === 'cherii')?.schedule.SUN.content).toBe('레거시 방송');
    });

    it('keeps legacy cells when a canonical event has no members', async () => {
        configureSupabase({ memberlessEvent: true });

        const result = await getScheduleFromSupabase('08.24 - 08.30');

        expect(result?.canonicalEventsStatus).toBe('unavailable');
        expect(result?.events).toBeUndefined();
        expect(result?.characters.find((character: any) => character.id === 'cherii')?.schedule.SUN.content).toBe('레거시 방송');
    });

    it('returns null when the schedule lookup itself fails', async () => {
        configureSupabase({ scheduleError: true });

        expect(await getScheduleFromSupabase('08.24 - 08.30')).toBeNull();
    });

    it('clears legacy cells when an available canonical graph has no events', async () => {
        configureSupabase({ emptyEvents: true });

        const result = await getScheduleFromSupabase('08.24 - 08.30');

        expect(result?.canonicalEventsStatus).toBe('available');
        expect(result?.events).toEqual([]);
        expect(result?.characters.find((character: any) => character.id === 'cherii')?.schedule.SUN)
            .toMatchObject({ type: 'off', time: '', content: '' });
    });
});
