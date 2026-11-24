export interface ReplayCandidate {
    member: string;
    date: string;
    scheduleTitle?: string | null;
    videoTitle?: string;
    url?: string;
    changes: string[];
}
