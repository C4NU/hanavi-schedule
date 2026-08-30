## v2.0.1 (Planned) - 이미지 저장 고도화
- [x] **기본 수정 완료 (2026-08-25, v2.0.1 배포)** — 16:10 고정(2880×1800 @2x) / 배지·패널 그라데이션 아티팩트 단색 치환 /
    멤버 셀 클론 cascade 불안정(classic blur+하단 이름) 인라인 확정 / 배경 테마 대응 / 정적 날짜 표시 /
    내보내기 폭 = 라이브 렌더링 폭(폰트 비례 매칭) / 내용 텍스트 16px 확대
- [ ] Safari(실기기) 내보내기 검증 — Chromium에서는 아바타·폰트 정상 렌더링 확인, Safari는 미검증
- [ ] classic 테마 내보내기 회귀 확인 — 16:10 스트레칭이 classic에도 적용되므로 v1.8.x 대비 비교
- [ ] 주간 통합 뷰(학생증 카드 포함) 내보내기 레이아웃 확인
- [ ] 멤버 8명+ 필터 케이스 — 행 압축(minmax(0,1fr)) 시 셀 내용 넘침 여부
- [x] 페이지 로드 시 간헐적 이미지 400 응답 — 허용된 실제 이미지 upstream의 실패 상태/비이미지 응답을 프록시에서 명시적으로 처리하고, 현재 운영 주차 아바타 6개를 로컬 API에서 `200 image/*`로 확인 (배포 후 Safari/실기기 재확인 필요)

## v1.10.0 (진행 중) - 합방 도메인 모델 운영 안정화
- [x] 2026-08-30 관리자 저장 RLS 오류 수정 — 브라우저 anon 클라이언트 직접 upsert 제거, 인증 관리자 API + service-role 저장으로 단일화 (`42501` 회귀 테스트 포함)
- [x] 2026-08-30 일요일 합방 팬아웃 수정 — 첫 멤버가 합방으로 저장하면 선택된 모든 멤버 셀에 동일 event ID/참가자를 한 번에 반영; 레거시 ID 없는 합방도 중복 없이 승격
- [x] 2026-08-30 `ScheduleGrid`/`WeeklyTimetable`/`PersonalScheduleModal`의 합방 판정 기준을 event ID 중심으로 정리하고, 서로 다른 일요일 합방 자동 병합을 제거
- [x] YouTube/Ci.me 다시보기 cron이 canonical `schedule_events.video_url`을 갱신하도록 전환(미백필 주차는 레거시 폴백)
- [x] 서로 다른 이벤트 ID의 동일 일시·제목 방송을 저장할 수 있도록 slot-wide unique index 제거 마이그레이션 추가 (`20260830_allow_distinct_schedule_events.sql`)
- [x] canonical part 단위 편집/삭제·인라인 합방 수정·재시도 안정 UUID·legacy collab 승격을 추가하고, 합방 후 개인 방송의 링크/시간/제목을 이벤트별로 보존
- [x] 관리자 멤버 필터와 무관하게 전체 활성 멤버로 신규 하나비 합방을 팬아웃하고, 주간 편집 클릭에 실제 요일을 전달
- [x] canonical 이벤트 관계 조회 실패는 legacy 화면만 유지하고 관리자 저장을 차단하는 fail-closed 상태를 도입
- [x] 관리자 이벤트/스케줄 URL 입력은 `https:` 스킴만 허용하고 이미지 프록시의 backslash redirect를 차단
- [x] 이벤트 upsert·멤버/게스트 교체·삭제를 `save_schedule_events` 트랜잭션 RPC로 묶음(잘못된 FK는 사전 검증 후 롤백)
- [x] canonical 이벤트 조회가 성공한 빈 그래프에서 활성 멤버의 frozen legacy 셀을 비우고, ID 없는 동일 합방 편집은 연속 멤버 run으로 범위를 제한
- [x] 내용 없는 `방송` 명시 변경을 placeholder와 구분해 빈 제목 stream 이벤트로 보존
- [x] **합방(collab) 이벤트 모델 구현(코드/테스트)** — 설계 기준: `docs/tech-docs/collab-domain-model.md`; 운영 배포·실제 관리자 세션 검증은 아래 게이트로 분리
    - 모든 방송을 schedule_events로 통일 (개인 = 멤버 1명인 이벤트)
    - 합방 = 이벤트 1개 + 참여 멤버 행 / 외부 합방 = 게스트 행
    - **합방 후 개인 방송** = 같은 날 복수 이벤트 (combined "12:00+19:00" 우회 폐지)
    - 백필: collab* 그룹 → 이벤트 1개(참여자 전원), 개인 아이템 → 이벤트, 메모 이관
    - 관리자: 하루 편집 시트 + 합방 만들기, 저장은 이벤트 단위 upsert (메모 FK 안정)
