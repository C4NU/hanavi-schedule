-- 1. Characters Table Security
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to characters" ON public.characters;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.characters;

CREATE POLICY "Enable read access for all users"
ON public.characters FOR SELECT
USING (true);

-- 2. Schedules Table Security
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to schedules" ON public.schedules;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.schedules;

CREATE POLICY "Enable read access for all users"
ON public.schedules FOR SELECT
USING (true);

-- 3. Schedule Items Table Security
ALTER TABLE public.schedule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to schedule_items" ON public.schedule_items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.schedule_items;

CREATE POLICY "Enable read access for all users"
ON public.schedule_items FOR SELECT
USING (true);

-- 4. Global Settings Table Security
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.global_settings;

CREATE POLICY "Enable read access for all users"
ON public.global_settings FOR SELECT
USING (true);

-- 5. User Roles Table Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = id);

-- [IMPORTANT] Since we use SUPABASE_SERVICE_ROLE_KEY in our backend APIs,
-- the APIs will bypass these RLS policies and still be able to perform administrative tasks.
-- These policies prevent unauthorized users (or anyone with the Anon key) from making changes directly to the database.
