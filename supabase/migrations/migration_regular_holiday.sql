-- Add regular_holiday column to characters table
-- This column will store comma-separated English day names (e.g., 'MON,THU')
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS regular_holiday text;

-- Optional: Update existing records with current defaults (if desired, otherwise they rely on code defaults until set)
-- UPDATE public.characters SET regular_holiday = 'THU,SUN' WHERE id = 'varessa';
-- UPDATE public.characters SET regular_holiday = 'MON,THU' WHERE id = 'nemu';
-- UPDATE public.characters SET regular_holiday = 'TUE,SAT' WHERE id = 'maroka';
-- UPDATE public.characters SET regular_holiday = 'MON,THU' WHERE id = 'mirai';
-- UPDATE public.characters SET regular_holiday = 'WED,SUN' WHERE id = 'ruvi';
-- UPDATE public.characters SET regular_holiday = 'TUE,SAT' WHERE id = 'iriya';
