import { mobileData, mobileError } from '@/lib/mobileApiResponse';
import { searchPublicSchedule } from '@/lib/publicScheduleSearch';
import { SEARCH_QUERY_LIMIT } from '@/utils/scheduleSearch';

export async function GET(request: Request) {
    const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
    if (!query || query.length > SEARCH_QUERY_LIMIT) {
        return mobileError('BAD_REQUEST', '검색어는 1~80자로 입력해 주세요.');
    }
    try {
        return mobileData(await searchPublicSchedule(query));
    } catch {
        return mobileError('UPSTREAM_UNAVAILABLE', '시간표 검색을 불러오지 못했습니다.');
    }
}
