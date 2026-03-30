export interface ScheduleMemo {
    id: string;
    schedule_item_id: string;
    content: string;
    created_at: string;
}

export interface ScheduleItem {
    id?: string; // Database ID
    time: string;
    content: string;
    type?: 'stream' | 'collab' | 'collab_maivi' | 'collab_hanavi' | 'collab_universe' | 'off';
    videoUrl?: string;
    memo?: string; // Legacy support or single memo
    memos?: ScheduleMemo[]; // New community/multiple memos
}

export interface DaySchedule {
    day: string; // 'MON', 'TUE', etc.
    items: ScheduleItem[];
}

export interface CharacterSchedule {
    id: string;
    name: string;
    birthday?: string;
    colorTheme: string; // Changed from union type to string to support dynamic new members
    avatarUrl: string;
    chzzkUrl?: string;
    cimeUrl?: string;
    youtubeUrl?: string;
    youtubeChannelId?: string;
    youtubeReplayUrl?: string;
    twitterUrl?: string;
    regularHoliday?: string; // Comma-separated days 'MON,THU'
    defaultTime?: string; // Default start time e.g. '19:00'
    sortOrder?: number;   // Display order
    colorBg?: string;     // Hex code for background
    colorBorder?: string; // Hex code for border/text
    status?: 'active' | 'graduated';
    graduationDate?: string; // ISO date string or YYYY-MM-DD
    schedule: {
        [key: string]: ScheduleItem; // key is day 'MON', 'TUE', etc.
    };
}

export interface WeeklySchedule {
    weekRange: string;
    characters: CharacterSchedule[];
    isUsingRealData?: boolean;
}
