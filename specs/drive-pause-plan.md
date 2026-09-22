# Drive pause — stop the timer for a break

**Status:** approved 2026-09-22, not implemented.
**Scope:** the Drive screen and `drivesStore` only. Does not supersede `developer-spec.md`.
**Approved mock:** https://claude.ai/code/artifact/32c70112-6b55-4a08-ad95-bc183ec4640a

---

## 1. The problem

A voyage has no way to stop. When the music is paused, the car stops for petrol, or the
family takes a break, the timer keeps crediting seconds to whoever was last tapped. It is
not a case of switching to a different pirate — nobody is listening.

Today that time is credited in full to the wrong child. The tick is wall-clock based
(`drivesStore.ts:109-125`) and catches up on return from suspension, so a 25-minute stop
hands 25 minutes to whoever happened to be active when the car pulled over. That both
inflates the voyage and skews `biggestShare` toward one child, which can flip a genuinely
balanced drive into `harbor`. **Pause does not introduce unfairness into the tier; it
removes a source of it.**

---

## 2. The state already exists

`currentIdx === -1` means "nobody is listening", and every layer already handles it:

- `tick()` advances the clock anchor and credits nobody (`drivesStore.ts:113-115`).
- It is the state a voyage already starts in — `HomeRoute` sets it before roll call
  (`screens.tsx:75`).
- The snapshot persists `currentIdx`, so a paused voyage survives the OS discarding the
  tab, and `loadDriveSession` credits the eviction gap to nobody.
- `RequireActiveDrive` keys on `driveStartedAt`, **not** `currentIdx`, so a paused voyage
  does not get bounced home (`guards.tsx`).

So this is a UI affordance over a working state. **No migration, no schema change, no
server work, no new tier maths.**

The one thing missing is memory of *who* to return to, which is the only new state below.

---

## 3. Interaction — one operation, two doors

Both doors run the same store op. Neither is a shortcut for power users; the fast one is
for a parent mid-drive, the labelled one is how anyone discovers the feature exists.

**Door 1 — tap the pirate who is glowing.**
Today that tap is a no-op: `Drive.tsx:77` calls `setCurrentIdx(i)` with `i === currentIdx`,
which settles the partial second and returns the same index without counting a tap
(`drivesStore.ts:107-109`). The gesture is free to claim and the target is the largest thing
on screen.

**Door 2 — the break button in the footer.**
Labelled, and it remembers who was listening so resume does not ask a parent to pick
someone at a petrol pump.

**Resuming**

| Action while paused | Result |
|---|---|
| Tap the break button | Resume on `pausedFrom`. **No** `tapCounts` increment — a continuation, not a switch. |
| Tap the same pirate's row | Same as above. |
| Tap a *different* pirate's row | Resume on that pirate, **and** increment their `tapCounts` — this is a real switch. |

`tapCounts` is persisted per participant to the server (`drivesStore.ts:234`), so it has to
keep meaning "times this pirate was switched to". Pausing must never increment it; the
`i < 0` branch already returns before the increment, so this is preserved by construction.

---

## 4. Visual states

Three states must be distinguishable at a glance. Paused is the new one, and its whole job
is to look like **neither** of the other two — a paused pirate is present and
participating, and must not wear the sleeping treatment of a child who is not in the car.

| | Listening | **On a break** | Not in the car |
|---|---|---|---|
| Opacity | 100% | **100%** | 50% |
| Background blend | `blendColor(color, 0.45)` | **`blendColor(color, 0.30)`** | `blendColor(color, 0.15)` |
| Ring | 3px pirate colour + glow halo | **3px `--treasure-gold` + `rgba(229,178,58,0.22)` halo** | 2px `rgba(93,63,42,0.45)` |
| `animate-glow-pulse` | yes | **no** | no |
| Music bars | animating | **frozen — `animation-play-state: paused`, bars recoloured `#6B5836`** | absent |
| Glyph by name | 🎵 | **pause mark (two bars)** | — |
| Timer chip | cream, climbing | **gold, holding the number** | absent |
| Avatar | normal | **normal** | greyscale + `sleeping` |

**Gold, not grey.** Grey already means "not in the car". Gold is the app's existing
attention-without-danger hue and is nowhere near the red of End Voyage.

**The frozen bars are the point.** They do not disappear, they stop mid-height —
`animation-play-state: paused` is both the mechanism and the metaphor. Keep them.

