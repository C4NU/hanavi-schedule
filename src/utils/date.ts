
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
