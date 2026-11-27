export type ReplayPlatform = 'cime' | 'youtube' | 'other';

export function replayPlatform(url: string): ReplayPlatform | undefined {
    try {
        const { protocol, hostname, username, password } = new URL(url);
        if (protocol !== 'https:' || username || password) return;
        if (hostname === 'ci.me' || hostname.endsWith('.ci.me')) return 'cime';
        if (hostname === 'youtu.be' || hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) return 'youtube';
        return 'other';
    } catch {
        return;
    }
}

const REPLAY_LABELS = {
    cime: '씨미 다시보기',
    youtube: 'YouTube 다시보기',
    other: '다시보기',
};

const REPLAY_ORDER = { cime: 0, youtube: 1, other: 2 };

export function scheduleReplays(item: { videoUrl?: string; alternateVideoUrl?: string }) {
    const links = [item.videoUrl, item.alternateVideoUrl].flatMap(url => {
        const platform = url && replayPlatform(url);
        return url && platform ? [{ url, platform, label: REPLAY_LABELS[platform] }] : [];
    });
    return links
        .filter((link, index) => links.findIndex(other => other.url === link.url || (link.platform !== 'other' && other.platform === link.platform)) === index)
        .sort((left, right) => REPLAY_ORDER[left.platform] - REPLAY_ORDER[right.platform]);
}

type ReplayColumns = { video_url: string | null; alternate_video_url?: string | null };

export function replayWriteColumn(row: ReplayColumns, url: string): keyof ReplayColumns | undefined {
    const platform = replayPlatform(url);
    if (!platform || [row.video_url, row.alternate_video_url].some(
        existing => existing === url || (existing && replayPlatform(existing) === platform),
    )) return;

    if (!row.video_url) return 'video_url';
    if (row.alternate_video_url === null) return 'alternate_video_url';
}
