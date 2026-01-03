import { NextResponse } from 'next/server';

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
        // 1. Get Uploads Playlist ID
        // Channels API: https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=CHANNEL_ID&key=API_KEY
        const channelRes = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const channelData = await channelRes.json();

        if (!channelData.items || channelData.items.length === 0) {
            return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        }

        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        // 2. Get Recent Videos from Playlist
        // PlaylistItems API: https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=PLAYLIST_ID&maxResults=10&key=API_KEY
        const videosRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${apiKey}`
        );
        const videosData = await videosRes.json();

        const videos = videosData.items.map((item: any) => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            publishedAt: item.snippet.publishedAt,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
        }));

        return NextResponse.json({ videos });

    } catch (error) {
        console.error('YouTube API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch YouTube data' }, { status: 500 });
    }
}
