-- Add video_url column to schedule_items to store YouTube links
alter table public.schedule_items 
add column if not exists video_url text;

-- Add a comment to the column
comment on column public.schedule_items.video_url is 'YouTube replay or video link';
