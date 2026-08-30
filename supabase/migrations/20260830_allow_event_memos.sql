-- Allow a memo to target either a legacy schedule item or a canonical event.
-- Exactly one target must be present so event-backed cells can accept notes
-- without violating the legacy schedule_item_id NOT NULL constraint.
alter table public.schedule_item_memos
    alter column schedule_item_id drop not null;

-- Backfill_events historically kept both pointers. Canonical rows now use the
-- event target exclusively so the XOR constraint remains valid.
update public.schedule_item_memos
set schedule_item_id = null
where event_id is not null;

do $$
begin
    if exists (
        select 1
        from pg_constraint
        where conname = 'schedule_item_memos_target_check'
          and conrelid = 'public.schedule_item_memos'::regclass
    ) then
        alter table public.schedule_item_memos
            drop constraint schedule_item_memos_target_check;
    end if;

    alter table public.schedule_item_memos
        add constraint schedule_item_memos_target_check
        check ((schedule_item_id is not null) <> (event_id is not null));
end
$$;
