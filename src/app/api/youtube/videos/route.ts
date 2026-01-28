import { NextResponse } from 'next/server';
import { fetchRecentVideos } from '@/utils/youtube';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'YouTube API Key is not configured' }, { status: 500 });
    }

    if (!channelId) {
        return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    try {
        const videos = await fetchRecentVideos(channelId, apiKey);

        if (videos.length === 0) {
            // Mimic previous behavior: simple empty return is fine, 
            // but previous code had separate 'Channel not found' check.
            // The utility returns empty array on error/not found.
            // Let's just return empty array.
        }

        return NextResponse.json({ videos });

    } catch (error) {
        console.error('YouTube API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch YouTube data' }, { status: 500 });
    }
}
