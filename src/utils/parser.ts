import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';

// Map Korean names to IDs and themes
const CHAR_MAP: { [key: string]: { id: string, theme: CharacterSchedule['colorTheme'], avatar: string } } = {
    '바레사': { id: 'baresa', theme: 'baresa', avatar: '/avatars/baresa.png' },
    '네무': { id: 'nemu', theme: 'nemu', avatar: '/avatars/nemu.png' },
    '마로카': { id: 'maroka', theme: 'maroka', avatar: '/avatars/maroka.png' },
    '미라이': { id: 'mirai', theme: 'mirai', avatar: '/avatars/mirai.png' },
    '루비': { id: 'ruvi', theme: 'ruvi', avatar: '/avatars/ruvi.png' },
    '이리야': { id: 'iriya', theme: 'iriya', avatar: '/avatars/iriya.png' },
};

// Map English days to Korean keys
const DAY_MAP: { [key: string]: string } = {
    'MON': '월',
    'TUE': '화',
    'WED': '수',
    'THU': '목',
    'FRI': '금',
    'SAT': '토',
    'SUN': '일',
};

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
                const day = DAY_MAP[dayCode] || dayCode; // Map MON -> 월

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
