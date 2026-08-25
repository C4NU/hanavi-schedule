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

    // v2는 흰 페이지 캔버스(그리드 영역만 그라데이션 패널), classic은 기존 핑크 배경 유지
    useEffect(() => {
        document.body.style.background = theme === 'v2' ? '#ffffff' : '';
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
