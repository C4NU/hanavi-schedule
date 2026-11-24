import { mobileData, mobileError } from '@/lib/mobileApiResponse';
import { getMobileGroupLinks } from '@/lib/publicMobileMembers';

export async function GET() {
    try {
        return mobileData(await getMobileGroupLinks());
    } catch {
        return mobileError('UPSTREAM_UNAVAILABLE', '공식 링크를 불러오지 못했습니다.');
    }
}
