-- 멤버 상세 프로필 확장 (hanavi.info 앱 프로필 탭용)
-- characters 테이블에 소개문/키/몸무게 컬럼 추가 (모두 nullable — 미입력 허용)
-- 운영 DB는 SQL Editor에서 수동 실행 필요 (repo 규칙: migrations/가 기준)

ALTER TABLE public.characters
    ADD COLUMN IF NOT EXISTS intro TEXT,
    ADD COLUMN IF NOT EXISTS height_cm NUMERIC(4, 1),
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(4, 1);

-- 참고: 그룹 공식 SNS 링크는 별도 마이그레이션 없이 global_settings 행으로 관리
-- 예시 (실제 URL 확인 후 실행):
-- INSERT INTO public.global_settings (key, value) VALUES
--     ('group_link_youtube', 'https://www.youtube.com/@hanavi'),
--     ('group_link_instagram', 'https://www.instagram.com/hanavi'),
--     ('group_link_tiktok', 'https://www.tiktok.com/@hanavi'),
--     ('group_link_cime', 'https://ci.me/@hanavi')
-- ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
