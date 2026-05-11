# Family Pirate Ship — App Spec v2

A private family web app for tracking who-listens-to-whose-music during car drives — designed to teach a 4.5-year-old that *balanced* family music time is the goal, not "winning" more time.

> **v2 note.** This product spec has been updated to match the as-built v1 prototype and the v2 designer spec. The product mechanics, balance math, tiers, and progression model are unchanged from v1. The product-level changes in v2 are: a simplified cargo visual system (single crate primitive tinted per flag), no auto-selected pirate when the during-drive screen opens (the kid must tap to begin), a second entry point to the Treasure Map from the home screen, and a small handful of Hebrew copy corrections. A change log lives at the end of this doc.

---

## Core design principles

**Calm during the drive by default, with a peek available on demand.** No constant animations or scoreboards while driving — the kid sees three big buttons, and the box for whoever is currently listening glows softly. A Spyglass button lets the family peek at the current cargo state whenever they want, so they can rebalance *during* the drive, not just react to the result. The end-of-drive reveal is still the moment that determines what gets unlocked.

**Balance is the only thing that earns progress.** A lopsided drive doesn't unlock new content. The cumulative game gates progression on fairness — not on individual contribution.

**The metaphor teaches the lesson.** A pirate ship needs balanced cargo to sail. If three pirates load equally, the ship sails out and discovers a new island. If they don't, it stays in the harbor. The lesson is built into the physics of the world, not stapled on as a bonus.

---

## The three pirates

On first launch, a one-time setup creates the three family pirates. The setup is intentionally minimal — just typing three names — to get the family on the water fast.

For each pirate, V1 ships with:

- **A default name** that the parent overrides during setup. Defaults: `קפטן ילד` (Captain Kid), `אמא־פיראטית` (Mama Pirate), `אבא־פיראט` (Papa Pirate).
- **A pre-designed avatar** — one for the kid pirate, one for the mom pirate, one for the dad pirate. No mix-and-match customization at this stage.
- **A default flag color** — red for the kid, teal-green for mom, deep purple for dad. High-contrast and easy to tell apart at a glance. This is how the kid visually identifies whose cargo section is whose throughout the app, and the same color is used to tint that pirate's cargo crates.

All three pirates are equals. No "captain ranks." Avatar and flag-color customization is deferred to V2 (i.e. post-current-V1); revisit only if there's real demand.

---

## Screens & flows

### 1. Home screen

A pirate harbor with the family's docked ship in the foreground. Two big buttons:

- 🏴‍☠️ **Start a new voyage** (`הפלגה חדשה`)
- 🗺️ **See our treasure map** (`מפת האוצר`) — cumulative view

A small ⚙️ icon in one top corner opens parent settings (gated). A small 🗺️ map chip in the other top corner is a **second entry point to the treasure map**, alongside the secondary button — it gives the kid a quick way to admire the map without a multi-step nav. **[v2]**

### 2. Start drive flow — "Pirate roll call"

Three avatars stacked, each with a "Sailing today?" toggle. All three are toggled ON by default. Tapping a pirate's toggle turns them OFF for this drive — for cases where mom or dad just wants quiet, or only two are in the car.

Big **⚓ Set sail!** button starts the session. Disabled if zero pirates are toggled on, with a friendly "אף אחד לא מפליג? בלתי אפשרי!" message.

### 3. During-drive screen

The calm screen the kid sees while driving. Three big rectangular boxes stacked vertically, vertically centered as a column on the screen:

- Each box shows the pirate's avatar, name, and a small flag in their color
- The box is tinted with a faint wash of the pirate's flag color over a warm wood base, so the kid can identify whose box is whose even when none is active
- Whichever box was last tapped is **glowing softly** in that pirate's flag color, with a small "now playing 🎵" icon, a "מאזין/ה עכשיו" caption, a waving flag, and an animated four-bar music-EQ indicator
- A soft chime plays on tap-switch
- Tapping any other box instantly switches the active timer (no confirmation)

