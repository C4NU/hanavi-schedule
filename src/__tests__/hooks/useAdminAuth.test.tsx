// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  single: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mocks.single })),
      })),
    })),
  },
}));

describe('useAdminAuth auth state handling', () => {
  let authCallback: ((event: AuthChangeEvent, session: Session | null) => unknown) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.single.mockResolvedValue({ data: { role: 'admin' }, error: null });
    mocks.onAuthStateChange.mockImplementation((callback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns from onAuthStateChange before querying the user role', async () => {
    renderHook(() => useAdminAuth());
    expect(authCallback).toBeTypeOf('function');

    const session = { user: { id: 'admin-user' } } as Session;
    let callbackResult: unknown;
    act(() => {
      callbackResult = authCallback?.('SIGNED_IN', session);
    });

    expect(callbackResult).toBeUndefined();
    expect(mocks.single).not.toHaveBeenCalled();

    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve();
    });

    expect(mocks.single).toHaveBeenCalledTimes(1);
  });
});
