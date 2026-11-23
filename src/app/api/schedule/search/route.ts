import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { SEARCH_QUERY_LIMIT, searchScheduleTitles, toScheduleSearchResult } from '@/utils/scheduleSearch';
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

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (!query || query.length > SEARCH_QUERY_LIMIT) {
        return NextResponse.json({ error: '검색어는 1~80자로 입력해 주세요.' }, { status: 400 });
    }

    try {
        const results = searchScheduleTitles(await loadArchive(), query);
        return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ error: '시간표 검색을 불러오지 못했어요.' }, { status: 503 });
    }
}
