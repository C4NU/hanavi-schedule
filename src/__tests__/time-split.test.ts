import { describe, it, expect } from 'vitest';
import {
    timeToMinutes,
    extractTimeParts,
    splitScheduleItem,
} from '@/utils/time';
import { ScheduleItem } from '@/types/schedule';

describe('extractTimeParts', () => {
    it('단일 시간', () => {
        expect(extractTimeParts('12:00')).toEqual(['12:00']);
    });

    it('복수 시간 (+ 구분)', () => {
        expect(extractTimeParts('12:00+19:00')).toEqual(['12:00', '19:00']);
        expect(extractTimeParts('10:00+14:00+20:00')).toEqual(['10:00', '14:00', '20:00']);
    });

    it('시간 없는 값은 원본 유지', () => {
        expect(extractTimeParts('??:??')).toEqual(['??:??']);
        expect(extractTimeParts('')).toEqual([]);
        expect(extractTimeParts('미정')).toEqual(['미정']);
    });
});

describe('splitScheduleItem', () => {
    it('단일 시간 아이템은 그대로 반환', () => {
        const item: ScheduleItem = { time: '12:00', content: '월요미스머리' };
        const result = splitScheduleItem(item);
        expect(result).toHaveLength(1);
        expect(result[0].time).toBe('12:00');
        expect(result[0].content).toBe('월요미스머리');
    });

    it('복수 시간 + 복수 내용 → 개별 아이템 분열 (실제 운영 데이터 케이스)', () => {
        // 네무 2026-08-19 수요일 실데이터
        const item: ScheduleItem = {
            time: '12:00+19:00',
            content: '내무습다 + <div>운동하는 날 ㅇ<-< (w/ 김계란)</div>',
            type: 'stream',
            id: 'abc-123',
        };
        const result = splitScheduleItem(item);
        expect(result).toHaveLength(2);
        expect(result[0].time).toBe('12:00');
        expect(result[0].content).toContain('내무습다');
        expect(result[1].time).toBe('19:00');
        expect(result[1].content).toContain('운동하는 날');
        // id는 파생되어 유일성 보장
        expect(result[0].id).not.toBe(result[1].id);
    });

    it('내용 분할 실패 시 첫 조각이 전체 내용 보유', () => {
        const item: ScheduleItem = {
            time: '12:00+19:00',
            content: '하나의 긴 내용',
            type: 'stream',
        };
        const result = splitScheduleItem(item);
        expect(result).toHaveLength(2);
        expect(result[0].content).toBe('하나의 긴 내용');
        expect(result[1].content).toBe('');
    });

    it('빈/널 아이템 안전 처리', () => {
        expect(splitScheduleItem(null as unknown as ScheduleItem)).toEqual([]);
        expect(splitScheduleItem({} as ScheduleItem)).toEqual([{}]);
    });
});
