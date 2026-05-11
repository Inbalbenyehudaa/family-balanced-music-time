# Architecture — module boundaries, data model, backend

Companion to `developer-spec.md`. This doc focuses on the Supabase side (schema, RLS, RPCs, Edge Function) and how the frontend modules relate to each other.

## 1. Module boundaries

```
┌──────────────────────────┐
│       screens/           │   v2 UI (Drive, Spyglass, Reveal, Map, Settings…)
│                          │   + v3 auth screens (SignIn, AuthCallback,
│                          │     FamilyNaming, InviteAccept)
└──────────┬───────────────┘
           │ read via selectors,
           │ write via store actions
┌──────────▼───────────────┐
│       store/ (Zustand)   │   authStore · piratesStore · drivesStore ·
│                          │   settingsStore · syncStore
└────┬─────────────────┬───┘
     │ direct API call │ enqueue(kind, payload)
     │ (hydration /    │
     │  auth flows)    ▼
     │          ┌──────────────┐      ┌──────────────┐
     │          │ sync/queue   │◀─────│ sync/worker  │
     │          │ (idb-keyval) │      │ (dispatch)   │
     │          └──────────────┘      └──────┬───────┘
     │                                       │ calls
     ▼                                       ▼
┌──────────────────────────────────────────────────────┐
│            src/api/*.ts (Supabase wrappers)           │
│   auth · families · pirates · drives · islands ·      │
│   invites · settings  (all → supabase client)         │
└─────────────────────────┬────────────────────────────┘
                          │
                  ┌───────▼────────┐
                  │ Supabase (EU)  │  Postgres + Auth + RLS + Edge Functions
                  └────────────────┘
```

Key invariant: **screens never touch the API layer directly.** They go through a store. Writes that must survive offline go through `syncStore.enqueue` → `sync/worker` → `api/*`. Writes that don't (auth flows, `createFamily`, the reset-family sequence) skip the queue and call the API directly from the store or from a helper (e.g. `sync/resetFamily.ts`). The `sync/pull.ts` module reads from multiple API files in parallel and writes directly into the four data stores through their non-enqueueing setters (`setPirates`, `hydrateSettings`, `useDrivesStore.setState`).

Dynamic imports are used in two places to avoid load-order cycles: `syncStore.ts` lazy-imports `sync/queue.ts` + `sync/worker.ts`, and `useSyncOnFocus.ts` lazy-imports `sync/pull.ts`. Neither is a bundle-split optimization — it's purely to keep the dependency graph acyclic when tests stub one of those modules.

## 2. Data model

The schema is defined in six SQL migration files under `family-pirate-ship/supabase/migrations/`. They're authoritative — if this doc and the SQL disagree, the SQL wins.

### 2.1 Tables (from `0001_init.sql` + `0005_drive_participant_total_seconds.sql`)

**`family`** — one row per family.
- `id uuid pk`, `name text (1–60 chars)`, `owner_user_id uuid → auth.users(id) ON DELETE RESTRICT`, `created_at`, `updated_at`.

**`family_member`** — membership + role.
- Composite PK `(family_id, user_id)`.
- `family_id uuid → family ON DELETE CASCADE`, `user_id uuid → auth.users ON DELETE CASCADE`, `role text CHECK (role IN ('owner','member'))`, `joined_at`.
- Unique index `family_member_one_per_user` on `user_id` — enforces one-family-per-user at the DB level.

**`family_invite`** — pending invitations.
- `id uuid pk`, `family_id → family CASCADE`, `invitee_email text`, `invited_by_user uuid → auth.users CASCADE`, `expires_at timestamptz DEFAULT now() + 7 days`, `accepted_at timestamptz nullable`, `created_at`.
- Partial index on `invitee_email WHERE accepted_at IS NULL` for the invitee-lookup path.

**`pirate`** — three rows per family (one per slot).
- `id uuid pk`, `family_id → family CASCADE`, `slot text CHECK (slot IN ('kid','mom','dad'))`, `name text (1–40 chars)`, `flag_color text CHECK (flag_color IN ('red','green','purple'))`, `updated_at`.
- Unique `(family_id, slot)` — one pirate per slot per family.

