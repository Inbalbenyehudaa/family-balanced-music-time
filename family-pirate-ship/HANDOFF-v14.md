# HANDOFF-v14

**Session date:** 2026-09-23
**Branch at end of session:** main, pushed (`3f6a93a`)
**Deployed to prod:** yes — `family-pirate-ship.vercel.app`, bundle `index-i7Oiy-Fc.js`,
verified to contain both the fallback guard and the prefetch.

---

## 1. Code state

**Green. Island art now survives a voyage that ends with no connection, QA'd on device.**

- `npm test` — 182 passing, 10 new this session. Tier-flow's 8 failures are unchanged and
  untouched: that file never imports Art, Map or the new hook.
- `npx tsc --noEmit` clean. `npx vite build` clean. `dist` is 2.0MB, down from 94MB.
- No migration. No schema change. Nothing to apply in Supabase.
- Inbal ran the real trace: app open with signal, airplane mode, drive, end a voyage that
  unlocked a **new** island. The art rendered.

## 2. ONE thing blocking forward progress

**The Vercel git integration cannot be trusted to deploy.**

Commit `2fca074` auto-deployed. Commit `56dd7eb` did not — 40 polls over 10 minutes showed
prod still serving the previous bundle. It only reached prod because Inbal deployed manually.
Until this is understood, *every* session has to verify what prod is actually serving rather
than assuming a push shipped.

Related and probably the same root cause: the deployment URL
`family-pirate-ship-oed18j85c-inbalbenyehudaas-projects.vercel.app` sits under the
**personal** scope and 302s to Vercel SSO, while HANDOFF-v13 records the project as
team-owned under `team_v6hECyCkoa2yyAJzNa5VFmyL`. If two projects are both wired to this
repo, they are drifting apart. Check `vercel project ls` under both scopes.

How to check what prod is really running, in one command:

```bash
JS=$(curl -s https://family-pirate-ship.vercel.app/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js')
curl -s "https://family-pirate-ship.vercel.app/$JS" | grep -c saveData   # 1 = prefetch is live
```

## 3. First command next session

```bash
npx vercel project ls --scope team_v6hECyCkoa2yyAJzNa5VFmyL
```

Then the same without `--scope`, and compare.

---

## What shipped this session

| Artifact | Path | Commit |
|----------|------|--------|
| `Cache-Control: immutable` on `/assets/*` | `vercel.json` | `7d8215a` |
| 26 images re-encoded to 600px WebP | `src/assets/**` | `2fca074` |
| Imports repointed at `.webp` | `src/components/Art.tsx` | `2fca074` |
| `useRasterStatus`, `MissingArtMark`, `?` on failure | `src/components/Art.tsx` | `56dd7eb` |
| `IslandThumb` with `onError` | `src/screens/Map.tsx` | `56dd7eb` |
| Fallback tests | `src/components/Art.test.tsx` | `56dd7eb` |
| `usePrefetchArt` + `ART_URLS` | `src/hooks/usePrefetchArt.ts` | `3f6a93a` |
| Prefetch tests + App wiring pin | `src/hooks/usePrefetchArt.test.tsx` | `3f6a93a` |

## Five things worth not re-deriving

**A locked island's art is never fetched until the reveal.** The map draws a padlock for
anything locked (`Map.tsx:193`) and `IslandDetail` only opens for unlocked islands
(`Map.tsx:183`). So the image for the island you are about to unlock has, by definition,
never been requested on that device. **Caching can never fix the new-island reveal** — only
prefetching can. This is the insight the whole session turned on, and the first fix missed it.

**The original bug was a header, and it was total, not flaky.** Vercel served every asset
`public, max-age=0, must-revalidate`. `must-revalidate` forbids using stale bytes when
revalidation fails, so with no network the browser *must* error rather than use the good copy
it already holds. Offline art could never render, ever.

**A missing `/assets/*` path now returns `index.html` at 200 with immutable headers.** The SPA
rewrite catches it. Harmless in practice — `index.html` itself still revalidates, so clients
never keep referencing dead asset paths — but it means **a typo'd asset path looks exactly
like this bug**. Check the content-type before assuming caching is broken again.

**Full-resolution originals are in `Images/` and `Avatars/` at the repo root**, untouched, at
1024–2048px. `src/assets` holds only 600px WebP, sized for the largest render anywhere
(188 CSS px, `IslandDetail` at 240 through the SVG's 172/220 inset) at 3× DPR.

**`useRasterStatus` resolves through an `HTMLImageElement`, not the SVG `<image>` error
event.** That event is specified but inconsistently implemented, and it only ever runs when
the network is already failing. `'loading'` renders the art rather than the fallback, which
is also why jsdom — where nothing loads — keeps drawing art in tests.

## Backlog

- **Read `app_diagnostic`.** Three sessions old now. `drive_resumed`/`gapSec`,
  `drive_break_started`/`_ended`/`breakSec`, and whether `detail` on error rows is clean.
- **Service worker precache.** The prefetch relies on the HTTP cache, which is evictable.
  If art goes missing again between drives, Cache Storage is the durable answer. Build only
  if that actually happens.
- **`npx vite build` warns the bundle is over 500KB.** 512KB, no code splitting anywhere.
- **Designer spec §5.3 says End Voyage is 130×44.** It is `w-[150px] h-14`. Pre-existing drift.
- **Tier-flow's 8 failing tests.** Pre-existing since before v10, still unowned.
- **Dead export.** `useDevTweaks` in `src/routes/screens.tsx` still has zero callers.
- **No product analytics emitter yet.** `recordProductEvent` still has no callers.

## Constraints to remember

- **BSD `sed` has no `\|` alternation.** It matches a literal `|` and silently does nothing —
  no error, no diff. Use `sed -E`. This cost a confusing no-op this session.
- `cwebp` is at `/Users/inbalbenyehudam/anaconda3/bin/cwebp`. Not on a clean PATH.
- **The prefetch's "already ran" flag is module-level**, so it resets on every page load. That
  is intentional: re-requests are cache hits, and a reload is the cheapest retry there is.
- `drivesStore.minutes` holds **seconds** (v2 misnomer), stored as floats.
- **vitest runs with `globals: false`** — any test file that renders must call `cleanup()` in
  its own `afterEach`. This has now cost confusing failures four times.
- **Three hooks are referenced only from `App.tsx`**: `useDriveSessionPersistence`,
  `useTelemetry`, and now `usePrefetchArt`. The third is pinned by a source-level test in
  `usePrefetchArt.test.tsx`; the other two are still unpinned.
- `tweakState.demoFastClock` must stay `false` (`src/routes/tweakState.ts:10`).
- `record()` must never throw and never block.
- **`npx vercel` needs `--scope team_v6hECyCkoa2yyAJzNa5VFmyL`.** Without it: "Not authorized".
- `tsconfig.app.tsbuildinfo` is tracked but is only the incremental cache. Don't commit it.

---

*HANDOFF-v13 archived to `archive/HANDOFF-v13.deprecated.md`.*
