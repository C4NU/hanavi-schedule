-- Add youtube_channel_id column to characters table
ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS youtube_channel_id TEXT;

-- update RLS (if needed, usually not for adding column if policy covers update)
-- Just ensuring comments match usage
COMMENT ON COLUMN characters.youtube_channel_id IS 'YouTube Channel ID for auto-linking videos';
