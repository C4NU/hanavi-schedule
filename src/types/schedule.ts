export interface ScheduleItem {
    time: string;
    content: string;
    type?: 'stream' | 'collab' | 'collab_maivi' | 'collab_hanavi' | 'collab_universe' | 'off';
    videoUrl?: string;
}

export interface DaySchedule {
    day: string; // 'MON', 'TUE', etc.
    items: ScheduleItem[];
}

export interface CharacterSchedule {
    id: string;
    name: string;
    colorTheme: 'varessa' | 'nemu' | 'maroka' | 'mirai' | 'ruvi' | 'iriya' | 'cherii' | 'aella';
    avatarUrl: string;
    chzzkUrl?: string;
    youtubeChannelId?: string;
    regularHoliday?: string; // Comma-separated days 'MON,THU'
    schedule: {
        [key: string]: ScheduleItem; // key is day 'MON', 'TUE', etc.
    };
}

export interface WeeklySchedule {
    weekRange: string;
    characters: CharacterSchedule[];
}
