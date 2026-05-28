# HANDOFF-v10

**Session date:** 2026-05-28
**Branch at end of session:** main (in sync with origin — `3a39a7c`)

---

## 1. Code state

**Green.** Timer-freeze P0 fix shipped, verified on a real iPhone, pushed to origin/main.

- `npm test` — drivesStore: 10/10 passing (8 existing + 2 new). Tier-flow has 8 pre-existing failures unrelated to this fix (verified by running tests on baseline before my changes).
- `npm run typecheck` — clean.
- Manual mobile QA — Inbal confirmed: bug resolved, no eviction on the 5-minute lock-screen repro.
- Deploy to Vercel — not yet run. The fix is on origin/main; next session (or whenever) just needs `npx vercel --prod` from `family-pirate-ship/`.

## 2. ONE thing blocking forward progress

**Nothing on this fix.** Bug closed.

The standing P1 backlog item (unchanged from v8): **localStorage persistence of in-flight drive** — protects against iOS *evicting* the tab outright (a different failure mode than suspension, which we just fixed). Inbal's manual repro showed suspension-only on her device, but eviction is still possible under memory pressure on older iPhones. See `archive/HANDOFF-v3.md` §12 for the original scope note.

## 3. First command next session

If the goal is to deploy what just shipped:
```bash
cd /Users/inbalbenyehudam/Private/family-balanced-music-time/family-pirate-ship && npx vercel --prod
```

If picking up the next P-tier session, default opener:
```bash
ls /Users/inbalbenyehudam/Private/family-balanced-music-time/family-pirate-ship/specs/
```

---

## What shipped this session

| Artifact | Path | Commit |
|----------|------|--------|
| Wall-clock tick + visibility-change catch-up + outgoing-pirate settle | `src/store/drivesStore.ts`, `src/routes/useTickEffect.ts`, `src/routes/screens.tsx` | `3a39a7c` |
| Tests: seed `lastTickAt` in 7 setState blocks + 2 new cases (5-min suspension catch-up, setCurrentIdx settle) | `src/store/drivesStore.test.ts` | `3a39a7c` |
| This handoff | `family-pirate-ship/HANDOFF-v10.md` | uncommitted |

## What the fix does (one paragraph)

`tick` was count-based — `setInterval` fires once → `+1s` to the active pirate. Mobile browsers suspend `setInterval` while backgrounded, so a 5-minute lock screen credited zero seconds on return. Now `tick` reads `Date.now()`, credits `(now − lastTickAt) × speed` to the active pirate, and updates the anchor. A new `useTickEffect` hook (replacing the duplicated `useEffect` blocks in `DriveRoute` and `SpyglassRoute`) wires both the 1s `setInterval` and a `visibilitychange` listener that fires the moment the tab becomes visible — so catch-up happens immediately on return, not on the next interval boundary. `setCurrentIdx` settles the in-flight delta onto the *outgoing* pirate before switching (otherwise suspended time gets handed to whoever the user just tapped). `endDrive` settles the trailing partial second before freezing totals.

## Backlog

- **P1 — in-flight drive persistence (localStorage).** Protects against iOS evicting the tab outright. Inbal didn't repro this on her device, but worth doing before this app sees more users. See `archive/HANDOFF-v3.deprecated.md` §12.
- **Dead export.** `useDevTweaks` in `src/routes/screens.tsx:378` has zero callers after this fix. Safe to delete next time someone touches that file.
- **Vercel preview deploy** of the timer fix — the bug is verified locally; a deployed-build sanity check is cheap and worth doing before promoting to prod.

## Constraints to remember

- `drivesStore.minutes` holds **seconds** (v2 misnomer). Now stores floats internally — `formatMMSS` floors, `endDrive` rounds for server payload, `calculateBalance` accepts floats.
- `tweakState.demoFastClock` must stay `false` (verified at `src/routes/tweakState.ts:10`). At 8× the per-pirate timer reads wrong on prod.
- Demo-fast-clock under-credits by ≤7s on a tap-switch (the `setCurrentIdx` settle uses `speed=1`). Documented inline; acceptable since fast-clock is dev-only.
- Vercel project is linked: `prj_UnWjQlbdR3urANhitQYzRtMXUUlh` / team `team_v6hECyCkoa2yyAJzNa5VFmyL` / project name `family-pirate-ship` (`.vercel/project.json`). Use `npx vercel` (CLI not installed globally; user hit EACCES on `npm i -g vercel`).

## Uncommitted carry-over (not from this session)

- `.DS_Store` modified — ignore.
- `family-pirate-ship/HANDOFF-v7.md` deletion + `archive/HANDOFF-v7.deprecated.md` and `archive/HANDOFF-v8.deprecated.md` creations — leftover archive moves from prior sessions, not committed yet.
- `family-pirate-ship/tsconfig.app.tsbuildinfo` modified — TypeScript incremental build cache, don't commit.

---

*HANDOFF-v9 archived to `archive/HANDOFF-v9.deprecated.md`. `timer-freeze-bug-fix-plan.md` deleted — fix is shipped, plan no longer needed (commit `60ff5a9` preserves it in git history if anyone needs it).*
