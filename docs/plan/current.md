# Current Progress (main branch)

## v2.0.2 진행 — 분할 셀 무조건 가로 배치 확정
- 증상: v2 데스크톱에서 다방송 2분할 셀이 세로로 쌓임 (사용자 보고, 1024~1500px 창 재현)
- 원인: `.splitCellStack > *`의 `min-width: 92px` — 2개 가로 배치에 190px 필요한데
    데스크톱 day 컬럼은 그리드 `minmax(120px, 1fr)`×7 구조상 창 ~1600px 미만에서 120~190px 수준 →
    v1.9.x(5f40d93)부터 데스크톱에선 항상 세로 줄바꿈 상태였던 것 (모바일 가로 복원 9a9a805와 무관)
- 확정 규칙 (사용자 지정): **세로 리스트 금지, 분할은 무조건 가로**
    - 1개: 기본 셀 / 2~3분할: `flex-wrap: nowrap`으로 화면 폭 무관 항상 한 줄 가로 (균등 분할)
    - 4분할 이상만 2열 그리드(2×N) — `:has(> :nth-child(4))`로 wrap 허용 + basis `calc(50% - 3px)`
      (⚠️ flex shorthand에 calc()가 적용되지 않아 longhand 사용)
    - 서브셀 시간 폰트: 2분할 classic 1rem / v2 1.1rem, 3분할 0.8rem / v2 0.9rem (추가 축소),
      4분할 그리드는 2분할과 동일(셀 폭 = 컬럼 절반)
    - v2 서브셀 패딩 7px 9px → 5px 6px (최소 컬럼 120px = 셀 57px에서 시간 클리핑 제거)
    - ScheduleGrid.tsx 서브셀 인라인 `flex: 1` 제거 — 인라인이 CSS basis 규칙을 덮어써
        4분할 그리드 전환이 안 되던 원인, flex 제어는 CSS로 일원화
- 검증: Playwright 실측 — 2분할(1512/1024/320px)·3분할(1512/1024/375px) 전부 1행 가로,
    4분할 2행 그리드, 시간 overflow 0. 극한 케이스(1024px 창 + 3분할, 셀 폭 36px)는 시간이
    셀 폭 물리 한계로 살짝 넘침 — 가로 배치 유지 우선. tsc 0 / lint 에러 0 / test 69 통과

## v2.0.1 완료 — 이미지 내보내기 수정 (develop → main 머지)
- 16:10 고정(2880×1800 @2x) / 내보내기 폰트 비례 라이브 매칭(폭 = 라이브 렌더링 폭) /
    멤버 셀·배지·패널 아티팩트 제거 / 내보내기 전용 내용 텍스트 16px 확대
- 잔여 검증 항목은 backlog v2.0.1 참조 (Safari 실기기, classic 회귀, 주간 뷰, 다멤버)

## v2.0.0 완료 — 디자인 테마 시스템 (develop → main 머지)
- 스펙: `docs/tech-docs/v2-design-theme.md`
- 테마 인프라(useScheduleTheme, classic/v2 공존, localStorage) / Member·Weekly 뷰 v2 스킨 /
    폰트 체계(Montserrat·Pretendard·ZEN SERIF·Cafe24 Ssurround, 라이센스 첨부) /
    멤버별 내용 색상(v2ContentColors) / 이미지 내보내기 v2 대응
- 후속: 이미지 저장 고도화는 **v2.0.1로 이관** (backlog 참조) — 앱 포팅은 2.0.0 LTS 안정화 이후

## v2.0.0 진행 중 — 디자인 테마 시스템 (신규 시간표 디자인)
- 스펙: `docs/tech-docs/v2-design-theme.md` (시안 분석 + 확정 결정사항)
- [x] 1단계: 테마 상태 인프라 — `useScheduleTheme` 훅(localStorage `hanavi_schedule_theme`, 기본값 v2) +
    page/admin 전달, 데스크톱 토글(뷰 토글 옆) + 모바일 메뉴 항목
- [x] 2단계: Member 뷰 v2 스킨 — WEEKLY SCHEDULE 배지/▶타이틀/짧은 날짜(`formatWeekRangeShort`),
    gradient 카드(colorBg→white), OFFLINE 회색 통일, 합방 핑크 통합셀(기존 rowspan 로직 유지),
    멤버 이름 배지 오버레이(--member-color), 푸터 캡션, 칩(메모/다시보기/카테고리) 셀에서 미표현
