# Timer freeze bug — fix plan

**Status:** P0 bug. Plan only — implementation deferred to next session.
**Date authored:** 2026-05-27.

## The bug

Drive-mode timer freezes (or resets to its pre-background value) when the app is backgrounded on mobile (lock screen or app-switched away) for ~5 minutes. On return, the per-pirate `mm:ss` reads exactly what it read when the user left. No catch-up.

## Root cause

The tick is count-based, not wall-clock-based.

`src/routes/screens.tsx:119-125` (DriveRoute) and `:176-182` (SpyglassRoute):

```ts
setInterval(() => {
    const speed = demoFastClock ? 8 : 1;
    useDrivesStore.getState().tick(speed);
}, 1000);
```

`src/store/drivesStore.ts:79-85` (`tick`):

```ts
tick: (speed) =>
    set((state) => {
        if (state.currentIdx < 0 || !state.active[state.currentIdx]) return state;
        const next = [...state.minutes];
        next[state.currentIdx] += speed;          // ← assumes interval fired exactly once
        return { minutes: next };
    }),
```

Mobile browsers (iOS Safari especially) suspend JS execution when the tab is backgrounded or the screen locks. `setInterval` simply doesn't fire while suspended. Because `tick` adds a fixed `speed` per call instead of comparing wall-clock timestamps, no time is credited for the suspension window. The store already captures `driveStartedAt: Date.now()` but only reads it at `endDrive` — never to compute current elapsed.

There is no localStorage persistence of the in-flight drive (HANDOFF-v3 §12 already calls this out). Likely a separate concern: the reported repro is suspension, not eviction. Persistence is not in scope for this fix.

## Out of scope

- localStorage persistence of in-flight drive (`HANDOFF-v3.md` §12 — unfinished-drive auto-save).
- Service Worker / Wake Lock API to keep audio playing while backgrounded.
- Anything not on the Drive timer path.

## Files touched

1. `family-pirate-ship/src/store/drivesStore.ts` — switch tick to wall-clock delta.
2. `family-pirate-ship/src/routes/useTickEffect.ts` — **new file**. Extract the duplicated tick + visibility-change effect into a single hook used by both DriveRoute and SpyglassRoute.
3. `family-pirate-ship/src/routes/screens.tsx` — replace the two duplicated `useEffect` tick blocks with `useTickEffect()` calls.
4. `family-pirate-ship/src/store/drivesStore.test.ts` — seed `lastTickAt` in existing tests + add 2 new cases.

## Implementation — `drivesStore.ts`

### State additions

```ts
export interface DrivesState {
    // ... existing fields
    lastTickAt: number | null;   // wall-clock ms of the last tick; null when not driving
}
```

In `initialState`:

```ts
lastTickAt: null as number | null,
```

### `startDrive`

Set the wall-clock anchor when the drive begins:

```ts
startDrive: (active) =>
    set({
        active,
        minutes: [0, 0, 0],
        tapCounts: [0, 0, 0],
        currentIdx: -1,
        driveInProgress: true,
        driveStartedAt: Date.now(),
        lastTickAt: Date.now(),
    }),
```

### `tick` — wall-clock delta version

```ts
tick: (speed) =>
    set((state) => {
        const now = Date.now();
        const last = state.lastTickAt ?? now;
        const elapsedSec = (now - last) / 1000;
        // No active pirate selected → just advance the anchor; don't credit anyone.
        if (state.currentIdx < 0 || !state.active[state.currentIdx]) {
            return { lastTickAt: now };
        }
        const next = [...state.minutes];
        next[state.currentIdx] += elapsedSec * speed;
        return { minutes: next, lastTickAt: now };
    }),
```

Notes:
- `minutes` becomes a float internally (was integer). Display is `Math.floor(seconds / 60)`-formatted in `formatMMSS` — already tolerant of floats. `endDrive` already does `Math.round(s)` for `perPirateSec`, so server payloads stay integer.
- After a 5-minute backgrounding, the next `tick` (or visibility-change-triggered tick) credits ~300s × speed in one call. Catch-up.

### `setCurrentIdx` — settle in-flight delta on the outgoing pirate

If we just switch `currentIdx` without crediting the time accumulated since `lastTickAt`, that time gets handed to the *new* pirate on the next tick. Bug.

