-- 1. Create table for Admin/Member Login Credentials
-- This replaces the hardcoded MEMBERS array in route.ts
create table public.admin_accounts (
    id text not null,       -- e.g., 'admin', 'varessa'
    password text not null, -- e.g., '0000', 'varessa123'
    role text not null,     -- 'admin' or 'member' (or use id as role for members)
    character_id text,      -- Link to characters table (optional, for members)
    created_at timestamp with time zone default now(),
    constraint admin_accounts_pkey primary key (id)
);

-- 2. Insert Data (Current hardcoded users)
insert into public.admin_accounts (id, password, role, character_id) values
('admin',   '0000',       'admin', null),
('varessa', 'varessa123', 'member', 'varessa'),
('nemu',    'nemu123',    'member', 'nemu'),
('maroka',  'maroka123',  'member', 'maroka'),
('mirai',   'mirai123',   'member', 'mirai'),
('ruvi',    'ruvi123',    'member', 'ruvi'),
('iriya',   'iriya123',   'member', 'iriya');

-- 3. Enable RLS
alter table public.admin_accounts enable row level security;

-- 4. Policies
-- Allow anyone to read (for login check) - CAUTION: In a real production app with Supabase Auth,
-- you would NOT expose this table publicly. But since your current API route checks password
-- manually by reading the "source of truth", we need to allow the API (Service Role) to read it.
-- If you use the Supabase JS Client on the server with Service Key, you bypass RLS, which is safer.
-- If you access from Client, this is dangerous.
-- ASSUMPTION: You will use Service Role Key in your API Route to check this table.
-- So we generally defaults to NO access for public/anon.

-- Policy: Only allow Service Role (API) to read/write.
-- (No 'create policy' needed if we default to deny all, but let's be explicit if needed)
-- For now, we'll leave it private (default deny) so only your API Route using SERVICE_ROLE_KEY can access it.

-- 5. Update Characters Table (If needed to match current usage)
-- The existing schema.sql already has characters. Ensure they match your actual needs.
-- If you need to update avatars to full URLs:
-- update public.characters set avatar_url = 'NEW_URL' where id = 'varessa';
