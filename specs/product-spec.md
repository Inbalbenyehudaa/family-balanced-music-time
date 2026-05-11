# Family Pirate Ship — Balanced Music Time

**Product spec — current state**
Owner: Inbal Ben-Yehuda (GPM, Forecast) · Last updated: 2026-05-11

This document describes what ships today. Roadmap items, future phases, and
half-implementation-level code detail live elsewhere (see `archive/specs/` and
`family-pirate-ship/HANDOFF-v3.md`).

---

## 1. What it is

A Hebrew (RTL) family web app that tracks who listens to whose music during a
car drive. Three pirates load musical cargo onto a shared ship each voyage. If
the split between pirates is balanced, the ship sails and the family unlocks a
new island on a treasure map. If one pirate dominates, the ship stays in the
harbor.

**Primary user:** a ~4-year-old kid in the back seat.
**Secondary user:** a parent driving, who operates the app and tunes it.
**Promise to the parent:** the lesson — *balance beats winning* — is built into
the physics of the world. The kid learns it by playing, not by being told.

The app is web-only, mobile-first (with a responsive desktop layout), and runs
against a Supabase backend in an EU region.

---

## 2. Core loop

A full voyage:

1. **Start.** Parent opens the app on their phone and taps **הפלגה חדשה**
   (new voyage) on the Home screen.
2. **Roll call.** The app asks who's in the car today. Parent toggles each
   pirate on or off. At least one must be "in."
3. **Drive.** The kid sees three big buttons — one per active pirate. Tapping
   a pirate means *"their music is playing now."* Time accumulates on whoever
   is currently selected. The **Spyglass** icon lets anyone peek at current
   cargo balance mid-drive.
4. **End.** Parent press-and-holds the end-voyage plank for 1 second (holds
   are intentional — stops the kid from ending the drive). A confirm modal
   fires. Tap **כן** to commit.
5. **Reveal.** A five-stage cinematic plays: dark → iris-in harbor → cargo
   appears on the ship → tier banner → island-unlock or coastal-find reveal →
   save button. Runs locally, no network needed.
6. **Unlock (maybe).** On a fair-winds drive, one of the locked islands is
   randomly drawn and added to the family's treasure map. On a coastal drive,
   a random coastal-find trinket is shown once (see §7).

### Tier rules (from `src/lib/balance.ts`)

Inputs: per-pirate listening seconds, which pirates were "in" for the drive,
plus three tunable parameters on the family.

| Condition | Tier | Result |
|-----------|------|--------|
| Drive total < `minimumDriveMinutes` (default 2) | **Harbor** (`harbor`) | No reward. Short drives can't unlock. |
| Only one active pirate participated | **Solo** (`solo`) | Acknowledged, no unlock. Renders visually as fair in the v2 reveal. |
| Dominant pirate ≤ `fairWindsThreshold` (default 60%) | **Fair Winds** (`fair_winds`) | Random unlocked island revealed. |
| Dominant pirate ≤ `harborThreshold` (default 75%) | **Coastal** (`coastal`) | Random coastal find revealed. |
| Dominant pirate > `harborThreshold` | **Harbor** | No reward. |

The thresholds are a closed interval — **≤ 60%** is fair, **60.01%–75%** is
coastal, **> 75%** is harbor. A zero-tap drive is treated as harbor.

**Hebrew vocabulary the spec commits to:**

| Tier | In app | Gloss |
|------|--------|-------|
| fair_winds | רוח גבית | "fair winds" / "tailwind" |
| coastal | חוף / מציאת חוף | "coast" / "coastal find" |
| harbor | נמל | "harbor" |

---

## 3. Surfaces / screens

All routes are registered in `src/routes/index.tsx` and guarded by
`RequireAuth` / `RequireFamily` / `RedirectIfAuthed`. The RTL shell
(`dir="rtl" lang="he"`) wraps everything.

