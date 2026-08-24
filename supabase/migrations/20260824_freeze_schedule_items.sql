-- schedule_items freeze (v1.10.0 이벤트 모델 전환 완료)
-- 읽기는 유지(롤백 보험), 쓰기만 차단 — 앱은 이제 schedule_events로 저장
-- ⚠️ service_role은 영향 받지 않음 (백필/복구 스크립트용)
-- 롤백: GRANT INSERT, UPDATE, DELETE ON public.schedule_items TO anon, authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.schedule_items FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.schedule_items FROM authenticated;
