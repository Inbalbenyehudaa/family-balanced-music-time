# HANDOFF-v12

**Session date:** 2026-09-22
**Branch at end of session:** main (in sync with origin — `c209e56`)

---

## 1. Code state

**Green, and everything from this session is live.**

- `npm test` — 148 passing, 78 of them new this session. Tier-flow still has its 8 pre-existing failures; verified unchanged twice by stashing the session's work and diffing the failure list, which came back byte-identical both times.
- `npm run typecheck` — clean.
- `npm run build` — clean.
- Supabase migration `0007_diagnostics.sql` — **applied** by Inbal.
- Deployed to prod — **yes**, both the telemetry build and the Settings fix, each verified after deploy.
- Device QA on the eviction repro (the v11 blocker) — **done**, passed.

The v11 P1 is closed. So is the v10 backlog item it came from.

## 2. ONE thing blocking forward progress

**Nothing.** No known bug, no unshipped work, no unapplied migration.

The one open loop is observational, not blocking: `app_diagnostic` has never been read. Every test mocks at the RPC boundary, so no real row has been inspected. Inbal is checking during the week of 2026-09-22 on a real voyage. Two things to look at:

- **`drive_resumed` rows and their `gapSec`** — the eviction measurement. Confirms from the database side what the manual QA showed on the device, and tells you how often tabs are actually being discarded mid-voyage across the family.
- **`detail` on any error row is genuinely clean.** The scrubber has 17 unit tests, but real error messages are more inventive than fixtures, and this is the one failure mode that actually matters: pirate names are children's names.

To filter to your own family: compute `SHA-256(VITE_TELEMETRY_HASH_SALT + familyId)` locally and match `family_id_hash`. The client cannot read the table — there is no SELECT policy — so this is a dashboard or service-role query.

## 3. First command next session

```bash
ls /Users/inbalbenyehudam/Private/family-balanced-music-time/specs/
```

Nothing is mid-flight. Pick from the backlog below.

---

## What shipped this session

| Artifact | Path | Commit |
|----------|------|--------|
| Diagnostics table, batch RPC, 90-day purge | `supabase/migrations/0007_diagnostics.sql` | `2e455e4` |
| Closed code enum + per-code context types | `src/telemetry/codes.ts` | `2e455e4` |
| PII scrubbing | `src/telemetry/scrub.ts` | `2e455e4` |
| localStorage ring buffer, session id, seq | `src/telemetry/buffer.ts` | `2e455e4` |
| `record()` — the only write path | `src/telemetry/record.ts` | `2e455e4` |
| Consent mirror (three-state) | `src/telemetry/consent.ts` | `2e455e4` |
| Consent-gated batch flush | `src/telemetry/flush.ts` | `2e455e4` |
| Salted family-id hashing | `src/lib/hash.ts` | `2e455e4` |
| Supabase wrappers for both channels | `src/api/telemetry.ts` | `2e455e4` |
| ErrorBoundary (the app had none) | `src/components/ErrorBoundary.tsx` | `2e455e4` |
| Global handlers, consent mirror, flush schedule | `src/hooks/useTelemetry.ts` | `2e455e4` |
| Build id stamped by vite | `vite.config.ts`, `src/vite-env.d.ts` | `2e455e4` |
| `hydrated` flag on settingsStore | `src/store/settingsStore.ts` | `2e455e4` |
| Instrumented seams | `drivesStore`, `driveSession`, `authStore`, `syncStore`, `guards` | `2e455e4` |
| Telemetry toggle in Settings (never exposed before) | `src/screens/Settings.tsx` | `2e455e4` |
| One save button governs the whole Settings screen | `src/screens/Settings.tsx` | `c209e56` |
| Plan + settled decisions | `specs/telemetry-plan.md` | `2e455e4` |
| This handoff | `family-pirate-ship/HANDOFF-v12.md` | this session |

## How the session actually went

It opened as "can we debug last week's Android crash from logs?" The answer was no — no Sentry-equivalent, no ErrorBoundary, no `window.onerror`, and the `event` table from `0001` has never had a client emitter. But the symptom Inbal described (reloaded to the timer screen, timer at zero) mapped cleanly onto the code, and the diagnosis needed no logs at all: the tab had been discarded by Android, the in-memory store came back pristine, and nothing guarded `/drive/active` against that. That was the v11 P1, already fixed and now QA'd.

That diagnosis then shaped the telemetry design more than anything else did — see below.

## Three things worth not re-deriving

