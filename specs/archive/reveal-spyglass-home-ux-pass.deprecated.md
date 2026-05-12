# Reveal / Spyglass / Home / Drive — UX + copy change spec

**Date:** 2026-05-12
**Author:** Inbal (PM) + UX design partner
**Target:** Coding agent, to implement after review
**Scope:** Visual and layout fixes only. No functional or feature-logic changes.
**Test devices:** iPhone 13 Pro (390×844 CSS px, 460 ppi), Samsung Galaxy Z Flip 3 (~375×819 CSS px when unfolded, ~425 ppi). All rules must stay responsive on 360–430 px widths.

---

## Summary of changes

| # | Screen | File | Change |
|---|--------|------|--------|
| 1 | Reveal | `src/screens/Reveal.tsx`, `src/components/Art.tsx` (`FrostedBanner`) | Restack layout: banner higher and smaller, outcome icon smaller (still covers sun), guaranteed gap above avatars/ship |
| 2 | Reveal | `src/components/Art.tsx` (`FrostedBanner`) | Reduce banner height, font size, width, and fill opacity |
| 3 | Spyglass | `src/screens/Spyglass.tsx`, `src/components/Art.tsx` (new shared banner) | Swap `PennantBanner` for the same `FrostedBanner` used in Reveal. Move emoji to end of text. Center-align if text wraps |
| 4 | Drive | `src/screens/Drive.tsx` | Remove 🪵 emoji from "סיימו הפלגה" button |
| 5 | Home | `src/screens/Home.tsx` | Shift ship down so hull sits on the sea line instead of overlapping the sun |

---

## 1. Reveal screen — layout restack

### Problem

On iPhone 13 Pro (390×844):
- The tier outcome banner (`FrostedBanner`) and the coastal-find / island icon sit too close together.
- The outcome icon (coastal find or island, 200×200) overlaps the pirate ship and its avatars — the inner label of the coastal find ends *below* the horizontal line of the avatars, and the island icon visually overlaps the ship's hull.
- The sun in the background is currently covered by the outcome icon. That behavior must be preserved.

### Focus hierarchy (do not change)

Three focal elements in this order:
1. **Outcome icon** (coastal find or island) — the reward reveal
2. **Pirate ship** — the kid's crew
3. **"שמור והתחל" CTA** — the exit

The tier banner is context, not focus. It should read as a subtitle, not a headline.

### Required layout changes (`src/screens/Reveal.tsx`)

All positions below are the **required final state** when `stage >= 4`. Values use `clamp()` so they stay responsive from 360 px to 430 px viewports, and from 640 px to 900 px heights.

#### Banner — move up

Current (line 150–162):
```tsx
<div className="absolute inset-x-6" style={{ top: 'clamp(40px, 9vh, 100px)', ... }}>
  <FrostedBanner tier={tier}>...</FrostedBanner>
</div>
```

**Change to:**
```tsx
<div
  className="absolute z-[6] flex justify-center"
  style={{
    top: 'clamp(16px, 3.5vh, 40px)',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(260px, 75vw)', // match CTA width feel; see "Banner width"
    animation: 'fadeUp 700ms',
  }}
>
  <FrostedBanner tier={tier}>...</FrostedBanner>
</div>
```

**Why:** pushes the banner into the top safe-area zone, frees the middle third of the screen for the outcome icon, and visually subordinates the banner to the icon.

**Banner width rule:** the banner should feel the same width as the `שמור והתחל` CTA at the bottom (currently `inset-x-6` → full-width minus 48 px). Do NOT inherit the CTA's full width — cap it at `min(260px, 75vw)` so it reads as a subtitle chip, not a header bar.

#### Outcome icon — shrink, keep covering sun, guaranteed gap above ship

**Size:** reduce `IslandIllustration` and `CoastalFindIcon` from `size={200}` to:
```ts
size={'clamp(140, 38vw, 170)'} // implement as a number via runtime calc — see note
```
Because both components take a `size` prop (number), implement like this inside the screen:
```tsx
const [outcomeSize, setOutcomeSize] = useState(160);
useEffect(() => {
  const update = () => {
    const vw = window.innerWidth;
    setOutcomeSize(Math.max(140, Math.min(170, vw * 0.42)));
  };
  update();
  window.addEventListener('resize', update);
  return () => window.removeEventListener('resize', update);
}, []);
```
Then: `<IslandIllustration island={unlockIsland} size={outcomeSize} />` and `<CoastalFindIcon find={coastalFind} size={outcomeSize} />`.

**Background sun check:** `HarborScene` sun is at `top: 38%` with width 90 px (plus a 260 px soft glow halo). On a 390×844 viewport that puts the sun center at ~320 px from top. With the new icon vertical center at ~33% viewport height (see below), a 160-px icon's center lands at ~278 px — close enough that the icon body (80 px radius) + its own `fogClear` halo fully cover the sun disc. **If the sun peeks around the outcome icon on either test device, enlarge the icon up to 180 px** by changing the runtime calc bounds below to `Math.max(140, Math.min(180, vw * 0.42))`. Do not go over 180.

