-- Link Supabase Auth Users to Application Roles
create table if not exists public.user_roles (
    id uuid references auth.users on delete cascade primary key,
    role text not null, -- 'admin' or 'member' (or specific character id like 'varessa')
    username text not null, -- 'admin', 'varessa' etc. (for display/debugging)
    created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Policies

-- 1. Users can read their OWN role
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"
    on public.user_roles
    for select
    using (auth.uid() = id);

-- Helper function to check admin status safely (bypass RLS recursion)
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

-- 2. Admins can read all roles
drop policy if exists "Admins can read all roles" on public.user_roles;
create policy "Admins can read all roles"
    on public.user_roles
    for select
    using ( public.is_admin() );
