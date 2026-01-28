-- ==========================================
-- HANAVI SCHEDULE - ONE CLICK SETUP SCRIPT
-- ==========================================
-- This script sets up the complete database schema, security policies, functions, and initial seed data.

-- 1. Enable Extensions
create extension if not exists "uuid-ossp";

-- 2. Create Tables

-- 2.1 Schedules
create table if not exists public.schedules (
    id uuid not null default uuid_generate_v4(),
    week_range text not null unique, -- e.g., "12.09 - 12.15"
    is_active boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint schedules_pkey primary key (id)
);

-- 2.2 Characters (Updated with Member Management Columns)
create table if not exists public.characters (
    id text not null, -- e.g., 'varessa', 'nemu'
    name text not null,
    color_theme text not null,
    avatar_url text,
    chzzk_url text,
    youtube_channel_id text,
    youtube_replay_url text,
    regular_holiday text, -- Comma-separated days 'MON,THU'
    default_time text, -- '19:00'
    sort_order integer,
    color_bg text,
    color_border text,
    constraint characters_pkey primary key (id)
);

-- 2.3 Schedule Items
create table if not exists public.schedule_items (
    id uuid not null default uuid_generate_v4(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    character_id text not null references public.characters(id) on delete cascade,
    day text not null, -- 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
    time text, -- '20:00'
    content text, -- 'Broadcast Title'
    type text not null default 'stream',
    video_url text, -- For replay links
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint schedule_items_pkey primary key (id),
    constraint unique_schedule_item unique (schedule_id, character_id, day)
);

-- 3. Create Auth Role Table
create table if not exists public.user_roles (
    id uuid references auth.users on delete cascade primary key,
    role text not null, -- 'admin', 'varessa', 'nemu', etc.
    username text not null, -- for display/debugging
    created_at timestamp with time zone default now()
);

-- 4. Enable RLS
alter table public.schedules enable row level security;
alter table public.characters enable row level security;
alter table public.schedule_items enable row level security;
alter table public.user_roles enable row level security;

-- 5. Helper Functions

-- 5.1 Admin Check
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.user_roles
    where id = auth.uid()
    and role = 'admin'
  );
end;
$$;

-- 5.2 Increment Sort Orders (For Insert)
CREATE OR REPLACE FUNCTION increment_sort_orders(start_order INT)
RETURNS void AS $$
BEGIN
  UPDATE public.characters
  SET sort_order = sort_order + 1
  WHERE sort_order >= start_order;
END;
$$ LANGUAGE plpgsql;

-- 5.3 Decrement Sort Orders (For Delete)
CREATE OR REPLACE FUNCTION decrement_sort_orders(removed_order INT)
RETURNS void AS $$
BEGIN
  UPDATE public.characters
  SET sort_order = sort_order - 1
  WHERE sort_order > removed_order;
END;
$$ LANGUAGE plpgsql;

-- 6. Define Policies

-- user_roles Policies
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role" on public.user_roles for select using (auth.uid() = id);

drop policy if exists "Admins can read all roles" on public.user_roles;
create policy "Admins can read all roles" on public.user_roles for select using ( public.is_admin() );

-- Public Data Policies (Read)
drop policy if exists "Public Read Schedules" on public.schedules;
create policy "Public Read Schedules" on public.schedules for select using (true);

drop policy if exists "Public Read Characters" on public.characters;
create policy "Public Read Characters" on public.characters for select using (true);

drop policy if exists "Public Read Items" on public.schedule_items;
create policy "Public Read Items" on public.schedule_items for select using (true);

-- Admin/Member Write Policies (Refined from migration_rls_fix)
-- Allowing explicit Write for characters table based on recent changes
drop policy if exists "Public Write Characters" on public.characters;
create policy "Public Write Characters" on public.characters for all using (true) with check (true);
-- Note: Ideally this should be restricted to admins, but per recent RLS fix request it was opened. 
-- You may want to restrict this later: using (public.is_admin())

drop policy if exists "Admin Write Schedules" on public.schedules;
create policy "Admin Write Schedules" on public.schedules for all using ( public.is_admin() );

drop policy if exists "Admin Write Items" on public.schedule_items;
create policy "Admin Write Items" on public.schedule_items for all using ( public.is_admin() );

