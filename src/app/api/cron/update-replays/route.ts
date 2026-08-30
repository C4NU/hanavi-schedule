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
}

type CanonicalEventLookup = Map<string, CanonicalEvent[]>;

async function loadCanonicalEventLookup(scheduleId: string): Promise<{ available: boolean; lookup: CanonicalEventLookup }> {
    const { data: eventRows, error: eventError } = await supabase
        .from('schedule_events')
        .select('id, day, type, video_url')
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
        const { data: activeSchedule } = await supabase
            .from('schedules')
            .select('*')
            .eq('is_active', true)
            .single();

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
            daysMap[day] = date.toISOString().split('T')[0];
        });

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
                const videoDateKst = new Date(new Date(video.publishedAt).getTime() + 9 * 60 * 60 * 1000);
                const videoDateStr = videoDateKst.toISOString().split('T')[0];

                // Find which Day (MON, TUE...) this date corresponds to in the current schedule
                const dayKey = Object.keys(daysMap).find(key => daysMap[key] === videoDateStr);

                if (dayKey) {
                    const eventsForKey = canonicalEvents.lookup.get(`${char.id}|${dayKey}`) || [];
                    const canonical = eventsForKey.find((event) => !event.video_url);

                    if (canonicalEvents.available && eventsForKey.length > 0) {
                        if (!canonical) continue;
                        const { error: updateError } = await supabase
                            .from('schedule_events')
                            .update({ video_url: video.url, updated_at: new Date().toISOString() })
                            .eq('id', canonical.id)
                            .eq('schedule_id', activeSchedule.id);
                        if (updateError) throw updateError;

                        // Keep the in-memory lookup current when multiple VODs
                        // are returned for the same member/day.
                        canonical.video_url = video.url;
                    } else {
                        // Legacy fallback for schedules not yet backfilled.
                        const { data: item } = await supabase
                            .from('schedule_items')
                            .select('id, video_url')
                            .eq('schedule_id', activeSchedule.id)
                            .eq('character_id', char.id)
                            .eq('day', dayKey)
                            .maybeSingle();
                        if (!item || item.video_url) continue;
                        const { error: updateError } = await supabase
                            .from('schedule_items')
                            .update({ video_url: video.url })
                            .eq('id', item.id);
                        if (updateError) throw updateError;
                    }

                    updates.push(`${char.name} - ${dayKey}: ${video.title}`);
                    updateCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            updated: updateCount,
            details: updates
        });

    } catch (error) {
        console.error('[Cron] Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
