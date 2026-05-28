# HANDOFF-v9

**Session date:** 2026-05-28
**Branch at end of session:** main (1 commit ahead of origin — `60ff5a9`)

---

## 1. Code state

**Green.** Zero code changed this session. The `timer-freeze-bug-fix-plan.md` was tightened (hook extraction, eviction probe promoted to step 1, explicit test seed line numbers, demoFastClock pre-flight) and committed. Implementation still deferred to next session.

## 2. ONE thing blocking forward progress

**The suspension-vs-eviction probe must run first.** The plan now makes this step 1 of next session's work order, before any code edits. Without it, you might ship the fix and still see "the bug" because iOS evicted the tab outright (which needs persistence — out of scope).

The probe (30 seconds on a real iPhone):

1. Open Drive on mobile, tap a pirate.
2. Lock the phone for 5 minutes.
3. Unlock, return to the app.
4. **If you land on `/drive/active`** (timer just frozen) → the plan covers it. Proceed.
5. **If you land on `/home` or sign-in** → iOS evicted the tab. Stop. Re-scope with persistence before any code edits.

## 3. First command next session

```bash
cat /Users/inbalbenyehudam/Private/family-balanced-music-time/timer-freeze-bug-fix-plan.md
```

Then run the probe in §2 above. Then execute the file's "Order of work next session" steps 2–10.

---

## What shipped this session

| Artifact | Path | Commit |
|----------|------|--------|
| Plan revisions (hook + probe + test seeds + demoFastClock pre-flight) | `timer-freeze-bug-fix-plan.md` | `60ff5a9` |
| This handoff | `family-pirate-ship/HANDOFF-v9.md` | uncommitted |

## What changed in the plan vs. v8

- New `useTickEffect()` hook in `src/routes/useTickEffect.ts` instead of duplicating the tick effect across DriveRoute and SpyglassRoute.
- Suspension-vs-eviction probe is now step 1 of work order, not buried in §Risk.
- Test seeding lists exact line numbers (59, 81, 104, 128, 187, 204, 239) — no more "may need to add `lastTickAt`."
- Manual QA pre-flight checks `tweakState.demoFastClock === false` before mobile testing.

## Constraints to remember

- `drivesStore.minutes` holds **seconds** (v2 misnomer). Floats are fine — `formatMMSS` floors, `endDrive` rounds for server payload.
- `tweakState.demoFastClock` must stay `false` (verified at `src/routes/tweakState.ts:10`).
- Demo-fast-clock under-credits by ≤7s on a tap-switch with the planned `setCurrentIdx` settle. Acceptable, documented inline.

## Uncommitted carry-over (not from this session)

- `.DS_Store` modified — ignore.
- `family-pirate-ship/HANDOFF-v7.md` deletion + `archive/HANDOFF-v7.deprecated.md` creation — leftover from a prior session's archive move. Commit or revert next session.

---

*HANDOFF-v8 archived to `archive/HANDOFF-v8.deprecated.md`.*
