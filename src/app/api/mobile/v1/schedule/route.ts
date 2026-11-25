import { mobileData, mobileError } from '@/lib/mobileApiResponse';
import { getScheduleFromSupabase } from '@/utils/supabase';

function isValidWeekRange(week: string): boolean {
    const match = /^(\d{2})\.(\d{2}) - (\d{2})\.(\d{2})$/.exec(week);
    if (!match) return false;
    const [month, day, endMonth, endDay] = match.slice(1).map(Number);
    return [2000, 2001].some((year) => {
        const start = new Date(Date.UTC(year, month - 1, day));
        const end = new Date(Date.UTC(year, month - 1, day + 6));
        return start.getUTCMonth() === month - 1 && start.getUTCDate() === day
            && end.getUTCMonth() === endMonth - 1 && end.getUTCDate() === endDay;
    });
}

export async function GET(request: Request) {
    const week = new URL(request.url).searchParams.get('week')?.trim();
    if (week !== undefined && !isValidWeekRange(week)) {
        return mobileError('BAD_REQUEST', '주차를 MM.DD - MM.DD 형식으로 입력해 주세요.');
    }
    try {
        const schedule = await getScheduleFromSupabase(week, { strict: true });
        if (!schedule) return mobileError('NOT_FOUND', '요청한 주차의 시간표가 없습니다.');
        const { scheduleId, weekRange, weekStartDate, characters, events, canonicalEventsStatus } = schedule;
        return mobileData({
            scheduleId, weekRange, weekStartDate, characters, events, canonicalEventsStatus,
            memoSubmissionEnabled: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        });
    } catch {
        return mobileError('UPSTREAM_UNAVAILABLE', '시간표를 불러오지 못했습니다.');
    }
}
