import { describe, expect, it } from 'vitest';
import { addSchedulePart, updateScheduleItem, updateSchedulePart, updateCollaborationEvent } from '@/utils/scheduleEditor';
import { CharacterSchedule, ScheduleItem, WeeklySchedule } from '@/types/schedule';

const schedule: WeeklySchedule = {
    weekRange: '08.03 - 08.09',
    characters: [
        {
            id: 'a',
            name: 'A',
            colorTheme: 'a',
            avatarUrl: '',
            schedule: {
                MON: { time: '19:00', content: '', type: 'stream' },
                TUE: { time: '20:00', content: '기존', type: 'stream' },
            },
        },
        {
            id: 'b',
            name: 'B',
            colorTheme: 'b',
            avatarUrl: '',
            schedule: {
                MON: { time: '21:00', content: '다른 멤버', type: 'stream' },
            },
        },
    ],
};

describe('updateScheduleItem', () => {
    it('updates only the edited path without mutating the previous schedule', () => {
        const result = updateScheduleItem(schedule, 'a', 'MON', 'content', '한글 입력');

        expect(result).not.toBe(schedule);
        expect(result.characters).not.toBe(schedule.characters);
        expect(result.characters[0]).not.toBe(schedule.characters[0]);
        expect(result.characters[0].schedule).not.toBe(schedule.characters[0].schedule);
        expect(result.characters[0].schedule.MON).not.toBe(schedule.characters[0].schedule.MON);
        expect(result.characters[0].schedule.TUE).toBe(schedule.characters[0].schedule.TUE);
        expect(result.characters[1]).toBe(schedule.characters[1]);
        expect(schedule.characters[0].schedule.MON.content).toBe('');
        expect(result.characters[0].schedule.MON.content).toBe('한글 입력');
    });

    it('creates a missing day with the expected defaults', () => {
        const result = updateScheduleItem(schedule, 'a', 'WED', 'category', '공지');

        expect(result.characters[0].schedule.WED).toEqual({
            time: '',
            content: '',
            type: 'stream',
            category: '공지',
        });
    });

    it('normalizes stream and off type changes', () => {
        const stream = updateScheduleItem(schedule, 'a', 'WED', 'type', 'stream');
        expect(stream.characters[0].schedule.WED).toMatchObject({ type: 'stream', time: '19:00' });

        const off = updateScheduleItem(stream, 'a', 'WED', 'type', 'off');
        expect(off.characters[0].schedule.WED).toMatchObject({ type: 'off', time: '' });
        expect(updateScheduleItem(schedule, 'missing', 'MON', 'content', 'x')).toBe(schedule);
    });

    it('keeps canonical event parts in sync with direct cell edits', () => {
        const eventId = '11111111-1111-4111-8111-111111111111';
        const eventItem: ScheduleItem = {
            id: eventId,
            eventId,
            time: '19:00',
            content: '기존 이벤트',
            type: 'stream',
            parts: [{ id: eventId, time: '19:00', content: '기존 이벤트', type: 'stream' }],
        };
        const input = {
            ...schedule,
            characters: schedule.characters.map((character, index) => index === 0
                ? { ...character, schedule: { ...character.schedule, MON: eventItem } }
                : character),
        };

        const edited = updateScheduleItem(input, 'a', 'MON', 'content', '수정된 이벤트');
        expect(edited.characters[0].schedule.MON.parts?.[0].content).toBe('수정된 이벤트');
        expect(edited.characters[0].schedule.MON.content).toBe('수정된 이벤트');

        const linked = updateScheduleItem(edited, 'a', 'MON', 'videoUrl', 'https://youtu.be/example');
        expect(linked.characters[0].schedule.MON.parts?.[0].videoUrl).toBe('https://youtu.be/example');

        const addedPart = updateScheduleItem(linked, 'a', 'MON', 'time', '19:00+21:00');
        expect(addedPart.characters[0].schedule.MON.parts).toHaveLength(2);
        expect(addedPart.characters[0].schedule.MON.parts?.[0].id).toBe(eventId);

        const removedPart = updateScheduleItem(addedPart, 'a', 'MON', 'time', '19:00');
        expect(removedPart.characters[0].schedule.MON.parts).toHaveLength(1);

        const secondEvent = updateScheduleItem(addedPart, 'a', 'MON', 'content', '첫 방송 + 두 번째 방송');
        const partLinked = updateSchedulePart(secondEvent, 'a', 'MON', 1, 'videoUrl', 'https://youtu.be/second');
        expect(partLinked.characters[0].schedule.MON.parts?.[0].videoUrl).toBe('https://youtu.be/example');
        expect(partLinked.characters[0].schedule.MON.parts?.[1].videoUrl).toBe('https://youtu.be/second');

        const partOff = updateSchedulePart(partLinked, 'a', 'MON', 1, 'type', 'off');
        expect(partOff.characters[0].schedule.MON.parts).toHaveLength(1);
        expect(partOff.characters[0].schedule.MON.parts?.[0].id).toBe(eventId);

        const multiItem: ScheduleItem = {
            time: '19:00+21:00',
            content: '첫 방송 + 두 번째 방송',
            type: 'stream',
            parts: [
                { id: eventId, time: '19:00', content: '첫 방송', type: 'stream' },
                { id: '22222222-2222-4222-8222-222222222222', time: '21:00', content: '두 번째 방송', type: 'stream' },
            ],
        };
        const multiInput = { ...input, characters: [{ ...input.characters[0], schedule: { ...input.characters[0].schedule, MON: multiItem } }, input.characters[1]] };
        const keptSecond = updateScheduleItem(multiInput, 'a', 'MON', 'time', '21:00');
        expect(keptSecond.characters[0].schedule.MON.parts?.[0].id).toBe('22222222-2222-4222-8222-222222222222');

        const removed = updateScheduleItem(removedPart, 'a', 'MON', 'type', 'off');
        expect(removed.characters[0].schedule.MON).toMatchObject({ type: 'off', time: '', content: '' });
        expect(removed.characters[0].schedule.MON.parts).toBeUndefined();
    });

    it('applies inline edits to every projection of a shared collaboration', () => {
        const eventId = '33333333-3333-4333-8333-333333333333';
        const sharedPart = (memberIds: string[]) => ({
            id: eventId,
            time: '14:00',
            content: '하나비 합방',
            type: 'collab' as const,
            eventMemberIds: memberIds,
        });
        const input: WeeklySchedule = {
            ...schedule,
            characters: schedule.characters.map((character) => ({
                ...character,
                schedule: {
                    ...character.schedule,
                    MON: {
                        time: '14:00',
                        content: '하나비 합방',
                        type: 'collab',
                        eventId,
                        eventMemberIds: ['a', 'b'],
                        parts: [sharedPart(['a', 'b'])],
                    },
                },
            })),
        };

        const edited = updateScheduleItem(input, 'b', 'MON', 'content', '수정된 합방');
        expect(edited.characters.map((character) => character.schedule.MON.content)).toEqual([
            '수정된 합방',
            '수정된 합방',
        ]);

        const off = updateScheduleItem({
            ...edited,
            characters: edited.characters.map((character) => ({
                ...character,
                schedule: {
                    ...character.schedule,
                    MON: { ...character.schedule.MON, videoUrl: 'https://youtu.be/old', category: 'old' },
                },
            })),
        }, 'b', 'MON', 'type', 'off');
        expect(off.characters.map((character) => character.schedule.MON.type)).toEqual(['off', 'off']);
        expect(off.characters[0].schedule.MON.videoUrl).toBeUndefined();
        expect(off.characters[0].schedule.MON.category).toBeUndefined();

        const restored = updateScheduleItem(off, 'b', 'MON', 'type', 'stream');
        expect(restored.characters[1].schedule.MON).toMatchObject({ type: 'stream', time: '19:00' });
        expect(restored.characters[1].schedule.MON.videoUrl).toBeUndefined();
        expect(restored.characters[1].schedule.MON.category).toBeUndefined();

        const personal = updateScheduleItem(edited, 'b', 'MON', 'type', 'stream');
        expect(personal.characters[0].schedule.MON.parts?.[0].type).toBe('stream');
        expect(personal.characters[0].schedule.MON.parts?.[0].eventMemberIds).toBeUndefined();
        expect(personal.characters[1].schedule.MON.parts?.[0].type).toBe('stream');
        expect(personal.characters[1].schedule.MON.parts?.[0].id).toBeUndefined();
    });

    it('removes default-time empty placeholders when creating a collaboration', () => {
        const input: WeeklySchedule = {
            ...schedule,
            characters: schedule.characters.map((character) => ({
                ...character,
                schedule: {
                    ...character.schedule,
                    SUN: { time: '19:00', content: '', type: 'stream' as const },
                },
            })),
        };
        const result = updateCollaborationEvent(input, {
            characterId: 'a',
            day: 'SUN',
            eventId: '44444444-4444-4444-8444-444444444444',
            time: '14:00',
            content: '하나비 합방',
            type: 'collab',
            participantIds: ['a', 'b'],
        });

        for (const character of result.characters) {
            expect(character.schedule.SUN.parts).toHaveLength(1);
            expect(character.schedule.SUN.parts?.[0].time).toBe('14:00');
        }
    });

    it('updates or removes a split collaboration part for the shared event', () => {
        const eventId = '55555555-5555-4555-8555-555555555555';
        const input: WeeklySchedule = {
            ...schedule,
            characters: schedule.characters.map((character) => ({
                ...character,
                schedule: {
                    ...character.schedule,
                    MON: {
                        time: '14:00+20:00',
                        content: '합방 + 개인',
                        type: 'collab',
                        parts: [
                            { id: eventId, time: '14:00', content: '합방', type: 'collab', eventMemberIds: ['a', 'b'] },
                            { time: '20:00', content: '개인', type: 'stream' },
                        ],
                    },
                },
            })),
        };

        const converted = updateSchedulePart(input, 'b', 'MON', 0, 'type', 'stream');
        expect(converted.characters.map((character) => character.schedule.MON.parts?.[0].type)).toEqual(['stream', 'stream']);

        const removed = updateSchedulePart(converted, 'b', 'MON', 0, 'type', 'off');
        expect(removed.characters[0].schedule.MON.parts?.map((part) => part.content)).toEqual(['합방', '개인']);
        expect(removed.characters[0].schedule.MON.parts?.[0].type).toBe('stream');
        expect(removed.characters[0].schedule.MON.parts?.[0].eventMemberIds).toBeUndefined();
        expect(removed.characters[1].schedule.MON.parts?.map((part) => part.content)).toEqual(['개인']);
    });
});

