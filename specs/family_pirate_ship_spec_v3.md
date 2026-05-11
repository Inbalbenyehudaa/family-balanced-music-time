# Family Pirate Ship — App Spec v3

A family web app for tracking who-listens-to-whose-music during car drives — designed to teach a 4.5-year-old that *balanced* family music time is the goal, not "winning" more time.

> **v3 note.** This is a major scope change from v2. The app gains a backend: Google sign-in, multi-device family accounts, server-stored drive history, and minimal first-party telemetry. The product mechanics, balance math, tiers, and metaphor are unchanged from v2. What changes is the *trust model* (local-only → account-based) and the *parent experience* (single device → both parents see the same family data on their own phones). The original v1/v2 framing as "private to the device" no longer applies. A change log lives at the end. **Backend is in from day one — there is no local-only release.**

---

## Core design principles

**Calm during the drive by default, with a peek available on demand.** No constant animations or scoreboards while driving — the kid sees three big buttons, and the box for whoever is currently listening glows softly. A Spyglass button lets the family peek at the current cargo state whenever they want, so they can rebalance *during* the drive, not just react to the result. The end-of-drive reveal is still the moment that determines what gets unlocked.

**Balance is the only thing that earns progress.** A lopsided drive doesn't unlock new content. The cumulative game gates progression on fairness — not on individual contribution.

**The metaphor teaches the lesson.** A pirate ship needs balanced cargo to sail. If three pirates load equally, the ship sails out and discovers a new island. If they don't, it stays in the harbor. The lesson is built into the physics of the world, not stapled on as a bonus.

**Offline-first during a drive.** Cars go through tunnels, parking garages, and dead zones. The drive screen and the end-of-voyage reveal must work with no network, then sync when the phone gets signal again. The family should never feel the network — drives are saved, islands are unlocked, and the reveal plays whether or not the device is online.

---

## Trust model & privacy posture **[NEW v3]**

The v1/v2 spec described the app as "private to the device." That's no longer true: with accounts, the family's data lives on a server. The privacy posture is **strict** and worth stating explicitly because it shapes a lot of downstream decisions:

- **Sign in with Google only.** No passwords, no email/password flow. This means no password storage, no reset flows, and a single one-tap sign-in for both parents.
- **Server stores only what's needed to run the app.** Pirate names, drives, unlocked islands, settings. No avatars uploaded, no chat, no social features.
- **No third-party analytics.** No PostHog, Amplitude, Sentry, Google Analytics, etc. Telemetry, when collected, is first-party only and minimal (see below).
- **No aggregate cross-family stats.** This is not a "see how your family compares to other families" product, ever.
- **EU data region.** Server-side data lives in an EU region for GDPR posture and because the user base is likely Israel/EU-adjacent.
- **Hard delete on request.** The parent settings include a "delete my account and all family data" flow that hard-deletes from the database — no soft delete, no retention period beyond what backups require.
- **Export your data.** A JSON export of everything the family has produced is available in parent settings at any time.

**Telemetry that *is* collected:** anonymous event counts only. The family ID is one-way hashed before any event is recorded, so even the developer can't tie events back to a specific family. Examples of events: `drive_ended`, `island_unlocked`, `app_opened`. No event payloads, no user IDs, no PII. Telemetry can be disabled entirely in parent settings.

---

## The three pirates

On first launch (after sign-in and family setup, see below), the parent creates the three family pirates. The setup is intentionally minimal — just typing three names — to get the family on the water fast.

For each pirate, ships with:

- **A default name** that the parent overrides during setup. Defaults: `קפטן ילד` (Captain Kid), `אמא־פיראטית` (Mama Pirate), `אבא־פיראט` (Papa Pirate).
- **A pre-designed avatar** — one for the kid pirate, one for the mom pirate, one for the dad pirate. No mix-and-match customization at this stage.
- **A default flag color** — red for the kid, teal-green for mom, deep purple for dad. High-contrast and easy to tell apart at a glance. This is how the kid visually identifies whose cargo section is whose throughout the app, and the same color is used to tint that pirate's cargo crates.

All three pirates are equals. No "captain ranks." Avatar and flag-color customization is deferred; revisit only if there's real demand.

---

## Accounts & families **[NEW v3]**

**The family, not the user, is the unit of state.** All drives, pirates, islands, and settings belong to a *family*. A family has one or more *members* (Google-authenticated users) who all see and edit the same data.

**Family creation.** The first user to sign up with Google creates the family and becomes its **owner**. They land on the existing onboarding (name your three pirates) immediately after sign-in.

