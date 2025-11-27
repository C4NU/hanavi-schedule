import useSWR from 'swr';
import { WeeklySchedule } from '@/types/schedule';
import { RAW_SCHEDULE_TEXT } from '@/data/rawSchedule';
import { parseSchedule } from '@/utils/parser';

const fetcher = (url: string) => fetch(url).then((res) => {
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
});

export function useSchedule() {
    const { data, error, isLoading } = useSWR<WeeklySchedule>('/api/schedule', fetcher, {
        refreshInterval: 60000,
        shouldRetryOnError: false,
    });

    // Fallback: Parse the raw text locally
    // This simulates what would happen on the server or client when receiving text from Google Docs
    const fallbackSchedule = parseSchedule(RAW_SCHEDULE_TEXT);

    const schedule = (data && !error) ? data : fallbackSchedule;

    return {
        schedule,
        isLoading,
        isError: error,
        isUsingMock: !!error || !data
    };
}
