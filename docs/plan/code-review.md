# 코드 리뷰 보고서

최초 리뷰 일자: 2026-05-16
수정 완료 일자: 2026-05-16
리뷰 범위: 전체 코드베이스 (커밋 e5c7d34 기준)

## 수정 상태

**모든 치명적/높음/중간 이슈 수정 완료** ✅

---

## 치명적 (수정 완료)

### C1. SSRF 취약점 — 수정 완료
파일: `src/app/api/proxy/image/route.ts`
조치: `ALLOWED_HOSTS` 화이트리스트(`ci.me`, `i.ytimg.com`, `yt3.ggpht.com`, `img.youtube.com`) + HTTPS 강제 + URL 파싱 검증 추가.

### C2. XSS — 수정 완료
파일: `src/components/WeeklyTimetable.tsx:188`
조치: `isomorphic-dompurify`의 `DOMPurify.sanitize()` 적용.

### C3. 시크릿 파일 평문 보관 — 해당 없음
`.env.local`, `secrets.json` 모두 `.gitignore` 등록 확인, git 미추적. Vercel 환경변수로 배포 중이므로 위험 없음.

### C4. Cron 인증 우회 — 수정 완료
파일: `src/app/api/cron/update-replays/route.ts`, `src/app/api/cron/update-cime-replays/route.ts`
조치: `NODE_ENV` 분기 완전 제거. 항상 `CRON_SECRET` Bearer 검증.

---

## 높음 (수정 완료)

### H1. admin/page.tsx 거대 파일 — 수정 완료
1437줄 → 766줄로 분할.
- `src/hooks/useAdminAuth.ts` (114줄)
- `src/hooks/useNotification.ts` (95줄)
- `src/hooks/useAutoLink.ts` (133줄)
- `src/components/admin/AdminLoginForm.tsx`
- `src/components/admin/AdminSideMenu.tsx`
- `src/components/admin/NotificationModal.tsx`

### H2. ADMIN_SECRET 타이밍 공격 — 수정 완료
파일: `src/app/api/webhook/schedule-update/route.ts`
조치: `crypto.timingSafeEqual` 적용, Authorization Bearer 헤더 방식으로 전환.

### H3. URL 인젝션 — 수정 완료
파일: `src/app/api/cime/profile/route.ts`
조치: `CHANNEL_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/` 정규식 검증 + `encodeURIComponent`.

### H4. 푸시 구독 검증 부재 — 수정 완료
파일: `src/app/api/push/subscribe/route.ts`
조치: FCM 토큰 정규식 검증, SHA-256 해시로 doc ID 생성.

### H5. N+1 쿼리 — 수정 완료
파일: `src/app/api/cron/update-cime-replays/route.ts`
조치: `allSchedules` 루프 밖으로 캐시, `Promise.allSettled`로 캐릭터별 병렬 fetch.

### H6. 입력 검증 부재 — 수정 완료
파일: `admin/schedule`, `settings`, `push/send`
조치: `zod` 스키마 도입. `SaveScheduleSchema`, `UpdateSettingsSchema`, `PushSendSchema`.

---

## 중간 (수정 완료)

### M1. console.log 정리 — 수정 완료
PII 포함 로그 제거, API 라우트 전체 디버그 로그 제거. (`firebase.ts`, `supabase.ts`, `update-replays`, `admin/schedule` 등)

### M2. 하드코딩 이메일 — 수정 완료
파일: `src/app/api/settings/route.ts`
조치: `process.env.DEFAULT_INQUIRY_EMAIL`로 교체.

### M3. error.message 노출 — 수정 완료
`update-replays`, `cime/profile`, `settings`에서 `error.message` 직접 노출 → `'Internal server error'` 일반 메시지로 교체.

### M4. any 타입 + @ts-ignore — 수정 완료
`settings/route.ts`의 `@ts-ignore` 제거, `NotificationManager.tsx`의 `@ts-ignore` → 명시적 타입 캐스팅.

### M5. Date mutate — 수정 완료
파일: `src/app/api/cron/update-replays/route.ts`
`setHours` 제거 → `new Date(date.getTime() + 9 * 3600 * 1000)` 불변 패턴.

### M6. 시크릿 쿼리스트링 — 수정 완료
파일: `src/app/api/push/daily-summary/route.ts`
`?secret=` 쿼리 방식 완전 제거. Authorization Bearer 헤더만 허용 (`timingSafeEqual` 적용).

### M7. 테스트 부재 — 수정 완료
vitest 설치 및 설정, 핵심 라우트 22개 테스트 작성:
- `src/__tests__/api/proxy-image.test.ts` (6개)
- `src/__tests__/api/webhook-schedule-update.test.ts` (4개)
- `src/__tests__/api/cime-profile.test.ts` (5개)
- `src/__tests__/api/cron-auth.test.ts` (7개)

---

## 낮음 / 제안 (미적용 — 향후 백로그)

- L1: 알림 문구 이모지 사용 (사용자 표시 문구는 허용 범위)
- L2: 정규식 HTML 파싱 → cheerio 전환
- L3: ScheduleCell magic numbers 상수화
- L4: backlog.md 동기화

---

## 승인 상태

**승인** — 치명적 4건, 높음 6건, 중간 7건 전체 수정 완료. TypeScript 오류 0건, 테스트 22개 통과.
