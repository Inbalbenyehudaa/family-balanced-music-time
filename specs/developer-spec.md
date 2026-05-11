# Developer Spec — Family Pirate Ship (current state)

This spec describes the code that actually ships today in `family-pirate-ship/`. It is an entry point for a new engineer reading the repo on day 1 — what's there, how the moving parts fit, where to look. It is not a roadmap and it is not the old v3 design doc (those live under `archive/specs/*.deprecated.md`).

The material is split across four files; this one is the overview + index:

- `specs/developer-spec.md` — this file. Stack, repo layout, routing, stores, balance math, testing, build, known gotchas.
- `specs/architecture.md` — module boundaries, data model (SQL schema), RLS model, RPCs, Edge Function.
- `specs/api.md` — what each `src/api/*.ts` file exposes and the Supabase calls it wraps.
- `specs/sync.md` — the offline queue, worker, pull reconciliation, and flush triggers.

---

## 1. Tech stack

React 18 + TypeScript (strict) built with Vite 5. Routing via React Router 7 in SPA mode (Vercel rewrites everything to `index.html`). State in Zustand. Offline queue in IndexedDB via `idb-keyval`. Styling is Tailwind 3 with `tailwindcss-rtl` (Hebrew-first). Backend is Supabase (Postgres + Auth + RLS + Edge Functions) pinned to an EU region. Testing with Vitest + jsdom + React Testing Library. No Redux, no TanStack Query, no CSS-in-JS. Single Page App, no SSR.

Deps that matter: `@supabase/supabase-js`, `zustand`, `idb-keyval`, `react-router-dom`, Tailwind + RTL plugin, Vitest. See `family-pirate-ship/package.json`.

## 2. Repo layout

```
family-balanced-music-time/
├── family-pirate-ship/              ← the app
│   ├── src/
│   │   ├── App.tsx                  router shell + boots hooks + dev tweaks bridge
│   │   ├── main.tsx                 ReactDOM.createRoot + StrictMode
│   │   ├── routes/                  route map (index.tsx), guards, screen adapters
│   │   ├── screens/                 v2-shape screens + v3 auth screens (SignIn,
│   │   │                            AuthCallback, FamilyNaming, InviteAccept)
│   │   ├── components/              Art.tsx, ScreenBackground, OfflineIndicator,
│   │   │                            PlankButton, IOSDevice (legacy, unused in v3)
│   │   ├── store/                   Zustand stores: auth, pirates, drives,
│   │   │                            settings, sync
│   │   ├── api/                     Supabase client wrappers (one file per
│   │   │                            table/domain) + errors.ts
│   │   ├── sync/                    queue.ts, worker.ts, pull.ts, resetFamily.ts
│   │   ├── hooks/                   useAuthBootstrap, useOnlineStatus,
│   │   │                            useSyncOnFocus
│   │   ├── lib/                     balance.ts (pure tier math), islandMigration,
│   │   │                            pendingInvite (sessionStorage latch)
│   │   ├── styles/theme.css         CSS custom props consumed by Tailwind config
│   │   ├── data.ts                  ISLANDS + COASTAL_FINDS content catalog
│   │   ├── types.ts                 domain types (server + v2 shapes)
│   │   ├── utils.ts                 hex/RGB helpers + legacy computeTier re-export
│   │   └── __tests__/               cross-module tier-flow test
│   ├── supabase/
│   │   ├── migrations/0001..0006    schema + RLS + RPCs (see architecture.md)
│   │   ├── functions/invite-family-member/  Edge Function (Deno)
│   │   └── README.md                one-time Supabase + Google OAuth setup
│   ├── HANDOFF-v3.md                what shipped after Phase 3
│   ├── package.json, vite.config.ts, vercel.json, tailwind.config.js
│   └── .env.local.example
├── specs/                           ← this directory
└── archive/                         old specs + the original claude.ai HTML handoff
```

The Avatars/, Images/, Design changes/ and microcopy-review.md folders at `family-pirate-ship/` root are static assets and design notes, not compiled into the app.

## 3. App shell + routing

