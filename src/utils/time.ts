import { ScheduleItem } from '@/types/schedule';

export function timeToMinutes(timeStr: string): number | null {
    const match = /^(\d{1,2}):([0-5]\d)$/.exec(timeStr.trim());
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 29) return null;

    return hours * 60 + minutes;
}

/**
 * "12:00+19:00" 형태의 복수 시간 문자열을 개별 시간으로 분리한다.
 */
export function extractTimeParts(timeStr: string): string[] {
    if (!timeStr) return [];
    const matches = Array.from(timeStr.matchAll(/(\d{1,2}:[0-5]\d)/g)).map((m) => m[1]);
    if (matches.length === 0) return [timeStr];
    return matches;
}

/**
 * 태그 밖에서만 구분자(" + ")로 내용을 분할한다.
 * 분할 결과 개수가 시간 개수와 일치할 때만 사용한다.
 */
function splitContentTopLevel(content: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        if (ch === '<') depth++;
        else if (ch === '>') depth = Math.max(0, depth - 1);
        if (depth === 0 && ch === '+') {
            parts.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    parts.push(current);
    return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/**
 * 한 칸에 "12:00+19:00"처럼 여러 방송이 압축된 아이템을
* 시간대별 아이템 n개로 분열한다. (하루 다방송 표현용 우회 데이터 처리)
 */
export function splitScheduleItem(item: ScheduleItem): ScheduleItem[] {
    if (!item) return [];
    const times = extractTimeParts(item.time ?? '');
    if (times.length <= 1) return [item];

    const contents =
        item.content && splitContentTopLevel(item.content).length === times.length
            ? splitContentTopLevel(item.content)
            : null;

    return times.map((t, idx) => ({
        ...item,
        id: item.id ? `${item.id}-${idx}` : undefined,
        time: t,
        content: contents ? contents[idx] : idx === 0 ? item.content : '',
    }));
}
