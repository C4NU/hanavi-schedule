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

    const schedule = (data && !error) ? data : MOCK_SCHEDULE;

    return {
        schedule,
        isLoading,
        isError: error,
        isUsingMock: !!error || !data
    };
}
