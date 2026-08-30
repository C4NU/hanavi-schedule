/**
 * Canonical schedule event helpers.
 *
 * `schedule_events` is the source of identity. The member grid still consumes
 * `ScheduleItem`, so a cell keeps a display projection plus a `parts` array
 * containing one entry per real event. This prevents a combined string from
 * losing the second event's id, participants, guests, or memos.
 */
import { CharacterSchedule, ScheduleItem, ScheduleItemPart, WeekEvent } from '@/types/schedule';
import { splitScheduleItem } from '@/utils/time';
import { v5 as uuidv5 } from 'uuid';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const NEW_EVENT_NAMESPACE = '4f72d7b2-7cf0-4f7c-9c18-0ecf3d1f6d4a';

export function normalizeEventType(type?: string): WeekEvent['type'] {
    if (type === 'off') return 'off';
    if (type === 'collab_external') return 'collab_external';
    if (type?.startsWith('collab')) return 'collab';
    return 'stream';
}

export function isCollaborationType(type?: string): boolean {
    return type === 'collab' || type === 'collab_external' || !!type?.startsWith('collab_');
}

/** Canonical membership invariant shared by readers, writers, and cron jobs. */
export function isValidCanonicalEvent(event: Pick<WeekEvent, 'type' | 'memberIds'>): boolean {
    if (event.type === 'off') return true;
    const memberIds = Array.from(new Set(event.memberIds || []));
    if (event.type === 'collab') return memberIds.length >= 2;
    if (event.type === 'collab_external') return memberIds.length >= 1;
    return memberIds.length === 1;
}

function partFromEvent(event: WeekEvent): ScheduleItemPart {
    return {
        id: event.id,
        time: event.startTime || '',
        content: event.title || '',
        type: event.type,
        videoUrl: event.videoUrl,
        category: event.category,
        eventMemberIds: [...event.memberIds],
        guests: [...(event.guests || [])],
        memos: [...(event.memos || [])],
    };
}

function partFromItem(item: ScheduleItem): ScheduleItemPart {
    return {
        id: item.eventId,
        time: item.time || '',
        content: item.content || '',
        type: item.type,
        placeholder: item.placeholder,
        videoUrl: item.videoUrl,
        category: item.category,
        eventMemberIds: item.eventMemberIds ? [...item.eventMemberIds] : undefined,
        guests: item.guests ? [...item.guests] : undefined,
        memos: item.memos ? [...item.memos] : undefined,
    };
}

/** Build the legacy cell projection without discarding per-event identity. */
export function scheduleItemFromParts(parts: ScheduleItemPart[], fallback?: ScheduleItem): ScheduleItem {
    if (parts.length === 0) {
        const base = fallback || { time: '', content: '', type: 'off' as const };
        return {
            ...base,
            time: '',
            content: '',
            type: 'off',
            eventId: undefined,
            eventMemberIds: undefined,
            guests: undefined,
            memos: undefined,
            id: undefined,
            memo: undefined,
            videoUrl: undefined,
            category: undefined,
            parts: undefined,
        };
    }

    const normalized = parts.map((part) => ({
        ...part,
        time: part.time || '',
        content: part.content || '',
        type: part.type || 'stream',
    }));
    const first = normalized[0];
    return {
        ...(fallback || {}),
        id: first.id,
        eventId: first.id,
        time: normalized.map((part) => part.time).filter(Boolean).join('+'),
        content: normalized.map((part) => part.content).filter(Boolean).join(' + '),
        type: first.type,
        placeholder: first.placeholder,
        videoUrl: first.videoUrl,
        category: first.category,
        eventMemberIds: first.eventMemberIds ? [...first.eventMemberIds] : undefined,
        guests: first.guests ? [...first.guests] : undefined,
        memos: first.memos ? [...first.memos] : undefined,
        parts: normalized,
    };
}

/**
 * Project events onto the existing member-cell shape. Every participant gets
 * the same event id; separate events remain separate parts in the cell.
 */
export function applyEventsToCells(characters: CharacterSchedule[], events: WeekEvent[]): void {
    // Do not clear legacy cells when the canonical graph contains a malformed
    // memberless/one-member event. The caller should surface the schedule as
    // unavailable and block writes until the graph is repaired.
    if (events.some((event) => !isValidCanonicalEvent(event))) return;

    // A successful canonical query is authoritative even when it returns no
    // rows. In that state every visible member's legacy projection must be
    // cleared; otherwise a deleted last event remains frozen in
    // `schedule_items` and comes back on the next public read.
    const byMemberDay = new Map<string, WeekEvent[]>();
    for (const event of events) {
        if (event.type === 'off') continue;
        for (const characterId of event.memberIds || []) {
            const key = `${characterId}|${event.day}`;
            const current = byMemberDay.get(key) || [];
            current.push(event);
            byMemberDay.set(key, current);
        }
    }

    for (const character of characters) {
        for (const day of DAYS) {
            const cell = character.schedule[day];
            if (!cell) continue;
            const eventParts = (byMemberDay.get(`${character.id}|${day}`) || [])
                .slice()
                .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))
                .map(partFromEvent);

            if (eventParts.length === 0) {
                const preservedOff = cell.type === 'off' && cell.content
                    ? { ...scheduleItemFromParts([], cell), content: cell.content }
                    : scheduleItemFromParts([], cell);
                character.schedule[day] = preservedOff;
                continue;
            }

            character.schedule[day] = scheduleItemFromParts(eventParts, cell);
        }
    }
}

export interface CellEventDraft {
    id?: string;
    day: string;
    startTime: string | null;
    title: string;
    type: WeekEvent['type'];
    memberIds: string[];
    guests?: string[];
    videoUrl?: string;
    category?: string;
}

