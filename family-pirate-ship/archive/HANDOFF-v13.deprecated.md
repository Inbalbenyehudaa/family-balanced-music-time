# HANDOFF-v13

**Session date:** 2026-09-22
**Branch at end of session:** main, pushed (`a6af76a`)
**Deployed to prod:** yes — `family-pirate-ship.vercel.app`, verified serving the new bundle

---

## 1. Code state

**Green. Drive pause is built, deployed, and QA'd on device.**

- `npm test` — 172 passing, 24 new this session. Tier-flow's 8 failures are unchanged and
  structurally unreachable from this work: that file imports Map, Reveal, Settings and
  Spyglass and never imports Drive.
- `npx tsc --noEmit` — clean. `npx vite build` — clean.
- No migration. No schema change. Nothing to apply in Supabase.
- Inbal walked the Drive screen on device and confirmed the paused states behave: both
  doors, the gold strip, the frozen bars, the held timer chip, and ending a voyage while
  paused.
- **One case was not exercised on a real drive: a break that spans the OS discarding the
  tab.** It is covered by unit tests at both the store and snapshot layers, and `pausedFrom`
  rides the same proven snapshot path as the v11 eviction fix — but it has not been seen on
  an actual 20-minute drive. If anything about pause misbehaves in the wild, look here
  first.

## 2. ONE thing blocking forward progress

**Nothing is blocking.** No known bug, no unshipped work, no unapplied migration.

The open loop is the same one v12 left, now a session older: **`app_diagnostic` has never
been read.** Every test mocks at the RPC boundary, so no real row has ever been inspected.
It is worth more now than it was last week, because two new codes are flowing into it.

Three things to look at when you do:

- **`drive_resumed` / `gapSec`** — the eviction measurement. Still the reason the channel
  exists.
- **`drive_break_started` and `drive_break_ended` / `breakSec`** — do families actually take
  breaks, and for how long. A `drive_break_started` with **no** `drive_break_ended` after it
  means a voyage was ended or discarded while still paused; that count is what decides
  whether the deferred long-break nudge (`drive-pause-plan.md` §11) is worth building.
- **`detail` on any error row is genuinely clean.** The scrubber has 17 unit tests, but real
  error messages are more inventive than fixtures, and pirate names are children's names.

To filter to your own family: compute `SHA-256(VITE_TELEMETRY_HASH_SALT + familyId)` locally
and match `family_id_hash`. The client cannot read the table — there is no SELECT policy —
so this is a dashboard or service-role query.

## 3. First command next session

```bash
ls /Users/inbalbenyehudam/Private/family-balanced-music-time/specs/
```

Nothing is mid-flight. Pick from the backlog below.

---

## What shipped this session

| Artifact | Path | Commit |
|----------|------|--------|
| `pausedFrom`, `pauseDrive()`, `resumeDrive(i?)` | `src/store/drivesStore.ts` | `fc6bcfc` |
| `pausedFrom` in the snapshot, `v` kept at 1 | `src/store/driveSession.ts` | `04fced2` |
| Paused row, gold strip, break button | `src/screens/Drive.tsx` | `adbdf0d` |
| Two-door tap routing | `src/routes/screens.tsx` | `adbdf0d` |
| First render tests for the Drive screen | `src/screens/Drive.test.tsx` | `adbdf0d` |
| `drive_break_started` / `drive_break_ended` | `src/telemetry/codes.ts` | `6941ac3` |
| `pausedAt` (telemetry only, not persisted) | `src/store/drivesStore.ts` | `6941ac3` |
| `PauseMark`, `PlayMark` | `src/components/Art.tsx` | `6941ac3` |
| Paused row in §5.3, transport icons in §6.1 | `specs/designer-spec.md` | `a6af76a` |
| The plan that governed all of it | `specs/drive-pause-plan.md` | `a6af76a` |

## Five things worth not re-deriving

**The paused state already existed; only the memory of who was missing.** `currentIdx === -1`
has always meant "nobody is listening", and tick, the snapshot and the route guard all
already handled it. That is why this needed no migration and no tier maths.

**Paused is the PAIR, never `currentIdx` alone.** A voyage also sits at `-1` straight off
roll call, before anyone has been tapped, and that is not a break. Every check in the UI is
`currentIdx < 0 && pausedFrom >= 0`. Get this wrong and a fresh voyage renders as paused.

**The snapshot's `v` stayed at 1 on purpose.** `pausedFrom` is additive and the validator
only checks keys it knows about, so snapshots written by the previous production build load
cleanly with `-1`. Bumping the version would have discarded every in-flight voyage on the
deploy. There is a test that pins exactly this.

**`pausedAt` is deliberately NOT in the snapshot.** It exists only to compute `breakSec`. A
break interrupted by the OS discarding the tab comes back with `pausedFrom` intact and
`pausedAt` null, and the resume reports no duration rather than inventing one. This is a
known, accepted blind spot: breaks that span an eviction are never measured.

**`animation-play-state: paused` alone freezes the music bars flat.** The `musicBar`
keyframe is `4px` at both 0% and 100%, so pausing parks them flat and the row reads as
"off" rather than "stopped". Each bar carries a negative `animation-delay` to park it
part-way up its cycle. If the bars ever go flat again, that delay was dropped.

## Backlog

- **Read `app_diagnostic`.** See §2. Two sessions old now.
- **The long-break nudge.** `drive-pause-plan.md` §11. A voyage left paused dies quietly at
  the two-hour `RESUME_MAX_GAP_MS` cutoff. Build only if the telemetry says it happens.
- **Full-screen break mode.** §11. Held in reserve; materially more work.
- **Designer spec §5.3 says End Voyage is 130×44.** It is `w-[150px] h-14` and has been for a
  while. Pre-existing drift, left alone rather than folded into an unrelated change.
- **Tier-flow's 8 failing tests.** Pre-existing since before v10, still unowned. They assert
  on rendered Hebrew labels and unlocked-island counts; nobody has looked at whether the
  tests or the screens are wrong.
- **Dead export.** `useDevTweaks` in `src/routes/screens.tsx` still has zero callers.
- **No product analytics emitter yet.** `recordProductEvent` still has no callers.
- **Anon-key insert on both telemetry RPCs.** Accepted and documented in `0007`.

## Constraints to remember

- `drivesStore.minutes` holds **seconds** (v2 misnomer), stored as floats.
- **vitest runs with `globals: false`**, so `@testing-library/react` registers no automatic
  cleanup. Any test file that renders must call `cleanup()` in its own `afterEach`. This has
  now cost confusing failures three times.
- `tweakState.demoFastClock` must stay `false` (`src/routes/tweakState.ts:10`).
- **Never read env at module load in code that tests touch.** The salt is read at call time.
- `record()` must never throw and never block.
- **Two hooks are referenced only from `App.tsx`**: `useDriveSessionPersistence` and
  `useTelemetry`. Remove either and the feature silently stops with no test failure.
- `tsconfig.app.tsbuildinfo` is tracked but is only the incremental cache. Don't commit it.
- **`npx vercel` needs `--scope team_v6hECyCkoa2yyAJzNa5VFmyL`.** Without it the deploy fails
  with "Not authorized" even though `vercel whoami` succeeds — the project is team-owned and
  the CLI defaults to the personal account. This cost a failed deploy this session.
- Vercel project `prj_UnWjQlbdR3urANhitQYzRtMXUUlh`. CLI is not installed globally.

---

*HANDOFF-v12 archived to `archive/HANDOFF-v12.deprecated.md`.*
