export interface ScheduleMemo {
    id: string;
    schedule_item_id: string;
    event_id?: string;
    content: string;
    created_at: string;
}

export type ScheduleItemType =
    | 'stream'
    | 'collab'
    | 'collab_external'
    | 'collab_maivi'
    | 'collab_hanavi'
    | 'collab_universe'
    | 'off';

/** Metadata for one real event when a member has multiple broadcasts in a day. */
export interface ScheduleItemPart {
    id?: string;
    time: string;
    content: string;
    type?: ScheduleItemType;
    /** A locally-added empty part that should remain editable but never save. */
    placeholder?: boolean;
    videoUrl?: string;
    category?: string;
    eventMemberIds?: string[];
    guests?: string[];
    memos?: ScheduleMemo[];
}

export interface ScheduleItem {
    id?: string; // Database ID
    eventId?: string; // 이벤트 모델: 이 셀이 파생된 이벤트 (합방은 참여자 간 공유)
    time: string;
    content: string;
    type?: ScheduleItemType;
    /** A locally-added empty part placeholder; false marks an explicit empty broadcast. */
    placeholder?: boolean;
    videoUrl?: string;
    category?: string;
    memo?: string; // Legacy support or single memo
    memos?: ScheduleMemo[]; // New community/multiple memos
    eventMemberIds?: string[]; // 합방 이벤트 참여자 (저장 시 이벤트 멤버 재구성용)
    guests?: string[];
    /** Per-event identity. `time`/`content` remain a display projection for legacy views. */
    parts?: ScheduleItemPart[];
}

// 이벤트 모델 (v1.10.0): 모든 방송 = 이벤트 (개인은 멤버 1명, 합방은 멤버 2명+)
export interface WeekEvent {
    id: string;
    scheduleId: string;
    day: string;
    startTime: string | null;
    title: string;
    type: 'stream' | 'off' | 'collab' | 'collab_external';
    videoUrl?: string;
    category?: string;
    memberIds: string[];
    guests?: string[];
    memos?: ScheduleMemo[];
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
    scheduleId?: string;
    characters: CharacterSchedule[];
    isUsingRealData?: boolean;
    events?: WeekEvent[]; // 이벤트 모델 (v1.10.0) — 있으면 셀 파생의 소스로 사용
    /**
     * Canonical event rows and their relationships were loaded successfully.
     * An unavailable canonical source must never be serialized as if it were
     * an intentional legacy edit, or a save can create ghosts/delete events.
     */
    canonicalEventsStatus?: 'available' | 'unavailable';
}
