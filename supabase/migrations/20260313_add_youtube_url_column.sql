-- Add youtube_url column to characters table
-- This column will store the direct link to the main YouTube channel

ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS youtube_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.characters.youtube_url IS 'Direct URL to the main YouTube channel';
