# Telemetry plan — first-party diagnostics into Supabase

**Written:** 2026-09-20
**Scope decision:** Level 2 — full diagnostics channel. Client stays write-only; reads happen from the Supabase dashboard / service role.
**Status:** shipped 2026-09-22. All nine steps done: migration applied to Supabase,
build deployed, toggle confirmed visible and on in Settings. Remaining verification is
observational — watch real rows arrive and confirm they carry no PII.

---

## 1. Why the existing schema isn't enough

`event` (`0001_init.sql:105`) is `id`, `family_id_hash`, `event_name`, `occurred_at`, with `event_name` constrained to eight business events. No payload, no error event, no session, no device context. `0002_rls_policies.sql:81` gives it no SELECT policy — write-only by design.

Fully wired, last week's Android crash would have produced `drive_started` and then silence.

That table is fine at what it is — privacy-preserving product analytics. It stays as-is. Diagnostics get their own table, their own retention, and their own RPC.

## 2. The failure class this is actually aimed at

The Android bug was **silent state loss, not an exception**. Nothing threw. An `ErrorBoundary`, `window.onerror`, or a third-party crash reporter would all have stayed quiet.

This app is structurally prone to that failure: an in-memory store, an offline-first queue, and a browser that can discard the tab at any moment. So the instrumentation has to cover two different things:

- **Error capture** — the unknown-unknowns. Cheap, standard, catches real exceptions.
- **Lifecycle integrity** — voyages that start and never end, voyages resumed from a snapshot, snapshots dropped as stale, storage writes that fail. This is the part that would have caught both shipped bugs, and it's the part a crash reporter doesn't give you.

`drive_resumed` carrying `gapSec` is the single highest-value signal in this plan: it measures how often tabs are being discarded mid-voyage, and for how long, directly validating the fix that just shipped.

## 3. Schema

New migration: `supabase/migrations/0007_diagnostics.sql`.

```sql
create table app_diagnostic (
  id             bigserial primary key,
  family_id_hash text,                 -- null: the error happened before auth resolved
  session_id     text not null,        -- random per page load; correlates a story
  seq            integer not null,     -- monotonic within session; device clocks lie
  level          text not null check (level in ('error','warn','info')),
  code           text not null,        -- closed enum, mirrored in TS (§4)
  detail         text,                 -- scrubbed + truncated; see §5
  context        jsonb,                -- allowlisted keys, numeric/enum values only
  app_version    text not null,
  platform       text,                 -- coarse bucket only: 'android-chrome', 'ios-safari', ...
  occurred_at    timestamptz not null, -- client clock, when it happened
  received_at    timestamptz not null default now()  -- server clock, when it arrived
);

create index app_diagnostic_time_idx    on app_diagnostic(received_at desc);
create index app_diagnostic_code_idx    on app_diagnostic(code, received_at desc);
create index app_diagnostic_session_idx on app_diagnostic(session_id, seq);

alter table app_diagnostic enable row level security;
-- No policies at all. Inserts go through record_diagnostics() only; no client
-- can read this table back. Same posture as `event`.
```

**Why both `occurred_at` and `received_at`:** buffered events from a session that died arrive on the *next* load, sometimes much later. You need the client time to reconstruct the story and the server time to bound it. The pair also exposes device clock skew, which this codebase has already had to defend against (`driveSession.ts` clamps a future `lastTickAt`).

**Why `seq`:** within one session the device clock can jump. A monotonic counter gives reliable ordering regardless.

**Batch insert RPC** — one round trip per flush, not one per event:

```sql
create or replace function record_diagnostics(rows jsonb)
returns void language plpgsql security definer as $$
begin
  insert into app_diagnostic (family_id_hash, session_id, seq, level, code,
                              detail, context, app_version, platform, occurred_at)
  select
    nullif(r->>'family_id_hash','')::text,
    r->>'session_id',
    (r->>'seq')::int,
    r->>'level',
    r->>'code',
    left(r->>'detail', 300),          -- server-side cap; never trust the client
    (r->'context')::jsonb,
    r->>'app_version',
    r->>'platform',
    (r->>'occurred_at')::timestamptz
  from jsonb_array_elements(rows) as r
  where r->>'session_id' is not null
    and r->>'code' is not null
    and r->>'level' in ('error','warn','info')
  limit 50;                            -- cap per call
end;
$$;
```

### Known trade-off: the RPC is open to the anon key

`record_event` is already `security definer` with no auth check, and the anon key ships in the client bundle — so anyone can insert rows. `record_diagnostics` inherits that. Mitigations built in above: server-side `left(..., 300)` truncation, a 50-row cap per call, and a closed `level` check. Full abuse prevention needs an Edge Function with rate limiting, which is disproportionate for a family app with five users. **Recommendation: accept, document, and revisit if the table ever fills with junk.** Flagging it so it's a decision rather than an oversight.