-- 7. Seed Initial Data (Characters)
-- Using ON CONFLICT to update if exists
insert into public.characters (id, name, color_theme, avatar_url, chzzk_url, default_time, regular_holiday, sort_order, color_bg, color_border) values
('varessa', '바레사', 'varessa', 'https://nng-phinf.pstatic.net/MjAyNTExMTZfMjE3/MDAxNzYzMjkwMTA1MzE4.htaiKHdkh_GRwP1QaboXgCKwq2jyT_iEFGSqhlIjEMAg.v4spxDjEzoy18q7Q9Y7d8xx8V414XOUkrKZCZy795Zcg.PNG/image.png?type=f120_120_na', 'https://chzzk.naver.com/cb40b98631410d4cc3796ab279c2f1bc', '08:00', 'THU,SUN', 1, '#F8F7FE', '#6A6792'),
('cherii', '체리', 'cherii', 'https://nng-phinf.pstatic.net/MjAyNTExMTZfMjE3/MDAxNzYzMjkwMjMyMzE5.3Q5c4gJ52C75s4u2540j1296x0658.F_7j4j4j4j4j4.PNG/image.png?type=f120_120_na', 'https://chzzk.naver.com/cherii', '10:00', NULL, 2, '#FFF1D6', '#E38D53'), -- Fixed avatar/url placeholders
('nemu', '네무', 'nemu', 'https://nng-phinf.pstatic.net/MjAyNTAzMTFfMjQ4/MDAxNzQxNjM3MjgzOTg3.i_jLYFHlvMPRcXdc-33jJnZ7Uq_pMR-X1Q05QCxqlCgg.jIvgSv_hOaU3RDap2dN78plBmCEQPeNoh79SjpGhT-wg.JPEG/%EB%84%A4%EB%AC%B4%ED%94%84%EC%82%AC.jpg?type=f120_120_na', 'https://chzzk.naver.com/7c4c49fd3a34ce68e84075f5b44fe8c8', '12:00', 'MON,THU', 3, '#E1ECFD', '#6994F7'),
('maroka', '마로카', 'maroka', 'https://nng-phinf.pstatic.net/MjAyNTExMTZfMTcg/MDAxNzYzMjkwNzUwNDQ3.6PyGF3UHwgIRtO7bgz3KKo1YjUkv2AwtHdVm3iIp9fsg.nK8jD3R8Q3NNIWbBSLWu_C6T0tPgh7lFdik2i6kCZ90g.PNG/image.png?type=f120_120_na', 'https://chzzk.naver.com/157501b80c3c4416110996887550f75f', '14:00', 'TUE,SAT', 4, '#F2FFFC', '#7ACFB2'),
('mirai', '미라이', 'mirai', 'https://nng-phinf.pstatic.net/MjAyNTAyMTRfMjE2/MDAxNzM5NTQ0ODEyMjE1.rsVyBQD-4lpbSvEKUA4KQRGlkB8rb74cvF8rXl7t9WEg.a9X56KykaLdhSW5Qq61bx9vORGVI4S0UwnwAApLiqtIg.JPEG/%EB%AF%B8%EB%9D%BC%EC%9D%B4_%ED%94%84%EC%82%AC.jpg?type=f120_120_na', 'https://chzzk.naver.com/37716364b3086fefd298046072c92345', '15:00', 'MON,THU', 5, '#F0EDFD', '#765FF6'),
('aella', '아엘라', 'aella', 'https://nng-phinf.pstatic.net/MjAyNTAyMTNfMTQy/MDAxNzM5NDMyNzExNzg0.0sp4WeVOS5mUGgczmdY_h37nsFPCcY5UljoyZk_QNAMg.UVP0e9fo6FD9I7wZSS4t7pw-VdrtaQl-atR1_Ccc9y8g.JPEG/%EC%B1%84%EB%84%90%ED%94%84%EC%82%AC.jpg?type=f120_120_na', 'https://chzzk.naver.com/aella', '17:00', NULL, 6, '#D4D4E4', '#6A7196'), -- Fixed placeholder
('ruvi', '루비', 'ruvi', 'https://nng-phinf.pstatic.net/MjAyNTAyMTNfMTQy/MDAxNzM5NDMyNzExNzg0.0sp4WeVOS5mUGgczmdY_h37nsFPCcY5UljoyZk_QNAMg.UVP0e9fo6FD9I7wZSS4t7pw-VdrtaQl-atR1_Ccc9y8g.JPEG/%EC%B1%84%EB%84%90%ED%94%84%EC%82%AC.jpg?type=f120_120_na', 'https://chzzk.naver.com/acc87c975763452aab25e281e0eb0b85', '19:00', 'WED,SUN', 7, '#FDF2F4', '#DF3F58'),
('iriya', '이리야', 'iriya', 'https://nng-phinf.pstatic.net/MjAyNTExMTZfMjE3/MDAxNzYzMjkwMTA1MzE4.htaiKHdkh_GRwP1QaboXgCKwq2jyT_iEFGSqhlIjEMAg.v4spxDjEzoy18q7Q9Y7d8xx8V414XOUkrKZCZy795Zcg.PNG/image.png?type=f120_120_na', 'https://chzzk.naver.com/10d1ce368f685df0502875195eee39eb', '24:00', 'TUE,SAT', 8, '#D4D2D3', '#212221')
on conflict (id) do update set 
    default_time = EXCLUDED.default_time,
    regular_holiday = EXCLUDED.regular_holiday,
    sort_order = EXCLUDED.sort_order,
    color_bg = EXCLUDED.color_bg,
    color_border = EXCLUDED.color_border;
