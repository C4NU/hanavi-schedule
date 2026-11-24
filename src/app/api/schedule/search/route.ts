import { NextResponse } from 'next/server';
import { searchPublicSchedule } from '@/lib/publicScheduleSearch';
import { SEARCH_QUERY_LIMIT } from '@/utils/scheduleSearch';

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (!query || query.length > SEARCH_QUERY_LIMIT) {
        return NextResponse.json({ error: '검색어는 1~80자로 입력해 주세요.' }, { status: 400 });
    }

    try {
        const results = await searchPublicSchedule(query);
        return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return NextResponse.json({ error: '시간표 검색을 불러오지 못했어요.' }, { status: 503 });
    }
}