### Retention

Free tier is 500MB. This table is the one that grows.

```sql
select cron.schedule('purge-diagnostics', '0 3 * * *', $$
  delete from app_diagnostic where received_at < now() - interval '90 days'
$$);
```

Needs `pg_cron` enabled on the project. If unavailable, fall back to a scheduled Edge Function or a manual quarterly delete.

## 4. Event codes — the closed enum

Codes live in `src/telemetry/codes.ts` as a TypeScript union with a per-code context type. There is no free-form logging path; `record()` won't type-check with an unknown code.

Grounded in the seams this codebase actually has — most of these are places that today only `console.warn` (17 such sites).

**Errors**
| Code | Level | Context |
|---|---|---|
| `unhandled_error` | error | `{ line, col }` |
| `unhandled_rejection` | error | — |
| `render_error` | error | `{ stackDepth }` |

**Drive lifecycle integrity** — the class that has bitten twice
| Code | Level | Context |
|---|---|---|
| `drive_started` | info | `{ participantCount }` |
| `drive_ended` | info | `{ durationSec, tier, participantCount }` |
| `drive_resumed` | warn | `{ gapSec, totalSec }` ← the money signal |
| `drive_snapshot_dropped` | warn | `{ gapSec }` |
| `drive_guard_redirect` | warn | — (cold reload with nothing to resume) |

**Storage**
| Code | Level | Context |
|---|---|---|
| `storage_write_failed` | error | `{ key }` — today `driveSession` swallows this silently |
| `idb_write_failed` | error | `{ op }` |

**Sync health**
| Code | Level | Context |
|---|---|---|
| `sync_flush_failed` | warn | `{ queueDepth, attempt }` |
| `sync_queue_backlog` | warn | `{ depth }` |
| `pull_failed` | warn | — |

**Auth seams**
| Code | Level | Context |
|---|---|---|
| `stale_jwt_signout` | warn | — (`authStore.ts` force-sign-out branch) |
| `family_lookup_failed` | error | — (the `FamilyLookupError` path) |

**Session**
| Code | Level | Context |
|---|---|---|
| `app_opened` | info | `{ platform, resumedDrive }` |

Note `drive_started` / `drive_ended` deliberately duplicate two of the eight `event` enum names. They serve different queries: `event` answers "how many voyages this month", `app_diagnostic` answers "this specific session started a voyage and never finished it." Keep both; they're cheap.

## 5. Privacy — the payload is the entire risk

**Pirate names are children's names.** An error string that interpolates state puts them in a diagnostics table. Rules:

1. **`context` is allowlisted per code** and holds numbers and enums only. No strings from user data. Enforced by the TypeScript types in `codes.ts`.
2. **`detail` is scrubbed then truncated to 300 chars**, client-side and again server-side. The scrubber (`src/telemetry/scrub.ts`) removes, in order:
   - email addresses
   - UUIDs (family, user, pirate, drive ids)
   - **every current pirate name**, matched case-insensitively against `piratesStore`
   - the family name
3. **No store dumps, ever.** There is no `record('debug', {state})` escape hatch.
4. `platform` is a coarse bucket derived from the UA, not the UA string.
5. `family_id_hash` keeps the existing scheme: `SHA-256(VITE_TELEMETRY_HASH_SALT + familyId)`. You can compute your own family's hash locally to filter your rows in the dashboard.

Nothing here changes the published posture: still first-party, still EU-region, still no third-party analytics, still no ad/marketing SDKs. `README.md:27` and product-spec §6 stay true as written.

### Source maps

The build is minified, so a raw stack trace reads `index-BuaT9b9Y.js:1:12345` — noise without a map.

**Settled: skip stacks.** Diagnostics carry `error.name`, a scrubbed message, and the breadcrumb trail — no frames, no maps, no release-artifact process. The breadcrumb trail is what makes stacks optional here. Revisit only if it proves insufficient in practice.

## 6. Client architecture

```
src/lib/hash.ts                  SHA-256 via Web Crypto (async) → cached module-level
src/telemetry/codes.ts           closed union + per-code context types
src/telemetry/scrub.ts           PII scrubbing (§5)
src/telemetry/buffer.ts          ring buffer in localStorage, session id, seq counter
src/telemetry/record.ts          the only public API: record(code, context?)
src/telemetry/flush.ts           batched RPC, fire-and-forget
src/api/telemetry.ts             supabase wrappers: record_event, record_diagnostics
src/components/ErrorBoundary.tsx render-error fallback (none exists today)
src/hooks/useTelemetry.ts        mounts global handlers + flush schedule
```

