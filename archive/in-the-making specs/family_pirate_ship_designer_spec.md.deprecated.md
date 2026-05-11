# Family Pirate Ship — Designer Spec v1

A detailed visual and interaction spec, written to be fed into a design tool (Claude design / Imagine / similar) to produce a high-fidelity v1 prototype. Self-contained: you don't need the product spec to use this, but the product spec is the source of truth for behavior.

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

**Reference imagery for mood:**
- *We're Going on a Bear Hunt* (Helen Oxenbury) — landscapes, soft watercolor
- *Where the Wild Things Are* (Maurice Sendak) — character expressiveness
- *Song of the Sea* (Cartoon Saloon) — folk-tale ocean palette
- Beatrix Potter — animal brushwork
- *Moana* opening dawn scene — warmth, hope

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
- `--wood-light` `#A87B5A` — planks, secondary surfaces

**Treasure accents:**
- `--treasure-gold` `#E5B23A` — coins, highlights, sun
- `--treasure-red` `#C84B3B` — accents, treasure, important emphasis

**Pirate flag colors** (each must be unmistakable at a glance — these are how the kid identifies whose section is whose):
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

## 3. Typography

**Hebrew first.** Fonts must render Hebrew beautifully — not Latin-with-Hebrew-fallback.

**Recommended stack:**
- **Display** (titles, verdicts, big moments): Frank Ruhl Libre, Bold weight. A soft Hebrew serif with character. Free on Google Fonts.
- **Body** (everywhere else): Heebo or Assistant, Regular and Medium weights. Both are excellent free Hebrew sans-serifs. Pick one and stick with it.
- **Treasure-map labels** (the hand-lettered island names on the map): Suez One or a similar display font for variety. Optional flair.

**Sizing (mobile portrait base):**
- H1 (verdict text, "End of Voyage" titles): 32–40px, bold
- H2 (screen titles, modal headers): 24–28px, semibold
- Body text: 18–20px, regular (LARGE — kid readability is non-negotiable)
- Button labels: 18–22px, semibold
- Small/secondary text: 14–16px

**Line height:** 1.4–1.5 for body, 1.2 for display. Hebrew benefits from slightly more line-height than equivalent Latin text.

**Letter spacing:** default. No tracking adjustments.

---

## 4. Layout & Responsive

**Portrait mobile is primary.** Design for ~375–430px width and 700–900px height (iPhone standard, modern Android).

**Touch targets** are oversized for kid usability:
- Minimum 64×64px for any interactive element
- The three pirate buttons during a drive: each ~200–250px tall (~1/3 of vertical screen)
- Spyglass icon: 56×56px minimum
- End Voyage button: smaller and intentionally less prominent (~120×40px)

**Tablet:** scales up gracefully. Same layout, just larger. No landscape-specific layout for V1.

**RTL (Hebrew) handling:**
- `<html dir="rtl" lang="he">` globally
- All directional UI elements mirror (buttons flow right-to-left, modals slide in from the right, back-arrows point right)
- **One exception:** the ship illustration. Ships are read left-to-right intuitively in any language, so the ship sails left-to-right on the reveal regardless of text direction. Treasure map cardinal directions also follow conventional N/E/S/W.

---

## 5. Screens

Every screen below is a complete visual spec. Combine with section 6 (Components) and section 8 (Asset list) for full implementation.

### 5.1 Onboarding (first-launch only, three steps)