```ts
setCurrentIdx: (i) =>
    set((state) => {
        const now = Date.now();
        const last = state.lastTickAt ?? now;
        const elapsedSec = (now - last) / 1000;

        // Settle elapsed time onto the OUTGOING pirate (if any), then switch.
        let nextMinutes = state.minutes;
        if (state.currentIdx >= 0 && state.active[state.currentIdx] && elapsedSec > 0) {
            nextMinutes = [...state.minutes];
            // Speed is unknown here — use 1× for the settle. Demo fast-clock is
            // dev-only; under-counting by 7× during a tap-switch in demo mode is
            // an acceptable trade vs. plumbing speed through every setCurrentIdx.
            nextMinutes[state.currentIdx] += elapsedSec;
        }

        if (i < 0 || i === state.currentIdx) {
            return { currentIdx: i, minutes: nextMinutes, lastTickAt: now };
        }
        const tapCounts = [...state.tapCounts];
        tapCounts[i] = (tapCounts[i] ?? 0) + 1;
        return { currentIdx: i, minutes: nextMinutes, tapCounts, lastTickAt: now };
    }),
```

(Trade-off documented inline: demo-fast-clock under-credits the outgoing pirate during a tap-switch by up to 7s. Acceptable — it's dev-only. If we ever want this exact, plumb `speed` through `setCurrentIdx` or read it from the same place the tick effect reads it.)

### `endDrive`

Settle the trailing partial second before computing tier:

```ts
endDrive: async (pirates) => {
    get().tick(1);             // ← settle in-flight delta first
    const state = get();
    // ... rest unchanged
}
```

We use `speed=1` here for the same reason as `setCurrentIdx`: demo-fast-clock under-credits the trailing partial second. Negligible.

### `cancelDrive` / `resetAll`

Reset `lastTickAt: null` in both.

## Implementation — `useTickEffect.ts` (new) + `screens.tsx`

Both `DriveRoute` and `SpyglassRoute` ran identical tick effects (`screens.tsx:119-125` and `:176-182`). Extract once into a hook that also wires the visibility-change listener so the timer catches up *immediately* when the user returns, instead of waiting for the next 1s interval boundary.

### `src/routes/useTickEffect.ts` (new)

```ts
import { useEffect } from 'react';
import { useDrivesStore } from '../store/drivesStore';
import { useDevTweaks } from './tweakState';

export function useTickEffect() {
    const { demoFastClock } = useDevTweaks();
    useEffect(() => {
        const fire = () => {
            const speed = demoFastClock ? 8 : 1;
            useDrivesStore.getState().tick(speed);
        };
        const id = setInterval(fire, 1000);
        const onVisibility = () => {
            if (document.visibilityState === 'visible') fire();
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [demoFastClock]);
}
```

> Note on `useDevTweaks` import path: the existing `screens.tsx` already imports from `./tweakState` (see `routes/tweakState.ts:10`). Mirror that path in the hook.

### `screens.tsx`

In `DriveRoute`, replace the `useEffect` at lines 119–125 with:

```ts
useTickEffect();
```

…and remove the now-unused `demoFastClock` destructure on line 113 if nothing else in `DriveRoute` reads it. (Spot-check: it isn't read elsewhere in `DriveRoute`, so the destructure can go.)

In `SpyglassRoute`, replace the `useEffect` at lines 176–182 with the same `useTickEffect();` call. Same removal of the `demoFastClock` destructure on line 175 if unused.

## Tests — `drivesStore.test.ts`

The new `endDrive` calls `tick(1)` first, which credits wall-clock delta since `lastTickAt`. Without seeding, that delta is "now − null → 0 (we coalesce with `?? now`)" on the first tick, but in subsequent assertions the seeded `minutes` would be off by a sub-ms float and break the strict `toEqual([3, 2, 1])` checks.

**Fix in two places:**

1. In `resetStores()` (line 14), append `useDrivesStore.setState({ lastTickAt: Date.now() });` immediately after `resetAll()`.
2. In every existing `useDrivesStore.setState({ ... minutes: ... })` block, add `lastTickAt: Date.now()` to that same setState. The blocks live at:
   - line 59 (kid 130s case)
   - line 81 (balanced 120/120/120 case)
   - line 104 (lopsided 210/45/45 coastal case)
   - line 128 (per-pirate ordering 180/120/90 case)
   - line 187 (adversarial rounding 31/31/31 case)
   - line 204 (mom inactive 240/0/60 case)
   - line 239 (no-serverIds 130/0/0 case)

That's 7 inserts. Each is a one-line addition inside the existing object literal.

### New case 1 — backgrounding catch-up

```ts
it('credits elapsed wall-clock time on tick after a long gap (mobile suspension)', () => {
    vi.useFakeTimers();
    const t0 = 1_700_000_000_000;
    vi.setSystemTime(t0);

    const s = useDrivesStore.getState();
    s.startDrive([true, true, true]);
    useDrivesStore.setState({ currentIdx: 0, lastTickAt: t0 });

    // Simulate 5 minutes of OS-suspended JS — no ticks fired.
    vi.setSystemTime(t0 + 5 * 60 * 1000);

    // The interval fires (or visibilitychange does) on return.
    useDrivesStore.getState().tick(1);

    const minutes = useDrivesStore.getState().minutes;
    // Kid (idx 0) should have ~300s credited. Allow 1s slop for fake-timer math.
    expect(minutes[0]).toBeGreaterThanOrEqual(299);
    expect(minutes[0]).toBeLessThanOrEqual(301);

    vi.useRealTimers();
});
```

### New case 2 — `setCurrentIdx` settles outgoing pirate

```ts
it('settles in-flight wall-clock time onto the outgoing pirate when switching', () => {
    vi.useFakeTimers();
    const t0 = 1_700_000_000_000;
    vi.setSystemTime(t0);

    const s = useDrivesStore.getState();
    s.startDrive([true, true, true]);
    useDrivesStore.setState({ currentIdx: 0, lastTickAt: t0 });

    // 30s pass on the kid…
    vi.setSystemTime(t0 + 30_000);
    // …then user taps mom.
    useDrivesStore.getState().setCurrentIdx(1);

    const minutes = useDrivesStore.getState().minutes;
    // The 30s belong to the kid (outgoing), not mom (incoming).
    expect(minutes[0]).toBeGreaterThanOrEqual(29);
    expect(minutes[0]).toBeLessThanOrEqual(31);
    expect(minutes[1]).toBe(0);

    vi.useRealTimers();
});
```

## Verification trace (manual QA, mobile)

**Pre-flight (do BOTH before any QA — these have bitten us before):**

- **a.** Confirm `tweakState.demoFastClock === false` in `src/routes/tweakState.ts:10`. At 8× speed every number below is wrong by 8× and you'll think the fix is broken.
- **b.** Run the **suspension-vs-eviction probe** described in the next section *first*. If iOS evicts the tab on return, this fix alone won't close the bug — stop and re-scope.

Pass criteria for closing the bug:

1. Open Drive → tap pirate A → wait 10s → confirm A reads ~0:10.
2. Lock the phone for **5 minutes** → unlock → return to the app.
3. **A reads ~5:10** (not 0:10, not 0:00, not paused). ±2s tolerance.
4. Repeat with switching: tap A for 30s, tap B for 30s, lock 5 min, return → A reads ~0:30, B reads ~5:30.
5. Repeat with app-switched-away (not lock): same expected results.

If after returning the app reloads to Home, that means iOS killed the tab outright — different bug (persistence), out of scope here. Flag it.

## Risk + assumption to verify

**Assumption:** the bug is OS suspension of `setInterval`, not the tab being fully evicted from memory.

**How to verify before the fix lands:** during the 5-min repro, watch for whether the tab returns to Home (= reloaded from scratch) or stays on Drive. If it always reloads, this fix won't be enough on its own and we need persistence too.

**Other risks:**
- `setCurrentIdx` settles at speed=1× — demo-fast-clock under-credits the outgoing pirate by up to 7s on tap-switch. Dev-only; acceptable.
- Existing test seeding may need a `lastTickAt: Date.now()` line added per test to keep trailing-tick drift sub-ms. Trivial.
- `minutes` array now holds floats internally. Display formatter (`Math.floor`) and `endDrive` payload (`Math.round`) already handle floats; spot-check `calculateBalance` accepts floats (it does — `lib/balance.ts` does ratio math).

## Order of work next session

1. **Suspension-vs-eviction probe (FIRST, before any code changes).** On the deployed app on a real iPhone: open Drive, tap a pirate, lock the phone for 5 minutes, unlock. Note whether you return to `/drive/active` (suspension — this fix applies) or to `/home` (eviction — needs persistence, out of scope; **stop and re-scope with Inbal**). 30 seconds of work, saves a wasted session.
2. Create `src/routes/useTickEffect.ts` (new file, ~20 lines).
3. Edit `drivesStore.ts` (state + `startDrive` + `tick` + `setCurrentIdx` + `endDrive` + `cancelDrive` + `resetAll`).
4. Edit `screens.tsx` — replace both duplicated tick `useEffect` blocks with `useTickEffect()` calls; remove now-unused `demoFastClock` destructures.
5. Add `lastTickAt: Date.now()` seeding to `resetStores()` and the 7 listed setState blocks in `drivesStore.test.ts`.
6. Add the 2 new test cases.
7. `npm test` → all green.
8. `npm run typecheck` → clean.
9. `npm run dev` → manual QA on mobile against the verification trace above (including pre-flight a + b).
10. Commit per spec convention: `fix · drive timer wall-clock catch-up after mobile backgrounding`.
