// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useNotification } from '@/hooks/useNotification';

const getSession = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabaseClient', () => ({ supabase: { auth: { getSession } } }));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
});

it('keeps an in-flight notification tied to its save when a newer save is queued', async () => {
    const session = { data: { session: { access_token: 'test-token' } } };
    let completeSession!: (value: typeof session) => void;
    getSession.mockReturnValue(new Promise<typeof session>((resolve) => { completeSession = resolve; }));
    const deliver = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', deliver);

    const { result } = renderHook(useNotification);
    act(() => {
        result.current.setDeliveryKey('a'.repeat(64));
        result.current.setIsNewRelease(true);
    });
    let firstSend!: Promise<void>;
    act(() => {
        firstSend = result.current.sendNotification();
    });
    act(() => {
        result.current.setDeliveryKey('b'.repeat(64));
        result.current.setTimeLeft(60);
        result.current.setNotifyStatus('pending');
        result.current.setIsNewRelease(false);
    });

    await act(async () => {
        completeSession(session);
        await firstSend;
    });

    const body = JSON.parse(deliver.mock.calls[0][1].body);
    expect(body).toMatchObject({ deliveryKey: 'a'.repeat(64), title: '신규 스케줄 공개 📢' });
    expect(result.current.notifyStatus).toBe('pending');
});
