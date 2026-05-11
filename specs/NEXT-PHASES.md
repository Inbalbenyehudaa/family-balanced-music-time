# Family Pirate Ship — Next Phases Plan

**Status when this doc was written:** Phases 0–3 are code-complete. Phase 3 (sync) works in principle but is being debugged end-to-end right now (auth race conditions + Google OAuth allowlist issues). Once the current sign-in/loop bug is resolved, this doc picks up.

The remaining work is **Phases 4, 5, 6** from dev spec v3 §16. Each phase is independent enough that they can be done in any order, but the order below is the order dev spec §16 recommends and reflects user value.

---

## Before starting any of these phases

1. **Phase 3 must be signed-off.** You should be able to:
   - Sign in, complete a drive, see it persist on refresh
   - Sign in on a second device with the same Google account and see the same drive after a focus/refresh
   - Rename a pirate in Settings → confirm `pirate.name` updates in Supabase Studio
   - Change a threshold slider → confirm `family_settings` updates
   - Toggle airplane mode mid-drive → reveal plays, offline indicator appears, drive drains to server when connectivity returns

2. **Environment sanity check** (run once before each phase):
   ```bash
   npm run build                # clean typecheck
   npm test                     # all tests pass (currently 21)
   ```

3. **Supabase project state:** `lrushshcfkuhrecvniix` (EU). Migrations 0001/0002/0003 already applied.

---

## Phase 4 — Invites + family management (~3 hours)

**Dev spec v3 §5b + §8 + §11**. Lets a second Google account join the same family.

### Pre-requisites you need to do first

- **Add a second Google test user** to Google Cloud Console → APIs & Services → OAuth consent screen → Test users. Use your @gong account or a second @gmail account — doesn't matter, as long as it can sign in.
- **Configure the invite email template** in Supabase Dashboard → Authentication → Email Templates → Invite user. Hebrew copy in dev spec v3 §11. If Supabase's built-in template doesn't expose `{{ .FamilyName }}` / `{{ .InviterName }}` variables, defer the custom template to Phase 4.1 and use the default.

### Implementation checklist

**API layer:**
- [ ] `src/api/invites.ts`
  - `createInvite(familyId, inviteeEmail)` — inserts into `family_invite` and triggers Supabase's `admin.inviteUserByEmail` (needs Edge Function — see note below)
  - `listPendingInvites(familyId)` — reads `family_invite` where `accepted_at IS NULL` and not expired
  - `acceptInvite(inviteId)` — calls `accept_invite(invite_id)` RPC (already defined in migration 0003)
- [ ] `src/api/members.ts`
  - `removeMember(userId)` — deletes from `family_member` (no RPC needed; RLS + owner role enforces permission — but the current schema has no "owner only" delete policy on family_member. **Action: write migration 0004 adding an owner-delete policy.**)
  - `transferOwnership(targetUserId)` — calls `transfer_ownership(target_user_id)` RPC (already defined)
  - `leaveFamily()` — deletes from `family_member` where `user_id = auth.uid()` and `role = 'member'`. Owner can't leave; blocked at API layer with a clear error.
- [ ] `src/api/deletion.ts`
  - `deleteFamily()` — calls `delete_family()` RPC (already defined)

**Screens:**
- [ ] `src/screens/AcceptInvite.tsx` mounted at `/invite/:inviteId`
  - If not signed in: show "Sign in to accept invite" → Google OAuth → come back here
  - If signed in with matching email: show "Join the {familyName} family?" → confirm → call `accept_invite` RPC → route to `/home`
  - Error states: expired invite, wrong email, already in a family — each with its own clear Hebrew message (copy in dev spec §11)
- [ ] `src/screens/settings/FamilySection.tsx`
  - Family name (editable by owner, uses `update` on `family` row)
  - Members list (rendered via `FamilyMemberRow` component — kind + role + joined date)
  - "Invite a partner" — email input, validates client-side, calls `createInvite`, shows "Invite sent to {email}" banner
  - "Pending invites" subsection — shows each, with "resend" or "cancel" options (owner only)
  - Owner-only actions per member: "Remove from family" (TypedConfirm gate), "Transfer ownership" (confirmation + warning)
  - "Leave family" button for non-owner members
  - "Delete family" button for owner, behind a TypedConfirm ("type DELETE to confirm")

