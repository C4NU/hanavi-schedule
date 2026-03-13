-- Migration to add cime_url column to characters table
-- This column will store the direct link to the CIME channel

ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS cime_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.characters.cime_url IS 'Direct URL to the CIME channel';

-- Optional: Update existing members if cime_url is known
-- For example, if we want to copy existing chzzk_url to cime_url for everyone as a starting point
-- UPDATE public.characters SET cime_url = 'https://chzzk.naver.com/live/' || chzzk_url WHERE chzzk_url IS NOT NULL AND cime_url IS NULL;
