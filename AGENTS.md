# AGENTS.md — 하나비 스케줄 (hanavi_schedule)

<!-- knowledge:begin -->

공통 규칙은 여기 심어져 있다. 관리 블록은 직접 편집하지 않는다.

<!-- source: studio-artifakt/knowledge; sha256: 87c2304ff68e46b604188571bdb8de704c00a530138b1ec42ef5f7c1e143841c -->

# 공통 규칙

## 문서 규칙

할 일은 보드, 설계·함정·결정은 workprint 프로젝트 문서, 공통 규칙은 스튜디오 문서 「에이전트 공통 규칙」·「문서 규칙」에 둔다.

## 작업 원칙

### 말하는 법

- **간결하고 직접적으로, 솔직하게 말한다.** 약한 가정에는 의문을 제기한다.
- **검증한 사실과 아직 모르는 것을 구분해서 말한다.** 확인하지 않은 것을 확인한 것처럼
  쓰지 않는다.
- **막힌 것·결과·근거를 보고한다.** 진행 상황을 중계하지 않는다.
- **질문은 결정이 실제로 갈릴 때만 한다** — 판단이 모호하거나, 위험하거나, 승인이
  필요한 경우. 그 밖에는 합리적인 기본값을 골라 진행하고 무엇을 골랐는지 알린다.

### 일하는 법

- **원래 목표와 제약을 지킨다.** 요청받은 범위를 임의로 줄이거나 넓히지 않는다.
- **승인받은 일은 끝까지 한다.** 완료를 말하기 전에 **실제 결과를 확인한다.**
  테스트가 실패하면 실패했다고 말한다.
- **변경은 좁고 단순하게.** 무관한 편집, 불필요한 추상화, 의미 없는 테스트를 만들지 않는다.
- **무관한 작업을 건드리지 않는다.** 승인 범위 밖의 파괴적·프로덕션·외부 행동을 하지 않는다.

### 확인하는 법

- **관찰할 수 있는 동작을 테스트한다.** 구현 세부가 아니라 결과를 본다.
- **사용자가 보는 것은 실제 화면에서 확인한다.** 코드가 맞다는 것으로 대신하지 않는다.
- **조사는 최신 1차 출처에 근거한다.** 중요한 근거는 링크를 남긴다.

### 도구

- 설명이 그림으로 나을 때는 **Visualize 스킬**을 쓴다.
- 상황에 맞는 스킬이 있으면 쓴다.
- 서브에이전트는 **진짜로 독립적인 작업**에만 쓰고, 결과를 종합해서 전달한다.

---

## 코드 변경 원칙

- **기존 아키텍처를 우선 유지한다.** 새 abstraction은 기존 것을 확인한 뒤에 추가한다.
- **중복 구현을 만들지 않는다.** 같은 일을 하는 코드가 이미 있는지 먼저 찾는다.
- **불필요한 dependency를 추가하지 않는다.**
- 기존 기능을 바꿀 때는 **관련 코드와 사용처를 먼저 확인**한다.
- **변경 대신 새 값을 만든다** — 객체를 제자리에서 바꾸지 않는다.
- 함수는 작게(50줄 이하), 파일은 집중되게(800줄 이하), 중첩은 4단계 이하.
- 하드코딩된 값과 남은 `console.log`/`print` 디버그 출력을 남기지 않는다.
- 작업은 보드의 카드부터 확인하고, 끝나면 카드를 옮긴다.

## 오류 처리와 입력 검증

바깥에서 들어오는 값은 **항상 검증**하고, 실패할 수 있는 작업은 **항상 처리**한다.
오류 메시지에 민감한 정보를 담지 않는다.

## 보안

- 시크릿을 코드에 적지 않는다. 환경변수 또는 저장소가 정한 커밋 제외 파일을 쓴다.
- 커밋 전에 확인: 하드코딩된 키·토큰 없음, 사용자 입력 검증됨, 인증/인가 확인됨.

---

## Git

- **커밋 메시지**: `<타입>: <설명>` — `feat` · `fix` · `refactor` · `docs` · `test` ·
  `chore` · `perf` · `ci`. 본문은 선택.
- **기존 uncommitted 변경을 지우거나 되돌리지 않는다.**
- 커밋·푸시는 **요청받았을 때만** 한다.
- PR을 만들 때는 최신 커밋만 보지 말고 `git diff <base>...HEAD`로 전체를 확인한다.

---

## 언어

**모든 설명·문서·커밋 메시지는 한국어로 쓴다.** 기술 용어와 코드 식별자는 원문 그대로 둔다.

### 🔴 장식하는 수식어를 쓰지 않는다

**뜻을 더하지 않고 붙기만 하는 부사어·관형어를 지운다.** 지워서 뜻이 그대로면 원래
없어도 되는 말이다.

```
❌  매우 중요한 핵심 문제를 성공적으로 해결했다
✅  문제를 해결했다

❌  안정적으로 원활하게 동작하도록 효과적으로 개선했다
✅  크래시가 사라졌다

❌  강력하고 혁신적인 새로운 기능을 완벽하게 구현했다
✅  잠금화면에서 촬영할 수 있다
```

자주 붙는 것들 — 매우 · 정말 · 아주 · 성공적으로 · 완벽하게 · 확실히 · 효과적으로 ·
원활하게 · 안정적으로 · 손쉽게 · 강력한 · 혁신적인 · 최적화된 · 핵심적인.

**수식어 대신 사실을 쓴다.** "성능이 크게 개선됐다"가 아니라 "215MB가 사라졌다",
"안정적으로 동작한다"가 아니라 "확장 크래시 여섯을 고쳤다"로 쓴다. 잰 값이 없으면
그 문장은 아직 쓸 때가 아니다.

---

## 작업 전 확인

1. `git status`
2. 이 파일과 해당 저장소의 `AGENTS.md`
3. 구현·계획 작업이면 보드에서 이 프로젝트의 `in_progress`·`planned` 카드(`list_work_items`)
4. 건드릴 영역의 프로젝트 문서(`list_pages`)를 먼저 찾고 관련 문서만 읽는다
5. 빌드·테스트 설정

## 작업 후 확인

1. 보드 갱신 — 끝낸 카드는 `done`, 새로 생긴 할 일은 카드로, 막힌 것은 `blocked`
2. 알게 된 함정이나 되돌릴 수 없는 결정이 있으면 프로젝트 문서 해당 칸에 남긴다

## AI instruction 파일을 고칠 때

`AGENTS.md`가 canonical이고 `CLAUDE.md`는 그것을 읽으라는 어댑터일 뿐이다.
**규칙을 두 파일에서 동시에 관리하지 않는다.** Claude 전용 지시가 꼭 필요할 때만
`CLAUDE.md`에 덧붙인다.

<!-- knowledge:end -->

공통 규칙은 위 관리 블록에 심어져 있다. 그 밖의 본문은 프로젝트 고유 규칙이다.
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

- **문서**: 할 일은 보드 `HAN`, 설계·함정·결정은 HAN 프로젝트 문서.
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

- 이 저장소의 보드 프로젝트는 **Hanavi**, 키 `HAN`다. MCP 서버 `studio`의 도구에 `project: "HAN"`로 넘긴다.
- 지금 하는 일은 `list_work_items(project: "HAN", status: ["in_progress", "in_review"])`로 본다.
