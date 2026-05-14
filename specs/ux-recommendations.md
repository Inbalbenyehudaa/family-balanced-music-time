# UX Recommendations — Kid Usability Pass
**Status:** Draft for product review  
**Date:** 2026-05-13  
**Reviewer role:** Senior UX Designer  
**Target user:** 4.5-year-old who recognizes letters but cannot read complete words

---

## How to read this doc

Each recommendation includes:
- **Screen + element** — with `file:line` citation
- **Problem** — what fails for a non-reader
- **Recommendation** — what to change
- **Rationale** — why this helps a 4.5-year-old specifically
- **Priority** — P0 (blocker), P1 (top-tier polish), P2 (nice-to-have)

**Priority definition:**
- **P0** — kid-usability blocker: the 4.5-year-old cannot confidently complete the core loop without it. Ship this cycle.
- **P1** — closes the gap from "functional" to "top children's educational app" standard (Khan Academy Kids, Toca Boca). Schedule soon.
- **P2** — ambient delight and polish. Revisit after P0/P1.

**Out of scope for this pass:** No changes to app flow, functionality, or logic. Parent-only screens (Settings, FamilyNaming, SignIn, InviteAccept, AuthCallback) receive lightweight notes only. Audio recommendations are flagged as future work, not designed here.

---

## Part A — Design-System Gaps (Cross-Cutting)

These issues affect every screen. Fix them before addressing per-screen items — otherwise per-screen fixes will be inconsistent.

---

### A1 · Web fonts are loaded but never render
**Priority: P1 — DEFERRED (2026-05-13)**

**Status.** Attempted in session p1-ux-pass on 2026-05-13. The token swap and `!important` removal worked at the body level (Heebo rendered on most surfaces), but `PlankButton` children and the inline-styled tier banner did not pick up `var(--font-display)` cleanly, and the system font remained on the two highest-stakes labels (Drive end-voyage button, Reveal save button). Inbal chose to revert and stay on SF Pro rather than ship a half-rendered typography pass. Not retrying without a designer pass on the full type system.

**Problem.** `index.html` loads Frank Ruhl Libre (serif, Hebrew-native), Heebo (rounded sans, Hebrew-native), and Suez One (decorative display). These are the right typefaces for a children's storybook register. But `theme.css:37–45` overrides all of them:
```css
* {
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif !important;
}
```
The `!important` flag kills every custom font. The three tokens `--font-display`, `--font-body`, `--font-map` all resolve to SF Pro. On Android the fallback is Roboto. The illustrated, handcrafted book aesthetic described in the designer spec never renders on screen — you get a UI-kit app, not a storybook.

**Recommendation.**
1. Remove the `!important` from the `*` reset (theme.css:44). Keep the fallback stack, just drop the forced override.
2. Set `--font-display: 'Suez One', 'Frank Ruhl Libre', system-ui` — for headings, button labels, and the ship's name-display contexts.
3. Set `--font-body: 'Heebo', system-ui` — for body copy and UI labels.
4. Keep `--font-map: 'Suez One', system-ui` — for island names on the map.

**Why this helps a 4.5-year-old.** A child who can't read still feels tone. Rounded, slightly playful Hebrew letterforms (Heebo) feel warm and safe. Suez One has the weight of a picture-book title. SF Pro feels like a settings menu. The font choice tells the kid "this is a game," not "this is a form."

---

### A2 · No semantic action tokens — destructive and safe actions look identical
**Priority: P0**

**Problem.** The token set covers materials (`--wood-light`, `--sand-cream`) and identity (`--flag-kid`, `--flag-mom`, `--flag-dad`) but has no intent tokens: nothing named "danger," "success," "primary," "action." This means every `PlankButton` renders the same wood-brown regardless of whether it starts something, ends something, cancels something, or confirms something. The ConfirmEnd modal's "Yes / End voyage" and "No / Cancel" buttons are visually equal weight (ConfirmEnd.tsx:19–24). The only distinction is `variant="cream"` on the "No" button — a subtle material change invisible to a non-reader.

**Recommendation.**
Add two semantic aliases in `theme.css` — no new hex values needed, just aliases to existing tokens:
```css
--action-danger:   var(--treasure-red);   /* #c84b3b — already exists */
--action-safe:     var(--flag-mom);       /* #2a9d8f teal — already exists */
```
Then apply them to the ConfirmEnd buttons (detailed in B3 below) and document the rule in the designer spec: *destructive actions use `--action-danger`, safe/continue actions use `--action-safe`.*

**Why this helps a 4.5-year-old.** Red = stop is one of the earliest visual conventions children learn (traffic lights, stop signs). A red button before "yes, end the voyage" does not need a Hebrew word — the color communicates finality. Teal/green on "no, keep going" signals safety. This is the most primal affordance layer available.

---

### A3 · Tap-target floor too low for a 4.5-year-old's finger
**Priority: P0**

**Problem.** According to Apple's HIG and Google's Material Design, minimum tap target for a child's finger is 56px × 56px. Currently:
- `PlankButton size="sm"`: 40px tall (`PlankButton.tsx:9`)
- Drive end-voyage hold button: 44px tall, 130px wide (`Drive.tsx:172`)
- Spyglass close "✕" button: 44px (`Spyglass.tsx:94`)
- Map stats chip: ~36px tall (`Map.tsx:73`)
- Map back button: uses `PlankButton variant="sand"` default (lg=64px — fine)
- Home settings compass: 44px (`Home.tsx:30`)

