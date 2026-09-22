# HANDOFF-v11

**Session date:** 2026-09-17
**Branch at end of session:** main (in sync with origin)

---

## 1. Code state

**Green.** In-flight drive persistence shipped — the standing P1 since v8, promoted to observed when Inbal's Android device reproduced it in the wild.

- `npm test` — 68 passing. 23 of those are new (`driveSession` 14, `useDriveSessionPersistence` 9, `guards` 4). Tier-flow still has its 8 pre-existing failures; verified unchanged by stashing this session's work and re-running (identical 8 failed / 10 passed on baseline), and that file renders screens directly without touching routes.
- `npm run typecheck` — clean.
- `npm run build` — clean.
- Manual mobile QA — **not done.** See §2.

**Correction to v10:** that handoff listed the timer fix as un-deployed. It was in fact deployed and verified; v10 simply wasn't updated. No deploy debt carried into this session.

**`node_modules` repair:** the suite couldn't start at all — vitest 4's native rolldown binding (`@rolldown/binding-darwin-arm64`) was missing, the npm optional-dependency bug. `npm i` fixed it. If a future session hits `Cannot find native binding`, that's the remedy.

## 2. ONE thing blocking forward progress

**Device QA on the real eviction loop.** The unit tests cover the mechanism thoroughly, but they cannot prove the whole loop works on hardware. The repro that found the bug is the repro that closes it:

1. Start a voyage on the Android device, tap a pirate, let it run a minute.
2. Background the app and use the phone hard enough that Chrome discards the tab (open several heavy tabs/apps).
3. Return to the app.
4. **Expected:** you land on the Drive screen, the timer shows the time from before *plus* the time spent away, credited to the pirate who was active.
5. **Previously:** the timer read zero.

Worth checking the negative case too: a voyage left overnight should *not* resume — it should land on Home with a clean slate.

## 3. First command next session

If QA passed and the goal is to ship:
```bash
cd /Users/inbalbenyehudam/Private/family-balanced-music-time/family-pirate-ship && npx vercel --prod
```

If picking up the next P-tier session:
```bash
ls /Users/inbalbenyehudam/Private/family-balanced-music-time/specs/
```

---

## What shipped this session

| Artifact | Path | Commit |
|----------|------|--------|
| Voyage snapshot storage (save / load / clear, staleness cutoff, shape validation) | `src/store/driveSession.ts` | this session |
| Persistence hook — store subscription, throttle, lifecycle flushes, sign-out drop | `src/hooks/useDriveSessionPersistence.ts` | this session |
| Restore at store construction | `src/store/drivesStore.ts` | this session |
| `RequireActiveDrive` guard on `/drive/active` + `/drive/spyglass` | `src/routes/guards.tsx`, `src/routes/index.tsx` | this session |
| Hook mounted in the app shell | `src/App.tsx` | this session |
| Tests (23) | `src/store/driveSession.test.ts`, `src/hooks/useDriveSessionPersistence.test.ts`, `src/routes/guards.test.tsx` | this session |
| This handoff | `family-pirate-ship/HANDOFF-v11.md` | this session |

## What the fix does (one paragraph)

A voyage lived entirely in `drivesStore`, which is in-memory. Android discards a backgrounded tab under memory pressure and Chrome reloads it from the URL, so the family landed back on `/drive/active` against a freshly-constructed store: same screen, timer at zero, voyage gone. This is a *different* failure from the v10 suspension fix, which handles a tab that stays alive with its timers frozen. Now the in-flight drive is snapshotted to localStorage — chosen over the idb-keyval used by the sync queue because the writes that matter most happen in `pagehide`/`freeze` handlers moments before the tab dies, where a synchronous write lands and an async IndexedDB transaction may never flush. `drivesStore` restores the snapshot in its initializer, so the Drive screen paints the real timer on first render instead of flashing zeros, and the store's existing wall-clock `tick` credits the discarded stretch on its next fire. Only the in-flight drive is persisted; `drives`, `unlockedIslandIds`, `latestUnlock` and `latestFind` are server-owned and deliberately left to `sync/pull`.

## Two design points worth not re-deriving

