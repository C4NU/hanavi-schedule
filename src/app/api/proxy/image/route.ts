import { NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set(['ci.me', 'i.ytimg.com', 'yt3.ggpht.com', 'img.youtube.com']);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (url.startsWith('/')) {
        const origin = new URL(request.url).origin;
        return NextResponse.redirect(new URL(url, origin));
    }

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
        return NextResponse.json({ error: 'Host not allowed' }, { status: 400 });
    }

    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const headers = new Headers();

        headers.set('Content-Type', response.headers.get('Content-Type') || 'image/png');
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
}