describe('updateCollaborationEvent', () => {
    it('updates all participant cells in one operation', () => {
        const result = updateCollaborationEvent(schedule, {
            characterId: 'a',
            day: 'MON',
            eventId: '11111111-1111-4111-8111-111111111111',
            time: '14:00',
            content: '하나비 합방',
            type: 'collab',
            participantIds: ['a', 'b'],
        });

        expect(result.characters.map((character) => character.schedule.MON.eventId)).toEqual([
            '11111111-1111-4111-8111-111111111111',
            '11111111-1111-4111-8111-111111111111',
        ]);
        expect(result.characters[0].schedule.MON.eventMemberIds).toEqual(['a', 'b']);
        expect(result.characters[1].schedule.MON.eventMemberIds).toEqual(['a', 'b']);
    });

    it('does not carry an off placeholder into a new collaboration', () => {
        const input = {
            ...schedule,
            characters: schedule.characters.map((character) => ({
                ...character,
                schedule: {
                    ...character.schedule,
                    SUN: { time: '', content: '휴방', type: 'off' as const },
                },
            })),
        };

        const result = updateCollaborationEvent(input, {
            characterId: 'a',
            day: 'SUN',
            eventId: '11111111-1111-4111-8111-111111111111',
            time: '14:00',
            content: '하나비 합방',
            type: 'collab',
            participantIds: ['a', 'b'],
        });

        expect(result.characters[0].schedule.SUN).toMatchObject({ type: 'collab', content: '하나비 합방' });
        expect(result.characters[1].schedule.SUN).toMatchObject({ type: 'collab', content: '하나비 합방' });
    });

    it('removes an existing event when all participants are deselected', () => {
        const input = {
            ...schedule,
            characters: schedule.characters.map((character) => character.id === 'a'
                ? { ...character, schedule: { ...character.schedule, MON: {
                    time: '14:00', content: '합방', type: 'collab' as const,
                    eventId: '11111111-1111-4111-8111-111111111111',
                    eventMemberIds: ['a'],
                    videoUrl: 'https://youtu.be/old',
                    category: 'old',
                } } }
                : character),
        };
        const result = updateCollaborationEvent(input, {
            characterId: 'a',
            day: 'MON',
            eventId: '11111111-1111-4111-8111-111111111111',
            time: '14:00',
            content: '합방',
            type: 'collab',
            participantIds: [],
        });
        expect(result.characters[0].schedule.MON.type).toBe('off');
        expect(result.characters[0].schedule.MON.videoUrl).toBeUndefined();
        expect(result.characters[0].schedule.MON.category).toBeUndefined();
    });

    it('replaces a legacy collab source on selected and deselected rows', () => {
        const legacy = {
            ...schedule,
            characters: schedule.characters.map((character) => ({
                ...character,
                schedule: {
                    ...character.schedule,
                    SUN: { time: '14:00', content: '하나비 합방', type: 'collab_hanavi' as const },
                },
            })),
        };

        const result = updateCollaborationEvent(legacy, {
            characterId: 'a',
            day: 'SUN',
            eventId: '11111111-1111-4111-8111-111111111111',
            time: '15:00',
            content: '새 합방',
            type: 'collab',
            participantIds: ['a'],
            source: {
                time: '14:00',
                content: '하나비 합방',
                type: 'collab_hanavi',
                parts: [{ time: '14:00', content: '하나비 합방', type: 'collab_hanavi' }],
            },
        });

        expect(result.characters[0].schedule.SUN.content).toBe('새 합방');
        expect(result.characters[1].schedule.SUN.type).toBe('off');
    });

    it('limits an identical legacy collab edit to its contiguous member run', () => {
        const collab = (id: string): CharacterSchedule => ({
            id,
            name: id,
            colorTheme: id,
            avatarUrl: '',
            schedule: {
                SUN: { time: '14:00', content: '같은 합방', type: 'collab_hanavi' },
            },
        });
        const separated: WeeklySchedule = {
            ...schedule,
            characters: [
                collab('a'),
                collab('b'),
                { ...schedule.characters[0], id: 'x', schedule: { SUN: { time: '19:00', content: '개인', type: 'stream' } } },
                collab('c'),
                collab('d'),
            ],
        };

        const result = updateCollaborationEvent(separated, {
            characterId: 'a',
            day: 'SUN',
            eventId: '88888888-8888-4888-8888-888888888888',
            time: '15:00',
            content: '수정된 합방',
            type: 'collab',
            participantIds: ['a', 'b'],
            source: { time: '14:00', content: '같은 합방', type: 'collab_hanavi' },
        });

        expect(result.characters.find((character) => character.id === 'a')?.schedule.SUN.content).toBe('수정된 합방');
        expect(result.characters.find((character) => character.id === 'b')?.schedule.SUN.content).toBe('수정된 합방');
        expect(result.characters.find((character) => character.id === 'c')?.schedule.SUN.content).toBe('같은 합방');
        expect(result.characters.find((character) => character.id === 'd')?.schedule.SUN.content).toBe('같은 합방');
    });

    it('normalizes a one-member collab edit to a personal stream', () => {
        const result = updateCollaborationEvent(schedule, {
            characterId: 'a',
            day: 'MON',
            eventId: '66666666-6666-4666-8666-666666666666',
            time: '14:00',
            content: '개인 전환',
            type: 'collab',
            participantIds: ['a'],
        });

        expect(result.characters[0].schedule.MON).toMatchObject({ type: 'stream', eventId: '66666666-6666-4666-8666-666666666666' });
        expect(result.characters[0].schedule.MON.eventMemberIds).toBeUndefined();
        expect(result.characters[1].schedule.MON.type).toBe('stream');
    });

    it('adds a follow-up personal part instead of encoding plus into a shared event time', () => {
        const eventId = '77777777-7777-4777-8777-777777777777';
        const input: WeeklySchedule = {
            ...schedule,
            characters: schedule.characters.map((character) => ({
                ...character,
                schedule: {
                    ...character.schedule,
                    MON: {
                        time: '14:00',
                        content: '합방',
                        type: 'collab',
                        eventId,
                        eventMemberIds: ['a', 'b'],
                        parts: [{ id: eventId, time: '14:00', content: '합방', type: 'collab', eventMemberIds: ['a', 'b'] }],
                    },
                },
            })),
        };

        const result = updateScheduleItem(input, 'a', 'MON', 'time', '14:00+20:00');
        expect(result.characters[0].schedule.MON.parts?.map((part) => part.time)).toEqual(['14:00', '20:00']);
        expect(result.characters[0].schedule.MON.parts?.[0].id).toBe(eventId);
        expect(result.characters[0].schedule.MON.parts?.[1].placeholder).toBe(true);
        expect(result.characters[1].schedule.MON.parts?.map((part) => part.time)).toEqual(['14:00']);
    });

    it('keeps an empty second part addressable until it receives content', () => {
        const withPart = addSchedulePart(schedule, 'a', 'MON');
        expect(withPart.characters[0].schedule.MON.parts).toHaveLength(2);
        expect(withPart.characters[0].schedule.MON.parts?.[1].placeholder).toBe(true);

        const edited = updateSchedulePart(withPart, 'a', 'MON', 1, 'content', '두 번째 방송');
        expect(edited.characters[0].schedule.MON.parts?.[1]).toMatchObject({
            content: '두 번째 방송',
            placeholder: false,
        });
    });
});
