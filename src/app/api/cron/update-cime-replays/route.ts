import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function buildDaysMap(weekRange: string): Record<string, string> {
    const [startStr] = weekRange.split(' - ');
    const [sM, sD] = startStr.split('.').map(Number);
    const sDate = new Date(new Date().getFullYear(), sM - 1, sD);
    const map: Record<string, string> = {};
    days.forEach((d, i) => {
        const date = new Date(sDate.getTime());
        date.setDate(sDate.getDate() + i);
        map[d] = date.toISOString().split('T')[0];
    });
    return map;
}

interface Schedule {
    id: string;
    week_range: string;
    daysMap: Record<string, string>;
}

interface Character {
    id: string;
    name: string;
    chzzk_url: string | null;
}

interface UpdateResult {
    name: string;
    detail: string;
}

async function processCharacter(
    char: Character,
    allSchedules: Schedule[]
): Promise<UpdateResult[]> {
    const handle = char.chzzk_url;
    if (!handle) return [];

    const results: UpdateResult[] = [];

    const response = await fetch(`https://ci.me/@${handle}/vods`);
    const html = await response.text();

    const datePattern = /(\d{2})\.(\d{2})\.(\d{2})|약\s(\d+)\s시간\s전/;
    const vodIds = Array.from(html.matchAll(new RegExp(`/@${handle}/vods/(\\d+)`, 'g'))).map(m => m[1]);
    const uniqueVodIds = Array.from(new Set(vodIds));

    for (const vodId of uniqueVodIds) {
        const url = `https://ci.me/@${handle}/vods/${vodId}`;
        const index = html.indexOf(`/@${handle}/vods/${vodId}`);
        const snippet = html.substring(index, index + 2500);

        const dateMatch = snippet.match(datePattern);
        const categoryMatch = snippet.match(/<span[^>]*>([^<]{2,15})<\/span>/);
        const category = categoryMatch ? categoryMatch[1].trim() : null;

        if (!dateMatch) continue;

        let videoDate: Date;
        if (dateMatch[1]) {
            videoDate = new Date(parseInt(`20${dateMatch[1]}`), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]));
        } else {
            videoDate = new Date();
        }

        if (videoDate.getHours() < 6) {
            videoDate = new Date(videoDate.getTime() - 24 * 60 * 60 * 1000);
        }

        const videoDateStr = videoDate.toISOString().split('T')[0];

        for (const sched of allSchedules) {
            const dayKey = Object.keys(sched.daysMap).find(key => sched.daysMap[key] === videoDateStr);
            if (!dayKey) continue;

            const { data: item } = await supabase
                .from('schedule_items')
                .select('id, video_url, category')
                .eq('schedule_id', sched.id)
                .eq('character_id', char.id)
                .eq('day', dayKey)
                .maybeSingle();

            if (item && (!item.video_url || !item.category)) {
                await supabase
                    .from('schedule_items')
                    .update({
                        video_url: url,
                        category: category || item.category
                    })
                    .eq('id', item.id);

                results.push({ name: char.name, detail: `${dayKey} in ${sched.week_range}: ${url} (${category || 'N/A'})` });
            }
            break;
        }
    }

    return results;
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: activeSchedule } = await supabase
            .from('schedules')
            .select('*')
            .eq('is_active', true)
            .single();

        if (!activeSchedule) {
            return NextResponse.json({ message: 'No active schedule found' });
        }

        // Pre-fetch all recent schedules once (prevents N+1)
        const { data: rawSchedules } = await supabase
            .from('schedules')
            .select('id, week_range')
            .order('created_at', { ascending: false })
            .limit(5);

        const allSchedules: Schedule[] = (rawSchedules ?? []).map(s => ({
            ...s,
            daysMap: buildDaysMap(s.week_range)
        }));

        const { data: characters } = await supabase
            .from('characters')
            .select('id, name, chzzk_url');

        if (!characters || characters.length === 0) {
            return NextResponse.json({ message: 'No characters found' });
        }

        // Parallel fetch per character
        const settled = await Promise.allSettled(
            characters.map(char => processCharacter(char, allSchedules))
        );

        const updates: string[] = [];
        settled.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                result.value.forEach(r => updates.push(r.detail));
            } else {
                console.error(`Error processing ${characters[i].name}:`, result.reason);
            }
        });

        return NextResponse.json({ success: true, updated: updates.length, details: updates });

    } catch (error) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
