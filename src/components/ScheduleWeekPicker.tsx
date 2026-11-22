"use client";

import { useState } from 'react';
import type { ScheduleTheme } from '@/hooks/useScheduleTheme';
import { formatWeekRange, formatWeekRangeShort } from '@/utils/date';
import headerStyles from './ScheduleHeader.module.css';

interface ScheduleWeekPickerProps {
  date: Date;
  theme: ScheduleTheme;
  onChange: (date: Date) => void;
}

export default function ScheduleWeekPicker({ date, theme, onChange }: ScheduleWeekPickerProps) {
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const weekRangeString = formatWeekRange(date);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsDateDropdownOpen(open => !open)}
        aria-expanded={isDateDropdownOpen}
        className={`${headerStyles.button} ${headerStyles.dateButton}`}
      >
        <span className={headerStyles.dateLabel}>
          {theme === 'v2' ? formatWeekRangeShort(weekRangeString) : weekRangeString}
        </span>
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isDateDropdownOpen && (
        <>
          <div className="fixed inset-0 z-[150]" onClick={() => setIsDateDropdownOpen(false)} />
          <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 z-[151] max-h-60 overflow-y-auto p-1 ${headerStyles.dateOptions}`}>
            {Array.from({ length: 9 }).map((_, i) => {
              const offset = i - 4; // -4 to +4 weeks
              const d = new Date(date);
              d.setDate(d.getDate() + (offset * 7));
              const rangeStr = formatWeekRange(d);
              const isCurrent = offset === 0;

              return (
                <button
                  key={i}
                  type="button"
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => {
                    onChange(d);
                    setIsDateDropdownOpen(false);
                  }}
                  className={headerStyles.dateOption}
                >
                  <span className={headerStyles.dateLabel}>{rangeStr}</span>
                  {isCurrent && <span>✓</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