**Error capture alone would not have caught either shipped bug.** Both were *silent state loss*, not exceptions. Nothing threw. An ErrorBoundary, `window.onerror`, or a third-party crash reporter would all have stayed quiet. That is why the code enum is weighted toward lifecycle integrity — voyages that start and never end, voyages resumed from a snapshot, snapshots dropped as stale, storage writes that fail — rather than toward stack traces. `drive_resumed` carrying `gapSec` is the single most useful signal in the channel.

**Consent needed a `hydrated` flag on settingsStore.** `DEFAULT_SETTINGS.telemetryEnabled` is `true`, and settings live in memory hydrated from the server — so at every cold start the app *looked* like it had consent when all it had was a default nobody chose. The store now tracks whether the server row has landed. Unknown means buffer and send nothing; false drops the buffer unsent. A test asserts the pre-hydration case directly, because it is the one that would leak.

**The Settings re-sync keys on values, not on the settings object.** The route adapter rebuilds `v2Settings` fresh on every render (`screens.tsx:298`), so the obvious `useEffect(..., [settings])` fires constantly and wipes whatever the parent is part-way through typing. Both directions — draft survives an unrelated re-render, draft yields to a real change from another device — are covered in `Settings.test.tsx`.

## Backlog

- **Read `app_diagnostic`.** See §2. Not blocking, but the channel is unproven against reality until someone looks.
- **Dead export.** `useDevTweaks` in `src/routes/screens.tsx` still has zero callers. Safe to delete next time someone touches that file.
- **Tier-flow's 8 failing tests.** Pre-existing since before v10, still unowned. They assert on rendered Hebrew labels and unlocked-island counts; nobody has looked at whether the tests or the screens are wrong.
- **Telemetry consent requires an explicit save.** Accepted deliberately (see `c209e56`): the toggle stages like every other control, so a parent could switch it off and walk away with it still on. The unsaved-changes hint is what keeps that visible. Revisit if it ever bites.
- **Anon-key insert on both telemetry RPCs.** Accepted and documented in `0007`. The anon key ships in the bundle, so anyone can insert. Mitigations are server-side truncation, a 50-row cap and a closed `level` check. Revisit only if the table fills with junk.
- **No product analytics emitter yet.** `src/api/telemetry.ts` exports `recordProductEvent`, but nothing calls it — the eight `event` enum values are still unemitted. The diagnostics channel covers debugging; this would cover "how many voyages this month". Cheap now that hashing and consent exist.

## Constraints to remember

- `drivesStore.minutes` holds **seconds** (v2 misnomer), stored as floats. `formatMMSS` floors, `endDrive` rounds for the server payload, `calculateBalance` accepts floats.
- `tweakState.demoFastClock` must stay `false` (`src/routes/tweakState.ts:10`).
- **vitest runs with `globals: false`**, so `@testing-library/react` never registers automatic cleanup. Any test file that renders must call `cleanup()` in its own `afterEach`. This has cost confusing failures twice now.
- **Never read env at module load in code that tests touch.** `hash.ts` originally did, and its test passed only because this machine has a `.env.local` — it would have failed on a fresh clone. The salt is read at call time now and tests stub it with `vi.stubEnv`.
- A test that dispatches an `ErrorEvent` with no listener attached escalates it to an uncaught exception in jsdom and fails the whole run. Swallow it with a temporary `preventDefault` listener.
- `record()` must never throw and never block. A diagnostics channel that can break the app it reports on is a liability — every failure inside it is swallowed on purpose.
- **Two hooks are referenced only from `App.tsx`**: `useDriveSessionPersistence` and `useTelemetry`. Remove either and the relevant feature silently stops with no test failure. Same weakness, shared.
- `tsconfig.app.tsbuildinfo` is tracked but is only the TypeScript incremental cache — it churns on every build. Don't commit it.
- Vercel project: `prj_UnWjQlbdR3urANhitQYzRtMXUUlh` / team `team_v6hECyCkoa2yyAJzNa5VFmyL` / project `family-pirate-ship`. Use `npx vercel` (CLI not installed globally).
- **`origin/main` was force-pushed and its history rewritten at some point before this session.** It was detected on a rejected push: local and remote shared no common ancestor despite matching commit messages. The trees were byte-identical, so rebasing onto the new base was safe and nothing was lost. Worth knowing if it happens again — compare trees before reaching for `--force`.

---

*HANDOFF-v11 archived to `archive/HANDOFF-v11.deprecated.md`.*
