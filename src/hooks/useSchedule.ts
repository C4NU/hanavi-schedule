import { useState, useEffect, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { WeeklySchedule } from '@/types/schedule';
import { MOCK_SCHEDULE } from '@/data/mockSchedule';
import { getMonday, getStartDateFromRange } from '@/utils/date';
const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
});

export function useSchedule(weekRange?: string) {
    const shouldSkip = weekRange === 'SKIP';
    const key = shouldSkip ? null : (weekRange ? `/api/schedule?week=${encodeURIComponent(weekRange)}` : '/api/schedule');

    const { data, error, isLoading, mutate } = useSWR<WeeklySchedule>(key, fetcher, {
        refreshInterval: 60000,
        revalidateOnFocus: true,
        dedupingInterval: 5000,
        onSuccess: (data) => {
            if (data && !shouldSkip) {
                try {
                    localStorage.setItem('hanavi_last_schedule', JSON.stringify(data));
                } catch (e) {
                    console.error('Failed to cache schedule', e);
                }
            }
        }
    });

    const [cachedSchedule, setCachedSchedule] = useState<WeeklySchedule | null>(null);

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

    // Priority: Real Data (SWR) -> Cached Data (LocalStorage) -> Mock Data
    const isCacheValid = cachedSchedule && (!weekRange || cachedSchedule.weekRange === weekRange);

    // If we have a requested weekRange, ensure the fallback mock also reflects it (to prevent date bouncing visually)
    const effectiveMock = useMemo(() => ({ 
        ...MOCK_SCHEDULE, 
        weekRange: weekRange || MOCK_SCHEDULE.weekRange 
    }), [weekRange]);

    // Ensure graduated members are filtered out from cached/mock data based on currently requested week
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

    const schedule = useMemo(() => {
        const raw = (data && !error) 
            ? data 
            : (isCacheValid ? cachedSchedule! : effectiveMock);
        
        return filterGraduates(raw);
    }, [data, error, isCacheValid, cachedSchedule, effectiveMock, filterGraduates]);

    // Consider it "using mock" only if we have NO real data and NO cached data
    const isUsingRealData = !!(data && !error);
    const isUsingCachedData = !!cachedSchedule;
    const isUsingMock = !isUsingRealData && !isUsingCachedData;

    return {
        schedule,
        isLoading,
        isError: error,
        isUsingMock,
        isCached: !isUsingRealData && isUsingCachedData,
        mutate
    };
}