**Components:**
- [ ] `src/components/FamilyMemberRow.tsx` — displayName + email + role + actions slot
- [ ] `src/components/TypedConfirm.tsx` — "type WORD to confirm" modal (reusable for delete family + data delete in Phase 5)

**Sync + routing:**
- [ ] When a member leaves a family, clear all local state (`useAuthStore.clearAll()`, `useDrivesStore.resetAll()`, etc.) so next sign-in starts fresh
- [ ] Route guard: `/invite/:inviteId` doesn't need `RequireAuth` — the screen handles unauth'd by triggering sign-in, then landing back on `/invite/:inviteId`
- [ ] After accepting an invite: `pullFamilyState()` immediately so the invitee sees existing drives/islands
- [ ] Edge case: invitee already has a family → `accept_invite` RPC throws "already belongs to a family" → show "leave your current family first" error

**Migration needed:**
- [ ] `supabase/migrations/0004_invite_delete_policies.sql` — adds owner-only delete policy for `family_member`, and self-delete policy for leaving

**Tests:**
- [ ] `src/api/invites.test.ts` — mocked supabase client, verifies createInvite + acceptInvite call the right RPCs
- [ ] SQL integration test (optional): two users in different families, verify user A can't read user B's family data (already covered by existing RLS, but re-verify with the new delete policies)

**Manual verification:**
- [ ] Two-account test: sign in as owner on device 1, invite second account, sign in as invitee on device 2 via the invite link, accept, confirm both see the same drives
- [ ] Owner transfers ownership to member, confirms owner role moves in `family_member` table
- [ ] Former owner (now member) leaves family; family continues to exist for remaining members
- [ ] Sole owner deletes family; `family` + `family_member` + `pirate` + `drive` + `drive_participant` + `island_unlocked` + `coastal_find_found` + `family_settings` rows all gone (cascade)

### Gotchas

- **Supabase's `admin.inviteUserByEmail` requires the service role key**, which can't be in the client. You'll need an Edge Function (`supabase/functions/send-invite`) that takes an auth'd caller's family_id + invitee_email, verifies the caller is a family member, inserts the `family_invite` row, and sends the email. Budget 1 extra hour for this if the hosted template path doesn't work.
- **Invite links** should be the app's URL, not Supabase's default invite URL. Format: `https://family-pirate-ship.vercel.app/invite/{inviteId}`. The email template needs to use that URL pattern.
- **Race**: if two members accept the same invite simultaneously (unlikely but possible), the second `accept_invite` call throws "invite already accepted" — show a polite error.

---

## Phase 5 — Telemetry + data export + account deletion (~2 hours)

**Dev spec v3 §4 + §5b + §9.4**. First-party telemetry only; no third-party SDKs.

### Pre-requisites

- `VITE_TELEMETRY_HASH_SALT` already set. Don't rotate.

### Implementation checklist

**Library:**
- [ ] `src/lib/hash.ts` — SHA-256 `hashFamilyId(familyId)` using `VITE_TELEMETRY_HASH_SALT`. Implementation is in dev spec §9.4 (already in the spec, just needs to land in code).

**API layer:**
- [ ] `src/api/telemetry.ts`
  - `recordEvent(familyId, eventName)` — computes the hash client-side, calls `record_event(family_id_hash, event_name)` RPC (already defined in migration 0003)
  - Checks `useSettingsStore.getState().settings.telemetryEnabled` — skips entirely when opt-out is on
  - Fire-and-forget; errors are silent (dev spec §6)

**Event emission** (add these one-liners to the existing stores/hooks):
- [ ] `app_opened` — fire once in `useAuthBootstrap` after family resolves
- [ ] `drive_started` — in `drivesStore.startDrive`
- [ ] `drive_ended` — in `drivesStore.endDrive`, after tier is computed
- [ ] `island_unlocked` — in `drivesStore.endDrive` when `tier === 'fair'`
- [ ] `coastal_found` — in `drivesStore.endDrive` when `tier === 'coastal'`
- [ ] `invite_sent` — in `createInvite`
- [ ] `invite_accepted` — in `acceptInvite`
- [ ] `member_left` — in `leaveFamily` and `removeMember`

