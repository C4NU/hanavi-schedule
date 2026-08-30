import { NextResponse } from 'next/server';

const ALLOWED_DOMAINS = [
    'ci.me',
    'i.ytimg.com',
    'yt3.ggpht.com',
    'img.youtube.com',
    'nng-phinf.pstatic.net',
];

function isHostAllowed(hostname: string): boolean {
    return ALLOWED_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
}

async function fetchAllowedImage(url: string): Promise<Response> {
    let currentUrl = url;
    for (let redirectCount = 0; redirectCount < 4; redirectCount++) {
        const response = await fetch(currentUrl, { redirect: 'manual' });
        const status = Number.isFinite(response.status) ? response.status : 200;
        if (status < 300 || status >= 400) return response;

        const location = response.headers.get('location');
        if (!location) return response;
        const redirected = new URL(location, currentUrl);
        if (redirected.protocol !== 'https:' || !isHostAllowed(redirected.hostname)) {
            throw new Error('Image redirect host not allowed');
        }
        currentUrl = redirected.toString();
    }
    throw new Error('Too many image redirects');
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (url.startsWith('/') && !url.startsWith('//')) {
        const origin = new URL(request.url).origin;
        if (url.includes('\\') || /[\u0000-\u001F\u007F]/.test(url)) {
            return NextResponse.json({ error: 'Invalid local path' }, { status: 400 });
        }
        const localUrl = new URL(url, origin);
        if (localUrl.origin !== origin) {
            return NextResponse.json({ error: 'Invalid local path' }, { status: 400 });
        }
        return NextResponse.redirect(localUrl);
    }

    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (parsed.protocol !== 'https:' || !isHostAllowed(parsed.hostname)) {
        return NextResponse.json({ error: 'Host not allowed' }, { status: 400 });
    }

    try {
        const response = await fetchAllowedImage(url);
        if (response.ok === false) {
            const status = response.status >= 400 && response.status <= 599 ? response.status : 502;
            return NextResponse.json({ error: 'Upstream image request failed' }, { status });
        }
        const blob = await response.blob();
        const contentType = response.headers.get('Content-Type') || 'image/png';
        if (!contentType.toLowerCase().startsWith('image/')) {
            return NextResponse.json({ error: 'Upstream response is not an image' }, { status: 415 });
        }
        const headers = new Headers();

        headers.set('Content-Type', contentType);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=3600');

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error('Proxy error:', error);
        if (error instanceof Error && error.message === 'Image redirect host not allowed') {
            return NextResponse.json({ error: 'Image redirect host not allowed' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
    }
}
