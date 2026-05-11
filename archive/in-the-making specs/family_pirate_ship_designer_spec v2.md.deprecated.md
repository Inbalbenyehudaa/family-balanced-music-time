# Family Pirate Ship — Designer Spec v2

Updated spec reflecting the as-built v1 prototype. Sections marked **[CHANGED v2]** call out deviations from the original v1 spec; everything else is unchanged. Hebrew copy updates and behaviour fixes are listed at the end in §14.

---

## 0. What this app is

A private family web app for tracking who-listens-to-whose-music during car drives. Three pirates (Captain Kid, Mama Pirate, Papa Pirate) share music time. The app teaches a 4.5-year-old that *balanced* family music time is the goal — not "winning" more time. A pirate-ship metaphor: balanced cargo loading lets the ship sail to new islands. Lopsided cargo keeps it in harbor.

**Three principles to hold throughout the visual design:**

1. **Calm by default, dramatic at the reveal.** The during-drive screen must feel restful, not gamified. The end-of-drive reveal is where the visual energy lives.
2. **Quantitative without numbers.** The kid can't read clocks but he can compare cargo stacks. Every visual quantity must be readable as "more vs. less" without text.
3. **Funny, not saccharine.** The Hebrew tone is full-swashbuckling pirate-comedy, and the visuals should match — slightly silly characters, dramatic poses, never sentimental.

---

## 1. Visual Identity

**The vibe.** Hand-drawn, warm, storybook-watercolor pirate world. Think *We're Going on a Bear Hunt* (Helen Oxenbury) or *Where the Wild Things Are* — slightly imperfect lines, watercolor washes, friendly but not cute-saccharine. Closer to the cinematic warmth of *Song of the Sea* than the slick gloss of Pixar.