The pirate selector buttons on Drive (120–170px, Drive.tsx:85) are excellent. The issue is secondary and utility controls.

**Recommendation.**
- Set a rule: *no tappable surface below 56px in any dimension for the child user path.*
- `PlankButton size="sm"` → bump to `h-14` (56px). Audit which screens use sm-size buttons on kid-facing paths and upgrade to `md`.
- Drive end-voyage: raise from 44px to 56px min-height (detail in B2).
- Spyglass close: raise from 44px to 56px (detail in B4).
- Home settings compass: raise from 44px to 56px (detail in B1).
- Map stats chip: raise to 44px minimum (it's parent-facing, so 44px is acceptable here).

**Why this helps a 4.5-year-old.** A young child's pointing accuracy is significantly lower than an adult's. A 40px button that requires precision lands near the edge of a 4-year-old's comfortable tap zone. Frustration leads to abandonment, not retry. Generous targets also signal "this is for me to tap" — small elements read as decoration, not affordance.

---

### A4 · Icon-first rule not enforced on kid-facing CTAs
**Priority: P0**

**Problem.** The SVG library in `Art.tsx` is rich: `AnchorIcon`, `CompassIcon`, `MapIcon`, `SpyglassIcon`, `PirateFlagIcon`. These are already imported in various screens. But the primary kid-facing CTAs rely on text alone:
- `Home.tsx:75` — "🏴‍☠️ הפלגה חדשה" (pirate flag emoji + Hebrew text; no SVG icon conveying "start/go")
- `Drive.tsx:197` — "סיימו הפלגה" (text only)
- `ConfirmEnd.tsx:20,23` — "כן" / "לא" (single-word Hebrew, no icons)
- `Reveal.tsx:222` — "שמור והתחל ⚓" (anchor emoji trailing; anchor is the right symbol, wrong position)

An emoji is better than nothing, but emojis are platform-rendered, vary by OS, and lack the hand-drawn storybook quality of the SVG library. They also trail the text — a child reads images before text, so the icon should lead.

**Recommendation.** Establish a compositing pattern for every kid-facing button:
```
[SVG icon — left edge] [Hebrew label — right of icon]
```
Specific per-screen applications detailed in Part B. The Hebrew word becomes a secondary signal — still present for parent confidence, but the child navigates by icon + color.

**Why this helps a 4.5-year-old.** A child who can't read words recognizes shapes and symbols. A downward anchor before "End voyage" communicates "lower the anchor, we're stopping." A compass-and-arrow before "New voyage" communicates "navigate forward." The association between icon shape and action outcome builds a mental model that persists across sessions, making the app learnable without an adult guide.

---

### A5 · `PlankButton` has no hover state; hold-button has no affordance hint
**Priority: P2**

**Problem.** `.btn-plank:active` provides a 3px press drop (theme.css:181–188), which is correct. But there is no `:hover` state. On desktop (parents previewing, large screens), buttons are completely static until the instant of press. The Drive end-voyage hold button has no animation indicating "keep pressing" — the fill just widens silently.

**Recommendation.**
1. Add a subtle hover state to `.btn-plank`: `brightness(1.04)` or a `0 6px 18px` shadow bump — just enough to signal interactivity.
2. On the Drive hold-button: add a very subtle `softPulse` animation at rest (already exists in `theme.css:211`). When the hold begins, the animation stops (replaced by the fill progress). This telegraphs "this button has a behavior" before the child presses.

**Why this helps a 4.5-year-old.** The hold-to-confirm mechanic is not intuitive for a child used to single-taps. A breathing/pulsing state at rest communicates "I respond to prolonged touch." Combined with a first-session tooltip (see C5), this teaches the mechanic without words.

---

### A6 · No `prefers-reduced-motion` handling
**Priority: P2 — DEMOTED 2026-05-14.** Motion as currently tuned is engaging and part of the storybook feel, not a friction point. Ambient load is within budget on target devices. Not pursuing without specific feedback that the animation load is harming a real user (vestibular sensitivity, low-battery drain).

**Problem.** The app uses 15+ keyframe animations (sail-breathing, music-bars, bob, iris-in, fog-clear, noteRise, etc.). If a parent's phone has iOS/Android reduced-motion enabled, the app still runs all animations. This is a CSS media query omission.

**Recommendation.** Wrap all non-essential infinite animations in:
```css
@media (prefers-reduced-motion: reduce) {
    [animation: sailBreathe ...], [animation: noteRise ...], [animation: bob ...] {
        animation: none;
    }
}
```
Preserve functional animations (iris-in, fadeUp for entrance, splash for modals) as they carry information. Suppress ambient animations (sail-breathing, music-bars, seagull drift, water ring).

**Why this helps.** A small number of children have vestibular sensitivities that make ambient motion uncomfortable. More practically, reduced-motion phones are common in low-battery mode and the animation loop is a battery drain.

---

## Part B — Per-Screen Recommendations

---

### B1 · Home Screen
**File:** `family-pirate-ship/src/screens/Home.tsx`

#### B1a · New Voyage button lacks a "go" icon — the ship doesn't read as tappable
**Priority: P0**

**Problem.** `Home.tsx:70–76`: The primary CTA is a PlankButton with "🏴‍☠️ הפלגה חדשה." The pirate flag emoji precedes the Hebrew text, which is a step in the right direction. But:
1. The emoji is platform-rendered and doesn't match the hand-drawn SVG aesthetic.
2. A black flag does not universally communicate "go" or "start" to a 4.5-year-old — it's a pirate symbol, not a directional CTA symbol.
3. The hero ship above the button (Home.tsx:58–65) is a beautiful, animated illustration — but it's entirely decorative. There is no visual connection between the ship and the "tap to sail" action. The child sees a ship and a plank below it; the relationship between "tap the plank → the ship sails" is not encoded in the UI.

**Recommendation.**
1. Replace the flag emoji with the existing `CompassIcon` SVG pointing in a "forward" direction (or introduce a new `WheelIcon` / `SailIcon` variant — a ship's helm or a full sail — which more universally reads as "navigate/go"). Place it leading, not trailing.
2. Add a very subtle tap-affordance cue to the ship itself: on first-session only, show a small animated "tap" ring pulsing near the "New Voyage" button, disappearing after first tap. This teaches the layout without words.
3. Consider enlarging the ship so it bleeds slightly above the CTA area — making the ship + button feel like one connected unit ("tap the ship's wheel to sail").

**Why this helps a 4.5-year-old.** The child's mental model is "I'm the pirate, I make the ship go." If the ship and the CTA are visually unified, the action is obvious. If they're separate layers, the child has to deduce a connection that isn't shown.

#### B1b · Map chip text — "X איים" not readable without numbers context
**Priority: P2**

**Problem.** `Home.tsx:48` — the map chip renders `<MapIcon size={20} /> {islandsCount} איים`. The number is legible, but "איים" (islands) is a word. At 0 islands (new user), the chip reads "0 איים" — an Arabic numeral the child can read, but paired with a word they can't.

**Recommendation.** Replace the text with small `IslandIllustration` thumbnails up to a count of 5, then "5+" with a map scroll icon. Zero-state: a map scroll with a question mark. The numeral and thumbnail together communicate "you have this many of these" without the word.

#### B1c · Settings button is 44px — below the 56px floor for a kid-accessible surface
**Priority: P2 — demoted 2026-05-13.** Parent-facing surface; a kid mis-tapping it doesn't break anything irreversible. The 56px floor is real for kid-path CTAs, less critical here.

**Problem.** `Home.tsx:30` — the settings compass button is `h-11 w-11` (44px). It's in the top corner, mostly parent-facing. But a 4.5-year-old will tap at anything interesting, and a compass icon is attractive.

**Recommendation.** Raise to `h-14 w-14` (56px). The visual icon stays the same size; only the tap target grows (invisible padding). Alternatively, add a `padding: 6px` to expand the tap area without changing the visual size.

---

### B2 · Drive Screen — End Voyage
**File:** `family-pirate-ship/src/screens/Drive.tsx`

This is the most-used screen and contains the single highest-priority UX issue in the app.

#### B2a · "סיימו הפלגה" — text-only label on a destructive hold button
**Priority: P0**

**Problem.** `Drive.tsx:170–213`: The End Voyage control is a custom hold-to-confirm div. Current state:
- 44px tall × 130px wide (below the 56px tap-target floor)
- Wood-light colored — identical to a standard PlankButton, no visual distinction from a "continue" action
- Text label "סיימו הפלגה" — two Hebrew words, unreadable for a 4.5-year-old
- No icon of any kind
- No hint that this requires holding vs. tapping
- The hold-progress fill shifts from `--wood-light` to `--wood-deep` (dark brown → darker brown) — a barely perceptible change
- No visual or spatial separation from the pirate selector buttons above it

A 4.5-year-old encountering this button for the first time has zero affordance to understand: (a) what it does, (b) how to trigger it, or (c) that it will end the experience.

**Recommendation — tiered, implement in order:**

**Tier 1 (P0 must-have):**
1. Add the existing `AnchorIcon` as the leading element inside the hold button — a downward anchor is the correct pirate semantic for "lower anchor / stop sailing." The word "סיימו הפלגה" stays as a secondary label next to it.
2. Shift the hold-progress fill color to bleed toward `--treasure-red` (already a token) as the hold completes: `background: linear-gradient(90deg, var(--treasure-red) 0%, var(--wood-deep) 100%)`. At 0% fill it's wood-light; at 100% fill it's treasure-red. This encodes: "red = stopping."
3. Raise min-height from 44px to 56px.

**Tier 2 (P1 polish):**
4. Animate the AnchorIcon with a gentle downward drift (translateY +4px → 0 → +4px, 2.5s infinite) at rest, signaling "press to lower." When hold starts, the animation freezes and the anchor drops to the bottom of the button over the hold duration.
5. Add a visual affordance hint: on first encounter (or for N seconds of no interaction), show a faint "hold" ring ripple around the button, similar to a long-press affordance indicator on Android/iOS.
6. Change the progress text: once hold reaches 20%, swap from "סיימו הפלגה" to a ⚓ glyph + growing number (so even without reading, the child sees "something is happening").

**Tier 3 (P2):**
7. Add a brief haptic pulse pattern on hold-complete (Web Vibration API: `navigator.vibrate([100, 50, 100])`) — the anchor-drop sensation.
8. Consider spatial separation: move the End Voyage button to a bottom sheet / drawer that slides up on a dedicated "anchor" tap. This eliminates accidental activation entirely — the two-step mechanic (tap to reveal → hold to confirm) is clearer than an invisible hold on an always-visible button.

**Why this helps a 4.5-year-old.** The hold mechanic exists correctly to prevent accidental ends — a young child will lean on the screen. But right now, the child cannot distinguish "this button ends the voyage" from any other tappable element. The anchor icon + red fill collapse that ambiguity to a single visual signal even before the hold begins.

#### B2b · "מאזין/ה עכשיו" active-state label is text-only
**Priority: P2 — REJECTED 2026-05-14.** The italic label is useful for a parent navigating the app on the kid's behalf. The non-reader already gets five other active-state cues; the text doesn't crowd them out and serves the parent path. Not removing.

**Problem.** `Drive.tsx:116–118`: When a pirate is actively listening, the label "מאזין/ה עכשיו" appears below the name. The existing 🎵 emoji on `Drive.tsx:111` is already a great non-reading signal. The italic text label adds nothing for a non-reader.

**Recommendation.** Remove "מאזין/ה עכשיו" entirely for the kid-path (or keep it hidden behind a parent-mode flag). The active state is already communicated by: colored glow, -translate-y elevation, 🎵 pulse, FlagBadge waving, and music-bar animation. Five concurrent signals — text is the sixth and weakest.

---

### B3 · Confirm End Modal
**File:** `family-pirate-ship/src/screens/ConfirmEnd.tsx`

#### B3a · "כן" and "לא" carry no icon — neither button communicates its meaning without reading
**Priority: P0**

**Problem.** `ConfirmEnd.tsx:14–25`:
```
⚓
לסיים את ההפלגה?
[ כן ]  [ לא ]
```
- The "Yes / End" button correctly carries the primary visual weight (wood, dark brown) — this modal appears only after a deliberate one-second hold on the Drive screen, so the user has already made an intentional decision. The visual hierarchy is appropriate.
- However, neither button has an icon. "כן" (yes) and "לא" (no) are single Hebrew words a 4.5-year-old cannot read. To a non-reader, both buttons look identical except for the cream vs. wood material — an extremely subtle distinction to navigate alone.
- The ⚓ emoji heading (ConfirmEnd.tsx:14) is decorative and static — it doesn't add semantic clarity about what the choice means.

**Recommendation.**
1. **Keep "כן — end voyage" as the primary/prominent button** (current wood treatment is correct — the hold gate means this is intentional action, not an accident to guard against).
2. **Add a leading icon to each button** — the icon must communicate the action, not just decorate it:
   - "כן" → `AnchorIcon` (SVG, leading) + "כן" label. The descending anchor is the pirate semantic for "we're stopping here." The child who held the button for a second already understands they are ending something; the anchor icon confirms it.
   - "לא" → `CompassIcon` or a small `PirateShip` silhouette (leading) + "לא" label. Communicates "keep navigating / stay at sea."
3. **Stack icon above label** so the glyph reads before the word, giving the non-reader a navigation path that doesn't depend on letters:
   ```
   [  ⚓  ]   [  🧭  ]
   [  כן  ]   [  לא  ]
   ```
4. **Replace the ⚓ emoji heading** (ConfirmEnd.tsx:14) with the animated `AnchorIcon` SVG doing a slow lowering motion — makes the question visually concrete ("lower the anchor?") rather than just thematic decoration. The same anchor icon then echoes in the "כן" button below, creating visual continuity: heading → button.
5. **Title simplification:** Consider reducing "לסיים את ההפלגה?" to just the animated anchor + a short label like "לעגון?" (anchor?). The hold-gate context makes the full sentence redundant.

**Why this helps a 4.5-year-old.** The hold mechanic already handles accidental activations — the child who reaches this modal has pressed deliberately. The remaining problem is purely one of icon literacy: without an icon, "כן" and "לא" are indistinguishable shapes. With icons, the child sees "anchor = stop" vs. "compass = continue" and can make a real choice.

---

### B4 · Spyglass Screen
**File:** `family-pirate-ship/src/screens/Spyglass.tsx`

#### B4a · Tier banner leads with text — non-reader gets no information
**Priority: P1**

**Problem.** `Spyglass.tsx:57–69`: The tier banner content is:
- Fair: "רוח גבית! זמן האזנה שווה ⛵" — inline sail emoji at the end
- Coastal: "הספינה קצת נטויה... אזנו את הזמן 🌊" — wave emoji at the end
- Harbor: "מישהו משתלט, אתם לא זזים" + inline harbor SVG

The sailing state of the ship (`sailsFull={tier === 'fair'}`, Spyglass.tsx:119–120) is the best tier signal in the entire app — a non-reader can see whether the sails are full or slack. But this competes for attention against the text banner at the top.

**Recommendation.**
1. Lead the tier banner with a large icon (64–80px), not text:
   - Fair → full-sail ship silhouette or sunburst ☀️ (existing `--tier-fair: #f4b942` gold)
   - Coastal → wave SVG (existing `--ocean-bright` blue)
   - Harbor → lowered anchor (existing `AnchorIcon` with downward orientation)
2. The Hebrew text remains below the icon — parent-readable context, but the child navigates by icon.
3. The ship's sail state is a second-order confirmation: icon in banner → ship below. Both say the same thing. That redundancy is excellent for a non-reader.

**Design note:** The `FrostedBanner` component (used at Spyglass.tsx:108) already takes a `tier` prop. This is the right hook for tier-specific icon rendering — just add the icon layer above the text inside the banner.

#### B4b · Close "✕" button is 44px and symbol-only without the storybook quality
**Priority: P1** (see also A3)

**Problem.** `Spyglass.tsx:91–101`: The close button is a `h-11 w-11` circle with "✕" as a text character. The 44px target is below the 56px floor. The "✕" is a keyboard symbol, not a designed SVG — it renders differently across platforms and has no pirate register.

**Recommendation.** Raise to `h-14 w-14` (56px). Replace "✕" with a small `SpyglassIcon` in a "collapsed/closed" orientation, or a simple illustrated "X" that fits the hand-drawn style. Alternatively: a folded scroll SVG that communicates "put away the spyglass."

---

### B5 · Reveal Screen
**File:** `family-pirate-ship/src/screens/Reveal.tsx`

The 5-stage cinematic sequence (Reveal.tsx:33–42) is the single strongest design moment in the app. Preserve everything. Recommendations here are targeted additions.

#### B5a · Tier verdict is 100% text — a non-reader gets no outcome signal
**Priority: P0**

**Problem.** `Reveal.tsx:168–172`: The FrostedBanner at stage >= 4 contains:
- Fair: "האזנה משותפת - אי חדש התגלה!" (Shared listening — new island discovered!)
- Coastal: "האזנה קצת נטויה - מצאתם משהו על החוף!" (Slightly off — found something on shore!)
- Harbor: "נתקעתם בנמל - נסו לחלוק יותר פעם הבאה" (Stuck in harbor — try more next time)

A 4.5-year-old watching this screen knows the animation is climactic. They do not know whether they won, partially won, or got nothing — because all three outcomes present as identical-looking FrostedBanner text.

The island illustration (Reveal.tsx:195) and coastal find icon (Reveal.tsx:209) do provide a visual signal for fair/coastal tiers. But:
1. They appear below the banner, not as the dominant element.
2. Harbor tier shows no illustration at all — just a text banner.

**Recommendation.**
1. **For all tiers:** Precede the text in FrostedBanner with a large tier icon (same icons as B4a — sun, wave, anchor). At 72px+, this icon should be the first thing the child sees at stage 4.
2. **For Fair tier:** The island illustration is already doing great work. Keep the fog-clear animation. Optionally add a `glowPulse` ring around the island at the moment of reveal.
3. **For Coastal tier:** The coastal find icon is also doing good work. Consider a brief `splash` bounce on appearance.
4. **For Harbor tier (most critical):** Currently there is zero visual outcome beyond a text banner on a dark background. This is the "no reward" state, but the animation buildup creates expectation — a flat text letdown is deflating.
   - Show a gentle visual: a parrot on a dock railing (simple SVG), the home harbor at dusk, or the small `PirateShip` still bobbing — the voyage happened even if no treasure was found.
   - Replace the harbor tier text with a warm, short visual: an anchor planted in harbor sand. The message "try more sharing next time" can stay as small print for the parent, but the child's visual should be neutral-warm, not empty.
5. **Save button** `Reveal.tsx:222` — "שמור והתחל ⚓": move the anchor from trailing emoji to leading `AnchorIcon` SVG. Shorten the label or split into icon + abbreviated text ("⚓ קדימה").

#### B5b · Harbor outcome is a flat letdown — no ambient visual warmth
**Priority: P2 — demoted 2026-05-13.** B5a (icon-led tier banner) already shipped, so the kid sees a clear lowered-anchor signal in the harbor outcome. The full Reveal animation (fog clear, ship reveal) plays regardless of tier — the child gets the climactic experience either way. Adding a parrot/sunset visual is polish, not a missing-information fix.

See B5a recommendation 4. The app's emotional promise is "the voyage happened, the listening happened, you tried." Even the no-reward outcome should land with warmth. The harbor-tier screen currently communicates failure through a text sentence and silence. For a 4-year-old, that's a sad ending to something they were excited about.

---

### B6 · Map Screen
**File:** `family-pirate-ship/src/screens/Map.tsx`

#### B6a · Locked islands as blurred dashed circles don't read as "locked"
**Priority: P1**

**Problem.** `Map.tsx:129–133`: Locked islands render as:
```
h-14 w-14 rounded-full border-dashed border-[rgba(93,63,42,0.4)] bg-[rgba(197,224,232,0.85)] filter: blur(1px)
```
A blurred, dashed circle with an ocean-teal background. For an adult this implies "something is there but hidden." For a 4-year-old, it may simply look like a fog/cloud element of the map, not a placeholder for something earnable.

**Recommendation.** Add a visual lock affordance — pick one of:
- Option A: A small `🔒` emoji or simple lock SVG overlay (centered inside the circle). Simple, universally understood.
- Option B: A "?" mark in the center (parchment color, Suez One font) — suggests "mystery." Fits the treasure-map aesthetic better.
- Option C: A faint dashed "X marks the spot" pattern inside the circle — pirate-register mystery.

Pair with the existing blur so the mystery is maintained while the "this slot is a potential future reward" message is clear.

#### B6b · Stats drawer is all text — icons would make it skimmable by a non-reader
**Priority: P2 — REJECTED 2026-05-14.** Stats drawer is parent-facing — kids don't read counts of voyages or coastal finds. Adding icons clutters a parent surface for a benefit no real user gets. Not changing.

**Problem.** `Map.tsx:82–93`: The stats drawer lists:
- "איים שהתגלו" + count
- "מציאות חוף" + count
- "הפלגות בסך הכל" + count

All text labels. The `Stat` component (Map.tsx:158–164) renders a flat text row.

**Recommendation.** Prepend each stat with a leading icon (existing assets):
- Islands discovered → small `IslandIllustration` thumbnail (any island) + count
- Coastal finds → `CoastalFindIcon` + count
- Total voyages → `PirateShip` miniature or `AnchorIcon` + count

The child sees "3 of those island things," "1 beach thing," and "5 ships" without reading a word.

#### B6c · Back button "חזרה לנמל ←" uses an RTL-hostile arrow
**Priority: P2**

**Problem.** `Map.tsx:149–151`: The back button uses "חזרה לנמל ←" — a Hebrew label with a left-pointing arrow. In RTL layout, "back" (returning to a previous context) is spatially toward the right, not left. The arrow direction is contextually confusing.

**Recommendation.** Replace the "←" text arrow with the existing `CompassIcon` (24px leading). **Keep the label "חזרה לנמל"** (decision 2026-05-14 — the full label aids parent navigation; the change here is purely the arrow → compass swap, label unchanged).

---

### B7 · Island Detail Modal
**File:** `family-pirate-ship/src/screens/IslandDetail.tsx`

#### B7a · Description paragraph is unreadable for the child user
**Priority: P2**

**Problem.** `IslandDetail.tsx`: The modal shows island name (heading), a description paragraph (`island.description` — a full sentence of Hebrew narrative), and stats (discovered date, voyage time). None of this is readable for a 4.5-year-old. The island illustration is present but competes with a large text block.

**Recommendation.**
1. Make the island illustration the dominant element — full-width (min 200px), centered at the top.
2. Push the description text to a collapsible "parent info" strip, collapsed by default. A parent tap expands it. The child sees: island image → voyage-stats as icons → their avatar(s) with the ship that unlocked it.
3. Add a `PirateShip` miniature + `CargoStack` visualization (existing components) showing the voyage that earned this island — the child sees "we were on the ship together and found this." This reuses existing components and makes the island emotionally personal.
4. Close button: raise to 56px (see A3).

---

### B8 · Roll Call Screen
**File:** `family-pirate-ship/src/screens/RollCall.tsx`

The Roll Call toggles are already a strong design — color-on = pirate's flag color, color-off = gray, animated thumb. The core interaction is visually clear for a non-reader.

#### B8a · Toggle on/off could use a more delightful avatar animation on change
**Priority: P2**

**Problem.** When a pirate is toggled "in," the avatar presumably appears or brightens (based on the sleeping prop pattern from Drive). A small tactile celebration on toggle-on would reinforce the action.

**Recommendation.** On `active → true` transition: play a `splash` scale pop on the avatar (already a defined keyframe, theme.css:278–291). On `active → false`: play a gentle fade + slight shrink. The child learns "my pirate woke up / went to sleep" from the avatar, not from "בפנים!" text.

#### B8b · Error state "אף אחד לא מפליג? בלתי אפשרי!" is text-only
**Priority: P2**

**Problem.** If no pirates are toggled, an error message appears. This is text-only.

**Recommendation.** ~~Show three sleeping pirates as the visual error state.~~ **Revised 2026-05-14:** when all toggles are off, the three sleeping avatars are *already visible* in the row list above. The empty-state text is redundant clutter on top of an already-clear visual. Decision: **remove the error text entirely.** The three sleeping avatars + the disabled "מפליגים!" button (already greyed via PlankButton's `disabled` prop) communicate the state without any words.

---

### B9 · Onboarding Screen
**File:** `family-pirate-ship/src/screens/Onboarding.tsx`

**Priority: P2 / Parent-facing — lightweight notes only**

The onboarding is primarily parent-facing (naming pirates, confirming the crew). The child sees the ship + avatars but doesn't operate the inputs.

**Observations:**
- The naming step (`step === 1`) shows pirate avatars with flag-color assignments. The parent may not understand that the flag colors (red kid, teal mom, purple dad) are identity-permanent. Consider showing the `FlagBadge` component prominently next to each input — "your pirate's flag will always be this color."
- The "Crew Ready" step is the first time the child can meaningfully celebrate: all three avatars are visible and confirmed. A `splash` animation on each avatar on this step would make it a micro-celebration before the first voyage.
- Step indicator dots communicate progress to a reader; a non-reading child ignores them. This is fine — the child isn't operating onboarding.

---

### B10 · Parent-Facing Screens — Lightweight Notes
**Files:** `Settings.tsx`, `FamilyNaming.tsx`, `SignIn.tsx`, `InviteAccept.tsx`

These screens are operated by adults. Text reliance is fine. Brief observations:

**Settings.tsx:**
- Math gate (the entry challenge) is a clever parent-protection mechanism. Ensure the math question has sufficient font size on mobile (iOS default zoom can make small inputs uncomfortable).
- Reset Data button: should use `--action-danger` treatment (see A2) as it is the most destructive action in the app. Currently it likely renders as a standard button.
- See also: the `microcopy-review.md` flags — aria-labels in English, generic "Toggle" labels, and hardcoded placeholder data in Island Detail stats. These are still open.

**FamilyNaming.tsx + SignIn.tsx:**
- Both screens show the animated harbor scene with the bobbing ship. Good — the brand context is set from the first moment even for parents.
- InviteAccept handles multiple error states (expired, wrong account, already member). All states should have a clear primary action to resolve — currently some states may only have a text explanation with no clear next-step button.

---

## Part C — Polish Themes

These are cross-cutting observations about what separates a "functional children's app" from a "top children's educational app." Each addresses a consistent gap across multiple screens.

---

### C1 · Press feedback is inconsistent across interactive surfaces
**Priority: P1**

`PlankButton` has the correct `.btn-plank:active` press drop (translateY(3px), reduced shadow). But the custom Drive hold-button and the raw `<button>` elements on Home (settings compass, map chip), Map (island buttons, stats chip), and Spyglass (close button) have no active state. A tap on these elements gives no physical feedback.

**Rule:** Every tappable surface in the app — not just PlankButtons — should respond to touch with a visible press state. For circular icon buttons: `transform: scale(0.92)` on `:active`. For the island buttons on Map: a brief `splash` scale. Consistency across all surfaces makes the app feel cohesive and responsive.

---

### C2 · Ambient life is absent on Drive and Spyglass
**Priority: P2**

The Harbor screen (Home, Reveal) has animated clouds, seagulls, and a bobbing ship — the environment feels alive. The Drive screen (waves variant) has animated music bars and the pirate glow, but the background is static wave SVG. The Spyglass screen has a static sky.

**Recommendation.** Add one ambient idle element per non-harbor screen:
- Drive: ~~a single `Seagull` component drifting slowly across the wave background.~~ **Revoked 2026-05-14.** Tried it; the drift band sits where the pirate cards live, so the gull is hidden behind the cards in any realistic playthrough. The wave area visible above the cards is too narrow for a useful drift path. Drive stays without ambient life.
- Spyglass: a distant `Cloud` drifting at 20% opacity across the sky background — barely perceptible, just enough to breathe life into the scene. **Shipped 2026-05-14.**

This costs minimal performance (one CSS animation each) and significantly elevates the sense that you're "at sea."

---

### C3 · Harbor tier is the only emotionally flat outcome — needs warmth
**Priority: P2 — demoted 2026-05-13.** Same rationale as B5b: the cinematic Reveal sequence plays for all three tiers, and B5a's anchor icon now carries the harbor outcome's tone. The "warm visual" idea is good design philosophy but the current state is functional, not failing.

Covered in B5a and B5b, but worth naming as a standalone principle: **every session endpoint should feel warm, regardless of outcome.** The "no reward" state at Harbor tier is a narrative choice, not a technical one — the app's philosophy is "balance beats winning," not "failure is punishing." The visual design of the Harbor outcome should reflect that philosophy. A smiling parrot on a dock, a ship tucked safely into harbor at sunset, or even the family's pirate avatars waving from the shore — any of these communicates "you sailed, you came home, try for more sharing next time" without words.

---

### C4 · End-voyage is the only irreversible action with no distinct visual surface type
**Priority: P1**

The ConfirmEnd modal covers this partially, but the principle is worth naming: the Drive → End Voyage → ConfirmEnd flow is the only flow in the app that cannot be undone (once confirmed, the voyage data is committed). Every other tap is either reversible or low-stakes.

Top children's apps use a consistent visual register for irreversible actions: a richer modal treatment, a different backdrop, a "final step" animation. The current ConfirmEnd modal has a good `splash` entrance and a dark overlay. What it lacks is a visual escalation from the Drive screen — the transition from "active voyage" to "are you sure?" should feel weightier (perhaps a brief blackout or iris-out transition before the modal appears, similar to the Reveal stage-0 black flash at Reveal.tsx:77).

---

### C5 · No first-session guidance — the hold mechanic and spyglass are invisible on first use
**Priority: P2 — demoted 2026-05-13.** The hold button now leads with an animated AnchorIcon and a colored progress fill (B2a, shipped). The spyglass already gets a glow pulse after 5 minutes (Drive.tsx:36,64). A 4.5-year-old learns by tapping, not by reading hint bubbles — instructional UI is a heavier intervention than the affordances already in place warrant.

A brand-new user (child or parent helping the child) sees Drive and has:
- Three tappable pirate buttons — intuitive (big, colorful, labeled with familiar photos)
- A spyglass icon — attractive but purpose unclear
- A small hold-button labeled "סיימו הפלגה" — no affordance

**Recommendation.** For the first session only, show two ultra-brief guidance cues, each auto-dismissing:
1. On first Drive load: a "hold to stop" visual hint on the end-voyage button — a small animated finger illustration pressing and holding, visible for 3 seconds, then fades. No text needed.
2. After 2 minutes of drive time: the Spyglass icon already gains a `glow` pulse after 5 minutes (Drive.tsx:36,64). Consider a one-time hint bubble pointing to the spyglass: a pirate hat icon + finger tap animation (no text), appearing once, dismissing on first tap.

Both cues are purely visual. They teach by example, not instruction. They never reappear after the first session.

---

### C6 · Audio — Future Work
**Not prioritized this pass.** These are the three highest-leverage sound moments when audio work begins:
1. **Pirate selector tap** — a soft wooden drum tap on each pirate button press. Confirms selection without visual attention.
2. **Anchor drop (hold-complete on End Voyage)** — a chain/anchor splash sound. The most memorable moment to reinforce with sound.
3. **Reveal fanfare** — tier-specific: treasure fanfare (fair), sea wind (coastal), harbor bell (harbor). The cinematic sequence already has a 5-stage visual rhythm; sound would lock each stage to memory.

No design deliverable needed until visual P0/P1 items are resolved.

---

## Part D — Prioritized Summary Table

| ID | Screen | Element | Priority | What to do |
|----|--------|---------|----------|------------|
| A2 | Global | Color tokens | P0 | Add `--action-danger` / `--action-safe` aliases to theme.css |
| A3 | Global | Tap targets | P0 | Enforce 56px floor on all kid-path touchables |
| A4 | Global | Icon-first rule | P0 | Lead every kid CTA with SVG icon, text secondary |
| B2a | Drive | End Voyage button | P0 | Add AnchorIcon, red fill-progress, 56px height |
| B3a | ConfirmEnd | Yes/No buttons | P0 | Add AnchorIcon to "כן", CompassIcon to "לא", stack icon above label — keep "כן" as primary weight |
| B5a | Reveal | Tier verdict | P0 | Add tier icon (sun/wave/anchor) above text in FrostedBanner |
| B1a | Home | New Voyage CTA | P1 | Replace flag emoji with SVG "go" icon, unify ship+button visually |
| A1 | Global | Web fonts | P1 | Remove `!important`, wire Heebo + Suez One to font tokens |
| B4a | Spyglass | Tier banner | P1 | Lead with large tier icon, text secondary |
| B4b | Spyglass | Close button | P1 | Raise to 56px, replace "✕" with SVG |
| B5b | Reveal | Harbor outcome | P1 | Add warm ambient visual for no-reward state |
| B6a | Map | Locked islands | P1 | Add "?" or lock SVG overlay to locked island circles |
| C1 | Global | Press feedback | P1 | Add `:active` state to all tappable surfaces (not just PlankButton) |
| C3 | Reveal | Harbor tier | P1 | Emotional warmth on no-reward outcome |
| C4 | Drive→ConfirmEnd | End flow | P1 | Visual escalation (iris-out or black flash) before ConfirmEnd modal |
| C5 | Drive | First-session hint | P1 | Visual-only hold affordance cue on first session |
| B1b | Home | Map chip | P2 | Replace "X איים" text with island thumbnail count |
| B1c | Home | Settings button | P1 | Raise tap target to 56px |
| B2b | Drive | "מאזין/ה עכשיו" | P2 — rejected | Label aids parent navigation; not removing |
| A5 | Global | Hover + hold hint | P2 | Add hover state to PlankButton; pulse hint on hold-button at rest |
| A6 | Global | Reduced motion | P2 — demoted | Current motion is engaging and on-budget; not pursuing without specific user-reported friction |
| A7 | Global | Focus states | P2 | Add `:focus-visible` outline for keyboard/a11y |
| B6b | Map | Stats drawer | P2 — rejected | Drawer is parent-facing; icons add clutter without kid benefit |
| B6c | Map | Back button arrow | P2 | Replace "←" with CompassIcon; keep "חזרה לנמל" label |
| B7a | IslandDetail | Description text | P2 | Move text to collapsed parent-strip; enlarge island illustration |
| B8a | RollCall | Toggle animation | P2 | `splash` on avatar when toggled active |
| B8b | RollCall | Error state | P2 | Remove the error text entirely; sleeping avatars above + disabled CTA already communicate the empty state |
| C2 | Drive + Spyglass | Ambient life | P2 | Spyglass cloud shipped; Drive seagull revoked (hidden behind pirate cards in real layout) |
| C6 | Global | Audio | Future | Flagged for later: tap sound, anchor drop, reveal fanfare |

**P0 count: 6**
**P1 count: 13**
**P2 count: 11**

---

## Part E — Decisions Locked In

The following questions were reviewed with product and resolved:

**E1. Device context: phone-in-hand.**
The 56px tap target floor and one-handed layout assumptions apply. End-voyage button at the bottom is correct for thumb reach. No tablet adjustments needed.

**E2. Button labels: icon leads, Hebrew text stays as secondary signal (A4 approach).**
Every kid-facing CTA uses SVG icon leading + Hebrew word trailing. Text is kept for parent confidence and is not removed. No icon-only mode or parent/kid toggle needed this pass.

**E3. Motion budget: high-end devices, current animation load is acceptable.**
P2 ambient additions (drifting Seagull on Drive, Cloud on Spyglass) can be implemented without benchmarking gating. The existing Drive animation load (glow-pulse, music bars, flag wave, ship bob) is within device budget.

---

*This document is a design proposal. When items are approved, update `designer-spec.md` with the accepted changes and archive this file to `specs/archive/`.*