**Vertical position:**

Current coastal (line 188–198): `top: calc(clamp(170px, 26vh, 270px) - 21px)`
Current fair/island (line 165–185): `top: clamp(130px, 22vh, 230px)`

**Change both to the same vertical anchor:**
```tsx
style={{
  top: 'clamp(96px, 16vh, 150px)',
  animation: 'fadeUp 1200ms ease-out 600ms backwards',
}}
```

**Why:** keeps the icon vertically closer to the top third (under the banner), and keeps coastal and island sharing the same visual slot so the reveal choreography feels consistent.

#### Ship — DO NOT change size or position

Ship stays at `bottom: clamp(80px, 14vh, 180px)` with `width={340}`.

**Minimum-gap rule between outcome icon and ship/avatars:**
The bottom of the outcome icon container must sit at least **40 px** above the top of the avatar row on a 390×844 viewport. Dev: verify with DevTools ruler after implementing the changes above. If the minimum-gap rule fails on taller devices (iPhone 16 Pro, 430×932), the icon can enlarge up to 170 px and drop to `clamp(110px, 18vh, 165px)` — use whichever keeps the ≥40 px gap.

#### Save button CTA — no change

`שמור והתחל` stays at `bottom: clamp(24px, 5vh, 56px)`, `inset-x-6`.

### Required changes to `FrostedBanner` (`src/components/Art.tsx` line 984–1010)

Currently:
```ts
padding: '14px 22px',
background: 'rgba(251, 241, 220, 0.17)',
fontSize: 20,
borderRadius: 18,
```

**Change to:**
```ts
padding: '8px 16px',                    // ↓ reduce height
background: 'rgba(251, 241, 220, 0.10)', // ↓ reduce fill opacity (was 0.17)
fontSize: 15,                            // ↓ smaller subtitle feel (was 20)
borderRadius: 14,                        // slightly tighter to match smaller height
lineHeight: 1.25,                        // allow graceful wrap
```

Keep: `backdropFilter`, `border`, `boxShadow`, `color`, `textShadow`, `fontFamily`, `fontWeight: 700`, `letterSpacing`.

**Text-wrap behavior (applies to Reveal and Spyglass):**
- If text drops to a second line, text must remain centered (`textAlign: 'center'` — already set).
- Banner height is intrinsic (no fixed height). The 8 px top/bottom padding keeps it tight on one line and graceful on two.

---

## 2. Reveal — banner height / font / width (covered in §1 changes to `FrostedBanner`)

Handled by the `FrostedBanner` edits in §1. No separate changes required.

---

## 3. Spyglass — banner swap + emoji placement + alignment

### Problem

- The current Spyglass banner (`PennantBanner`, `Art.tsx` line 923) uses a pennant-shape SVG with solid tier colors. Visually inconsistent with the new Reveal banner.
- Emojis lead the text (`⛵ רוח גבית!`, `🌊 הספינה קצת נטויה...`) — Inbal wants them at the **end** of each string.
- On narrow widths where text wraps, alignment becomes unbalanced.

### Required changes (`src/screens/Spyglass.tsx`)

#### Swap the banner component

Replace `PennantBanner` with `FrostedBanner` (same component used in Reveal §1):

```tsx
// Line 3 — update import
import { PirateShip, PirateAvatar, FrostedBanner } from '../components/Art';
```

```tsx
// Line 106–108 — replace the banner block
<div className="mt-6 px-6">
  <div style={{ width: 'min(260px, 75vw)', marginInline: 'auto' }}>
    <FrostedBanner tier={banner.tier}>{banner.text}</FrostedBanner>
  </div>
</div>
```

**Same width rule as Reveal:** `min(260px, 75vw)`, centered. `FrostedBanner` will inherit the updated padding/font/opacity from §1.

#### Move emojis to end of text (line 57–69)

```tsx
const bannerMap: Record<Tier, { tier: Tier; text: ReactNode }> = {
  fair:    { tier: 'fair',    text: 'רוח גבית! זמן האזנה שווה ⛵' },
  coastal: { tier: 'coastal', text: 'הספינה קצת נטויה... אזנו את הזמן 🌊' },
  harbor:  {
    tier: 'harbor',
    text: (
      <span className="inline-flex items-center gap-[6px]">
        <span>מישהו משתלט, אתם לא זזים</span>
        {harborIcon}
      </span>
    ),
  },
};
```

**Notes:**
- In Hebrew (RTL), "end" of the logical string = visual left side of the line. Keep the emoji/icon as the last token in the string so it ends after the last word.
- For `harbor`, the custom `harborIcon` SVG (lines 27–55) stays as-is — just move it from before the text to after.
- The `inline-flex` wrapper preserves vertical alignment between the SVG and the text baseline.

#### Wrap alignment

