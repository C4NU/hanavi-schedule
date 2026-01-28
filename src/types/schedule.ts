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
    colorTheme: string; // Changed from union type to string to support dynamic new members
    avatarUrl: string;
    chzzkUrl?: string;
    youtubeChannelId?: string;
    youtubeReplayUrl?: string;
    regularHoliday?: string; // Comma-separated days 'MON,THU'
    defaultTime?: string; // Default start time e.g. '19:00'
    sortOrder?: number;   // Display order
    colorBg?: string;     // Hex code for background
    colorBorder?: string; // Hex code for border/text
    schedule: {
        [key: string]: ScheduleItem; // key is day 'MON', 'TUE', etc.
    };
}

export interface WeeklySchedule {
    weekRange: string;
    characters: CharacterSchedule[];
}
