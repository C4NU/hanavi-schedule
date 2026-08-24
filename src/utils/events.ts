/**
 * 이벤트 모델 (v1.10.0) — events ↔ cells 파생 유틸
 *
 * eventsToCells: schedule_events → 기존 셀 형식(ScheduleItem) 파생
 *   - 개인 이벤트: 해당 멤버의 셀 1개
 *   - 합방 이벤트: 참여 멤버 전원의 셀에 동일 이벤트 복제 (eventId 공유)
 *   - 멤버의 하루 복수 이벤트: combined 문자열("12:00+19:00") 병합
 *   → 기존 뷰/편집 코드(분할 렌더링, 시트)가 무변경으로 동작한다
 *
 * cellsToEvents: 편집된 셀 → 저장용 이벤트 배열 (역파싱)
 *   - eventId 보유 셀: 기존 이벤트 업데이트 (합방은 참여자 전원 셀이 동일 이벤트 참조 → 1회만)
 *   - eventId 없는 신규 셀: 신규 이벤트
 *   - 빈 셀(시간·내용 없음): 이벤트 삭제 대상
 */
import { CharacterSchedule, ScheduleItem, WeekEvent } from '@/types/schedule';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/**
 * 이벤트 배열로부터 멤버별 셀(schedule[day])을 파생한다.
 * 이벤트가 없는 요일은 기존 값을 유지하기 위해 original 셀을 전달받아 병합한다.
 */
export function applyEventsToCells(
    characters: CharacterSchedule[],
    events: WeekEvent[]
): void {
    // 멤버×요일 → 이벤트 목록 (합방 우선, 이후 시간순)
    const byMemberDay = new Map<string, WeekEvent[]>();
    for (const ev of events) {
        for (const cid of ev.memberIds || []) {
            const key = `${cid}|${ev.day}`;
            if (!byMemberDay.has(key)) byMemberDay.set(key, []);
            byMemberDay.get(key)!.push(ev);
        }
    }

    for (const char of characters) {
        for (const day of DAYS) {
            const key = `${char.id}|${day}`;
            const evs = (byMemberDay.get(key) || [])
                .slice()
                .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'));
            const cell = char.schedule[day];
            if (!cell) continue;

            if (evs.length === 0) {
                // 이벤트 없음 = 휴방/빈 셀
                cell.eventId = undefined;
                cell.time = '';
                cell.content = '';
                cell.type = 'off';
                cell.memos = undefined;
                continue;
            }

            const primary = evs[0];
            cell.eventId = primary.id;
            cell.time = primary.startTime || '';
            cell.content = primary.title || '';
            cell.type = primary.type === 'off' ? 'off' : primary.type;
            cell.videoUrl = primary.videoUrl;
            cell.eventMemberIds = primary.memberIds;
            cell.memos = primary.memos;

            if (evs.length > 1) {
                // 복수 이벤트: combined 문자열 병합 (기존 분할 렌더링 재사용)
                cell.time = evs.map((e) => e.startTime || '??:??').join('+');
                cell.content = evs
                    .map((e) => e.title || '(제목 미정)')
                    .join(' + ');
            }
        }
    }
}

export interface CellEventDraft {
    id?: string; // 기존 이벤트 id (업데이트), 없으면 신규
    day: string;
    startTime: string | null;
    title: string;
    type: string;
    memberIds: string[];
    videoUrl?: string;
}

/**
 * 편집된 셀들 → 저장용 이벤트 드래프트 배열 (역파싱)
 *
 * - eventId 셀: 같은 eventId는 한 번만 수집 (합방 = 참여자 전원 셀이 동일 참조)
 *   · 참여자 = 셀들의 eventMemberIds 합집합 (시트에서 참여자 편집 반영)
 * - eventId 없는 셀: 신규 이벤트 (개인 = 해당 멤버 1명)
 * - 시간 combined("12:00+19:00") → 시간별 복수 이벤트 분할
 * - 빈 셀: 수집하지 않음 (저장 시 해당 이벤트 삭제 처리용 deletedIds와 함께 반환)
 */
export function cellsToEvents(
    characters: CharacterSchedule[]
): { events: CellEventDraft[]; deletedIds: string[]; keptEventIds: string[] } {
    const events = new Map<string, CellEventDraft>();
    const keptEventIds = new Set<string>();
    const deletedIds: string[] = [];
    const seenDeleted = new Set<string>();

    for (const char of characters) {
        for (const day of DAYS) {
            const cell = char.schedule[day];
            if (!cell) continue;

            const hasContent = (cell.time || '').trim() !== '' || (cell.content || '').trim() !== '';

            // 기존 이벤트 참조 셀: 존재 기록 (삭제 판정용)
            if (cell.eventId) keptEventIds.add(cell.eventId);

            if (!hasContent) {
                // 빈 셀 = 이벤트 없음(휴방/삭제)
                if (cell.eventId && !seenDeleted.has(cell.eventId)) {
                    deletedIds.push(cell.eventId);
                    seenDeleted.add(cell.eventId);
                }
                continue;
            }

            const times = (cell.time || '').split('+').map((t) => t.trim()).filter(Boolean);
            const contentParts = (cell.content || '').split(' + ').map((p) => p.trim()).filter(Boolean);
            const count = Math.max(times.length, 1);
            const isCollabType = (cell.type || 'stream').startsWith('collab');

            for (let i = 0; i < count; i++) {
                const startTime = toValidTime(times[i] ?? '') ? times[i] ?? null : times.length === 1 && i === 0 ? (toValidTime(cell.time || '') ? cell.time : null) : null;
                const title = contentParts[i] ?? (i === 0 ? (cell.content || '').trim() : '');

                if (cell.eventId && cell.eventMemberIds?.length) {
                    // 기존 이벤트 (합방/개인) — 첫 조각만 이벤트 갱신 담당
                    if (i === 0) {
                        const existing = events.get(cell.eventId);
                        if (existing) {
                            // 참여자 합집합 유지
                            for (const m of cell.eventMemberIds || []) {
                                if (!existing.memberIds.includes(m)) existing.memberIds.push(m);
                            }
                            existing.startTime = startTime;
                            existing.title = title;
                        } else {
                            events.set(cell.eventId, {
                                id: cell.eventId, day, startTime, title,
                                type: isCollabType && (cell.eventMemberIds.length > 1) ? 'collab' : (cell.type || 'stream'),
                                memberIds: [...(cell.eventMemberIds || [])],
                                videoUrl: cell.videoUrl,
                            });
                        }
                        keptEventIds.add(cell.eventId);
                    }
                    // i > 0 조각: combined 추가 방송 → 신규 개인 이벤트
                    else {
                        const newId = `new-${char.id}-${day}-${i}`;
                        events.set(newId, {
                            id: newId, day, startTime, title,
                            type: 'stream', memberIds: [char.id],
                        });
                    }
                } else {
                    // 신규 이벤트 (개인)
                    const newId = `new-${char.id}-${day}-${i}`;
                    events.set(newId, {
                        id: newId, day, startTime, title,
                        type: isCollabType ? (cell.type || 'stream') : 'stream',
                        memberIds: isCollabType ? [char.id] : [char.id],
                        videoUrl: cell.videoUrl,
                    });
                }
            }
        }
    }

    return { events: [...events.values()], deletedIds, keptEventIds: [...keptEventIds] };
}

function toValidTime(t: string): boolean {
    return /^(\d{1,2}):([0-5]\d)$/.test(t.trim());
}
