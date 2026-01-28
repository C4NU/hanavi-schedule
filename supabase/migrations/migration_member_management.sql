-- Add new columns for member management
ALTER TABLE public.characters 
ADD COLUMN IF NOT EXISTS youtube_replay_url text,
ADD COLUMN IF NOT EXISTS color_bg text,
ADD COLUMN IF NOT EXISTS color_border text;

-- Comment: color_bg and color_border stores hex codes (e.g., '#FFFFFF').
-- youtube_replay_url stores the full URL.
