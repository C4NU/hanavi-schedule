import { describe, expect, it } from 'vitest';
import { cellsToEvents, applyEventsToCells } from '@/utils/events';
import { updateCollaborationEvent } from '@/utils/scheduleEditor';
import { splitScheduleItem } from '@/utils/time';
import { CharacterSchedule, ScheduleItem, WeekEvent, WeeklySchedule } from '@/types/schedule';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_EVENT_ID = '22222222-2222-4222-8222-222222222222';

function character(id: string, sunday: ScheduleItem = { time: '', content: '', type: 'off' }): CharacterSchedule {
    return {
        id,
        name: id,
        colorTheme: id,
        avatarUrl: '',
        defaultTime: '19:00',
        schedule: { SUN: sunday },
    };
}

function schedule(characters: CharacterSchedule[]): WeeklySchedule {
    return { weekRange: '08.24 - 08.30', characters };
}

describe('collaboration event editing', () => {
    it('fans one Hanavi selection out to every selected member cell', () => {
        const input = schedule([
            character('cherii'),
            character('nemu'),
            character('sena'),
            character('mirai'),
        ]);

        const result = updateCollaborationEvent(input, {
            characterId: 'cherii',
            day: 'SUN',
            eventId: EVENT_ID,
            time: '14:00',
            content: '하나비 여름소풍',
            type: 'collab',
            participantIds: ['cherii', 'nemu', 'sena', 'mirai'],
        });

        for (const char of result.characters) {
            expect(char.schedule.SUN.eventId).toBe(EVENT_ID);
            expect(char.schedule.SUN.eventMemberIds).toEqual(['cherii', 'nemu', 'sena', 'mirai']);
            expect(char.schedule.SUN.type).toBe('collab');
        }

        const saved = cellsToEvents(result.characters);
        expect(saved.events).toHaveLength(1);
        expect(saved.events[0].id).toBe(EVENT_ID);
        expect(saved.events[0].memberIds).toEqual(['cherii', 'nemu', 'sena', 'mirai']);
    });

    it('keeps a participant\'s later personal broadcast as a separate event', () => {
        const input = schedule([
            character('cherii'),
            character('nemu', {
                time: '22:00',
                content: '개인 방송',
                type: 'stream',
            }),
        ]);

        const result = updateCollaborationEvent(input, {
            characterId: 'cherii',
            day: 'SUN',
            eventId: EVENT_ID,
            time: '14:00',
            content: '하나비 합방',
            type: 'collab',
            participantIds: ['cherii', 'nemu'],
        });

        const nemuParts = splitScheduleItem(result.characters[1].schedule.SUN);
        expect(nemuParts.map((part) => part.eventId)).toEqual([EVENT_ID, undefined]);
        expect(nemuParts[1].content).toBe('개인 방송');

        const saved = cellsToEvents(result.characters);
        expect(saved.events).toHaveLength(2);
        expect(saved.events.find((event) => event.id === EVENT_ID)?.memberIds).toEqual(['cherii', 'nemu']);
        expect(saved.events.find((event) => event.memberIds.length === 1 && event.memberIds[0] === 'nemu')?.id)
            .toMatch(/^[0-9a-f-]{36}$/);
    });

    it('removes a deselected participant without deleting the shared event', () => {
        const existing = (id: string) => character(id, {
            time: '14:00',
            content: '하나비 합방',
            type: 'collab',
            eventId: EVENT_ID,
            eventMemberIds: ['cherii', 'nemu', 'sena'],
        });
        const input = schedule([existing('cherii'), existing('nemu'), existing('sena')]);

        const result = updateCollaborationEvent(input, {
            characterId: 'cherii',
            day: 'SUN',
            eventId: EVENT_ID,
            time: '14:00',
            content: '하나비 합방',
            type: 'collab',
            participantIds: ['cherii', 'nemu'],
        });

        expect(result.characters[2].schedule.SUN.eventId).toBeUndefined();
        const saved = cellsToEvents(result.characters);
        expect(saved.events).toHaveLength(1);
        expect(saved.events[0].memberIds).toEqual(['cherii', 'nemu']);
        expect(saved.deletedIds).not.toContain(EVENT_ID);
    });

    it('upgrades legacy Sunday collab cells instead of duplicating them', () => {
        const input = schedule([
            character('cherii', { time: '14:00', content: '하나비 합방', type: 'collab_hanavi' }),
            character('nemu', { time: '14:00', content: '하나비 합방', type: 'collab_hanavi' }),
        ]);

        const result = updateCollaborationEvent(input, {
            characterId: 'cherii',
            day: 'SUN',
            eventId: EVENT_ID,
            time: '15:00',
            content: '하나비 여름소풍',
            type: 'collab',
            participantIds: ['cherii', 'nemu'],
            source: { time: '14:00', content: '하나비 합방', type: 'collab_hanavi' },
        });

        expect(splitScheduleItem(result.characters[0].schedule.SUN)).toHaveLength(1);
        expect(splitScheduleItem(result.characters[1].schedule.SUN)).toHaveLength(1);
        expect(result.characters[0].schedule.SUN.content).toBe('하나비 여름소풍');
        expect(cellsToEvents(result.characters).events).toHaveLength(1);
    });
});

