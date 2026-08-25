import { describe, expect, it } from 'vitest';
import { timeToMinutes, formatWeekRangeShort } from '@/utils/date';

describe('timeToMinutes', () => {
  it('parses valid timetable times including next-day hours', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('24:00')).toBe(1440);
    expect(timeToMinutes('25:30')).toBe(1530);
  });

  it('rejects unknown or malformed times instead of returning NaN', () => {
    expect(timeToMinutes('??:??')).toBeNull();
    expect(timeToMinutes('19:xx')).toBeNull();
    expect(timeToMinutes('19:60')).toBeNull();
    expect(timeToMinutes('')).toBeNull();
  });
});

describe('formatWeekRangeShort', () => {
  it('converts "MM.DD - MM.DD" to "M.D ~ M.D" (v2 헤더 표시용)', () => {
    expect(formatWeekRangeShort('08.24 - 08.30')).toBe('8.24 ~ 8.30');
    expect(formatWeekRangeShort('12.29 - 01.04')).toBe('12.29 ~ 1.4');
  });

  it('returns the original value when the range format is unexpected', () => {
    expect(formatWeekRangeShort('')).toBe('');
    expect(formatWeekRangeShort('08.24')).toBe('08.24');
  });
});
