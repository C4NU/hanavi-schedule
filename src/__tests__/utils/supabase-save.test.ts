import { expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/lib/supabaseClient', () => ({ supabase: {} }));

it('reports failed member metadata updates', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    const { saveScheduleToSupabase } = await import('@/utils/supabase');
    const client = {
        from: vi.fn((table: string) => {
            if (table === 'schedules') {
                return {
                    upsert: () => ({
                        select: () => ({ single: async () => ({ data: { id: 'week' }, error: null }) }),
                    }),
                };
            }
            return {
                update: () => ({ eq: async () => ({ error: { message: 'rejected' } }) }),
            };
        }),
    };
    const result = await saveScheduleToSupabase({
        weekRange: '11.02 - 11.08',
        characters: [{
            id: 'a', name: 'A', colorTheme: 'a', avatarUrl: '', defaultTime: '19:00', schedule: {},
        }],
    }, client as unknown as SupabaseClient, { skipItems: true });
    expect(result).toEqual({ success: false, scheduleId: 'week' });
});
