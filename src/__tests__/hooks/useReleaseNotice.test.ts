// @vitest-environment jsdom

import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { SCHEDULE_RELEASE_VERSION } from '@/data/scheduleRelease';
import { dismissReleaseNotice, useReleaseNotice } from '@/hooks/useReleaseNotice';

const storageKey = 'hanavi_seen_release';

afterEach(() => {
    cleanup();
    localStorage.removeItem(storageKey);
});

it('shows a new version and synchronizes dismissal across consumers', () => {
    localStorage.setItem(storageKey, '1.0.0');
    const schedule = renderHook(useReleaseNotice);
    const notificationPrompt = renderHook(useReleaseNotice);

    expect(schedule.result.current).toBe(true);
    expect(notificationPrompt.result.current).toBe(true);
    act(dismissReleaseNotice);
    expect(schedule.result.current).toBe(false);
    expect(notificationPrompt.result.current).toBe(false);
    expect(localStorage.getItem(storageKey)).toBe(SCHEDULE_RELEASE_VERSION);
});

it('does not reopen a release already seen in this browser', () => {
    localStorage.setItem(storageKey, SCHEDULE_RELEASE_VERSION);
    expect(renderHook(useReleaseNotice).result.current).toBe(false);
});
