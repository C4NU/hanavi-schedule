import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { createClient } from '@supabase/supabase-js';
import type { WeeklySchedule } from '@/types/schedule';

const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const WEEK = /^\d{2}\.\d{2} - \d{2}\.\d{2}$/;

type MemoTarget = { kind: 'event' | 'legacy'; id: string };
export type MobileMemoInput = { week: string; requestId: string; target: MemoTarget; content: string };

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseMobileMemo(value: unknown): MobileMemoInput | null {
    if (!isObject(value) || !isObject(value.target)) return null;
    const { week, requestId, target, content } = value;
    if (typeof week !== 'string' || !WEEK.test(week) || typeof requestId !== 'string' || !UUID.test(requestId)
        || (target.kind !== 'event' && target.kind !== 'legacy') || typeof target.id !== 'string' || !UUID.test(target.id)
        || typeof content !== 'string') return null;
    const normalized = content.trim();
    if (!normalized || Array.from(normalized).length > 100 || /[\u0000-\u001f\u007f]/.test(normalized)) return null;
    return { week, requestId, target: { kind: target.kind, id: target.id }, content: normalized };
}

export function isPublicMemoTarget(schedule: WeeklySchedule, { kind, id }: MemoTarget): boolean {
    return schedule.characters.some(({ schedule: days }) => Object.values(days).some((item) => {
        if (kind === 'legacy') return item.id === id && !item.eventId && !item.parts?.length && item.type !== 'off';
        if (item.parts?.length) return item.parts.some((part) => part.id === id && (part.type ?? item.type) !== 'off');
        return item.eventId === id && item.type !== 'off';
    }));
}

export async function submitPublicMobileMemo(input: MobileMemoInput, request: Request, scheduleId: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Vercel replaces this header at ingress. Never trust a caller-supplied fallback.
    const remote = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
    const address = process.env.VERCEL ? (remote && isIP(remote) ? remote : null) : 'local';
    if (!url || !key || !address) throw new Error('Memo storage unavailable');
    const requester = createHmac('sha256', key).update('mobile-memo-v1:').update(address).digest('hex');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.rpc('submit_mobile_schedule_memo', {
        p_request_id: input.requestId, p_requester: requester,
        p_kind: input.target.kind, p_target_id: input.target.id, p_content: input.content, p_schedule_id: scheduleId,
    });
    if (error || !isObject(data) || typeof data.outcome !== 'string') throw new Error('Memo storage unavailable');
    if (data.outcome !== 'created' && data.outcome !== 'existing') return { outcome: data.outcome };
    const targetField = input.target.kind === 'event' ? 'event_id' : 'schedule_item_id';
    const memo = data.memo;
    if (!isObject(memo) || typeof memo.id !== 'string' || !UUID.test(memo.id)
        || typeof memo.created_at !== 'string' || !Number.isFinite(Date.parse(memo.created_at))
        || typeof memo.content !== 'string' || memo[targetField] !== input.target.id.toLowerCase()) {
        throw new Error('Memo storage returned invalid data');
    }
    return { outcome: data.outcome, memo: {
        id: memo.id, created_at: memo.created_at, content: memo.content,
        [targetField]: input.target.id.toLowerCase(),
    } };
}
