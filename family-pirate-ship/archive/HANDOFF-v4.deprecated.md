# v4 Handoff — Phase 4 complete: Family-Member Invitations

This doc captures the state after Phase 4 (invite flow) landed. Read HANDOFF-v3.md for earlier phases.

---

## What's shipped in Phase 4

### Database (migration 0006_invites.sql)

New RLS policies on `family_invite`:
- Owner can **DELETE** (revoke)
- Invitee can **UPDATE** own row (stamp `accepted_at`)

New security-definer RPCs:
- `revoke_invite(invite_id uuid)` — owner-only, idempotent delete
- `remove_family_member(target_user_id uuid)` — owner-only
- `list_family_members_with_profile()` — surfaces email + display_name from auth.users for the Settings crew list
- `list_pending_invites()` — owner-only, returns unexpired/unaccepted invite rows
- `find_family_for_email(p_email text)` — service_role only, used by the Edge Function to check if an invitee is already in a family

**Status:** Run this migration against your Supabase project if you haven't:
```
supabase db push
```
or paste `supabase/migrations/0006_invites.sql` into Supabase Dashboard → SQL Editor.

---

### Edge Function — `supabase/functions/invite-family-member/`

**What it does:**
1. Validates the caller is the owner of the target family
2. Enforces the 5-member cap
3. Checks `find_family_for_email` for the invitee (blocks `ALREADY_MEMBER`, `IN_OTHER_FAMILY`, `INVITE_SELF`)
4. Reuses existing pending invite rows on resend (no orphan rows)
5. Calls `admin.auth.inviteUserByEmail` with `redirectTo = ${PUBLIC_APP_URL}/invite/<id>`

**Required secrets (set in Supabase Dashboard → Project Settings → Edge Functions → Secrets):**
- `SUPABASE_SERVICE_ROLE_KEY` — never in `.env.local`, never in the repo
- `PUBLIC_APP_URL` — app origin, no trailing slash (e.g. `https://family-pirate-ship.vercel.app` or `http://localhost:5173`)

**Deploy:**
```bash
supabase functions deploy invite-family-member
```

**Error codes the function returns:** `ALREADY_MEMBER`, `IN_OTHER_FAMILY`, `FAMILY_FULL`, `INVITE_SELF`, `RATE_LIMITED`, `SEND_FAILED`, `NOT_OWNER`, `INVALID_EMAIL`, `DB_ERROR`, `MISCONFIGURED`, `UNAUTHENTICATED`.

---

### Client API — `src/api/invites.ts`

Functions added:
- `createInvite(email, familyId)` — calls the Edge Function, maps typed error codes to Hebrew UX strings
- `acceptInvite(inviteId)` — calls `accept_invite` RPC, idempotent (double-click safe)
- `revokeInvite(inviteId)` — calls `revoke_invite` RPC
- `listPendingInvites()` — owner-only pending invites list
- `listMembersWithProfile()` — crew roster with email + display name (used by Settings)
- `removeMember(userId)` — owner-only member removal
- **`findPendingInviteForMe()`** — queries `family_invite` directly using invitee RLS policy; returns the most recent unexpired, unaccepted invite for the current user's email. This is the key server-authoritative safety net for the invite race condition.

---

### New screens

**`src/screens/InviteAccept.tsx`** — `/invite/:inviteId`

Four states:
1. **Valid + email match, not yet accepted** — shows family name, inviter name, "הצטרפו לספינה" button
2. **Valid + email mismatch** — shows which email was invited vs. which is signed in, offers sign-out
3. **Expired / revoked / invalid** — "ההזמנה הזו אינה תקפה עוד"
4. **Already accepted** — auto-redirects to `/home` silently

Critical behaviors:
- Stamps `rememberPendingInvite(inviteId)` in sessionStorage on mount (anti-race latch)
- If `user: null` but URL has auth tokens in flight (`urlHasAuthInFlight()`) → stays on loading spinner instead of bouncing to sign-in
- On accept: `acceptInvite()` → `clearPendingInvite()` → **`refreshFamily()` BEFORE nav** → `pullFamilyState()` → nav to `/home`
- Clears latch on expired/invalid/mismatch states

---

### Modified screens

**`src/screens/Settings.tsx`** — new Family section

