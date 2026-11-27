"use client";

import { useCallback, useEffect, useState } from 'react';

export type ScheduleTheme = 'classic' | 'v2';

const STORAGE_KEY = 'hanavi_schedule_theme';

/**
 * 스케줄 시간표 테마 상태 ('classic' = 기존 디자인, 'v2' = 2026-08 신규 디자인).
 * localStorage에 영구 저장 — 공개 페이지와 관리자 페이지가 같은 키를 공유해 WYSIWYG 유지.
 */
export function useScheduleTheme() {
    const [theme, setTheme] = useState<ScheduleTheme>('v2');

    useEffect(() => {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'classic' || stored === 'v2') {
            setTheme(stored);
        }
    }, []);

    useEffect(() => {
        if (theme !== 'classic') return;
        document.body.style.backgroundColor = 'var(--color-background)';
        return () => {
            document.body.style.removeProperty('background-color');
        };
    }, [theme]);

    const updateTheme = useCallback((next: ScheduleTheme) => {
        setTheme(next);
        window.localStorage.setItem(STORAGE_KEY, next);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prev => {
            const next: ScheduleTheme = prev === 'v2' ? 'classic' : 'v2';
            window.localStorage.setItem(STORAGE_KEY, next);
            return next;
        });
    }, []);

    return { theme, setTheme: updateTheme, toggleTheme };
}
