import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
        return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
    }

    const clientId = process.env.CIME_CLIENT_ID;
    const clientSecret = process.env.CIME_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'CIME API credentials are not configured' }, { status: 500 });
    }

    try {
        const response = await fetch(`https://ci.me/api/openapi/open/v1/channels?channelIds=${channelId}`, {
            headers: {
                'Client-Id': clientId,
                'Client-Secret': clientSecret
            }
        });

        if (!response.ok) {
            throw new Error(`Cime API returned status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.code !== 200) {
            throw new Error(data.message || 'Unknown error from Cime API');
        }

        const channel = data.content?.data?.[0];
        if (!channel) {
            return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
        }

        return NextResponse.json({
            channelImageUrl: channel.channelImageUrl,
            channelName: channel.channelName
        });
    } catch (error: any) {
        console.error('Error fetching Cime profile:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
