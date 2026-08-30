-- Canonical event identity is the primary key. Two broadcasts may share a
-- day/time/title (for example, separate Sunday collabs with different
-- participants), so the legacy slot-wide unique index must not reject them.
drop index if exists public.uq_schedule_events_slot;