- [x] 3단계: Weekly 뷰(시간축) v2 스킨 — 투명 컨테이너, 핑크 요일 헤더/그리드라인, gradient 블록,
    합방 블록 핑크+흰 텍스트(collabBlock)
- [x] 4단계: 관리자 WYSIWYG — admin page가 같은 localStorage 키 공유, 편집 UI 유지 확인
- [x] 5단계: 검증 — tsc 0 / test 69 통과(formatWeekRangeShort 테스트 추가) / lint 에러 0 /
    Playwright 스크린샷(v2 member·weekly·mobile, classic 회귀 없음)
- 확정: 시간축 뷰 유지(테마 공존) / 빈내용=gradient 무텍스트 카드 / 합방=최상단 참여자 앵커 세로 통합 /
    반응형 프레임 유지 / 앱 포팅은 2.0.0 이후
- 비고: PNG 내보내기(data-exporting)는 v2에서 흰 배경 강제 유지(기존 규칙) — 핑크 배경 내보내기 필요 시 별도 과제
- 디자인 피드백 반영 (2026-08-25 2차):
    - `▸` 화살표와 내용 같은 줄 배치 — DB HTML 블록 래퍼와 무관하게 v2ContentRow(flex)로 분리,
        ::before 프리픽스 방식은 -webkit-box에서 줄이 분리되어 폐기
    - v2 컨테이너 자체 배경 투명 처리 — body 배경(#fff0f5)과 2중 레이어이므로 단일 캔버스로 통합
    - gridWrapper 769~1023px 구간 overflow-x: auto 추가 — 데스크톱 그리드(min-width 900px) 잘림 버그
        (기존부터 존재한 결함, v2 검증 중 발견)
- 디자인 피드백 반영 (2026-08-25 3차 — 레이아웃 확정안):
    - v2 컨테이너 max-width 해제(전체 폭), 페이지 배경 흰색(useScheduleTheme이 body bg 제어),
        그리드 영역에 좌상단 흰색→우하단 키컬러(#ffb6c1) 대각 그라데이션 패널(radius 20px)
    - 일요일 단체방송 셀: 흰색(상단)→키컬러(#ff8fab) 그라데이션 + 진한 핑크 텍스트(#ff4d88) —
        일반 셀의 역방향 그라데이션, weekly 뷰 합방 블록도 동일 적용
    - 헤더 재구조: 배지 1행 / ▶타이틀+날짜네비 2행, v2DateLabel 중복 제거(dateSelector 버튼으로 일원화),
        주 네비 chevron 원형 버튼 신설(.navBtn은 기존에 정의 없던 클래스였음), ▶ 아이콘 타이틀 세로 중앙정렬
- 디자인 피드백 반영 (2026-08-25 4차):
    - 🔴 푸터 캡션이 gridWrapper(그라데이션 패널) 내부에 삽입돼 있던 구조 버그 수정 — 패널 밖 컨테이너 직속으로 이동
        (데스크톱 문구 누락의 근본 원인: main-layout overflow:hidden 아래 뷰포트 밖으로 밀림)
    - 데스크톱 뷰포트 수납: ≥1024px에서 exportWrapper flex:1 + container height:100% 제약,
        v2 행 높이 계산 기준 260px→340px 상향 (헤더 2행+푸터+패널 패딩 반영) → 그리드 내부 스크롤 + 문구 항상 표시
    - 🔴 모바일 "색상 탈출" 버그: v2 .off 규칙의 opacity:1이 모바일 스와이프 뷰의 비활성 요일 숨김
        (.scheduleCell opacity:0)을 깨서 타 요일 OFFLINE 셀이 +30px 오프셋으로 패널 밖까지 렌더링됨.
        opacity 상쇄를 min-width:769px 미디어 쿼리로 분리해 해결
    - 모바일 좌/우 요일 네비 버튼 3초 무조작 자동 숨김 (navBtnsVisible 상태 + pokeNavButtons,
        요일 변경/뷰 전환/마운트 시 재표시, navBtnHidden opacity:0 + pointer-events:none)
- 타이포그래피 적용 (2026-08-25 5차):
    - Montserrat (next/font/google, 300/600/800): 시간 800 Extrabold / 날짜 버튼 600 Semibold /
        그리드 영역 기본(요일 헤더·OFFLINE) 300 Light
    - Pretendard (next/font/local 가변 45-920): 타이틀 300 Light / 일정 내용 700 Bold / 멤버 이름 배지
        (Montserrat 한글 글리프 없음 → 이름은 Pretendard로 통일)
    - ⚠️ Pretendard는 Google Fonts 미수록 — 공식 저장소(orioncactus/pretendard v1.3.9)에서
        PretendardVariable.woff2 셀프호스팅 (src/app/fonts/)
    - 라이센스 첨부: src/app/fonts/OFL-Montserrat.txt, OFL-Pretendard.txt (둘 다 SIL OFL 1.1)
    - CSS 변수 --font-montserrat / --font-pretendard를 body에 주입, v2 스코프에서만 적용 (classic은 Inter 유지)
- 디자인 피드백 반영 (2026-08-25 6차):
    - 요일 헤더(MON~SUN)·코너 ✱ weight 300→600, 푸터 캡션 Montserrat→ZEN SERIF 600
    - ZEN SERIF 추가 (ODDATELIER/OA Entertainment 배포, Regular 단일) — 멤버 이름 배지·WEEKLY SCHEDULE
        배지·푸터 캡션. 출처/저작권: src/app/fonts/ZEN-SERIF-LICENSE.txt
        (⚠️ 명시적 라이센스 문서 없음 — 배포 페이지 약관 추종, 변경 시 재검토)
    - 멤버별 일정 내용 텍스트 색상 (검정→시안 색): cherii #896E23 / nemu #507AD4 / senah #A8603D /
        mirai #8441A5 / aella #6F6E7A — src/data/v2ContentColors.ts 매핑, 미등록 멤버는 colorBorder 폴백.
        루비(ruvi)는 시안 확정 후 추가 예정. 합방 셀은 진한 핑크(#ff4d88) 고정
    - 뷰 전환 토글(멤버별/주간 통합/스킨) v2에서 날짜 선택기와 동일한 화이트 엠보싱 필 디자인 적용
        (active=핑크-50 배지, inactive=gray-400, classic은 기존 유지)
- 디자인 피드백 반영 (2026-08-25 7차):
    - 일정 내용 폰트 → Cafe24 Ssurround (Cafe24 배포, woff 셀프호스팅 408KB, 라이센스 노트:
        src/app/fonts/CAFE24-SSURROUND-LICENSE.txt). 자체 굵기가 있어 15px 가시성 양호 —
        크기 조정/ Cafe24 Air 대체 불필요 판정 (사용자 확인 전)
    - 🔴 이미지 저장(v2) 3종 수정:
        1) 배경 #fff0f5 하드코딩 → data-theme 판별로 v2=#ffffff / classic=#fff0f5
        2) 인터랙션 요소(주 네비·날짜 선택기)가 내보내기에서 깨지던 것 → dateNav 숨김 +
            v2ExportDate(정적 날짜 텍스트) 표시로 대체
        3) v2ExportDate를 CSS 클래스 스타일링으로 표시하면 modern-screenshot의 스타일 인라이닝이
            clamp/vw+변수 조합을 깨서 대형 세리프 아티팩트 발생 → 훅에서 클론에 px 인라인 스타일로 직접 제어
        4) 16:10 고정 (4400×2750 @2x = 2200×1375):
            - 컨테이너에 height 1375px 확정 (minHeight는 콘텐츠가 더 높으면 무시됨)
            - gridWrapper min-height:0 + overflow:hidden (flex 자식이 콘텐츠 높이 이하로 수축 못 하는 것 해제)
            - viewContainer/grid height 100% + gridTemplateRows `auto repeat(N, minmax(0,1fr))` — 행이 높이를 채움
            - 클론 padding 0 !important — 기존 [data-exporting] exportWrapper padding 20px !important 규칂 상쇄
        5) 그라데이션/그림자 아티팩트(배지 스트릭·패널 밴딩·셀 그림자) → 내보내기에서 단색/무효화 인라인 치환
            (v2Badge 단색 #f472a6, gridWrapper 단색 #ffe9f0, 셀 boxShadow none)
        6) 멤버 셀 클론 cascade 불안정(classic blur+하단 이름으로 렌더링) → blurLayer 숨김 +
            nameOverlay/nameText v2 위치·색상 인라인 확정 (--member-color는 charCell 인라인에서 읽음)
        7) 🔴 근본 원인 발견 — 기존 `[data-exporting]` CSS 블록이 classic 스킨을 !important로 강제
            (width 2200px 고정 / padding 20px / nameOverlay 하단중앙 / blurLayer 강제 / charCell 90px 고정) →
            classic 전용 스코핑(`div[data-theme="classic"]`)으로 분리, v2는 라이브 CSS 그대로 렌더링
        8) 내보내기 폭을 고정 2200px → **라이브 렌더링 폭**(getBoundingClientRect, 최소 1200)으로 변경 —
            폰트 크기·레이아웃이 라이브와 동일 비례. 16:10은 exportContainer height = 폭/1.6 + 
            클론/컨테이너 height 100% 체인으로 확정 (2880×1800 @2x 검증)
    - 콘텐츠 폰트 크기 0.9rem→1rem→0.875rem(14px) 조정 (사용자 피드백) +
        ▸ 화살표 첫 줄 중앙 정렬 — v2ContentRow 행 font-size/line-height 동기화 방식
        (화살표 0.75em×1.8 = 콘텐츠 1.35 라인박스와 동일, 크기 변화에도 정렬 유지)

