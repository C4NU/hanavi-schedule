import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStartDateFromRange } from '@/utils/date';
import { isValidCanonicalEvent, normalizeEventType } from '@/utils/events';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function buildDaysMap(weekRange: string): Record<string, string> {
    const sDate = getStartDateFromRange(weekRange);
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
    canonicalEventsAvailable: boolean;
    canonicalEvents: Map<string, CanonicalEvent[]>;
}

interface CanonicalEvent {
    id: string;
    schedule_id: string;
    day: string;
    type?: string;
    video_url: string | null;
    category: string | null;
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

interface CanonicalLoadResult {
    availableScheduleIds: Set<string>;
    eventsBySchedule: Map<string, Map<string, CanonicalEvent[]>>;
}

async function loadCanonicalEvents(scheduleIds: string[]): Promise<CanonicalLoadResult> {
    const result = new Map<string, Map<string, CanonicalEvent[]>>();
    if (scheduleIds.length === 0) return { availableScheduleIds: new Set(), eventsBySchedule: result };

    let { data: eventRows, error: eventError } = await supabase
        .from('schedule_events')
        .select('id, schedule_id, day, type, video_url, category')
        .in('schedule_id', scheduleIds);
    if (eventError) {
        const legacyEventQuery = await supabase
            .from('schedule_events')
            .select('id, schedule_id, day, type, video_url')
            .in('schedule_id', scheduleIds);
        if (!legacyEventQuery.error) {
            eventRows = (legacyEventQuery.data || []).map((row) => ({ ...row, category: null }));
            eventError = null;
        }
    }
    if (eventError) {
        console.warn('[CIME Cron] Canonical events unavailable; using legacy schedule items:', eventError.message);
        return { availableScheduleIds: new Set(), eventsBySchedule: result };
    }

    const availableScheduleIds = new Set(scheduleIds);
    if (!eventRows?.length) return { availableScheduleIds, eventsBySchedule: result };

    const eventIds = eventRows.map((event: CanonicalEvent) => event.id);
    const { data: memberRows, error: memberError } = await supabase
        .from('schedule_event_members')
        .select('event_id, character_id')
        .in('event_id', eventIds);
    if (memberError) {
        console.warn('[CIME Cron] Canonical event members unavailable; using legacy schedule items:', memberError.message);
        return { availableScheduleIds: new Set(), eventsBySchedule: result };
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
        console.warn('[CIME Cron] Canonical event membership is invalid; using legacy schedule items');
        return { availableScheduleIds: new Set(), eventsBySchedule: result };
    }

    const eventsById = new Map(eventRows.map((event: CanonicalEvent) => [event.id, event]));
    (memberRows || []).forEach((member: { event_id: string; character_id: string }) => {
        const event = eventsById.get(member.event_id);
        if (!event) return;
        const scheduleEvents = result.get(event.schedule_id) || new Map<string, CanonicalEvent[]>();
        const key = `${member.character_id}|${event.day}`;
        const events = scheduleEvents.get(key) || [];
        events.push(event);
        scheduleEvents.set(key, events);
        result.set(event.schedule_id, scheduleEvents);
    });
    return { availableScheduleIds, eventsBySchedule: result };
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

            const eventsForKey = sched.canonicalEvents.get(`${char.id}|${dayKey}`) || [];
            const canonical = eventsForKey.find((event) => !event.video_url || !event.category);

            if (sched.canonicalEventsAvailable && eventsForKey.length > 0) {
                if (!canonical) continue;
                const updates: { video_url?: string; category?: string } = {};
                if (!canonical.video_url) updates.video_url = url;
                if (!canonical.category && category) updates.category = category;
                if (Object.keys(updates).length === 0) continue;
                const { error: updateError } = await supabase
                    .from('schedule_events')
                    .update({ ...updates, updated_at: new Date().toISOString() })
                    .eq('id', canonical.id)
                    .eq('schedule_id', sched.id);
                if (updateError) throw updateError;
                if (updates.video_url) canonical.video_url = updates.video_url;
                if (updates.category) canonical.category = updates.category;
                results.push({ name: char.name, detail: `${dayKey} in ${sched.week_range}: ${url} (${category || 'N/A'})` });
            } else {
                const { data: item } = await supabase
                    .from('schedule_items')
                    .select('id, video_url, category')
                    .eq('schedule_id', sched.id)
                    .eq('character_id', char.id)
                    .eq('day', dayKey)
                    .maybeSingle();

                if (item && (!item.video_url || !item.category)) {
                    const { error: updateError } = await supabase
                        .from('schedule_items')
                        .update({
                            video_url: url,
                            category: category || item.category
                        })
                        .eq('id', item.id);
                    if (updateError) throw updateError;
                    results.push({ name: char.name, detail: `${dayKey} in ${sched.week_range}: ${url} (${category || 'N/A'})` });
                }
            }
            break;
        }
    }

    return results;
}

async function runUpdate() {
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

        const baseSchedules: Omit<Schedule, 'canonicalEventsAvailable' | 'canonicalEvents'>[] = (rawSchedules ?? []).map(s => ({
            ...s,
            daysMap: buildDaysMap(s.week_range)
        }));
        const canonicalBySchedule = await loadCanonicalEvents(baseSchedules.map((schedule) => schedule.id));
        const allSchedules: Schedule[] = baseSchedules.map((schedule) => ({
            ...schedule,
            canonicalEventsAvailable: canonicalBySchedule.availableScheduleIds.has(schedule.id),
            canonicalEvents: canonicalBySchedule.eventsBySchedule.get(schedule.id) || new Map(),
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

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return runUpdate();
}

export async function POST(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (role?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return runUpdate();
}
