import { ScheduleItem, WeeklySchedule } from '@/types/schedule';

export function updateScheduleItem(
    schedule: WeeklySchedule,
    characterId: string,
    day: string,
    field: keyof ScheduleItem,
    value: string,
): WeeklySchedule {
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
            } else if (value === 'off') {
                item.time = '';
            }
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