## v1.10.0 진행 중 — 합방 도메인 모델 전환 (개발 완료, 운영 검증 대기)
- [x] 1단계: schedule_events/members/guests 테이블 + 메모 event_id + RLS 마이그레이션 (SQL Editor 실행 완료)
- [x] 2단계: 백필 완료 — 989 이벤트 (PostgREST 1000행 제한 이슈는 페이지네이션+complement 모드로 해결)
- [x] 3단계: 읽기 경로 — getScheduleFromSupabase가 events 반환, applyEventsToCells로 셀 파생
    - 합방: 참여자 전원 셀에 동일 이벤트 복제(eventId 공유) → 기존 rowspan/병합 코드 무변경 동작
    - 합방 후 개인 방송: combined 병합 → 기존 분할 렌더링 재사용
- [x] 4단계: 공개 뷰 전환 확인 (멤버별/주간통합 스크린샷 검증)
- [x] 5단계: 관리자 — 다방송 편집 시트(드래프트 방식), 합방 참여자 체크리스트
- [x] 6단계: 저장 경로 — POST /api/admin/events (id 기준 upsert + deletedIds 삭제, 메모 FK 안정)
- [ ] 7단계: 운영 확인 후 schedule_items freeze SQL 실행 (파일 준비됨: 20260824_freeze_schedule_items.sql)
- [ ] 배포: main 푸시 시 프로덕션 반영

