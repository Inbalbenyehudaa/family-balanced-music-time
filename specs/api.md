# API wrappers — `src/api/*.ts`

One file per domain. Every wrapper goes through the single `supabase` client in `api/client.ts`. Every error passes through `api/errors.ts::mapError` so callers (stores, worker) see an `AppError` with a normalized code instead of a raw PostgREST shape.

Shape-translation pattern: server rows are snake_case and use timestamp strings; app types are camelCase and use numeric millisecond timestamps. Each file that reads from the DB defines a local `FooRow` interface and a `toFoo(row)` function. Writes go the other way via inline objects.

## `client.ts`

Creates and exports the singleton Supabase client with `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`. Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from import.meta.env. The anon key is safe in the browser — every table is gated by RLS.

## `errors.ts`

Defines `AppError { code, message, cause }` with codes:

- `CONFLICT` — mapped from Postgres `23505` (unique violation)
- `NOT_FOUND` — mapped from `PGRST116` (no row via `.single()`)
- `FORBIDDEN` — mapped from `42501` (permission denied / RLS rejection)
- `NETWORK` — any error whose message matches `/network|fetch|failed to fetch/i`
- `UNAUTHENTICATED` — messages matching `/unauth|jwt/i`
- `UNKNOWN` — anything else

`isTransient(err)` returns true for `NETWORK` and `UNKNOWN`. The sync worker uses this to decide "retry this write later" vs. "drop it from the queue."

## `auth.ts`

