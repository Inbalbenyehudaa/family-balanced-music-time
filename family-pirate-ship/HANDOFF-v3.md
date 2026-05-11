# v3 Handoff — Phases 0, 1, 2, 3 complete

This doc captures the state after Phase 3 (sync) landed, what you need to verify, and what's left.

---

## What's shipped

### Phase 0 — foundation
- Deps (`@supabase/supabase-js`, `zustand`, `idb-keyval`, `react-router-dom`, Tailwind + RTL, Vitest)
- SQL migrations in `supabase/migrations/` (schema + RLS + RPCs) — applied to `lrushshcfkuhrecvniix`
- `.env.local` with your three Supabase/telemetry vars
- Tailwind config with design tokens

### Phase 1 — local refactor
- `lib/balance.ts` with 10 tests
- Five Zustand stores
- React Router + guards
- Tailwind migration of all user-facing screens

### Phase 2 — real auth + family creation
- `src/api/{client,auth,families,pirates,settings,errors}.ts`
- `useAuthBootstrap` resolves the session on mount
- Real `SignIn`, `AuthCallback`, `FamilyNaming` screens
- Route guards check real Supabase sessions

### Responsive layout refactor
- Dropped the `IOSDevice` phone frame
- New `.app-shell` centered max-width-560px column on desktop, full-bleed on mobile
- `<ScreenBackground variant="...">` primitive (harbor / parchment / waves / dark / sky / map)
- All 13 screens re-laid-out in flex columns with `clamp()`-based sizing
- Modals are bottom-sheets on mobile, centered on desktop

### Phase 3 — sync (this session)

**Drives + islands API**
- `src/api/drives.ts` — `insertDrive` (drive row + participant rows, idempotent via unique-violation), `listDrives` (joined + mapped to v2 Drive)
- `src/api/islands.ts` — `listUnlocked`, `recordUnlock`, `listCoastalFinds`, `recordCoastalFind`, `renameIsland`

**IndexedDB sync queue**
- `src/sync/queue.ts` — `readQueue`, `writeQueue`, `enqueueWrite`, `clearQueue` backed by `idb-keyval`
- `src/sync/worker.ts` — `flushQueue()` with:
  - No-op when offline or already syncing
  - Dispatch by `QueuedWriteKind` to the right API wrapper
  - Unique-violation (23505) = treated as "already applied", dropped
  - Transient errors (NETWORK, UNKNOWN) stop the flush mid-queue to preserve order
  - Permanent errors (FORBIDDEN, CONFLICT, NOT_FOUND) drop the write so one bad item doesn't block the queue forever
