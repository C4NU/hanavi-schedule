
export interface YouTubeVideo {
    id: string;
    title: string;
    publishedAt: string; // ISO 8601
    url: string;
}

export async function fetchRecentVideos(channelId: string, apiKey: string): Promise<YouTubeVideo[]> {
    if (!channelId || !apiKey) return [];

    try {
        // 1. Get Uploads Playlist ID
        const channelRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const channelData = await channelRes.json();

        if (!channelData.items || channelData.items.length === 0) {
            console.error(`Channel not found: ${channelId}`);
            return [];
        }

        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        // 2. Get Recent Videos
        const videosRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`
        );
        const videosData = await videosRes.json();

        if (!videosData.items) return [];

        return videosData.items.map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
        }));

    } catch (error) {
        console.error('Error fetching YouTube videos:', error);
        return [];
    }
}
