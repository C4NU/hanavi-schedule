import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ set: vi.fn(), remove: vi.fn(), get: vi.fn(), send: vi.fn(), transaction: vi.fn() }));
vi.mock('@/lib/firebase-admin', () => ({
    db: {
        collection: (name: string) => ({ doc: (id: string) => ({
            set: (data: unknown) => mocks.set(name, id, data),
            delete: () => mocks.remove(name, id),
        }) }),
        runTransaction: (fn: (transaction: unknown) => unknown) => fn({
            get: mocks.get,
            set: mocks.transaction,
        }),
    },
    messagingAdmin: { send: mocks.send },
}));

import { DELETE, PUT } from '@/app/api/mobile/v1/push/subscription/route';

const endpoint = 'https://example.test/api/mobile/v1/push/subscription';
const key = 'A'.repeat(43);
const token = 'a'.repeat(140);
const request = (method: 'PUT' | 'DELETE', installation = key, body: unknown = { token, platform: 'ios' }) => new Request(endpoint, {
    method,
    headers: { authorization: `Bearer ${installation}`, 'content-type': 'application/json' },
    body: method === 'PUT' ? JSON.stringify(body) : undefined,
});

describe('모바일 푸시 구독', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.stubEnv('MOBILE_PUSH_ENABLED', 'true');
        mocks.get.mockResolvedValue({ data: () => undefined });
        mocks.send.mockResolvedValue('dry-run');
    });
    afterEach(() => vi.unstubAllEnvs());

    it('FCM dry-run으로 토큰을 확인하고 같은 설치의 토큰만 갱신하거나 해제한다', async () => {
        expect((await PUT(request('PUT'))).status).toBe(200);
        const rotatedToken = 'b'.repeat(140);
        expect((await PUT(request('PUT', key, { token: rotatedToken, platform: 'ios' }))).status).toBe(200);
        expect(mocks.send).toHaveBeenCalledWith({ token, data: { url: '/' } }, true);
        const [name, encodedKey] = mocks.set.mock.calls[0];
        expect(name).toBe('mobile_fcm_tokens');
        expect(encodedKey).toMatch(/^[0-9a-f]{64}$/);
        expect(mocks.set).toHaveBeenLastCalledWith(name, encodedKey, { token: rotatedToken, platform: 'ios', expiresAt: expect.any(Date) });
        expect((await DELETE(request('DELETE', 'B'.repeat(43)))).status).toBe(200);
        expect(mocks.remove.mock.calls[0][1]).not.toBe(encodedKey);
        expect((await DELETE(request('DELETE'))).status).toBe(200);
        expect(mocks.remove).toHaveBeenLastCalledWith(name, encodedKey);
    });

    it('비활성화, 잘못된 키·입력과 발송할 수 없는 토큰을 거절한다', async () => {
        expect((await PUT(request('PUT', 'bad'))).status).toBe(401);
        expect((await PUT(request('PUT', key, { token: 'bad', platform: 'ios' }))).status).toBe(400);
        expect((await PUT(request('PUT', key, { token, platform: 'web' }))).status).toBe(400);
        expect((await PUT(request('PUT', key, { token: 'x'.repeat(1100), platform: 'ios' }))).status).toBe(413);
        mocks.send.mockRejectedValueOnce({ code: 'messaging/registration-token-not-registered' });
        expect((await PUT(request('PUT'))).status).toBe(400);
        expect(mocks.set).not.toHaveBeenCalled();
        vi.stubEnv('MOBILE_PUSH_ENABLED', 'false');
        expect((await DELETE(request('DELETE'))).status).toBe(404);
        expect(mocks.remove).not.toHaveBeenCalled();
    });

    it('요청 한도를 넘으면 Firebase 발송 검증과 구독 저장을 호출하지 않는다', async () => {
        mocks.get.mockResolvedValue({ data: () => ({ startedAt: Date.now(), count: 30 }) });
        expect((await PUT(request('PUT'))).status).toBe(429);
        expect(mocks.send).not.toHaveBeenCalled();
        expect(mocks.set).not.toHaveBeenCalled();
    });
});
