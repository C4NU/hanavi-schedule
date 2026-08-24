/**
 * schedule_items → schedule_events 백필 스크립트 (PostgREST 직접 호출 — realtime 의존 없음)
 *
 * 변환 규칙 (docs/tech-docs/collab-domain-model.md §3):
 *  - type NOT LIKE 'collab%'  → 개인 이벤트 (멤버 1명)
 *      · time이 "12:00+19:00" 형태면 시간/내용 분할 → 복수 이벤트
 *  - type LIKE 'collab%'      → (schedule_id, day) 그룹당 합방 이벤트 1개
 *      · title  = 비어있지 않은 첫 content (HTML 태그 제거)
 *      · start  = 최소 시간, members = 그룹 전원
 *  - off / 빈 셀              → 스킵 (이벤트 없음 = 휴방 표현)
 *  - 메모                     → 원본 아이템이 매핑된 이벤트로 event_id 설정
 *
 * 사용:
 *   npx tsx scripts/backfill_events.ts            # dry-run (기록 없음, 대조표 출력)
 *   npx tsx scripts/backfill_events.ts --apply    # 실제 기록
 */
import fs from 'fs';
import path from 'path';

const loadEnv = () => {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
            const [key, ...rest] = line.split('=');
            if (key && rest.length && !process.env[key.trim()]) {
                process.env[key.trim()] = rest.join('=').trim().replace(/^['"](.*)['"]$/, '$1');
            }
        }
    }
};
loadEnv();

const APPLY = process.argv.includes('--apply');
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요');
    process.exit(1);
}

async function rest<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${URL}/rest/v1/${path}`, {
        ...init,
        headers: {
            apikey: KEY!,
            Authorization: `Bearer ${KEY!}`,
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`REST ${res.status} ${path}: ${body.slice(0, 200)}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : (null as unknown as T);
}