**`drive`** — one row per completed drive.
- `id uuid pk` (client-generated UUID, enabling idempotent inserts — see §3 of `sync.md`).
- `family_id → family CASCADE`, `started_at`, `ended_at`, `biggest_share double precision CHECK 0..1`, `tier text CHECK IN ('fair_winds','coastal','harbor','solo')`, `island_unlocked_id text nullable`, `coastal_find_id text nullable`, `created_at`, `created_by_user_id uuid → auth.users ON DELETE RESTRICT`.
- Index `(family_id, started_at DESC)` for history lists.

**`drive_participant`** — N rows per drive (one per pirate).
- Composite PK `(drive_id, pirate_id)`.
- `drive_id → drive CASCADE`, `pirate_id → pirate CASCADE`, `participated boolean`, `total_minutes int >= 0`, `total_seconds int >= 0` (added in `0005`, backfilled from `total_minutes * 60`), `tap_count int >= 0`.

**`island_unlocked`** — per-family unlocks.
- Composite PK `(family_id, island_id)`.
- `family_id → family CASCADE`, `island_id text` (string id from `data.ts`), `custom_name text nullable` (for the rename flow), `unlocked_at`, `drive_id uuid → drive ON DELETE SET NULL`.

**`coastal_find_found`** — per-family finds.
- Composite PK `(family_id, find_id)`. Same shape as `island_unlocked` minus `custom_name`.

**`family_settings`** — one row per family.
- PK `family_id → family CASCADE`.
- `fair_winds_threshold DEFAULT 0.6`, `harbor_threshold DEFAULT 0.75`, `audio_enabled DEFAULT true`, `fog_enabled DEFAULT true`, `minimum_drive_minutes DEFAULT 2`, `telemetry_enabled DEFAULT true`, `updated_at`.
- CHECK `fair_winds_threshold < harbor_threshold`.

**`event`** — append-only telemetry.
- `id bigserial`, `family_id_hash text` (salted hash computed client-side, never the raw family id), `event_name text CHECK IN ('app_opened','drive_started','drive_ended','island_unlocked','coastal_found','invite_sent','invite_accepted','member_left')`, `occurred_at`.
- Index `(event_name, occurred_at DESC)`.
- **No RLS SELECT policy** — clients cannot read the table back (only insert via the `record_event` RPC). Telemetry writes themselves aren't wired up in the client yet (Phase 5).

### 2.2 Cascade-delete chain

Deleting a `family` row cascades through **every user-data table**: `family_member`, `family_invite`, `pirate`, `drive` (which in turn cascades to `drive_participant`), `island_unlocked`, `coastal_find_found`, `family_settings`. The `delete_family()` RPC (see §4) is what actually triggers this for owners; the owner's `family_member` row uses `ON DELETE CASCADE` on both `family_id` and `user_id`, while `family.owner_user_id` uses `ON DELETE RESTRICT` so you can't delete an `auth.users` row without first calling `delete_family`.

`drive.created_by_user_id` is also `ON DELETE RESTRICT` and `drive.island_unlocked_id` / `coastal_find_id` are plain `text` (not FKs). `island_unlocked.drive_id` and `coastal_find_found.drive_id` are `ON DELETE SET NULL`, so wiping drives via `reset_family_data` leaves unlock rows intact but unlinked from a drive.

## 3. Row Level Security (`0002_rls_policies.sql` + deltas in `0006`)

Every table has RLS enabled. Two SQL helper functions scope access to the caller's family:

```sql
is_family_member(fid uuid) → boolean   -- exists(family_member where family_id=fid and user_id=auth.uid())
is_family_owner(fid uuid)  → boolean   -- same, plus role='owner'
```

Both are `STABLE SECURITY DEFINER`. They're what every policy reduces to.