## v1.9.x 완료된 작업 (패치)
- [x] feat: 셀 UX 고도화 2차 — 상세 시트·칩 재배치·주간 뷰 가독성
    - 열람 모드 셀 클릭/터치 → 중앙 시트(멤버 아바타·시간·내용·메모·다시보기 버튼) 표시
        - 기존 동작(링크 즉시 열기/메모 팝오버 직행)을 시트 내 버튼으로 통합
    - 공개 셀: 댓글 칩을 하단에서 시간 행으로 이동, 시간 행 아래 디바이더, 본문 여유공간 확대
    - 관리자: (+)(－)(링크) 버튼이 시간 입력과 항상 한 줄 유지 (flex basis 수정)
    - 주간 통합 뷰: "??:??"/빈 내용 셀도 칸 차지 — 좌표는 멤버 기본 방송 시간(defaultTime) 폴백,
        블록 내 멤버 이름 폰트 9px→13px(모바일 11px) 확대
- [x] feat: 다방송 셀 n분열 및 합방 병합 고도화 (`bc3a4c6`)
    - "12:00+19:00" combined 셀을 시간대별 n분열 — 2~3개 가로 배치, 4개 이상 2열 그리드
    - 주간 통합 뷰: collab* 타입은 멤버별 시작 시간이 달라도 하루 1블록 병합("합방 N인"), 다방송 누락 복구
    - 관리자 모드 동일 분열(WYSIWYG) + ＋분할/－병합 버튼 — 편집 시 combined 문자열 자동 재조합
    - `utils/time.ts` split/join 헬퍼 일원화, 단위 테스트 15건
