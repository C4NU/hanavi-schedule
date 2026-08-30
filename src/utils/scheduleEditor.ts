import { ScheduleItem, ScheduleItemPart, WeeklySchedule } from '@/types/schedule';
import { isCollaborationType, normalizeEventType, scheduleItemFromParts } from '@/utils/events';
import { extractTimeParts, splitScheduleItem } from '@/utils/time';

export interface CollaborationUpdate {
    characterId: string;
    day: string;
    eventId: string;
    time: string;
    content: string;
    type: string;
    participantIds: string[];
    /** The cell contents before the modal edit, used to replace legacy cells without IDs. */
    source?: {
        eventId?: string;
        time?: string;
        content?: string;
        type?: string;
        category?: string;
        legacyMemberIds?: string[];
        parts?: Array<{ eventId?: string; time?: string; content?: string; type?: string; category?: string }>;
    };
}

function eventPartFromItem(item: ScheduleItem): ScheduleItemPart {
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

function itemParts(item: ScheduleItem | undefined): ScheduleItemPart[] {
    if (!item) return [];
    return splitScheduleItem(item)
        .map(eventPartFromItem)
        // A default-time/empty-content stream is a template placeholder, not
        // a real broadcast. Keep identity-bearing canonical parts (including
        // an intentionally empty title), but do not carry unkeyed placeholders
        // into a newly created collaboration.
        .filter((part) => part.placeholder || part.id || (part.type !== 'off' && part.content.trim() !== ''));
}

function sharedEventPart(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    eventId: string,
): ScheduleItemPart | undefined {
    const character = schedule.characters.find((candidate) => candidate.id === characterId);
    return itemParts(character?.schedule[day]).find((part) => part.id === eventId);
}

/**
 * Apply a direct inline edit to every projection of one canonical
 * collaboration event. A cell is only a projection, so changing the second
 * participant's row must not create a one-member type/title/time fork.
 */
function updateSharedEventPart(
    schedule: WeeklySchedule,
    day: string,
    eventId: string,
    field: 'time' | 'content' | 'type' | 'videoUrl' | 'category',
    value: string,
): WeeklySchedule {
    let didUpdate = false;
    const characters = schedule.characters.map((character) => {
        const current = character.schedule[day];
        if (!current) return character;
        const currentParts = itemParts(current);
        if (!currentParts.some((part) => part.id === eventId)) return character;

        const nextParts = field === 'type' && value === 'off'
            ? currentParts.filter((part) => part.id !== eventId)
            : currentParts.map((part) => {
                if (part.id !== eventId) return part;
                const next = { ...part };
                if (field === 'time') next.time = value;
                if (field === 'content') next.content = value;
                if (field === 'type') next.type = value as ScheduleItemPart['type'];
                if (field === 'videoUrl') next.videoUrl = value.trim() || undefined;
                if (field === 'category') next.category = value.trim() || undefined;
                return next;
            });

        didUpdate = true;
        return {
            ...character,
            schedule: {
                ...character.schedule,
                [day]: scheduleItemFromParts(nextParts, current),
            },
        };
    });

    return didUpdate ? { ...schedule, characters } : schedule;
}

/** Remove one member from a split collaboration part without touching its siblings. */
function removeSharedEventParticipant(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    eventId: string,
    memberIds?: string[],
): WeeklySchedule {
    const allMembers = new Set(memberIds || []);
    schedule.characters.forEach((character) => {
        const part = itemParts(character.schedule[day]).find((candidate) => candidate.id === eventId);
        part?.eventMemberIds?.forEach((memberId) => allMembers.add(memberId));
        if (part) allMembers.add(character.id);
    });
    allMembers.delete(characterId);

    let didUpdate = false;
    const characters = schedule.characters.map((character) => {
        const current = character.schedule[day];
        if (!current) return character;
        const currentParts = itemParts(current);
        if (!currentParts.some((part) => part.id === eventId)) return character;

        const remainingMembers = [...allMembers];
        const nextParts = allMembers.has(character.id)
            ? currentParts.map((part) => part.id === eventId
                ? {
                    ...part,
                    // A shared event with one remaining member is a personal
                    // stream, not an invalid one-member collab.
                    type: remainingMembers.length >= 2 ? part.type : 'stream',
                    eventMemberIds: remainingMembers.length >= 2 ? remainingMembers : undefined,
                }
                : part)
            : currentParts.filter((part) => part.id !== eventId);
        didUpdate = true;
        return {
            ...character,
            schedule: {
                ...character.schedule,
                [day]: scheduleItemFromParts(nextParts, current),
            },
        };
    });

    return didUpdate ? { ...schedule, characters } : schedule;
}

/** Convert only the edited member's shared projection into a personal stream. */
function convertSharedEventToPersonal(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    eventId: string,
): WeeklySchedule {
    const sourcePart = sharedEventPart(schedule, characterId, day, eventId);
    if (!sourcePart) return schedule;

    const withoutShared = removeSharedEventParticipant(schedule, characterId, day, eventId, sourcePart.eventMemberIds);
    const character = withoutShared.characters.find((candidate) => candidate.id === characterId);
    if (!character) return withoutShared;

    const current = character.schedule[day];
    const parts = itemParts(current).filter((part) => part.id !== eventId);
    parts.push({
        ...sourcePart,
        id: undefined,
        eventMemberIds: undefined,
        type: 'stream',
        guests: undefined,
        memos: undefined,
        placeholder: false,
    });
    parts.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

    return {
        ...withoutShared,
        characters: withoutShared.characters.map((candidate) => candidate.id === characterId
            ? {
                ...candidate,
                schedule: {
                    ...candidate.schedule,
                    [day]: scheduleItemFromParts(parts, current),
                },
            }
            : candidate),
    };
}

/** Add a locally editable personal part without encoding it into a shared event's time. */
export function addSchedulePart(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
): WeeklySchedule {
    const character = schedule.characters.find((candidate) => candidate.id === characterId);
    if (!character) return schedule;
    const current = character.schedule[day] ?? { time: '', content: '', type: 'off' as const };
    const parts = itemParts(current);
    if (parts.length === 0) {
        const seedTime = extractTimeParts(current.time || '').find(Boolean) || character.defaultTime || '20:00';
        const emptyParts: ScheduleItemPart[] = [0, 1].map(() => ({
            time: seedTime,
            content: '',
            type: 'stream',
            placeholder: true,
        }));
        return {
            ...schedule,
            characters: schedule.characters.map((candidate) => candidate.id === characterId
                ? {
                    ...candidate,
                    schedule: {
                        ...candidate.schedule,
                        [day]: scheduleItemFromParts(emptyParts, current),
                    },
                }
                : candidate),
        };
    }
    parts.push({
        time: character.defaultTime || '20:00',
        content: '',
        type: 'stream',
        placeholder: true,
    });
    parts.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

    return {
        ...schedule,
        characters: schedule.characters.map((candidate) => candidate.id === characterId
            ? {
                ...candidate,
                schedule: {
                    ...candidate.schedule,
                    [day]: scheduleItemFromParts(parts, current),
                },
            }
            : candidate),
    };
}

function appendPersonalPartsToSharedEvent(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    eventId: string,
    value: string,
): WeeklySchedule {
    const times = extractTimeParts(value).filter(Boolean);
    if (times.length <= 1) return updateSharedEventPart(schedule, day, eventId, 'time', value);

    const current = schedule.characters.find((candidate) => candidate.id === characterId)?.schedule[day];
    const currentParts = itemParts(current);
    // A combined time on a canonical one-part collab is the legacy ＋ action.
    // Keep the shared event's first time and add the rest as personal parts.
    const shared = updateSharedEventPart(schedule, day, eventId, 'time', times[0]);
    if (currentParts.some((part) => part.id !== eventId)) return shared;

    const updatedCharacter = shared.characters.find((candidate) => candidate.id === characterId);
    if (!updatedCharacter) return shared;
    const sharedParts = itemParts(updatedCharacter.schedule[day]);
    const nextParts = [
        ...sharedParts,
        ...times.slice(1).map((time) => ({ time, content: '', type: 'stream' as const, placeholder: true })),
    ];
    nextParts.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    return {
        ...shared,
        characters: shared.characters.map((candidate) => candidate.id === characterId
            ? {
                ...candidate,
                schedule: {
                    ...candidate.schedule,
                    [day]: scheduleItemFromParts(nextParts, updatedCharacter.schedule[day]),
                },
            }
            : candidate),
    };
}

function updateEventParts(
    previousItem: ScheduleItem,
    field: keyof ScheduleItem,
    value: string,
): ScheduleItemPart[] | null {
    if (!previousItem.parts?.length) return null;
    if (field === 'type' && value === 'off') return [];

    // Reuse the canonical legacy splitter for display edits to a combined
    // cell. The projected length is authoritative so adding/removing a
    // `12:00+19:00` part is reflected in canonical parts as well.
    const projected = splitScheduleItem({
        ...previousItem,
        [field]: value,
        parts: undefined,
    } as ScheduleItem);

    const usedPreviousIndexes = new Set<number>();
    return projected.map((projectedPart, index) => {
        const previousParts = previousItem.parts || [];
        const projectedTime = projectedPart.time.trim();
        const projectedContent = projectedPart.content.trim();
        const matchingIndex = previousParts.findIndex((part, previousIndex) => (
            !usedPreviousIndexes.has(previousIndex) &&
            part.time.trim() === projectedTime &&
            part.content.trim() === projectedContent
        ));
        const timeMatchIndex = matchingIndex >= 0 ? matchingIndex : previousParts.findIndex((part, previousIndex) => (
            !usedPreviousIndexes.has(previousIndex) && projectedTime !== '' && part.time.trim() === projectedTime
        ));
        const contentMatchIndex = timeMatchIndex >= 0 ? timeMatchIndex : previousParts.findIndex((part, previousIndex) => (
            !usedPreviousIndexes.has(previousIndex) && projectedContent !== '' && part.content.trim() === projectedContent
        ));
        const fallbackIndex = contentMatchIndex >= 0
            ? contentMatchIndex
            : (index < previousParts.length && !usedPreviousIndexes.has(index) ? index : previousParts.findIndex((_, previousIndex) => !usedPreviousIndexes.has(previousIndex)));
        if (fallbackIndex >= 0) usedPreviousIndexes.add(fallbackIndex);
        const previousPart = fallbackIndex >= 0 ? previousParts[fallbackIndex] : undefined;
        const next: ScheduleItemPart = {
            ...(previousPart || {}),
            id: previousPart?.id,
            time: projectedPart.time || '',
            content: projectedPart.content || '',
            type: previousPart?.type || projectedPart.type,
            placeholder: previousPart?.placeholder,
            videoUrl: previousPart?.videoUrl,
            category: previousPart?.category,
            eventMemberIds: previousPart?.eventMemberIds ? [...previousPart.eventMemberIds] : undefined,
            guests: previousPart?.guests ? [...previousPart.guests] : undefined,
            memos: previousPart?.memos ? [...previousPart.memos] : undefined,
        };
        if (field === 'type') next.type = value as ScheduleItemPart['type'];
        if (field === 'videoUrl') next.videoUrl = value.trim() || undefined;
        if (field === 'category') next.category = value.trim() || undefined;
        if (field === 'content' && value.trim()) next.placeholder = false;
        return next;
    });
}

function isLegacySourcePart(
    part: ScheduleItemPart,
    characterId: string,
    update: CollaborationUpdate,
    legacyMemberIds?: Set<string>,
): boolean {
    const source = update.source;
    if (part.id) return false;
    if (!source) return false;

    const sourceParts = source.parts?.length ? source.parts : [source];
    return sourceParts.some((sourcePart) => {
        if (sourcePart.eventId) return false;
        if (!sourcePart.time?.trim() && !sourcePart.content?.trim()) return false;
        if (part.time.trim() !== (sourcePart.time || '').trim() || part.content.trim() !== (sourcePart.content || '').trim()) return false;
        if ((part.category || '').trim() !== (sourcePart.category || '').trim()) return false;

        // A legacy collaboration has no event id. Restrict replacement to
        // the contiguous legacy run containing the edited row when one can be
        // identified; otherwise preserve the historical matching behavior.
        const sourceIsCollab = sourcePart.type?.startsWith('collab');
        if (!sourceIsCollab) return characterId === update.characterId;
        if (legacyMemberIds && !legacyMemberIds.has(characterId)) return false;
        return part.type?.startsWith('collab') === true;
    });
}

function legacyCollabSignature(part: { time?: string; content?: string; type?: string; category?: string }): string | null {
    if (!part.type?.startsWith('collab')) return null;
    const time = (part.time || '').trim();
    const content = (part.content || '').trim();
    if (!time && !content) return null;
    return JSON.stringify([part.type, time, content, (part.category || '').trim()]);
}

/**
 * Legacy rows have no event id, so an exact signature alone can match two
 * separate collaborations. Use the contiguous run around the edited row as
 * the replacement scope. This mirrors the serializer's migration heuristic
 * and prevents editing A/B from deleting an identical C/D run.
 */
function legacyCollabMemberScope(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    source: CollaborationUpdate['source'],
): Set<string> | undefined {
    if (!source || source.eventId) return undefined;
    if (source.legacyMemberIds?.length) return new Set(source.legacyMemberIds);
    const sourcePart = (source.parts?.length ? source.parts : [source])
        .find((part) => legacyCollabSignature(part));
    const signature = sourcePart ? legacyCollabSignature(sourcePart) : null;
    if (!signature) return undefined;

    const isMatch = (characterId: string): boolean => {
        const character = schedule.characters.find((candidate) => candidate.id === characterId);
        return !!character && splitScheduleItem(character.schedule[day]).some((part) => (
            !part.eventId && legacyCollabSignature(part) === signature
        ));
    };
    const targetIndex = schedule.characters.findIndex((character) => character.id === characterId);
    if (targetIndex < 0 || !isMatch(characterId)) return undefined;

    let start = targetIndex;
    while (start > 0 && isMatch(schedule.characters[start - 1].id)) start -= 1;
    let end = targetIndex;
    while (end + 1 < schedule.characters.length && isMatch(schedule.characters[end + 1].id)) end += 1;
    return new Set(schedule.characters.slice(start, end + 1).map((character) => character.id));
}

/** Return the contiguous legacy collaboration run for the editor's source row. */
export function getLegacyCollaborationMemberIds(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    source: CollaborationUpdate['source'],
): string[] | undefined {
    const scope = legacyCollabMemberScope(schedule, characterId, day, source);
    return scope ? [...scope] : undefined;
}

export function updateScheduleItem(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    field: keyof ScheduleItem,
    value: string,
): WeeklySchedule {
    const editedCharacter = schedule.characters.find((character) => character.id === characterId);
    const sharedEventIds = editedCharacter
        ? Array.from(new Set(
            itemParts(editedCharacter.schedule[day])
                .filter((part) => part.id && (isCollaborationType(part.type) || (part.eventMemberIds?.length || 0) > 1))
                .map((part) => part.id as string),
        ))
        : [];

    // Canonical collaboration fields are shared event fields, even when the
    // user starts editing from a non-anchor member row. Keep all projections in
    // lockstep; this also makes stream/off conversion participant-aware.
    if (sharedEventIds.length === 1 && field === 'type' && value === 'stream') {
        return convertSharedEventToPersonal(schedule, characterId, day, sharedEventIds[0]);
    }

    const editedParts = editedCharacter ? itemParts(editedCharacter.schedule[day]) : [];
    if (sharedEventIds.length === 1 && field === 'time' && value.includes('+') && editedParts.length === 1) {
        return appendPersonalPartsToSharedEvent(schedule, characterId, day, sharedEventIds[0], value);
    }

    if (sharedEventIds.length === 1 && ['time', 'content', 'type', 'videoUrl', 'category'].includes(field)) {
        return updateSharedEventPart(schedule, day, sharedEventIds[0], field as 'time' | 'content' | 'type' | 'videoUrl' | 'category', value);
    }

    let didUpdate = false;

    const characters = schedule.characters.map(character => {
        if (character.id !== characterId) return character;

        const previousItem = character.schedule[day] ?? {
            time: '',
            content: '',
            type: 'stream' as const,
        };
        const item: ScheduleItem = { ...previousItem, [field]: value };

        if (field === 'type') {
            if (value === 'stream' && !item.time) {
                item.time = character.defaultTime ?? '19:00';
                item.placeholder = false;
            } else if (value === 'stream') {
                // Selecting 방송 is an explicit user decision, even when the
                // title is intentionally empty. Keep it distinct from an
                // untouched default-time placeholder so serialization creates
                // the empty-title stream event.
                item.placeholder = false;
            } else if (value === 'off') {
                item.time = '';
                item.id = undefined;
                item.eventId = undefined;
                item.eventMemberIds = undefined;
                item.guests = undefined;
                item.memos = undefined;
                item.memo = undefined;
                item.videoUrl = undefined;
                item.category = undefined;
                item.parts = undefined;
            }
        }

        const nextParts = updateEventParts(previousItem, field, value);
        if (nextParts) {
            didUpdate = true;
            return {
                ...character,
                schedule: {
                    ...character.schedule,
                    [day]: scheduleItemFromParts(nextParts, item),
                },
            };
        }

        didUpdate = true;
        return {
            ...character,
            schedule: {
                ...character.schedule,
                [day]: item,
            },
        };
    });

    return didUpdate ? { ...schedule, characters } : schedule;
}

/** Update one displayed event part without touching its sibling broadcasts. */
export function updateSchedulePart(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    partIndex: number,
    field: 'time' | 'content' | 'type' | 'videoUrl' | 'category',
    value: string,
): WeeklySchedule {
    const editedCharacter = schedule.characters.find((character) => character.id === characterId);
    const targetPart = editedCharacter
        ? itemParts(editedCharacter.schedule[day])[partIndex]
        : undefined;
    if (targetPart?.id && (isCollaborationType(targetPart.type) || (targetPart.eventMemberIds?.length || 0) > 1)) {
        if (field === 'type' && value === 'stream') {
            return convertSharedEventToPersonal(schedule, characterId, day, targetPart.id);
        }
        if (field === 'type' && value === 'off') {
            return removeSharedEventParticipant(schedule, characterId, day, targetPart.id, targetPart.eventMemberIds);
        }
        return updateSharedEventPart(schedule, day, targetPart.id, field, value);
    }

    let didUpdate = false;
    const characters = schedule.characters.map((character) => {
        if (character.id !== characterId) return character;
        const previous = character.schedule[day] ?? { time: '', content: '', type: 'off' as const };
        const parts = itemParts(previous);
        if (!parts[partIndex]) return character;

        const nextParts = value === 'off' && field === 'type'
            ? parts.filter((_, index) => index !== partIndex)
            : parts.map((part, index) => {
                if (index !== partIndex) return part;
                const next = { ...part };
                if (field === 'time') next.time = value;
                if (field === 'content') next.content = value;
                if (field === 'type') next.type = value as ScheduleItemPart['type'];
                if (field === 'videoUrl') next.videoUrl = value.trim() || undefined;
                if (field === 'category') next.category = value.trim() || undefined;
                if (field === 'content' && value.trim()) next.placeholder = false;
                if (field === 'type' && value === 'stream') next.placeholder = false;
                return next;
            });

        didUpdate = true;
        return {
            ...character,
            schedule: {
                ...character.schedule,
                [day]: scheduleItemFromParts(nextParts, previous),
            },
        };
    });

    return didUpdate ? { ...schedule, characters } : schedule;
}

/**
 * Update one collaboration event and project it to every selected member in
 * one state transition. Existing personal events in the same day are kept as
 * separate parts instead of being overwritten by the collaboration.
 */
export function updateCollaborationEvent(
    schedule: WeeklySchedule,
    update: CollaborationUpdate,
): WeeklySchedule {
    const participants = Array.from(new Set(update.participantIds.filter(Boolean)));
    const requestedType = normalizeEventType(update.type);
    // Internal collabs require at least two members. Normalize a one-member
    // edit to a personal stream; an empty selection removes the event.
    const effectiveType = requestedType === 'collab' && participants.length === 1
        ? 'stream'
        : requestedType;
    const effectiveMemberIds = effectiveType === 'stream' ? undefined : participants;
    const participantSet = new Set(participants);
    const legacyMemberIds = legacyCollabMemberScope(schedule, update.characterId, update.day, update.source);
    const characters = schedule.characters.map((character) => {
        const current = character.schedule[update.day] || { time: '', content: '', type: 'off' as const };
        const currentParts = itemParts(current).filter((part) => !part.placeholder);
        const hasExistingEvent = currentParts.some((part) => (
            part.id === update.eventId || isLegacySourcePart(part, character.id, update, legacyMemberIds)
        ));
        const parts = currentParts.filter((part) => (
            part.id !== update.eventId && !isLegacySourcePart(part, character.id, update, legacyMemberIds)
        ));
        const existingPart = currentParts.find((part) => part.id === update.eventId);

        if (participantSet.has(character.id)) {
            parts.push({
                id: update.eventId,
                time: update.time.trim(),
                content: update.content,
                type: effectiveType,
                videoUrl: existingPart?.videoUrl,
                category: existingPart?.category,
                eventMemberIds: effectiveMemberIds,
                guests: existingPart?.guests,
                memos: existingPart?.memos,
            });
            parts.sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
            return {
                ...character,
                schedule: {
                    ...character.schedule,
                    [update.day]: scheduleItemFromParts(parts, current),
                },
            };
        }

        // A deselected member may still have a personal event on this day.
        // Remove only this shared event and preserve every other part.
        if (!hasExistingEvent) return character;
        return {
            ...character,
            schedule: {
                ...character.schedule,
                [update.day]: parts.length
                    ? scheduleItemFromParts(parts, current)
                    : scheduleItemFromParts([], current),
            },
        };
    });

    return { ...schedule, characters };
}
