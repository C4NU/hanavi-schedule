-- ==========================================
-- HANAVI SCHEDULE - ONE CLICK SETUP SCRIPT
-- ==========================================

-- 1. Enable Extensions
create extension if not exists "uuid-ossp";

-- 2. Create Basic Tables (Schedules, Characters, Items)
create table if not exists public.schedules (
    id uuid not null default uuid_generate_v4(),
    week_range text not null unique, -- e.g., "12.09 - 12.15"
    is_active boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint schedules_pkey primary key (id)
);

create table if not exists public.characters (
    id text not null, -- e.g., 'varessa', 'nemu'
    name text not null,
    color_theme text not null,
    avatar_url text,
    chzzk_url text,
    constraint characters_pkey primary key (id)
);

create table if not exists public.schedule_items (
    id uuid not null default uuid_generate_v4(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    character_id text not null references public.characters(id) on delete cascade,
    day text not null, -- 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
    time text, -- '20:00'
    content text, -- 'Broadcast Title'
    type text not null default 'stream',
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

-- 5. Define Helper Function for Admin Check (Security Definer)
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

-- 6. Define Policies

-- user_roles Policies
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
    on public.user_roles for select using (auth.uid() = id);

drop policy if exists "Admins can read all roles" on public.user_roles;
create policy "Admins can read all roles"
    on public.user_roles for select using ( public.is_admin() );

-- Public Data Policies (Schedules, Characters) are Readable by Everyone
drop policy if exists "Public Read Schedules" on public.schedules;
create policy "Public Read Schedules" on public.schedules for select using (true);

drop policy if exists "Public Read Characters" on public.characters;
create policy "Public Read Characters" on public.characters for select using (true);

drop policy if exists "Public Read Items" on public.schedule_items;
create policy "Public Read Items" on public.schedule_items for select using (true);

-- Admin Write Policies (using is_admin())
-- Allow Admins OR Specific Members (their own rows) to Write? 
-- For simplicity, if role is present, they can write.
-- Better: 'admin' can write ALL. 'member' can write THEIR OWN schedule items.
-- But schedule_items links to character_id. 'member' role matches character_id?
-- Let's stick to safe Admin-only write for now to match legacy 'Admin Page' behavior unless requested otherwise.
-- (The migration assumes Admin Page handles everything).

drop policy if exists "Admin Write Schedules" on public.schedules;
create policy "Admin Write Schedules" on public.schedules for all using ( public.is_admin() );

drop policy if exists "Admin Write Characters" on public.characters;
create policy "Admin Write Characters" on public.characters for all using ( public.is_admin() );

drop policy if exists "Admin Write Items" on public.schedule_items;
create policy "Admin Write Items" on public.schedule_items for all using ( public.is_admin() );


-- 7. Seed Initial Data (Characters) - Idempotent
insert into public.characters (id, name, color_theme, avatar_url, chzzk_url) values
('varessa', '바레사', 'varessa', '/avatars/varessa.png', 'https://chzzk.naver.com/cb40b98631410d4cc3796ab279c2f1bc'),
('nemu', '네무', 'nemu', '/avatars/nemu.png', 'https://chzzk.naver.com/7c4c49fd3a34ce68e84075f5b44fe8c8'),
('maroka', '마로카', 'maroka', '/avatars/maroka.png', 'https://chzzk.naver.com/157501b80c3c4416110996887550f75f'),
('mirai', '미라이', 'mirai', '/avatars/mirai.png', 'https://chzzk.naver.com/37716364b3086fefd298046072c92345'),
('ruvi', '루비', 'ruvi', '/avatars/ruvi.png', 'https://chzzk.naver.com/acc87c975763452aab25e281e0eb0b85'),
('iriya', '이리야', 'iriya', '/avatars/iriya.png', 'https://chzzk.naver.com/10d1ce368f685df0502875195eee39eb')
on conflict (id) do nothing;
