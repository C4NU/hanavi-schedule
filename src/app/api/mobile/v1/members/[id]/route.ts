import { mobileData, mobileError } from '@/lib/mobileApiResponse';
import { getMobileMembers } from '@/lib/publicMobileMembers';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
        return mobileError('BAD_REQUEST', '멤버 ID 형식이 올바르지 않습니다.');
    }
    try {
        const [member] = await getMobileMembers(id);
        return member ? mobileData(member) : mobileError('NOT_FOUND', '요청한 멤버가 없습니다.');
    } catch {
        return mobileError('UPSTREAM_UNAVAILABLE', '멤버 정보를 불러오지 못했습니다.');
    }
}
