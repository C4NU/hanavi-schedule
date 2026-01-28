-- Add sort_order column to characters table
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS sort_order integer;

-- Comment: sort_order determines the display order in the grid (Ascending).
