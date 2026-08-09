import { describe, expect, it } from 'vitest';
import { updateScheduleItem } from '@/utils/scheduleEditor';
import { WeeklySchedule } from '@/types/schedule';

const schedule: WeeklySchedule = {
    weekRange: '08.03 - 08.09',
    characters: [
        {
            id: 'a',
            name: 'A',
            colorTheme: 'a',
            avatarUrl: '',
            schedule: {
                MON: { time: '19:00', content: '', type: 'stream' },
                TUE: { time: '20:00', content: '기존', type: 'stream' },
            },
        },
        {
            id: 'b',
            name: 'B',
            colorTheme: 'b',
            avatarUrl: '',
            schedule: {
                MON: { time: '21:00', content: '다른 멤버', type: 'stream' },
            },
        },
    ],
};

describe('updateScheduleItem', () => {
    it('updates only the edited path without mutating the previous schedule', () => {
        const result = updateScheduleItem(schedule, 'a', 'MON', 'content', '한글 입력');

        expect(result).not.toBe(schedule);
        expect(result.characters).not.toBe(schedule.characters);
        expect(result.characters[0]).not.toBe(schedule.characters[0]);
        expect(result.characters[0].schedule).not.toBe(schedule.characters[0].schedule);
        expect(result.characters[0].schedule.MON).not.toBe(schedule.characters[0].schedule.MON);
        expect(result.characters[0].schedule.TUE).toBe(schedule.characters[0].schedule.TUE);
        expect(result.characters[1]).toBe(schedule.characters[1]);
        expect(schedule.characters[0].schedule.MON.content).toBe('');
        expect(result.characters[0].schedule.MON.content).toBe('한글 입력');
    });

    it('creates a missing day with the expected defaults', () => {
        const result = updateScheduleItem(schedule, 'a', 'WED', 'category', '공지');

        expect(result.characters[0].schedule.WED).toEqual({
            time: '',
            content: '',
            type: 'stream',
            category: '공지',
        });
    });
});