`FrostedBanner` already has `textAlign: 'center'`. No additional work needed — if the banner text wraps to two lines, both lines center. Remove the `pointer-events-none` class if present on the wrapper (currently line 106) — it's harmless but unnecessary.

#### Consistency across statuses

Same banner component, same padding, same font, same opacity, same wrapper width across fair / coastal / harbor. Tier color differentiation happens inside `FrostedBanner`'s `tier` prop IF we decide to tint the fill — currently `FrostedBanner` ignores `tier` (line 984, prop is declared but not used). **Leave it that way.** The banner should read as one consistent chip across all three states; only the text content changes.

---

## 4. Drive — remove emoji from end-voyage button

### Required change (`src/screens/Drive.tsx` line 197)

```tsx
// Before
🪵 סיימו הפלגה
// After
סיימו הפלגה
```

No other changes to the button (hold-to-confirm behavior, styling, width, woodgrain caps all stay).

---

## 5. Home — ship overlapping sun

### Problem

On mobile, the pirate ship hovers over the sun rather than sailing on the sea. The ship container is vertically centered in the remaining space (between the top chip row and the CTA stack), which on short viewports lands the hull ~45% from the top — directly on top of the sun (at 38% in `HarborScene`).

### Required change (`src/screens/Home.tsx` line 52–66)

Current:
```tsx
<div className="flex flex-1 items-center justify-center py-6">
  <div className="w-full" style={{ maxWidth: 'min(100%, clamp(240px, 72vw, 420px))' }}>
    <PirateShip width={420} cargo={[0, 0, 0]} colors={...} sailing bobbing />
  </div>
</div>
```

**Change to:**
```tsx
<div className="flex flex-1 items-end justify-center pb-2">
  <div className="w-full" style={{ maxWidth: 'min(100%, clamp(240px, 72vw, 420px))' }}>
    <PirateShip width={420} cargo={[0, 0, 0]} colors={...} sailing bobbing />
  </div>
</div>
```

**Why:** swapping `items-center` → `items-end` anchors the ship to the bottom of its flex container (just above the CTA stack). `py-6` → `pb-2` removes the top padding so the ship can drop further, keeps a small breathing space above the primary CTA. On the test devices the ship's hull should now sit in the lower third of the screen, on the painted sea waves.

**Do not touch `HarborScene`.** The sun stays at 38%. The ship just stops floating in front of it.

**Visual verification:**
- iPhone 13 Pro: ship hull should land around y=500–600 px, clearly on the sea strokes.
- Galaxy Z Flip 3: same proportional position.
- Narrower viewports (360 px): ship may shrink via `clamp`; anchor remains bottom.

---

## Responsiveness rules (applies everywhere)

- Use `clamp(min, preferred, max)` for all absolute positioning, never hard-coded px.
- Test on widths 360, 390, 430 px and heights 640, 780, 900 px before calling this done.
- Never use `vh` alone — always `dvh` or the `clamp(px, vh, px)` pattern already used elsewhere in the codebase.
- Safe area: `top: clamp(16px, 3.5vh, 40px)` respects iOS notches on 13 Pro.

---

## Out of scope (do NOT change)

- Pirate ship size on any screen.
- `HarborScene` sun position or background.
- Reveal stage timing (`useEffect` in Reveal.tsx line 32–41).
- `IslandIllustration` and `CoastalFindIcon` internal SVGs.
- Any functional logic (tier computation, cargo stacks, voyage state).
- Microcopy review items already flagged in `family-pirate-ship/microcopy-review.md` — those are tracked separately.
- Reveal verdict banner emojis — decision made to keep Reveal text-only; the outcome icon carries the emotional weight. Spyglass emojis are the only banner emojis in the app.

---

## Definition of done

A dev (or coding agent) implementing this spec should be able to:

1. Open Reveal on iPhone 13 Pro viewport and see:
   - [ ] Banner in the top ~5% of screen, narrower than before, lower fill opacity, smaller font
   - [ ] Outcome icon (island or coastal find) centered in the top third, smaller than before (140–170 px)
   - [ ] Outcome icon still covers the sun
   - [ ] At least 40 px of clear space between outcome icon and avatar heads
   - [ ] No overlap between outcome icon and ship hull
   - [ ] CTA unchanged at bottom
2. Open Spyglass and see:
   - [ ] Banner visually identical to Reveal banner (same shape, padding, font, opacity)
   - [ ] Emoji appears at the END of each banner text (after the last word)
   - [ ] Harbor SVG icon moved to the end
   - [ ] Text centered whether one or two lines
3. Open Drive and see:
   - [ ] End-voyage button reads "סיימו הפלגה" (no 🪵)
4. Open Home and see:
   - [ ] Ship hull sits on the sea waves, not floating in front of the sun
   - [ ] Sun visible behind/around ship, not covered

All four verifications must pass on both test devices (iPhone 13 Pro, Galaxy Z Flip 3) and at 360/390/430 px browser widths before the spec is closed.

---

## Open questions for verification before dev starts

None. Spec is ready for implementation.
