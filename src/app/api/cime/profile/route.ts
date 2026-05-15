import { NextResponse } from 'next/server';

const CHANNEL_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
        return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    if (!CHANNEL_ID_PATTERN.test(channelId)) {
        return NextResponse.json({ error: 'Invalid channel ID format' }, { status: 400 });
    }

    const clientId = process.env.CIME_CLIENT_ID;
    const clientSecret = process.env.CIME_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'CIME API credentials are not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`https://ci.me/api/openapi/open/v1/channels?channelIds=${encodeURIComponent(channelId)}`, {
            headers: {
                'Client-Id': clientId,
                'Client-Secret': clientSecret
            }
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch channel info' }, { status: 502 });
        }

        const data = await response.json();

        if (data.code !== 200) {
            return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        }

        const channel = data.content?.data?.[0];
        if (!channel) {
            return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        }

        return NextResponse.json({
            channelImageUrl: channel.channelImageUrl,
            channelName: channel.channelName
        });
    } catch (error) {
        console.error('Error fetching Cime profile:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
