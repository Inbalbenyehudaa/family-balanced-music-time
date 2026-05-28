# HANDOFF-v8

**Session date:** 2026-05-27
**Branch at end of session:** main (no commits this session — plan-only)

---

## 1. Code state

**Green.** Zero code changed this session. P0 timer-freeze bug is diagnosed and a fix plan is committed to the repo at `/Users/inbalbenyehudam/Private/family-balanced-music-time/timer-freeze-bug-fix-plan.md`. Implementation deferred to next session by design.

## 2. ONE thing blocking forward progress

**Verify the assumption before implementing.** The fix plan assumes the bug is mobile-OS suspension of `setInterval` (timer freezes, app stays on Drive). If during a 5-minute mobile background test the app instead **reloads to Home on return** (= iOS evicted the tab), then the suspension fix alone is not enough and we need localStorage persistence of the in-flight drive too — which is currently out of scope per the plan.

Concretely, before writing any code next session:

1. Open Drive on mobile, tap a pirate.
2. Lock the phone for 5 minutes.
3. Unlock, return to the app.
4. Note: did the app stay on Drive (timer just frozen) → plan covers it. Or did it reload to Home / sign-in → plan needs persistence added before implementing.

## 3. First command next session

```bash
cat /Users/inbalbenyehudam/Private/family-balanced-music-time/timer-freeze-bug-fix-plan.md
```

Then execute "Order of work next session" steps 1–8 in that file.

---

## What shipped this session

Nothing in code. Two artifacts:

| Artifact | Path |
|----------|------|
| Fix plan | `timer-freeze-bug-fix-plan.md` (project root) |
| This handoff | `family-pirate-ship/HANDOFF-v8.md` |

## Bug summary (one paragraph for fast re-orientation)

Drive-mode timer freezes when mobile app is backgrounded for ~5 min. Root cause: `drivesStore.tick()` adds a fixed `speed` per call instead of computing wall-clock delta, and `setInterval` doesn't fire while iOS Safari suspends the tab. Fix: switch `tick` to `(Date.now() - lastTickAt) * speed` and add a `visibilitychange` listener so the timer catches up the instant the page becomes visible. Files: `drivesStore.ts` (state + tick + setCurrentIdx + endDrive + cancel/reset), `screens.tsx` (both DriveRoute and SpyglassRoute tick effects), `drivesStore.test.ts` (2 new cases + seed `lastTickAt` per test).

## Constraints to remember

- `drivesStore.minutes` array holds **seconds** (v2 misnomer). Float values are fine — `formatMMSS` floors them and `endDrive` rounds to integer for the server payload.
- `tweakState.demoFastClock` should still be `false` in `src/routes/tweakState.ts` (verified at session start; flipped in v6). Don't accidentally re-enable while testing the fix.
- Demo-fast-clock under-credits by ≤7s on a tap-switch with the planned `setCurrentIdx` settle. Acceptable trade — documented in the plan.

---

*HANDOFF-v7 archived to `archive/HANDOFF-v7.deprecated.md`.*
