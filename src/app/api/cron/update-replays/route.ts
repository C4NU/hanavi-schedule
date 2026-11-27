import { replayPlatform, replayWriteColumn } from '@/utils/scheduleReplay';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchRecentVideos } from '@/utils/youtube';
import { getStartDateFromRange } from '@/utils/date';
import { isValidCanonicalEvent, normalizeEventType } from '@/utils/events';

// Initialize Supabase Client (Service Role for Admin Access)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CanonicalEvent {
    id: string;
    day: string;
    type?: string;
    video_url: string | null;
    alternate_video_url?: string | null;
}

type CanonicalEventLookup = Map<string, CanonicalEvent[]>;

async function loadCanonicalEventLookup(scheduleId: string): Promise<{ available: boolean; lookup: CanonicalEventLookup }> {
    const { data: eventRows, error: eventError } = await supabase
        .from('schedule_events')
        .select('*')
        .eq('schedule_id', scheduleId);

    if (eventError) {
        console.warn('[Cron] Canonical events unavailable; using legacy schedule items:', eventError.message);
        return { available: false, lookup: new Map() };
    }

    // A successful empty result is still a valid canonical read. The lookup
    // stays empty so only keys with no canonical event can use legacy fallback
    // during a partially backfilled migration.
    if (!eventRows?.length) return { available: true, lookup: new Map() };

    const eventIds = eventRows.map((event: CanonicalEvent) => event.id);
    const { data: memberRows, error: memberError } = await supabase
        .from('schedule_event_members')
        .select('event_id, character_id')
        .in('event_id', eventIds);
    if (memberError) {
        console.warn('[Cron] Canonical event members unavailable; using legacy schedule items:', memberError.message);
        return { available: false, lookup: new Map() };
    }

    const membersByEvent = new Map<string, string[]>();
    (memberRows || []).forEach((member: { event_id: string; character_id: string }) => {
        const members = membersByEvent.get(member.event_id) || [];
        members.push(member.character_id);
        membersByEvent.set(member.event_id, members);
    });
    if (eventRows.some((event: CanonicalEvent) => !isValidCanonicalEvent({
        type: normalizeEventType(event.type),
        memberIds: membersByEvent.get(event.id) || [],
    }))) {
        console.warn('[Cron] Canonical event membership is invalid; using legacy schedule items');
        return { available: false, lookup: new Map() };
    }

    const eventsById = new Map(eventRows.map((event: CanonicalEvent) => [event.id, event]));
    const lookup: CanonicalEventLookup = new Map();
    (memberRows || []).forEach((member: { event_id: string; character_id: string }) => {
        const event = eventsById.get(member.event_id);
        if (!event) return;
        const key = `${member.character_id}|${event.day}`;
        const events = lookup.get(key) || [];
        events.push(event);
        lookup.set(key, events);
    });
    return { available: true, lookup };
}

