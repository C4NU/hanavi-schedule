import { WeeklySchedule, CharacterSchedule, ScheduleItem } from '@/types/schedule';

// Map Korean names to IDs and themes
const CHAR_MAP: { [key: string]: { id: string, theme: CharacterSchedule['colorTheme'], avatar: string, chzzkUrl: string } } = {
    '바레사': { id: 'varessa', theme: 'varessa', avatar: '/avatars/baresa.png', chzzkUrl: 'https://chzzk.naver.com/cb40b98631410d4cc3796ab279c2f1bc' },
    '네무': { id: 'nemu', theme: 'nemu', avatar: '/avatars/nemu.png', chzzkUrl: 'https://chzzk.naver.com/7c4c49fd3a34ce68e84075f5b44fe8c8' },
    '마로카': { id: 'maroka', theme: 'maroka', avatar: '/avatars/maroka.png', chzzkUrl: 'https://chzzk.naver.com/b6845db9a47441227410125f581eee31' },
    '미라이': { id: 'mirai', theme: 'mirai', avatar: '/avatars/mirai.png', chzzkUrl: 'https://chzzk.naver.com/37716364b3086fefd298046072c92345' },
    '루비': { id: 'ruvi', theme: 'ruvi', avatar: '/avatars/ruvi.png', chzzkUrl: 'https://chzzk.naver.com/acc87c975763452aab25e281e0eb0b85' },
    '이리야': { id: 'iriya', theme: 'iriya', avatar: '/avatars/iriya.png', chzzkUrl: 'https://chzzk.naver.com/10d1ce368f685df0502875195eee39eb' },
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
