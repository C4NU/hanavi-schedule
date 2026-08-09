// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WeeklyTimetable from '@/components/WeeklyTimetable';
import type { WeeklySchedule } from '@/types/schedule';

describe('WeeklyTimetable time positioning', () => {
  it('does not pass an unknown schedule time to a CSS top position', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const data: WeeklySchedule = {
      weekRange: '08.03 - 08.09',
      characters: [{
        id: 'ruvi',
        name: '루비',
        colorTheme: 'ruvi',
        avatarUrl: '',
        schedule: {
          SUN: { time: '??:??', content: '시간 미정', type: 'stream' },
        },
      }],
    };

    render(<WeeklyTimetable data={data} selectedCharacters={new Set(['ruvi'])} />);

    expect(screen.queryByText('??:??')).toBeNull();
    expect(consoleError.mock.calls.some((args) => String(args[0]).includes('NaN'))).toBe(false);
    consoleError.mockRestore();
  });
});