- `signInWithGoogle()` — calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: ${origin}/auth/callback } })`. Browser leaves the SPA; Supabase handles the hash on return.
- `signOut()` — `supabase.auth.signOut()`.
- `onAuthChange(cb)` — subscribes to `onAuthStateChange`, invokes `cb(AuthUser | null, Session | null)`. Returns an unsubscribe function. Note: Supabase fires this synchronously with `INITIAL_SESSION` on subscribe and again on every token refresh (~55 min), which `useAuthBootstrap` deduplicates by user id.
- `getSession()` — `{ session, user }`; used by bootstrap to resolve the session at app open.
- Private `toAuthUser(User)` maps the Supabase user to the app's `AuthUser { id, email, displayName }`. `displayName` is pulled from `user_metadata.full_name || user_metadata.name || email`.

## `families.ts`

- `createFamily(name) → string` — calls the `create_family` RPC, returns the new family id.
- `getMyFamily() → Family | null` — queries `family_member` filtered by `user_id = auth.uid()` (not relying on RLS scoping alone, because in a multi-member family RLS returns all members and breaks `.single()`). Joins `family` via `family:family_id(...)`, returns the first (or null).
- `getMyFamilyAndRole() → { family, role } | null` — same as above but also returns the caller's role. This is what `authStore.refreshFamily` actually calls.
- `wipeFamilyData(familyId) → void` — calls the `reset_family_data` RPC. The `familyId` argument is informational only; the RPC derives the family from `auth.uid()` and enforces ownership server-side. Direct DELETEs from the client would silently match zero rows (RLS denies DELETE on `drive`/`island_unlocked`/`coastal_find_found`), and the UI would re-hydrate the old data on the next pull.
- `listMembers(familyId) → FamilyMember[]` — lean version that reads `family_member` directly. Returns empty strings for `email` and `displayName` because `auth.users` isn't readable via client RLS. Used as a fallback when `list_family_members_with_profile` RPC is missing on older DBs.

## `pirates.ts`

- `listPirates(familyId) → Pirate[]` — reads the family's three `pirate` rows; sorts them kid → mom → dad. Maps the stored `flag_color` (`'red'|'green'|'purple'`) to a CSS hex via a lookup map, and the `slot` to a Hebrew role string.
- `updatePirate({ familyId, slot, name?, flagColor? }) → void` — partial UPDATE on `(family_id, slot)`. Stamps `updated_at`. The enqueue path sends only `name` today (the pirates store doesn't yet expose flag-color editing to users).

## `drives.ts`

- `insertDrive(record: DriveRecord) → void` — two-step insert: first the `drive` row, then N `drive_participant` rows. Postgres can't transactionally insert across tables via PostgREST, so if the second step fails the drive exists without participants — the retry from the sync worker will complete it on the next flush. Both steps tolerate `23505` (unique violation) as success to support idempotent retry. The client-generated `drive.id` UUID is what makes this safe.
- `listDrives(familyId) → Drive[]` — three queries: all `drive` rows for the family (ordered `started_at ASC`), all `drive_participant` rows for those drive ids, and all `pirate` rows for the family. Assembles a `pirate_id → slot` map, then maps each drive into the v2 `Drive` shape: server `tier` (`TierV3`) is mapped back to the legacy `fair | coastal | harbor` triple via `tierV3ToLegacy`; `perPirate` is rebuilt in SLOT_ORDER (`kid`, `mom`, `dad`) from the slot map so the Settings history "top participant" points at the right pirate regardless of Postgres join order; display minutes come from `Math.floor(total_seconds / 60)`, with a fallback to `total_minutes * 60` for pre-0005 rows where `total_seconds = 0`.

## `islands.ts`

- `recordUnlock({ familyId, islandId, driveId }) → void` — INSERT into `island_unlocked`. Treats `23505` as success (idempotent retry).
- `recordCoastalFind({ familyId, findId, driveId }) → void` — INSERT into `coastal_find_found`. Same 23505 handling.
- `renameIsland({ familyId, islandId, customName }) → void` — UPDATE `island_unlocked.custom_name`. See `architecture.md` §6 — the RLS policy for this UPDATE is missing; call exists but won't actually persist today.
- `listUnlocked(familyId) → string[]` — SELECT `island_id` for the family.
- `listCoastalFinds(familyId) → string[]` — SELECT `find_id` for the family.

## `settings.ts`

- `getSettings(familyId) → Settings | null` — SELECT from `family_settings`, `maybeSingle`.
- `updateSettings(familyId, patch: Partial<Settings>) → void` — partial UPDATE with a hand-rolled column translation (`fairWindsThreshold → fair_winds_threshold`, etc.). Only includes columns present in the patch so unrelated fields aren't clobbered.

## `invites.ts`

Phase 4 invite flow. Mix of Edge Function call (create) + RPCs (revoke, accept, list, remove).

- `createInvite(email, familyId) → { inviteId, resent }` — calls the `invite-family-member` Edge Function via `supabase.functions.invoke`. On failure, tries to recover the JSON body from the `FunctionsHttpError`'s `.context` (a Response), so the caller sees our server code (`ALREADY_MEMBER`, `IN_OTHER_FAMILY`, `FAMILY_FULL`, `RATE_LIMITED`, etc.) instead of a generic "non-2xx" message. The failure path throws a plain Error with a `code` property attached; not all error paths produce an `AppError` here (unlike the rest of the API).
- `acceptInvite(inviteId) → { familyId, alreadyMember }` — calls the `accept_invite` RPC. On `/already used|already belong/i` it probes `family_member` to find which family the caller is already in and returns `alreadyMember: true` — idempotent UX so a double-tap of the invite link doesn't look like a failure.
- `revokeInvite(inviteId) → void` — `revoke_invite` RPC. Idempotent on missing row.
- `findPendingInviteForMe() → { id, familyId } | null` — queries `family_invite` directly (using the invitee RLS policy that matches `invitee_email = auth.jwt() ->> 'email'`). Returns the most recent unexpired invite or null. Used by `FamilyNaming` and `AuthCallback` as a server-authoritative safety net for the invite redirect (the sessionStorage latch is best-effort).
- `listPendingInvites() → PendingInvite[]` — `list_pending_invites` RPC. Owner-only (the RPC returns zero rows for non-owners). Consumed by Settings.
- `listMembersWithProfile() → FamilyMember[]` — `list_family_members_with_profile` RPC. Returns the roster enriched with email + display-name from `auth.users`.
- `removeMember(userId) → void` — `remove_family_member` RPC. Owner-only; can't target self.

## What's not here

- No `transferOwnership` wrapper (the RPC exists but has no caller).
- No `deleteFamily` wrapper (same).
- No telemetry wrapper. The `record_event` RPC exists; Phase 5 will add `src/api/telemetry.ts` and a `src/lib/hash.ts`.
- No `members.ts` — Phase 4 kept member ops in `invites.ts` because they share the role/ownership context. A split is reasonable later but hasn't happened.
