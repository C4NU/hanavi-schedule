-- [TOTAL MIGRATION] Add twitter_url column and update existing members with actual URLs
-- 1. Add column if not exists
ALTER TABLE public.characters ADD COLUMN IF NOT EXISTS twitter_url TEXT;

-- 2. Add comment
COMMENT ON COLUMN public.characters.twitter_url IS 'Twitter/X profile URL for member';

-- 3. Update existing members with their Twitter/X URLs
UPDATE public.characters SET twitter_url = 'https://x.com/varessa_maivi' WHERE id = 'varessa';
UPDATE public.characters SET twitter_url = 'https://x.com/cherii_hanavi' WHERE id = 'cherii';
UPDATE public.characters SET twitter_url = 'https://x.com/nemu_hanavi' WHERE id = 'nemu';
UPDATE public.characters SET twitter_url = 'https://x.com/maroka_maivi' WHERE id = 'maroka';
UPDATE public.characters SET twitter_url = 'https://x.com/mirai_hanavi' WHERE id = 'mirai';
UPDATE public.characters SET twitter_url = 'https://x.com/aella_hanavi' WHERE id = 'aella';
UPDATE public.characters SET twitter_url = 'https://x.com/ruvi_hanavi' WHERE id = 'ruvi';
UPDATE public.characters SET twitter_url = 'https://x.com/iriya_maivi' WHERE id = 'iriya';
UPDATE public.characters SET twitter_url = 'https://x.com/senah_hanavi' WHERE id = 'senah';