**No box is selected when the screen first opens. [v2]** The kid must tap a box to start accumulating time on someone — there is no auto-selected pirate. This matches the kid's mental model ("the music isn't playing yet, so no one's box should glow") and avoids the visual ambiguity of starting a fresh voyage with someone already glowing.

Two smaller buttons live in the corners:

- **🔭 Spyglass** (top corner) — opens the mid-drive check-in (see 3a below)
- **End voyage** (bottom corner) — requires a 1-second hold + yes/no confirm to prevent stray-finger accidents

If a pirate sat out at start, their box still appears, greyed out, labeled "נח היום" (Resting today) — un-tappable.

**No timers or numbers are visible on the main screen.** The Spyglass is the only way to peek at the current state. This keeps the default experience calm, and turns peeking into a deliberate, ritualized act ("let's check the cargo!") rather than a passive scoreboard.

### 3a. The Spyglass — mid-drive check-in

The Spyglass is the answer to *"how do we rebalance during the drive?"* Either parent or kid can tap the spyglass icon at any time to peek at the current cargo state.

Tap → a brief "looking through the spyglass" vignette transitions the screen → the ship preview appears, showing the three flagged cargo sections at their current heights based on listening time so far. **No numbers — just the visual cargo stacks**, identical to the end-of-drive reveal.

**The cargo visual: one crate primitive, tinted per pirate. [v2]** Each pirate's cargo section is a vertical stack of identical wooden crates, tinted in that pirate's flag color (red for the kid, teal-green for mom, deep purple for dad). The number of crates in a stack is proportional to that pirate's listening minutes. Three identical stack shapes side by side make "more vs. less" trivially readable for a 4.5-year-old — no need to weigh whether a treasure chest is "worth more" than a barrel. The previous v1 plan had a mix of barrels, sacks, treasure chests and rope coils as cargo items; that introduced unnecessary cognitive load and was simplified to a single crate type during prototyping.

The cargo column for each pirate is rendered directly under that pirate's flag — kid's red stack under the red flag, etc. (This sounds obvious but was a real bug in the prototype, where RTL flow inside the cargo overlay was mismatching cargo with flags. Calling it out so future re-builds get it right.)

Above the ship, a small status banner shows the current tier in funny pirate Hebrew:

- **⛵ "רוח גבית, ימאים!"** — currently in tier-1 (would unlock a new island)
- **🌊 "הספינה קצת נטויה..."** — currently in tier-2 (would find something coastal)
- **⚓ "אוי, צד אחד כבד מדי!"** — currently in tier-3 (would stay in harbor)

Tap anywhere to dismiss → back to the calm three-button screen.

**The peek is non-destructive.** It doesn't trigger rewards, doesn't save progress, doesn't end the drive. The end-of-drive reveal is still where the actual outcome is determined. The Spyglass just answers "where would we be if we stopped right now?" so the family can decide whether to rebalance.

**Why this is the heart of the lesson.** Your son taps the spyglass mid-drive, sees his cargo towering over mom's, and (with a tiny nudge — or eventually on his own) goes "let's give mom a turn now." That moment of self-regulation is the whole point of the app. It can only happen if the information is available *during* the drive, not just after. The spyglass also teaches him to *read* the cargo visual — by the time the end-of-drive reveal arrives, he already knows what a balanced vs. lopsided ship looks like.

The peek visual reuses the reveal animation assets — same ship, same crate stacks, same flag colors — so there's no duplicate art needed.

### 4. End drive → reveal screen

The big payoff. Animated cinematic sequence, ~15–18 seconds end-to-end:

1. Iris-out wipe transitions away from the during-drive screen.
2. A hand-painted **"סוף ההפלגה!"** title card splashes in.
3. The three pirates appear at the dock and walk up the gangplank one at a time, loading their flag-colored crate stacks onto their section of the deck (bow / middle / stern).
4. The ship is shown in side view with three cargo stacks of various heights — **same crate-tinted-per-flag system as the Spyglass [v2]** — for instant visual comparison the kid can read at a glance.
5. The verdict — one of three tiers based on the balance score (math below).

The verdict tier:

