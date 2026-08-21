-- 레거시 테이블 정리 (2026-08-21 운영 DB 실측 기준)
-- songs: 3행 — 폐기된 방송 신청 기능 데이터
-- subscriptions: 13행 — 구버전 Web Push 구독(endpoint/authKey 포함). DROP 전 백업 권장.
-- user_fcm_tokens: 0행 — 빈 테이블 (현재 FCM 토큰은 Firestore fcm_tokens 사용)
--
-- ⚠️ 운영 반영은 Supabase SQL Editor에서 직접 실행하세요.
--    (원격 마이그레이션 이력이 비어 있어 CLI push 사용 불가 — docs/tech-docs/db-schema-drift.md 참조)

DROP TABLE IF EXISTS public.user_fcm_tokens;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.songs;