// ── 시간/내용 분할 (src/utils/time.ts와 동일 규칙) ──
function extractTimeParts(timeStr: string): string[] {
    if (!timeStr) return [];
    const m = Array.from(timeStr.matchAll(/(\d{1,2}:[0-5]\d)/g)).map((x) => x[1]);
    return m.length ? m : [timeStr];
}
function splitContentTopLevel(content: string): string[] {
    const parts: string[] = [];
    let cur = '', depth = 0;
    for (const ch of content) {
        if (ch === '<') depth++;
        else if (ch === '>') depth = Math.max(0, depth - 1);
        if (depth === 0 && ch === '+') { parts.push(cur); cur = ''; }
        else cur += ch;
    }
    parts.push(cur);
    return parts.map((p) => p.trim()).filter(Boolean);
}
function stripTags(html: string): string {
    return html.replace(/<[^>]*>?/gm, '').trim();
}
const toMinutes = (t: string): number | null => {
    const m = /^(\d{1,2}):([0-5]\d)$/.exec(t.trim());
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

interface ItemRow {
    id: string; schedule_id: string; character_id: string;
    day: string; time: string | null; content: string | null; type: string | null;
}
interface MemoRow { id: string; schedule_item_id: string; content: string }
interface EventDraft {
    schedule_id: string; day: string; start_time: string | null;
    title: string; type: string; members: string[]; sourceItemIds: string[];
}

async function main() {
    console.log(`== schedule_items → schedule_events 백필 (${APPLY ? 'APPLY' : 'DRY-RUN'}) ==`);

    const existingEvents = await rest<{ schedule_id: string }[]>('schedule_events?select=schedule_id');
    const doneSchedules = new Set(existingEvents.map((e) => e.schedule_id));
    if (doneSchedules.size > 0) {
        console.log(`이미 백필된 스케줄: ${doneSchedules.size}개 — 미처리 스케줄만 보완합니다`);
    }

    // 페이지네이션 (PostgREST 기본 1000행 제한 회피)
    const items: ItemRow[] = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
        const page = await rest<ItemRow[]>(
            `schedule_items?select=id,schedule_id,character_id,day,time,content,type&limit=${pageSize}&offset=${offset}`
        );
        items.push(...page);
        if (page.length < pageSize) break;
        offset += pageSize;
    }
    console.log(`원본 아이템: ${items.length}행`);

    // 미처리 스케줄만 대상 (이미 백필된 스케줄의 아이템 제외)
    const target = APPLY
        ? items.filter((it) => !doneSchedules.has(it.schedule_id))
        : items;
    const skippedDone = items.length - target.length;
    if (skippedDone > 0) console.log(`이미 백필된 스케줄 아이템 제외: ${skippedDone}행`);

    const events = new Map<string, EventDraft>();
    const itemToEvent = new Map<string, string>();
    let skippedOff = 0;

    for (const it of target) {
        if (it.type === 'off' || (!it.time && !it.content)) { skippedOff++; continue; }

        const isCollab = (it.type || '').startsWith('collab');
        const key = isCollab ? `collab|${it.schedule_id}|${it.day}` : `single|${it.id}`;

        let ev = events.get(key);
        if (!ev) {
            ev = { schedule_id: it.schedule_id, day: it.day, start_time: null, title: '', type: isCollab ? 'collab' : 'stream', members: [], sourceItemIds: [] };
            events.set(key, ev);
        }
        itemToEvent.set(it.id, key);

        if (isCollab) {
            if (!ev.members.includes(it.character_id)) ev.members.push(it.character_id);
            const title = stripTags(it.content || '');
            if (!ev.title && title) ev.title = title;
            const mins = toMinutes(it.time || '');
            if (mins !== null && (ev.start_time === null || (toMinutes(ev.start_time!) ?? 9999) > mins)) {
                ev.start_time = it.time;
            }
        } else {
            // ??:?? 같은 미확정 시간도 보존(start_time null) — 유효성 필터 제거
            const times = extractTimeParts(it.time || '');
            const parts = splitContentTopLevel(it.content || '');
            const contents = parts.length === times.length ? parts : null;
            times.forEach((time, idx) => {
                if (idx === 0) {
                    ev!.start_time = toMinutes(time) !== null ? time : null;
                    ev!.title = contents ? contents[0] : stripTags(it.content || '');
                    ev!.members = [it.character_id];
                    return;
                }
                const subKey = `single|${it.id}|${idx}`;
                events.set(subKey, {
                    schedule_id: it.schedule_id, day: it.day,
                    start_time: toMinutes(time) !== null ? time : null,
                    title: contents ? contents[idx] : '',
                    type: 'stream', members: [it.character_id], sourceItemIds: [it.id],
                });
                itemToEvent.set(`${it.id}#${idx}`, subKey);
            });
        }
        ev.sourceItemIds.push(it.id);
    }

    // 고스트 이벤트 제거: 시간·제목 모두 없는 무의미한 이벤트
    let ghosts = 0;
    for (const [key, ev] of events) {
        if (!ev.start_time && !ev.title) { events.delete(key); ghosts++; }
    }
    // 유니크 인덱스 (schedule_id, day, start_time, title) 기준 진행 중 중복 제거
    const seenKeys = new Set<string>();
    let dups = 0;
    for (const [key, ev] of events) {
        const uk = `${ev.schedule_id}|${ev.day}|${ev.start_time || ''}|${ev.title}`;
        if (seenKeys.has(uk)) { events.delete(key); dups++; }
        seenKeys.add(uk);
    }

    console.log('\n[요약]');
    console.log(`  스킵(off/빈셀): ${skippedOff}`);
    console.log(`  제거(고스트 ${ghosts}, 중복 ${dups})`);
    console.log(`  생성 이벤트: ${events.size}`);
    for (const e of events.values()) {
        if (e.type === 'collab') {
            console.log(`  - 합방 ${e.schedule_id.slice(0, 8)} ${e.day} ${e.start_time || '-'} [${e.members.length}명] "${e.title.slice(0, 24)}" ← ${e.sourceItemIds.length}행 통합`);
        }
    }
    const memos = await rest<MemoRow[]>('schedule_item_memos?select=id,schedule_item_id,content');
    console.log(`  이관 대상 메모: ${memos.length}`);

    if (!APPLY) {
        console.log('\n(dry-run 완료 — 실제 기록은 --apply)');
        return;
    }

    console.log('\n[기록 시작]');
    const keyToId = new Map<string, string>();
    let inserted = 0;
    for (const [key, ev] of events) {
        const insertedEvents = await rest<{ id: string }[]>(
            'schedule_events?select=id',
            {
                method: 'POST',
                body: JSON.stringify({
                    schedule_id: ev.schedule_id, day: ev.day,
                    start_time: toMinutes(ev.start_time || '') !== null ? ev.start_time : null,
                    title: ev.title, type: ev.type,
                }),
                headers: { Prefer: 'return=representation' },
            }
        );
        const eventId = insertedEvents[0].id;
        keyToId.set(key, eventId);
        inserted++;

        if (ev.members.length) {
            await rest('schedule_event_members', {
                method: 'POST',
                body: JSON.stringify(ev.members.map((cid) => ({ event_id: eventId, character_id: cid, role: 'member' }))),
                headers: { Prefer: 'return=minimal' },
            });
        }
    }
    console.log(`  이벤트 ${inserted}개 + 멤버 기록 완료`);

    let memoMoved = 0;
    for (const memo of memos) {
        const key = itemToEvent.get(memo.schedule_item_id);
        const eventId = key ? keyToId.get(key) : undefined;
        if (!eventId) continue;
        await rest(`schedule_item_memos?id=eq.${memo.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ event_id: eventId }),
            headers: { Prefer: 'return=minimal' },
        });
        memoMoved++;
    }
    console.log(`  메모 ${memoMoved}건 이관 완료`);
    console.log(`  미매핑 메모: ${memos.length - memoMoved}건 (스킵된 off/빈셀 아이템 소속 — 수동 확인)`);
    console.log('\n✅ 백필 완료');
}

main().catch((e) => { console.error(e); process.exit(1); });