### Policy summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `family` | members | ← via RPC | owner | ← via RPC |
| `family_member` | members | ← via RPC | — | ← via RPC |
| `family_invite` | members **or** invitee (via JWT email) | members | invitee (only own) | owner (added `0006`) |
| `pirate` | members | ← via RPC | members | — |
| `drive` | members | members | — | — |
| `drive_participant` | members (via drive join) | members (via drive join) | — | — |
| `island_unlocked` | members | members | — | — |
| `coastal_find_found` | members | members | — | — |
| `family_settings` | members | ← via RPC | members | — |
| `event` | **none** | — (RPC only) | — | — |

"← via RPC" means the policy intentionally doesn't exist; the only path to insert/update/delete is a `SECURITY DEFINER` RPC that does its own authorization.

Important subtleties:

- The `family_member` SELECT policy scopes rows by membership of the same family — so in a multi-member family you see *all* member rows, not just your own. `api/families.ts::getMyFamily` explicitly filters by `user_id = auth.uid()` so `.maybeSingle()` works; relying on RLS alone would have returned two rows and thrown.
- `family_invite` SELECT has two OR-branches so both existing members (to see the pending-invite list) and the invitee themselves (to accept via the `/invite/:id` screen before they're a member) can read their row.
- `island_unlocked` / `coastal_find_found` have no UPDATE or DELETE policy. The rename-island flow goes through `api/islands.ts::renameIsland` which is an UPDATE — but there's no RLS policy allowing it, so this call currently fails against a policy-enabled database. (See §6 "Inconsistencies worth flagging.")
- `event` has no SELECT policy — clients can never read events back, only write through `record_event`.

## 4. RPCs

### From `0003_rpc_functions.sql`

- **`check_family_member_cap()`** (trigger on `family_member` BEFORE INSERT) — rejects inserts that would push membership past 5.
- **`create_family(family_name text) → uuid`** (security definer) — rejects if caller already has a family_member row; inserts the family + owner `family_member` + three default pirates + default `family_settings`. Returns the new family id. Called by `api/families.ts::createFamily`.
- **`accept_invite(invite_id uuid) → uuid`** (security definer) — validates not-expired / not-used, checks JWT `email` matches `invitee_email`, enforces one-family-per-user, inserts the `family_member` row with role `member`, stamps `accepted_at`. Returns the joined family id. Called by `api/invites.ts::acceptInvite`.
- **`transfer_ownership(target_user_id uuid) → void`** (security definer) — caller must be owner, target must be a member; swaps roles and updates `family.owner_user_id`. **Not currently wired to any UI or API wrapper** (no caller in `src/`).
- **`delete_family() → void`** (security definer) — caller must be owner; deletes the family row, cascade does the rest. **Not currently wired to any UI or API wrapper.**
- **`record_event(family_id_hash text, event_name text) → void`** (security definer) — inserts into `event`. **Not currently wired** (Phase 5).

### From `0004_reset_family_data.sql`

- **`reset_family_data() → void`** (security definer) — caller must be owner; deletes rows from `drive`, `island_unlocked`, `coastal_find_found` for the caller's family. `drive_participant` is cleaned up by the CASCADE on `drive`. Called by `api/families.ts::wipeFamilyData` (which is itself called by `sync/resetFamily.ts`).

### From `0006_invites.sql`

- **`revoke_invite(invite_id uuid) → void`** (security definer) — caller must be owner of the invite's family; deletes the invite row; idempotent on missing row; errors if the invite was already accepted.
- **`remove_family_member(target_user_id uuid) → void`** (security definer) — caller must be owner; target must not be self (must delete the family instead); deletes the target's `family_member` row. Historical drives stay attached via `drive.created_by_user_id` because `auth.users` rows persist.
- **`list_family_members_with_profile() → TABLE(user_id, email, display_name, role, joined_at)`** (security definer) — returns the caller's family roster enriched with email + display-name from `auth.users` (which is not readable via normal PostgREST). Empty result when the caller has no family.
- **`find_family_for_email(p_email text) → uuid`** (security definer, `service_role` only) — used exclusively by the Edge Function; looks up which family an email belongs to, or null. Authenticated users are explicitly denied execute.
- **`list_pending_invites() → TABLE(id, invitee_email, expires_at, created_at)`** (security definer) — owner-only view of non-expired, non-accepted invites for the caller's family.

## 5. Edge Function — `invite-family-member`

Single Deno function at `supabase/functions/invite-family-member/index.ts`. Exists because `supabase.auth.admin.inviteUserByEmail` requires the `service_role` key, which cannot ship to the browser.

Request: `POST /functions/v1/invite-family-member` with `Authorization: Bearer <user-access-token>` and JSON body `{ email, familyId }`. Flow:

1. **Authenticate the caller.** Bearer token → create a user-scoped client → `auth.getUser()` → `caller.id`.
2. **Validate the body.** Email format + lowercase-normalize. Reject self-invites by matching normalized email against `caller.email`.
3. **Authorize.** Service-role client queries `family_member` for `(family_id, user_id)`; must exist and have `role = 'owner'` → else `403 NOT_OWNER`.
4. **Invariants, via service-role DB.**
   - Count members via `SELECT count(*) … head:true`; reject with `409 FAMILY_FULL` if ≥ 5.
   - Call `find_family_for_email(email)`:
     - returns `familyId` → `409 ALREADY_MEMBER`
     - returns other family → `409 IN_OTHER_FAMILY`
     - returns null → proceed
   - Look up an existing pending invite for `(family_id, invitee_email, accepted_at IS NULL)`.
5. **Write.** If a pending invite exists, extend `expires_at` by 7 days and set `resent = true`. Otherwise insert a fresh `family_invite` row.
6. **Send email.** `auth.admin.inviteUserByEmail(email, { redirectTo: ${PUBLIC_APP_URL}/invite/${inviteId} })`. On send failure, **delete the row we just inserted** (only if not `resent`) so we don't leak orphan pending invites, then return `502 RATE_LIMITED` (if the error message matches /rate|too many/i) or `502 SEND_FAILED`.
7. **Response.** `200 { inviteId, resent }` on success. Error envelope on failure is `{ error, code }` with one of: `METHOD_NOT_ALLOWED`, `MISCONFIGURED`, `UNAUTHENTICATED`, `BAD_REQUEST`, `INVALID_EMAIL`, `INVITE_SELF`, `NOT_OWNER`, `FAMILY_FULL`, `ALREADY_MEMBER`, `IN_OTHER_FAMILY`, `DB_ERROR`, `RATE_LIMITED`, `SEND_FAILED`.

Secrets: `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_APP_URL`. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are auto-injected.

## 6. Inconsistencies worth flagging

Reading the code against the migrations turned up two points where the frontend assumes something the DB doesn't currently guarantee:

1. **`api/islands.ts::renameIsland`** issues a raw UPDATE on `island_unlocked`, but `0002_rls_policies.sql` only grants SELECT + INSERT on that table — no UPDATE policy exists. Against a policy-enforced DB this call will fail silently (update with zero rows matched) rather than error, because RLS turns UPDATE-without-policy into a zero-row match. The `rename_island` queued-write kind is defined in `QueuedWriteKind` and wired into the worker dispatch, but nothing in the UI currently enqueues it, so the missing policy hasn't caused a visible bug. If the rename flow ever ships, add an UPDATE policy.
2. **Duplicate/overlapping member-list APIs.** `api/families.ts::listMembers` uses the RLS-scoped view (without emails), while `api/invites.ts::listMembersWithProfile` uses the `list_family_members_with_profile` RPC. `authStore.refreshFamily` prefers the RPC and falls back to the lean list if the RPC is missing — fine for resilience, but a reader will wonder why two exist. Phase 2 shipped the RLS query, Phase 4 added the RPC; the lean version stayed as fallback.

No other migration-vs-code inconsistencies jumped out. Everything referenced from `src/api/*.ts` matches the corresponding SQL — column names, RPC signatures, RPC return shapes — except the two cases above.