**Settings screens:**
- [ ] `src/screens/settings/TelemetrySection.tsx` — single opt-out toggle wired to `settings.telemetryEnabled`. Explainer text per dev spec §11.
- [ ] `src/screens/settings/DataSection.tsx`
  - **Export** button: fetch all family-scoped data via existing list APIs (drives, islands, coastal finds, pirates, settings) + family metadata, serialize to JSON, trigger browser download via `Blob` + `URL.createObjectURL`
  - **Delete account and all data** button (owner only) → TypedConfirm ("type DELETE") → calls `delete_family()` RPC → on success, `signOut()` + navigate to `/`
  - Show a final warning with specifics: "This will delete {drivesCount} drives, {islandCount} islands..."

**Sync integration:**
- [ ] `settingsStore.setSettings` already enqueues; verify that toggling telemetry in settings propagates correctly (no server round-trip on telemetry-disabled state should happen client-side)

**Tests:**
- [ ] `src/lib/hash.test.ts` — verify SHA-256 output matches known-value (`hash("foo", "bar")` → specific hex)
- [ ] `src/api/telemetry.test.ts` — mock RPC, verify:
  - Disabled-in-settings → no call
  - Enabled → hashed ID + eventName passed through

**Manual verification:**
- [ ] In Supabase Studio → Tables → `event` → complete a drive → new row appears with a hashed `family_id_hash` (not the raw UUID)
- [ ] Toggle telemetry off in settings → complete another drive → no new row
- [ ] Hit Export button → JSON file downloads with all family data, human-readable structure
- [ ] Delete family → row vanishes from `family` (+ cascade), user is signed out, landing on sign-in

### Gotchas

- **The salt is a client env var**, which weakens the anonymization (anyone with the bundle can compute the hash for a known family ID). Dev spec §9.4 documents this honestly. Don't market it as "rigorously anonymous" to stakeholders.
- **JSON export** should include a schema version field so future imports know what shape to expect. Not shipping import yet, but the forward-compat is cheap.
- **Delete-while-offline** — the RPC call will fail with a network error. Show the error; don't enqueue the delete (destructive ops shouldn't queue).

---

## Phase 6 — Edge cases + polish + tests (~3 hours)

**Dev spec v3 §14**. The long-tail quality pass.

### Implementation checklist

**Unfinished-drive recovery:**
- [ ] `src/sync/unfinished.ts` — auto-save `currentDrive` state to IndexedDB every 10 seconds while `driveInProgress`
- [ ] On cold start (in `useAuthBootstrap`, after family resolves): check IndexedDB for an unfinished drive. If found, show modal: "ההפלגה שלא הסתיימה — להמשיך?" → yes restores the state; no discards it
- [ ] The saved state lives under a device-local key (not family-scoped server data) — it's truly local recovery

**Blocked sign-out during drive:**
- [ ] `AccountSection.tsx`'s "Sign out" button disabled when `useDrivesStore.getState().driveInProgress === true` — tooltip explains why
- [ ] Disabled when `syncStore.queueLen > 0` unless user confirms "sign out and discard {n} pending drives"

**Additional tests:**
- [ ] `src/sync/conflicts.test.ts` — last-write-wins for pirates/settings (pull older server updated_at → local still wins on push)
- [ ] `src/api/auth.test.ts` — post-OAuth routing decision tree unit test: mock auth state (has-family / no-family / pending-invite / new-user) → assert correct route
- [ ] SQL/RLS integration tests against a local Supabase instance — can you write a pgtap suite? Defer if it's > 1 hour of setup; the RLS policies are thin enough that the manual two-account test in Phase 4 is probably enough coverage
- [ ] **(Optional)** Playwright E2E — dev spec §13 item 7. Budget 2 hours if pursued; it's a nice-to-have not a must-have.

**Polish:**
- [ ] Harbor scene parallax on scroll (nice-to-have)
- [ ] Code-split `@supabase/supabase-js` into its own chunk to bring the initial JS payload down from 470 kB → ~270 kB. Vite's `rollupOptions.output.manualChunks` handles this.
- [ ] Remove stale prototype comments / `console.warn` debug logging added during Phase 3 debugging
- [ ] Remove `/debug/auth` route from production (or gate it behind `import.meta.env.DEV` like the Tweaks panel) once Phase 3 ships clean

