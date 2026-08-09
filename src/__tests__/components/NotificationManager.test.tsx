// @vitest-environment jsdom

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  onMessage: vi.fn(),
  register: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('@/hooks/useSchedule', () => ({
  useSchedule: () => ({ schedule: null, isUsingMock: false }),
}));

vi.mock('@/components/BaseModal', () => ({
  default: () => null,
}));

vi.mock('@/lib/firebase', () => ({
  messaging: {},
}));

vi.mock('firebase/messaging', () => ({
  getToken: mocks.getToken,
  onMessage: mocks.onMessage,
}));

import NotificationManager from '@/components/NotificationManager';

describe('NotificationManager foreground listener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getToken.mockResolvedValue('valid-token-value-that-is-long-enough-for-the-subscribe-endpoint-1234567890');
    mocks.onMessage.mockReturnValue(mocks.unsubscribe);
    mocks.register.mockResolvedValue({ scope: '/' });

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: Object.assign(vi.fn(), { permission: 'granted' }),
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: mocks.register },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  });

  it('unsubscribes the foreground listener when the component unmounts', async () => {
    const view = render(<NotificationManager />);

    await waitFor(() => expect(mocks.onMessage).toHaveBeenCalledTimes(1));
    view.unmount();

    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
