-- Keep replay categories in the canonical event model as schedule_items is frozen.
ALTER TABLE public.schedule_events
    ADD COLUMN IF NOT EXISTS category text;
