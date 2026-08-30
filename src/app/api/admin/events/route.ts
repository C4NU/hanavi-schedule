import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { checkIsAdmin } from '@/utils/supabase';

const httpsUrl = z.string().url().refine((value) => {
    try {
        return new URL(value).protocol === 'https:';
    } catch {
        return false;
    }
}, { message: 'Only HTTPS URLs are allowed' });

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
    memberIds: z.array(z.string().min(1).max(80)).max(100).default([]).transform((ids) => [...new Set(ids)]),
    guests: z.array(z.string().trim().min(1).max(50)).max(50).default([]).transform((guests) => [...new Set(guests)]),
    videoUrl: httpsUrl.nullable().optional(),
    category: z.string().trim().max(100).nullable().optional(),
}).superRefine((event, ctx) => {
    if (event.type === 'collab' && event.memberIds.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memberIds'], message: 'Internal collaborations require at least two members' });
    }
    if (event.type === 'collab_external' && event.memberIds.length < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memberIds'], message: 'External collaborations require at least one member' });
    }
    if (event.type === 'stream' && event.memberIds.length !== 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['memberIds'], message: 'Personal streams require exactly one member' });
    }
});

const BodySchema = z.object({
    scheduleId: z.string().uuid(),
    events: z.array(EventSchema).max(500),
    deletedIds: z.array(z.string().uuid()).default([]),
});

function normalizeStartTime(value: string | null | undefined): string | null {
    if (!value) return null;
    const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
    if (!match) return null;
    const hour = Number(match[1]);
    return hour <= 29 ? `${hour.toString().padStart(2, '0')}:${match[2]}` : null;
}

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

        // The RPC validates foreign keys and performs delete/upsert/member/
        // guest replacement in one database transaction. This prevents a
        // later member or guest failure from leaving a partially saved draft.
        const { data: result, error: saveError } = await adminClient.rpc('save_schedule_events', {
            p_schedule_id: scheduleId,
            p_events: events.map((event) => ({
                ...event,
                startTime: normalizeStartTime(event.startTime),
                category: event.category ?? null,
            })),
            p_deleted_ids: deletedIds,
        });
        if (saveError) {
            console.error('Events transaction failed:', saveError);
            const status = saveError.code === '22023' ? 400 : 500;
            return NextResponse.json({ error: status === 400 ? 'Invalid event references' : 'Internal server error' }, { status });
        }

        return NextResponse.json({ success: true, ...(result || {}), upserted: events.length, deleted: deletedIds.length });
    } catch (error) {
        console.error('Events save error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