- [ ] 승인 대기 결정사항: 메모 통합 방침 / off 미생성 표현 / 멤버별 개별 시작시간 v1 생략 — 문서 §7
- [ ] **배포 blocker:** 운영 DB에 `20260830_add_schedule_event_category.sql` → `20260830_allow_distinct_schedule_events.sql` → `20260830_allow_event_memos.sql` → `20260830_save_schedule_events_transaction.sql`을 순서대로 적용하고, API가 요구하는 `category` 컬럼·메모 XOR 제약·RPC·unique index 상태를 원격에서 확인
- [ ] canonical 빈 그래프를 authoritative하게 취급하기 전에 `scripts/backfill_events.ts`를 dry-run/대조/`--apply` 순서로 실행하고 이벤트·멤버·메모 건수를 검증
- [ ] 배포 후 실제 관리자 세션으로 신규/기존 합방, 참가자 해제, 합방+개인 다방송, 멤버 필터, 저장 재시도를 수행하고 공개 화면·주간 뷰·개인 카드에서 event ID fan-out/삭제가 일치하는지 확인

## DB/인프라 정리 (합방 모델 선행 작업)
- [x] 레거시 파일 정리: googleSheets.ts, 미사용 의존성 4종, docker/, 중복 문서 폴더, supabase/.temp 추적 해제 (2026-08-21)
- [x] 운영 DB 대조 실시 — 결과는 `docs/tech-docs/db-schema-drift.md` (2026-08-21)
    - 🔴 `schedule_items.category` 누락 버그 수정 완료 (마이그레이션 + 저장/조회 매핑)
    - 레거시 테이블 3종 DROP 마이그레이션 작성 완료 → **운영 SQL Editor 실행 대기**
- [ ] 스키마 기준점 통합: 운영 DB가 기준(`db-schema-drift.md`). CLI push 쓰려면 `migration repair` 선행
- [ ] RLS 보강: `global_settings` insert/update가 전체 authenticated 허용인 점 `is_admin()`으로 축소
- [ ] `schedules.is_active` 활성 주차 유일성 제약 (partial unique index) 및 `start_date` 컬럼 도입 검토
- [ ] `day`/`type`/`time` CHECK 제약 추가, `schedule_item_memos.schedule_item_id` 인덱스

## 알림 후속 과제
- [ ] PWA `/sw.js`와 `/firebase-messaging-sw.js` 루트 스코프 경쟁 통합 (단일 서비스워커)

## v2.0.0 이후 후속
- [ ] 앱(Expo) v2 테마 동기화 — 웹 2.0.0이 LTS로 안정화된 후 신규 디자인 테마를 RN으로 포팅
    (MemberGrid/WeeklyTimetable RN 사본이 웹 컴포넌트와 분리되어 있어 수동 동기화 필요)

## 모바일 앱 (Expo) - 진행 중
- [x] 1차 골격 완성 (2026-08-23): **`~/Development/hanavi_app`** 형제 프로젝트로 생성.
    ⚠️ iOS 네이티브 빌드가 공백 경로를 못 다뤄 `Project Hanavi/hanavi_app` → `~/Development/hanavi_app`으로 이동함
    (expo-constants Pod 스크립트가 공백에서 경로 분리 — 이동 후 정상 빌드 확인)
    - Expo SDK 57 + RN 0.86 + TypeScript, vitest (`npm test`, `npx tsc --noEmit` 통과)
    - 이식 완료: `types/schedule.ts`, `utils/date.ts`·`utils/time.ts` (+단위 테스트 17건),
        `getScheduleFromSupabase` 읽기 전용 포팅(`src/lib/scheduleApi.ts`)
    - 주간 시간표 열람 화면: 웹 `WeeklyTimetable.tsx` RN 포팅 — 셀 n분열/합방 병합/겹침 분할 로직 동일 유지.
        DB HTML 컨텐츠는 RN에 HTML 렌더러가 없어 `utils/html.ts` stripHtml로 평문 표시(원본 데이터는 HTML 유지)
    - Supabase anon 직접 접근(RLS public 정책 의존). `.env.local` = 웹과 동일 프로젝트의 URL/anon key
- [x] 앱 이름 `hanavi.info` 확정, M0 탭 골격 완성 (2026-08-23): expo-router 전환 —
    5탭(시간표[기본]·프로필·노래책·커버곡·굿즈), 노래책/커버곡/굿즈는 PlaceholderScreen
- [x] M1 프로필 탭 완성 (2026-08-23): 그룹 카드(SNS 링크) + 멤버 리스트 → `member/[id]` 상세 화면
    - 그룹 SNS 링크: `global_settings`의 `group_link_*` 행 기반 (마이그레이션 불필요, Studio에서 추가)
    - 멤버 확장 컬럼(intro/height_cm/weight_kg): `supabase/migrations/20260823_add_member_profile_fields.sql` 작성 → **운영 SQL Editor 실행 대기**
    - 멤버 대표색 폴백: `hanavi_template/key_color.txt` 6종을 `src/theme/colors.ts`에 상수화
- [x] 탭 순서 확정 + 시간표 이중 뷰 (2026-08-23): 탭 순서 프로필/노래책/시간표(중앙·기본)/커버곡/굿즈.
    상단 ⚙️ 설정 모달로 뷰 전환 — 'weekly'(주간 통합) / 'member'(웹 ScheduleGrid member 뷰 모바일 포트:
    요일 칩 선택 → 멤버×단일 열, collab_hanavi 세로 병합, n분열, 휴방/준비중/다시보기·메모·카테고리 배지).
    선택값 AsyncStorage 영구 저장 (`useTimetableViewMode`)
