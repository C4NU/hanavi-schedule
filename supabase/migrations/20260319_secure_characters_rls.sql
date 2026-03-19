-- Secure characters table write access to admins only
drop policy if exists "Public Write Characters" on public.characters;
drop policy if exists "Admin Write Characters" on public.characters;

create policy "Admin Write Characters" on public.characters
for all using ( public.is_admin() ) with check ( public.is_admin() );
