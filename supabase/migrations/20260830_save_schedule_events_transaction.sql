-- Atomically replace canonical schedule events and their child rows.
-- The admin API authenticates the caller before invoking this service-role RPC.
create or replace function public.save_schedule_events(
    p_schedule_id uuid,
    p_events jsonb,
    p_deleted_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    event_value jsonb;
    member_value text;
    v_event_id uuid;
    v_event_day text;
    v_event_type text;
    v_start_time text;
    v_title text;
    v_video_url text;
    v_category text;
    v_member_count integer;
begin
    if not exists (select 1 from public.schedules s where s.id = p_schedule_id) then
        raise exception using errcode = '22023', message = 'Schedule does not exist';
    end if;

    -- Validate every reference before the first mutation.
    for event_value in select value from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
        v_event_day := event_value->>'day';
        v_event_type := coalesce(event_value->>'type', 'stream');
        if v_event_day not in ('MON','TUE','WED','THU','FRI','SAT','SUN') then
            raise exception using errcode = '22023', message = 'Invalid event day';
        end if;
        if v_event_type not in ('stream','off','collab','collab_external') then
            raise exception using errcode = '22023', message = 'Invalid event type';
        end if;

        select count(distinct value)::integer into v_member_count
        from jsonb_array_elements_text(coalesce(event_value->'memberIds', '[]'::jsonb));
        if v_event_type = 'collab' and v_member_count < 2 then
            raise exception using errcode = '22023', message = 'Internal collaborations require at least two members';
        elsif v_event_type = 'collab_external' and v_member_count < 1 then
            raise exception using errcode = '22023', message = 'External collaborations require at least one member';
        elsif v_event_type = 'stream' and v_member_count <> 1 then
            raise exception using errcode = '22023', message = 'Personal streams require exactly one member';
        end if;

        if nullif(event_value->>'id', '') is not null then
            v_event_id := (event_value->>'id')::uuid;
            if exists (
                select 1 from public.schedule_events e
                where e.id = v_event_id and e.schedule_id <> p_schedule_id
            ) then
                raise exception using errcode = '22023', message = 'Event belongs to another schedule';
            end if;
        end if;

        for member_value in
            select value from jsonb_array_elements_text(coalesce(event_value->'memberIds', '[]'::jsonb))
        loop
            if not exists (select 1 from public.characters c where c.id = member_value) then
                raise exception using errcode = '22023', message = 'Event member does not exist';
            end if;
        end loop;
    end loop;

    delete from public.schedule_events e
    where e.schedule_id = p_schedule_id
      and e.id = any(coalesce(p_deleted_ids, '{}'::uuid[]));

    for event_value in select value from jsonb_array_elements(coalesce(p_events, '[]'::jsonb)) loop
        v_event_id := nullif(event_value->>'id', '')::uuid;
        if v_event_id is null then
            v_event_id := extensions.uuid_generate_v4();
        end if;
        v_event_day := event_value->>'day';
        v_start_time := nullif(event_value->>'startTime', '');
        v_title := coalesce(event_value->>'title', '');
        v_event_type := coalesce(event_value->>'type', 'stream');
        v_video_url := nullif(event_value->>'videoUrl', '');
        v_category := nullif(btrim(event_value->>'category'), '');

        insert into public.schedule_events (
            id, schedule_id, day, start_time, title, type, video_url, category, updated_at
        ) values (
            v_event_id, p_schedule_id, v_event_day, v_start_time, v_title,
            v_event_type, v_video_url, v_category, now()
        )
        on conflict (id) do update set
            schedule_id = excluded.schedule_id,
            day = excluded.day,
            start_time = excluded.start_time,
            title = excluded.title,
            type = excluded.type,
            video_url = excluded.video_url,
            category = excluded.category,
            updated_at = now();

        delete from public.schedule_event_members sem where sem.event_id = v_event_id;
        insert into public.schedule_event_members (event_id, character_id, role)
        select v_event_id, value, 'member'
        from jsonb_array_elements_text(coalesce(event_value->'memberIds', '[]'::jsonb))
        on conflict (event_id, character_id) do nothing;

        delete from public.schedule_event_guests seg where seg.event_id = v_event_id;
        insert into public.schedule_event_guests (event_id, display_name)
        select v_event_id, btrim(value)
        from jsonb_array_elements_text(coalesce(event_value->'guests', '[]'::jsonb))
        where btrim(value) <> '';
    end loop;

    return jsonb_build_object(
        'upserted', jsonb_array_length(coalesce(p_events, '[]'::jsonb)),
        'deleted', coalesce(array_length(p_deleted_ids, 1), 0)
    );
end;
$$;

revoke all on function public.save_schedule_events(uuid, jsonb, uuid[]) from public;
grant execute on function public.save_schedule_events(uuid, jsonb, uuid[]) to service_role;
