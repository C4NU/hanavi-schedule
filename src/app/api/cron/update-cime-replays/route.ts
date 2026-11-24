import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStartDateFromRange } from '@/utils/date';
import { readCimeReplays } from '@/utils/cimeReplay';
import type { ReplayCandidate } from '@/types/replay';
import { isValidCanonicalEvent, normalizeEventType } from '@/utils/events';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const koreanDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', dateStyle: 'short' });

function buildDaysMap(weekRange: string): Record<string, string> {
    const [year, month, day] = koreanDate.format(new Date()).split('-').map(Number);
    const sDate = getStartDateFromRange(weekRange, new Date(year, month - 1, day));
    const map: Record<string, string> = {};
    days.forEach((d, i) => {
        const date = new Date(sDate.getTime());
        date.setDate(sDate.getDate() + i);
        map[d] = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
            .map(part => String(part).padStart(2, '0')).join('-');
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
    title?: string | null;
    video_url: string | null;
    category: string | null;
}

interface Character {
    id: string;
    name: string;
    cime_url: string | null;
    chzzk_url: string | null;
    status?: string | null;
}

interface UpdateResult {
    detail: string;
    candidate: ReplayCandidate;
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
        .select('id, schedule_id, day, type, title, video_url, category')
        .in('schedule_id', scheduleIds);
    if (eventError) {
        const legacyEventQuery = await supabase
            .from('schedule_events')
            .select('id, schedule_id, day, type, title, video_url')
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
    allSchedules: Schedule[],
    dryRun: boolean,
    plannedLegacyItems: Set<string>,
): Promise<UpdateResult[]> {
    let handle: string | undefined;
    if (char.cime_url) {
        const profile = new URL(char.cime_url);
        const path = profile.pathname.match(/^\/@([^/]+)\/?$/);
        if (profile.origin !== 'https://ci.me' || !path) throw new Error('씨미 채널 주소를 확인해 주세요.');
        handle = decodeURIComponent(path[1]);
    } else if (char.chzzk_url && /^[\p{L}\p{N}_.-]+$/u.test(char.chzzk_url)) {
        handle = char.chzzk_url;
    }
    if (!handle) return [];

    const results: UpdateResult[] = [];
    const vodPath = `https://ci.me/@${encodeURIComponent(handle)}/vods`;
    const response = await fetch(vodPath, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`씨미 응답 HTTP ${response.status}`);

    const replays = readCimeReplays(await response.text()).map(replay => ({
        ...replay,
        // 새벽 6시 전 시작한 방송은 전날 일정에 연결한다.
        date: koreanDate.format(new Date(replay.broadcastAt - 6 * 60 * 60 * 1000)),
    }));
    const replayCountByDate = new Map<string, number>();
    for (const { date } of replays) replayCountByDate.set(date, (replayCountByDate.get(date) ?? 0) + 1);

    for (const replay of replays) {
        const url = `${vodPath}/${replay.id}`;
        const { category } = replay;
        const uniqueReplay = replayCountByDate.get(replay.date) === 1;
        for (const sched of allSchedules) {
            const dayKey = Object.keys(sched.daysMap).find(key => sched.daysMap[key] === replay.date);
            if (!dayKey) continue;

            const candidate = (scheduleTitle: string | null | undefined, updates: { video_url?: string; category?: string }): UpdateResult => ({
                detail: `${dayKey} in ${sched.week_range}: ${url} (${category || 'N/A'})`,
                candidate: {
                    member: char.name,
                    date: replay.date,
                    scheduleTitle,
                    videoTitle: replay.title,
                    url,
                    changes: [...(updates.video_url ? ['다시보기 링크'] : []), ...(updates.category ? [`카테고리 · ${updates.category}`] : [])],
                },
            });
            const eventsForKey = sched.canonicalEvents.get(`${char.id}|${dayKey}`) || [];
            if (sched.canonicalEventsAvailable && eventsForKey.length > 0) {
                const streams = eventsForKey.filter(event => normalizeEventType(event.type) !== 'off');
                const linked = streams.find(event => event.video_url === url);
                const canonical = linked ?? (uniqueReplay && streams.length === 1 ? streams[0] : undefined);
                if (!canonical || (canonical.video_url && canonical.video_url !== url)) break;
                const updates: { video_url?: string; category?: string } = {};
                if (!canonical.video_url) updates.video_url = url;
                if (!canonical.category && category) updates.category = category;
                if (Object.keys(updates).length === 0) break;
                if (!dryRun) {
                    const { error: updateError } = await supabase
                        .from('schedule_events')
                        .update({ ...updates, updated_at: new Date().toISOString() })
                        .eq('id', canonical.id)
                        .eq('schedule_id', sched.id);
                    if (updateError) throw updateError;
                }
                if (updates.video_url) canonical.video_url = updates.video_url;
                if (updates.category) canonical.category = updates.category;
                results.push(candidate(canonical.title, updates));
            } else {
                const { data: item, error: itemError } = await supabase
                    .from('schedule_items')
                    .select('id, video_url, category, type, time, content')
                    .eq('schedule_id', sched.id)
                    .eq('character_id', char.id)
                    .eq('day', dayKey)
                    .maybeSingle();

                if (itemError) throw itemError;
                if (!item || item.type === 'off' || plannedLegacyItems.has(item.id)) break;
                if (item.video_url !== url && (!uniqueReplay || item.time?.includes('+'))) break;
                const updates: { video_url?: string; category?: string } = {};
                if (!item.video_url) updates.video_url = url;
                if (!item.category && category && (!item.video_url || item.video_url === url)) {
                    updates.category = category;
                }
                if (Object.keys(updates).length === 0) break;
                if (dryRun) {
                    plannedLegacyItems.add(item.id);
                } else {
                    const { error: updateError } = await supabase
                        .from('schedule_items')
                        .update(updates)
                        .eq('id', item.id);
                    if (updateError) throw updateError;
                }
                results.push(candidate(item.content, updates));
            }
            break;
        }
    }

    return results;
}

async function runUpdate(request: Request) {
    const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';
    try {
        const { data: rawSchedules, error: schedulesError } = await supabase
            .from('schedules')
            .select('id, week_range')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(5);
        if (schedulesError) throw schedulesError;
        if (!rawSchedules?.length) {
            return NextResponse.json({ success: true, dryRun, updated: 0, candidates: dryRun ? 0 : undefined, preview: dryRun ? [] : undefined });
        }

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

        const { data: memberRows, error: charactersError } = await supabase
            .from('characters')
            .select('id, name, cime_url, chzzk_url, status');
        if (charactersError) throw charactersError;

        const characters = (memberRows ?? []).filter(char => char.status !== 'graduated');

        // Parallel fetch per character
        const plannedLegacyItems = new Set<string>();
        const settled = await Promise.allSettled(
            characters.map(char => processCharacter(char, allSchedules, dryRun, plannedLegacyItems))
        );

        const updates: UpdateResult[] = [];
        const failedChannels: string[] = [];
        settled.forEach((result, i) => {
            if (result.status === 'fulfilled') {
                updates.push(...result.value);
            } else {
                console.error(`[CIME Cron] ${characters[i].name} 조회 실패:`, result.reason);
                failedChannels.push(characters[i].name);
            }
        });

        return NextResponse.json({
            success: failedChannels.length === 0,
            dryRun,
            updated: dryRun ? 0 : updates.length,
            candidates: dryRun ? updates.length : undefined,
            details: updates.map(({ detail }) => detail),
            preview: dryRun ? updates.map(({ candidate }) => candidate).sort((a, b) => b.date.localeCompare(a.date)) : undefined,
            failedChannels,
            error: failedChannels.length ? `씨미 처리 실패: ${failedChannels.join(', ')}` : undefined,
        }, { status: failedChannels.length ? 502 : 200 });

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

    return runUpdate(request);
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

    return runUpdate(request);
}
