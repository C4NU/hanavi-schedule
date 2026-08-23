# 합방(collab) 도메인 모델 설계 v2 — 구현 계획 확정안

작성: 2026-08-21 (v1 설계 + 실측 데이터 반영, 구현 착수 전 최종안)
상태: **승인 대기**
근거: 운영 DB 실측 + 사용자 요구사항 (합방 후 개인 방송 케이스 추가)

---

## 1. 해결할 문제 (확정)

### 1-1. 합방의 물리적 복제 (사용자 지적)
현재 일요일 합방 `[3D] 하나비 여름소풍`의 DB 실제 상태:

| character_id | time | type | content |
|---|---|---|---|
| cherii | 14:00 | collab | `<b>[3D] 하나비 여름소풍</b>` ← 제목은 이 행만 |
| nemu | 12:00 | collab_hanavi | (빈값) |
| senah | 14:00 | collab_hanavi | (빈값) |
| mirai | 16:00 | collab_hanavi | (빈값) |
| aella | 18:00 | collab_hanavi | (빈값) |
| ruvi | 19:00 | collab_hanavi | (빈값) |

- "하나의 합방 이벤트"가 존재하지 않고 멤버 행 6개에 복제
- 미참여 멤버는 휴방 행 → 백엔드 관점에서 "그날 방송 없음"과 동일
- 참여자 목록·진행자·개별 시작시간 표현 불가

### 1-2. 합방 후 개인 방송 (신규 요구사항)
- 합방 끝나고 개인 방송을 하는 멤버가 있음 (예: 네무 — 합방 후 22:00 개인방송)
- 현재 `(schedule_id, character_id, day)` 유니크 제약으로 하루 1아이템 한계
  → `12:00+19:00` combined 문자열 우회 (이미 네무 수요일에서 발생)

### 1-3. 화면별 상이한 재조립 로직
ScheduleGrid / WeeklyTimetable / PersonalScheduleModal이 각기 다른 휴리스틱으로
합방을 추측 병합 — 회귀 온상 (AGENTS.md에도 경고 등재된 상태)

---

## 2. 데이터 모델 (확정)

**모든 방송(개인·합방)을 이벤트로 통일한다.** 개인 방송 = 멤버 1명인 이벤트.

```sql
-- 하루의 개별 방송 단위
create table schedule_events (
    id          uuid primary key default extensions.uuid_generate_v4(),
    schedule_id uuid not null references schedules(id) on delete cascade,
    day         text not null check (day in ('MON','TUE','WED','THU','FRI','SAT','SUN')),
    start_time  text check (start_time is null or start_time ~ '^\d{2}:\d{2}$'),
    title       text not null default '',
    type        text not null default 'stream'
                check (type in ('stream','off','collab','collab_external')),
    video_url   text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
create unique index on schedule_events (schedule_id, day, coalesce(start_time,''), title);

-- 참여 멤버 (내부 합방: 2명 이상, 개인: 1명)
create table schedule_event_members (
    event_id     uuid not null references schedule_events(id) on delete cascade,
    character_id text not null references characters(id) on delete cascade,
    role         text not null default 'member' check (role in ('host','member')),
    primary key (event_id, character_id)
);

-- 외부 게스트 (외부 합방용)
create table schedule_event_guests (
    id           uuid primary key default extensions.uuid_generate_v4(),
    event_id     uuid not null references schedule_events(id) on delete cascade,
    display_name text not null
);

-- 팬 메모: schedule_item_id → event_id로 이관
alter table schedule_item_memos
    rename column schedule_item_id to legacy_item_id;
alter table schedule_item_memos
    add column event_id uuid references schedule_events(id) on delete cascade;
```

### 타입 체계 (이번 주 관리자 5단계와 정합)
| type | 의미 | 판정 |
|---|---|---|
| `stream` | 개인 방송 | members 1명 |
| `off` | 휴방 (이벤트로 만들지 않고 미생성으로 표현也可能 — 아래 §5) | — |
| `collab` | 내부 합방 | members ≥ 2 |
| `collab_external` | 외부 합방 | guests ≥ 1 |

- `collab_hanavi`/`collab_maivi`/`collab_universe`는 **폐기** — "하나비 내부 합방"은
  그냥 `collab`(members가 하나비 멤버), 유니버스 합방도 `collab`+게스트로 표현
- 기존 데이터는 백필에서 자동 변환

### 핵심 표현력
| 케이스 | 모델링 |
|---|---|
| 일요일 합방 6명 | event(type=collab, 14:00) + members 6행 |
| 합방 후 개인 방송 (네무) | collab event + 별도 stream event(22:00, members=[nemu]) — **같은 날 복수 이벤트 자연 지원** |
| 외부인 합방 (슈퍼킹) | event(type=collab_external) + guests=[슈퍼킹] |
| 멤버별 시작시간 차이 | event.start_time = 대표값, 표시는 members 각각의 참여로 충분 (개별 시작시간 필요 시 members.start_time 컬럼 추가 — v1에선 생략) |

---

## 3. 마이그레이션 (기존 데이터 → 이벤트)

백필 순서 (스크립트 `scripts/backfill_events.ts`, dry-run 모드 필수):

