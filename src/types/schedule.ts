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
    colorTheme: 'varessa' | 'nemu' | 'maroka' | 'mirai' | 'ruvi' | 'iriya';
    avatarUrl: string;
    chzzkUrl?: string;
    youtubeChannelId?: string;
    schedule: {
        [key: string]: ScheduleItem; // key is day 'MON', 'TUE', etc.
    };
}

export interface WeeklySchedule {
    weekRange: string;
    characters: CharacterSchedule[];
}
