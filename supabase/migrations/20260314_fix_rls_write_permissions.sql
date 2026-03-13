-- ==========================================
-- FINAL RLS RECOVERY SCRIPT (Fixes Identifier Ambiguity)
-- ==========================================

-- 1. CLEANUP
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public Read Characters" ON public.characters;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.characters;
DROP POLICY IF EXISTS "Enable update for admins and owners" ON public.characters;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.characters;

-- 2. FIX FUNCTION: Using alias and avoiding ambiguity
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.id = auth.uid() AND ur.role = 'admin'
  );
END; $$;

-- 3. RECREATE POLICIES
-- 3.1 user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admins can read all roles" ON public.user_roles FOR SELECT USING (public.is_admin());

-- 3.2 characters
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Characters" ON public.characters FOR SELECT USING (true);
CREATE POLICY "Enable insert for admins" ON public.characters FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY "Enable update for admins and owners" ON public.characters FOR UPDATE TO authenticated 
USING (
    public.is_admin() 
    OR 
    (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.id = auth.uid() AND ur.role = characters.id)) -- Explicitly use characters.id (TEXT)
)
WITH CHECK (
    public.is_admin() 
    OR 
    (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.id = auth.uid() AND ur.role = characters.id))
);
CREATE POLICY "Enable delete for admins" ON public.characters FOR DELETE TO authenticated USING (public.is_admin());
