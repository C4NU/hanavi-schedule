-- schedule_items에 category 컬럼 추가
-- 운영 DB에 컬럼이 누락되어 있어 관리자 카테고리 칩 저장과
-- 씨미(Ci.me) 다시보기 카테고리 자동 동기화(cron)가 실패하던 문제 수정.
-- PostgREST 실측 기준 운영 schedule_items는 10컬럼(category 없음)이었다.

ALTER TABLE public.schedule_items
    ADD COLUMN IF NOT EXISTS category text;
