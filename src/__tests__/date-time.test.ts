import { describe, expect, it } from 'vitest';
import { timeToMinutes } from '@/utils/date';

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
