import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client (Service Role for Admin Access)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    // 1. Security Check (Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        console.log('[Cron] Starting Cime VOD Sync...');

        // 2. Get Active Schedule
        const { data: activeSchedule } = await supabase
            .from('schedules')
            .select('*')
            .eq('is_active', true)
            .single();

        if (!activeSchedule) {
            return NextResponse.json({ message: 'No active schedule found' });
        }

        // Parse Week Range (e.g. "05.11 - 05.17")
        const [startStr] = activeSchedule.week_range.split(' - ');
        const [startMonth, startDay] = startStr.split('.').map(Number);
        const currentYear = new Date().getFullYear();
        const scheduleStartDate = new Date(currentYear, startMonth - 1, startDay);

        const daysMap: Record<string, string> = {};
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        days.forEach((day, index) => {
            const date = new Date(scheduleStartDate);
            date.setDate(scheduleStartDate.getDate() + index);
            daysMap[day] = date.toISOString().split('T')[0];
        });

        // 3. Get Characters with Cime/Chzzk IDs
        const { data: characters } = await supabase
            .from('characters')
            .select('id, name, chzzk_url');

        if (!characters || characters.length === 0) {
            return NextResponse.json({ message: 'No characters found' });
        }

        let updateCount = 0;
        const updates = [];

        // 4. Process Each Character
        for (const char of characters) {
            const handle = char.chzzk_url;
            if (!handle) continue;

            try {
                // Fetch VODs page
                const vodsUrl = `https://ci.me/@${handle}/vods`;
                const response = await fetch(vodsUrl);
                const html = await response.text();

                // Simple regex to find VOD links and dates
                // The pattern in HTML seems to be:
                // <a href="/@handle/vods/VOD_ID">...</a>
                // and somewhere nearby is the date like 26.05.11 or "약 X시간 전"
                
                // Let's use a broad regex to capture VOD IDs and their relative positions
                const vodRegex = new RegExp(`/@${handle}/vods/(\\d+)`, 'g');
                let match;
                const vodsFound: { id: string, date: string }[] = [];

                // To find dates, we'll look for date patterns near the VOD IDs
                // Pattern: 26.05.11 (YY.MM.DD)
                const datePattern = /(\d{2})\.(\d{2})\.(\d{2})|약\s(\d+)\s시간\s전/;
                
                // Instead of complex parsing, let's look for the JSON state which is more reliable
                // The earlier curl showed the data is in the script tag
                const stateMatch = html.match(/window\.__PRELOADED_STATE__\s*=\s*(.*?);<\/script>/) || 
                             html.match(/<script id="__NEXT_DATA__".*?>(.*?)<\/script>/);
                
                if (stateMatch) {
                    const state = JSON.parse(stateMatch[1]);
                    // Traverse state to find VOD list (structure varies, but usually under apollo or redux state)
                    // Given the markdown, the links ARE in the HTML as well.
                }

                // Fallback to regex if state parsing is too complex
                // Let's try to extract segments of HTML per VOD card
                // Cards usually start with something like <div class="...card...">
                const cards = html.split(/<a[^>]+href="\/@[\w.-]+\/vods\/\d+"/).slice(1);
                const vodIds = Array.from(html.matchAll(new RegExp(`/@${handle}/vods/(\\d+)`, 'g'))).map(m => m[1]);
                
                // Unique VOD IDs
                const uniqueVodIds = Array.from(new Set(vodIds));

                for (const vodId of uniqueVodIds) {
                    const url = `https://ci.me/@${handle}/vods/${vodId}`;
                    const index = html.indexOf(`/@${handle}/vods/${vodId}`);
                    const snippet = html.substring(index, index + 2500); 
                    
                    const dateMatch = snippet.match(datePattern);
                    const categoryMatch = snippet.match(/<span[^>]*>([^<]{2,15})<\/span>/);
                    const category = categoryMatch ? categoryMatch[1].trim() : null;

                    if (dateMatch) {
                        let videoDate: Date;
                        if (dateMatch[1]) {
                            videoDate = new Date(parseInt(`20${dateMatch[1]}`), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
                        } else {
                            // "오늘" (Today)
                            videoDate = new Date();
                        }

                        // Broadcast Day Logic: If the VOD was created before 6 AM, it likely belongs to the previous day's schedule slot.
                        if (videoDate.getHours() < 6) {
                            videoDate.setDate(videoDate.getDate() - 1);
                        }
                        
                        const videoDateStr = videoDate.toISOString().split('T')[0];

                        // Find the schedule that covers this date
                        // We need to fetch all recent schedules to find the right one
                        const { data: allSchedules } = await supabase
                            .from('schedules')
                            .select('id, week_range')
                            .order('created_at', { ascending: false })
                            .limit(5);

                        if (allSchedules) {
                            for (const sched of allSchedules) {
                                const [sStr] = sched.week_range.split(' - ');
                                const [sM, sD] = sStr.split('.').map(Number);
                                const sYear = new Date().getFullYear();
                                const sDate = new Date(sYear, sM - 1, sD);
                                
                                const schedDaysMap: Record<string, string> = {};
                                days.forEach((d, i) => {
                                    const date = new Date(sDate);
                                    date.setDate(sDate.getDate() + i);
                                    schedDaysMap[d] = date.toISOString().split('T')[0];
                                });

                                const dayKey = Object.keys(schedDaysMap).find(key => schedDaysMap[key] === videoDateStr);
                                if (dayKey) {
                                    const { data: item } = await supabase
                                        .from('schedule_items')
                                        .select('id, video_url, category')
                                        .eq('schedule_id', sched.id)
                                        .eq('character_id', char.id)
                                        .eq('day', dayKey)
                                        .maybeSingle();

                                    if (item && (!item.video_url || !item.category)) {
                                        console.log(`[Cron] Updating Cime ${char.name} (${dayKey} in ${sched.week_range}): ${url} [${category}]`);
                                        await supabase
                                            .from('schedule_items')
                                            .update({ 
                                                video_url: url,
                                                category: category || item.category
                                            })
                                            .eq('id', item.id);

                                        updates.push(`${char.name} - ${dayKey}: ${url} (${category || 'N/A'})`);
                                        updateCount++;
                                    }
                                    break; // Found the right day in a schedule, move to next VOD
                                }
                            }
                        }
                    }
                }

            } catch (err) {
                console.error(`Error processing ${char.name}:`, err);
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