### 3.1 Sign-in — `/`
Shown to anyone without a Supabase session. Single primary action: **Google
OAuth**. A "מה זה אומר?" link expands an inline privacy explainer (one
paragraph covering what's stored and that everything can be deleted). Supports
a `returnTo` query param so deep-links to `/invite/:id` survive the sign-in
round-trip.

### 3.2 Auth callback — `/auth/callback`
Landing page after Google redirects back. Waits for the Supabase session to
resolve, then routes to: the stashed `returnTo` path, a server-side pending
invite (if any), the user's home screen, or `/onboarding/family`.

### 3.3 Auth debug — `/debug/auth`
Diagnostic page, public route. Dumps the signed-in user, the
`family_member` rows the server sees for that uid, and the joined family row.
Includes buttons for `refreshFamily()`, sign-out, and copy-snapshot. Exists so
Inbal can diagnose cross-device mismatches. Not a user-facing feature.

### 3.4 Family naming — `/onboarding/family`
First screen after sign-in for a user with no family. Single text input
(defaulted to `<first name> המשפחה`, 60-char cap). Submit calls the
`create_family` RPC which also seeds three default pirates and default
settings. Before rendering, the screen runs an authoritative server check for
a pending invite addressed to the signed-in email; if one is found it diverts
to the invite-accept screen to prevent duplicate-family creation.

### 3.5 Onboarding: welcome / names / crew-ready —
`/onboarding/welcome`, `/onboarding/names`, `/onboarding/crew`
Three-dot pager.
- **Welcome** — static ship illustration + "בואו נתחיל".
- **Names** — three rows, one per default pirate (kid/mom/dad), with the
  default name editable inline. Skip button bypasses edits.
- **Crew ready** — shows the three named pirates and a "הפלגה חדשה" button
  that lands on Home.

### 3.6 Home — `/home`
Hero ship illustration, "⚓ הפלגה חדשה" primary button, "🗺️ מפת האוצר" sand
button, islands-count chip (top-left), compass/settings button (top-right,
gated by math). No scoreboards, no numbers.

### 3.7 Roll call — `/drive/roll-call`
Bottom-sheet modal on mobile, centered on desktop. Title: "מי בנסיעה היום?".
Each pirate has an on/off switch. "⚓ מפליגים!" is disabled until at least
one pirate is in; the "אף אחד לא מפליג?" error fires if the parent tries to
start with all three off.

### 3.8 Drive — `/drive/active`
The kid's screen during the car ride.
- Three full-height buttons (one per active pirate). Tap → that pirate is now
  "listening." A visual glow + music-note animation marks the selected pirate.
- Inactive pirates appear sleeping and disabled.
- Each pirate row shows a small mm:ss timer with their accumulated seconds.
- Top bar: Spyglass icon (glows if elapsed > 5 minutes) + an offline
  indicator.
- Footer: "🪵 סיימו הפלגה" — a wooden plank the parent **press-and-holds for
  1s** to trigger the confirm modal. The progress fills the plank while held;
  releasing early cancels.
- A 1-Hz tick advances the accumulator on whichever pirate is currently
  selected. (Dev-only fast-clock multiplies the tick by 8 for demos.)

### 3.9 Confirm end — overlay on `/drive/active`
Modal: "לסיים את ההפלגה?" with כן / לא. Yes commits the drive and routes
to reveal. No cancels back to the drive.

### 3.10 Spyglass — `/drive/spyglass`
Peek screen. Stackable cargo visualization on the ship, avatars above each
stack, and a live tier banner at the top:
- **fair:** "⛵ רוח גבית! זמן האזנה שווה"
- **coastal:** "🌊 הספינה קצת נטויה...אזנו את הזמן"
- **harbor:** "מישהו משתלט, אתם לא זזים"

Close button returns to the drive. The tick keeps running while spyglass is
open — opening it does not pause time.

### 3.11 Reveal — `/drive/reveal`
Five-stage cinematic, timed at 0 / 1500 / 2200 / 3000 / 3800 / 5800 ms:
1. Black screen.
2. Harbor iris-in + "סוף ההפלגה!" plaque.
3. Ship appears, cargo animates in.
4. Plaque drops.
5. Verdict banner + reward reveal (island illustration with fog-clear on fair;
   coastal-find icon on coastal; banner-only on harbor).
6. "שמור והתחל ⚓" button appears and returns to Home.

Reveal copy per tier:
- **fair:** "האזנה משותפת - אי חדש התגלה!"
- **coastal:** "האזנה קצת נטויה - מצאתם משהו על החוף!"
- **harbor:** "נתקעתם בנמל - נסו לחלוק יותר פעם הבאה"

### 3.12 Map — `/map`
Treasure map with 15 island positions laid out on a jittered 3×5 grid (seeded
by island id — positions are stable per-island but visually hand-placed).
Unlocked islands show a circular photograph + Hebrew name; locked islands
show a fogged dashed circle. A "📜 הסטטיסטיקה" chip opens a drawer with
three counters: islands found, coastal finds, total voyages. A "הנמל שלנו"
ship marker anchors the bottom-right. Back button returns to Home.

### 3.13 Island detail — modal on `/map`
Bottom-sheet on mobile, centered dialog on desktop. Shows the island
illustration, Hebrew name, description, discovery date (from the drive that
unlocked it), and voyage duration. Purely informational.

### 3.14 Math gate — `/settings/gate`
Dead-simple parental lock. Shows `A + B = ?` with A and B randomly drawn
between 2 and 7. Correct answer unlocks the settings screen. Wrong answer
keeps the "המשך" button disabled. No lockout, no attempt counter.

### 3.15 Settings — `/settings`
Parent-facing control panel. See §9 for the full inventory.

### 3.16 Invite accept — `/invite/:inviteId`
Four-state flow for an invitee clicking a link from their email:
- **valid** — shows inviter + family name, "להצטרף לספינה" primary button.
- **mismatch** — signed-in email ≠ invite email. "התנתקות וניסיון מחדש"
  action.
- **invalid** — expired, revoked, or accepted-by-someone-else. Shows
  "ההזמנה כבר לא בתוקף" and a route-home button.
- **already_in_other_family** — user is already a member of a different
  family. Routes to settings so they can leave.

A signed-out hit to this URL redirects through sign-in with a `returnTo` param
and lands back here after OAuth.

---

## 4. Accounts, families, invites

### Auth
Google OAuth via Supabase, only. No passwords, no email/password flow, no
password reset. The Google account is the family's identity anchor.

### Families
- A user can belong to at most one family at a time. Enforced in the schema by
  `unique index family_member_one_per_user`.
- The user who signs up and creates a family is the **owner** (`role='owner'`).
  Everyone they invite and who accepts is a **member** (`role='member'`).
- A family has a name (1–60 chars, parent-facing only — kids never see it).

### Invites
- Owner-only. Members cannot invite. Enforced in the `list_pending_invites` +
  `revoke_invite` + `remove_family_member` RPCs.
- Invite an email through Settings → Family → "הזמנת בן/בת משפחה". The
  browser calls the `invite-family-member` Supabase Edge Function, which
  creates the `family_invite` row and sends a Supabase-templated email with a
  link to `/invite/:id`. Invites expire after 7 days.
- Owner can see pending invites and revoke them in the same section.
- Owner can remove a non-owner member; historical drives stay attached.
- The cap is **5 members total** (owner + 4 invitees). The UI surfaces
  "הספינה מלאה (5). הסירו חבר כדי להזמין חדש" when at cap.

### Roles surfaced to members
- **Owner** — invite / revoke / remove member / wipe data.
- **Member** — see the crew roster (read-only), edit pirate names and
  thresholds (all settings are shared family state), end their own voyages.
  Member cannot leave the family from the UI; the "leave family" path is not
  wired to a surface (see §8).

### Known scope limits
- No ownership transfer in the UI.
- No self-serve "leave family" button for members.
- Hebrew email template for invites depends on the template configured in
  Supabase Dashboard; not code-controlled.

---

## 5. Offline behavior

The app is offline-first for the drive loop. Everything the kid touches works
with no network.

**What works offline:**
- Start a voyage, tap pirates, see their timers accumulate.
- Peek at the Spyglass mid-drive.
- End the voyage; the full five-stage reveal plays from local data including
  island illustrations and coastal-find icons.
- Browse the map and island detail for already-unlocked islands.
- Edit pirate names and thresholds.

**What requires network:**
- Sign-in (Google OAuth).
- Accepting an invite.
- Inviting a new member (Edge Function call).
- Pulling drives created on another device.

**How it stays consistent:**
- All server-bound writes funnel through an **IndexedDB write queue** (keyed
  `pirate-ship-sync-queue-v1`, via `idb-keyval`). Kinds: `insert_drive`,
  `unlock_island`, `find_coastal`, `update_pirate`, `update_settings`,
  `rename_island`.
- A flush worker drains the queue on: drive end, settings change, `online`
  event, window focus / visibility change, and a 60-second heartbeat while
  the tab is visible and online.
- The queue is mutex-protected so concurrent enqueues don't clobber each
  other. It survives tab close via IndexedDB.
- Transient errors (network, unknown) pause the flush mid-queue to preserve
  ordering. Permanent errors (RLS, schema) drop the offending write so it
  doesn't block the tail. Unique-violation (`23505`) is treated as "already
  applied."
- A pull (`pullFamilyState`) runs on app open, after sign-in, after invite
  accept, and on focus / visibility change. It reconciles drives
  (server-wins, preserves still-queued local drives), islands and finds
  (union), pirates and settings (server-wins unless a local write is still
  queued).
- The Drive screen shows an offline indicator pill when `navigator.onLine`
  flips false, or when the queue has ≥3 unsynced writes.

**What's not implemented:**
- Auto-save of a drive mid-progress. Closing the tab during a voyage loses
  in-progress tap state.
- Real-time updates between devices. The two-device story is "sync on focus,"
  not "live." See §8.

---

## 6. Privacy posture

### Data region
Supabase project is provisioned in an EU region (West or Central EU, per the
install instructions in `README.md`). All tables live there.

### What's stored
Per-family:
- Family name, owner user id, member user ids + roles.
- Pirate names (3 rows per family, one per slot).
- Drives: start/end timestamps, per-participant seconds + tap counts, tier,
  which island unlocked, which coastal find.
- Unlocked islands and found coastal finds (one row per unlock).
- Family settings (see §9).
- Pending / revoked / accepted invites (invitee email, expiry, acceptor).

Auth users are managed by Supabase Auth (email + Google sub).

### What's not stored
- No ad / marketing SDKs.
- No cross-family analytics or aggregates in product (no leaderboards, no
  "families like yours").
- No raw audio — only play/stop tap events.

### Telemetry
- The `event` table and its write-only RPC exist in the schema, including the
  `family_id_hash` column and the fixed enum of event names
  (`app_opened`, `drive_started`, `drive_ended`, `island_unlocked`,
  `coastal_found`, `invite_sent`, `invite_accepted`, `member_left`).
- A `telemetryEnabled` flag defaults to `true` in `family_settings` and is
  round-trippable through the settings API.
- **There is no client emitter today.** No code path calls `record_event`, and
  the settings UI does not expose a telemetry toggle. Telemetry is
  implemented at the schema and API-shape level only; no events have been
  sent.

### Export & deletion
- **Reset family data** is wired and usable today. Settings → "איפוס נתונים"
  (destructive button with red border) calls `resetFamilyData`, which drains
  the queue, wipes drives / unlocks / finds server-side via `wipeFamilyData`,
  resets pirate names and settings to defaults, and re-pulls to confirm.
- **One-click JSON export of all family data** is described in the README but
  **is not implemented**. There is no export button in Settings and no API
  wrapper for it.
- **Hard-delete (account deletion)** is likewise not wired to any UI surface.

### Hashing salt
`VITE_TELEMETRY_HASH_SALT` is required in `.env.local` and is documented as
"generate once, never rotate." It is consumed by the planned hash helper, not
by any shipping code path yet.

---

## 7. Content universe

**15 islands** (`ISLANDS` in `src/data.ts`), each with a Hebrew name and a
one-sentence Hebrew description. A few examples: מצר הפסטה (Pasta Strait,
"jellyfish with tentacles like spaghetti"), מפרץ ההרפתקאות (Adventure Bay,
Paw Patrol reference), בריכת הבמבה (Bamba Pool, a pool of the Israeli snack
Bamba), אי החלומות של איתמר (Itamar's Dream Island — a personal reference
to the original kid user).

**8 coastal finds** (`COASTAL_FINDS`): bottle with a note, brass key, rubber
duck, lonely sock, music box, clothespin, judo belt, long wooden stick.

**Design principle:** every island and every find is a kid-specific reference
the original four-year-old would immediately recognize — foods he likes,
shows he watches, things in his house. The content is not intended to
generalize to other families. Islands are drawn at random from the
still-locked set on each fair-winds drive; coastal finds are drawn from the
full list every time (they can repeat).

The map renders all 15 island positions statically; locked islands appear as
fogged circles.

---

## 8. Scope boundaries

Current v1 does **not** do:

- **Real-time sync.** Pull is on focus, visibility change, and a 60-second
  heartbeat. A drive completed on phone shows up on laptop only after the
  laptop tab refocuses.
- **Native apps.** Web only. PWA install is not configured.
- **Email/password auth, magic links as a primary method, or multi-provider
  sign-in.** Google only.
- **Multi-family membership.** A user belongs to one family, period.
- **Leaving a family** (as a member) from the UI.
- **Transferring ownership** from the UI.
- **Deleting an account / hard-deleting all data** from the UI.
- **Exporting data.** Despite the README's claim, there is no export button.
- **Telemetry emission.** Schema and flag exist; nothing emits events.
- **Coastal-find history.** The UI shows each coastal find once during
  reveal. There is no list of collected finds anywhere; the server records
  them, but no screen renders them.
- **Auto-save of an in-progress drive.** Closing the tab mid-drive loses
  in-progress state.
- **Third-party integrations** — no Spotify, no Apple Music, no calendar, no
  Google Family. The app does not touch the device's audio session; tapping
  a pirate only attributes time, it doesn't play music.

---

## 9. Parent-facing settings

Settings is behind a math gate (§3.14). All fields are shared family state —
any member's edit is visible to all.

From `src/store/settingsStore.ts` and the Settings screen:

### Family (owner-visible section only)
- Family name (read-only).
- Crew roster with display name, email, join date, and owner/member badge.
  Owner can remove a non-owner member (confirm dialog).
- Pending invites (owner only). Owner can revoke.
- Invite new member form (email input, up to 5 total members).

### Balance thresholds (`settings`)
- **סף רוח גבית** — fair-winds cutoff. Default **0.60**, slider range 0.50
  – 0.70, step 0.01.
- **סף נמל** — harbor cutoff. Default **0.75**, slider range 0.70 – 0.90,
  step 0.01.
- The settings UI surfaces only these two; `minimumDriveMinutes` is **not**
  exposed as a control (defaults to 2 minutes in schema + store).

### General
- **🔊 צלילים** — audio on/off. Default on. (Sound effect infrastructure is
  partially present; toggle flows through settings but is not universally
  wired to all SFX.)
- **🌫️ ערפל על איים בלתי מגולים** — fog toggle for locked islands on the
  map. Default on.

### History
Last 5 drives. Per drive: tier label (🌞 רוח גבית / 🌊 חוף / ⚓ נמל), date,
total minutes, and the top listener + their minutes.

### Crew edit
Three editable rows (kid / mom / dad), one input each. Saved via a "שמירה"
button that only activates when names are dirty. Saves diff-style — only
changed slot names hit the server.

### Reset
Destructive "איפוס נתונים" button at the bottom. Wipes all drives, unlocks,
coastal finds, resets pirate names and all settings to defaults, and
re-pulls server state. No typed-confirm; a single tap commits.

### Settings fields that exist but are not in the settings UI
- `minimumDriveMinutes` (schema default 2) — stored, edited only via the
  `calculateBalance` path and the dev tweaks panel.
- `telemetryEnabled` (schema default true) — stored, no UI toggle.

### Dev tweaks panel
Development builds only (`import.meta.env.DEV`). A floating panel exposes
tier thresholds, audio/fog toggles, a fast-clock mode for demo drives, direct
navigation to every screen, and setters for drive/pirate state. Hidden in
production. Not a user-facing surface.