- [x] fix: `schedule_items.category` 컬럼 누락 복구 (운영 DB 대조 발견)
    - 운영 DB에 컬럼이 없어 관리자 카테고리 칩 저장·씨미 다시보기 카테고리 동기화가 실패하던 문제
    - 마이그레이션 추가 + 저장(`saveScheduleToSupabase`)·조회(`getScheduleFromSupabase`) 매핑 보강
    - 레거시 테이블(songs/subscriptions/user_fcm_tokens) DROP 마이그레이션 작성
    - 운영 DB 실측 기록: `docs/tech-docs/db-schema-drift.md`
- [x] chore: 레거시 정리 — googleSheets.ts, 미사용 의존성 4종, docker/, 중복 문서 폴더, 셋업 가이드 갱신
- [x] fix: 관리자 입력 안정화 및 보안 흐름 강화 (`4ff7d71`)
    - 관리자 셀 입력 지연(IME 조합) 개선을 위한 `BufferedInput` 도입 및 마크다운 에디터 안정화
    - cron 인증, 이미지 프록시, admin 클라이언트 보안, characters RLS 회귀 테스트 추가
- [x] fix: 관리자 로그인 폼 자동완성(autofill) 대응 및 마크다운 툴바 위치 보정 (`ea026b5`)
    - `resolveLoginCredentials` 유틸 분리로 autofill 시 폼 값 누락 문제 해결
- [x] fix: 잘못된 스케줄 시간값 거부 및 의존성 업데이트 (`be423e3`)
    - `utils/time.ts` 시간 검증 강화, 주간 통합 뷰 비정상 시간 표시 방지
- [x] fix: 푸시 알림 중복 발송 방지 (`a57c8a5`, 브랜치 `codex/fix-duplicate-notifications`)
    - 포그라운드 FCM 리스너 단일 등록 및 unmount cleanup (재마운트 시 누적되던 문제 수정)
    - Firestore 문서 ID(SHA-256 해시)가 아닌 실제 FCM 토큰 필드로 발송하도록 수정
    - 날짜 기반 원자적 발송 키(`notification_deliveries`)로 일일 cron 중복 발송 차단 (멱등성 확보)
    - Vercel Cron을 단일 스케줄러로 확정 (GitHub Actions 이중 스케줄 제거)

## v1.9.0 완료된 작업
- [x] feat: 주간 통합 시간표 디자인 리뉴얼 및 학생증 7종 카드 더미 배치
    - 데스크톱: 좌측 시간표 너비 최적화(flex-1), 우측 7종 학생증 카드 더미에 좌/우 지그재그 오프셋(translateX) 및 겹침 마진 완화(-110px)를 통한 시각적 가독성 개선
    - 모바일: 시간표 하단에 가로 스크롤 카드 스택을 배치하고, 상/하 지그재그 오프셋(translateY)과 겹침 마진 완화(-190px)를 제공하여 리듬감 있는 레이아웃 구현
    - 공통 학생증 컴포넌트(StudentIDCard) 추출 및 리팩토링 진행
    - 이리야(iriya) 전용 MAIVI 블랙/베이지 학생증 스펙 구현 (Cinzel 헤더, ID No. 배지, Unit 명세, Caveat 필기체 서명 및 May Girls 워터마크 구현) 및 세부 항목에 하나비 영문 세리프 폰트(Libre Caslon Display) 일원화 적용
    - CSS Custom Properties를 활용하여 지그재그 오프셋 및 반응형 해상도별 스케일과 기울기 애니메이션 연동 처리

