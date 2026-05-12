# Family Pirate Ship — Designer Spec

> Ground truth. Describes the visual language of the shipped app as it exists in code today.
> Sources: `src/styles/theme.css`, `tailwind.config.js`, `src/components/*`, `src/screens/*`, `index.html`.

---

## 1. Visual identity

A kid-warm pirate-adventure world rendered as **watercolor-illustrated painted cartoon**, not photorealism. Warm dusk-to-dawn sky, parchment interiors, wooden decks and painted buttons. The reference aesthetic is children's storybook — hand-drawn shapes, soft drop shadows, grain-and-paper textures, gently animated world elements (bobbing ship, drifting seagulls, breathing sails). Hebrew-first; everything is RTL. The register is calm and not busy — the core drive screen holds three objects and nothing else.

---

## 2. Layout system

### 2.1 The shell

All screens render inside `.app-shell`, a centered content column defined in `src/styles/theme.css`:

- Mobile: full-bleed, `width: 100%`, `max-width: 560px`, `min-height: 100dvh`. Background `var(--sand-cream)` so screens without their own background still read warm.
- Desktop (`min-width: 640px`): the column keeps `max-width: 560px`, gets `border-radius: 24px`, `box-shadow: 0 20px 60px rgba(0,0,0,0.25)`, caps at `min(100dvh, 900px)`, and is vertically centered. The body behind it paints a radial warm-brown gradient (`#F0D49B → #A87B5A → #5D3F2A`) so the column reads as an object floating over a warm wooden backdrop.
- The old iOS-phone-frame treatment (`src/components/IOSDevice.tsx`) is no longer used anywhere. See §9.

Root markup in `src/App.tsx`:

```tsx
<div dir="rtl" lang="he" className="app-shell">
  <AppRoutes />
</div>
```

`dir="rtl"` is set on `<html>` in `index.html` and repeated on the shell div.

### 2.2 Screen composition pattern

Every screen is structured as:

```
<ScreenBackground variant="...">
  <div className="relative flex min-h-[100dvh] flex-col px-... pb-... pt-...">
    [header row — usually flex-row-reverse]
    [body — flex-1, centered content]
    [footer — primary PlankButton]
  </div>
</ScreenBackground>
```

The column is painted by `ScreenBackground` absolute-positioned at z-0. Content sits above it at default stacking. Header rows consistently use `flex-row-reverse` so in RTL, the "leading" element (brand/close) lands on the right edge.

### 2.3 Modal strategy

Three modal patterns in use:

| Pattern | Where | Style |
|---|---|---|
| Bottom sheet on mobile, centered dialog on desktop | `RollCall.tsx`, `IslandDetail.tsx` | `fixed inset-0` backdrop at `rgba(30,40,50,0.55)`; sheet uses `rounded-t-[28px]` on mobile, `rounded-[28px]` + `sm:mx-4` on desktop; `animate-slide-up` entry; 5×11px drag-handle pill `sm:hidden` on mobile |
| Centered dialog | `ConfirmEnd.tsx` | `fixed inset-0 z-[110]` with 3px `wood-deep` border, `splash` animation entry, `sand-cream` background |
| Inline popover | Map statistics drawer | Positioned absolute, parchment card styling, `animate-fade-up` entry |

No modal primitive is extracted — each is hand-rolled.

---

## 3. Design tokens

### 3.1 Color palette

Defined as CSS custom properties on `:root` in `theme.css` and exposed to Tailwind via `tailwind.config.js → theme.extend.colors`. Tailwind color utilities (e.g. `bg-sand-cream`) resolve to the custom properties, so there's one source of truth.