**Throttling is lossless, which is the only reason it's safe.** Tick-driven writes are throttled to one per `SAVE_INTERVAL_MS` (5s), but `minutes` and `lastTickAt` are written as a matched pair, so a restore credits `(now − lastTickAt)` through the normal tick and recovers the unwritten tail along with the discarded stretch. Only a change that would misdirect that arithmetic — a tap, a roll-call edit, drive start or end — bypasses the throttle. The v10 wall-clock anchor did most of this work already.

**The guard tests `driveStartedAt`, not `driveInProgress`, and that is not an accident.** The obvious version (`driveInProgress`) breaks every completed voyage. Ending a voyage updates the store and the router in one click, but they are two independent external stores: the guard gets one render with the *new* store state and the *old* location — sitting at `/drive/active` with the voyage already finished — and its `<Navigate to="/home">` wins the race, swallowing the reveal the family just earned. `driveStartedAt` survives `endDrive` and is null only in a store that never ran a voyage, which is exactly the cold reload the guard exists to catch, and it doesn't depend on batching semantics between two stores. Locked in by the third case in `guards.test.tsx`, which drives the real `endDrive`.

## Backlog

- **Resume cutoff is a product judgment, not a technical constant.** `RESUME_MAX_GAP_MS` (`src/store/driveSession.ts`) is 2 hours. A resumed voyage credits the entire gap to whoever was active — the same rule, and the same assumption, as the visibility-change catch-up: the music kept playing while the phone sat in a pocket. Past the cutoff the snapshot is dropped so a tab discarded at bedtime can't hand someone an eight-hour voyage. Revisit if 2h feels wrong in practice.
- **Restore produces a visible timer jump.** A resumed voyage paints the pre-eviction total, then jumps by the gap when the first tick lands up to a second later. Correct, and identical to what the v10 fix already does on return from suspension, but if it reads as a glitch the fix is to credit the gap during restore rather than on the next tick.
- **Dead export.** `useDevTweaks` in `src/routes/screens.tsx:378` still has zero callers. Safe to delete next time someone touches that file.
- **Tier-flow's 8 failing tests.** Pre-existing since before v10, still unowned.
- **No crash reporting of any kind.** This session started as "can we debug last week's Android crash?" and the answer was no: no Sentry-equivalent in `package.json`, no `ErrorBoundary`, no `window.onerror`, and the `event` table has no client emitter (Phase 5). The bug was diagnosable only because the symptom mapped cleanly onto the code. A React render error would still be a silent white screen with nothing recorded anywhere.

## Constraints to remember

- `drivesStore.minutes` holds **seconds** (v2 misnomer). Stores floats internally — `formatMMSS` floors, `endDrive` rounds for the server payload, `calculateBalance` accepts floats.
- `tweakState.demoFastClock` must stay `false` (`src/routes/tweakState.ts:10`). At 8× the per-pirate timer reads wrong on prod.
- **vitest runs with `globals: false`**, so `@testing-library/react` never registers its automatic cleanup. Any test file that renders must call `cleanup()` in its own `afterEach` — without it, hooks from earlier tests stay mounted and keep mutating state into later ones. This cost a confusing failure this session.
- Persistence only runs while `useDriveSessionPersistence` is mounted in `App.tsx`'s `Shell`. Nothing else references it; if it's removed, snapshots silently stop and the bug returns with no test failure.
- `resetAll` / `cancelDrive` / the family-reset sequence all clear the snapshot for free, because the hook clears whenever no voyage is running. None of them need to know the module exists.
- Vercel project is linked: `prj_UnWjQlbdR3urANhitQYzRtMXUUlh` / team `team_v6hECyCkoa2yyAJzNa5VFmyL` / project `family-pirate-ship` (`.vercel/project.json`). Use `npx vercel` (CLI not installed globally; user hit EACCES on `npm i -g vercel`).
- `tsconfig.app.tsbuildinfo` is tracked but is just the TypeScript incremental cache — it churns on every build. Don't commit it.

---

*HANDOFF-v10 archived to `archive/HANDOFF-v10.deprecated.md`.*
