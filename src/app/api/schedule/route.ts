import { NextResponse } from 'next/server';
import { getScheduleFromSupabase } from '@/utils/supabase';
import { MOCK_SCHEDULE } from '@/data/mockSchedule';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') || undefined;

    // Fetch schedule from Supabase (Source of Truth)
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

        console.warn('Failed to fetch from Supabase, falling back to mock data');
        return NextResponse.json(MOCK_SCHEDULE);
    } catch (error) {
        console.error('Schedule fetch error:', error);
        return NextResponse.json(MOCK_SCHEDULE);
    }
}