**Inviting a partner.** From parent settings, the owner can invite a second Google account to join the family by entering their email address. The invitee receives an email with a link; opening the link in a browser, signing in with the matching Google account, and confirming "Join the [family-name] family" adds them as a **member**. Members have the same permissions as the owner, except:

- Only the **owner** can delete the family (and all its data).
- Only the **owner** can remove other members.

**Membership cap.** A family is capped at **5 members** to keep the trust circle small. (Realistic family case is 2 — both parents — but a grandparent or babysitter on a road trip is fine. The cap exists mostly to keep the invite system from being abused.)

**Leaving a family.** Any member who isn't the sole owner can leave the family from their settings. Their account remains on the server but is no longer linked to that family's data. If the sole owner wants to leave, they must either delete the family (destroying all data) or transfer ownership to another member first.

**Single-family per user.** A Google account can only belong to one family at a time. This keeps the data model simple — no need for a "switch family" UI. If a user wants to join a different family, they leave their current one first.

**Sign-in on a fresh device.** A returning user signing in on a new device (or after reinstalling) goes straight to the home screen with their family's data pulled from the server. No re-onboarding, no re-naming pirates, no re-discovering islands. **Existing localStorage data on the device is discarded** with an explicit warning at sign-in.

---

## Sync model **[NEW v3]**

**The server is the source of truth. The local device is a cache plus a write-queue.**

**On app open:** the app pulls the latest state from the server (drives, pirates, islands, settings) and renders. If offline, the app renders the last-cached state.

**During a drive:** writes happen locally, immediately, with no network call. The drive is queued for sync.

**On drive end:** the completed drive is pushed to the server in the background. If the device is offline, the drive sits in the queue; the next time the app has network, the queue flushes. The reveal animation plays regardless of network state — the kid never waits on a server round-trip.