`main.tsx` mounts `<App />` inside `<StrictMode>`. `App.tsx` wraps `<BrowserRouter>` → `<Shell>` which (a) runs three bootstrap hooks and (b) renders `<AppRoutes />` inside an `rtl`/`lang="he"` container with class `app-shell`. A `<DevTweaksBridge>` renders only when `import.meta.env.DEV` is true.

Bootstrap hooks, mounted side-by-side:

- `useAuthBootstrap` — resolves the Supabase session once, subscribes to auth-state changes, pulls family state + flushes the queue after sign-in. Handles the "session races with onAuthStateChange" ordering bug by funneling both the initial `getSession()` path and the subscription callback through one `resolveUser` function; `isLoading` only flips to false after `refreshFamily` has resolved.
- `useOnlineStatus` — mirrors `navigator.onLine` into `syncStore.isOnline` and triggers a flush when the browser fires the `online` event.
- `useSyncOnFocus` — on window `focus` and document `visibilitychange`, runs `flush()` then `pullFamilyState()` (flush first, so queued local edits aren't clobbered by a stale server read). Also runs a 60-second heartbeat flush while the tab is visible + online.

### Route map (`src/routes/index.tsx`)

| Path                         | Guard               | Screen                 |
|------------------------------|---------------------|------------------------|
| `/`                          | `RedirectIfAuthed`  | `SignInScreen`         |
| `/auth/callback`             | (none)              | `AuthCallbackScreen`   |
| `/invite/:inviteId`          | (none)              | `InviteAcceptScreen`   |
| `/debug/auth`                | (none)              | `AuthDebugScreen`      |
| `/onboarding/family`         | `RequireAuth`       | `FamilyNamingScreen`   |
| `/onboarding/welcome`        | `RequireFamily`     | `ScreenWelcome`        |
| `/onboarding/names`          | `RequireFamily`     | `ScreenNames`          |
| `/onboarding/crew`           | `RequireFamily`     | `ScreenCrewReady`      |
| `/home`                      | `RequireFamily`     | `ScreenHome`           |
| `/drive/roll-call`           | `RequireFamily`     | `ScreenRollCall`       |
| `/drive/active`              | `RequireFamily`     | `ScreenDrive`          |
| `/drive/spyglass`            | `RequireFamily`     | `ScreenSpyglass`       |
| `/drive/reveal`              | `RequireFamily`     | `ScreenReveal`         |
| `/map`                       | `RequireFamily`     | `ScreenMap` + detail   |
| `/settings/gate`             | `RequireFamily`     | `ScreenMathGate`       |
| `/settings`                  | `RequireFamily`     | `ScreenSettings`       |
| anything else                | —                   | `<Navigate to="/" />`  |

Screens live in `src/screens/*.tsx`; the adapters in `src/routes/screens.tsx` translate between v2 screen props (callbacks + locally-held state) and v3 stores. The v2 screens are deliberately untouched so the UI layer stayed stable through the Phase 2–3 rewiring.

### Guards (`src/routes/guards.tsx`)

Three guards read `useAuthStore`:

- `RequireAuth` — bounces to `/` if `user` is null. Renders a loading spinner while `isLoading` is true so a returning user isn't shown sign-in mid-session-restore.
- `RequireFamily` — requires both `user` and `family`. If `user` is set but `family` is null, it branches:
  - `familyError` present → render `FamilyLookupError` (retry + sign-out buttons).
  - Otherwise → redirect to `/onboarding/family`, **unless** a pending-invite id is stamped in sessionStorage, in which case it diverts to `/invite/<id>` (see §7).
- `RedirectIfAuthed` — wraps `/`; if the user is authed with a family, redirects to `/home`. This prevents a signed-in returning user from seeing the sign-in button.

All three render the same `LoadingShell` while `isLoading` is true.

## 4. Data model, RLS, RPCs, Edge Function

See `specs/architecture.md` for: SQL tables and their relationships, the cascade-delete chain, the RLS policies (plus the `is_family_member` / `is_family_owner` helpers), the list of RPCs in `0003`–`0006`, and what the `invite-family-member` Edge Function does.

## 5. API client wrappers

See `specs/api.md` for what each `src/api/*.ts` file exposes. One-paragraph summary: one file per table/domain (auth, families, pirates, drives, islands, settings, invites), all going through the `supabase` client from `api/client.ts`, all errors normalized via `api/errors.ts` into an `AppError` with codes `UNAUTHENTICATED | NETWORK | CONFLICT | NOT_FOUND | FORBIDDEN | UNKNOWN`.

## 6. State — the five Zustand stores

All stores live in `src/store/`. They're plain `zustand/create` instances — no middleware, no persist plugin, no immer. Each store is a singleton; screens read via the `useFooStore(selector)` hook, imperative code via `useFooStore.getState()`.

- **`authStore.ts`** — `user`, `family`, `members`, `role`, `isLoading`, `familyError`. Actions: `signInWithGoogle`, `signOut`, `refreshFamily`, `clearAll`. `refreshFamily` calls `getMyFamilyAndRole()` then prefers the profile-enriched `list_family_members_with_profile` RPC (falls back to the RLS-scoped `listMembers`). It also detects a stale JWT (localStorage token but server-deleted user) via message matching and force-signs-out rather than looping the user through onboarding.
- **`piratesStore.ts`** — `pirates: Pirate[]` (kid/mom/dad, three fixed slots). Two writers: `setPirates` is pull-time hydration (no enqueue); `savePirates` is the user-save path — it diffs against current state, serially enqueues one `update_pirate` per changed slot, then fires `flush()`. Serial enqueue is deliberate: without the queue mutex (see §9) parallel enqueues used to clobber each other.
- **`drivesStore.ts`** — timer state (`active`, `minutes` *(actually seconds — see §8)*, `tapCounts`, `currentIdx`) plus accumulated state (`drives`, `unlockedIslandIds`, `latestUnlock`, `latestFind`). `startDrive` / `tick` / `setCurrentIdx` / `cancelDrive` are local-only. `endDrive` computes the tier via `calculateBalance`, writes locally so reveal plays immediately, then enqueues `insert_drive` + optionally `unlock_island` / `find_coastal`, and fires a fire-and-forget flush. Pirates without a `serverId` (pre-auth / demo mode) skip the enqueue.
- **`settingsStore.ts`** — `settings: Settings`. `setSettings(patch)` merges locally and enqueues `update_settings`; `hydrateSettings(next)` is the pull-time no-enqueue variant. `reset()` restores `DEFAULT_SETTINGS`.
- **`syncStore.ts`** — the UI surface of the offline queue: `queueLen`, `isOnline`, `isSyncing`, `lastSyncAt`, plus the in-memory queue mirror. `enqueue`, `flush`, `clear` are thin wrappers that lazy-import `src/sync/queue.ts` and `src/sync/worker.ts` so pulling this store into a screen doesn't drag the IDB code into contexts that don't need it. `hydrateSyncQueue()` is exported separately and called from `useAuthBootstrap` on startup so the offline indicator reflects writes that survived a reload.

## 7. Screens worth naming

Most screens are v2 UI and aren't interesting to the backend engineer. Three are new in Phase 2 and 4 and worth calling out:

- `SignIn.tsx` — the Google OAuth entry point. Reads `?returnTo=/foo` off the URL and stashes it in sessionStorage key `auth.returnTo` so `AuthCallback` can redirect there after the Google handshake.
- `AuthCallback.tsx` — consumes the Supabase hash/code fragment; on new-user first-sign-in it routes to `/onboarding/family`, otherwise `/home`, and honors `auth.returnTo`.
- `InviteAccept.tsx` — `/invite/:inviteId`. Four states: `valid`, `mismatch` (signed-in email ≠ `invitee_email`), `invalid` (expired/revoked/accepted), `need_sign_in` (kicks to `/?returnTo=/invite/:id`). It also stamps the pending-invite id in sessionStorage on mount (`src/lib/pendingInvite.ts`), which the guards read so a signed-in-but-familyless user doesn't get bounced to `/onboarding/family` and create a duplicate family.

`FamilyNaming.tsx` handles onboarding: it calls `createFamily()` on submit, which RPC-seeds the three default pirates + default settings server-side, and then `refreshFamily()` hydrates the store.

## 8. Balance math (`src/lib/balance.ts`)

Pure function `calculateBalance({ totalsSeconds, active, fairWindsThreshold, harborThreshold, minimumDriveMinutes }) → { tier, biggestShare }`. Tier is `'fair_winds' | 'coastal' | 'harbor' | 'solo'` (`TierV3`). Rules:

1. Everyone-inactive or total-seconds-zero → `harbor` (biggestShare 0).
2. Total minutes below `minimumDriveMinutes` (default 2) → `harbor`. Minimum-length check runs before tier comparison so a perfectly-balanced 60-second drive is still harbor.
3. Exactly one active participant → `solo` (biggestShare 1). `solo` folds to legacy `fair` via `tierV3ToLegacy` for v2 screens but never triggers an island unlock.
4. Otherwise: `biggestShare = max(considered) / sum(considered)`. ≤ `fairWindsThreshold` (default 0.6) → `fair_winds`. ≤ `harborThreshold` (default 0.75) → `coastal`. Otherwise `harbor`.

Defaults live in `src/types.ts` `DEFAULT_SETTINGS` and mirror the server defaults in migration `0001_init.sql`. Both thresholds are stored per-family in `family_settings`.

**Units caveat.** The `drivesStore.minutes` array is misnamed: its elements hold **seconds**, since `tick(speed)` increments by integer `speed` per 1-second interval. `calculateBalance` accepts seconds; screens convert to display minutes with `Math.floor(seconds / 60)`. The tests in `src/lib/balance.test.ts` (10 cases, table-driven) cover the minimum-length floor, threshold boundaries, the inactive-pirate filter, the solo branch, and custom threshold overrides.

Legacy helper `computeTier(minutes, active, fair, harbor)` in the same file is only for v2 screens that haven't been migrated to the new API; it takes either seconds or minutes (the name was ambiguous in v2) and returns the legacy triple. Prefer `calculateBalance` in new code.

## 9. Offline sync

See `specs/sync.md` for the full walkthrough of the IDB queue, the worker dispatch logic, error classification, pull reconciliation, and flush triggers.

## 10. Testing

Five test files, 29 tests total:

| File | Cases | Coverage |
|------|-------|----------|
| `src/lib/balance.test.ts` | 10 | All tier-math branches incl. threshold boundaries + solo + min-length |
| `src/store/drivesStore.test.ts` | 8 | `endDrive` enqueue behavior (no-op / insert / unlock / find / no-serverId); perPirate kid/mom/dad ordering; inactive-participant shape; `max(perPirate) ≤ totalMin` invariant at two layers |
| `src/sync/queue.test.ts` | 4 | Lock semantics — the "three parallel enqueues" regression that caused name-edit reverts |
| `src/sync/worker.test.ts` | 6 | offline / already-syncing no-ops, dispatch-and-drain, transient-stops-at-head, 23505-drops, permanent-failure-drops-but-continues, concurrent-append survives |
| `src/__tests__/tier-flow.test.tsx` | ~1 | Cross-module integration: store → reveal → map → settings |

Total 29 tests (HANDOFF-v3.md quotes 21, which was the count before the drive-store precision fixes and tier-flow integration test landed).

**Gaps worth flagging.** No tests on `sync/pull.ts` (server-wins vs union vs preserve-local), `sync/resetFamily.ts` (the four-step sequence that guards against pull-re-hydration), `api/invites.ts` (the FunctionsHttpError body-recovery path), `authStore.refreshFamily` (the stale-JWT force-sign-out branch), or any of the guard/routing logic. No Playwright / E2E smoke tests. No SQL / RLS tests on the server side — the HANDOFF calls this out as Phase 6 work and the code hasn't caught up.

Run: `npm test` (Vitest run-once) or `npm run test:watch` (watch mode with UI). Environment is jsdom; `idb-keyval` is mocked per-test (see `queue.test.ts:8-23`).

## 11. Build + deploy

Scripts in `family-pirate-ship/package.json`:

- `npm run dev` — Vite dev server on `5173`.
- `npm run build` — `tsc -b && vite build`. Production bundle is ~469 kB JS (136 kB gzip) + 24 kB CSS per HANDOFF-v3.md. The dynamic imports in `syncStore.ts` (queue + worker modules) emit separate chunks.
- `npm run typecheck` — `tsc -b --noEmit`.
- `npm test` / `npm run test:watch` — Vitest.

TypeScript config (`tsconfig.app.json`) is `strict: true` plus `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.

Vercel config (`vercel.json`) is one rule: rewrite every path to `/index.html` so client-side React Router handles deep links (e.g. `/invite/:id` from the invite email).

### Environment variables

`.env.local.example` lists three required variables on the browser:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_TELEMETRY_HASH_SALT` — referenced by the envvar example but no code reads it yet (telemetry is Phase 5)
- `VITE_PUBLIC_APP_URL` — also referenced by the example, not currently read by client code; the Edge Function reads its own `PUBLIC_APP_URL` secret

The Edge Function expects (Dashboard → Edge Functions → Secrets): `SUPABASE_SERVICE_ROLE_KEY`, `PUBLIC_APP_URL`. `SUPABASE_URL` and `SUPABASE_ANON_KEY` are auto-injected by the Edge runtime.

**Known production gotcha** (from `HANDOFF-v3.md` §1): production Vercel deployments need `VITE_SUPABASE_ANON_KEY` set in the Production env-var group or sign-in silently fails on the deployed URL. Fix: `npx vercel env add VITE_SUPABASE_ANON_KEY production`, paste the JWT, then `npx vercel --prod`.

### First-time Supabase setup

`family-pirate-ship/supabase/README.md` walks through project creation, applying the six migrations, wiring Google OAuth (consent screen + client + Supabase auth provider + redirect URL allow-list), deploying the `invite-family-member` function, and the `.env.local` values. Don't copy that walkthrough into this spec — just point new engineers at it.

## 12. Known gaps / gotchas a reader will hit

Lifted from HANDOFF-v3.md, filtered to the items that affect how the current code reads:

- **`drivesStore.minutes` is actually seconds.** The name is a v2 holdover. The tick interval adds integer `speed` once per second; `endDrive` converts to minutes with `Math.floor`. If you see `minutes[currentIdx] += speed`, that's seconds.
- **`drive_participant.total_minutes` is rounded from seconds.** The server stores both `total_minutes` (legacy, pre-0005) and `total_seconds` (canonical since 0005). Reads fall back to `total_minutes * 60` only when `total_seconds = 0`, so historical rows don't vanish. Display minutes come from floor-dividing seconds.
- **`perPirate` ordering in pulled drives is by slot (kid/mom/dad).** `api/drives.ts::toV2Drive` explicitly joins `drive_participant.pirate_id` against the family's pirate rows and rebuilds `perPirate` in SLOT_ORDER. HANDOFF-v3.md §5 says this *doesn't* happen (claims Postgres join order) — the code disagrees; the join-by-slot fix landed after HANDOFF was written.
- **Pre-auth drives don't reach the server.** `DEFAULT_PIRATES` in `piratesStore.ts` have no `serverId`, so `endDrive` detects empty `participants` and returns early. Effectively, unauthed usage is demo mode.
- **Coastal finds aren't exposed in-app.** `find_coastal` writes land on the server and `pull.ts` reads them, but the code currently `void`s the `findIds` list because v2 only ever rendered `latestFind` during reveal.
- **Reset-family is not "clear local state."** `sync/resetFamily.ts` runs a four-step dance (clear queue → server wipe via RPC → reset local stores → re-pull) because the naive "just reset local state" approach got silently undone by the next focus pull.
- **Auto-save of unfinished drives (v3 dev spec §14) is not implemented.** Closing the tab mid-drive loses the in-progress timer state.
- **First-sign-in v1/v2 wipe warning** from the v3 dev spec §10 is also not implemented. There are no local-only v1/v2 users in the wild, so it's moot for now.
- **Island id migration.** `lib/islandMigration.ts` holds a rename map (`cocoa-coast → cocoa-beach`, etc.) applied in `pull.ts` when reading server rows. If you ever change an island id, add the old → new mapping there or history rows disappear from the Map screen.
- **TweaksPanel is dev-only** (`import.meta.env.DEV`) and holds the `demoFastClock` tweak. That's wired via a module-scoped object in `src/routes/tweakState.ts`, not through a store — intentional; the only consumers are the Drive/Spyglass tick effects.

---

Continue to `architecture.md`, `api.md`, `sync.md` for the per-area detail.
