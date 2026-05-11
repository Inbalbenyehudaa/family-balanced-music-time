# Family Pirate Ship — Balanced Music Time

A family web app that tracks **who listens to whose music during car drives** — designed to teach a young child (the original user was 4.5 years old) that *balanced* family music time is the goal, not "winning" more time.

Three pirates load cargo onto the family ship every drive. If they load fairly, the ship sails out and discovers a new island. If one pirate dominates, the ship stays in the harbor. The lesson is built into the physics of the world, not stapled on as a bonus.

The UI is Hebrew (RTL).

---

## What it does (product perspective)

**The core loop.** A parent starts a drive. The kid taps one of three pirate buttons (default: Captain Kid, Mama Pirate, Papa Pirate) to mark "this pirate's music is playing right now." Time accrues to whichever pirate is currently tapped. At the end of the drive, the app reveals what cargo balance looked like and awards one of three tiers:

| Tier | Condition | Reward |
|------|-----------|--------|
| **Fair Winds** (fair) | Biggest share ≤ 60% of total time | New island unlocked on the treasure map |
| **Coastal** | Biggest share ≤ 75% | A small coastal find (trinket) |
| **Harbor** | Biggest share > 75%, or drive < 2 minutes | No unlock — the ship stayed in the harbor |

Balance — not individual contribution — is the only thing that earns progress.

**Calm by default.** During the drive the kid sees three big buttons and nothing else. No scoreboards, no counters. A **Spyglass** button lets the family peek at the current cargo balance whenever they want, so they can rebalance *during* the drive instead of only reacting at the end.

**Offline-first.** Cars go through tunnels and dead zones. Drives start, tap, end, and play their reveal cinematic with no network. Completed drives are queued in IndexedDB and sync in the background when signal returns.

**Family accounts.** One Google-authenticated user creates the family; they can invite up to 4 additional members (partner, grandparent, babysitter) via email. All members see and edit the same family data — drives, pirates, islands, settings. Data lives in an **EU region** and is strictly first-party (no third-party analytics, no cross-family stats).

**Progression content.** 15 themed islands and 8 coastal finds (bottle with a note, brass key, rubber duck, music box, etc.) — all Hebrew-named and kid-personalized.

See [`specs/family_pirate_ship_spec_v3.md`](./specs/family_pirate_ship_spec_v3.md) for the full product spec, including privacy posture and the sync model.

---

## Repo layout

```
family-balanced-music-time/
├── family-pirate-ship/          # The React app — everything runs from here
│   ├── src/
│   │   ├── App.tsx              # Router shell, auth bootstrap, online status
│   │   ├── routes/              # Route map + auth/family guards
│   │   ├── screens/             # SignIn, Onboarding, Home, RollCall, Drive,
│   │   │                        # Spyglass, Reveal, Map, Settings, InviteAccept…
│   │   ├── store/               # Zustand stores (auth, pirates, drives, settings, sync)
│   │   ├── api/                 # Supabase client wrappers (auth, families,
│   │   │                        # pirates, drives, islands, invites, settings)
│   │   ├── sync/                # IndexedDB write queue + flush worker + pull
│   │   ├── lib/balance.ts       # Tier calculation (pure; fully tested)
│   │   ├── hooks/               # useAuthBootstrap, useOnlineStatus, useSyncOnFocus
│   │   └── data.ts              # ISLANDS + COASTAL_FINDS content
│   ├── supabase/
│   │   ├── migrations/          # SQL: schema, RLS, RPCs, triggers
│   │   ├── functions/           # Edge Functions (invite-family-member)
│   │   └── README.md            # One-time Supabase + Google OAuth setup
│   ├── package.json
│   └── HANDOFF-v3.md            # Current implementation status + manual test plan
│
├── specs/                       # Product + designer + developer specs (v1 → v3)
└── initial claude design/       # Original HTML/CSS handoff from claude.ai/design
```

---

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, React Router 7, Tailwind CSS (with `tailwindcss-rtl`)
- **State:** Zustand (5 stores — auth, pirates, drives, settings, sync)
- **Persistence:** Supabase (Postgres + Auth + Row-Level Security + Edge Functions), EU region
- **Offline:** IndexedDB via `idb-keyval` — durable write queue that survives reloads
- **Auth:** Google OAuth via Supabase (no passwords, no email/password flow)
- **Testing:** Vitest + React Testing Library (21 tests across balance math, drives store, and sync worker)

---

## Install

**Prerequisites:** Node 18+, npm, a Supabase project, and a Google Cloud OAuth client.

```bash
# from the repo root
cd family-pirate-ship
npm install
```

Then complete the one-time backend setup — it takes ~45 minutes, most of it clicking through the Google OAuth consent screen. Full walkthrough in [`family-pirate-ship/supabase/README.md`](./family-pirate-ship/supabase/README.md):

