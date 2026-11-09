import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getScheduleFromSupabase: vi.fn(),
  sendMulticastNotificationOnce: vi.fn(),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => ({ data, status: init?.status ?? 200 }),
  },
}));

vi.mock('@/utils/supabase', () => ({
  getScheduleFromSupabase: mocks.getScheduleFromSupabase,
}));

vi.mock('@/lib/notifications', () => ({
  sendMulticastNotification: vi.fn(),
  sendMulticastNotificationOnce: mocks.sendMulticastNotificationOnce,
}));

describe('daily summary notification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T00:00:00.000Z'));
    vi.stubEnv('CRON_SECRET', 'cron-secret');
    mocks.getScheduleFromSupabase.mockResolvedValue({
      weekRange: '08.10 - 08.16',
      characters: [{
        id: 'member-a',
        name: '멤버 A',
        colorTheme: 'member-a',
        avatarUrl: '',
        schedule: {
          MON: { time: '20:00', content: '방송', type: 'stream' },
        },
      }],
    });
    mocks.sendMulticastNotificationOnce.mockResolvedValue({
      success: true,
      successCount: 1,
      failureCount: 0,
    });
  });

  it('uses the KST date as an idempotency key', async () => {
    const { GET } = await import('@/app/api/push/daily-summary/route');
    const request = new Request('http://localhost/api/push/daily-summary', {
      headers: { authorization: 'Bearer cron-secret' },
    });

    await GET(request);

    expect(mocks.sendMulticastNotificationOnce).toHaveBeenCalledWith(
      'daily-summary-2026-08-10',
      expect.any(String),
      expect.any(String),
      '/icon-192x192.png',
    );
  });
  it('includes a collaboration once and keeps a later personal stream', async () => {
    const part = { id: 'shared', time: '18:00', content: '합방', type: 'collab', eventMemberIds: ['a', 'b'] };
    mocks.getScheduleFromSupabase.mockResolvedValue({ characters: [
      { id: 'a', name: 'A', schedule: { MON: { parts: [part, { id: 'solo', time: '20:00', content: '개인', type: 'stream' }] } } },
      { id: 'b', name: 'B', schedule: { MON: { parts: [part] } } },
    ] });
    const { GET } = await import('@/app/api/push/daily-summary/route');
    await GET(new Request('http://localhost/api/push/daily-summary', { headers: { authorization: 'Bearer cron-secret' } }));
    const body = mocks.sendMulticastNotificationOnce.mock.calls[0][2];
    expect(body.match(/합방/g)).toHaveLength(1);
    expect(body).toContain('A·B');
    expect(body).toContain('개인');
  });

});