```
1. schedule_items 전체 조회
2. type NOT LIKE 'collab%' 인 아이템:
   → 개인 이벤트 1개 생성 (members=[해당 캐릭터])
   → time이 "12:00+19:00" 형태면 extractTimeParts로 분할,
     content도 ' + ' 기준 분할 (utils/time.ts 재사용) → 복수 이벤트
3. type LIKE 'collab%' 인 아이템:
   → (schedule_id, day) 그룹핑 → 이벤트 1개
     title = 비어있지 않은 첫 content (HTML 태그 제거)
     start_time = 최소 시간
     members = 해당 그룹 전원 (role=member)
4. 메모 이관: legacy_item_id → 해당 이벤트의 event_id
   (합방 그룹이면 여러 아이템의 메모가 하나의 이벤트로 합쳐짐 — created_at 순 유지)
5. 검증: 이벤트 수 / 멤버 매핑 수 / 메모 수 원본 대조표 출력
```

- `schedule_items`는 **삭제하지 않고 보존** (읽기 폴백 + 롤백 보험)
- 검증 완료 후 별도 마이그레이션으로 freeze (트리거로 쓰기 차단)

---

## 4. 읽기/쓰기 경로

### 읽기: `getWeekEvents(scheduleId)` (src/utils/events.ts 신설)
```ts
{ events: Array<{ id, day, startTime, title, type, videoUrl,
                  members: [{ id, name, role, colorBg, colorBorder, avatarUrl }],
                  guests: [names],
                  memos: [...] }> }
```
- 3쿼리(events/members/guests) + Map 인덱싱 — N+1 없음
- 레거시 폴백: events가 비어있는 주차는 기존 schedule_items 경로 사용 (전환 기간)

### 쓰기: 이벤트 단위 upsert (저장 버튼 플로우 유지)
- 클라이언트가 이벤트 배열(신규는 클라이언트 생성 uuid)을 관리
- 저장 시 `POST /api/admin/events`에 전체 payload → 서버가 **id 기준 upsert + 없는 것 delete**
- id가 안정적이므로 메모 FK 깨지지 않음 ← 주 단위 delete+reinsert 금지의 이유

### API
- `GET /api/schedule?week=...` → 기존 응답에 `events` 필드 추가 (v2 병행 없이 확장)
- `POST /api/admin/events` { scheduleId, events[] } → upsert+delete, checkIsAdmin 기존 패턴

---

## 5. UI

### 관리자
- **셀(멤버×요일) 클릭 → "하루 편집 시트"**: 그 멤버의 그 날 이벤트 목록
  - 각 이벤트: 시간 입력 + 제목 + (타입 표시) + － 제거
  - ＋ 개인 방송 추가
  - **＋ 합방 만들기**: 요일 내 합방 이벤트 생성 (참여 멤버 체크리스트 + 게스트 이름 입력 + 시간/제목)
- combined 문자열("12:00+19:00")과 ＋분할 버튼 **폐지** — 실제 복수 이벤트로 대체
- 기존 "저장" 버튼: events 페이로드 일괄 전송

### 공개
- **멤버별 뷰**: 멤버의 하루 = 자기 이벤트들을 세로 스택으로 표시
  - 합방 이벤트: 참여 멤버들의 셀을 하나로 rowspan (eventId 기준 — 연속성 무관, 기존 휴리스틱 폐지)
  - 합방 후 개인 방송: 합방 블록 아래 개인 블록 추가 표시
- **주간 통합 뷰**: 이벤트를 시간 좌표에 배치, 합방은 eventId로 병합 (참여자 이름 표시)
- **개인 카드**: members에 본인 있을 때만 합방 표시 (무단 참여 버그 수정)
- **상세 시트**: 참여자 아바타 목록 + 게스트 표시 추가

---

## 6. 구현 단계 (예상 5~7일)

| # | 작업 | 검증 |
|---|---|---|
| 1 | 마이그레이션 3종 (테이블/메모 이관/RLS) — SQL Editor 병행 | 스키마 대조 |
| 2 | 백필 스크립트 (dry-run → 실행 → 대조표) | 건수 대조 |
| 3 | getWeekEvents + /api/schedule events 확장 | 기존 뷰 무변화 확인 |
| 4 | 공개 멤버별/주간통합 뷰 이벤트 렌더링 전환 | 스크린샷 비교 |
| 5 | 관리자 하루 편집 시트 + 합방 만들기 | 시나리오 테스트 |
| 6 | 저장 경로 → /api/admin/events | 메모 FK 안정성 |
| 7 | schedule_items freeze + 문서 정리 | — |

---

## 7. 승인 필요 사항

1. **타입 정리**: `collab_hanavi/maivi/universe` 폐기 → `collab`(내부)/`collab_external`(외부) 2원화. 유니버스 합방은 `collab`+게스트. (관리자 드롭다운은 이미 5단계로 정리됨 — 이벤트 타입은 4값)
2. **메모 통합**: 합방 이벤트에 여러 멤버 아이템의 메모가 하나로 합쳐지는 것 — OK?
3. **off 타입**: 휴방은 이벤트로 생성하지 않고 "이벤트 없음 = 휴방"으로 표현 (정기 휴방일은 characters.regular_holiday가 이미 담당) — 기존 off 아이템은 백필에서 스킵. OK?
4. **멤버별 개별 시작시간**: v1에선 생략 (대표 시간만 표시). 필요 시 v1.1에서 members.start_time 추가. OK?