## v1.8.1 완료된 작업
- [x] feat: 개인 스케줄 다운로드 PNG 이미지 가로/세로 방향(Orientation) 선택 기능 구현
    - 가로형(1000x562) 및 세로형(562x1000) 지원
    - 테마별 세로모드(Portrait) 구조(flex-col) 및 시간표 셀 높이 최적화
    - 이미지 방향 토글 제어 UI 탑재
    - 세로모드 디자인 1, 2, 3 전체에 캐릭터 이름, SCHEDULE 배지, 주간 일정 텍스트를 전면 제거하고, 대형 **"HANAVI"** 타이포와 그 아래 날짜 배지를 가로 중앙 정렬(`items-center justify-center`)하여 상단 헤더 감성 레이아웃 일원화 및 여백 고도화
    - 세로모드 디자인 1 학생증 카드의 스케일 축소(scale-[0.72]) 및 wrapper(w-[267px] h-[172px])의 `right-0 top-1` 밀착으로 우측 잘림 방지 및 시간표 선 정렬 맞춤, 상단 높이를 h-[185px]로 축소해 위로 배치
    - 디자인 2, 3 세로모드 상단 좌측의 텍스트 영역을 `h-[240px]` 내에서 중앙 정렬 배치하여 우측 프로필 카드와 상하단 높이를 완벽하게 일치
    - 디자인 3 가로/세로 그리드 스케줄 요일 카드에 고정 높이 적용(월~토: h-[74px]/h-[86px], 일: h-[42px]/h-[50px] py-0)하여 텍스트가 비어 있거나 짧아도 그리드 상자의 높이가 대칭적으로 균일하게 일치하도록 구현

## v1.8.0 완료된 작업
- [x] admin: 관리자 페이지 시간표 셀 하단 레이아웃 개선 (카테고리 태그 및 방송 타입 2분할)
- [x] feat: 개인별 일정 시스템 구현 및 이미지 다운로드 기능 추가
    - 디자인 1: 학생증 + 에타 시간표 (10:00 ~ 24:00) 테마 (Libre Caslon Display 웹폰트 적용, 1줄 중앙정렬 및 입학일 추가)
    - 디자인 2: 파스텔 리스트 테마 (모서리 잔상 방지 및 섀도우 렌더링 결함 수정)
    - 디자인 3: 파스텔 그리드 테마 (배지 및 행 그림자 잔상 제거)
    - 이미지 다운로드 시 그림자/필터 리셋 헬퍼(stripShadowsAndFilters) 적용으로 PNG 화질 및 안정성 극대화
    - 이리야(iriya) 월~토 휴방 강제 적용 및 일요일 단체 합방 멤버 간 자동 바인딩 로직 구현
- [x] docs: 씨미 VOD 누락 동기화 기능 백로그 기록 및 개발 완료 문서 갱신

## v1.7.0 완료된 작업
- [x] feat: 씨미(Ci.me) 플랫폼 연동 및 프로필 사진 자동 동기화 기능 구현
- [x] feat: 씨미 다시보기(VOD) 링크 및 카테고리 자동 업데이트 구현 (스크래핑 고도화)
- [x] ui: 시간표 셀 내 방송 카테고리 태그 및 하단 레이아웃 개선 (높이 최적화)
- [x] admin: 관리자 모드에서 씨미 VOD 수동 동기화 도구 접근성 개선
- [x] docs: 씨미 VOD 자동화 기술 문서 작성


현재 브랜치에서 진행 중이거나 완료된 작업을 기록합니다.

## v1.6.0 완료된 작업
- [x] feat: 스케줄별 실시간 제보(댓글형 메모) 기능 구현
- [x] feat: 네이버 팬카페 바로가기 링크 연동 (사이드바/모바일 메뉴)
- [x] db: `schedule_item_memos` 테이블 신설 및 RLS 보안 정책 적용

## v1.5.0 완료된 작업
- [x] docs: 코드 리뷰 보고서 저장 및 백로그/루틴 문서화 업데이트
- [x] feat: 일요일 단체 합방을 위한 전용 통합 레이아웃(그리드 span 및 주간 통합 뷰 머지) 구현
- [x] feat: 알림 시스템 통합 및 일일 방송 요약 알림 기능 구현
- [x] cleanup: 레거시 `google_apps_script.js` 제거 및 FCM 푸시 통합 안정화
- [x] feat: 주간 통합 시간표 뷰 도입 (에브리타임 스타일)
- [x] ui: Toast UI(sonner) 도입 및 에러 피드백 강화
... (생략)
