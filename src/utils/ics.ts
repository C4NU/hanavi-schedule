import { WeeklySchedule } from '@/types/schedule';

export function generateICS(schedule: WeeklySchedule): string {
    const events: string[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    // Parse week range to get start date (e.g., "11.24 - 11.30")
    // Assuming format "MM.DD - MM.DD"
    const [startStr] = schedule.weekRange.split(' - ');
    const [startMonth, startDay] = startStr.split('.').map(Number);

    // Determine year for the schedule
    // If schedule month is 12 and current month is 1, it's last year (unlikely for future schedule)
    // If schedule month is 1 and current month is 12, it's next year
    let year = currentYear;
    if (startMonth === 1 && now.getMonth() === 11) {
        year = currentYear + 1;
    } else if (startMonth === 12 && now.getMonth() === 0) {
        year = currentYear - 1;
    }

    // Calculate start date of the week (Monday)
    // Note: The weekRange might not start on Monday, but our grid assumes MON-SUN
    // Let's assume the weekRange start date corresponds to the first day of the schedule (Monday)
    // or we can just use the parsed date as the base.
    // Given the example "11.24 - 11.30", 11.24 is Sunday in 2024? No, 2024-11-24 is Sunday.
    // But the schedule grid starts with MON.
    // If the user provides "11.24 - 11.30", and 11.24 is Sunday, maybe the schedule is SUN-SAT?
    // But the grid columns are MON...SUN.
    // Let's assume the `weekRange` string is just a label and we should try to map MON to the first date in that range?
    // Or better, let's assume the start date in `weekRange` IS Monday.
    // If 11.24 is Sunday, and the grid is Mon-Sun, then Monday is 11.25.
    // This is tricky without strict date metadata.
    // For now, let's assume the start date provided in weekRange corresponds to the first column (MON).

    const startDate = new Date(year, startMonth - 1, startDay);

    // Helper to format date for ICS (YYYYMMDDTHHMMSS)
    const formatDate = (date: Date, timeStr?: string): string => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');

        if (!timeStr) {
            return `${y}${m}${d}`; // All day
        }

        const [hours, minutes] = timeStr.split(':').map(Number);
        const h = String(hours).padStart(2, '0');
        const min = String(minutes).padStart(2, '0');
        return `${y}${m}${d}T${h}${min}00`;
    };

    const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    schedule.characters.forEach(char => {
        DAYS.forEach((day, index) => {
            const item = char.schedule[day];
            if (!item || item.type === 'off' || !item.time) return;

            // Calculate event date
            const eventDate = new Date(startDate);
            eventDate.setDate(startDate.getDate() + index);

            // Create event
            const startTime = formatDate(eventDate, item.time);

            // End time: assume 1 hour duration for now, or just start time
            const endDateObj = new Date(eventDate);
            const [h, m] = item.time.split(':').map(Number);
            endDateObj.setHours(h + 1, m);
            const endTime = formatDate(endDateObj, `${endDateObj.getHours()}:${endDateObj.getMinutes()}`);

            const description = `${char.name} - ${item.content}`;
            const summary = `[${char.name}] ${item.content}`;

            events.push(`BEGIN:VEVENT
UID:${startTime}-${char.id}@hanavi-schedule
DTSTAMP:${formatDate(now, '00:00')}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${summary}
DESCRIPTION:${description}
URL:${char.chzzkUrl || ''}
END:VEVENT`);
        });
    });

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Hanavi Schedule//KR
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events.join('\n')}
END:VCALENDAR`;
}