**Paused strip.** While paused only, a gold strip sits above the top bar: pause mark +
`בהפסקה`. Give it `aria-live="polite"`. This is what stops a family driving twenty minutes
with the timer silently stopped; it costs nothing when sailing.

**Icon: the standard pause mark, not a nautical metaphor.** A five-year-old already knows
⏸ from every screen they have touched. The pirate world lives in the words and the art;
the controls stay obvious. The anchor was not available regardless — it is already on End
Voyage and would read as "finish".

**Footer layout.** Pause on the trailing side, End Voyage on the leading side — opposite
ends, deliberately. End is one 1s hold from irreversible and this screen is used in a
moving car. Do not place them side by side.

---

## 5. Microcopy (final)

| Where | Hebrew |
|---|---|
| Row caption, paused | `בהפסקה` |
| Top strip | `בהפסקה` |
| Footer button, sailing | `הפסקה` |
| Footer button, paused | `המשיכו` |
| Row `aria-label`, paused | `{name} — בהפסקה` |

Deliberately terse. The frozen gold chip already says the time stopped; the words must not
repeat it. Do not add explanatory copy to these five strings without re-review — the
brief is that a five-year-old navigates this screen.

---

## 6. What does not change

- **Spyglass.** Untouched. It reads the same per-pirate totals, so during a break it shows
  the standings frozen at the moment of pause. No paused badge, no extra chrome. It already
  keeps the tick running behind the modal on purpose (`screens.tsx:167`) and that stays
  correct: a paused voyage credits nobody whether the modal is open or not.
- **Tier maths.** `calculateBalance` already measures a voyage by credited seconds and
  never by wall clock. Paused time simply does not accumulate. With
  `minimumDriveMinutes: 2` (`types.ts:182`) this only affects a voyage with under two
  minutes of total listening. A break can never make a drive look *unfair* — nobody is
  credited, so every pirate's share stays frozen exactly where it was.
- **`endDrive` while paused.** Its leading `get().tick(1)` credits nobody when
  `currentIdx < 0`. Totals equal the pre-pause totals. Nothing to change.
- **Snapshot cadence.** `shapeOf` already includes `currentIdx`
  (`useDriveSessionPersistence.ts:29`), so pause and resume both force an immediate write
  rather than riding the 5s throttle. `pausedFrom` moves in lockstep with `currentIdx`, so
  it does **not** need adding to `shapeOf`.
- **Route guard.** Keys on `driveStartedAt`. Paused voyages are unaffected.
- **Database.** Nothing.

---

## 7. Order of work

**1 — `drivesStore.ts`**

Add `pausedFrom: number` to state and to `initialState` (`-1`). Clear it to `-1` in
`startDrive`, `cancelDrive`, `resetAll`, and in the `endDrive` early-return.

```ts
pauseDrive: () => set((state) => {
    if (state.currentIdx < 0) return {};
    const now = Date.now();
    const elapsedSec = (now - (state.lastTickAt ?? now)) / 1000;
    const minutes = [...state.minutes];
    if (state.active[state.currentIdx] && elapsedSec > 0) {
        minutes[state.currentIdx] += elapsedSec;   // settle onto the outgoing pirate
    }
    return { pausedFrom: state.currentIdx, currentIdx: -1, minutes, lastTickAt: now };
}),

resumeDrive: (i?: number) => {
    const { pausedFrom } = get();
    const target = i ?? pausedFrom;
    if (target < 0) return;
    if (target === pausedFrom) {
        // Continuation, not a switch — bypass setCurrentIdx so tapCounts is untouched.
        set({ currentIdx: target, pausedFrom: -1, lastTickAt: Date.now() });
    } else {
        get().setCurrentIdx(target);   // a real switch; counts a tap
        set({ pausedFrom: -1 });
    }
},
```

Leave `setCurrentIdx` alone. It stays the switching path.

**2 — `driveSession.ts`**

Add `pausedFrom?: number` to `DriveSnapshot` and `'pausedFrom'` to `RestoredDrive`. Write
it in `saveDriveSession`; read it in `loadDriveSession` with
`typeof s.pausedFrom === 'number' ? s.pausedFrom : -1`.

**Keep `v: 1`.** The field is additive and the existing validator only checks known keys,
so a snapshot written before this change loads cleanly with `pausedFrom: -1`. Do not bump
the version — bumping it would discard in-flight voyages on the deploy.

**3 — `Drive.tsx`**

New props:

```ts
pausedFrom: number;
onPirateTap: (i: number) => void;
onTogglePause: () => void;
```