Added at the top of Settings (above threshold sliders):
- **Crew list**: each member as a row — display name, email, role badge ("קפטן"/"צוות"), joined date, "(you)" marker
- Owner-only: **Remove** button per non-owner row, with inline confirm dialog
- Owner-only: **Pending invites** sub-list with email, sent time, **Revoke** button
- Owner-only: **Invite a family member** button that expands into an inline email form
- 5-member cap gate: invite button pre-disabled with "הצוות מלא" when at capacity

**`src/screens/AuthCallback.tsx`** — invite-aware routing

Routing priority order (async useEffect):
1. `popReturnTo()` from sessionStorage (set by SignIn for deep-links)
2. `readPendingInvite()` latch from sessionStorage
3. **`findPendingInviteForMe()`** server query — catches wrong-template email case
4. Family exists → `/home`
5. `familyError` → `/home`
6. Default → `/onboarding/family`

**`src/screens/FamilyNaming.tsx`** — server-authoritative invite guard

This is the most important safety net. On every mount:
1. Calls `findPendingInviteForMe()` from the server
2. If server says pending invite → `<Navigate to={/invite/${id}} replace />`
3. If checking + latch set → Navigate to latch
4. If checking + no latch → spinner (blocks the family-creation form during the check window)
5. If none → render normally

This catches every path into FamilyNaming: race on magic-link handshake, wrong email template, direct nav from /home when family is null, cross-tab links.

**`src/screens/SignIn.tsx`** — `returnTo` stash

Reads `?returnTo=` query param on mount, stashes to `sessionStorage['auth.returnTo']` so AuthCallback can honor deep-links after the OAuth dance.

---

### New lib — `src/lib/pendingInvite.ts`

```typescript
export function rememberPendingInvite(id: string): void
export function readPendingInvite(): string | null
export function clearPendingInvite(): void
export function urlHasAuthInFlight(): boolean  // checks URL for access_token or code params
```

---

### Modified routing

**`src/routes/guards.tsx`**

New helper `onboardingOrInvite()`: checks sessionStorage latch before routing to onboarding. Both `RequireFamily` and `RedirectIfAuthed` now call this instead of hardcoding `/onboarding/family`.

**`src/routes/index.tsx`**

`/invite/:inviteId` now renders `<InviteAcceptRoute />` instead of `<Navigate to="/" replace />`.

**`src/routes/screens.tsx`**

`SettingsRoute` loads `family`, `members`, `role`, `user` from authStore, manages `pendingInvites` state, and wires the invite/revoke/remove handlers as `useCallback`.

---

### Types — `src/types.ts`

Added:
```typescript
export interface PendingInvite {
    id: string;
    inviteeEmail: string;
    expiresAt: number;
    createdAt: number;
}
```

---

## Test status

- **47/47 tests passing** (npm test)
- **Build clean** (npm run build)
- Phase 4 code has no dedicated unit tests — the invite flow depends on live Supabase and the Edge Function, so it needs manual E2E verification (see below)

---

## The duplicate-family bug (and why it's fixed)

**Root cause:** Supabase's PKCE code exchange is async. On mobile, `/invite/:id` mounted with `user: null` (exchange not yet complete). The screen bounced to sign-in, session landed, and the guard sent the spouse to `/onboarding/family` — the invite latch was never stamped because the user never saw the invite screen.

**Fix layers (defense in depth):**
1. **`urlHasAuthInFlight()`** — prevents InviteAccept from redirecting while auth tokens are in the URL
2. **SessionStorage latch** — `rememberPendingInvite()` on InviteAccept mount, honored by guards and AuthCallback
3. **Server-side `findPendingInviteForMe()`** in both `FamilyNaming` and `AuthCallback` — this is the authoritative backstop. It doesn't matter which URL the email linked to or whether the latch was ever stamped. If the user has a pending invite, they get redirected to it before FamilyNaming can render.

---

## The wrong-email-template bug

**Root cause:** `inviteUserByEmail` falls back to the "Magic Link" Supabase template (not your custom "Invite user" template) when the invitee already has an `auth.users` row. The fallback email's `redirectTo` doesn't point to `/invite/:id`, so the latch is never stamped.

**Fix:** The server-side `findPendingInviteForMe()` in `AuthCallback` catches this case regardless of which URL the email linked to.

**To use the customized invite email template going forward:** The invitee's `auth.users` row must not exist before you call `inviteUserByEmail`. If they already have a row (from a failed previous invite), delete it in SQL Editor first.

---

## Pending manual actions before re-testing

### 1. Clean up Supabase state from the failed test

