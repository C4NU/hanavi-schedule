import { NextResponse } from 'next/server';
import { getScheduleFromSupabase } from '@/utils/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') || undefined;

    // Fetch schedule from Supabase (Source of Truth)
    // 장애 시 mock을 반환하지 않는다 — 클라이언트가 localStorage 캐시로 폴백한다
    // (목데이터는 고정 멤버 목록이라 관리자가 추가한 멤버가 누락되는 버그 원인이었음)
    try {
        const schedule = await getScheduleFromSupabase(week);

        if (schedule) {
            return NextResponse.json(schedule, {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                }
            });
        }

        console.warn('Schedule not found in Supabase');
        return NextResponse.json({ error: 'Schedule not found' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Schedule fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