| Role | Token | Hex | Notes |
|---|---|---|---|
| Sea — deep | `--ocean-deep` / `bg-ocean-deep` | `#1E5F7A` | Ship water, sky bottom |
| Sea — bright | `--ocean-bright` | `#5FA8C7` | Mid-sky, wave fill |
| Sea — foam | `--ocean-foam` | `#C5E0E8` | Light foam / sky top |
| Sand warm | `--sand-warm` | `#F0D49B` | Map base, PlankButton sand variant |
| Sand cream (surface) | `--sand-cream` / `--surface-card` | `#FBF1DC` | Default card/surface background |
| Wood deep | `--wood-deep` | `#5D3F2A` | Borders, text-on-tier, "end voyage" button fill |
| Wood light | `--wood-light` | `#A87B5A` | PlankButton wood variant base |
| Treasure gold | `--treasure-gold` | `#E5B23A` | Reveal "end of voyage" card, accents |
| Treasure red | `--treasure-red` | `#C84B3B` | Destructive/error text, focus states |
| Flag — kid | `--flag-kid` | `#E63946` | Red |
| Flag — mom | `--flag-mom` | `#2A9D8F` | Teal |
| Flag — dad | `--flag-dad` | `#7B4B94` | Purple |
| Tier — fair | `--tier-fair` | `#F4B942` | Warm gold — "Fair Winds" |
| Tier — coastal | `--tier-coastal` | `#6B95A0` | Muted blue-grey — "Coastal" |
| Tier — harbor | `--tier-harbor` | `#8C7A6B` | Muted brown — "Harbor" |
| Text primary | `--text-primary` | `#2A2620` | Near-black warm |
| Text secondary | `--text-secondary` | `#5D5249` | Warm grey |

**Recurring ad-hoc colors** (referenced by hex in screens, not tokenized):
- `rgba(93,63,42,0.x)` wood-deep with alpha — used everywhere for borders, box-shadows, dashed lines. This is effectively the "painted ink edge" token even though it isn't named.
- `rgba(251,241,220,0.85–0.97)` sand-cream with alpha — translucent cards / chips on non-parchment backgrounds.
- `#1E1612` — deep near-black only used as the Reveal pre-iris backdrop.

### 3.2 Typography

**Honest state:** `index.html` preloads `Heebo`, `Frank Ruhl Libre`, and `Suez One` from Google Fonts, and Tailwind maps `font-display` / `font-body` / `font-map` to `var(--font-display/body/map)`. **But** `theme.css` overrides everything with `* { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif !important; }`, and sets all three CSS variables to the same system stack. In the app as shipped, the three Google fonts never render. See §9.

Effective typography in-app:

| Token | Resolved stack | Used for |
|---|---|---|
| `font-display` | `-apple-system, SF Pro, system-ui` | All headings, button text, PennantBanner, avatar labels |
| `font-body` | Same | Paragraphs, inputs, chips, offline indicator |
| `font-map` | Same | Island name labels on Map, IslandDetail title, CoastalFind label (visually indistinguishable from the others because the stack is identical) |

**Weights used** (Tailwind): `font-medium` (500), `font-semibold` (600), `font-bold` (700). No 300 or 900.

**Size scale** (as used, not as defined — Tailwind defaults plus ad-hoc pixel values):
- Hero heading: `clamp(22px, 5vw, 32px)` (SignIn title); `text-[28px]` / `sm:text-[32px]` (Crew Ready)
- Screen heading: `text-[26px]` bold (Names, FamilyNaming, Math Gate, RollCall)
- Section heading: `text-[22px]` / `text-2xl` bold
- Button label: PlankButton `lg = 22px`, `md = 19px`, `sm = 16px`
- Body: `text-base` (16px) or `text-[17px]`
- Meta / chip: `text-sm` / `text-[13px]` / `text-xs`
- Tabular numerals: per-pirate timer uses `tabular-nums` at `text-[11px]`

Letter-spacing is only bumped for map-style labels (`letterSpacing: 0.2–0.4`). Hebrew needs no tracking, but the map labels hint at engraving.

### 3.3 Spacing, radii, shadows

**Spacing** uses stock Tailwind scale — no extensions in `tailwind.config.js`. Typical column padding: `px-4`–`px-7`, `pt-4`–`pt-10`, `pb-6`–`pb-8`. Vertical rhythm between stacked controls: `gap-[10px]`, `gap-[14px]`, `gap-6`.