**Buffer before send.** Ring buffer, cap 50, in `localStorage` under `pirate-ship-telemetry-v1`, written synchronously on every `record()`. This is the part that makes a dead session debuggable: the events are on disk when the tab is discarded, and get flushed on the *next* load. Same lesson as `driveSession` — synchronous writes, lifecycle flushes, tolerate quota failure silently.

Flush triggers: on app load (drains the previous session), on `visibilitychange → hidden`, on `pagehide`, and every 30s while active.

**Never touch the sync queue.** A failing diagnostics write must not poison the queue that carries real drives. Separate path, separate storage key, fire-and-forget, never throws, never awaited by app code.

**Hashing is async.** `crypto.subtle.digest` returns a promise, so `family_id_hash` is computed once when the family resolves and cached in a module variable. Events recorded before that carry `null` — which is correct and intentional, since early-startup crashes are exactly the interesting ones.

## 7. Gating on `telemetryEnabled`

The flag exists in `family_settings` (default `true`) and round-trips through `src/api/settings.ts`, but `settingsStore` holds it **in memory only**, hydrated from the server — so it's unknown during the early-startup window where the most interesting crashes happen.

- Mirror it to `localStorage` on every hydrate, so it's known at next startup.
- **Always buffer locally; only flush when the flag is known-true.** Events buffered while the flag is unknown are dropped if it resolves false. Nothing leaves the device before consent is known.
- **Open decision: one toggle or two?** Proposed: one, covering analytics and diagnostics together — simpler to explain, and the product spec already promises a single round-trippable flag. Expose it in Settings (it is currently not exposed anywhere).

## 8. Build id

Nothing stamps a version today; `vite.config.ts` has no `define` and no code reads one. Without it, "which build produced this error" is unanswerable.

```ts
// vite.config.ts
define: {
  __APP_VERSION__: JSON.stringify(`${pkg.version}+${gitShaShort()}`),
}
```
with `declare const __APP_VERSION__: string` in `src/vite-env.d.ts`, and a `'dev'` fallback when git isn't available. Independently useful; do it first.

## 9. Order of work

1. **Build id stamping** — independent, small, useful on its own.
2. **Migration `0007_diagnostics.sql`** + `record_diagnostics` RPC; apply to Supabase; confirm `pg_cron` availability for the purge job.
3. **`codes.ts`, `scrub.ts`, `buffer.ts`** with tests — pure modules, no React, no network. The scrubber especially: test that pirate names, emails and UUIDs are removed and that truncation holds.
4. **`record.ts` / `flush.ts` / `api/telemetry.ts`** — gating, batching, fire-and-forget. Test that a failing flush never throws and never touches the sync queue.
5. **`ErrorBoundary` + global handlers** in `useTelemetry`, mounted from `App.tsx`'s `Shell` alongside `useDriveSessionPersistence`.
6. **Instrument the seams** from §4 — mostly adding a `record()` next to an existing `console.warn`, plus the currently-silent `catch` in `driveSession.saveDriveSession`.
7. **Settings toggle** wired to the existing `telemetryEnabled` flag.
8. **Retention job.**
9. **Verify end-to-end:** throw a deliberate error behind a dev-only tweak, confirm the row lands in Supabase with the expected shape and no PII; then kill a tab mid-voyage and confirm the buffered events arrive on next load.

## 10. Testing notes

- `vitest` runs with `globals: false` — any test rendering components must call `cleanup()` in its own `afterEach` (see HANDOFF-v11).
- The buffer tests should cover: ring cap eviction, survival across a simulated reload, and silent tolerance of a throwing `localStorage` (mock `Storage.prototype.setItem`), mirroring `driveSession.test.ts`.
- An integration test worth having: record → simulate reload (`vi.resetModules()` + fresh import) → assert the previous session's events are still in the buffer and get flushed.

## 11. Decisions (settled 2026-09-22)

1. **Source maps — skip.** No stack traces. Diagnostics carry `error.name`, a scrubbed message, and the breadcrumb trail. No release-artifact process, no hidden maps. Revisit only if the breadcrumbs prove insufficient in practice.
2. **Retention — 90 days.**
3. **One toggle.** The existing `telemetryEnabled` flag gates analytics and diagnostics together.
4. **Anon-key insert — accepted.** Server-side truncation, the 50-row cap and the closed `level` check are the mitigations. No Edge Function, no rate limiting. Revisit if the table ever fills with junk.

## 12. Estimate

Two to three focused sessions. Steps 1–4 are the bulk and are all pure, testable modules. Steps 5–7 are wiring. Step 9 needs a real device for the eviction half.