`const paused = currentIdx < 0 && pausedFrom >= 0;` and per row
`const held = active[i] && paused && pausedFrom === i;`

Replace the row `onClick` with `onPirateTap(i)`. Add the paused row treatment from §4, the
top strip, and the footer button. Drop the `setCurrentIdx` prop.

**4 — `screens.tsx` (`DriveRoute`)**

```ts
const onPirateTap = (i: number) => {
    const s = useDrivesStore.getState();
    if (!s.active[i]) return;
    if (i === s.currentIdx) return s.pauseDrive();                      // door 1
    if (s.currentIdx < 0 && s.pausedFrom >= 0) return s.resumeDrive(i); // resume elsewhere
    s.setCurrentIdx(i);
};
```

`onTogglePause` pauses when sailing and calls `resumeDrive()` with no argument when paused.
Disable the button when `currentIdx < 0 && pausedFrom < 0` (nobody has been tapped yet).

**5 — `TweaksPanel.tsx`**

It calls `bridge.setCurrentIdx(0)` at line 224. Unaffected, but confirm it still compiles
against the bridge type in `App.tsx:122`.

**6 — designer spec**

`specs/designer-spec.md` §5.3 describes the Drive screen's states and will be stale. Add
the paused row to that paragraph and the pause mark to §6. Edit in place — do not create a
second designer spec.

---

## 8. Telemetry (recommended, not required)

Two codes in `src/telemetry/codes.ts`:

```ts
/** A break started. */
drive_break_started: Record<string, never>;
/** A break ended. `breakSec` is how long the timer was stopped. */
drive_break_ended: { breakSec: number };
```

**Do not call these `drive_resumed`** — that code already means "voyage rebuilt from the
snapshot after the OS discarded the tab", and it is the signal the whole channel was built
to produce. Colliding on the name would poison it.

No migration: `code` is deliberately not a check constraint
(`0007_diagnostics.sql:21-25`), so adding a code is a client-only change. `breakSec` is a
number, so the privacy rule is satisfied by construction.

This is the cheapest way to answer "do families actually use this, and for how long" before
deciding anything further.

---

## 9. Testing notes

- **`cleanup()` in an `afterEach` in every file that renders.** `vitest` runs with
  `globals: false`, so `@testing-library/react` registers no automatic cleanup. This has
  cost confusing failures twice in this repo.
- Pause credits nothing: tap a pirate, advance fake timers, pause, advance again, assert
  `minutes` is unchanged by the second advance.
- Resume to the same pirate leaves `tapCounts` untouched; resume onto a *different* pirate
  increments that pirate's count by exactly one.
- `endDrive` while paused produces the same totals as ending at the moment of pause.
- Snapshot round-trip: pause → `saveDriveSession` → `loadDriveSession` returns
  `currentIdx: -1` **and** the original `pausedFrom`.
- Back-compat: a `v: 1` snapshot written **without** `pausedFrom` loads with `-1` and does
  not throw.
- A paused voyage does not trip `RequireActiveDrive`.

---

## 10. Decisions settled 2026-09-22

1. Both doors ship together. The tap alone is undiscoverable; the button alone is a small
   target in a moving car.
2. Standard pause mark, no nautical metaphor. Five-year-old legibility beats theme.
3. Paused is gold at full opacity, never grey — grey means "not in the car".
4. The top strip stays. It is the only defence against a silently stopped timer.
5. Spyglass untouched.
6. A break does not count as listening time. This follows from existing tier maths and is
   the desired behaviour, not a side effect.
7. Pause and End Voyage sit at opposite ends of the footer.

---

## 11. Deferred

- **A nudge on a very long break.** A voyage left paused and forgotten dies quietly at the
  two-hour `RESUME_MAX_GAP_MS` cutoff. Worth a gentle prompt at ~30 minutes — revisit once
  `drive_break_ended` says whether it happens.
- **Full-screen break mode.** The third option from the design session: pause takes over
  the screen with one oversized resume target. Better glanceability, materially more work.
  Hold it in reserve for evidence that families leave voyages paused without noticing.
- **Two roads to `harbor` read identically.** "Too short to count" and "one person hogged
  it" produce the same tier and the same reveal, which is a pre-existing wrinkle this
  feature makes slightly easier to hit. Not in scope.

---

## 12. Estimate

Half a day. Store and snapshot changes are small and additive; most of the time is the
paused row treatment and its tests.
