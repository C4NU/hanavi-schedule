export interface ScheduleItem {
    time: string;
    content: string;
    type?: 'stream' | 'video' | 'collab' | 'off';
}

export interface DaySchedule {
    day: string; // 'MON', 'TUE', etc.
    items: ScheduleItem[];
}

export interface CharacterSchedule {
    id: string;
    name: string;
    colorTheme: 'varessa' | 'nemu' | 'maroka' | 'mirai' | 'ruvi' | 'iriya';
    avatarUrl: string;
    chzzkUrl?: string;
    schedule: {
        [key: string]: ScheduleItem; // key is day 'MON', 'TUE', etc.
    };
}

export interface WeeklySchedule {
    weekRange: string;
    characters: CharacterSchedule[];
}