**Border radii** are consistent and recognizable as part of the language:

| Radius | Used on |
|---|---|
| `rounded-full` | Circular buttons (settings compass, close X), map island markers |
| `rounded-[14px]` | End-voyage wood button, family-name input, FrostedBanner |
| `rounded-[18px]` | PlankButton, math-gate input |
| `rounded-[20px]–[22px]` | Pirate-row buttons on Drive, Names cards |
| `rounded-2xl` (16px) | Stats-drawer, history cards |
| `rounded-[28px]` | Bottom-sheet modals (RollCall, IslandDetail) |
| `rounded-t-[28px]` | Bottom-sheet top edge on mobile |
| `rounded-3xl` | "End of voyage" reveal card |

**Shadow vocabulary** — not tokenized; used as a shared idiom:

- **"Painted shadow"** (`.painted-shadow` utility in theme.css): soft dark drop, 1px inset highlight. Used on onboarding pirate cards.
- **PlankButton stacked shadow**: `inset 0 0 0 2px rgba(93,63,42,0.55)` (painted stroke) + `inset 0 -3px 0 rgba(93,63,42,0.18)` (bottom bevel) + `0 6px 0 rgba(93,63,42,0.18)` (ground drop) + `0 10px 22px rgba(93,63,42,0.22)` (ambient). On `:active`, collapses by translating 3px and shrinking the ground drop to 3px — "button presses into the plank."
- **Active pirate-row glow**: a stacked rgba halo sized to the pirate's flag color, plus `inset 0 0 0 3px` color, plus `animate-glow-pulse`. This is the only chromatic glow in the app.
- **Modal lift**: `0 10px 30px rgba(0,0,0,0.4)` (ConfirmEnd), `0 -4px 20px rgba(0,0,0,0.3)` (RollCall sheet).
- **Map aged-paper vignette**: `inset 0 0 60px rgba(93,63,42,0.4), inset 0 0 200px rgba(93,63,42,0.18)` — a darkening frame around the parchment plane.

---

## 4. Component primitives

Everything in `src/components/` plus two unavoidable inline primitives (FrostedBanner, PennantBanner) that live inside `Art.tsx`.

### 4.1 `PlankButton` — primary CTA

File: `src/components/PlankButton.tsx`; visual definition in `.btn-plank` (theme.css).

A wooden plank with painted stripes, border-inset dark stroke, a 6px "ground drop" that collapses on press. The button is always **full-width** (`w-full`) inside its container.

- **Variants**: `wood` (default, `--wood-light` fill, warmest), `sand` (`--sand-warm` fill, used for secondary actions like "back to harbor"), `cream` (`--sand-cream` fill, used for "skip" / "no"). All three share the same stroke/bevel/drop.
- **Sizes**: `lg` (64px h, 22px text), `md` (52px h, 19px text), `sm` (40px h, 16px text). Lg is the default and primary CTA. Home overrides to 72px/24px for the "New voyage" hero.
- **States**: `idle`, `:active` (translate-3px + shrunk drop), `disabled` (opacity 0.5, cursor-not-allowed). No hover state defined — the app is mobile-first.
- **Typography**: `font-display`, `font-weight: 700`, text color `--text-primary`. Emojis mixed into Hebrew labels is the norm ("🏴‍☠️ הפלגה חדשה").
- **Loading state** is not a variant — screens pass a changed child string (e.g. `{busy ? '...מתחבר' : 'כניסה עם Google'}`) and set `disabled`.

### 4.2 `ScreenBackground` — six backdrop variants

File: `src/components/ScreenBackground.tsx`. Renders a full-bleed layer beneath the screen's content. Variants:

