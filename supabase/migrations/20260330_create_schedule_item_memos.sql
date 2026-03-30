-- Create schedule_item_memos table
CREATE TABLE IF NOT EXISTS public.schedule_item_memos (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    schedule_item_id uuid NOT NULL REFERENCES public.schedule_items(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.schedule_item_memos ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone can view memos
CREATE POLICY "Enable read access for all users" ON public.schedule_item_memos
    FOR SELECT USING (true);

-- 2. Anyone can insert memos (Anonymous contributions)
CREATE POLICY "Enable insert for all users" ON public.schedule_item_memos
    FOR INSERT WITH CHECK (true);

-- 3. Only admins can delete memos
CREATE POLICY "Enable delete for admins only" ON public.schedule_item_memos
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM public.user_roles WHERE role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON TABLE public.schedule_item_memos TO anon;
GRANT ALL ON TABLE public.schedule_item_memos TO authenticated;
GRANT ALL ON TABLE public.schedule_item_memos TO service_role;
