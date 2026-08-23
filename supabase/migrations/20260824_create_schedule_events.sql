-- 합방 도메인 모델: 이벤트 테이블 3종 신설 (설계: docs/tech-docs/collab-domain-model.md)
-- 모든 방송(개인/합방)을 schedule_events로 표현한다.
--   개인 방송  = 이벤트 1개 + 참여 멤버 1명
--   내부 합방  = 이벤트 1개 + 참여 멤버 2명 이상
--   외부 합방  = 이벤트 1개 + 참여 멤버 + 외부 게스트
-- ⚠️ 운영 반영은 Supabase SQL Editor에서 직접 실행 (db-schema-drift.md 규칙)

-- 1. 이벤트
create table if not exists public.schedule_events (
    id          uuid primary key default extensions.uuid_generate_v4(),
    schedule_id uuid not null references public.schedules(id) on delete cascade,
    day         text not null check (day in ('MON','TUE','WED','THU','FRI','SAT','SUN')),
    start_time  text check (start_time is null or start_time ~ '^\d{2}:\d{2}$'),
    title       text not null default '',
    type        text not null default 'stream'
                check (type in ('stream','off','collab','collab_external')),
    video_url   text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists idx_schedule_events_schedule
    on public.schedule_events(schedule_id);
create index if not exists idx_schedule_events_day
    on public.schedule_events(schedule_id, day);
-- 같은 요일·시간·제목 중복 방지 (제목 빈값 허용을 위한 coalesce)
create unique index if not exists uq_schedule_events_slot
    on public.schedule_events (schedule_id, day, (coalesce(start_time, '')), title);

-- 2. 참여 멤버
create table if not exists public.schedule_event_members (
    event_id     uuid not null references public.schedule_events(id) on delete cascade,
    character_id text not null references public.characters(id) on delete cascade,
    role         text not null default 'member' check (role in ('host','member')),
    primary key (event_id, character_id)
);

create index if not exists idx_event_members_character
    on public.schedule_event_members(character_id);

-- 3. 외부 게스트
create table if not exists public.schedule_event_guests (
    id           uuid primary key default extensions.uuid_generate_v4(),
    event_id     uuid not null references public.schedule_events(id) on delete cascade,
    display_name text not null
);

create index if not exists idx_event_guests_event
    on public.schedule_event_guests(event_id);

-- 4. 팬 메모: 이벤트 참조 컬럼 추가 (legacy_item_id는 이관 검증 전까지 보존)
alter table public.schedule_item_memos
    add column if not exists event_id uuid references public.schedule_events(id) on delete cascade;
create index if not exists idx_memos_event
    on public.schedule_item_memos(event_id);

-- 5. RLS: 공개 읽기 / 관리자 쓰기 (기존 패턴과 동일)
alter table public.schedule_events enable row level security;
alter table public.schedule_event_members enable row level security;
alter table public.schedule_event_guests enable row level security;

drop policy if exists "Public read events" on public.schedule_events;
create policy "Public read events" on public.schedule_events
    for select using (true);
drop policy if exists "Admin write events" on public.schedule_events;
create policy "Admin write events" on public.schedule_events
    for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read event members" on public.schedule_event_members;
create policy "Public read event members" on public.schedule_event_members
    for select using (true);
drop policy if exists "Admin write event members" on public.schedule_event_members;
create policy "Admin write event members" on public.schedule_event_members
    for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read event guests" on public.schedule_event_guests;
create policy "Public read event guests" on public.schedule_event_guests
    for select using (true);
drop policy if exists "Admin write event guests" on public.schedule_event_guests;
create policy "Admin write event guests" on public.schedule_event_guests
    for all using (public.is_admin()) with check (public.is_admin());
