import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabaseClient';
import { searchScheduleTitles, toScheduleSearchResult } from '@/utils/scheduleSearch';
import type { ScheduleSearchResult, SearchEvent } from '@/utils/scheduleSearch';

const loadArchive = unstable_cache(async () => {
    const archive = new Map<string, ScheduleSearchResult>();
    const pageSize = 500;
    let afterId: string | undefined;

    while (true) {
        const query = supabase.from('schedule_events')
            .select('id, day, title, schedules!inner(week_range, created_at), schedule_event_members(characters(name, status, graduation_date))')
            .neq('type', 'off')
            .neq('title', '')
            .order('id')
            .limit(pageSize);
        const request = afterId ? query.gt('id', afterId) : query;
        const { data, error } = await request.overrideTypes<SearchEvent[], { merge: false }>();
        if (error || !data) throw new Error('Schedule archive unavailable');
        for (const row of data) {
            const result = toScheduleSearchResult(row);
            if (result) archive.set(result.id, result);
        }
        if (data.length < pageSize) break;
        afterId = data[data.length - 1].id;
    }

    return [...archive.values()].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'ko'));
}, ['public-schedule-search'], { revalidate: 300 });

export async function searchPublicSchedule(query: string) {
    return searchScheduleTitles(await loadArchive(), query);
}
