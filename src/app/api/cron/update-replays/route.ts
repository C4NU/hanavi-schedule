import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchRecentVideos } from '@/utils/youtube';

// Initialize Supabase Client (Service Role for Admin Access)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    // 1. Security Check (Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow running in development without secret for testing if needed, or strictly enforce
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        console.log('[Cron] Starting YouTube Replay Sync...');
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) throw new Error('YOUTUBE_API_KEY is missing');

        // 2. Get Active Schedule
        const { data: activeSchedule } = await supabase
            .from('schedules')
            .select('*')
            .eq('is_active', true)
            .single();

        if (!activeSchedule) {
            return NextResponse.json({ message: 'No active schedule found' });
        }

        // Parse Week Range (e.g. "01.27 - 02.02")
        // Assumption: The schedule is for the current year.
        const [startStr] = activeSchedule.week_range.split(' - ');
        const [startMonth, startDay] = startStr.split('.').map(Number);
        const currentYear = new Date().getFullYear();

        // Calculate Monday Date of the schedule
        // Note: Months are 0-indexed in JS Date
        const scheduleStartDate = new Date(currentYear, startMonth - 1, startDay);

        // Map Days to Date Strings (YYYY-MM-DD)
        // MON=0, TUE=1 ...
        const daysMap: Record<string, string> = {};
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

        days.forEach((day, index) => {
            const date = new Date(scheduleStartDate);
            date.setDate(scheduleStartDate.getDate() + index);
            // KST Date String
            daysMap[day] = date.toISOString().split('T')[0];
        });

        console.log('[Cron] Active Schedule Week:', activeSchedule.week_range);
        console.log('[Cron] Days Mapping:', daysMap);

        // 3. Get Characters with YouTube Channels
        const { data: characters } = await supabase
            .from('characters')
            .select('id, name, youtube_channel_id')
            .not('youtube_channel_id', 'is', null);

        if (!characters || characters.length === 0) {
            return NextResponse.json({ message: 'No characters with YouTube channels found' });
        }

        let updateCount = 0;
        const updates = [];

        // 4. Process Each Character
        for (const char of characters) {
            if (!char.youtube_channel_id) continue;

            const videos = await fetchRecentVideos(char.youtube_channel_id, apiKey);

            for (const video of videos) {
                // Convert video publishedAt (UTC) to KST Date (YYYY-MM-DD)
                const publishedDate = new Date(video.publishedAt);
                // Add 9 hours for KST
                publishedDate.setHours(publishedDate.getHours() + 9);
                const videoDateStr = publishedDate.toISOString().split('T')[0];

                // Find which Day (MON, TUE...) this date corresponds to in the current schedule
                const dayKey = Object.keys(daysMap).find(key => daysMap[key] === videoDateStr);

                if (dayKey) {
                    // Check if schedule item exists for this character on this day
                    const { data: item } = await supabase
                        .from('schedule_items')
                        .select('id, video_url')
                        .eq('schedule_id', activeSchedule.id)
                        .eq('character_id', char.id)
                        .eq('day', dayKey)
                        .single();

                    // If item exists and has NO video_url, update it!
                    if (item && !item.video_url) {
                        console.log(`[Cron] Updating ${char.name} (${dayKey}): ${video.title}`);

                        await supabase
                            .from('schedule_items')
                            .update({ video_url: video.url })
                            .eq('id', item.id);

                        updates.push(`${char.name} - ${dayKey}: ${video.title}`);
                        updateCount++;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            updated: updateCount,
            details: updates
        });

    } catch (error: any) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
