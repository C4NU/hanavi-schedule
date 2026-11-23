import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/youtube/videos/route';

const { getUser, checkIsAdmin } = vi.hoisted(() => ({
    getUser: vi.fn(),
    checkIsAdmin: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser } }) }));
vi.mock('@/utils/supabase', () => ({ checkIsAdmin }));

const channelId = 'UCabcdefghijklmnopqrstuv';
const call = (token?: string) => GET(new Request(`http://localhost/api/youtube/videos?channelId=${channelId}`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
}));

const upstream = vi.fn();

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', upstream);
    vi.stubEnv('YOUTUBE_API_KEY', 'test-key');
    getUser.mockResolvedValue({ data: { user: { id: 'user' } }, error: null });
    checkIsAdmin.mockResolvedValue(true);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe('관리자 YouTube 영상 조회', () => {
    it('비로그인과 일반 멤버의 요청을 YouTube 호출 전에 차단한다', async () => {
        expect((await call()).status).toBe(401);
        checkIsAdmin.mockResolvedValue(false);
        expect((await call('member-token')).status).toBe(403);
        expect(upstream).not.toHaveBeenCalled();
    });

    it('업로드 목록 ID와 최근 영상에 서로 다른 캐시 주기를 적용한다', async () => {
        upstream.mockResolvedValueOnce(Response.json({
            items: [{ contentDetails: { relatedPlaylists: { uploads: 'uploads-id' } } }],
        })).mockResolvedValueOnce(Response.json({ items: [] }));

        const response = await call('admin-token');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ videos: [] });
        expect(upstream).toHaveBeenNthCalledWith(1, expect.stringContaining('/channels?'), expect.objectContaining({
            headers: { 'x-goog-api-key': 'test-key' },
            next: { revalidate: 86400 },
        }));
        expect(upstream).toHaveBeenNthCalledWith(2, expect.stringContaining('playlistId=uploads-id'), expect.objectContaining({
            next: { revalidate: 300 },
        }));
        expect(upstream.mock.calls.every(([url]) => !url.includes('test-key'))).toBe(true);
    });

    it.each([
        [400, 503, 'configuration', { details: [{ reason: 'API_KEY_INVALID' }] }],
        [403, 503, 'quota', { errors: [{ reason: 'quotaExceeded' }] }],
        [500, 502, 'unavailable', {}],
    ])('API 응답 %i를 조회 실패로 반환한다', async (status, expectedStatus, code, error) => {
        upstream.mockResolvedValueOnce(Response.json({ error }, { status }));

        const response = await call('admin-token');
        expect(response.status).toBe(expectedStatus);
        expect(await response.json()).toMatchObject({ code });
    });
});
