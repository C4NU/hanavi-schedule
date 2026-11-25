-- 모바일 제보의 재시도와 요청 제한을 한 트랜잭션에서 처리한다.
create schema if not exists hanavi_mobile;
grant usage on schema hanavi_mobile to service_role;

create table hanavi_mobile.memo_requests (
    request_id uuid primary key,
    requester text not null,
    target_kind text not null check (target_kind in ('event', 'legacy')),
    target_id uuid not null,
    memo_id uuid references public.schedule_item_memos(id) on delete set null,
    created_at timestamptz not null default now()
);

alter table hanavi_mobile.memo_requests enable row level security;
revoke all on hanavi_mobile.memo_requests from public, anon, authenticated;
grant select, insert on hanavi_mobile.memo_requests to service_role;
create index mobile_memo_requester_time on hanavi_mobile.memo_requests(requester, created_at);
create index mobile_memo_target_time on hanavi_mobile.memo_requests(target_kind, target_id, created_at);

create function public.submit_mobile_schedule_memo(
    p_request_id uuid, p_requester text, p_kind text, p_target_id uuid, p_content text, p_schedule_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
    prior hanavi_mobile.memo_requests%rowtype;
    memo public.schedule_item_memos%rowtype;
    cutoff timestamptz := now() - interval '10 minutes';
begin
    if p_request_id is null or p_target_id is null or p_schedule_id is null or p_requester is null
        or p_requester !~ '^[0-9a-f]{64}$' or p_kind is null or p_kind not in ('event', 'legacy')
        or p_content is null or char_length(p_content) not between 1 and 100
        or btrim(p_content) = '' or p_content ~ '[[:cntrl:]]' then
        return jsonb_build_object('outcome', 'invalid');
    end if;

    perform pg_advisory_xact_lock(hashtextextended('mobile-memo-request:' || p_request_id, 0));
    select * into prior from hanavi_mobile.memo_requests where request_id = p_request_id;
    if found then
        select * into memo from public.schedule_item_memos where id = prior.memo_id;
        if found and prior.target_kind = p_kind and prior.target_id = p_target_id and memo.content = p_content then
            return jsonb_build_object('outcome', 'existing', 'memo', to_jsonb(memo));
        end if;
        return jsonb_build_object('outcome', 'conflict');
    end if;

    perform pg_advisory_xact_lock(hashtextextended('mobile-memo-requester:' || p_requester, 0));
    perform pg_advisory_xact_lock(hashtextextended('mobile-memo-target:' || p_kind || p_target_id, 0));
    if (select count(*) from hanavi_mobile.memo_requests where requester = p_requester and created_at >= cutoff) >= 5
        or (select count(*) from hanavi_mobile.memo_requests where target_kind = p_kind and target_id = p_target_id and created_at >= cutoff) >= 20 then
        return jsonb_build_object('outcome', 'rate_limited');
    end if;

    if p_kind = 'event' then
        perform 1 from public.schedule_events where id = p_target_id and schedule_id = p_schedule_id and type <> 'off' for share;
    else
        perform 1 from public.schedule_items where id = p_target_id and schedule_id = p_schedule_id and coalesce(type, 'stream') <> 'off' for share;
    end if;
    if not found then return jsonb_build_object('outcome', 'not_found'); end if;

    insert into public.schedule_item_memos (event_id, schedule_item_id, content)
    values (case when p_kind = 'event' then p_target_id end, case when p_kind = 'legacy' then p_target_id end, p_content)
    returning * into memo;
    insert into hanavi_mobile.memo_requests (request_id, requester, target_kind, target_id, memo_id)
    values (p_request_id, p_requester, p_kind, p_target_id, memo.id);
    return jsonb_build_object('outcome', 'created', 'memo', to_jsonb(memo));
end;
$$;

revoke all on function public.submit_mobile_schedule_memo(uuid, text, text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.submit_mobile_schedule_memo(uuid, text, text, uuid, text, uuid) to service_role;