function normalizeTime(value: string): string | null {
    const match = /^(\d{1,2}):([0-5]\d)$/.exec((value || '').trim());
    if (!match) return null;
    const hour = Number(match[1]);
    if (hour > 29) return null;
    return `${hour.toString().padStart(2, '0')}:${match[2]}`;
}

/** Convert edited cells back to event drafts with retry-stable UUIDs. */
export function cellsToEvents(
    characters: CharacterSchedule[],
    existingEvents: Pick<WeekEvent, 'id' | 'memberIds' | 'type'>[] = [],
    stableIdSeed = '',
): { events: CellEventDraft[]; deletedIds: string[]; keptEventIds: string[] } {
    const drafts = new Map<string, CellEventDraft>();
    // Seed from the canonical rows loaded with the schedule. A user can turn
    // the last projected cell into 휴방, removing its eventId from every cell;
    // without this seed the old row would be impossible to identify for delete.
    const visibleCharacterIds = new Set(characters.map((character) => character.id));
    const existingIds = new Set(
        existingEvents
            .filter((event) => event.type !== 'off' && event.memberIds.some((memberId) => visibleCharacterIds.has(memberId)))
            .map((event) => event.id),
    );
    const keptEventIds = new Set<string>();
    // Before the event table was backfilled, a collaboration was represented
    // by one identical cell per participant. Group only contiguous unkeyed
    // collab runs with an exact signature. A gap between runs is the only
    // reliable legacy signal that two otherwise-identical events are distinct.
    const legacyGroupKeys = new Map<string, string>();
    DAYS.forEach((day) => {
        const signatures = new Set<string>();
        characters.forEach((character) => {
            splitScheduleItem(character.schedule[day]).forEach((part) => {
                if (!part.eventId && isCollaborationType(part.type) && part.content.trim()) {
                    signatures.add(JSON.stringify([
                        part.type || '',
                        part.time.trim(),
                        part.content.trim(),
                        part.category || '',
                    ]));
                }
            });
        });

        signatures.forEach((signature) => {
            let run = 0;
            let previousMatched = false;
            characters.forEach((character) => {
                const matches = splitScheduleItem(character.schedule[day])
                    .map((part, index) => ({ part, index }))
                    .filter(({ part }) => !part.eventId && isCollaborationType(part.type) && part.content.trim() && JSON.stringify([
                        part.type || '',
                        part.time.trim(),
                        part.content.trim(),
                        part.category || '',
                    ]) === signature);
                if (matches.length > 0) {
                    if (!previousMatched) run += 1;
                    previousMatched = true;
                    matches.forEach(({ index }, occurrence) => {
                        legacyGroupKeys.set(`${character.id}|${day}|${index}`, `legacy:${signature}:${run}:${occurrence}`);
                    });
                } else {
                    previousMatched = false;
                }
            });
        });
    });

    for (const character of characters) {
        for (const day of DAYS) {
            const cell = character.schedule[day];
            if (!cell) continue;

            const parts = splitScheduleItem(cell);
            parts.forEach((part, index) => {
                const eventId = part.eventId;
                if (eventId) existingIds.add(eventId);

                // Unkeyed default-time/empty-title cells are templates unless
                // the editor explicitly marked the stream as non-placeholder.
                // A canonical ID is also sufficient to retain an intentionally
                // empty event title.
                const hasContent = !!eventId || (part.content || '').trim() !== '' || part.placeholder === false;
                if (!hasContent || part.type === 'off') return;

                const isLegacyCollab = !eventId && isCollaborationType(part.type) && !!part.content.trim();
                let key: string;
                if (eventId) {
                    key = eventId;
                } else if (isLegacyCollab) {
                    key = legacyGroupKeys.get(`${character.id}|${day}|${index}`) ||
                        `legacy:${day}:${part.type || ''}:${part.time.trim()}:${part.content.trim()}`;
                } else {
                    key = `new:${stableIdSeed}:${character.id}:${day}:${index}`;
                }
                const stableId = eventId || uuidv5(key, NEW_EVENT_NAMESPACE);
                const memberIds = part.eventMemberIds?.length ? [...part.eventMemberIds] : [character.id];
                const normalizedType = normalizeEventType(part.type);
                // A one-member internal collab is invalid in the canonical
                // model; promote it to a personal stream during serialization.
                const type = normalizedType === 'collab' && memberIds.length < 2
                    ? 'stream'
                    : normalizedType;
                const draft: CellEventDraft = {
                    id: stableId,
                    day,
                    startTime: normalizeTime(part.time),
                    title: (part.content || '').trim(),
                    type,
                    memberIds,
                    category: part.category,
                    guests: part.guests?.filter(Boolean),
                    videoUrl: part.videoUrl,
                };

                const existing = drafts.get(key);
                if (!existing) {
                    drafts.set(key, draft);
                } else {
                    existing.memberIds = Array.from(new Set([...existing.memberIds, ...memberIds]));
                    if (isLegacyCollab && existing.type === 'stream' && existing.memberIds.length >= 2) {
                        existing.type = 'collab';
                    }
                    if (!existing.guests?.length && draft.guests?.length) existing.guests = draft.guests;
                    if (!existing.videoUrl && draft.videoUrl) existing.videoUrl = draft.videoUrl;
                }
                if (eventId) keptEventIds.add(eventId);
            });
        }
    }

    const deletedIds = [...existingIds].filter((id) => !keptEventIds.has(id));
    return { events: [...drafts.values()], deletedIds, keptEventIds: [...keptEventIds] };
}

export function eventPartFromItem(item: ScheduleItem): ScheduleItemPart {
    return partFromItem(item);
}
