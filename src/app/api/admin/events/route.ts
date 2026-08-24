import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkIsAdmin } from '@/utils/supabase';

/**
 * 이벤트 모델 저장 (v1.10.0)
 * POST { scheduleId, events: [{ id?, day, startTime, title, type, memberIds, guests? }], deletedIds: [] }
 * - id 기준 upsert (메모 FK 안정), deletedIds는 삭제
 * - 멤버: 기존 삭제 후 재삽입 (단순화)
 * - schedule_items는 더 이상 쓰지 않는다 (freeze)
 */
const EventSchema = z.object({
    id: z.string().uuid().optional(),
    day: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/).nullable().optional(),
    title: z.string().max(300).default(''),
    type: z.enum(['stream', 'off', 'collab', 'collab_external']).default('stream'),
    memberIds: z.array(z.string()).default([]),
    guests: z.array(z.string().max(50)).default([]),
    videoUrl: z.string().url().nullable().optional(),
});

const BodySchema = z.object({
    scheduleId: z.string().uuid(),
    events: z.array(EventSchema).max(500),
    deletedIds: z.array(z.string().uuid()).default([]),
});

export async function POST(request: Request) {
    try {
        const rawBody = await request.json();
        const parseResult = BodySchema.safeParse(rawBody);
        if (!parseResult.success) {
            return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.flatten() }, { status: 400 });
        }
        const { scheduleId, events, deletedIds } = parseResult.data;

        // 1. 인증
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Missing token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
            global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. 권한 (관리자만)
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        const isAdmin = await checkIsAdmin(user.id, adminClient);
        if (!isAdmin) {
            console.warn(`Unauthorized events save attempt by user: ${user.id}`);
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // 3. 스케줄 소속 검증 (기존 이벤트가 다른 스케줄로 이동하는 것 방지)
        const keptIds = events.map((e) => e.id).filter((id): id is string => !!id);
        for (const id of keptIds) {
            const { data: ev } = await adminClient
                .from('schedule_events')
                .select('schedule_id')
                .eq('id', id)
                .single();
            if (!ev) continue; // 신규
            if (ev.schedule_id !== scheduleId) {
                return NextResponse.json({ error: `Event ${id} belongs to another schedule` }, { status: 400 });
            }
        }

        // 4. 삭제
        if (deletedIds.length) {
            const { error: delErr } = await adminClient
                .from('schedule_events')
                .delete()
                .in('id', deletedIds)
                .eq('schedule_id', scheduleId);
            if (delErr) throw new Error(`삭제 실패: ${delErr.message}`);
        }

        // 5. Upsert (멤버/게스트는 upsert 후 재구성)
        for (const ev of events) {
            const payload = {
                ...(ev.id ? { id: ev.id } : {}),
                schedule_id: scheduleId,
                day: ev.day,
                start_time: ev.startTime,
                title: ev.title,
                type: ev.type,
                video_url: ev.videoUrl ?? null,
                updated_at: new Date().toISOString(),
            };
            const { data: upserted, error: upErr } = await adminClient
                .from('schedule_events')
                .upsert(payload, { onConflict: 'id' })
                .select('id')
                .single();
            if (upErr) throw new Error(`이벤트 저장 실패: ${upErr.message}`);
            const eventId = upserted.id;

            // 멤버 재구성
            const { error: memDelErr } = await adminClient
                .from('schedule_event_members')
                .delete()
                .eq('event_id', eventId);
            if (memDelErr) throw new Error(`멤버 정리 실패: ${memDelErr.message}`);
            if (ev.memberIds.length) {
                const { error: memErr } = await adminClient
                    .from('schedule_event_members')
                    .insert(ev.memberIds.map((cid) => ({ event_id: eventId, character_id: cid, role: 'member' })));
                if (memErr) throw new Error(`멤버 저장 실패: ${memErr.message}`);
            }

            // 게스트 재구성
            const { error: gDelErr } = await adminClient
                .from('schedule_event_guests')
                .delete()
                .eq('event_id', eventId);
            if (gDelErr) throw new Error(`게스트 정리 실패: ${gDelErr.message}`);
            if (ev.guests.length) {
                const { error: gErr } = await adminClient
                    .from('schedule_event_guests')
                    .insert(ev.guests.map((name) => ({ event_id: eventId, display_name: name })));
                if (gErr) throw new Error(`게스트 저장 실패: ${gErr.message}`);
            }
        }

        return NextResponse.json({ success: true, upserted: events.length, deleted: deletedIds.length });
    } catch (error) {
        console.error('Events save error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