| Variant | Used by | What it depicts |
|---|---|---|
| `harbor` | SignIn, Welcome, CrewReady, Home, Reveal (post-iris) | Dawn-to-day gradient sky `#C5E0E8 → #E5C8A8 → #E5B23A → #5FA8C7 → #1E5F7A`, sun + halo at `calc(38% - 5px)` from top, two watercolor clouds, two drifting seagulls, SVG wave band at the bottom. This is the "home world" backdrop. |
| `parchment` | Names, FamilyNaming, Math Gate, Settings | `sand-cream` + `.tex-paper` (layered radial + cross-hatch) + `.tex-grain` (SVG fractal-noise overlay at 32% opacity). "Opened ship's logbook." |
| `waves` | Drive | `sand-cream` base + 12 layered SVG wave lines at 40% opacity. Minimalist — deliberately quieter than harbor. |
| `dark` | Reveal (pre-iris only) | Solid `#1E1612`. |
| `sky` | Spyglass | Single vertical gradient sky `#C5E0E8 → #5FA8C7 → #1E5F7A` — no sun, no clouds. Cleaner than harbor so the cargo/ship reads without noise. |
| `map` | Map | `.tex-paper` + `.tex-grain` over `linear-gradient(135deg, #F0D49B, #E5C8A8)` — aged parchment plane. |

The primitive itself is thin (28 lines). `harbor` and `waves` delegate to `HarborScene` / `SubtleWaves` in `Art.tsx`; `parchment` / `sky` / `map` are inline divs; `dark` is a flat color.

### 4.3 `Art.tsx` — the illustration library

One 1,200-line file, all inline React + SVG. No separate files per illustration. The exports, grouped:

**Backdrops (SVG + absolute-positioned CSS)**
- `HarborScene` — the living sky/sea described above; also used standalone in `Reveal` with an `irisIn` clip-path reveal.
- `SubtleWaves` — line-only wave field for Drive.
- `Cloud`, `Seagull` — child pieces of HarborScene, exported but not reused elsewhere.

