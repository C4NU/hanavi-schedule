import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { WeeklySchedule } from '@/types/schedule';
import { MOCK_SCHEDULE } from '@/data/mockSchedule';

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
});

export function useSchedule() {
    const { data, error, isLoading } = useSWR<WeeklySchedule>('/api/schedule', fetcher, {
        refreshInterval: 60000,
        revalidateOnFocus: true,
        dedupingInterval: 5000,
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
    const schedule = (data && !error) ? data : (cachedSchedule || MOCK_SCHEDULE);

    // Consider it "using mock" only if we have NO real data and NO cached data
    // If we are using cached data, isUsingMock should be false so we don't treat it as "loading state"
    const isUsingRealData = !!(data && !error);
    const isUsingCachedData = !!cachedSchedule;

    // We want changes from Mock -> Cache -> Real to be handled carefully.
    // For the UI, "isUsingMock" usually implies "show loading state" or "this is fake data".
    // If we have cached data, it IS real data (just old), so isUsingMock should be false.
    const isUsingMock = !isUsingRealData && !isUsingCachedData;

    return {
        schedule,
        isLoading,
        isError: error,
        isUsingMock,
        isCached: !isUsingRealData && isUsingCachedData
    };
}
