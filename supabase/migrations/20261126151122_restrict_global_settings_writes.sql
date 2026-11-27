-- 전역 설정은 공개 읽기와 서버의 관리자 API를 통해서만 사용한다.
alter table public.global_settings enable row level security;

drop policy if exists "Enable insert for authenticated users only" on public.global_settings;
drop policy if exists "Enable update for authenticated users only" on public.global_settings;

revoke insert, update, delete, truncate on table public.global_settings from public, anon, authenticated;
grant select on table public.global_settings to anon, authenticated;
grant select, insert, update on table public.global_settings to service_role;
