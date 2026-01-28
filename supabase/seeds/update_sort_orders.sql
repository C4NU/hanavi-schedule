-- Update existing members with sort orders based on broadcast time

UPDATE public.characters SET sort_order = 1 WHERE id = 'varessa'; -- 08:00
UPDATE public.characters SET sort_order = 2 WHERE id = 'cherii';  -- 10:00
UPDATE public.characters SET sort_order = 3 WHERE id = 'nemu';    -- 12:00
UPDATE public.characters SET sort_order = 4 WHERE id = 'maroka';  -- 14:00
UPDATE public.characters SET sort_order = 5 WHERE id = 'mirai';   -- 15:00
UPDATE public.characters SET sort_order = 6 WHERE id = 'aella';   -- 17:00
UPDATE public.characters SET sort_order = 7 WHERE id = 'ruvi';    -- 19:00
UPDATE public.characters SET sort_order = 8 WHERE id = 'iriya';   -- 24:00
