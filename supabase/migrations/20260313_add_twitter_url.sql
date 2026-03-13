-- Add twitter_url column to characters table
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS twitter_url TEXT;

COMMENT ON COLUMN public.characters.twitter_url IS 'Twitter/X profile URL for member';
