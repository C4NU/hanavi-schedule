# 합방(collab) 도메인 모델 설계 (v1.10.0)

작성: 2026-08-21 · 상태: 설계 승인 대기
근거: 운영 DB·localhost 실측 (스크린샷 및 PostgREST 조회)

---

## 1. 현재 문제 (실측)

같은 일요일 합방 `[3D] 하나비 여름소풍`이 DB에 이렇게 저장되어 있음:

| 멤버 | time | content | type |
|---|---|---|---|
| cherii | 14:00 | `<b>[3D] 하나비 여름소풍</b>` | collab_hanavi |
| senah | 14:00 | *(빈 값)* | collab_hanavi |
| nemu | 12:00 | *(빈 값)* | collab_hanavi |
| mirai | 16:00 | *(빈 값)* | collab_hanavi |
| aella | 18:00 | *(빈 값)* | collab_hanavi |
| ruvi | 19:00 | *(빈 값)* | collab_hanavi |

→ "어느 멤버들이 참여하는 **하나의** 합방인가"가 데이터에 존재하지 않음.
→ 제목도 참여자도 특정 셀에 우연히 의존.

### 화면별 상이한 재조립 로직 (회귀 온상)

- `ScheduleGrid.tsx:169-209` (멤버별): 멤버 정렬상 **연속된** `collab_hanavi` 셀만 rowspan.
  시간·내용 무시. 중간에 다른 타입 끼면 병합 분절. 표시 내용은 병합 시작 셀 몫.
- `WeeklyTimetable.tsx:36-38` (주간 통합): **같은 시간** + `type==='collab_hanavi'` 또는
  `content.includes('하나비 합방')`만 병합. → 멤버별 시간이 다르면 병합 실패
  (2026-08-21 실측: 일요일 합방이 주간 통합 뷰에서 흩어져 표시됨을 스크린샷으로 확인).
- `PersonalScheduleModal.tsx`: 본인 셀이 비면 그날 첫 단체 합방을 **참가 여부 무관하게** 가져옴.

### 표현 불가능한 케이스 (현재 모델의 한계)

1. 멤버 **일부**만 참여하는 합방 (예: 6명 중 3명)
2. **외부인**과 하는 합방 — 현재는 content 문자열에 때려박음
   (실측: `루비봐기'오디세이'인!!`, `슈퍼킹의_네무`, `네무습합+운향하는 날`)
3. 같은 날 **서로 다른** 합방 2개 — `(schedule_id, character_id, day)` 유니크 제약 때문에
   한 셀에 `12:00+19:00` 텍스트 병기로 우회 (실측: 수요일 네무 셀)
4. 멤버별 시작 시간이 다른 동일 합방 (실측: 위 표)
5. 진행자(host)와 참가자 구분

---

## 2. 도메인 요구사항

| # | 요구사항 | 실측 케이스 |
|---|---|---|
| R1 | 합방은 독립 개체(event)로 존재해야 한다 | 일요일 [3D] 여름소풍 |
| R2 | 참여 멤버를 명시한다 (부분 참여 가능) | 미래 케이스 예방 |
| R3 | 외부 게스트를 이름으로 표시한다 | 슈퍼킹, 오디세이, 운향 |
| R4 | 대표 시간과 멤버별 개별 시간을 분리한다 | 12/14/16/18/19 사례 |
| R5 | 같은 날 복수 이벤트를 지원한다 | 네무 12:00+19:00 |
| R6 | 진행자/참가자를 구분한다 | 합방 호스트 관례 |
| R7 | 기존 데이터는 읽기 호환을 유지한다 | 과거 주차 열람 |

---

## 3. 제안 데이터 모델

```
schedules (기존 유지)
   │ 1:N
schedule_events ──┬─ N:M ── characters (via schedule_event_members)
                  └─ 1:N ── schedule_event_guests
```

```sql
-- 개별 방송/합방 이벤트 (하루 단위)
create table schedule_events (
    id          uuid primary key default extensions.uuid_generate_v4(),
    schedule_id uuid not null references schedules(id) on delete cascade,
    day         text not null check (day in ('MON','TUE','WED','THU','FRI','SAT','SUN')),
    start_time  text check (start_time is null or start_time ~ '^\d{2}:\d{2}$'),
    title       text not null default '',
    type        text not null default 'stream'
                check (type in ('stream','off','collab','collab_maivi','collab_universe','collab_external')),
    video_url   text,
    category    text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);
-- 동일 이벤트 중복 방지: (schedule_id, day, start_time, title) unique

-- 참여 멤버
create table schedule_event_members (
    event_id     uuid not null references schedule_events(id) on delete cascade,
    character_id text not null references characters(id) on delete cascade,
    role         text not null default 'member' check (role in ('host','member')),
    start_time   text,  -- 멤버별 개별 시작시간 (null이면 이벤트 대표 시간 사용)
    primary key (event_id, character_id)
);

-- 외부 게스트
create table schedule_event_guests (
    id           uuid primary key default extensions.uuid_generate_v4(),
    event_id     uuid not null references schedule_events(id) on delete cascade,
    display_name text not null,
    avatar_url   text,
    platform_url text
);
```

