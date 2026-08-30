// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('keeps separate event ids as separate Sunday blocks', () => {
    const data: WeeklySchedule = {
      weekRange: '08.24 - 08.30',
      characters: [
        {
          id: 'cherii',
          name: '체리',
          colorTheme: 'cherii',
          avatarUrl: '',
          schedule: {
            SUN: {
              time: '14:00',
              content: '첫 합방',
              type: 'collab',
              eventId: '11111111-1111-4111-8111-111111111111',
              eventMemberIds: ['cherii', 'nemu'],
            },
          },
        },
        {
          id: 'nemu',
          name: '네무',
          colorTheme: 'nemu',
          avatarUrl: '',
          schedule: {
            SUN: {
              time: '14:00',
              content: '첫 합방',
              type: 'collab',
              eventId: '11111111-1111-4111-8111-111111111111',
              eventMemberIds: ['cherii', 'nemu'],
            },
          },
        },
        {
          id: 'sena',
          name: '세나',
          colorTheme: 'sena',
          avatarUrl: '',
          schedule: {
            SUN: {
              time: '19:00',
              content: '두 번째 합방',
              type: 'collab',
              eventId: '22222222-2222-4222-8222-222222222222',
              eventMemberIds: ['sena'],
            },
          },
        },
      ],
    };

    render(<WeeklyTimetable data={data} selectedCharacters={new Set(['cherii', 'nemu', 'sena'])} />);

    expect(screen.getByText('첫 합방')).toBeTruthy();
    expect(screen.getByText('두 번째 합방')).toBeTruthy();
    expect(screen.getByText('합방 2인')).toBeTruthy();
  });

  it('passes the source day to weekly editor clicks', () => {
    const onItemClick = vi.fn();
    const data: WeeklySchedule = {
      weekRange: '08.24 - 08.30',
      characters: [{
        id: 'cherii',
        name: '체리',
        colorTheme: 'cherii',
        avatarUrl: '',
        schedule: {
          TUE: { time: '14:00', content: '화요일 방송', type: 'stream' },
          SUN: { time: '18:00', content: '일요일 방송', type: 'stream' },
        },
      }],
    };

    render(<WeeklyTimetable data={data} selectedCharacters={new Set(['cherii'])} onItemClick={onItemClick} />);

    fireEvent.click(screen.getByText('화요일 방송'));
    fireEvent.click(screen.getByText('일요일 방송'));

    expect(onItemClick.mock.calls.map(([, , day]) => day)).toEqual(['TUE', 'SUN']);
  });
});
