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

/**
 * 분열된 아이템들을 combined 포맷(시간 '+', 내용 ' + ')으로 재조합한다.
 * 빈 내용은 건너뛰며, 내용이 1개뿐이면 구분자 없이 그 값만 사용한다.
 */
export function joinScheduleItems(items: ScheduleItem[]): ScheduleItem {
    const base = items[0] ?? {};
    const time = items.map((i) => (i.time || '').trim()).filter(Boolean).join('+');
    const contents = items.map((i) => (i.content || '').trim()).filter(Boolean);
    const content = contents.length > 1 ? contents.join(' + ') : contents[0] ?? '';
    return { ...base, time, content };
}

/**
 * blur 시 시간 입력 정규화: "19" → "19:00"
 */
export function normalizeTimePart(value: string): string {
    const trimmed = (value || '').trim();
    if (/^\d{1,2}$/.test(trimmed)) {
        const num = parseInt(trimmed, 10);
        if (num >= 0 && num <= 24) {
            return `${num.toString().padStart(2, '0')}:00`;
        }
    }
    return value;
}

/**
 * 분할 버튼: 시간 파트를 하나 추가한다 (마지막 파트 복제).
 * 유효한 시간이 없으면 20:00 2개로 시작한다.
 */
export function addTimePart(timeStr: string): string {
    const parts = extractTimeParts(timeStr ?? '').filter((p) => timeToMinutes(p) !== null);
    if (parts.length === 0) return '20:00+20:00';
    return [...parts, parts[parts.length - 1]].join('+');
}

/**
 * 병합(−) 버튼: index번 시간 파트를 제거한다. 1개가 남으면 단일 셀이 된다.
 */
export function removeTimePart(timeStr: string, index: number): string {
    const parts = extractTimeParts(timeStr ?? '');
    if (parts.length <= 1) return parts[0] ?? '';
    const next = parts.filter((_, i) => i !== index);
    return next.join('+');
}