**Two-device behavior — *not* real-time.** If mom finishes a drive in the morning, dad's phone won't see it until dad reopens the app or pulls to refresh. This is a deliberate simplification. (Real-time subscriptions are technically free with this stack but add edge cases that aren't worth the build cost for v1.)

**Conflict resolution:**

- **Drives never merge.** Each drive has a unique ID and a creation timestamp. If both parents start a drive at the same moment (rare but possible), both end up in the family's history as two separate drives. There is no concept of a "shared in-progress drive."
- **Pirates and settings: last-write-wins by `updated_at`.** If one parent renames a pirate offline while the other renames the same pirate online, the later edit wins on next sync. The very-rare conflict isn't worth more sophisticated CRDT machinery here.
- **Islands and coastal finds are append-only** from the family's perspective. Once unlocked, they stay unlocked. No conflict possible.

**Offline indicator.** A subtle "offline — your drive will save when you have signal" toast appears on the during-drive screen if the device loses network. Not alarming — drives still work, the kid sees nothing.

---

## Screens & flows

### 0. Sign-in (first launch and on every install) **[NEW v3]**

A welcome screen with the harbor scene and a single primary button: **"כניסה עם Google"**. Tapping it triggers the Google OAuth flow. After successful sign-in:

- **If the Google account is already linked to a family** → home screen, with their family's data
- **If the Google account has a pending invite** → "Join the [family-name] family?" confirmation → home screen
- **If the Google account is new** → family creation flow → onboarding (name three pirates) → home screen

A small text link below the primary button: **"מה זה אומר?"** ("what does this mean?") — opens a short, kid-context-aware explanation of what data is collected and why, with a link to the full privacy notes.

### 1. Onboarding (first-time-only, after sign-in) — three steps

Unchanged from v2 in spirit, with new step 0:

**Step 0 [NEW v3] — Family naming.** A simple input: *"What's your family called?"* with a default like the user's display name + " family" prefilled. This is the name shown in invites and in parent settings. The kid never sees it.

**Step 1 — Welcome.** Full-screen illustration: a pirate ship docked at a wooden pier at sunrise. Title: **"ברוכים הבאים לים שלכם!"** Single primary button: **"בואו נתחיל!"**

**Step 2 — Name your three pirates.** Parchment background, three vertical stacked cards, one per pirate. Each card: avatar, name input with default placeholder, small flag in the pirate's color, soft drop shadow.

**Step 3 — Done.** All three pirates on deck looking out to sea. Title: **"הצוות שלכם מוכן!"** Single button: **"🏴‍☠️ הפלגה חדשה"**.

### 2. Home screen

Unchanged from v2. A pirate harbor with the docked ship. Two big buttons:

- 🏴‍☠️ **Start a new voyage** (`הפלגה חדשה`)
- 🗺️ **See our treasure map** (`מפת האוצר`)

Top corners: ⚙️ for parent settings (math-gated), 🗺️ map chip (second entry to treasure map).

A subtle offline indicator (a small cloud-with-slash icon) appears in the top corner when the device is offline. Tapping it explains: *"You're not connected. Drives still work — they'll save when you're back online."*

### 3. Pirate roll call

Unchanged from v2.

### 4. During-drive screen

Unchanged from v2 — three boxes, no auto-selected pirate, Spyglass icon, end-voyage button. The only new behavior is the offline indicator (from §2) appearing if the device loses signal mid-drive. The drive itself is unaffected.

### 4a. The Spyglass — mid-drive check-in

Unchanged from v2.

### 5. End drive → reveal screen

Unchanged from v2 — same five-stage cinematic, same three tiers, same content. The reveal plays from local data; the drive is queued to the server in the background. A successful sync is silent; a failed sync re-queues without alarming the user.

### 6. Treasure map

Unchanged from v2. Pulled from server-cached state on app open.

### 7. Parent settings **[EXPANDED v3]**

Math-gated as in v2. New sections added:

**Existing v2 sections (unchanged):**
- Edit pirate names (and flag colors — deferred customization)
- Adjust balance thresholds (sliders)
- Toggle audio on/off, toggle map fog on/off
- Drive history (full log with raw times)

**New v3 sections:**

- **Account.** Shows the signed-in Google account's email and display name. "Sign out" button (clears the local session; data stays on the server).
- **Family.** Shows the family name (editable), the list of members, an "Invite a partner" button (opens an email-input modal → sends invite). Members can be removed by the owner with a typed-confirmation gate. The owner can transfer ownership to another member.
- **Telemetry.** A single toggle: "Help us improve the app by sending anonymous event counts." Default ON, kid-context-friendly explanation below it. When OFF, no events are recorded.
- **Data.** Two buttons:
  - **Export** — downloads a JSON file with the entire family's data (pirates, drives, islands, finds, settings).
  - **Delete account and all data** — typed-confirmation gate ("type DELETE to confirm"), final warning, then hard-deletes the family and all its rows. Available only to the owner.

---

## The balance mechanic

Unchanged from v2.

(Tiers, math, worked examples, edge rules: identical.)

---

## Treasure map progression

Unchanged from v2. ~30 islands, ~15 coastal finds, landmark milestones at 5/10/20/30 islands. Content is pre-bundled in the app — no online dependency for content delivery.

---

## Edge cases & questions

**Updated for v3:**

- **App crash / phone restart mid-drive.** Auto-save current drive state to local cache every ~10 seconds. On reopen, prompt: "ההפלגה שלא הסתיימה — להמשיך?" (Continue the unfinished voyage?). Server is *not* involved in this recovery — it's local-only because the drive isn't finished yet.
- **Offline at the moment of drive end.** Reveal plays from local data, drive is queued, sync happens when network returns. Family sees no error.
- **Sync fails after retry.** If a queued drive can't sync after several retries (e.g. server is down), it stays in the queue and retries with exponential backoff. The drive isn't lost. A "queued drives" indicator surfaces in parent settings if the queue grows beyond ~3 drives, with a manual "retry now" button.
- **User signs out mid-drive.** The during-drive screen is locked from sign-out — the parent settings sign-out button is disabled while a drive is in progress. (The math gate keeps the kid out anyway.)
- **User signs in on a new device with an existing local v1 cache.** Local data is discarded with a clear "you'll lose any local drives — continue?" warning at sign-in. Server data is fetched fresh. (This is the migration path for the original v1/v2 users — they sign in once and accept that pre-account history is gone. Acceptable since v1 was the prototype phase with limited rollout.)
- **The owner deletes the family while a member's phone is offline.** The member's local cache continues to work until they reconnect, at which point they're signed out and shown a "this family has been deleted" message.
- **Two members open the app at the same time in the same car.** Both can independently start drives. They'll both end up in the family's drive history. (Don't try to coordinate — just let it happen. Real-world usage will be one-phone-per-drive almost always.)

**Out of scope for v1, fine for later:**
- Real-time sync between members' phones during the same drive
- A parent-facing statistics screen (trends, streaks, weekly view)
- More than 5 family members
- Multiple families per user
- Family songs (4th button that splits time three ways)
- Captain rotation badge

---

## Visual & audio direction

Unchanged from v2.

---

## Data model **[REWRITTEN v3]**

The server-side schema lives in Postgres (Supabase). Detail in the developer spec; here's the conceptual shape.

**Entities:**

```
auth_user                    (managed by Supabase Auth — Google OAuth)
  id, email, display_name, created_at

family
  id, name, owner_user_id, created_at, updated_at, deleted_at?

family_member
  family_id, user_id, role ('owner' | 'member'), joined_at

family_invite
  family_id, invitee_email, invited_by_user_id, expires_at, accepted_at?

pirate
  id, family_id, slot ('kid' | 'mom' | 'dad'), name, flag_color, updated_at

drive
  id, family_id, started_at, ended_at, biggest_share, tier,
  island_unlocked_id?, coastal_find_id?, created_at, created_by_user_id

drive_participant
  drive_id, pirate_id, participated, total_minutes, tap_count

island_unlocked
  family_id, island_id, custom_name?, unlocked_at, drive_id

coastal_find_found
  family_id, find_id, found_at, drive_id

family_settings
  family_id, fair_winds_threshold, harbor_threshold, audio_enabled,
  fog_enabled, telemetry_enabled, updated_at

event   (telemetry, write-only from client, no user-readable view)
  id, family_id_hash, event_name, occurred_at
```

**Per-device (local cache + sync queue):**

```
local_state         (mirror of family's server state, indexed by family_id)
sync_queue          (pending writes: drives, settings updates, island unlocks)
session             (Supabase session token, refresh token)
unfinished_drive    (in-progress drive, auto-saved every 10s, local-only until ended)
```

**RLS (Row-Level Security) summary:** every table with a `family_id` is protected so a user can only read/write rows belonging to families they're a member of. Detail in the developer spec.

---

## V3 scope decisions (resolved)

- **Backend in from day one. No local-only release.** The family is the unit of state, the server is the source of truth, and the device is a cache.
- **Google sign-in only.** No email/password.
- **One Google account → one family. Multiple Google accounts can join one family. Up to 5 members.**
- **Sync is on-app-open and on-drive-end, not real-time.** Pull-to-refresh on home and treasure map screens.
- **Telemetry is anonymous event counts only**, first-party, opt-out via toggle, default on. No third-party analytics ever.
- **No stats dashboard for v1.** Drive history stays as a raw list in parent settings. A proper stats screen is a later design pass.
- **Existing local v1/v2 data is discarded on first sign-in.** Clean slate.
- **Hard delete on request.** No soft delete, no retention beyond backups.

---

## Change log — v2 → v3

The mechanics, balance math, tiers, and visual direction are unchanged. The change is at the *infrastructure* and *trust model* layer.

**New: accounts and families.**
- Google sign-in is now the first-launch flow. No accountless mode.
- Family creation, family naming, and invite-a-partner flow added.
- Multiple Google accounts (up to 5) can share a single family's data.
- Owner role with destructive permissions (delete family, remove members), member role for everyone else.
- A user belongs to one family at a time.

**New: server-backed sync.**
- Server is source of truth for all family state (drives, pirates, islands, settings).
- LocalStorage downgraded to a cache + write-queue.
- Sync happens on app open, on drive end, and on settings change. Not real-time.
- Offline-first during a drive: the drive screen and reveal work without network; drives sync when network returns.
- Conflict policy: drives never merge (each is unique by ID); pirates/settings are last-write-wins; islands/finds are append-only.

**New: privacy posture (now explicit).**
- Strict mode by default. No third-party analytics, no aggregate stats, EU data region, hard delete on request.
- First-party telemetry: anonymous event counts only, hashed family ID, opt-out via toggle.
- Account export (JSON) and account deletion (typed-confirmation) flows added to parent settings.

**Onboarding flow changed.**
- New step 0 added: family naming.
- The previous v2 onboarding (welcome + name pirates + done) now follows family creation.
- A returning user on a new device skips onboarding entirely and lands on home.
- Existing local v1/v2 data is discarded with explicit warning on first sign-in.

**Parent settings expanded.**
- New "Account" section (signed-in Google identity, sign-out).
- New "Family" section (family name, members list, invite a partner, transfer ownership, leave family, delete family).
- New "Telemetry" toggle.
- New "Data" section (export, delete account).

**Edge cases added.**
- Offline-at-drive-end behavior (reveal plays, drive queued).
- Sync-fails-after-retry behavior (queue with exponential backoff, indicator if queue grows).
- Sign-out-during-drive locked.
- Owner-deletes-family-while-member-offline behavior.
- Both-members-start-drive-simultaneously behavior (each becomes a separate drive).

**Explicitly out of scope (still):**
- Real-time sync between members' phones
- Stats / trends / streaks dashboard
- More than 5 family members
- Multiple families per user
- Family songs, captain rotation, avatar customization (unchanged from v2)
