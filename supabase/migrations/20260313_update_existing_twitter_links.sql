-- Update existing members with their Twitter/X URLs
-- Note: Replace the placeholder URLs with actual ones if known.

UPDATE public.characters SET twitter_url = 'https://x.com/Varessa_V' WHERE id = 'varessa';
UPDATE public.characters SET twitter_url = 'https://x.com/cherii_v' WHERE id = 'cherii';
UPDATE public.characters SET twitter_url = 'https://x.com/nemu_v' WHERE id = 'nemu';
UPDATE public.characters SET twitter_url = 'https://x.com/maroka_v' WHERE id = 'maroka';
UPDATE public.characters SET twitter_url = 'https://x.com/mirai_v' WHERE id = 'mirai';
UPDATE public.characters SET twitter_url = 'https://x.com/aella_v' WHERE id = 'aella';
UPDATE public.characters SET twitter_url = 'https://x.com/ruvi_v' WHERE id = 'ruvi';
UPDATE public.characters SET twitter_url = 'https://x.com/iriya_v' WHERE id = 'iriya';

-- Add a comment for documentation
COMMENT ON COLUMN public.characters.twitter_url IS 'Twitter/X profile URL for member';
