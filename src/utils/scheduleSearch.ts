import { stripHtml } from './text';

export interface ScheduleSearchResult {
    id: string;
    title: string;
    members: string[];
    date: string;
    weekStart: string;
    dayIndex: number;
}

export const SEARCH_QUERY_LIMIT = 80;
const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const dayMs = 86_400_000;
const kstOffset = 9 * 60 * 60 * 1000;

interface SearchMember {
    name: string;
    status: string | null;
    graduation_date: string | null;
}

export interface SearchEvent {
    id: string;
    day: string;
    title: string;
    schedules: { week_range: string; created_at: string | null } | null;
    schedule_event_members: { characters: SearchMember | null }[];
}

function formatDate(date: Date) {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function inferWeekStart(range: string, createdAt: string) {
    const match = /^(\d{2})\.(\d{2}) - (\d{2})\.(\d{2})$/.exec(range);
    const reference = new Date(Date.parse(createdAt) + kstOffset);
    if (!match || !Number.isFinite(reference.getTime())) return;
    const [month, day, endMonth, endDay] = match.slice(1).map(Number);
    const year = reference.getUTCFullYear();
    const candidates = [year - 1, year, year + 1].map(candidate => new Date(Date.UTC(candidate, month - 1, day)));
    return candidates
        .filter(candidate => {
            const end = new Date(candidate.getTime() + 6 * dayMs);
            return candidate.getUTCDay() === 1 && candidate.getUTCMonth() === month - 1 && candidate.getUTCDate() === day
                && end.getUTCMonth() === endMonth - 1 && end.getUTCDate() === endDay;
        })
        .sort((a, b) => Math.abs(a.getTime() - reference.getTime()) - Math.abs(b.getTime() - reference.getTime()))[0];
}

export function toScheduleSearchResult(event: SearchEvent): ScheduleSearchResult | undefined {
    const { schedules } = event;
    const dayIndex = days.indexOf(event.day);
    const title = stripHtml(event.title.replace(/<br\b[^>]*>|<\/(?:p|div)>/gi, ' ')).replace(/&nbsp;/gi, ' ').trim();
    if (!schedules?.created_at || dayIndex < 0 || !title || title === '휴방') return;
    const start = inferWeekStart(schedules.week_range, schedules.created_at);
    if (!start) return;
    const weekStart = formatDate(start);
    const members = [...new Set(event.schedule_event_members.flatMap(({ characters: member }) => {
        if (!member || (member.status === 'graduated' && (!member.graduation_date || member.graduation_date < weekStart))) {
            return [];
        }
        return [member.name];
    }))];
    if (!members.length) return;

    return { id: event.id, title, members, date: formatDate(new Date(start.getTime() + dayIndex * dayMs)), weekStart, dayIndex };
}

export function searchScheduleTitles(archive: ScheduleSearchResult[], query: string, now = new Date()) {
    const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
    const key = normalize(query);
    const today = formatDate(new Date(now.getTime() + kstOffset));
    const matches = archive.filter(entry => entry.date <= today && normalize(entry.title).includes(key));
    return { results: matches.slice(0, 40), hasMore: matches.length > 40 };
}