**Design-partner demo mode (optional):**
- [ ] Reintroduce a `fps.skipAuth` equivalent — localStorage flag that lets a user play the app locally without creating an account. Useful for showing partners without making them sign up. Keep off by default; flip via devtools.

**Deploy housekeeping:**
- [ ] Once Phase 6 tests are green, `npx vercel --prod` and smoke-test all 10 screens on the Vercel URL
- [ ] Update the redirect URL list in Supabase when Vercel assigns a stable custom domain (if/when that happens)

### Gotchas

- **Unfinished-drive auto-save** has to be careful about deadlock: if the user closes the tab mid-write, IndexedDB might not flush. Use `beforeunload` + `navigator.sendBeacon` as a backstop for the last 10-second window.
- **Sign-out while queue has content** should default to "wait for sync then sign out" — don't make discard the primary action.
- **Playwright vs Supabase** — running E2E tests means hitting the real Supabase project (with a test-only family) or a local Supabase instance. Don't mix production data into the test path; either set up a separate "CI" Supabase project or use Supabase CLI's local-dev mode.

---

## Definition of Done for v3 (dev spec §18 checklist)

These lands when all three phases above are complete. Re-verify each after Phase 6:

- [x] All v2 DoD items pass (balance math, no auto-glow, single crate primitive, RTL alignment, offline reveal, etc.)
- [ ] Sign in with Google works on first launch and on a fresh device *(Phase 3 — currently debugging)*
- [ ] A new user creates a family and lands on the existing 3-pirate onboarding *(Phase 2 — done)*
- [ ] An invited user (matching email) can accept the invite and join an existing family *(Phase 4)*
- [ ] Two Google accounts in one family see the same drives after sign-in / refresh *(Phase 3 + 4)*
- [ ] A drive completed offline syncs to the server when the device reconnects *(Phase 3 — needs verification)*
- [ ] Sign-out is blocked during a drive *(Phase 6)*
- [ ] The owner can transfer ownership and leave; the previous owner becomes a member *(Phase 4)*
- [ ] Account deletion (typed-confirmation) hard-deletes the family and all rows *(Phase 5)*
- [ ] JSON export contains pirates, drives, islands, finds, settings — all family data *(Phase 5)*
- [ ] Telemetry toggle works: OFF → no events, ON → hashed-family-ID events *(Phase 5)*
- [ ] RLS prevents user A from reading user B's family's data *(Phase 4 manual test)*
- [ ] 5-member family cap is enforced *(Phase 4 manual test; trigger already exists in migration 0003)*
- [ ] Existing v1/v2 localStorage data is wiped on first sign-in *(skipped — we don't have v1/v2 users in the wild)*
- [ ] App installs on iOS and Android via "Add to Home Screen" *(manifest + icons; can be done any time)*
- [ ] App functions fully during a drive even with no network *(Phase 3 — verified)*
- [ ] No console errors during a normal happy-path session *(Phase 6 audit)*
- [ ] Manual test: complete 5 different drives across two devices, verify all sync correctly *(Phase 6 final check)*

---

## Commands

```bash
# Dev
npm run dev                  # localhost:5173

# Build + tests
npm run build
npm test

# Deploy
npx vercel --prod

# Supabase dashboard
# https://supabase.com/dashboard/project/lrushshcfkuhrecvniix

# Migrations (from Supabase CLI)
supabase link --project-ref lrushshcfkuhrecvniix
supabase db push

# Reset family during testing (Supabase SQL editor)
delete from family where owner_user_id = '<your-auth-user-id>';
```

---

## What this doc does NOT cover

- **v2 feature parity** — already covered by existing implementation + v2 tests (10 balance tests)
- **Phase 0/1/2/3 work** — already in `HANDOFF-v3.md`
- **Design system / visuals** — if we ever migrate off the v2-inspired illustrations to something more polished, that's a separate effort, not a phase
- **iOS/Android native wrappers** — out of scope for v1 per product spec. PWA install is the only mobile story.
- **Real-time sync** — explicitly out of scope per product spec §5 and dev spec §16 "What NOT to build"