- **⛵ Fair winds.** Full sails go up. The ship sails out across the open sea (left-to-right, regardless of RTL UI direction) and reaches a new island on the family's treasure map. A short "what did we find here?" reveal: a unique animal, item, or character native to the island. Saved to the map. Banner: **"אי חדש התגלה!"** + brass horn.
- **🌊 Coastal sailing.** The ship motors a short way along the coast and discovers something small — a message in a bottle, a friendly seagull, a fish. Less rare, but still a real find. Saved to the "Coastal finds" log. Banner: **"מצאנו משהו על החוף!"** + ukulele strum.
- **⚓ Harbor.** The ship stays docked. Pirates shrug at the lopsided cargo. A friendly pirate says **"הספינה קצת נטויה היום, ימאים!"** — neutral, hopeful, no scolding. Drive is logged but doesn't unlock new content. Soft seagull caw, no sad music.

A **שמור והתחל** (save & done) button returns to home.

### 5. Treasure map (cumulative view)

A hand-drawn pirate map. Initially mostly covered in fog. As the family sails to new islands (only on Fair Winds drives), the fog lifts to reveal each one. **Two entry points from home: the secondary button and the small map chip in the top corner. [v2]**

Tapping any unlocked island shows:

- Its name (auto-generated, kid can rename)
- The day it was discovered
- The treasure or creature found there
- That drive's stats (date, total time, each pirate's time, the balance score)

Tapping a still-fogged area shows a friendly "מה מסתתר שם? הפליגו בהוגנות כדי לגלות!" caption.

A side panel ("📜 Voyage stats") shows running totals: islands discovered, coastal finds, total voyages logged including harbor ones.

This is the long-term hook. The kid watches the map grow over weeks. **The only way to add islands is balanced drives.**

A **"חזרה לנמל"** button at the bottom returns to home.

### 6. Parent settings

Behind the ⚙️ icon (gated by a simple math problem like "מהו 7 + 5?" to keep the kid out):

- Edit pirate names (and flag colors — V2)
- Adjust balance thresholds (sliders, defaults below) with live preview
- Toggle audio on/off
- Toggle map fog on/off
- Drive history (full log with raw times)
- Reset / export data

---

## The balance mechanic

The metric asks one direct question: **did anyone dominate the music?** Not "was every pirate exactly equal" — that's too strict and not the lesson. The lesson is "no one hogs the drive."

**The math, in four steps:**

1. Round each pirate's listening time to the nearest minute. (Cargo crates also represent minutes, so visual and math line up.)
2. Sum the participating pirates' minutes: `total = T₁ + T₂ + ... + Tₙ`
3. Compute the biggest share: `biggest_share = max(Tᵢ) / total`
4. Compare against the tier thresholds below.

**Tiers:**

| Tier | biggest_share | Outcome |
|---|---|---|
| ⛵ Fair Winds | ≤ 60% | New island unlocks |
| 🌊 Coastal Sailing | 60% – 75% | Coastal find |
| ⚓ Harbor | > 75% | No unlock, friendly note |

**Worked examples:**

| Kid | Mom | Dad | Total | Biggest share | Tier |
|---|---|---|---|---|---|
| 20 | 8 | 7 | 35 | 57% (kid) | ⛵ Fair Winds |
| 20 | 15 | 15 | 50 | 40% (kid) | ⛵ Fair Winds |
| 12 | 12 | 12 | 36 | 33% | ⛵ Fair Winds |
| 18 | 7 | 5 | 30 | 60% (kid) | ⛵ Fair Winds |
| 22 | 5 | 5 | 32 | 69% (kid) | 🌊 Coastal |
| 25 | 5 | 5 | 35 | 71% (kid) | 🌊 Coastal |
| 30 | 5 | 5 | 40 | 75% (kid) | 🌊 Coastal |
| 18 | 3 | 2 | 23 | 78% (kid) | ⚓ Harbor |
| 18 | 1 | 1 | 20 | 90% (kid) | ⚓ Harbor |

The forgiveness is deliberate: a 1-minute gap between mom and dad doesn't matter, only whether anyone hogged. That tracks real-life family dynamics.

**Edge rules:**

