// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import NotificationModal from '@/components/admin/NotificationModal';
import { useNotification } from '@/hooks/useNotification';

vi.mock('@/lib/supabaseClient', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'test' } } }) } },
}));

function TestSchedule({ publish = false }: { publish?: boolean }) {
  const notification = useNotification();
  return <>
    <button onClick={() => {
      notification.setDeliveryKey('test-delivery');
      notification.setTimeLeft(60);
      notification.setIsNewRelease(publish);
      notification.setNotifyStatus('pending');
      notification.setIsModalVisible(true);
    }}>저장</button>
    <NotificationModal
      {...notification}
      onClose={() => notification.setIsModalVisible(false)}
      onCancel={notification.cancelNotification}
      onSendNow={() => notification.setTimeLeft(0)}
    />
  </>;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('shows the publish countdown, then sends once and reports success', async () => {
  vi.useFakeTimers();
  const send = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', send);
  render(<TestSchedule publish />);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(screen.getByRole('dialog', { name: '신규 일정 공개 완료' })).toBeTruthy();
  expect(screen.getByText('60초')).toBeTruthy();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: '모달 닫기' }));
  for (let second = 0; second < 59; second++) {
    await act(() => vi.advanceTimersByTimeAsync(1000));
  }
  expect(screen.getByText('1초')).toBeTruthy();
  expect(send).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(send).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('dialog', { name: '알림 발송 완료' })).toBeTruthy();
});

it('shows the change notice and cancels without sending', async () => {
  vi.useFakeTimers();
  const send = vi.fn();
  vi.stubGlobal('fetch', send);
  render(<TestSchedule />);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(screen.getByRole('dialog', { name: '변경사항 저장 완료' })).toBeTruthy();
  expect(screen.getByText(/일정 변경 알림/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '알림 취소' }));
  await act(() => vi.advanceTimersByTimeAsync(60_000));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(send).not.toHaveBeenCalled();
});

it('sends immediately and distinguishes an in-flight request from a failure', async () => {
  let finish: (result: { ok: boolean }) => void = () => {};
  const send = vi.fn().mockReturnValue(new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', send);
  render(<TestSchedule />);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '즉시 발송' })); });
  expect(send).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('dialog', { name: '알림 발송 중' })).toBeTruthy();
  await act(async () => finish({ ok: false }));
  expect(screen.getByRole('dialog', { name: '알림 발송 실패' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '모달 닫기' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
