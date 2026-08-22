## v1.10.0 (Planned) - 합방 도메인 모델 도입
- [ ] **합방(collab) 명시적 데이터 모델**
    - 현재 문제: 합방이 연결 관계가 아니라 화면에서 문자열/타입 휴리스틱으로 즉석 병합됨
        - 기본 주간표(`ScheduleGrid.tsx`): 멤버 정렬상 연속된 `collab_hanavi` 셀만 세로 병합
        - 주간통합스케줄(`WeeklyTimetable.tsx`): 같은 시각+같은 내용 또는 `collab_hanavi`만 병합 → **멤버 간 합방이 안 합쳐져 보이는 원인**
        - 개인 시간표(`PersonalScheduleModal.tsx`): 본인 일정이 비면 그날 첫 단체 합방을 참가 여부 무관하게 가져옴
    - 신규 테이블: `schedule_events` + `schedule_event_members`(참가자/role) + `schedule_event_guests`(외부 게스트)
    - 멤버 합방(internal) / 외부인 합방(external) 구분, 같은 날 여러 방송·동시간대 서로 다른 합방 지원
    - 기존 `collab_hanavi` 데이터는 읽을 때만 레거시 추론으로 호환, 신규 저장분부터 명시적 연결 사용
- [ ] **그룹화 로직 공통화**: 화면별로 복제된 합방 판정 규칙을 단일 유틸로 통합

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

## 모바일 앱 (Expo) - 진행 중
- [x] 1차 골격 완성 (2026-08-23): `Project Hanavi/hanavi_app` **형제 디렉토리** 생성 (기존 `apps/mobile` 모노레포 계획 → 레포 분리로 변경)
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