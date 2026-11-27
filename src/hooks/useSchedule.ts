import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR, { preload } from 'swr';
import { WeeklySchedule } from '@/types/schedule';
import { getMonday, getStartDateFromRange } from '@/utils/date';
const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
});

const scheduleKey = (weekRange?: string) =>
    weekRange && weekRange !== 'undefined' ? `/api/schedule?week=${encodeURIComponent(weekRange)}` : '/api/schedule';

export function preloadScheduleWeek(weekRange: string) {
    void preload(scheduleKey(weekRange), fetcher).catch(() => undefined);
}

export function useSchedule(weekRange?: string) {
    const shouldSkip = weekRange === 'SKIP';
    const key = shouldSkip ? null : scheduleKey(weekRange);

    const [cachedSchedule, setCachedSchedule] = useState<WeeklySchedule | null>(null);

    const { data, error, isLoading, mutate } = useSWR<WeeklySchedule>(key, fetcher, {
        refreshInterval: 60000,
        revalidateOnFocus: true,
        dedupingInterval: 5000,
        onSuccess: (data) => {
            if (data && !shouldSkip) {
                setCachedSchedule(data);
                try {
                    localStorage.setItem('hanavi_last_schedule', JSON.stringify(data));
                } catch (e) {
                    console.error('Failed to cache schedule', e);
                }
            }
        }
    });

    useEffect(() => {
        try {
            const stored = localStorage.getItem('hanavi_last_schedule');
            if (stored) {
                setCachedSchedule(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load cached schedule', e);
        }
    }, []);

    const cachedForWeek = cachedSchedule && (!weekRange || cachedSchedule.weekRange === weekRange)
        ? cachedSchedule : null;

    // Ensure graduated members are filtered out from cached data based on currently requested week
    const filterGraduates = useCallback((sched: WeeklySchedule) => {
        const monday = weekRange ? getStartDateFromRange(weekRange) : getMonday(new Date());
        monday.setHours(0, 0, 0, 0);
        
        return {
            ...sched,
            characters: sched.characters.filter(char => {
                if (char.status === 'graduated') {
                    if (!char.graduationDate) return false;
                    const gradDate = new Date(char.graduationDate);
                    gradDate.setHours(0, 0, 0, 0);
                    return gradDate >= monday;
                }
                return true;
            })
        };
    }, [weekRange]);

    const schedule = useMemo(() => filterGraduates(
        data ?? cachedForWeek ?? { weekRange: weekRange ?? '', characters: [] }
    ), [data, cachedForWeek, weekRange, filterGraduates]);

    const isUsingRealData = !!(data && !error);
    const isUsingCachedData = Boolean(data || cachedForWeek);
    const isUsingMock = !isUsingRealData && !isUsingCachedData;

    return {
        schedule,
        isLoading,
        isError: error,
        isUsingRealData,
        isUsingMock,
        isCached: !isUsingRealData && isUsingCachedData,
        mutate
    };
}