**Step 1 — Welcome.**
Full-screen illustration: a pirate ship docked at a wooden pier at sunrise. Sky in `--ocean-foam` to `--treasure-gold` gradient, sun just over the horizon. Warm, hopeful mood. A small seagull perched on the mast. Below the illustration, a single Hebrew greeting in display font (~36px): "ברוכים הבאים לים שלכם!" (Welcome to your seas!). Single primary button at bottom: "בואו נתחיל!" (Let's start!).

**Step 2 — Name your three pirates.**
Background: light parchment texture in `--sand-cream`. Three vertical stacked cards, one per pirate. Each card contains:
- Pre-designed avatar illustration on the left (kid pirate / mom pirate / dad pirate — see asset list)
- Text input on the right with the default name as placeholder ("Captain Kid", "Mama Pirate", "Papa Pirate")
- A small flag in the pirate's flag color flying in the top-right corner of the card
- Card background: `--surface-card` with subtle shadow

Two buttons at bottom: secondary "Skip" (use defaults) and primary "Set sail! ⚓"

**Step 3 — Done.**
Full-screen illustration: all three pirates standing on the deck of the ship, looking out to sea, each with their flag color visible (a hat band, a sash, a parrot). Pirates have slightly exaggerated dramatic poses — funny, not solemn. Title at the top: "הצוות שלכם מוכן!" (Your crew is ready!). Single button: "אל הנמל!" (To the harbor!).

### 5.2 Home Screen

The visual home base. The hand-drawn pirate harbor scene fills the entire screen:

**Background composition:**
- Sky: gradient from `--ocean-foam` (top) to `--treasure-gold` (horizon)
- Sea: layered watercolor in `--ocean-bright` and `--ocean-deep`
- Foreground dock with the family's ship moored at center
- Three small flags on the masts, in the three pirate colors
- 1–2 seagulls drifting in the sky (subtle micro-animation, ~6s loop)
- Ship gently bobbing in the harbor (~2.5s sine cycle, very subtle)

**Buttons (overlaid on bottom third):**
- Primary: "🏴‍☠️ הפלגה חדשה" (New voyage) — full-width minus generous margins, ~64px tall, painted-wooden-plank style background in `--wood-light`, label in `--text-primary`, slight texture/grain
- Secondary: "🗺️ מפת האוצר" (Treasure map) — same style but smaller (~52px), background in `--sand-warm`

**Top corner:**
- ⚙️ icon that looks like a brass compass (NOT a generic gear). Small (~32×32px), positioned in the top-corner consistent with RTL.

### 5.3 Pirate Roll Call

Triggered by "New voyage." Modal that slides up from the bottom over the dimmed home screen.

**Modal:**
- Rounded top corners (~24px), occupies bottom ~70% of screen
- Background: `--surface-modal` with a faint nautical rope pattern at the top edge
- Header (centered): "מי מפליג היום?" (Who's sailing today?), in display font
- Three pirate cards stacked vertically, generous spacing
- Each card:
  - Avatar on the leading side (~80×80px)
  - Pirate name centered, large
  - A small flag flying in the pirate's color
  - Toggle on the trailing side: large chunky toggle, ~80×40px, default ON, labeled "מפליג!" (Sailing!) when ON or "נח" (Resting) when OFF
  - When toggled OFF: avatar dims to 50% opacity, a small "zZz" appears, card background lightens
- Primary button at bottom: "⚓ מפליגים!" (Set sail!). If 0 pirates are toggled on, the button is disabled and a humorous Hebrew message appears: "אף אחד לא מפליג? בלתי אפשרי!" (Nobody sailing? Impossible!)

### 5.4 During-Drive Screen — the most-used screen in the app

**THIS is where calm-by-default matters most.** The visual must reward staring at it without offering any new information unless asked.

**Background:** subtle. A barely-there ocean wave pattern in `--ocean-foam` over `--sand-cream`, very low contrast. No animation.

**Three pirate buttons** stacked vertically, each ~200px tall, full-width minus 16px side margins, ~12px gap between them:

Each button visual:
- Rounded corners (~24px radius)
- Background: a wooden plank texture, tinted in the pirate's flag color at low saturation (~15% opacity flag color over wood-light)
- Avatar on the leading side (80×80px)
- Pirate name centered, in display font, ~24px
- A small fabric flag in the pirate's flag color flying on the trailing side
- Default state: flat, slight inner shadow (looks "resting")
- **Active state (whose turn is now):**
  - Strong glow in the pirate's flag color, soft pulsing animation (1.5s cycle, easing in/out)
  - Background brightens: ~40% saturation flag color over wood-light
  - Small 🎵 icon appears next to the name
  - A subtle warm rim-light around the entire button
- Pressed state: button compresses inward by ~4px, brief
- Sat-out state: greyed (50% opacity), label changes to "נח היום" (Resting today), untappable, no glow

**Top corner (RTL: top-leading):**
- 🔭 **Spyglass icon**, 56×56px, illustrated as a brass spyglass slightly tilted, with rope-wrap detail
- After 5 minutes of drive time, gains a soft pulsing glow (~3s cycle) as a hint to peek
- Tappable

**Bottom corner (RTL: bottom-trailing):**
- **End voyage button**, ~120×40px
- Shaped like a small wooden plank with rope ties
- Label: "סיום הפלגה" (End voyage), in body font
- Requires 1-second hold to activate (visual: the plank slowly fills with `--wood-deep` color over the hold), then a confirmation modal appears: "לסיים את ההפלגה?" (End the voyage?) with "כן" (Yes) and "לא" (No) buttons

**Critical: no timers, no minutes, no progress bars on this screen.** The Spyglass is the only path to current-state info.

### 5.5 Spyglass Peek (mid-drive check-in)

Triggered by tapping the Spyglass icon. Multi-stage entry animation:

**Animation in (~900ms total):**
1. (0–400ms) Brass spyglass illustration extends outward from the corner, rotating into screen-center, with a subtle sliding-brass-rings sound
2. (200–600ms) Vignette darkens screen edges into a circular focus area (~60% screen width)
3. (500–900ms) Ship preview slides in from the side, settling into the center of the vignette

**The peek view:**
- Ship in side view, on a soft `--ocean-bright` background
- Three cargo sections clearly visible on the deck, separated by mast posts
- Each section has the pirate's colored flag flying above it
- Cargo stacks (barrels, sacks, treasure) of varying heights — heights based on current minutes
- The cargo *style* matches the end-of-drive reveal exactly (same assets — see asset list)

**At the top, a status banner** (full-width across the peek view):
- Banner shape: pennant-flag style with painted edges
- Banner color and content depends on current tier:
  - **Fair Winds:** golden background (`--treasure-gold`), rays of sun behind, text: "⛵ רוח גבית, ימאים!" (Tailwind, sailors!)
  - **Coastal:** muted teal (`--coastal-teal`), small gull silhouette, text: "🌊 הספינה קצת נטויה..." (The ship's leaning a bit...)
  - **Harbor:** muted brown (`--harbor-brown`), anchor icon, text: "⚓ אוי, צד אחד כבד מדי!" (Whoa, one side's too heavy!)

Tap anywhere → spyglass animation reverses, vignette clears, back to during-drive screen (~400ms dismissal).

**Absolutely no numbers visible** anywhere on this screen. The visual cargo comparison and the banner tier are the entire story.

### 5.6 End-of-Voyage Reveal

The big moment. Multi-stage cinematic sequence, ~15–18 seconds end-to-end. Should feel theatrical.

**Stage 1 — Transition (0–1.5s).** Iris-out: a circular wipe closes the during-drive screen from the corners inward, ending on a brief black moment.

**Stage 2 — Title card (1.5–3.5s).** Hand-painted "סוף ההפלגה!" (End of voyage!) text bursts onto screen with a small painterly splash effect, accompanied by a brass fanfare.

**Stage 3 — Cargo loading (3.5–9s).** The dockside scene appears: ship at the dock, gangplank down, three pirates each with a small wheelbarrow of cargo. One at a time, each pirate walks up the gangplank with a slight cartoony bob, dumps their cargo onto their flagged section of the deck. Cargo stacks rise visibly. Pirates load in order: Captain Kid first, then Mama, then Papa (or whatever order matches roll-call). Stack heights are proportional to listening minutes.

**Stage 4 — The ship in full view (9–11s).** Ship pulls back slightly so all three cargo sections are visible side-by-side on the deck. Brief pause for visual comparison. This is the "evidence" frame — the kid sees the heights and reads the balance.

**Stage 5 — The verdict (11–17s).** Different animation per tier:

- **Fair Winds.** Sun rises bright over the horizon. All three sails fill with wind in unison. Ship begins sailing left-to-right across the screen. Cuts to a new island appearing — fog rolls back to reveal the unique illustration (one of ~30 pre-bundled islands), with its native creature/treasure visible. Banner: "אי חדש התגלה!" (A new island has been discovered!) Triumphant brass horn fanfare.
- **Coastal Sailing.** Ship motors slowly along a coastline. A small find appears in the water beside the ship — bottle, fish, hat, gull. Banner: "מצאנו משהו על החוף!" (We found something on the coast!) Gentle ukulele strum.
- **Harbor.** Ship stays at the dock. The three pirates stand on deck looking at the lopsided cargo stacks, one shrugs comically. Banner: "הספינה קצת נטויה היום, ימאים!" (The ship's a bit lopsided today, sailors!) Soft single seagull caw. Friendly, never sad.

**Stage 6 — Save & done (17s+).** A "Save & done" button appears at the bottom: "שמור והתחל" (Save & continue). Tap returns to home screen.

### 5.7 Treasure Map (cumulative view)

A large hand-drawn pirate map fills the screen.

**Visual:**
- Background: aged parchment in `--sand-warm` with `--sand-cream` highlights, weathered edges
- The map shows an ocean dotted with islands of varying sizes
- Islands not yet discovered are covered in soft watercolor fog (`--ocean-foam` semi-transparent)
- Discovered islands are revealed in full hand-drawn detail, each unique
- A small ship icon in one corner indicates the family's "home harbor"
- Compass rose in another corner, hand-drawn
- A few sea creatures peeking from the waves between islands (small flourishes)

**Interaction:**
- Pinch-to-zoom and drag-to-pan
- Tap on an unlocked island → island detail card slides up from the bottom (modal)
- Tap on fogged area → small caption appears: "מה מסתתר שם? הפליגו בהוגנות כדי לגלות!" (What's hiding there? Sail fairly to find out!)

**Island detail card:**
- Slides up over the map, occupies bottom ~60%
- Hero illustration of the island's creature/treasure (full-color, detailed)
- Island name (auto-named, kid can rename via tap)
- "Discovered on [date]"
- Drive stats compactly listed: total time, each pirate's time, biggest share
- Close button

**Side drawer (collapsible, leading edge):**
- "📜 Voyage stats"
- Total islands: N
- Coastal finds: N
- Total voyages logged: N
- Tap to expand/collapse

**Back button at bottom:** "חזרה לנמל" (Back to harbor).

### 5.8 Parent Settings

Less playful, more utilitarian — but still in the visual world. Background: `--sand-cream` parchment, simple list-based layout.

**Gating:** A simple math problem appears first ("מהו 7 + 5?" / "What is 7 + 5?") to keep kid out. Wrong answer or back button returns to home.

**Settings list:**
- Edit pirate names (and flag colors — V2 if avatars)
- Balance threshold sliders:
  - "Fair Winds threshold" (0.5–0.7 range, default 0.6)
  - "Harbor threshold" (0.7–0.9 range, default 0.75)
  - Live preview: "Your last drive would have been: [Tier]"
- Audio toggle
- Map fog toggle
- "Drive history" link → scrollable list of every drive: date, total time, each pirate's time, biggest share %, tier achieved
- "Reset all data" button (with double confirmation)
- "Export data" button (downloads JSON)

---

## 6. Components

Reusable building blocks. Each has multiple states.

**PirateButton** — the during-drive button. States: default, active (glowing/pulsing), pressed, sat-out (greyed). Variants by flag color.

**FlagBadge** — small flag icon used throughout (corners of cards, on avatars). Three color variants.

**WoodPlankButton** — the primary button style across all screens. Variants: large/medium/small, with/without icon, with/without held-confirmation animation.

**CargoStack** — a vertical stack of cargo items (barrels, sacks, treasures). Animates additively (item-by-item) or set-and-display. Used on Spyglass and reveal.

**ShipPreview** — the ship in side view with three cargo sections. Reusable for both the Spyglass peek and the reveal.

**StatusBanner** — pennant-flag style banner with tier-specific styling (gold/teal/brown).

**Avatar** — pirate avatar illustration. Three pre-designed variants (kid, mom, dad). Optional sat-out overlay.

**Modal** — bottom-up sheet modal. Used for roll-call, end-voyage confirm, island detail, math gate.

**ParchmentCard** — generic content card on a parchment background with painted edges. Used in onboarding, settings, history.

**OceanBackground** — atmospheric layered ocean background. Used on home, reveal. Includes seagulls and ship-bobbing animations.

**TreasureMapView** — the zoomable, panable map with reveal-on-tap behavior.

---

## 7. Animation Specs

Every animation has a purpose. Don't add animation that doesn't serve a feeling.

| Animation | Duration | Easing | Purpose |
|---|---|---|---|
| Pirate-button tap | 150ms | ease-out | Tactile feedback |
| Pirate-button glow pulse | 1500ms loop | ease-in-out | "I'm active" |
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

Every illustration described enough that it can be generated or commissioned consistently. All in the same hand-drawn watercolor style.

**Characters:**
- Captain Kid — small pirate child, red bandana, mischievous grin, slight gap-tooth, holding a wooden cutlass
- Mama Pirate — adult woman pirate, teal-green coat, hair tied back with a green scarf, parrot on shoulder, confident pose
- Papa Pirate — adult man pirate, deep purple coat, beard, captain's hat, monocle (funny touch)
- All three drawn in matching style, slight cartoon proportions, expressive faces

**Pirate ship:**
- Three-masted wooden sailing ship, classic pirate design
- Three cargo sections clearly visible on the deck, divided by mast posts
- Three flag positions, one per pirate, on the three masts
- Hull weathered, sails cream-colored
- Multiple states: docked (calm), sailing (sails full), full side view, partial 3/4 view from dock

**Cargo items** (mix-and-match per stack):
- Wooden barrels (most common)
- Burlap sacks
- Small treasure chests
- Coiled ropes
- Crates with painted symbols
- Should look weighty and stackable

**Harbor scene:**
- Wooden dock, slight perspective
- Lighthouse in distance (decorative)
- Anchor, coiled rope, lobster pots scattered
- Sky gradient sunrise mood

**Treasure map base:**
- Aged parchment with weathered edges
- Stylized ocean with watercolor swirls
- ~30 island positions sketched in fog (placeholders)
- Compass rose (top corner)
- Whale, kraken, mermaid silhouettes peeking from waves
- Small "X marks the spot" decorations

**~30 Islands to design** (each unique, illustrated when revealed):
1. Coral Cove (singing turtle)
2. Frostbeard Isle (ice penguins)
3. Banana Bay (monkey kingdom)
4. Glow Lagoon (luminescent fish)
5. Volcano Peak (fire dragon)
6. Cloud Atoll (floating sheep)
7. Mirror Island (twin pirates appear)
8. Music Reef (singing crabs)
9. Candy Cay (lollipop palm trees)
10. Sleepy Shore (snoozing sloths)
11. Diamond Dunes (gem-eyed lizards)
12. Honeycomb Atoll (giant friendly bees)
13. Whisper Wood (talking trees)
14. Rainbow Reef (colorful fish school)
15. Stormy Spit (a small umbrella crab)
16. Cocoa Coast (chocolate-furred bears)
17. Origami Isle (paper birds)
18. Carnival Cove (a circus seal)
19. Library Atoll (an owl who reads)
20. Mosaic Bay (tile-pattern octopus)
21. Spaghetti Strait (noodle-tentacled jellyfish)
22. Cactus Key (a desert pirate parrot)
23. Bubble Bay (giant soap bubbles + floating frogs)
24. Lighthouse Lonely (a lonely seagull keeper)
25. Velvet Volcano (purple lava and giant snails)
26. Pancake Point (stacked-rock formation, sleeping bear)
27. Echo Cliff (a yodeling goat)
28. Pearl Pond (oysters with personality)
29. Flag Forest (trees that grow flags)
30. The Last Lagoon (a friendly sea dragon)

Each island gets one illustration: the creature/character + a hint of the landscape. Used on reveal screen and treasure map detail card.

**~15 Coastal finds** (smaller illustrations, for tier-2 drives):
- Message in a bottle, friendly seagull, drifting hat, mysterious crate, leaping fish, brass key, rubber duck (anachronistic, funny), tangle of seaweed with a friendly snail, single sock (?? — funny), rolled-up scroll, coin purse, music box, a single boot, telescope, paper boat with tiny pirate

**Icon set** (custom, pirate-themed):
- 🔭 Spyglass (brass, slightly tilted)
- ⚙️ Compass (replaces generic gear)
- 🗺️ Treasure map (folded parchment)
- 🏴‍☠️ Pirate flag
- ⚓ Anchor
- 🏴 Three flag color variants

---

## 9. Sound List

Each sound described. All sounds short, warm, never harsh. Files should be small (.mp3 or .ogg, ~10-30KB each).

| Sound | Trigger | Length | Description |
|---|---|---|---|
| Tap-switch chime | Pirate button tap | ~250ms | Soft single bell, warm |
| Spyglass extend | Spyglass open | ~400ms | Brass rings sliding |
| Spyglass close | Spyglass dismiss | ~250ms | Reverse brass slide |
| Cargo clunk | Cargo loading | ~150ms | Wooden barrel thud |
| Pirate fanfare | Title card | ~1500ms | Brass horn flourish |
| Sails fill (whoosh) | Fair Winds reveal | ~1500ms | Wind into cloth |
| Ship sail-away | Ship leaves harbor | ~2000ms | Wood creaks + waves |
| Ukulele strum | Coastal reveal | ~1000ms | Single warm strum |
| Seagull caw | Harbor reveal | ~600ms | Single soft gull |
| Treasure shimmer | Island reveal | ~800ms | Magical chime |
| Ambient harbor | Home screen background | Loop, low volume | Gentle waves + distant gulls |
| Gentle waves | During-drive ambient | Loop, very low | Almost subliminal |

---

## 10. Hebrew/RTL Specifics

**Hebrew is the kid-facing language.** Tone: funny, full-swashbuckling pirate-comedy. Dramatic, slightly silly, never sweet-and-soft.

**RTL implementation:**
- All UI elements mirror by default
- Modals slide from the right when "from leading edge"
- Back arrows point right (←)
- The ship illustration on reveal sails left-to-right regardless (universal sailing convention)
- Compass on treasure map shows N at top, conventional cardinal directions

**Sample Hebrew copy** for the most-repeated strings (these need a native pass before final lock-in — confirm tone with a Hebrew-speaking adult):

| English equivalent | Hebrew (draft) |
|---|---|
| Welcome to your seas! | ברוכים הבאים לים שלכם! |
| Let's start! | בואו נתחיל! |
| Set sail! | מפליגים! |
| Who's sailing today? | מי מפליג היום? |
| Resting today | נח היום |
| End voyage | סיום הפלגה |
| End the voyage? | לסיים את ההפלגה? |
| Tailwind, sailors! (Fair Winds banner) | רוח גבית, ימאים! |
| The ship's leaning a bit... (Coastal banner) | הספינה קצת נטויה... |
| Whoa, one side's too heavy! (Harbor banner) | אוי, צד אחד כבד מדי! |
| End of voyage! | סוף ההפלגה! |
| A new island has been discovered! | אי חדש התגלה! |
| We found something on the coast! | מצאנו משהו על החוף! |
| The ship's a bit lopsided today, sailors! | הספינה קצת נטויה היום, ימאים! |
| Save & continue | שמור והתחל |
| Treasure map | מפת האוצר |
| Back to harbor | חזרה לנמל |
| What's hiding there? Sail fairly to find out! | מה מסתתר שם? הפליגו בהוגנות כדי לגלות! |
| Your crew is ready! | הצוות שלכם מוכן! |

Native Hebrew review: aim for funny, dramatic, kid-readable. Pirate-comedy phrases like "ארר!" and "אהוי!" should sprinkle in.

---

## 11. Accessibility for a 4.5-year-old

The user is the design constraint. He cannot read fluently. He has small motor control. He gets frustrated quickly.

**Rules:**
- Touch targets ≥ 64×64px
- High color contrast on every interactive element (4.5:1 minimum, prefer 7:1)
- Never rely on text alone — every label has a visual icon
- Error/empty states are playful, never harsh ("Nobody sailing? Impossible!")
- One modal at a time. Never stack popups.
- Avoid blinking, fast strobing, or anything seizure-adjacent
- Sounds always optional (parent can mute)
- No timed dismissals — the child controls the pace
- No tutorials. No tooltips. No "did you mean…?" prompts. The visual must explain itself.

---

## 12. What I'd hand to the design tool first

If you're feeding this into Claude design / Imagine to produce a v1 prototype, prioritize in this order:

1. **The during-drive screen** — most-used, most important to get right. Three pirate buttons with active glow.
2. **The end-of-voyage reveal** — the moment of truth, where the visual energy lives.
3. **The home screen** — establishes the world.
4. **The Spyglass peek** — proves the system works mid-drive.
5. **The treasure map** — the long-term hook.

Onboarding and settings can come later — they're functional but not where the visual identity is established.

---

## 13. What's NOT in scope for V1

Spelling these out so they don't accidentally creep into the prototype:
- Avatar customization (using pre-designed avatars)
- Captain rotation badge
- A "today's voyage" postcard
- Tablet-specific landscape layouts
- Dark mode
- User-added islands
- Multi-family / cloud sync
- Deep onboarding tutorials