- `src/sync/pull.ts` — `pullFamilyState()` fetches drives + islands + coastal finds + pirates + settings in parallel, reconciles:
  - Drives: server-wins, but keeps any local-only (unsynced) drives
  - Islands / coastal finds: union
  - Pirates / settings: server-wins (hydration doesn't enqueue)

**Stores wired to sync**
- `drivesStore.endDrive()` computes tier, writes locally (reveal plays immediately), then enqueues `insert_drive` + `unlock_island` / `find_coastal` with participants keyed by `pirate.serverId`. Calls `flush()` fire-and-forget.
- Skips server enqueue when pirates have no `serverId` yet (pre-auth / demo mode)
- `settingsStore.setSettings()` enqueues `update_settings` + flush. New `hydrateSettings()` for pull-time writes that shouldn't re-enqueue.
- `piratesStore.savePirates()` — diff-based: enqueues `update_pirate` per changed slot name. `setPirates()` left as a non-enqueueing hydration helper for pull.
- `SettingsRoute` now calls `savePirates` (persistent) instead of `setPirates` (local-only).

**Online status + pull-on-focus**
- `useOnlineStatus` hook — subscribes to `online`/`offline`, triggers flush on reconnect
- `useSyncOnFocus` hook — pulls on `focus` and `visibilitychange`, plus a 60s heartbeat flush while visible + online
- `OfflineIndicator` component — shows "אופליין — ההפלגה תישמר כשתהיה רשת" when offline, or "{n} הפלגות מחכות לסנכרון" when the queue depth is ≥ 3. Wired into the Drive screen's top bar.
- Both hooks mounted in `App.tsx` alongside `useAuthBootstrap`.

**Auth bootstrap extended**
- On sign-in, also calls `pullFamilyState()` (so drives + islands land) and flushes any pending queue from a previous session.
- Hydrates queue length on startup so the offline indicator shows unsynced work that survived a reload.

**Tests (21 total, all passing)**
- `lib/balance.test.ts` — 10 (table-driven)
- `store/drivesStore.test.ts` — 5:
  - No-op on zero-tap drive
  - Enqueues `insert_drive` on any tap
  - Enqueues `unlock_island` for fair-winds tier
  - Enqueues `find_coastal` for coastal tier
  - Skips server enqueue when pirates lack serverIds
- `sync/worker.test.ts` — 6:
  - No-op when offline
  - No-op when already syncing
  - Dispatches each queued write + clears queue
  - Stops on transient failure, preserves order + bumps attempts
  - Drops items on unique-violation (idempotency)
  - Drops permanent failures but continues the flush

### Status

- `npm run build` — 131 modules, 469 kB JS / 136 kB gzip, 24 kB CSS. Dynamic imports (queue + worker) emit separate chunks. Clean typecheck.
- `npm test` — 21/21 pass
- Dev server serves every route
- Supabase project + RLS verified earlier

---

## Manual test plan

With the dev server running (`npm run dev`) and auth fixed (see "known issue" below):

1. **Sign in**, land on home with a seeded family, three default pirates
2. **Start a new voyage**, tap pirate buttons, complete a drive. Check Supabase Studio → `drive` and `drive_participant` tables → the drive + 3 participant rows should appear within seconds
3. **Trigger a balanced drive** (all three pirates similar minutes). Check `island_unlocked` → a new row with `drive_id` referencing the drive
4. **Rename a pirate in Settings**. Check `pirate` table → the slot's `name` column updates
5. **Change a threshold slider in Settings**. Check `family_settings` → the column updates
6. **Offline test:** open DevTools → Network → toggle "Offline". Complete a drive. Reveal still plays. Top of the drive screen shows the offline indicator. Toggle online again → within a few seconds the queue drains, drive shows up in Supabase Studio
7. **Two-device test:** sign in on phone + laptop with the same Google account. Complete a drive on phone. Switch to laptop → refocus the tab → the drive appears in Map / Settings history. (No real-time: you may need to blur and re-focus or pull-to-refresh.)
8. **Queue persistence test:** complete a drive offline, close the tab, reopen. The offline indicator still shows the unsynced drive. Go online → it drains.

---

## Known issues / gotchas

1. **Sign-in still broken on the deployed Vercel URL** — `VITE_SUPABASE_ANON_KEY` is missing from Production env vars. Fix: `npx vercel env add VITE_SUPABASE_ANON_KEY production` (paste the JWT), then `npx vercel --prod`.

2. **`drive_participant.pirate_id` requires server UUIDs** — the legacy DEFAULT_PIRATES used by the dev/demo flow have no `serverId`, so if you skip sign-in and play the demo, drives don't hit the server. That's by design; pre-auth usage is effectively demo mode.

3. **Coastal finds aren't exposed in-app yet** — we record `find_coastal` writes and the `coastal_find_found` rows land on the server, but the v2 drivesStore doesn't track a list of finds anywhere the screens can render (v2 only ever showed `latestFind` during reveal). Phase 5's DataSection / parent settings export can surface them later.

4. **`drive_participant.total_minutes`** is rounded from seconds — if you complete a fast-clock demo drive of 130s, the server sees `total_minutes=2`. The balance math uses seconds locally, so the tier is correct; the server value is just a display-rounded duration.

5. **`perPirate` ordering in pulled drives** — for drives pulled from the server, `perPirate` is in `drive_participant` join order, not kid/mom/dad slot order. Settings history only uses `totalMin`, so this doesn't manifest — but if you ever render per-pirate bars from a pulled drive, you'd need to join participants with pirates-by-serverId first.

6. **Auto-save of unfinished drives** (dev spec §14) is NOT implemented. Closing the tab mid-drive loses in-progress state. Phase 6 work.

7. **`v3 developer spec §10` first-sign-in v1/v2 wipe warning** is NOT implemented. Since you don't have local v1/v2 users in the wild (you built this fresh), skipping the wipe prompt is safe. Add it back if you ever re-introduce a local-only mode.

---

## What's left — Phases 4, 5, 6

Each phase has real pre-requisites I can't satisfy from here:

### Phase 4 — invites + family management (~3 hours)
- `src/api/invites.ts` (createInvite, acceptInvite, listPendingInvites)
- `src/api/members.ts` (removeMember, transferOwnership, leaveFamily)
- `AcceptInviteScreen` at `/invite/:inviteId`
- `FamilySection` in settings — members list, invite form, owner actions
- Hebrew invite email template in Supabase Dashboard (dev spec §11)

**Needs from you before this starts:** a second Google test account added to Google Cloud OAuth consent screen's test-user list. Without it, we can't verify the accept-invite flow.

### Phase 5 — telemetry + data export + account deletion (~2 hours)
- `src/lib/hash.ts` — SHA-256 family-id hasher
- `src/api/telemetry.ts` — `recordEvent(familyId, eventName)` via `record_event` RPC
- Event emission (`app_opened`, `drive_ended`, `island_unlocked`, etc.)
- `TelemetrySection`, `DataSection` (JSON export + typed-confirm delete)

**Needs from you:** nothing hard — but worth deciding if you want a stats view in Supabase Studio to inspect events, which is "Database → Tables → event" with a date filter.

### Phase 6 — polish + edge cases + tests (~3 hours)
- Unfinished-drive recovery (auto-save every 10s per dev spec §14)
- Additional RLS/SQL tests
- Playwright E2E smoke (optional)
- `fps.skipAuth` equivalent if we want a demo mode for design partners

---

## Quick commands

```bash
npm run dev              # dev server
npm run build            # typecheck + production
npm test                 # Vitest run

# Reset your family during testing (in Supabase SQL editor):
delete from family where owner_user_id = '<your-auth-user-id>';
```
