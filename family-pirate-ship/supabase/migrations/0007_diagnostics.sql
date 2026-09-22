-- Diagnostics channel — first-party debugging telemetry.
--
-- Separate from `event` on purpose. `event` is privacy-preserving product
-- analytics: a fixed enum of eight business events, no payload, no context.
-- It answers "how many voyages this month". It cannot answer "why did the
-- app lose a voyage on this person's phone", which is what this table is for.
--
-- Same write-only posture as `event`: RLS on, no policies at all, inserts
-- only through the security-definer RPC below. No client can read it back.
-- Reads happen from the Supabase dashboard or a service-role query.

create table app_diagnostic (
  id             bigserial primary key,
  -- Null when the event predates auth resolving — early-startup failures are
  -- exactly the interesting ones, so they must still be recordable.
  family_id_hash text,
  session_id     text not null,
  -- Monotonic within a session. Device clocks jump; this does not.
  seq            integer not null,
  level          text not null check (level in ('error', 'warn', 'info')),
  -- Closed enum, mirrored in src/telemetry/codes.ts. Deliberately not a check
  -- constraint: adding a code should not require a migration, and the client
  -- is the enforcement point (record() will not type-check with an unknown
  -- code). The trade-off is that a hand-rolled insert could write anything.
  code           text not null,
  -- Scrubbed and truncated. See src/telemetry/scrub.ts — emails, UUIDs, the
  -- family name and every pirate name are stripped before this leaves the
  -- device. Pirate names are children's names.
  detail         text,
  -- Allowlisted keys per code, numeric and enum values only. Never free-form
  -- user data, never a store dump.
  context        jsonb,
  app_version    text not null,
  -- Coarse bucket ('android-chrome', 'ios-safari', ...), never the raw UA.
  platform       text,
  -- Client clock: when it happened. Buffered events from a session that died
  -- arrive on the *next* load, so this can lag received_at by a long way.
  occurred_at    timestamptz not null,
  -- Server clock: when it arrived. The pair bounds the story and exposes
  -- device clock skew.
  received_at    timestamptz not null default now()
);

create index app_diagnostic_time_idx    on app_diagnostic(received_at desc);
create index app_diagnostic_code_idx    on app_diagnostic(code, received_at desc);
create index app_diagnostic_session_idx on app_diagnostic(session_id, seq);

alter table app_diagnostic enable row level security;
-- No policies. Intentional — see the header.

-- Batch insert: one round trip per flush rather than one per event.
--
-- Known trade-off, accepted 2026-09-22: like record_event, this is reachable
-- with the public anon key, so anyone could insert rows. The mitigations are
-- the truncation, the row cap and the level check below. Closing it properly
-- needs an Edge Function with rate limiting, which is disproportionate for a
-- five-user family app. Revisit if the table ever fills with junk.
create or replace function record_diagnostics(rows jsonb)
returns void language plpgsql security definer as $$
begin
  insert into app_diagnostic (
    family_id_hash, session_id, seq, level, code,
    detail, context, app_version, platform, occurred_at
  )
  select
    nullif(r->>'family_id_hash', ''),
    r->>'session_id',
    (r->>'seq')::int,
    r->>'level',
    r->>'code',
    -- Server-side cap. The client truncates too; never trust it.
    left(r->>'detail', 300),
    case when jsonb_typeof(r->'context') = 'object' then r->'context' else null end,
    coalesce(r->>'app_version', 'unknown'),
    r->>'platform',
    coalesce((r->>'occurred_at')::timestamptz, now())
  from jsonb_array_elements(
    case when jsonb_typeof(rows) = 'array' then rows else '[]'::jsonb end
  ) as r
  where r->>'session_id' is not null
    and r->>'code' is not null
    and r->>'seq' ~ '^[0-9]+$'
    and r->>'level' in ('error', 'warn', 'info')
  limit 50;
end;
$$;

-- Retention: 90 days (settled 2026-09-22). Free tier is 500MB and this is
-- the table that grows.
--
-- Wrapped so the migration cannot fail over it. pg_cron may not be enabled on
-- this project, and whether `create extension` succeeds depends on the role
-- running the migration — neither is worth blocking the schema change. If the
-- notice below appears, either enable pg_cron from the Supabase dashboard
-- (Database -> Extensions) and re-run just this block, or run the delete
-- manually on a reminder:
--
--   delete from app_diagnostic where received_at < now() - interval '90 days';
do $$
begin
  create extension if not exists pg_cron;

  -- Idempotent: re-running the migration must not stack duplicate jobs.
  perform cron.unschedule('purge-app-diagnostic')
  where exists (select 1 from cron.job where jobname = 'purge-app-diagnostic');

  perform cron.schedule(
    'purge-app-diagnostic',
    '0 3 * * *',
    $job$delete from app_diagnostic where received_at < now() - interval '90 days'$job$
  );
exception when others then
  raise notice
    'pg_cron unavailable (%) - schedule the 90-day app_diagnostic purge manually',
    sqlerrm;
end
$$;
