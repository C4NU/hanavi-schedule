# AGENTS.md — 하나비 스케줄 (hanavi_schedule)

공통 규칙은 [`AGENTS.global.md`](./AGENTS.global.md)(`~/Development/AGENTS.md` 심볼릭 링크)를 따른다.
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
| `docs/plan/` | current · backlog (작업 전후 반드시 확인/갱신) |

## 프로젝트 규칙 (상위 규칙에 추가)

- **문서**: 작업 전 `docs/plan/current.md`·`backlog.md` 확인, 작업 후 갱신. 루트 `plan/`은 폐기됨.
- **시간대**: 서비스 기준 KST, Vercel 서버는 UTC. 날짜 문자열은 `toISOString()` 대신 명시적 조립(`getMonday` 등 `src/utils/date.ts` 활용). cron 라우트의 연말 경계 버그(backlog 참조) 재발 주의.
- **합방(collab)**: 현재 화면별 휴리스틱 병합 상태(`ScheduleGrid`/`WeeklyTimetable`/`PersonalScheduleModal` 규칙 상이). v1.10.0 `schedule_events` 모델 계획은 backlog 참조 — 수정 시 세 곳을 함께 보지 않으면 회귀 발생.
- **DB 스키마 변경**: `supabase/migrations/`에 타임스탬프 파일로 추가. 기존 SQL 덤프 파일들과 불일치가 있으므로 운영 DB가 기준.
- **권한 검증**: API 라우트는 `checkIsAdmin`(서비스 롤 클라이언트) + RLS 이중 확인 패턴 유지. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용, 클라이언트 번들에 `NEXT_PUBLIC_` 외 시크릿 노출 금지.
- **알림**: 발송은 반드시 `sendMulticastNotificationOnce`(멱등 키) 또한 포그라운드 리스너 중복 등록 금지 — 과거 중복 알림 버그 원인.
- **렌더링**: DB에서 온 HTML 컨텐츠는 `DOMPurify.sanitize` 없이 `dangerouslySetInnerHTML` 금지.
- **WYSIWYG**: 관리자 편집 화면과 공개 화면은 동일한 렌더링 파이프라인을 공유한다(셀 n분열 등). 관리자 전용 요소를 추가할 때도 공개 뷰와 시각적 구조를 일치시킨다.
- **다방송 셀**: 하루 복수 방송은 combined 문자열(`시간 '+', 내용 ' + '`)로 저장 — 분해/재조합은 반드시 `utils/time.ts`의 split/join 헬퍼를 통해서만. 파싱 규칙을 화면별로 재구현하지 않는다.
- **목데이터 폴백**: `/api/schedule`은 장애 시 mock 반환 중 → 신규 API에서 이 패턴 확산 금지 (모바일 BFF 계획: stale 표시 방식).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
