revoke all on function public.save_schedule_events(uuid, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.save_schedule_events(uuid, jsonb, uuid[]) to service_role;
