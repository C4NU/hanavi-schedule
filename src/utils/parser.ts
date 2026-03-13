import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';

// Map Korean names to IDs and themes
// TODO: Fetch from Supabase and pass to parseSchedule for full dynamic support
const CHAR_MAP: { [key: string]: { id: string, theme: CharacterSchedule['colorTheme'], avatar: string, chzzkUrl: string } } = {
    // Hardcoded characters removed. Rely on DB-driven data.
};

// Map English days to Korean keys - Removed as we now use English keys directly
// const DAY_MAP: { [key: string]: string } = { ... };

export function parseSchedule(text: string): WeeklySchedule {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    let weekRange = '';
    const characters: CharacterSchedule[] = [];
    let currentChar: CharacterSchedule | null = null;

    for (const line of lines) {
        // Parse Week Range
        if (line.startsWith('WEEK:')) {
            weekRange = line.replace('WEEK:', '').trim();
            continue;
        }

        // Parse Character Header [Name]
        if (line.startsWith('[') && line.endsWith(']')) {
            const name = line.slice(1, -1);
            const info = CHAR_MAP[name];
            if (info) {
                currentChar = {
                    id: info.id,
                    name: name,
                    colorTheme: info.theme,
                    avatarUrl: info.avatar,
                    chzzkUrl: info.chzzkUrl,
                    schedule: {}
                };
                characters.push(currentChar);
            }
            continue;
        }

        // Parse Schedule Item: DAY | TIME | CONTENT
        if (currentChar && line.includes('|')) {
            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 3) {
                const [dayCode, time, content] = parts;
                const day = dayCode; // Use English keys directly (MON, TUE, etc.)

                const item: ScheduleItem = {
                    time: time === 'OFF' ? '' : time,
                    content: content,
                    type: time === 'OFF' ? 'off' : undefined
                };

                currentChar.schedule[day] = item;
            }
        }
    }

    return {
        weekRange,
        characters
    };
}
