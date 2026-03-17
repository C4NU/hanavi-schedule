-- Add birthday column to characters table
ALTER TABLE characters ADD COLUMN IF NOT EXISTS birthday TEXT;

-- Update existing characters with birthday data (optional/fallback)
UPDATE characters SET birthday = '5월 1일' WHERE id = 'cherii';
UPDATE characters SET birthday = '11월 8일' WHERE id = 'nemu';
UPDATE characters SET birthday = '7월 26일' WHERE id = 'ruvi';
UPDATE characters SET birthday = '1월 10일' WHERE id = 'aella';
UPDATE characters SET birthday = '2월 1일' WHERE id = 'mirai';
UPDATE characters SET birthday = '9월 4일' WHERE id = 'sena';
UPDATE characters SET birthday = '9월 19일' WHERE id = 'iriya';