- [x] 멤버별 뷰 원본 모바일 디자인 적용 + 프로필 학생증 (2026-08-23):
    MemberGrid를 웹 모바일 디자인으로 재작성(핑크 타이틀, 주간 네비게이션 ← 실제 주간 이동 fetch 연결,
    요일 헤더 pill, 아바타 카드 이름 오버레이, 좌우 플로팅 요일 버튼).
    StudentIDCard RN 이식(기본 HANAVI 고교 + 이리야 MAIVI 디자인, 시스템 폰트 대체) → 프로필 탭을 학생증 리스트로 교체.
- [ ] 운영 DB 실행: `20260823_add_member_profile_fields.sql` + group_link_* 시드 (실제 SNS URL 확인 후)
- [ ] Expo Router 도입 및 화면 확장 — 남은 탭: 노래책(music-book songs 스키마 이관), 커버곡(정의 확정 필요), 굿즈(권리 허가 후)
- [ ] 공유 로직 패키지화: 현재 웹에서 수동 복사 상태 — `utils/date·time`·타입 변경 시 양쪽 동기화 필수.
    장기적으로 `packages/domain` 등 npm workspace 또는 사설 패키지로 단일화
- [ ] 푸시: 웹은 FCM 유지, 모바일은 expo-notifications (delivery key 멱등성 공통 유지)
- [ ] Next.js API를 모바일 BFF로 전환 검토 (현재는 Supabase 직접 접근, mock 폴백 제거 후 stale 표시 방식)

## v1.8.0 & v1.8.1 (Planned) - 개인화 및 이미지 생성 고도화
- [ ] **개인화 기능**
    - [x] **개인 일정 카드 시스템 구현**: 멤버별로 필터링된 주간 스케줄 카드 렌더링.
    - [x] **디자인 테마 선택**: 학생증, 리스트, 그리드 테마 제공.
    - [x] **가로/세로 방향(Orientation) 다운로드 지원**: PNG 저장 시 가로(1000x562) 및 세로(562x1000) 모드 선택 지원.
    - [x] **내보내기 최적화**: 섀도우 렌더링 오류 수정 및 폰트 로드 타이밍 보장.

## v1.5.0 (Planned) - UI/UX 고도화 및 품질 개선
- [ ] **UI/UX 개선**
    - [x] `Toast UI` 도입: 스케줄 저장, 에러 발생 시 부드러운 알림 제공 (관리자 페이지 `alert` 대체 포함)
    - [x] 공통 모달 컴포넌트 고도화 (애니메이션 및 접근성 개선)
    - [x] **주간 시간표 뷰 도입**: '에브리타임' 스타일의 1주일치 통합 시간표 레이아웃 구현 (요일별 뷰와 전환 가능)
    - [x] **일요일 단체 합방 전용 레이아웃**: 일요일의 경우 6개 셀을 하나의 큰 통합 영역(Merged Block)으로 처리
- [ ] **성능 및 안정성**
    - [ ] YouTube API 할당량 최적화: 서버 측 캐싱 로직 강화
    - [ ] 에러 경계(Error Boundary) 설정을 통한 앱 안정성 확보

## v1.6.0 (Planned) - 기능 확장 및 커스터마이징
- [ ] **기능 확장**
    - [ ] 스케줄 코멘트/메모 기능: 멤버들의 라이브 중 언급된 일정 변동 사항을 사용자가 직접 해당 일정에 코멘트로 기록
    - [ ] 네이버 팬카페 링크 연동 및 자동 업로드 지원 탐색
- [ ] **기타**
    - [ ] 다크 모드(Dark Mode) 테마 스위처 추가 및 심미성 고도화
    - [x] **일일 방송 요약 알림**: 매일 아침 당일 전체 방송 일정을 요약하여 푸시 알림으로 전송
    - [x] 모바일 앱 알림 연동 기능 안정화

## v1.7.0 (Planned) - 운영 안정성 및 자동화
- [ ] **인프라 고도화**
    - [ ] DB 자동 백업 시스템 구축 (GitHub Actions + Supabase CLI)
    - [ ] 백업 데이터 외부 스토리지(S3 등) 연동 고려
    - [ ] 데이터베이스 복구(Restore) 프로세스 문서화

## raw
- 관리자 페이지 / 사용자 페이지 레이아웃 완전히 동일한지 확인 필요함

## 추후 계획 (Backlog)
- [ ] **씨미 다시보기 연동 및 데이터 자동 동기화**
    - 씨미(Ci.me) 플랫폼의 공식 API가 오픈되는 대로 연동
    - 기존 YouTube 다시보기 채널 연동 방식에 애드온(Add-on) 형태로 붙이거나 리팩토링 진행
    - 수동/자동 동기화 스케줄러 보강을 통한 누락 데이터 복구 자동화
