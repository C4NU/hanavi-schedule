# AGENTS.md — 하나비 스케줄 (hanavi_schedule)

## 최소 규칙

> workprint MCP가 붙지 않은 세션에서도 지킨다. 나머지 공통 규칙은 workprint 전체 문서 「에이전트 공통 규칙」이고, `get_agents_rules`로 받는다.

- 설명·문서·커밋 메시지는 한국어로 쓴다. 기술 용어와 코드 식별자는 원문 그대로. 뜻을 더하지 않는 수식어를 쓰지 않는다.
- 커밋 메시지: `<타입>: <설명>` — feat · fix · refactor · docs · test · chore · perf · ci.
- 기존 uncommitted 변경을 지우거나 되돌리지 않는다. 커밋·푸시는 요청받았을 때만.
- 시크릿을 코드에 적지 않는다. 환경변수 또는 커밋 제외 파일을 쓴다.
- 끝내기 전에 이 저장소의 빌드·테스트 명령으로 확인한다(아래 절에 있으면 그것을 쓴다).

이 파일에는 **프로젝트 고유 정보만** 적는다.

---

## 프로젝트 개요

하나비 버추얼 아이돌의 주간 스케줄을 보여주는 반응형 웹/PWA.

- **프레임워크**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **데이터**: Supabase (Postgres + RLS) — 멤버/스케줄/메모/권한
- **푸시**: Firebase FCM — 토큰·발송 기록은 Firestore (`fcm_tokens`, `notification_deliveries`)
- **배포**: Vercel (Cron: 일일 요약 알림 09:00 KST, 다시보기 갱신)
- **사용자**: 팬(비로그인 열람) / 멤버 계정 / admin 계정 — Supabase Auth

## 명령어

```bash
npm run dev      # 개발 서버 (--webpack 플래그 필수)
npm run build    # 프로덕션 빌드 (--webpack)
npm test         # vitest 전체
npm run lint     # eslint
```

검증 기준: `tsc --noEmit` 오류 0, `npm test` 전부 통과, `npm run lint` 에러 0(warning 허용).

## 구조 지도

| 경로 | 내용 |
|---|---|
| `src/app/api/` | 라우트 핸들러 — schedule, admin/schedule, push/*, cron/*, proxy/image |
| `src/components/` | UI — `ScheduleGrid`(기본 주간표), `WeeklyTimetable`(주간 통합), `PersonalScheduleModal`(개인 카드) |
| `src/hooks/useAdminAuth.ts` | 관리자 인증 (Supabase Auth, `@hanavi.internal` 이메일 변환 로그인) |
| `src/utils/supabase.ts` | DB 접근 핵심 — 조회/저장/멤버 CRUD |
| `src/lib/notifications.ts` | FCM 발송 (멱등 키 `notification_deliveries`) |
| `supabase/` | SQL — `migrations/`가 기준, `setup_full.sql`/`schema.sql`은 불일치 존재 |

## 프로젝트 규칙 (상위 규칙에 추가)

- **문서**: 할 일은 보드 `HNS`, 설계·함정·결정은 HNS 프로젝트 문서(상위 제품 HAN).
- **시간대**: 서비스 기준 KST, Vercel 서버는 UTC. 날짜 문자열은 `toISOString()` 대신 명시적 조립(`getMonday` 등 `src/utils/date.ts` 활용). cron 라우트의 연말 경계 버그(backlog 참조) 재발 주의.
- **합방(collab)**: 현재 화면별 휴리스틱 병합 상태(`ScheduleGrid`/`WeeklyTimetable`/`PersonalScheduleModal` 규칙 상이). v1.10.0 `schedule_events` 모델 계획은 backlog 참조 — 수정 시 세 곳을 함께 보지 않으면 회귀 발생.
- **DB 스키마 변경**: `supabase/migrations/`에 타임스탬프 파일로 추가. 기존 SQL 덤프 파일들과 불일치가 있으므로 운영 DB가 기준.
- **권한 검증**: API 라우트는 `checkIsAdmin`(서비스 롤 클라이언트) + RLS 이중 확인 패턴 유지. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용, 클라이언트 번들에 `NEXT_PUBLIC_` 외 시크릿 노출 금지.
- **알림**: 발송은 반드시 `sendMulticastNotificationOnce`(멱등 키) 또한 포그라운드 리스너 중복 등록 금지 — 과거 중복 알림 버그 원인.
- **렌더링**: DB에서 온 HTML 컨텐츠는 `DOMPurify.sanitize` 없이 `dangerouslySetInnerHTML` 금지.
- **WYSIWYG**: 관리자 편집 화면과 공개 화면은 동일한 렌더링 파이프라인을 공유한다(셀 n분열 등). 관리자 전용 요소를 추가할 때도 공개 뷰와 시각적 구조를 일치시킨다.
- **다방송 셀**: 하루 복수 방송은 combined 문자열(`시간 '+', 내용 ' + '`)로 저장 — 분해/재조합은 반드시 `utils/time.ts`의 split/join 헬퍼를 통해서만. 파싱 규칙을 화면별로 재구현하지 않는다.
- **목데이터 폴백**: `/api/schedule`은 장애 시 503 반환 (mock 반환 금지 — 고정 멤버 목록이라 관리자 추가 멤버가 누락되는 버그 원인). 클라이언트가 localStorage 캐시로 폴백.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 작업 보드 (workprint.)

> 절 버전 2026-11-08. 이 파일의 저장소 전용 규칙이 workprint 규칙보다 앞선다.

- 공통 규칙(말하는 법·일하는 법·코드·Git·언어)은 workprint 전체 문서 「에이전트 공통 규칙」이다. 세션을 시작하면 `get_agents_rules`로 읽고 따른다.
- 이 저장소의 보드 프로젝트는 **Hanavi Schedule**, 키 `HNS`다. MCP 서버 `studio`의 도구에 `project: "HNS"`로 넘긴다.
- 할 일의 정본은 보드다. 지금 하는 일은 `list_work_items(project: "HNS", status: ["in_progress", "in_review"])`로 본다.
  다음 일을 고를 때만 `planned`를 더해 받는다(목록이 3~4배 길어진다).
  `docs/plan/`의 current·backlog·roadmap·code-review에는 쓰지 않는다.
- 작업을 시작하면 카드를 `in_progress`로, 끝나면 `done`으로 옮긴다(`move_work_item`). 한 번 끝낼 때마다 옮긴다.
  `done`으로 옮길 때 `build`에 커밋 해시 앞 7자리(또는 빌드 번호)를 넣는다.
- 하다가 생긴 할 일은 `create_work_item`(먼저 `list_work_items`의 `q`로 같은 카드를 찾는다).
  백로그는 버전 미정, 예정은 버전이 정해진 일이다. 버전(릴리즈)을 비워 예정 이상으로 두면 현재 버전이 자동으로 들어간다. 우선순위는 직접 판단해 넣고,
  사용자가 「최우선」이라고 하면 `urgent`(「중요」는 `high`)로 기록해 판단보다 앞세운다.
  막히면 라벨 `blocked`를 더하고 설명에 이유를 적는다. 떠오른 생각은 `capture_idea`.
- `studio`가 연결돼 있지 않으면 마크다운에 대신 적지 않고, 반영하지 못한 것을 끝에 사용자에게 알린다.
- 설계·함정·원인·되돌릴 수 없는 결정은 카드가 아니라 **workprint 프로젝트 문서**에 남긴다(`list_pages`·`update_page`, 개발 문서 템플릿 칸).
  데이터·흐름은 Mermaid로 짧게.