**Specific style attributes:**
- Hand-drawn line work with visible pencil/ink texture
- Watercolor washes with paint-bloom variation (color isn't perfectly flat)
- Warm color temperature throughout (no clinical whites, no neon)
- Slight grain or paper texture on backgrounds
- Rounded, organic shapes — minimal hard-edged rectangles
- Soft, painterly drop shadows (not crisp Material elevation)
- Generous negative space, never cluttered
- Characters are slightly exaggerated, expressive, never scary

**Reference imagery for mood:** *We're Going on a Bear Hunt*, *Where the Wild Things Are*, *Song of the Sea*, Beatrix Potter, *Moana* opening dawn scene.

**Avoid:** Pixar-glossy 3D, neon cartoon, Material Design rectangles, anything generic-kid-app, Comic Sans, emoji-as-avatars.

---

## 2. Color Palette

All hex codes finalized. Use these as design tokens.

**Sea & sky:**
- `--ocean-deep` `#1E5F7A` — deep sea, primary background for many screens
- `--ocean-bright` `#5FA8C7` — sunlit water, mid-tone
- `--ocean-foam` `#C5E0E8` — highlights, light strokes, sky

**Sand, deck & paper:**
- `--sand-warm` `#F0D49B` — deck wood, document backgrounds
- `--sand-cream` `#FBF1DC` — text fields, light surfaces, paper tone
- `--wood-deep` `#5D3F2A` — frames, ship hull, deep accents
- `--wood-light` `#A87B5A` — planks, secondary surfaces, **default tint base for the Drive-screen pirate boxes**

**Treasure accents:**
- `--treasure-gold` `#E5B23A` — coins, highlights, sun
- `--treasure-red` `#C84B3B` — accents, treasure, important emphasis

**Pirate flag colors** (each must be unmistakable at a glance — these are how the kid identifies whose section is whose, and they drive the cargo-crate color):
- `--flag-kid` `#E63946` — Captain Kid's bold red
- `--flag-mom` `#2A9D8F` — Mama Pirate's teal-green
- `--flag-dad` `#7B4B94` — Papa Pirate's deep purple

**Tier indicators** (deliberately not red-yellow-green — Harbor isn't punishment):
- Fair Winds: warm golden sun-yellow `#F4B942`
- Coastal Sailing: muted teal-grey `#6B95A0`
- Harbor: soft muted brown `#8C7A6B`

**Text & UI:**
- `--text-primary` `#2A2620` — warm near-black
- `--text-secondary` `#5D5249` — soft brown-grey
- `--surface-card` `#FBF1DC` — cards on light backgrounds
- `--surface-modal` `#F0D49B` at ~95% opacity over dimmed scene

---

## 3. Typography **[CHANGED v2]**

**System font, everywhere.** The shipped prototype applies `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif` globally via a `*` rule with `!important`, so it overrides any per-component font choice. Hebrew renders through SF Hebrew on Apple platforms and the platform default elsewhere.

The earlier Frank Ruhl Libre / Heebo / Suez One stack from v1 was abandoned for consistency, snappier rendering, and a single typographic voice across the app. Display vs. body distinction now comes from **size and weight** alone, not from a separate font family.

**Sizing (mobile portrait base):**
- H1 (verdict text, "End of Voyage" titles): 32–40px, bold (700)
- H2 (screen titles, modal headers): 24–28px, semibold (600)
- Body text: 18–20px, regular (400) — kid readability is non-negotiable
- Button labels: 18–22px, semibold (600)
- Small/secondary text: 14–16px

**Line height:** 1.4–1.5 for body, 1.2 for display. Hebrew benefits from slightly more line-height than equivalent Latin text.

**Letter spacing:** default. No tracking adjustments.

The CSS tokens `--font-display` / `--font-body` / `--font-map` still exist in `theme.css` but are effectively dead — the global override wins. Either remove the tokens in a future cleanup or wire them back in by removing the `*` rule if a custom font direction is revisited.

---

## 4. Layout & Responsive

**Portrait mobile is primary.** Design for ~375–430px width and 700–900px height (iPhone standard, modern Android). The prototype is hosted inside the iOS device frame from the starter component.

**Touch targets** are oversized for kid usability:
- Minimum 64×64px for any interactive element
- The three Drive-screen pirate boxes: each ~150px tall with the avatar/flag/label inside (see §5.4) **[CHANGED v2 — was ~200–250px]**
- Spyglass icon: 56×56px minimum
- End Voyage button: smaller and intentionally less prominent (~120×40px, hold-to-confirm)

**Tablet:** scales up gracefully. No landscape-specific layout for V1.

**RTL (Hebrew) handling:**
- `<html dir="rtl" lang="he">` globally
- All directional UI elements mirror (buttons flow right-to-left, modals slide in from the right, back-arrows point right)
- **One exception:** the ship illustration. Ships sail left-to-right intuitively in any language, so the ship sails left-to-right on the reveal regardless of text direction. Treasure map cardinal directions also follow conventional N/E/S/W.

---

## 5. Screens

### 5.1 Onboarding (first-launch only, three steps)

**Step 1 — Welcome.** Full-screen illustration: a pirate ship docked at a wooden pier at sunrise. Title: **"ברוכים הבאים לים שלכם!"** Single primary button: **"בואו נתחיל!"**

**Step 2 — Name your three pirates.** Parchment background, three vertical stacked cards, one per pirate. Each card: avatar, name input with default placeholder, small flag in the pirate's color, soft drop shadow. Defaults:
- Captain Kid — `קפטן ילד` — role label `הקפטן הקטן`
- Mama Pirate — `אמא־פיראטית` — role label `אמא־פיראטית` **[CHANGED v2 — was "אמא־פיראטה"]**
- Papa Pirate — `אבא־פיראט` — role label `אבא־פיראט`

Buttons: secondary "דלג" (skip) and primary "מפליגים! ⚓".

**Step 3 — Done.** All three pirates on deck looking out to sea, each in their flag color. Title: **"הצוות שלכם מוכן!"** Single button: **"🏴‍☠️ הפלגה חדשה"** **[CHANGED v2 — was "אל הנמל! 🏴‍☠️"; the new label sets up the Home-screen "new voyage" affordance directly from the onboarding finish state]**

### 5.2 Home Screen

The visual home base. Hand-drawn pirate harbor scene fills the screen.

**Background composition:**
- Sky: gradient from `--ocean-foam` (top) to `--treasure-gold` (horizon)
- Sea: layered watercolor in `--ocean-bright` and `--ocean-deep`
- Foreground dock with the family's ship moored at center
- Three small flags on the masts, in the three pirate colors
- 1–2 seagulls drifting (~6s loop), ship gently bobbing (~2.5s sine cycle)

**Buttons (overlaid on bottom third):**
- Primary: **"🏴‍☠️ הפלגה חדשה"** — full-width minus margins, ~64px tall, painted-wooden-plank style in `--wood-light`
- Secondary: **"🗺️ מפת האוצר"** — same style but smaller (~52px), background in `--sand-warm`

**Top corners:**
- ⚙️ brass-compass icon (NOT a generic gear), ~32×32px, top-leading (RTL: top-right) → opens Parent Settings (math gate)
- 🗺️ small map chip, top-left → opens the Treasure Map directly **[CHANGED v2 — added; second entry-point to the map besides the secondary button]**

### 5.3 Pirate Roll Call

Triggered by "הפלגה חדשה". Modal slides up over dimmed home screen.

**Modal:**
- Rounded top corners (~24px), bottom ~70% of screen
- Background: `--surface-modal` with faint nautical rope pattern at the top edge
- Header: **"מי מפליג היום?"**
- Three pirate cards stacked vertically with generous spacing. Each card: avatar (~80×80px), pirate name centered, flag in pirate's color, chunky toggle (~80×40px) labeled **"מפליג!"** when ON / **"נח"** when OFF. Toggling OFF dims the avatar to 50%, adds a small "zZz", lightens the card background.
- Primary button: **"⚓ מפליגים!"**. Disabled when 0 pirates are toggled on, with the message **"אף אחד לא מפליג? בלתי אפשרי!"**

### 5.4 During-Drive Screen — the most-used screen in the app **[CHANGED v2]**

The visual rules unchanged: calm by default, no timers/numbers/progress bars, Spyglass is the only path to current-state info. What changed is the **box geometry, default selection, color logic, and active-state animation.**

**Background:** subtle barely-there ocean wave pattern in `--ocean-foam` over `--sand-cream`, no animation.

**Layout of the three pirate boxes:**
- The three boxes are a vertical flex column, **vertically centered** on the screen between the top Spyglass area and the bottom End-Voyage strip — `justify-content: center`, `align-items: stretch`. **[CHANGED v2]**
- Gap between boxes: **15px**. **[CHANGED v2 — was ~12px]**
- Each box: ~150px tall, full-width minus 16px side margins. **[CHANGED v2]**

**Each box visual:**
- Rounded corners (~22px), padding `12px 18px`
- Background: a wooden plank texture, tinted in the pirate's flag color at low saturation (~15% opacity flag color over `--wood-light`). The kid's box (red flag) lands on the warm `#A87B5A` wood base by default — verified from a cold load. **[CHANGED v2 — fixed bug where a stray inline `backgroundColor: rgb(132,93,152)` was overriding all three boxes with purple on first paint]**
- Avatar (PirateAvatar) on the leading side at 72×72px
- Pirate name in the box, semibold, ~24px
- Small flag (FlagBadge) in the pirate's color in the trailing-top corner
- Default state: flat with subtle inner shadow + 2px wood-deep inner border
- **Active state (whose turn is now):**
  - Strong glow in the pirate's flag color, soft pulsing (`glowPulse` 1.5s ease-in-out infinite)
  - Background brightens to ~45% saturation flag color over wood-light
  - 🎵 icon appears next to the name (`softPulse` 1.4s)
  - Flag waves
  - "מאזין/ה עכשיו" caption (black, 13px, 0.3 letter-spacing)
  - Animated music-bar EQ in the bottom-trailing corner — four 3px black bars with staggered `musicBar` 900ms animation. **[CHANGED v2 — bars were originally tinted in the pirate's flag color; switched to solid black `#1a1a1a` so the EQ stays legible against any flag tint]**
- Pressed state: button compresses inward by ~4px, brief
- Sat-out state: greyed (50% opacity), label "נח היום", untappable, no glow

**Default selection on screen entry:** **none.** `currentIdx` initializes to `-1` so no box is auto-glowing when the Drive screen first appears — the user must tap to select a pirate. Same on every fresh voyage. **[CHANGED v2 — was auto-selecting index 0, which caused the first-load flicker the user reported]**

**Top-leading corner:** 🔭 Spyglass icon, 56×56px, brass with rope-wrap detail. Soft pulsing glow after 5 minutes of drive time. Tappable.

**Bottom-trailing corner:** End-voyage button, ~120×40px, wooden-plank shape, label **"סיום הפלגה"**, requires 1-second hold to activate (plank fills with `--wood-deep` over the hold), then a confirm modal: **"לסיים את ההפלגה?"** — **"כן"** / **"לא"**.

### 5.5 Spyglass Peek (mid-drive check-in)

Triggered by tapping the Spyglass icon. Multi-stage entry animation (~900ms total): brass spyglass extends outward and rotates into screen-center; vignette darkens screen edges into a circular focus area; ship preview slides in.

**The peek view:**
- Ship in side view on `--ocean-bright`
- Three cargo sections clearly visible on the deck, separated by mast posts
- Each section has the pirate's colored flag flying above it
- **Cargo: a single crate type, stacked by count, tinted in each pirate's flag color** — kid's stack is red, mom's teal, dad's purple. The cargo crate visual matches the end-of-drive reveal exactly (same component, same tint logic). **[CHANGED v2 — replaced the previous mix-and-match of barrels/sacks/chests/crates with one stackable crate primitive whose only visual variable is flag-color tint. Easier for a 4.5yo to compare three identical-shape stacks side-by-side, and removes the cognitive load of "is the bigger barrel worth more than the smaller chest?"]**
- Cargo section ↔ flag color is **strictly enforced** — the cargo column for the dad pirate is rendered using the same `pirate.color` value that drives his flag, with no flex/RTL reflow between the cargo overlay and the absolute-positioned masts/flags below. **[CHANGED v2 — fixes a bug where the cargo overlay was a flexbox inside the `dir="rtl"` wrapper, so its three children flowed right-to-left while the absolute-positioned masts kept their LTR coordinates, causing dad's stack to render purple under a red flag]**

**Status banner** at the top, full-width, pennant-flag shape:
- **Fair Winds:** golden background, sun rays behind, **"⛵ רוח גבית, ימאים!"**
- **Coastal:** muted teal, gull silhouette, **"🌊 הספינה קצת נטויה..."**
- **Harbor:** muted brown, anchor icon, **"⚓ אוי, צד אחד כבד מדי!"**

Tap anywhere → spyglass animation reverses (~400ms). Absolutely no numbers visible anywhere on this screen.

### 5.6 End-of-Voyage Reveal

The big moment. Multi-stage cinematic sequence, ~15–18 seconds end-to-end.

**Stage 1 — Transition (0–1.5s).** Iris-out circular wipe, ending on a brief black moment.
**Stage 2 — Title card (1.5–3.5s).** Hand-painted **"סוף ההפלגה!"** bursts in with a painterly splash + brass fanfare.
**Stage 3 — Cargo loading (3.5–9s).** Dockside scene; pirates walk up the gangplank in roll-call order and dump their cargo onto their flagged section of the deck. Stack heights are proportional to listening minutes. Cargo uses the single-crate-type-per-flag-color system from §5.5.
**Stage 4 — Ship in full view (9–11s).** Pull back so all three cargo sections are visible side-by-side. Brief pause for visual comparison.
**Stage 5 — The verdict (11–17s):**
- **Fair Winds.** Sun rises, sails fill, ship sails left-to-right, fog rolls back to reveal a new island. Banner: **"אי חדש התגלה!"** + brass horn.
- **Coastal Sailing.** Ship motors along a coastline; a small find appears in the water. Banner: **"מצאנו משהו על החוף!"** + ukulele strum.
- **Harbor.** Ship stays at the dock; pirates shrug at the lopsided cargo. Banner: **"הספינה קצת נטויה היום, ימאים!"** + soft seagull caw. Friendly, never sad.

**Stage 6 — Save & done (17s+).** **"שמור והתחל"** button → home screen.

### 5.7 Treasure Map (cumulative view)

Large hand-drawn pirate map fills the screen. **Two entry points: the secondary button on Home and the small map chip in the top-left of Home.** **[CHANGED v2 — chip added]**

**Visual:** aged parchment in `--sand-warm` / `--sand-cream`, weathered edges; islands in fog when undiscovered, full hand-drawn detail when discovered; small ship icon for "home harbor"; hand-drawn compass rose; sea creatures peeking from the waves.

**Interaction:**
- Pinch-to-zoom and drag-to-pan
- Tap unlocked island → island detail card (bottom ~60%): hero illustration, island name (kid can rename), discovered-on date, drive stats, close button
- Tap fogged area → caption: **"מה מסתתר שם? הפליגו בהוגנות כדי לגלות!"**

**Side drawer:** **"📜 Voyage stats"** — total islands, coastal finds, total voyages.

**Back button at bottom:** **"חזרה לנמל"**.

### 5.8 Parent Settings

Math-gated (e.g. "מהו 7 + 5?"). Parchment background, list-based.

**Settings list:**
- Edit pirate names (and flag colors — V2 if avatars)
- Balance threshold sliders (Fair Winds 0.5–0.7 default 0.6; Harbor 0.7–0.9 default 0.75) with live preview
- Audio toggle, Map fog toggle
- Drive history, Reset all data (double confirmation), Export data (JSON)

---

## 6. Components

Reusable building blocks. Each has multiple states.

- **PirateButton** — the during-drive box. States: default, active (glowing/pulsing + black music-bar EQ + "מאזין/ה עכשיו"), pressed, sat-out (greyed, "נח היום"). Variants by flag color. **150px tall, 15px gap, vertically centered as a column.** **[CHANGED v2]**
- **FlagBadge** — small flag icon used throughout. Three color variants. `waving` boolean for the active state.
- **WoodPlankButton** — primary button style across screens. Variants: large/medium/small, with/without icon, with/without held-confirmation animation.
- **CargoStack** — vertical stack of identical crates, tinted in a pirate's flag color. Animates additively. Used on Spyglass and reveal. **[CHANGED v2 — formerly a mix of barrel/sack/chest/crate primitives; now a single crate primitive with `tint` prop]**
- **ShipPreview** — ship in side view with three cargo sections. Reusable for Spyglass peek and reveal. The cargo overlay is rendered with the same coordinate system as the masts/flags below it so per-pirate color stays in sync. **[CHANGED v2]**
- **StatusBanner** — pennant-flag style with tier-specific styling.
- **PirateAvatar** — three pre-designed variants (kid, mom, dad). `sleeping` overlay for sat-out.
- **Modal** — bottom-up sheet. Used for roll-call, end-voyage confirm, island detail, math gate.
- **ParchmentCard** — generic content card on parchment with painted edges.
- **OceanBackground** — atmospheric layered ocean. Includes seagull and ship-bobbing animations.
- **TreasureMapView** — zoomable, pannable map with reveal-on-tap behaviour.

---

## 7. Animation Specs

| Animation | Duration | Easing | Purpose |
|---|---|---|---|
| Pirate-button tap | 150ms | ease-out | Tactile feedback |
| Pirate-button glow pulse (`glowPulse`) | 1500ms loop | ease-in-out | "I'm active" |
| Active-state 🎵 (`softPulse`) | 1400ms loop | ease-in-out | Reinforces active |
| Active-state music-bar EQ (`musicBar`) | 900ms loop, 110ms stagger | ease-in-out | Black bars; visible against any flag tint **[CHANGED v2]** |
| Spyglass extend in | 400ms | ease-out | Ritual of peeking |
| Spyglass vignette darken | 400ms | ease-in | Focus attention |
| Ship-preview slide in | 500ms | ease-out | Reveal moment |
| Ship-preview slide out | 400ms | ease-in | Quick dismissal |
| Modal slide-up | 350ms | ease-out | Standard mobile feel |
| Modal slide-down | 250ms | ease-in | Quicker dismissal |
| Iris-out screen wipe | 1500ms | ease-in-out | Reveal transition |
| Title-card splash | 800ms | spring | Theatrical entry |
| Pirate walk-up-gangplank | 1500ms each | ease-in-out | Cargo loading |
| Cargo-stack rise | 800ms | ease-out | Per pirate |
| Sails fill | 1500ms | ease-out | Fair Winds |
| Ship sail across | 3000ms | linear | Fair Winds |
| Fog rolls back (island reveal) | 2000ms | ease-out | New island moment |
| Seagull drift | 6000ms loop | linear | Atmosphere |
| Ship harbor bob | 2500ms loop | ease-in-out sine | Atmosphere |

---

## 8. Asset List (Illustrations)

Unchanged from v1 in spirit. Cargo simplified to a single crate primitive (see §5.5 / §6 / §14) — barrels, sacks, treasure chests and coiled-rope props are no longer authored as separate stack-eligible items, but remain available as decorative dock/scene props.

(Characters, ship, harbor scene, treasure-map base, the 30 islands, the 15 coastal finds, and the icon set are identical to v1.)

---

## 9. Sound List

Unchanged from v1.

---

## 10. Hebrew/RTL Specifics

Hebrew is the kid-facing language. Tone: funny, full-swashbuckling pirate-comedy.

**Sample copy table — only rows that changed in v2:**

| English equivalent | v1 Hebrew | v2 Hebrew |
|---|---|---|
| Mom pirate role label | אמא־פיראטה | **אמא־פיראטית** |
| "Done" finish-onboarding button | אל הנמל! 🏴‍☠️ | **🏴‍☠️ הפלגה חדשה** |

All other strings are unchanged from §10 of v1.

---

## 11. Accessibility for a 4.5-year-old

Unchanged from v1. Re-confirmed for v2:
- Touch targets ≥ 64×64px (the 150px Drive boxes comfortably exceed this)
- High color contrast on every interactive element
- Black music-bar EQ specifically chosen so the active state is legible across all three flag tints
- No auto-selected pirate on Drive-screen entry, so the kid is never shown a glowing state he didn't trigger

---

## 12. Build priority for any future re-build

Same v1 ordering: Drive → Reveal → Home → Spyglass → Map → Onboarding → Settings.

---

## 13. What's NOT in scope for V1 / V2

Unchanged from v1: avatar customization, captain rotation badge, today's-voyage postcard, tablet landscape, dark mode, user-added islands, multi-family / cloud sync, deep onboarding tutorials.

---

## 14. Change log — v1 → v2

Tracked here so a future designer can read the original v1 spec alongside this and reconcile diffs in one place.

**Typography**
- Switched the entire app from Frank Ruhl Libre / Heebo / Suez One to a global `-apple-system` stack via `* { font-family: ... !important }`. The `--font-display` / `--font-body` / `--font-map` CSS tokens still exist but are now dead. Display-vs-body distinction is by size and weight only.

**Drive screen — geometry**
- Box height reduced from ~200–250px to **~150px**.
- Three boxes are now **vertically centered** as a flex column (`justify-content: center`, `align-items: stretch`), with a **15px gap** between them. (Iterated through 22 → 10 → 5 → 8 → 15px during review.)

**Drive screen — selection & color**
- `currentIdx` defaults to **-1** (no auto-selection on initial Drive-screen entry; same when starting a fresh voyage and when applying roll-call). The previous behaviour auto-selected index 0 and caused the first-paint flicker reported as "the kid box color is different on first land".
- Removed a stray inline `backgroundColor: rgb(132, 93, 152)` on the pirate boxes that was overriding all three of them with purple before the active-state CSS kicked in. The default tint logic — wood-light + 15% flag-color — now reaches the screen unobstructed, so the kid box correctly lands on `#A87B5A` wood with a faint red wash.

**Drive screen — active state**
- Music-bar EQ recoloured from `pirate.color` to **solid black `#1a1a1a`** so the four bars stay visible regardless of which pirate is active.
- "מאזין/ה עכשיו" caption is rendered in black (was `pirate.color`) for the same legibility reason.

**Cargo system**
- Cargo simplified from a mix of barrel / sack / treasure-chest / coiled-rope / painted-crate primitives to a **single crate primitive**, stacked by count, **tinted per pirate flag color**. Used in both the Spyglass peek and the end-of-voyage reveal.
- Fixed a bug where the cargo overlay (a flexbox inside the global `dir="rtl"` wrapper) was rendering its three columns right-to-left while the absolute-positioned masts/flags below it kept LTR coordinates — so dad's stack was painted under the kid's flag (purple cargo under a red flag). Cargo and masts now share the same coordinate system, so each cargo column always sits beneath its own pirate's flag.

**Hebrew copy**
- `אמא־פיראטה` → `אמא־פיראטית` (correct grammatical gender for "female pirate"). Updated in `DEFAULT_PIRATES` (`app.jsx`) and on the onboarding finish screen (`screens-a.jsx`).
- Onboarding-finish primary button: `אל הנמל! 🏴‍☠️` → `🏴‍☠️ הפלגה חדשה`. Aligns the onboarding handoff with the Home-screen primary action.

**Home screen**
- Added a small **🗺️ map chip in the top-left corner** as a second entry-point to the Treasure Map (in addition to the existing secondary button). Verified to navigate cleanly to screen `09 Treasure Map`.
