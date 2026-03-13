-- Migration to add member status and graduation date
-- 1. Add status column with default 'active'
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' NOT NULL;

-- 2. Add graduation_date column
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS graduation_date date;

-- 3. Update comments
COMMENT ON COLUMN public.characters.status IS 'Member status: active or graduated';
COMMENT ON COLUMN public.characters.graduation_date IS 'Date when the member graduated. Used for filtering visibility.';
