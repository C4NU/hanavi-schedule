import { mobileData, mobileError } from '@/lib/mobileApiResponse';
import { getMobileMembers } from '@/lib/publicMobileMembers';

export async function GET() {
    try {
        return mobileData(await getMobileMembers());
    } catch {
        return mobileError('UPSTREAM_UNAVAILABLE', '멤버 목록을 불러오지 못했습니다.');
    }
}
