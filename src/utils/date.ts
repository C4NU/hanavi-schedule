
/**
 * Unifies date parsing logic across the application.
 * Handles "MM.DD" or "MM.DD - MM.DD" formats and ensures correct year assignment.
 */

/**
 * Parses a "MM.DD" string into a Date object.
 * Infers the year based on the current date to handle year-end/year-start transitions.
 */
export function parseMMDD(mmdd: string, baseDate: Date = new Date()): Date {
    const [month, day] = mmdd.split('.').map(Number);
    const date = new Date(baseDate);
    
    date.setMonth(month - 1);
    date.setDate(day);
    date.setHours(0, 0, 0, 0);

    // Handle year transitions (e.g., if now is Jan and we parse Dec, it might be last year)
    // If now is Dec and we parse Jan, it might be next year.
    const currentMonth = baseDate.getMonth();
    const targetMonth = month - 1;

    let year = baseDate.getFullYear();
    if (currentMonth === 0 && targetMonth === 11) {
        year -= 1;
    } else if (currentMonth === 11 && targetMonth === 0) {
        year += 1;
    }
    
    date.setFullYear(year);

    return date;
}

/**
 * Extracts the start date (Monday) from a "MM.DD - MM.DD" range string.
 */
export function getStartDateFromRange(range: string, baseDate: Date = new Date()): Date {
    if (!range || !range.includes(' - ')) return parseMMDD(new Date().toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace(/ /g, ''), baseDate);
    const startPart = range.split(' - ')[0];
    return parseMMDD(startPart, baseDate);
}

/**
 * Formats a Monday Date object into a "MM.DD - MM.DD" range string.
 */
export function formatWeekRange(monday: Date): string {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (n: number) => String(n).padStart(2, '0');
    
    const sM = pad(monday.getMonth() + 1);
    const sD = pad(monday.getDate());
    const eM = pad(sunday.getMonth() + 1);
    const eD = pad(sunday.getDate());

    return `${sM}.${sD} - ${eM}.${eD}`;
}

/**
 * "08.24 - 08.30" → "8.24 ~ 8.30" (v2 테마 헤더 표시 전용 — 원본 weekRange는 변경하지 않는다)
 */
export function formatWeekRangeShort(range: string): string {
    if (!range || !range.includes(' - ')) return range;
    const toShort = (part: string) => {
        const [m, d] = part.split('.');
        const month = parseInt(m, 10);
        const day = parseInt(d, 10);
        if (Number.isNaN(month) || Number.isNaN(day)) return part;
        return `${month}.${day}`;
    };
    const [start, end] = range.split(' - ');
    return `${toShort(start)} ~ ${toShort(end)}`;
}

/**
 * Gets the Monday of the week containing the given date.
 */
export function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
}

/**
 * Converts a "HH:mm" time string to minutes from the start of the day (00:00).
 */
export { timeToMinutes } from './time';

/**
 * Formats minutes from the start of the day into a "HH:mm" string.
 */
export function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}`;
}

/**
 * Standardizes time slots for the weekly timetable grid.
 */
export const TIMETABLE_CONFIG = {
    startHour: 8,      // Display starts from 8 AM
    endHour: 26,       // Display ends at 2 AM (next day)
    rowHeight: 36,     // 1 hour = 36px (Reduced to fit without scrolling)
    defaultDuration: 120, // Default 2 hours if duration is unknown
};
