export interface YouTubeVideo {
    id: string;
    title: string;
    publishedAt: string;
    url: string;
}

const errorMessages = {
    configuration: 'YouTube API 키 및 프로젝트 설정을 확인해 주세요.',
    quota: 'YouTube API 할당량이 초과됐습니다. 할당량이 초기화된 뒤 다시 시도해 주세요.',
    unavailable: 'YouTube API에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    channel: 'YouTube 채널 ID를 확인해 주세요.',
} as const;

export class YouTubeLookupError extends Error {
    constructor(readonly code: keyof typeof errorMessages) {
        super(errorMessages[code]);
        this.name = 'YouTubeLookupError';
    }
}

interface YouTubeList<T> {
    items?: T[];
    error?: { errors?: { reason?: string }[]; details?: { reason?: string }[] };
}

async function fetchItems<T>(
    resource: 'channels' | 'playlistItems',
    params: Record<string, string>,
    apiKey: string,
    revalidate: number,
): Promise<T[]> {
    const query = new URLSearchParams(params);
    let response: Response;
    let data: YouTubeList<T>;
    try {
        response = await fetch(`https://www.googleapis.com/youtube/v3/${resource}?${query}`, {
            headers: { 'x-goog-api-key': apiKey },
            next: { revalidate },
            signal: AbortSignal.timeout(8000),
        });
        data = await response.json();
    } catch {
        throw new YouTubeLookupError('unavailable');
    }

    const reasons = [
        ...(data?.error?.errors ?? []),
        ...(data?.error?.details ?? []),
    ].map(({ reason }) => reason);
    if (reasons.some(reason => reason === 'quotaExceeded' || reason === 'dailyLimitExceeded')) {
        throw new YouTubeLookupError('quota');
    }
    if (reasons.some(reason => reason?.startsWith('API_KEY_') || reason === 'keyInvalid' || reason === 'keyExpired')
        || response.status === 401 || response.status === 403) {
        throw new YouTubeLookupError('configuration');
    }
    if (response.status === 404 || reasons.includes('invalidChannelId')) {
        throw new YouTubeLookupError('channel');
    }
    if (!response.ok || !Array.isArray(data?.items)) {
        throw new YouTubeLookupError('unavailable');
    }
    return data.items;
}

export async function fetchRecentVideos(channelId: string, apiKey: string): Promise<YouTubeVideo[]> {
    if (!apiKey) throw new YouTubeLookupError('configuration');
    const id = channelId.trim();
    if (!/^UC[A-Za-z0-9_-]{22}$/.test(id)) throw new YouTubeLookupError('channel');

    const channels = await fetchItems<{
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>('channels', { part: 'contentDetails', id }, apiKey, 86400);
    const uploadsPlaylistId = channels[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) throw new YouTubeLookupError('channel');

    const items = await fetchItems<{
        snippet?: { resourceId?: { videoId?: string }; title?: string; publishedAt?: string };
    }>('playlistItems', { part: 'snippet', playlistId: uploadsPlaylistId, maxResults: '10' }, apiKey, 300);
    return items.flatMap(({ snippet }) => {
        const id = snippet?.resourceId?.videoId;
        const title = snippet?.title;
        const publishedAt = snippet?.publishedAt;
        if (!id || !title || !publishedAt || !Number.isFinite(Date.parse(publishedAt))) return [];
        return [{ id, title, publishedAt, url: `https://www.youtube.com/watch?v=${id}` }];
    });
}
