import { mobileData, mobileError } from '@/lib/mobileApiResponse';
import { installationKey, mobilePushEnabled, parseMobilePushToken, removeMobilePushToken, reserveMobilePushRegistration, saveMobilePushToken } from '@/lib/mobilePush';
import { readJsonBody, RequestBodyError } from '@/lib/requestBody';

export async function PUT(request: Request) {
    if (!mobilePushEnabled()) return mobileError('NOT_FOUND', '앱 알림 등록을 사용할 수 없습니다.');
    const key = installationKey(request);
    if (!key) return mobileError('UNAUTHORIZED', '기기 등록 인증을 확인해 주세요.');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        return mobileError('BAD_REQUEST', 'JSON 요청이 필요합니다.');
    }
    try {
        const input = parseMobilePushToken(await readJsonBody(request, 1024));
        if (!input) return mobileError('BAD_REQUEST', '기기의 FCM 토큰과 플랫폼을 확인해 주세요.');
        if (!await reserveMobilePushRegistration(request)) return mobileError('RATE_LIMITED', '잠시 뒤 다시 시도해 주세요.');
        if (!await saveMobilePushToken(key, input)) return mobileError('BAD_REQUEST', '사용할 수 없는 FCM 토큰입니다.');
        return mobileData({ subscribed: true });
    } catch (error) {
        if (error instanceof RequestBodyError) {
            return error.status === 413 ? mobileError('PAYLOAD_TOO_LARGE', '요청이 너무 큽니다.')
                : mobileError('BAD_REQUEST', '알림 등록 요청을 확인해 주세요.');
        }
        return mobileError('UPSTREAM_UNAVAILABLE', '알림을 등록할 수 없습니다.');
    }
}

export async function DELETE(request: Request) {
    if (!mobilePushEnabled()) return mobileError('NOT_FOUND', '앱 알림 등록을 사용할 수 없습니다.');
    const key = installationKey(request);
    if (!key) return mobileError('UNAUTHORIZED', '기기 등록 인증을 확인해 주세요.');
    try {
        if (!await reserveMobilePushRegistration(request)) return mobileError('RATE_LIMITED', '잠시 뒤 다시 시도해 주세요.');
        await removeMobilePushToken(key);
        return mobileData({ subscribed: false });
    } catch {
        return mobileError('UPSTREAM_UNAVAILABLE', '알림 구독을 해제할 수 없습니다.');
    }
}
