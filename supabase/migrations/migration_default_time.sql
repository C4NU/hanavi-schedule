-- Add default_time column to characters table
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS default_time text;

-- Comment: default_time stores the default broadcast start time (e.g., '19:00').