1. Create a Supabase project in an **EU region** (West EU / Central EU).
2. Apply the SQL migrations in `supabase/migrations/` in order (Dashboard SQL editor, or `supabase db push`).
3. Create a Google Cloud OAuth client and connect it to Supabase.
4. Deploy the `invite-family-member` Edge Function and set its secrets.
5. Copy `.env.local.example` → `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   VITE_TELEMETRY_HASH_SALT=<32 random hex bytes — generate once, never rotate>
   VITE_PUBLIC_APP_URL=http://localhost:5173
   ```

   Generate the telemetry salt:
   ```bash
   node -e "console.log(crypto.randomBytes(32).toString('hex'))"
   ```

---

## Run

All commands are run from `family-pirate-ship/`.

```bash
npm run dev          # Vite dev server — http://localhost:5173
npm run build        # typecheck + production build to dist/
npm run preview      # serve the production build locally
npm run typecheck    # tsc --noEmit
npm test             # Vitest, single run
npm run test:watch   # Vitest, watch mode
```

First-time flow when the dev server is running:

1. Open `http://localhost:5173` → sign in with Google (must be on the OAuth test-user list during development).
2. Name the family, then name the three pirates.
3. Start a voyage from the home screen, tap a pirate button, tap "end voyage" → reveal plays.
4. Open Supabase Studio → `drive` / `drive_participant` tables → the drive and its participants should appear within seconds.

Manual test plan (including offline, two-device, and queue-persistence tests) lives in [`family-pirate-ship/HANDOFF-v3.md`](./family-pirate-ship/HANDOFF-v3.md).

---

## Key features

**Balance-first progression.** Tier math is pure and tested. A drive is only "fair winds" if the dominant pirate's share is at or below 60% of total listening time (configurable in parent settings). Drives shorter than 2 minutes are auto-demoted to "harbor" so a 10-second tap doesn't unlock an island. See [`src/lib/balance.ts`](./family-pirate-ship/src/lib/balance.ts).

**Offline-first drives.** Taps write to a Zustand store immediately. On drive end, the reveal plays from local data; in the background, a durable IndexedDB queue pushes the `insert_drive` + `unlock_island` / `find_coastal` writes to Supabase. The queue survives tab closes; transient network errors pause the flush without losing ordering; unique-violation conflicts are dropped as "already applied."

**Multi-device families.** All family data is keyed by `family_id`, not `user_id`. Parents on two different phones see the same pirates, drives, and islands. Sync is *not* real-time (by design — keeps the v1 simple); a pull happens on app focus, visibility change, and a 60s heartbeat while the tab is visible and online.

**Google-only auth.** No passwords, no reset flows. Single Google account = single family. One-way hashed family IDs keep telemetry anonymous even to the developer.

**Strict privacy posture.** First-party telemetry only, EU data region, hard-delete on request, one-click JSON export of all family data. No third-party analytics SDKs.

**Hebrew / RTL UI.** `dir="rtl" lang="he"` at the shell level, Tailwind RTL plugin, Heebo / Frank Ruhl Libre / Suez One webfonts.

**Designed for a young child's attention.** Three big buttons mid-drive, a Spyglass peek on demand, and a five-stage cinematic reveal at drive end. 15 themed islands + 8 coastal finds — each one hand-picked to land with the kid (pasta jellyfish, Paw Patrol rescue bay, Kinder Egg shore, library of reading owls).

**Responsive shell.** `.app-shell` provides a centered max-width-560px column on desktop and full-bleed on mobile. Modals are bottom-sheets on mobile, centered dialogs on desktop.

**Dev tweaks panel.** In development builds only, a floating panel exposes tier thresholds, audio/fog toggles, a fast-clock mode for demo drives, and direct navigation to every screen. Hidden in production.

---

## Status

Phases 0–3 shipped (foundation, local refactor, real auth + family creation, sync). Phases 4 (invites + family management), 5 (telemetry + data export + account deletion), and 6 (polish + edge cases) are in progress. See [`family-pirate-ship/HANDOFF-v3.md`](./family-pirate-ship/HANDOFF-v3.md) for exactly what's wired up, what's stubbed, and known gotchas.

---

## Further reading

- [`specs/family_pirate_ship_spec_v3.md`](./specs/family_pirate_ship_spec_v3.md) — product spec (trust model, screens, flows, content)
- [`specs/family_pirate_ship_developer_spec_v3.md`](./specs/family_pirate_ship_developer_spec_v3.md) — developer spec (schema, RLS, API, sync)
- [`specs/family_pirate_ship_designer_spec v2.md`](./specs/family_pirate_ship_designer_spec%20v2.md) — designer spec (visual language, component library)
- [`specs/NEXT-PHASES.md`](./specs/NEXT-PHASES.md) — remaining roadmap
- [`family-pirate-ship/supabase/README.md`](./family-pirate-ship/supabase/README.md) — backend setup walkthrough
- [`family-pirate-ship/HANDOFF-v3.md`](./family-pirate-ship/HANDOFF-v3.md) — current implementation state + manual test plan
