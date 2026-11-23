import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkIsAdmin } from '@/utils/supabase';
import { fetchRecentVideos, YouTubeLookupError } from '@/utils/youtube';

const errorStatus = { channel: 400, configuration: 503, quota: 503, unavailable: 502 } as const;

export async function GET(request: Request) {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) {
        return NextResponse.json({ error: '관리자로 다시 로그인해 주세요.' }, { status: 401 });
    }

    try {
        const adminClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
        );
        const { data: { user }, error } = await adminClient.auth.getUser(token);
        if (error || !user) {
            return NextResponse.json({ error: '관리자로 다시 로그인해 주세요.' }, { status: 401 });
        }
        if (!await checkIsAdmin(user.id, adminClient)) {
            return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
        }

        const channelId = new URL(request.url).searchParams.get('channelId') ?? '';
        const videos = await fetchRecentVideos(channelId, process.env.YOUTUBE_API_KEY ?? '');
        return NextResponse.json({ videos });
    } catch (error) {
        if (error instanceof YouTubeLookupError) {
            console.warn('[YouTube] 조회 실패:', error.code);
            return NextResponse.json({ error: error.message, code: error.code }, { status: errorStatus[error.code] });
        }
        console.error('[YouTube] 관리자 영상 조회 실패');
        return NextResponse.json({ error: 'YouTube 영상 조회를 처리하지 못했습니다.' }, { status: 500 });
    }
}