export async function GET(request: Request) {
    // 1. Security Check (Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) throw new Error('YOUTUBE_API_KEY is missing');

        // 2. Get Active Schedule
        const { data: activeSchedule, error: activeScheduleError } = await supabase
            .from('schedules')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (activeScheduleError) throw activeScheduleError;

        if (!activeSchedule) {
            return NextResponse.json({ message: 'No active schedule found' });
        }

        const canonicalEvents = await loadCanonicalEventLookup(activeSchedule.id);

        // Infer cross-year ranges (for example 12.29 - 01.04) from the
        // current week context instead of pinning the start to this year.
        const scheduleStartDate = getStartDateFromRange(activeSchedule.week_range);

        // Map Days to Date Strings (YYYY-MM-DD)
        // MON=0, TUE=1 ...
        const daysMap: Record<string, string> = {};
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

        days.forEach((day, index) => {
            const date = new Date(scheduleStartDate);
            date.setDate(scheduleStartDate.getDate() + index);
            // KST Date String
            daysMap[day] = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
                .map(part => String(part).padStart(2, '0')).join('-');
        });

        // 3. Get Characters with YouTube Channels
        const { data: characters } = await supabase
            .from('characters')
            .select('id, name, youtube_channel_id, status')
            .not('youtube_channel_id', 'is', null);

        if (!characters || characters.length === 0) {
            return NextResponse.json({ message: 'No characters with YouTube channels found' });
        }

        let updateCount = 0;
        const updates = [];
        const failedChannels: string[] = [];

        // 4. Process Each Character
        for (const char of characters) {
            if (!char.youtube_channel_id || char.status === 'graduated') continue;

            let videos;
            try {
                videos = await fetchRecentVideos(char.youtube_channel_id, apiKey);
            } catch (error) {
                const reason = error instanceof Error ? error.message : '조회 오류';
                console.warn('[YouTube Cron] 채널 조회 실패:', char.id, reason);
                failedChannels.push(char.id);
                continue;
            }

            const videosByDate = new Map<string, number>();
            for (const video of videos) {
                const date = new Date(video.publishedAt).getTime();
                if (!Number.isFinite(date) || replayPlatform(video.url) !== 'youtube') continue;
                const day = new Date(date + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
                videosByDate.set(day, (videosByDate.get(day) ?? 0) + 1);
            }
            for (const video of videos) {
                if (replayPlatform(video.url) !== 'youtube') continue;
                // Convert video publishedAt (UTC) to KST Date (YYYY-MM-DD)
                const videoDateKst = new Date(new Date(video.publishedAt).getTime() + 9 * 60 * 60 * 1000);
                if (!Number.isFinite(videoDateKst.getTime())) continue;
                const videoDateStr = videoDateKst.toISOString().split('T')[0];
                if (videosByDate.get(videoDateStr) !== 1) continue;

                // Find which Day (MON, TUE...) this date corresponds to in the current schedule
                const dayKey = Object.keys(daysMap).find(key => daysMap[key] === videoDateStr);

                if (dayKey) {
                    const eventsForKey = canonicalEvents.lookup.get(`${char.id}|${dayKey}`) || [];
                    const streams = eventsForKey.filter(event => normalizeEventType(event.type) !== 'off');
                    const canonical = streams.length === 1 ? streams[0] : undefined;

                    if (canonicalEvents.available && eventsForKey.length > 0) {
                        const column = canonical && replayWriteColumn(canonical, video.url);
                        if (!canonical || !column) continue;
                        const { data: updated, error: updateError } = await supabase
                            .from('schedule_events')
                            .update({ [column]: video.url, updated_at: new Date().toISOString() })
                            .eq('id', canonical.id)
                            .eq('schedule_id', activeSchedule.id)
                            .is(column, null)
                            .select('id');
                        if (updateError) throw updateError;

                        // Keep the in-memory lookup current when multiple VODs
                        // are returned for the same member/day.
                        if (!updated?.length) continue;
                        canonical[column] = video.url;
                    } else {
                        // Legacy fallback for schedules not yet backfilled.
                        const { data: item } = await supabase
                            .from('schedule_items')
                            .select('*')
                            .eq('schedule_id', activeSchedule.id)
                            .eq('character_id', char.id)
                            .eq('day', dayKey)
                            .maybeSingle();
                        if (!item || item.type === 'off' || item.time?.includes('+')) continue;
                        const column = replayWriteColumn(item, video.url);
                        if (!column) continue;
                        const { data: updated, error: updateError } = await supabase
                            .from('schedule_items')
                            .update({ [column]: video.url })
                            .eq('id', item.id)
                            .is(column, null)
                            .select('id');
                        if (updateError) throw updateError;
                        if (!updated?.length) continue;
                    }

                    updates.push(`${char.name} - ${dayKey}: ${video.title}`);
                    updateCount++;
                }
            }
        }

        return NextResponse.json({
            success: failedChannels.length === 0,
            updated: updateCount,
            details: updates,
            failedChannels,
        }, { status: failedChannels.length ? 503 : 200 });

    } catch (error) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
