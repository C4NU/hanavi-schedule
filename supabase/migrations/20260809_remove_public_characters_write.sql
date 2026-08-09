-- Remove the legacy policy that bypasses all administrator-only character policies.
DROP POLICY IF EXISTS "Allow public full access to characters" ON public.characters;
DROP POLICY IF EXISTS "Public Write Characters" ON public.characters;
DROP POLICY IF EXISTS "Enable insert for admins" ON public.characters;
DROP POLICY IF EXISTS "Enable update for admins and owners" ON public.characters;
DROP POLICY IF EXISTS "Enable delete for admins" ON public.characters;
DROP POLICY IF EXISTS "Admin Write Characters" ON public.characters;

-- Keep public reads while requiring administrator authorization for writes.
DROP POLICY IF EXISTS "Enable read access for all users" ON public.characters;
CREATE POLICY "Enable read access for all users" ON public.characters
    FOR SELECT USING (true);

CREATE POLICY "Admin Write Characters" ON public.characters
    FOR ALL TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
