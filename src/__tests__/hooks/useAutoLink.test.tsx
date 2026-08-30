// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoLink } from '@/hooks/useAutoLink';
import type { WeeklySchedule } from '@/types/schedule';

describe('useAutoLink canonical parts', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            json: () => Promise.resolve({
                videos: [
                    { title: '26.08.24 첫 다시보기', url: 'https://youtu.be/first' },
                    { title: '26.08.24 두 번째 다시보기', url: 'https://youtu.be/second' },
                ],
            }),
        }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('links each same-day video to a different canonical part', async () => {
        const schedule: WeeklySchedule = {
            weekRange: '08.24 - 08.30',
            characters: [{
                id: 'cherii',
                name: '체리',
                colorTheme: 'cherii',
                avatarUrl: '',
                youtubeChannelId: 'channel',
                schedule: {
                    MON: {
                        time: '14:00+20:00',
                        content: '첫 방송 + 두 번째 방송',
                        type: 'stream',
                        parts: [
                            { id: '11111111-1111-4111-8111-111111111111', time: '14:00', content: '첫 방송', type: 'stream' },
                            { id: '22222222-2222-4222-8222-222222222222', time: '20:00', content: '두 번째 방송', type: 'stream' },
                        ],
                    },
                },
            }],
        };
        const onScheduleUpdate = vi.fn();
        const { result } = renderHook(() => useAutoLink());

        await act(async () => {
            await result.current.runAutoLink(schedule, new Date(2026, 7, 24), onScheduleUpdate);
        });

        const updated = onScheduleUpdate.mock.calls[0][0] as WeeklySchedule;
        expect(updated.characters[0].schedule.MON.parts?.map((part) => part.videoUrl)).toEqual([
            'https://youtu.be/first',
            'https://youtu.be/second',
        ]);
    });
});
