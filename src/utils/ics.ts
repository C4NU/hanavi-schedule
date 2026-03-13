import { WeeklySchedule } from '@/types/schedule';
import { getStartDateFromRange } from './date';

export function generateICS(schedule: WeeklySchedule): string {
    const events: string[] = [];
    const now = new Date();

    // Parse week range to get start date (Monday) using shared utility
    const startDate = getStartDateFromRange(schedule.weekRange);

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
