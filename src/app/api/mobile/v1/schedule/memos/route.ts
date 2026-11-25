import { mobileData, mobileError } from '@/lib/mobileApiResponse';
import { isPublicMemoTarget, parseMobileMemo, submitPublicMobileMemo } from '@/lib/mobileScheduleMemo';
import { readJsonBody, RequestBodyError } from '@/lib/requestBody';
import { getScheduleFromSupabase } from '@/utils/supabase';

export async function POST(request: Request) {
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
        return mobileError('BAD_REQUEST', 'JSON 요청이 필요합니다.');
    }
    try {
        const input = parseMobileMemo(await readJsonBody(request, 2048));
        if (!input) return mobileError('BAD_REQUEST', '제보 대상과 100자 이내 내용을 확인해 주세요.');
        const schedule = await getScheduleFromSupabase(input.week, { strict: true });
        if (!schedule?.scheduleId || schedule.weekRange !== input.week || !isPublicMemoTarget(schedule, input.target)) {
            return mobileError('NOT_FOUND', '제보할 수 있는 공개 방송을 찾을 수 없습니다.');
        }
        const result = await submitPublicMobileMemo(input, request, schedule.scheduleId);
        switch (result.outcome) {
            case 'created': return mobileData(result.memo, 201);
            case 'existing': return mobileData(result.memo);
            case 'not_found': return mobileError('NOT_FOUND', '방송을 찾을 수 없습니다.');
            case 'conflict': return mobileError('CONFLICT', '이미 다른 내용으로 처리된 제보입니다.');
            case 'rate_limited': return mobileError('RATE_LIMITED', '잠시 뒤 다시 시도해 주세요.');
            default: return mobileError('UPSTREAM_UNAVAILABLE', '제보를 저장할 수 없습니다.');
        }
    } catch (error) {
        if (error instanceof RequestBodyError) {
            return error.status === 413 ? mobileError('PAYLOAD_TOO_LARGE', '요청이 너무 큽니다.')
                : mobileError('BAD_REQUEST', '제보 요청을 확인해 주세요.');
        }
        return mobileError('UPSTREAM_UNAVAILABLE', '제보를 저장할 수 없습니다.');
    }
}