Run in Supabase Dashboard → SQL Editor (substitute your husband's Gmail):

```sql
-- Delete his duplicate disconnected family
delete from family
 where owner_user_id = (
   select id from auth.users where lower(email) = lower('<his-gmail>')
 );

-- Delete his auth.users row so next invite uses the customized template
delete from auth.users where lower(email) = lower('<his-gmail>');

-- Clean up stale pending invite rows
delete from family_invite where lower(invitee_email) = lower('<his-gmail>');
```

### 2. Wait for the Supabase email rate limit to clear

Free tier: ~30 auth emails/hour shared across all auth email types. After several invite attempts + retries + magic links during debugging, the bucket was exhausted. Wait ~1 hour from the last failed send before trying again.

Alternatively: raise the limit in Supabase Dashboard → Project Settings → Auth → Rate Limits.

Alternatively: bypass email entirely — after sending the invite, copy the `id` from `family_invite` in SQL Editor and construct the accept URL manually: `http://localhost:5173/invite/<id>`.

### 3. Apply migration 0006 if not yet applied

```bash
supabase db push
```

---

## End-to-end test plan (Phase 4)

1. From Inbal's account, Settings → Family → Invite → enter husband's Gmail → Send.
2. Confirm invite row appears in Supabase Studio → `family_invite`.
3. Husband opens the invite email. Confirm it's the customized Hebrew/English template.
4. Husband taps the CTA link. Confirm the browser opens `/invite/<id>` on your domain.
5. Husband sees the "הוזמנתם להצטרף לספינה" accept screen showing your family name.
6. He taps "הצטרפו לספינה". Confirm he lands on `/home` — not `/onboarding/family`.
7. Husband logs a drive. Refresh Inbal's app → drive appears in map and history.
8. Inbal logs a drive. Refresh husband's app → drive appears.
9. From Inbal's Settings, revoke a test invite → confirm the link becomes invalid.
10. From Inbal's Settings, remove husband → confirm his next app open routes to `/onboarding/family`. Confirm his drives are still visible in Inbal's map.

---

## Known issues / gotchas (Phase 4)

1. **Rate limit on free tier** — ~30 auth emails/hour. After debugging sessions this bucket drains fast. See cleanup steps above.

2. **`inviteUserByEmail` uses wrong template for existing users** — Supabase silently falls back to "Magic Link" template if the invitee already has an `auth.users` row. The server-side `findPendingInviteForMe()` check makes the flow work regardless, but the email itself will be the generic Supabase template. Delete the `auth.users` row before inviting to get the custom template.

3. **Google OAuth consent screen** — if Google Cloud app is still in "Testing" mode, husband's Google account must be on the Test Users list. Otherwise Google blocks sign-in with "Access Blocked" and no error appears in Supabase logs. Add his account, or publish the app.

4. **Supabase redirect allow-list** — for Vercel preview deploys, the preview domain must be in Supabase Dashboard → Authentication → URL Configuration → Redirect URLs. Otherwise Supabase refuses to redirect after sign-in.

5. **Settings crew list** — uses `list_family_members_with_profile` RPC from migration 0006. If the migration hasn't been applied, the crew list falls back to the old `listMembers()` (no email, no display name). Run `supabase db push` to get the full view.

---

## What's left — Phases 5, 6

### Phase 5 — telemetry + data export + account deletion (~2 hours)
- `src/lib/hash.ts` — SHA-256 family-id hasher
- `src/api/telemetry.ts` — `recordEvent(familyId, eventName)` via `record_event` RPC
- Event emission (`app_opened`, `drive_ended`, `island_unlocked`, etc.)
- `TelemetrySection`, `DataSection` in Settings (JSON export + typed-confirm delete)

### Phase 6 — polish + edge cases (~3 hours)
- Unfinished-drive recovery (auto-save every 10s, dev spec §14)
- Per-parent drive attribution in the map/history UI (currently stored but not surfaced)
- Additional RLS/SQL tests
- Playwright E2E smoke (optional)
- Custom email sender domain (currently `noreply@mail.app.supabase.io`)

---

## Quick commands

```bash
npm run dev              # dev server (http://localhost:5173)
npm run build            # typecheck + production build
npm test                 # Vitest — should be 47/47

# Deploy edge function after any changes
supabase functions deploy invite-family-member

# Apply latest migration
supabase db push

# Bypass invite email during rate-limit testing:
# 1. In Supabase SQL Editor: select id from family_invite order by created_at desc limit 1;
# 2. Open: http://localhost:5173/invite/<id>  (while signed in as the invitee)
```
