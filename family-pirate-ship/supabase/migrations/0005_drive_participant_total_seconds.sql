-- Family Pirate Ship — per-participant total_seconds
--
-- Why: total_minutes (integer) was the only duration column, forcing the
-- client to round seconds→minutes at write time. That introduced two bugs:
--   1. Math.round(x/60) + Math.round(y/60) != Math.round((x+y)/60), so the
--      sum of per-pirate rounded minutes (what toV2Drive used for totalMin)
--      could exceed — or differ from — the locally-stored total, causing
--      history rows to "shift" after a focus pull.
--   2. Listening under 60 seconds was either silently dropped (floor) or
--      inflated to "1 min" (round), both of which feel wrong in the UI.
--
-- Fix: store the raw whole seconds alongside the rounded minutes. The client
-- derives display minutes with Math.floor(total_seconds / 60) at read time.
-- Invariant this restores: max(per-pirate minutes) ≤ total voyage minutes.

alter table drive_participant
  add column if not exists total_seconds integer not null default 0
    check (total_seconds >= 0);

-- Backfill existing rows from total_minutes. Over-counts sub-minute listens
-- by at most 59s per row, which matches the pre-fix display — no history
-- row suddenly changes shape for the user.
update drive_participant
   set total_seconds = total_minutes * 60
 where total_seconds = 0
   and total_minutes > 0;