**Ship system**
- `PirateShip({ width, cargo, colors, sailing, sailsFull, bobbing })` — the hero illustration. 400×290 viewBox, three masts (center taller, carries a crow's-nest flag), three cargo zones, three pennants. Hull is an `#C89878 → #7C5638` vertical gradient; sails use `#FBF1DC` off-white. Sails breathe on `sailing` (3.8s `sailBreathe` keyframe with per-mast `animationDelay` stagger). Music notes rise from cargo zones (`noteRise`). Pennants flutter (`flagWave`). Cargo stacks use each pirate's `color` tinted per level. The entire container bobs when `bobbing` (`bob` keyframe — ±3px translate, ±0.6deg rotate).
- `CargoStack`, `CargoItem` — exported but only consumed by `PirateShip` internally.

**People / identity**
- `PirateAvatar({ kind, size, sleeping })` — raster PNG (`src/assets/avatars/kid|mom|dad.png`) clipped into a circle, sitting over a radial halo in the pirate's hat color (`#E63946` / `#2A9D8F` / `#7B4B94`). `sleeping` applies `grayscale(0.6) opacity(0.5)` and renders a decorative "zzz" glyph. No non-raster fallback — if an avatar PNG is missing the kid PNG is substituted.
- `FlagBadge({ color, size, waving })` — small triangular fabric pennant, SVG, with `flagWave` animation when active.

**Iconography (24–56px SVG, all inline)**
- `CompassIcon`, `SpyglassIcon`, `AnchorIcon`, `MapIcon`, `PirateFlagIcon` — mono-line icons in `#5D3F2A` / `#2A2620`. Sizes range from 20px (chips) to 56px (Drive-screen spyglass hint). `SpyglassIcon` has a `glow` prop that turns on `glow-pulse`.

**Content primitives**
- `IslandIllustration({ island, size, label, showLabel })` — raster island image (`src/assets/islands/*.{png,jpeg}`) clipped into a circular frame, with the Hebrew name rendered below in `font-map`. Also exports `ISLAND_IMAGES` as a lookup the Map screen consumes directly.
- `CoastalFindIcon({ find, size, label })` — raster find image clipped into a circle over a soft `#C5E0E8`/`#5FA8C7` water halo. Missing image falls back to a "?" glyph over a gold disc.

**Verdict banners (Reveal + Spyglass)**
- `FrostedBanner({ children })` — iOS-style frosted glass chip (`backdrop-filter: blur(10px) saturate(1.35)`, fill `rgba(251,241,220,0.06)`, padding `8px 16px`, fontSize 15, radius 14). Used in both Reveal (stage 4 verdict line, top of screen) and Spyglass (tier banner, top of screen). Width constrained to `min(260px, 75vw)` on both screens so it reads as a subtitle chip, not a header bar. Single "tier-agnostic" treatment — the `tier` prop is accepted but not visually applied; the tier cue comes from copy + the card below it.
- `PennantBanner({ tier, children })` — SVG pennant path (320×64 viewBox, notched trailing edges), filled with the tier color. **No longer used by any screen** (Spyglass migrated to `FrostedBanner`). Export retained in `Art.tsx` for now; candidate for removal.

### 4.4 `OfflineIndicator`

File: `src/components/OfflineIndicator.tsx`. A pill-shaped chip, sand-cream translucent background, 1px wood-deep border at 0.3 alpha, soft drop shadow, with a cloud emoji glyph. `font-body text-xs font-medium text-wood-deep`. Copy: `אופליין — ההפלגה תישמר כשתהיה רשת` when offline; `{n} הפלגות מחכות לסנכרון` when online but queued ≥3. Hidden otherwise. Only appears in the Drive screen's header row.

### 4.5 `IOSDevice` — deprecated

File: `src/components/IOSDevice.tsx`. Exports `IOSStatusBar` and `IOSDevice`. Neither is imported by any screen, route, or other component (verified). It's dead code left in the tree from the pre-refactor phone-frame era. See §9.

---

## 5. Screen-level patterns

### 5.1 Onboarding rhythm (Welcome → Names → Crew Ready)

- Top: `OnboardingDots` — three pills, 2×2px inactive at 30% text-primary, `w-[22px]` active filled `text-primary`, 240ms width transition.
- Body: one illustration dominant (ship bobbing, or a row of 3 avatars on wood plank, or 3 name cards).
- Footer: one primary PlankButton. Names screen adds a secondary cream "skip" button to the right of the primary (both sized `md`).
- Backgrounds alternate: `harbor` for worldbuilding moments (Welcome, Crew Ready), `parchment` for data-entry (Names).

### 5.2 Home — the quiet hub

- Header chips, two of them: compass (settings entry, right) and treasure-map chip showing island count (`{n} איים`).
- Hero: `PirateShip` sized `clamp(240px, 72vw, 420px)`, `sailing` + `bobbing`, empty cargo.
- Footer: 72px-tall "New voyage" PlankButton + 56px sand "Treasure map" PlankButton stacked.
- No counters, no list of pirates — the three pirates are represented only by the flag colors inside the ship's cargo.

### 5.3 Drive — three buttons, nothing else

The most load-bearing screen. Structure is deliberately minimal:

- Header: Spyglass icon (right), OfflineIndicator (left, hidden if healthy).
- Body: three pirate-row buttons filling `flex-1`, each `clamp(120px, 22vh, 170px)` tall. The active pirate gets the glow halo + glow-pulse animation + color-saturated background + "🎵" next to the name + 4 animated music bars at the bottom + "מאזין/ה עכשיו" italic caption. Inactive rows show flat plank treatment. "Sat out" rows drop to 50% opacity and show "לא כאן היום". Each row carries an mm:ss timer chip (top-aligned, opposite side of the music bars) and a `FlagBadge` in the top-left corner.
- Footer: the "End voyage" hold-to-confirm button — a small 130×44 wood bar with a fill that sweeps left-to-right as the user holds. Fill is `wood-deep`; label flips to `sand-cream` past 40% progress. The two striped end-caps imitate a plank's sawn ends. This is a hand-rolled primitive, not a PlankButton.

### 5.4 Spyglass — mid-drive peek

`sky` background (cleanest), FrostedBanner at top declaring the current tier in kid-readable language (tier emoji/icon appears at the visual-left end of the Hebrew text), ship centered with `sailing` + `bobbing` + avatars floating above cargo stacks, water foreground band at the bottom. "Peek the state" screen; no CTA. Close button (X) in the top-left.

### 5.5 Reveal — the cinematic

Five animation stages driven by `setState(stage)` with hardcoded timeouts in `src/screens/Reveal.tsx`:

| Stage | t (ms) | Event |
|---|---|---|
| 0 | 0 | Dark `#1E1612` screen. |
| 1 | 1500 | HarborScene iris-in (`irisIn` clip-path 1500ms). "סוף ההפלגה!" card drops in with `splash` (tilt -2deg, treasure-gold background, 3px wood-deep border). |
| 2 | 2200 | Ship fades up (`fadeUp` 600ms), cargo stacks populate. |
| 3 | 3000 | (Title exits — it renders only for `stage >= 1 && stage < 3`.) |
| 4 | 3800 | Verdict FrostedBanner appears at `clamp(16px, 3.5vh, 40px)` from top, width `min(260px, 75vw)`; tier-specific content block appears below at `clamp(115px, 23vh, 195px)`, runtime-sized 140–170px (tracks sun at `calc(38% - 5px)`): Fair → IslandIllustration fogs in (`fogClear` 2000ms); Coastal → CoastalFindIcon fades in; Harbor → no artifact. Inner label rendered at fontSize 15 to match the banner. |
| 5 | 5800 | "שמור והתחל ⚓" PlankButton fades up. |

The animation stages are inline in Reveal.tsx — no reveal primitive is extracted.

### 5.6 Map — treasure parchment

- Background: `map` variant — warm parchment with cross-hatch grain and the inset vignette + watercolor sea wash overlay.
- Top: enlarged compass (50px) on the right, "📜 הסטטיסטיקה" chip on the left that toggles a parchment stats drawer (positioned absolute under the chip).
- Island field: 15 islands laid out on a 3-column × 5-row grid (`FIELD_LEFT/TOP/WIDTH/HEIGHT = 10/14/78/72` in %), with deterministic per-island jitter (±5%), alternating-row x-offset, and ±5deg rotation — the "hand-scattered" feeling.
- Unlocked islands: 64×64 circular raster inside `#C5E0E8` disc, `animate-soft-pulse`, Hebrew name below in `font-map` 11px wood-deep bold.
- Locked islands: 56×56 dashed circle with 1px blur filter — visible but out-of-focus. Not tappable.
- Home harbor marker: a 68px `PirateShip` in the bottom-right corner with "הנמל שלנו" under it.
- Footer: sand PlankButton — "חזרה לנמל ←".

### 5.7 Island detail — bottom-sheet modal

Bottom-sheet on mobile / centered card on desktop (`items-end sm:items-center`). Sand-warm translucent background (`rgba(240,212,155,0.97)`) with `.tex-grain`. Island illustration at 180px without its label (title is rendered in `font-map` above). Body text and a dashed-border stats box (`Stat` rows: discovered date + drive length).

### 5.8 Settings — a different register

Parchment background. Top row: back arrow (right — flex-row-reverse), "הגדרות הורים" heading (left). Body is vertical `SettingsSection` cards (sand-cream, stacked) each with a section title and sliders (fair threshold, harbor threshold) or toggles (audio, fog) or history rows. No illustration. No ship. **This is the only screen in the app that reads as a form, not a world.** Deliberate — it's a parent-only screen and it's gated behind a Math Gate (`ScreenMathGate`, same parchment treatment, a single `a + b = ?` prompt at `clamp(40px, 12vw, 72px)`).

---

## 6. Iconography + illustration inventory

### 6.1 Inline SVG (`Art.tsx`)

- Scene: HarborScene (composite — sky, sun, clouds, seagulls, waves), SubtleWaves
- Ship: PirateShip (composite — hull, 3 masts, 3 sails, 3 pennants, 3 cargo zones, rising music notes, crow's nest on center mast)
- Identity: FlagBadge
- Icons: CompassIcon, SpyglassIcon, AnchorIcon, MapIcon, PirateFlagIcon
- Verdict: FrostedBanner
- Frame: `CoastalFindIcon` water-halo frame, `IslandIllustration` circular frame

### 6.2 Raster (`src/assets/`)

- `avatars/` — `kid.png`, `mom.png`, `dad.png` (three PNGs; face-forward; rendered inside circular crop with halo behind)
- `islands/` — 15 images matching the 15 IDs in `data.ts` (mix of PNG and JPEG)
- `coastal-findings/` — 8 images matching the 8 IDs in `data.ts` (mix of PNG and JPEG/JPG)

Files at `family-pirate-ship/Images/islands` and `Images/coastal-findings` are a parallel top-level image directory; the runtime imports always use `src/assets/`.

### 6.3 Emoji as iconography

Emojis appear in copy as shorthand iconography: ⚓ 🏴‍☠️ 🗺️ 🎵 🪵 📜 🔊 🌫️ 🌞 🌊 ☁️ 🤨. They're mixed into button labels and chips; Hebrew reads right-to-left around them. Not a formal icon set — treat them as content.

---

## 7. Motion + animation

All animation primitives are defined as `@keyframes` in `theme.css` and as Tailwind `animation` utilities in `tailwind.config.js`. Nothing is imported from a library (no framer-motion, no react-spring).

| Utility / keyframe | Duration | Where |
|---|---|---|
| `animate-bob` / `bob` | 2.5s infinite | PirateShip container; SignIn + Welcome hero wrapper |
| `animate-soft-pulse` / `softPulse` | 3s infinite | Unlocked islands on Map; 🎵 glyph on active pirate |
| `animate-glow-pulse` / `glowPulse` | 1.5s infinite | Active pirate row on Drive; Spyglass icon when `glow` |
| `animate-music-bar` / `musicBar` | 900ms infinite, per-bar stagger | 4 vertical bars on the active pirate row |
| `animate-seagull-drift` / `seagullDrift` | 9s / 12s infinite (two birds, staggered) | Inside HarborScene |
| `animate-iris-in` / `irisIn` | 1500ms once | Reveal stage 1 — clip-path circle expansion |
| `animate-splash` / `splash` | 800ms cubic-bezier(0.34, 1.56, 0.64, 1) | "סוף ההפלגה!" card drop in Reveal; ConfirmEnd modal entry |
| `animate-fog-clear` / `fogClear` | 2000ms once | Island reveal halo clearing |
| `animate-fade-up` / `fadeUp` | 250–700ms once | Stats drawer, Reveal stages ≥2, ≥4, ≥5 |
| `animate-fade-only` / `fadeOnly` | 360ms once | Spyglass ship enter |
| `animate-slide-up` / `slideUp` | 350ms once | Bottom-sheet modals |
| `animate-pennant-wave` / `pennantWave` / `flagWave` | 2.4s infinite | FlagBadge, mast pennants |
| `sailBreathe` | 3.8s infinite, per-mast stagger | Sails on sailing ships (inline on PirateShip, not exposed as Tailwind utility) |
| `noteRise` | infinite | Music notes rising from cargo (inline on PirateShip) |
| `waterRing`, `coinShimmer`, `spyglassExtend`, `shipSail`, `drift`, `irisOut` | — | Defined in theme.css but not referenced from any screen/component as shipped |

The palette is **world-level ambient motion plus deliberate reveal choreography** — nothing interaction-chromed (no hover scales, no button hover states, no page transitions).

---

## 8. Accessibility + RTL

- `<html lang="he" dir="rtl">` at the document level; `dir="rtl" lang="he"` repeated on the app-shell div.
- `tailwindcss-rtl` plugin registered in `tailwind.config.js`; allows logical properties (`insetInlineStart/End`) to flip automatically in RTL.
- All row-level layouts that should read "start = right" use `flex-row-reverse`; the Spyglass header is a deliberate exception (plain `flex` so the close-X lands on the left, matching the original design).
- The ship avatar row overrides `direction: 'ltr'` so the three kids render in a fixed left-to-right order regardless of document direction — children recognize their own pirate's position spatially.
- `aria-label` is set on iconic controls: settings button ("הגדרות"), map button ("פתח מפה"), close buttons ("סגור"), per-pirate timer ("זמן האזנה של {name}"), RollCall toggles ("הסר/הוסף {name} מהפלגה"), decorative SVG backgrounds marked `aria-hidden="true"`.
- Inputs use `direction: 'rtl'` and `text-right` explicitly on value entry (pirate names, family name). Math-gate input uses `text-center` because a number is direction-neutral.
- Color contrast is not formally tested. Tier-harbor text (`#FBF1DC` on `#8C7A6B`) and coastal (`#FBF1DC` on `#6B95A0`) are the tightest; fair uses dark text on gold. No one has run AA verification.
- Font choice: the document loads Hebrew-capable webfonts (Heebo, Frank Ruhl Libre) but — see §9 — the actual rendered font is the system SF Pro stack, which handles Hebrew but is a platform-dependent fallback rather than a controlled choice.

---

## 9. Known visual debt / gaps

**Verified from code, not speculation:**

1. **Webfonts load but don't render.** `index.html` preloads Heebo / Frank Ruhl Libre / Suez One, `tailwind.config.js` maps `font-display/body/map` to CSS variables — but `theme.css` resets `--font-display/body/map` to system `-apple-system, SF Pro, system-ui` AND enforces `* { font-family: ... !important }`. The Google Fonts payload is dead weight and all three typographic "roles" render identically. The README.md "Key features" section claims "Heebo / Frank Ruhl Libre / Suez One webfonts" — this isn't true of the shipped app.
2. **`src/components/IOSDevice.tsx` is dead code.** 155 lines of `IOSStatusBar` + `IOSDevice` components with zero importers. Left over from the pre-refactor phone-frame shell.
3. **Reveal stages are inline.** `src/screens/Reveal.tsx` runs its 5-stage cinematic via `useEffect(setTimeout)` with hardcoded durations and hardcoded stage-gated JSX. There's no `Reveal` primitive — a second reveal (e.g. a coastal-specific cinematic) would require duplicating the pattern.
4. **Hold-to-end-voyage is a hand-rolled primitive.** The Drive screen's "End voyage" bar with its sweeping fill, label color flip, and striped end-caps lives inline in `Drive.tsx`. Not promoted to a component; no other screen can use it.
5. **Avatar-above-cargo positioning is hand-computed.** Reveal and Spyglass both position `PirateAvatar` above the ship's cargo stacks using magic offsets tied to the ship's SVG geometry (`calc(4.138% - 63px)` in Reveal; `translateY(-${maxStack * 18 + 4 + 5 + avatarSize}px)` in Spyglass). The comments call this out. There's no shared helper.
6. **Modal chrome is duplicated.** Three different modal implementations (`RollCall`, `IslandDetail`, `ConfirmEnd`) each repeat their own backdrop-dim + sheet-shell pattern. Shared primitives: none.
7. **Parallel `Images/` folder.** `family-pirate-ship/Images/islands` and `Images/coastal-findings` exist at the package root alongside `src/assets/islands|coastal-findings`. Only the `src/assets/*` copies are imported. Unclear which is canonical.
8. **Unused keyframes.** `shipSail`, `drift`, `irisOut`, `waterRing`, `coinShimmer`, `spyglassExtend` are defined in `theme.css` but no screen or component references them.
9. **Deprecated designer specs.** `archive/in-the-making specs/family_pirate_ship_designer_spec.md.deprecated.md` and `archive/in-the-making specs/family_pirate_ship_designer_spec v2.md.deprecated.md` describe an earlier visual language with an iOS frame, phone status bar, and named webfonts. Do not treat those as current.