- **Sub-minute taps round to zero.** This prevents gaming via "tap mom's button for 5 seconds." Cargo crates also represent minutes, so the visual matches the math.
- **No pirate is auto-selected when the drive screen opens. [v2]** Until the family taps a box, no one is accumulating time. A drive that ends with zero taps is treated as "no one claimed any songs" and is not saved (see edge cases).
- **Solo voyage.** If only one pirate participated (others sat out), the drive is logged as a "solo voyage" with its own small badge — but it doesn't trigger balance logic and doesn't unlock islands.
- **Two-pirate drives.** Same biggest_share math applied to the two participants. With two pirates, biggest_share ≤ 60% means a roughly 60/40 split is still Fair Winds.
- **Minimum eligible drive length:** 2 minutes total. Shorter drives are logged but treated as Harbor (prevents trivial-drive farming).

**Thresholds are tunable in parent settings.** Starting values are 60% and 75% — tighten if Fair Winds is too easy, loosen if it's too rare. Plan to recalibrate after the first week or two of real drives, once you see how he actually plays.

---

## Treasure map progression — what gets unlocked

The map should stay rewarding for weeks. Suggested content scope:

- **Islands (~30+).** Each unique: jungle island, frozen island, desert island, candy island, dinosaur island, cloud island, mirror island, music island, etc. Each comes with a unique creature or character (illustrated), a short kid-friendly description, and a souvenir that goes into a family "Treasure hold."
- **Coastal finds (~15+).** Smaller surprises for tier-2 drives — bottles, fish, seagulls, drifting hats, mysterious crates.
- **Landmark milestones.** Triggered at counts: 5 islands = a sea monster sighting, 10 = a hidden lagoon appears on the map, 20 = a haunted shipwreck, 30 = a whirlpool that leads somewhere new.

Content is pre-bundled — no online dependency. Could be extended in updates.

---

## Edge cases & questions for V2

- **App crash / phone restart mid-drive.** Auto-save drive state every ~10 seconds so accidental closes don't lose the session. Resume on reopen.
- **Very long drives.** Cap the cargo crate stack at some maximum height with a "++" indicator so the reveal screen doesn't become absurd at hour 3.
- **Drive started but no buttons ever tapped.** With the v2 "no auto-selection on entry" rule, this is a real and expected state — not a bug. Detect it on End Drive and show "אף אחד לא בחר שיר היום" — don't save.
- **Family songs (everyone enjoys together).** Out of scope for V1. V2 could add a 4th "Family song" button that splits time equally three ways.
- **More than 3 family members.** Out of scope for V1. V2 could allow 2–4 pirates.
- **Captain rotation.** Could make "Captain of the day" rotate among the three pirates randomly per drive — pure visual flourish, no mechanical impact. Worth trying once the V1 is up and seeing if your son enjoys it.

---

## Visual & audio direction

**Style.** Hand-drawn, warm, storybook-watercolor pirate. Not Pixar-slick — closer to *We're Going on a Bear Hunt* or *Where the Wild Things Are*. Friendly, slightly imperfect, full of character. Avoid a generic "kids app" vibe.

**Color palette.** Ocean blues, warm sand yellows, deep reds for treasure, weathered wood browns. Each pirate gets a distinct flag color: red for the kid, teal-green for mom, deep purple for dad. The same color is used to tint that pirate's cargo crates. (Full hex tokens live in the designer spec.)

**Cargo visuals.** A single wooden-crate primitive, stackable, tinted in each pirate's flag color. **[v2]** This replaces the v1 plan of mixed barrels / sacks / chests / rope coils. The simplification was made during prototyping to reduce cognitive load for a 4.5-year-old — three identical-shape stacks side-by-side make "more vs. less" trivially readable, with no need to interpret which item is "worth more." Decorative barrels, chests and ropes remain as scene props on the dock and reveal scenes; they just aren't part of the stack-counted cargo system.

**Audio.** Seagulls and soft waves as ambient on the home screen. A chime for tap-switches. A short "spyglass extending" sound when peeking mid-drive. Satisfying *clunk* of cargo loading. Triumphant horn fanfare for Fair Winds, gentle ukulele strum for Coastal, a single soft seagull caw for Harbor — no sad music, just neutral.

