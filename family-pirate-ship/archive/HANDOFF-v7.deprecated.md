# HANDOFF-v7

**Session date:** 2026-05-13
**Branch at end of session:** main (after p1-ux-pass merged)

---

## 1. Code state

**Green.** Five P1s shipped (B6a, C1, B1a, B4a, C4) plus a critical Map layout bug fix. Typecheck clean throughout. All other P1s explicitly demoted to P2 with reasoning written into `specs/ux-recommendations.md`. P0 spec coverage is now 100%, P1 coverage 100% (4 done in v6, 5 done this session, 4 demoted).

## 2. ONE thing blocking forward progress

`tweakState.demoFastClock` is **still `true`** in `src/routes/tweakState.ts:13`. Drive timer runs at 8× in production. Flip before any non-test user opens the app. The TweaksPanel is DEV-only — disabling requires a code change + redeploy.

## 3. First command next session

```bash
cd /Users/inbalbenyehudam/Private/family-balanced-music-time/family-pirate-ship && git checkout -b p2-polish-pass
```

Then open `specs/ux-recommendations.md` and pick the first P2 (B1b, B2b, B7, B8, B9, B10, C2, C6, B1c — the demoted one — etc.).

---

## What shipped this session

| ID | Change |
|----|--------|
| B6a | New `LockIcon` SVG; locked-island circles now show centered padlock at 70% opacity |
| Map bug | Replaced grid-with-jitter island layout with seeded Poisson-disk placement using ResizeObserver-measured pixel field — no more island clipping or harbor overlap on small screens |
| C1 | New `.tap-feedback` utility (100ms scale to 0.94 on `:active`) applied to Home compass + map chip, Spyglass close, Map unlocked islands. Map islands use scoped `.island-tap`/`.island-tap-inner` to preserve their inline transform. Map stats drawer pinned to `position:absolute` inline so opening it doesn't reflow the island field. |
| B1a | New Voyage CTA: 🏴‍☠️ emoji replaced with redesigned `PirateFlagIcon` SVG (no pole, larger skull with eye sockets and jaw, single-bone bar with knob ends) |
| B4a | Spyglass tier banner now leads with 64px icon stacked above Hebrew text. Fair → new `SailingShipIcon` SVG, Coastal → `WaveIcon` (lifted from Reveal into shared Art.tsx), Harbor → `AnchorIcon` in tier-harbor taupe. Ship scene re-anchored to `flex items-end` so the hull rides the water foreground. |
| C4 | Pre-ConfirmEnd visual escalation: 180ms `fadeBlack` overlay before the modal mounts. Tri-state phase machine (`idle` → `flashing` → `confirming`) in DriveRoute. |
| A1 | Web fonts P1 attempted, partially worked (Heebo rendered) but two PlankButton labels stayed on system font; reverted. Spec entry updated with "deferred — not retrying without a designer pass on the full type system." |

## P1 demotions (2026-05-13)

Written into the spec with reasoning. Summary:

- **B1c** (settings 56px) → P2. Parent-facing surface, no irreversible mis-tap risk.
- **B5b + C3** (Harbor warmth) → P2. B5a's anchor icon already carries tone; full Reveal cinematic plays for all tiers.
- **C5** (first-session hints) → P2. Existing affordances (B2a anchor + colored fill, spyglass glow pulse) cover the learning path; instructional UI heavier than warranted.

## P2 backlog for next session

Anything left at P1 or unspecified — pick from the spec:
- B1b (map chip thumbnails)
- B2b (drop "מאזין/ה עכשיו" text)
- B1c, B5b, C3, C5 (the demotions above, available if revisiting)
- B7 (island detail), B8 (roll call), B9 (onboarding), B10 (parent screens)
- C2 (ambient life on Drive/Spyglass), C6 (audio — design only)

## Constraints to remember

- Hebrew RTL: `flex-row-reverse` puts the *last* DOM child on the leading (right) side. For "icon leads in RTL," put text first in source, icon second.
- SVG `color` props don't resolve CSS variables — pass hex literals.
- Tailwind class `font-body` resolves to `var(--font-body)` (currently SF Pro fallback after A1 was reverted). Tokens still exist; if A1 is retried someday, the wiring is already there.
- Map drawer must use inline `position: absolute` because `.tex-grain` rule sets `position: relative` from theme.css and wins over Tailwind utility class order.

---

*HANDOFF-v6 archived to `archive/HANDOFF-v6.deprecated.md`.*