describe('event projection and serialization', () => {
    it('preserves separate Sunday collaborations and their metadata', () => {
        const characters = [character('cherii'), character('nemu'), character('sena')];
        const events: WeekEvent[] = [
            {
                id: EVENT_ID,
                scheduleId: '33333333-3333-4333-8333-333333333333',
                day: 'SUN',
                startTime: '14:00',
                title: '첫 합방',
                type: 'collab',
                memberIds: ['cherii', 'nemu'],
                guests: ['게스트 A'],
                memos: [{ id: 'memo-a', schedule_item_id: '', event_id: EVENT_ID, content: '메모 A', created_at: '2026-08-30T00:00:00Z' }],
            },
            {
                id: SECOND_EVENT_ID,
                scheduleId: '33333333-3333-4333-8333-333333333333',
                day: 'SUN',
                startTime: '19:00',
                title: '두 번째 합방',
                type: 'collab_external',
                memberIds: ['sena', 'cherii'],
                guests: ['게스트 B'],
            },
        ];

        applyEventsToCells(characters, events);

        expect(splitScheduleItem(characters[0].schedule.SUN).map((part) => part.eventId)).toEqual([EVENT_ID, SECOND_EVENT_ID]);
        expect(splitScheduleItem(characters[1].schedule.SUN).map((part) => part.eventId)).toEqual([EVENT_ID]);
        expect(splitScheduleItem(characters[2].schedule.SUN).map((part) => part.eventId)).toEqual([SECOND_EVENT_ID]);

        const saved = cellsToEvents(characters);
        expect(saved.events).toHaveLength(2);
        expect(saved.events.find((event) => event.id === EVENT_ID)).toMatchObject({
            type: 'collab',
            memberIds: ['cherii', 'nemu'],
            guests: ['게스트 A'],
        });
        expect(saved.events.find((event) => event.id === SECOND_EVENT_ID)).toMatchObject({
            type: 'collab_external',
            memberIds: ['sena', 'cherii'],
            guests: ['게스트 B'],
        });
    });

    it('assigns a stable UUID to new events so retries upsert instead of duplicating', () => {
        const characters = [character('cherii', { time: '14:00', content: '새 방송', type: 'stream' })];
        const saved = cellsToEvents(characters);
        const retried = cellsToEvents(characters);

        expect(saved.events).toHaveLength(1);
        expect(saved.events[0].id).toMatch(/^[0-9a-f-]{36}$/);
        expect(retried.events[0].id).toBe(saved.events[0].id);
    });

    it('namespaces new event IDs by schedule so weeks cannot collide', () => {
        const characters = [character('cherii', { time: '14:00', content: '새 방송', type: 'stream' })];
        const first = cellsToEvents(characters, [], 'schedule-a');
        const second = cellsToEvents(characters, [], 'schedule-b');

        expect(first.events[0].id).not.toBe(second.events[0].id);
    });

    it('reports a canonical event deleted after its last projected cell is cleared', () => {
        const characters = [character('cherii')];
        const saved = cellsToEvents(characters, [{ id: EVENT_ID, memberIds: ['cherii'], type: 'stream' }]);

        expect(saved.events).toHaveLength(0);
        expect(saved.deletedIds).toEqual([EVENT_ID]);
    });

    it('does not delete hidden, orphaned, or off canonical events during a visible save', () => {
        const characters = [character('cherii')];
        const hiddenId = '55555555-5555-4555-8555-555555555555';
        const orphanId = '66666666-6666-4666-8666-666666666666';
        const offId = '77777777-7777-4777-8777-777777777777';
        const saved = cellsToEvents(characters, [
            { id: EVENT_ID, memberIds: ['cherii'], type: 'stream' },
            { id: hiddenId, memberIds: ['graduated'], type: 'stream' },
            { id: orphanId, memberIds: [], type: 'stream' },
            { id: offId, memberIds: ['cherii'], type: 'off' },
        ]);

        expect(saved.deletedIds).toEqual([EVENT_ID]);
    });

    it('promotes untouched legacy collab rows into one shared event', () => {
        const characters = [
            character('cherii', { time: '14:00', content: '하나비 합방', type: 'collab_hanavi' }),
            character('nemu', { time: '14:00', content: '하나비 합방', type: 'collab_hanavi' }),
            character('sena', { time: '14:00', content: '하나비 합방', type: 'collab_hanavi' }),
        ];

        const saved = cellsToEvents(characters, [], 'legacy-week');

        expect(saved.events).toHaveLength(1);
        expect(saved.events[0].type).toBe('collab');
        expect(saved.events[0].memberIds).toEqual(['cherii', 'nemu', 'sena']);
        expect(saved.events[0].id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('keeps separated identical legacy collab runs as distinct events', () => {
        const collab = (id: string): CharacterSchedule => character(id, {
            time: '14:00',
            content: '같은 제목 합방',
            type: 'collab_hanavi',
        });
        const characters = [
            collab('cherii'),
            collab('nemu'),
            character('sena', { time: '19:00', content: '개인 방송', type: 'stream' }),
            collab('mirai'),
            collab('aella'),
        ];

        const saved = cellsToEvents(characters, [], 'legacy-distinct');

        expect(saved.events).toHaveLength(3);
        expect(saved.events.filter((event) => event.type === 'collab')).toHaveLength(2);
        expect(saved.events.find((event) => event.memberIds.includes('cherii'))?.memberIds).toEqual(['cherii', 'nemu']);
        expect(saved.events.find((event) => event.memberIds.includes('mirai'))?.memberIds).toEqual(['mirai', 'aella']);
    });

    it('does not persist default-time empty stream placeholders', () => {
        const saved = cellsToEvents([
            character('cherii', { time: '19:00', content: '', type: 'stream' }),
        ], [], 'placeholder-week');

        expect(saved.events).toHaveLength(0);
    });

    it('does not clear legacy cells when canonical membership is malformed', () => {
        const characters = [character('cherii', { time: '19:00', content: '레거시 방송', type: 'stream' })];
        applyEventsToCells(characters, [{
            id: EVENT_ID,
            scheduleId: '33333333-3333-4333-8333-333333333333',
            day: 'SUN',
            startTime: '14:00',
            title: '고아 이벤트',
            type: 'stream',
            memberIds: [],
        }]);

        expect(characters[0].schedule.SUN.content).toBe('레거시 방송');
    });

    it('clears visible legacy projections when the canonical graph is empty', () => {
        const characters = [
            character('cherii', { time: '19:00', content: '삭제된 방송', type: 'stream' }),
            character('nemu', { time: '20:00', content: '삭제된 방송 2', type: 'stream' }),
        ];

        applyEventsToCells(characters, []);

        expect(characters.map((item) => item.schedule.SUN)).toEqual([
            { time: '', content: '', type: 'off' },
            { time: '', content: '', type: 'off' },
        ]);
    });

    it('clears a visible member with no canonical event alongside other events', () => {
        const characters = [
            character('cherii', { time: '14:00', content: '정본 방송', type: 'stream' }),
            character('nemu', { time: '20:00', content: '오래된 레거시 방송', type: 'stream' }),
        ];

        applyEventsToCells(characters, [{
            id: EVENT_ID,
            scheduleId: '33333333-3333-4333-8333-333333333333',
            day: 'SUN',
            startTime: '14:00',
            title: '정본 방송',
            type: 'stream',
            memberIds: ['cherii'],
        }]);

        expect(characters[0].schedule.SUN.content).toBe('정본 방송');
        expect(characters[1].schedule.SUN).toMatchObject({ type: 'off', time: '', content: '' });
    });
});
