-- Enable RLS for characters table
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (SELECT, INSERT, UPDATE, DELETE) for everyone (anon/authenticated)
-- NOTE: In a production app with real auth, you should restrict this to authenticated admins only.
-- Since this app uses a client-side password check, we are opening the DB to match that model.

CREATE POLICY "Allow public full access to characters"
ON public.characters
FOR ALL
USING (true)
WITH CHECK (true);