설계 결정:

- **`type`은 'collab_hanavi'를 없애고 'collab'으로 통일.** 하나비 내부 합방 여부는
  더 이상 타입이 아니라 *참여자가 누구냐*로 판단한다 (members ≥ 2 → 내부 합방,
  guests > 0 → 외부 합방).
- **`start_time`은 nullable** — 시간 미정 합방 지원 (`??`로 입력하던 우회 폐지).
- **멤버별 `start_time` 오버라이드**는 선택 필드 — R4. 표시는 `COALESCE(member.start_time, event.start_time)`.

## 4. 읽기 호환 (R7)

`getScheduleFromSupabase`에 통합 뷰 레이어 추가:

```
getWeekView(scheduleId):
  events = SELECT events + members + guests (join, Map 인덱싱 — N+1 제거)
  legacy_items = SELECT schedule_items (기존)

  반환: CharacterSchedule[].schedule[day] 형태는 유지하되,
        각 셀에 { eventId?, participants?: [{id,name}], guests?: [names] } 첨부
```

- 레거시 `collab_hanavi`/`collab_*` items는 **읽을 때만** 기존 휴리스틱으로 이벤트처럼 조립.
- 신규/편집된 데이터부터 `schedule_events`에 기록.
- 백필 스크립트: 기존 items 중 type LIKE 'collab%'인 것을 (schedule_id, day)별 그룹핑 →
  이벤트 생성(members 전원 + role=member), 비어있지 않은 첫 content를 title로.
  ⚠️ 백필은 실행 전 건수 대조 검증 필수.

## 5. 화면 영향

공통 유틸 하나만 허용: `src/utils/events.ts` → `groupEventsByDay()`
세 화면은 이 함수의 출력만 렌더링 (병합 규칙 3중 복제 금지 — 회귀 방지).

| 화면 | 변화 |
|---|---|
| 멤버별 (ScheduleGrid) | 참여자 연속성 무시하고 eventId 기준 rowspan, 참여자 아바타 미니 표시 |
| 주간 통합 (WeeklyTimetable) | eventId 기준 병합 → 시간 달라도 하나의 블록, 참가자 이름 나열 |
| 개인 카드 (PersonalScheduleModal) | members에 본인 id 있을 때만 표시 (무단 참여 버그 수정) |
| 관리자 편집 | 셀 편집은 유지 + "합방 묶기" 액션 추가: 셀 선택 → 이벤트 생성 → 참여자 체크/게스트 이름 입력 |

클라이언트 하드코딩 제거 대상: 이리야 월~토 강제 휴방, 일요일 자동 바인딩 (v1.8.0 잔재).

## 6. API 영향

- `/api/schedule` 응답에 events 포함 (또는 `/api/schedule/v2` 병행 후 전환).
- 모바일 BFF 계획(backlog)과 동일 DTO 사용 — 앱이 이 모델을 그대로 소비.
- mock 폴백 패턴은 v2에서 제외 (stale 표시 방식).

## 7. 구현 단계 (예상: 5~8일)

1. 마이그레이션 3종 (events/members/guests) — SQL Editor 병행 실행 (db-schema-drift.md 규칙)
2. `getWeekView` 통합 조회 + 레거시 조립 (읽기 호환)
3. 백필 스크립트 + 건수 대조 검증
4. 공통 groupEventsByDay + WeeklyTimetable 전환 (주간 통합 먼저 — 현재 가장 깨진 화면)
5. ScheduleGrid / PersonalScheduleModal 전환
6. 관리자 "합방 묶기" UX
7. 저장 경로 전환 (items → events dual-write → items freeze)

## 8. 미결정 사항 (승인 필요)

- [ ] `collab_hanavi` 등 기존 type 값을 유지할지 ('collab'+참여자 판정으로 갈지) — §3 권안
- [ ] 백필 시 과거 주차까지 전부 변환할지, 최근 N주만 할지
- [ ] 관리자 편집 UX 범위 (v1.10.0에 묶기만? 게스트 관리 화면은 별도?)
