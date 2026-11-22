"use client";

import { useSyncExternalStore } from 'react';
import { SCHEDULE_RELEASE_VERSION } from '@/data/scheduleRelease';

const storageKey = 'hanavi_seen_release';
const changeEvent = 'hanavi-release-seen';
let dismissedForPage = false;

function needsReleaseNotice() {
    try {
        return !dismissedForPage && localStorage.getItem(storageKey) !== SCHEDULE_RELEASE_VERSION;
    } catch {
        return !dismissedForPage;
    }
}

function subscribe(onChange: () => void) {
    window.addEventListener(changeEvent, onChange);
    window.addEventListener('storage', onChange);
    return () => {
        window.removeEventListener(changeEvent, onChange);
        window.removeEventListener('storage', onChange);
    };
}

export function useReleaseNotice() {
    return useSyncExternalStore(subscribe, needsReleaseNotice, () => false);
}

export function dismissReleaseNotice() {
    try {
        localStorage.setItem(storageKey, SCHEDULE_RELEASE_VERSION);
    } catch {
        // 저장소가 차단돼도 현재 페이지에서는 닫을 수 있다.
        dismissedForPage = true;
    }
    window.dispatchEvent(new Event(changeEvent));
}
