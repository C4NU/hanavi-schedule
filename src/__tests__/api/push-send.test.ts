import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), checkIsAdmin: vi.fn(), sendOnce: vi.fn() }));
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { getUser: mocks.getUser } } }));
vi.mock('@/utils/supabase', () => ({ checkIsAdmin: mocks.checkIsAdmin }));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({})) }));
vi.mock('@/lib/notifications', () => ({ sendMulticastNotificationOnce: mocks.sendOnce }));
import { POST } from '@/app/api/push/send/route';
function request(deliveryKey: string) {
    return new Request('http://localhost/api/push/send', {
        method: 'POST', headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ deliveryKey, title: '제목', body: '내용' }),
    });
}
beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test');
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin' } } });
    mocks.checkIsAdmin.mockResolvedValue(true);
    mocks.sendOnce.mockResolvedValue({ success: true });
});
it('uses the same delivery claim when a saved-change request is retried', async () => {
    await POST(request('a'.repeat(64)));
    await POST(request('a'.repeat(64)));
    expect(mocks.sendOnce.mock.calls[0][0]).toBe(mocks.sendOnce.mock.calls[1][0]);
    await POST(request('b'.repeat(64)));
    expect(mocks.sendOnce.mock.calls[0][0]).not.toBe(mocks.sendOnce.mock.calls[2][0]);
});
it('rejects non-admin requests before sending', async () => {
    mocks.checkIsAdmin.mockResolvedValue(false);
    expect((await POST(request('a'.repeat(64)))).status).toBe(403);
    expect(mocks.sendOnce).not.toHaveBeenCalled();
});
