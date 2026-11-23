import { expect, it } from 'vitest';
import { searchScheduleTitles, toScheduleSearchResult, type SearchEvent } from '@/utils/scheduleSearch';

const event: SearchEvent = {
    id: 'event',
    day: 'SUN',
    title: '<p>봄바나나</p><p>FORGE&nbsp;Co-op</p>',
    schedules: { week_range: '12.29 - 01.04', created_at: '2026-01-01T04:00:00Z' },
    schedule_event_members: [
        { characters: { name: '미라이', status: 'active', graduation_date: null } },
        { characters: { name: '세나', status: 'graduated', graduation_date: '2026-01-04' } },
        { characters: { name: '이전 멤버', status: 'graduated', graduation_date: '2025-12-28' } },
        { characters: { name: '미라이', status: 'active', graduation_date: null } },
    ],
};

it('resolves an archived collaboration across New Year to its public week and day', () => {
    expect(toScheduleSearchResult(event)).toEqual({
        id: 'event', title: '봄바나나 FORGE Co-op', members: ['미라이', '세나'],
        date: '2026-01-04', weekStart: '2025-12-29', dayIndex: 6,
    });
});

it('matches normalized titles once their date starts in Korea and limits the response', () => {
    const result = toScheduleSearchResult(event)!;
    const archive = Array.from({ length: 41 }, (_, index) => ({ ...result, id: String(index) }));
    expect(searchScheduleTitles(archive, '봄바나나 forge', new Date('2026-01-03T14:59:59Z')).results).toEqual([]);
    const search = searchScheduleTitles(archive, '봄바나나  ｆｏｒｇｅ', new Date('2026-01-03T15:00:00Z'));
    expect(search.results).toHaveLength(40);
    expect(search.hasMore).toBe(true);
});
