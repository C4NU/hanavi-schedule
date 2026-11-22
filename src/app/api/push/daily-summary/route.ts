import { NextResponse } from 'next/server';
import { getScheduleFromSupabase } from '@/utils/supabase';
import { sendMulticastNotificationOnce } from '@/lib/notifications';
import { splitScheduleItem } from '@/utils/time';
import { isCollaborationType } from '@/utils/events';
import { stripHtml } from '@/utils/text';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

function formatSummaryTime(time: string | null | undefined): string {
    return time && time !== '??:??' ? time : '시간 미정';
}

function isAuthorized(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const adminSecret = process.env.ADMIN_SECRET;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

    if (adminSecret && authHeader?.startsWith('Bearer ')) {
        const provided = Buffer.from(authHeader.slice(7));
        const expected = Buffer.from(adminSecret);
        if (provided.length === expected.length && timingSafeEqual(provided, expected)) return true;
    }

    return false;
}

export async function GET(request: Request) {
    try {
        if (!isAuthorized(request)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const todayName = dayNames[kstDate.getUTCDay()];

        const schedule = await getScheduleFromSupabase();
        if (!schedule) {
            return NextResponse.json({ error: 'No schedule found' }, { status: 404 });
        }

        const broadcasts: { time: string; name: string; content: string }[] = [];

        const seenEvents = new Set<string>();
        const memberNames = new Map(schedule.characters.map(({ id, name }) => [id, name]));
        schedule.characters.forEach(char => {
            splitScheduleItem(char.schedule[todayName]).forEach(item => {
                if (item.type === 'off' || item.placeholder || !item.content || item.content === '휴방') return;
                if (item.eventId && seenEvents.has(item.eventId)) return;
                if (item.eventId) seenEvents.add(item.eventId);
                const memberIds = item.eventMemberIds ?? [];
                const participants = memberIds.map(id => memberNames.get(id) || id);
                const hasSharedTime = isCollaborationType(item.type) && item.eventStartTime !== undefined;
                const time = formatSummaryTime(hasSharedTime ? item.eventStartTime : item.time);
                const joins = hasSharedTime ? memberIds.flatMap(id => {
                    const joinTime = item.memberStartTimes?.[id];
                    if (!joinTime || formatSummaryTime(joinTime) === time) return [];
                    const name = memberNames.get(id) || id;
                    return [joinTime === '??:??' ? `${name} 합류 시간 미정` : `${name} ${joinTime} 합류`];
                }) : [];
                const name = participants.length ? participants.join('·') : char.name;
                broadcasts.push({
                    time,
                    name: joins.length ? `${name} (${joins.join(', ')})` : name,
                    content: stripHtml(item.content),
                });
            });
        });

        broadcasts.sort((a, b) => a.time.localeCompare(b.time));

        if (broadcasts.length === 0) {
            return NextResponse.json({ message: 'No broadcasts for today. Skip notification.' });
        }

        const title = `📅 오늘의 방송 일정 (${todayName})`;
        let body = broadcasts.map(b => `- ${b.time} ${b.name}: ${b.content}`).join('\n');
        if (body.length > 200) body = body.substring(0, 197) + '...';

        const deliveryDate = kstDate.toISOString().slice(0, 10);
        const result = await sendMulticastNotificationOnce(
            `daily-summary-${deliveryDate}`,
            title,
            body,
            '/icon-192x192.png'
        );

        return NextResponse.json({ success: true, day: todayName, broadcastCount: broadcasts.length, fcmResult: result });

    } catch (error) {
        console.error('Daily summary notification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