**Language.** Kid-facing text in Hebrew — tone should be **funny and full-swashbuckling**, not sweet-and-soft. Think pirate-comedy: exaggerated "ארר!" and "אהוי!", over-the-top phrases like *"כל הימאים לסיפון!"*, mock-grand titles, dramatic announcements, the occasional silly playful insult between pirates ("you barnacle-brained sea biscuit!"). The humor matters as much as the pirate-ness — your son should giggle at how dramatic the pirates are. Parent-facing settings text can stay in either language. Final Hebrew copy needs a native pass to nail the comedic timing.

---

## Data model

**Per drive:**

```
drive_id, started_at, ended_at
participants: [
  { pirate_id, participated: bool, total_minutes: int, tap_events: [timestamps] }
]
biggest_share: float  // 0.0–1.0, the dominant pirate's slice
tier: "fair_winds" | "coastal" | "harbor" | "solo"
island_unlocked_id?: string
coastal_find_id?: string
```

**Per pirate (persistent):**

```
pirate_id, name, avatar_config, flag_color
```

**Per family (persistent):**

```
discovered_islands: [island_ids]
coastal_finds: [find_ids]
landmark_milestones: [...]
total_drives_logged
total_minutes_listened (sum across all pirates)
settings: { balance_thresholds, audio_on, fog_enabled, ... }
```

**Storage:** localStorage for V1 — it's a private family app. Sync across devices is a V2 concern if it ever matters.

---

## V1 scope decisions (resolved)

- **No postcard / revisit screen.** The in-the-moment reveal is enough. Today's drive lives in the moment, doesn't get re-watched. (Raw drive history is still logged in parent settings for reference.)
- **Pre-set island list.** No user-added islands or treasures. The ~30 pre-bundled islands carry V1.
- **No captain rotation.** Skipped for V1.
- **Hebrew tone: funny + swashbuckling.** Native review needed before lock-in.
- **Minimal onboarding.** Just naming the three pirates. No interactive tutorial. Default avatars and flag colors ship with the app.
- **Cargo system: single crate primitive, tinted per flag. [v2]** No mixed cargo types in the stack-counting visual.
- **No auto-selected pirate when the during-drive screen opens. [v2]** The kid must tap to start someone's timer.

---

## Change log — v1 → v2

Product-level changes only. Visual / typographic / layout-pixel changes (font stack, exact box heights, gap sizes, EQ bar color etc.) are tracked in the designer spec v2 §14.

**Cargo system simplified.** Originally specified as a mix of barrels, sacks, treasure chests and rope coils. Replaced during prototyping with a **single wooden-crate primitive, stacked by count, tinted in each pirate's flag color**. Used identically in both the Spyglass mid-drive peek and the end-of-voyage reveal. Mixed cargo items remain as scene decoration on the dock but aren't counted into stacks. Reasoning: three identical-shape stacks are trivially comparable for a 4.5-year-old, where "is the chest worth more than the barrel?" is not.

**No auto-selected pirate on the during-drive screen.** Originally implicit; in the prototype this surfaced as a real product question because auto-selecting index 0 caused a first-paint flicker and conflicted with the kid's mental model ("the music isn't playing yet, why is dad's box glowing?"). The decision: when the drive screen first appears, no box glows. The first tap selects the first pirate and starts accumulating time on them. A drive that ends with zero taps is treated as "no one claimed any songs" and isn't saved (consistent with the existing edge rule).

**Second entry point to the Treasure Map.** A small 🗺️ map chip in the top corner of the home screen, in addition to the existing secondary button. Lower-friction access for the kid to admire what's been discovered.

**Hebrew copy corrections:**
- Mom pirate role label: `אמא־פיראטה` → **`אמא־פיראטית`** (correct grammatical gender for "female pirate")
- Onboarding finish button: `אל הנמל!` → **`הפלגה חדשה`** (aligns the onboarding handoff verb with the home-screen primary action — the family lands directly on the start-a-voyage affordance)
