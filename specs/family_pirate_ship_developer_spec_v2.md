# Family Pirate Ship — Developer Spec v2

A full-stack technical spec for building V1 of the Family Pirate Ship app. Written to be fed into Claude Code for agentic development. Self-contained: behavior rules, types, file structure, algorithms, and a phased build plan are all here.

> **v2 note.** This spec has been updated to match the v2 product spec and v2 designer spec, both of which reflect the as-built HTML/React prototype. Product-level changes from v1: a single crate primitive for cargo (replacing mixed barrel/sack/chest), no auto-selected pirate when the during-drive screen opens, a second entry point to the Treasure Map from home, and a small set of Hebrew copy fixes. Visual changes from v1: a system-font stack everywhere, tighter drive-box geometry (150px tall, 15px gap, vertically centered column), and a solid-black music-bar EQ on the active state. A change log is at §15.
>
> **What's authoritative.** When this spec, the product spec, and the designer spec disagree on a detail, the source of truth is: **product spec for behavior**, **designer spec for visuals**, **this spec for code structure and types**.
>
> **Prototype source files.** The HTML/React prototype was authored in `Family_Pirate_Ship.html` plus seven sibling files (`data.js`, `ios-frame.jsx`, `tweaks-panel.jsx`, `art.jsx`, `screens-a.jsx`, `screens-b.jsx`, `screens-c.jsx`, `app.jsx`). The prototype is a **visual reference**, not a code reference — match the visual output, not the prototype's internal structure (per the README in the handoff bundle). `ios-frame.jsx` and `tweaks-panel.jsx` are prototype-only chrome (an iPhone-frame wrapper and a designer tweaks panel) and have **no analog in the production build**.

---

## 0. What you're building

A private family web app — Hebrew-first, mobile-first, fully client-side — that tracks who-listens-to-whose-music during car drives. Three "pirates" (Captain Kid, Mama Pirate, Papa Pirate) share music time. The app teaches a 4.5-year-old that *balanced* music time across the family is the goal, not "winning" more. A pirate-ship metaphor: balanced cargo lets the ship sail to new islands; lopsided cargo keeps it in harbor.

**No accounts, no backend, no telemetry.** Pure client-side, localStorage-backed PWA. Should install on a phone home screen and work offline.

**Audience:** the developer building this is Claude Code, working agentically. Phases below are designed to produce a working app at each milestone.

---

## 1. Tech Stack (decided — don't deviate without good reason)

| Concern | Choice | Why |
|---|---|---|
| Build tool | Vite | Fast dev server, modern defaults, great with Claude Code |
| Framework | React 18 + TypeScript | Standard, well-supported, type-safe |
| Styling | Tailwind CSS + CSS variables for design tokens | Fast iteration, RTL plugin available |
| Animations | Framer Motion | Sequencing, layout animations, spring physics — needed for reveal |
| Routing | React Router v6 | Multi-screen nav |
| State | Zustand + persist middleware | Simpler than Redux, localStorage built-in |
| Persistence | localStorage (via Zustand persist) | Private to device, no infra needed |
| PWA | vite-plugin-pwa | Installable on phone, works offline |
| Audio | HTMLAudioElement directly | No library needed for this scale |
| Icons | Lucide React (generic UI) + custom SVG (pirate-themed) | Lightweight |
| Fonts | **System font stack** — `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif` **[CHANGED v2]** | Snappier render, single typographic voice, reliable Hebrew via SF Hebrew on Apple platforms. The original Heebo / Frank Ruhl Libre / Suez One plan was abandoned during prototyping. |
| Date/time | Native `Date` + `Intl.DateTimeFormat` | No need for date-fns |

**Node version:** 20+. Use `pnpm` if available, else `npm`.

**Bundle size goal:** under 500KB gzipped including all assets except illustrations. Illustrations cached separately by service worker.

---

## 2. Architecture

```
[Browser PWA on phone or desktop]
    │
    └── React SPA (single bundle, client-side routing)
        │
        ├── React Router (screens: home, drive, reveal, map, settings, onboarding)
        ├── Zustand stores (in-memory, persisted to localStorage)
        │   ├── piratesStore — pirate identities
        │   ├── drivesStore — drive history & unlocked islands
        │   └── settingsStore — thresholds, audio, fog
        ├── Components (presentational, behavior-light)
        ├── lib/ (pure functions: balance math, ID generation, audio)
        └── Service worker (via vite-plugin-pwa)
```

No backend. No auth. No analytics. No telemetry.

State flow during a drive:
- `DuringDriveScreen` mounts → starts a 1Hz interval timer
- **No pirate is active when the screen first appears (`activePirateId === null`).** Until the user taps a box, no time accumulates anywhere. **[CHANGED v2 — was "default to first participating pirate"]**
- First tap → swaps the active pirate to that pirate, the timer starts crediting them, and a tap event is recorded
- Subsequent taps → swap the active pirate
- Each tick increments the active pirate's accumulator (no-op if no one is active)
- End-voyage hold → confirms → calls `endDrive()` → balance is calculated → stores write → navigate to reveal screen

---

## 3. Project Structure

```
family-pirate-ship/
├── public/
│   ├── manifest.webmanifest
│   ├── icons/                    # PWA icons (192, 512, maskable)
│   ├── audio/                    # all sound files
│   └── images/                   # illustrations (pirate avatars, ship, islands)
├── src/
│   ├── main.tsx                  # entry, mounts <App>
│   ├── App.tsx                   # router, providers
│   ├── routes.tsx                # route definitions
│   ├── strings/
│   │   └── he.ts                 # all Hebrew strings (single source)
│   ├── store/
│   │   ├── piratesStore.ts       # pirate definitions
│   │   ├── drivesStore.ts        # drives, islands, finds
│   │   └── settingsStore.ts      # tunable settings
│   ├── components/
│   │   ├── PirateButton.tsx      # the during-drive box
│   │   ├── ShipPreview.tsx       # ship + cargo overlay (Spyglass + reveal)
│   │   ├── CargoStack.tsx        # single-crate primitive, tinted [CHANGED v2]
│   │   ├── Crate.tsx             # the one stackable cargo primitive [NEW v2]
│   │   ├── Spyglass.tsx
│   │   ├── StatusBanner.tsx
│   │   ├── WoodPlankButton.tsx
│   │   ├── PirateAvatar.tsx
│   │   ├── FlagBadge.tsx
│   │   ├── MusicBarEQ.tsx        # 4-bar animated EQ; solid black [NEW v2]
│   │   ├── Modal.tsx
│   │   ├── ParchmentCard.tsx
│   │   ├── OceanBackground.tsx
│   │   ├── TreasureMapView.tsx
│   │   └── MapChip.tsx           # small Treasure Map chip on Home [NEW v2]
│   ├── screens/
│   │   ├── OnboardingScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── RollCallScreen.tsx
│   │   ├── DuringDriveScreen.tsx
│   │   ├── RevealScreen.tsx
│   │   ├── TreasureMapScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── lib/
│   │   ├── balance.ts            # the balance math
│   │   ├── islands.ts            # the ~30 island content list
│   │   ├── coastalFinds.ts       # the ~15 coastal find list
│   │   ├── audio.ts              # sound manager
│   │   ├── id.ts                 # ID generation
│   │   └── time.ts               # date/duration formatting
│   ├── types/
│   │   └── index.ts              # all shared TS types
│   ├── hooks/
│   │   ├── useDriveTimer.ts      # the 1Hz timer for active pirate
│   │   └── usePersistedStore.ts  # generic persistence helper
│   └── styles/
│       ├── globals.css           # Tailwind + custom utilities + CSS vars
│       └── tokens.css            # design tokens (see §4a) [NEW v2]
├── index.html                    # has dir="rtl" lang="he"
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

**Removed in v2** (do not create these even if v1 spec mentioned them or you see them as patterns elsewhere):
- `Barrel.tsx`, `Sack.tsx`, `TreasureChest.tsx`, `RopeCoil.tsx` — there is **one** stackable cargo primitive, `Crate.tsx`. Mixed cargo art may exist as decorative scene props, but those are inline SVG inside scene components, not standalone stack primitives.

---

## 4. Data Model (TypeScript types)

```typescript
// src/types/index.ts

export type FlagColor = 'red' | 'green' | 'purple';
export type AvatarKey = 'kid' | 'mom' | 'dad';
export type Tier = 'fair_winds' | 'coastal' | 'harbor' | 'solo';

export interface Pirate {
  id: string;              // 'kid' | 'mom' | 'dad' for V1; later UUIDs
  name: string;            // user-customizable
  avatarKey: AvatarKey;    // selects avatar illustration
  flagColor: FlagColor;
}

export interface DriveParticipant {
  pirateId: string;
  participated: boolean;          // false if sat out at roll-call
  totalSeconds: number;           // accumulated during drive
  totalMinutes: number;           // computed at endDrive (rounded)
  tapEvents: number[];            // timestamps of button taps
}

export interface Drive {
  id: string;
  startedAt: number;              // epoch ms
  endedAt: number;                // epoch ms
  participants: DriveParticipant[];
  biggestShare: number;           // 0.0–1.0
  tier: Tier;
  islandUnlockedId?: string;      // if Fair Winds and a new island was unlocked
  coastalFindId?: string;         // if Coastal
}

export interface Island {
  id: string;                     // stable, e.g. 'coral-cove'
  name: string;                   // default Hebrew name
  customName?: string;            // user-renamed
  illustrationKey: string;        // maps to /images/islands/{key}.svg
  description: string;            // Hebrew, ~1 sentence
  creatureName: string;           // e.g. "the singing turtle"
  unlockedAt?: number;            // epoch ms; absent if not yet unlocked
}

export interface CoastalFind {
  id: string;
  name: string;                   // Hebrew
  illustrationKey: string;
  foundAt?: number;
}

export interface Settings {
  fairWindsThreshold: number;     // default 0.6
  harborThreshold: number;        // default 0.75
  audioEnabled: boolean;
  fogEnabled: boolean;
  minimumDriveMinutes: number;    // default 2
}

// Store shapes:

export interface PiratesStore {
  pirates: Pirate[];              // exactly 3
  isOnboarded: boolean;
  setPirateName: (id: string, name: string) => void;
  setPirateFlagColor: (id: string, color: FlagColor) => void;
  completeOnboarding: () => void;
  resetAll: () => void;
}

export interface DrivesStore {
  drives: Drive[];                // every drive ever, in chronological order
  islands: Island[];              // all 30 islands, with unlockedAt populated when unlocked
  coastalFinds: CoastalFind[];    // all 15 finds, with foundAt populated when found
  currentDrive: Drive | null;     // null when not in a drive
  activePirateId: string | null;  // who's currently accumulating time; null = no one  [CHANGED v2]

  startDrive: (participatingPirateIds: string[]) => void;
  recordTap: (pirateId: string) => void;          // sets active pirate, swaps timer
  tickActivePirate: () => void;                   // called by timer; no-op if activePirateId is null
  endDrive: () => Drive | null;                   // returns null if no taps recorded (drive discarded)
  cancelDrive: () => void;                        // discards current drive

  // computed selectors
  unlockedIslandIds: string[];
  totalDrivesLogged: number;
}

export interface SettingsStore {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  resetToDefaults: () => void;
}
```

**v2 default pirates** (in `piratesStore` initial state):

```typescript
const DEFAULT_PIRATES: Pirate[] = [
  { id: 'kid', name: 'קפטן ילד',     avatarKey: 'kid', flagColor: 'red' },
  { id: 'mom', name: 'אמא־פיראטית',  avatarKey: 'mom', flagColor: 'green' }, // [CHANGED v2: was אמא־פיראטה]
  { id: 'dad', name: 'אבא־פיראט',    avatarKey: 'dad', flagColor: 'purple' },
];
```

---

## 4a. Design tokens **[NEW v2]**

All design tokens live as CSS custom properties in `src/styles/tokens.css`. Tailwind reads them via `theme.extend.colors.*`. The hex values are confirmed against designer spec v2 §2.

```css
:root {
  /* Sea & sky */
  --ocean-deep:   #1E5F7A;
  --ocean-bright: #5FA8C7;
  --ocean-foam:   #C5E0E8;

  /* Sand, deck & paper */
  --sand-warm:    #F0D49B;
  --sand-cream:   #FBF1DC;
  --wood-deep:    #5D3F2A;
  --wood-light:   #A87B5A;   /* default tint base for the Drive-screen pirate boxes */

  /* Treasure accents */
  --treasure-gold: #E5B23A;
  --treasure-red:  #C84B3B;

  /* Pirate flag colors (also used to tint that pirate's cargo crates) */
  --flag-kid: #E63946;       /* red */
  --flag-mom: #2A9D8F;       /* teal-green */
  --flag-dad: #7B4B94;       /* deep purple */

  /* Tier indicators */
  --tier-fair-winds: #F4B942;
  --tier-coastal:    #6B95A0;
  --tier-harbor:     #8C7A6B;

  /* Text & UI */
  --text-primary:    #2A2620;
  --text-secondary:  #5D5249;
  --surface-card:    #FBF1DC;

  /* EQ bar (active state on Drive boxes) */
  --eq-bar-color:    #1a1a1a; /* solid black, not pirate.color [CHANGED v2] */
}

/* System font stack everywhere [CHANGED v2] */
* {
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display",
               system-ui, sans-serif;
}
```

The `*`-with-`!important` font override in the prototype is a side effect of Babel-standalone JSX-in-browser and an artifact of the prototype build — in the production build, just configure the system stack as the default sans on `tailwind.config.js` and apply it on `body`. Don't replicate the `* !important` rule.

---

## 5. Core Algorithms

### 5.1 Balance Calculation

This is the most logic-heavy part of the app. **Add unit tests** (the only place tests are mandatory). Unchanged from v1.

```typescript
// src/lib/balance.ts

import type { DriveParticipant, Tier } from '../types';

export interface BalanceResult {
  biggestShare: number;
  tier: Tier;
  totalMinutes: number;
}

export function calculateBalance(
  participants: DriveParticipant[],
  fairWindsThreshold: number = 0.6,
  harborThreshold: number = 0.75,
  minimumMinutes: number = 2
): BalanceResult {
  // Round each participant's seconds to minutes
  const withMinutes = participants.map(p => ({
    ...p,
    totalMinutes: Math.round(p.totalSeconds / 60),
  }));

  // Filter to those who participated AND have non-zero minutes
  const active = withMinutes.filter(p => p.participated && p.totalMinutes > 0);

  // Edge: no active participants
  if (active.length === 0) {
    return { biggestShare: 0, tier: 'harbor', totalMinutes: 0 };
  }

  // Edge: only one participant has time → solo voyage
  if (active.length === 1) {
    return {
      biggestShare: 1,
      tier: 'solo',
      totalMinutes: active[0].totalMinutes,
    };
  }

  const totalMinutes = active.reduce((sum, p) => sum + p.totalMinutes, 0);

  // Edge: drive too short to count
  if (totalMinutes < minimumMinutes) {
    return { biggestShare: 1, tier: 'harbor', totalMinutes };
  }

  const max = Math.max(...active.map(p => p.totalMinutes));
  const biggestShare = max / totalMinutes;

  let tier: Tier;
  if (biggestShare <= fairWindsThreshold) tier = 'fair_winds';
  else if (biggestShare <= harborThreshold) tier = 'coastal';
  else tier = 'harbor';

  return { biggestShare, tier, totalMinutes };
}
```

**Unit test cases (table-driven):**

| Kid sec | Mom sec | Dad sec | Expected tier | Expected biggest_share |
|---|---|---|---|---|
| 1200 (20m) | 480 (8m) | 420 (7m) | fair_winds | 0.571 |
| 1200 | 900 | 900 | fair_winds | 0.40 |
| 720 | 720 | 720 | fair_winds | 0.333 |
| 1080 (18m) | 420 (7m) | 300 (5m) | fair_winds | 0.60 |
| 1320 (22m) | 300 | 300 | coastal | 0.688 |
| 1500 (25m) | 300 | 300 | coastal | 0.714 |
| 1800 (30m) | 300 | 300 | coastal | 0.75 |
| 1080 (18m) | 180 (3m) | 120 (2m) | harbor | 0.783 |
| 1080 | 60 | 60 | harbor | 0.90 |
| 60 | 0 | 0 | harbor | (under min) |
| 1200 | 0 | 0 | solo | 1.0 |
| 0 | 0 | 0 | harbor | 0.0 |

### 5.2 Drive Timer **[CHANGED v2 — semantics tightened]**

Active-pirate accumulation. The store tracks `activePirateId`. Each 1Hz tick increments that pirate's `totalSeconds`. **If `activePirateId` is `null`, the tick is a no-op** — no one's clock is running until the family taps someone.

```typescript
// src/hooks/useDriveTimer.ts

import { useEffect } from 'react';
import { useDrivesStore } from '../store/drivesStore';

export function useDriveTimer() {
  const tickActivePirate = useDrivesStore(s => s.tickActivePirate);
  const currentDrive = useDrivesStore(s => s.currentDrive);

  useEffect(() => {
    if (!currentDrive) return;

    const interval = setInterval(() => {
      tickActivePirate(); // no-op if activePirateId is null
    }, 1000);

    return () => clearInterval(interval);
  }, [currentDrive, tickActivePirate]);
}
```

**Store implementations** (key parts):

```typescript
// src/store/drivesStore.ts (excerpt)

startDrive: (participatingPirateIds) => set(() => ({
  currentDrive: {
    id: generateId(),
    startedAt: Date.now(),
    endedAt: 0,
    participants: pirates.map(p => ({
      pirateId: p.id,
      participated: participatingPirateIds.includes(p.id),
      totalSeconds: 0,
      totalMinutes: 0,
      tapEvents: [],
    })),
    biggestShare: 0,
    tier: 'harbor',
  },
  activePirateId: null,  // [CHANGED v2 — was "first participating pirate"]
})),

recordTap: (pirateId) => set((state) => {
  if (!state.currentDrive) return state;
  // Only allow tapping participating pirates
  const participant = state.currentDrive.participants.find(p => p.pirateId === pirateId);
  if (!participant?.participated) return state;
  return {
    activePirateId: pirateId,
    currentDrive: {
      ...state.currentDrive,
      participants: state.currentDrive.participants.map(p =>
        p.pirateId === pirateId
          ? { ...p, tapEvents: [...p.tapEvents, Date.now()] }
          : p
      ),
    },
  };
}),

tickActivePirate: () => set((state) => {
  if (!state.currentDrive || state.activePirateId === null) return state;
  return {
    currentDrive: {
      ...state.currentDrive,
      participants: state.currentDrive.participants.map(p =>
        p.pirateId === state.activePirateId
          ? { ...p, totalSeconds: p.totalSeconds + 1 }
          : p
      ),
    },
  };
}),

endDrive: () => {
  const state = get();
  if (!state.currentDrive) return null;

  // Edge: zero taps → don't save the drive
  const anyTaps = state.currentDrive.participants.some(p => p.tapEvents.length > 0);
  if (!anyTaps) {
    set({ currentDrive: null, activePirateId: null });
    return null;
  }

  // Calculate balance, decide unlocks, persist into drives[], islands[], coastalFinds[]
  // (full implementation in the file)
  // ...
},
```

### 5.3 Island Selection

Unchanged from v1. When a Fair Winds drive ends, pick a random not-yet-unlocked island:

```typescript
// src/lib/islands.ts (excerpt)

export function pickIslandToUnlock(
  allIslands: Island[],
  unlockedIslandIds: string[]
): Island | null {
  const locked = allIslands.filter(i => !unlockedIslandIds.includes(i.id));
  if (locked.length === 0) return null; // all unlocked
  return locked[Math.floor(Math.random() * locked.length)];
}
```

Same pattern for `pickCoastalFind`. When all 30 islands are unlocked, Fair Winds drives still complete normally but the reveal screen shows "all islands discovered!" — celebratory but no new content.

### 5.4 Persistence

Zustand `persist` middleware writes to localStorage. Use a versioned schema:

```typescript
persist(
  (set, get) => ({ /* store body */ }),
  {
    name: 'pirate-ship-pirates-v1',
    version: 1,
    migrate: (persistedState, version) => {
      // handle migrations if version changes
      return persistedState;
    },
  }
)
```

Keys: `pirate-ship-pirates-v1`, `pirate-ship-drives-v1`, `pirate-ship-settings-v1`. Don't bump versions for v2 product changes — the data model is unchanged. Bump only if shape changes.

---

## 6. Cargo System **[CHANGED v2 — major]**

### 6.1 Concept

**One stackable cargo primitive: a wooden crate.** It is rendered N times in a vertical column where N = that pirate's listening minutes (capped at ~30 with a "++" indicator). The crate is **tinted** in the pirate's flag color — the same `pirate.flagColor` that drives their flag and their drive-screen box wash.

This replaces the v1 plan of mixed barrel / sack / chest / rope-coil cargo primitives. Reasoning is in product spec v2 — three identical-shape stacks side-by-side are trivially comparable for a 4.5-year-old, where mixed cargo introduces "is the chest worth more than the barrel?" cognitive load.

Mixed cargo art (barrels, chests, ropes) is fine as **decorative scene props** on the dock and reveal scenes — but those are inline SVG inside scene components, not stack primitives, and they don't represent listening time.

### 6.2 `Crate.tsx`

```typescript
// src/components/Crate.tsx
interface CrateProps {
  /** Hex color or CSS variable; tints the crate panels */
  tint: string;
  /** Optional size override; defaults to 32px square */
  size?: number;
}
```

The crate is an SVG with a few panels: top/front face plus a darker shadow strip. The `tint` prop fills the panels at ~70% saturation (or however the SVG is structured — the visual goal is "wooden crate clearly painted in flag-color"). Wood-deep `#5D3F2A` for the outline.

### 6.3 `CargoStack.tsx`

```typescript
// src/components/CargoStack.tsx
interface CargoStackProps {
  /** Listening minutes — number of crates to render */
  count: number;
  /** Pirate's flag color, used as crate tint */
  tint: string;
  /** Cap; renders "++" indicator if count > cap. Default 30 */
  cap?: number;
  /** Animate crates appearing one by one on first render. Default false. */
  animate?: boolean;
}
```

Renders `min(count, cap)` `<Crate>` components stacked bottom-up. If `count > cap`, render a small "++" badge atop the stack. The stack should always be **bottom-anchored** so visual comparison across pirates is intuitive.

**Critical bug to avoid (from prototype):** when used inside `ShipPreview`, the cargo overlay must share the same coordinate system as the absolute-positioned masts/flags below it. The prototype originally had the cargo overlay as a flexbox inside `<div dir="rtl">`, which reversed cargo column order while the masts kept LTR coordinates — dad's purple stack ended up under the kid's red flag. **Fix:** render the cargo overlay with the same positioning system as the masts (absolute-positioned columns at fixed left/right offsets, or a flex container with `direction: ltr` explicitly set). Test in RTL mode before shipping. See §11 for the test case.

### 6.4 `ShipPreview.tsx`

Reusable across:
- **Spyglass mid-drive peek** (§5.5 product spec)
- **End-of-voyage reveal** (§5.6 product spec, reveal stages 3–4)

API:

```typescript
interface ShipPreviewProps {
  participants: { pirate: Pirate; minutes: number }[];
  /** Optional roll-up of decorative scene props. Default 'spyglass'. */
  variant?: 'spyglass' | 'reveal';
  /** When true, plays the cargo-rise animation on mount */
  animate?: boolean;
}
```

Internal layout: ship in side view, three cargo bays (bow / middle / stern), one `<CargoStack>` per participant, each tinted with `pirate.flagColor`. Three flag posts above, one per bay, in the matching color. The mapping of `participant[i] → bay[i] → flag[i]` must be consistent across renders and not affected by RTL.

---

## 7. Implementation Phases

Each phase produces a working app. Test at each milestone.

### Phase 0 — Project setup (~30 min)

**Tasks:**
- `pnpm create vite . --template react-ts`
- Install: `react-router-dom`, `zustand`, `framer-motion`, `tailwindcss`, `lucide-react`, `tailwindcss-rtl` (or hand-roll RTL utilities)
- Install `vite-plugin-pwa`
- Configure Tailwind with the color tokens from §4a (read CSS vars via `theme.extend.colors`)
- Configure system-font sans as the default in `tailwind.config.js`
- Create `src/styles/tokens.css` with all CSS custom properties
- Set up `index.html` with `<html dir="rtl" lang="he">`. **No Google Fonts links.** **[CHANGED v2]**
- Create empty stub files for all screens, components, types, stores, lib
- Set up React Router with all routes pointing to placeholder components
- Initialize empty Zustand stores with persist middleware

**Success criteria:** App runs (`pnpm dev`), navigates between blank screens, state persists across reload, RTL layout is active.

### Phase 1 — Core flow, no animations, no real visuals (~3 hours)

Get the entire happy path working with placeholder visuals. This proves the data flow before any visual polish.

**Tasks:**
- **Onboarding:** three text inputs for pirate names, finish button labeled **`🏴‍☠️ הפלגה חדשה`** **[CHANGED v2 — was `אל הנמל!`]** → home
- **Home screen:** primary button "הפלגה חדשה" (→ roll call), secondary button "מפת האוצר" (→ map), and a small **map chip in the top corner** as a second entry to the map **[NEW v2]**, plus the settings cog
- **Roll call:** three toggles for sailing/resting + "מפליגים!" → during drive
- **During drive:** three plain buttons (one per pirate). **No box is selected on entry — `activePirateId` is `null`.** **[CHANGED v2]** Tap to select; tap another to switch. Display the active pirate's name large at top (or "no one is listening" placeholder when `activePirateId === null`). Hidden seconds counter for debugging only. End-voyage button at bottom (with hold + confirm).
- **Balance calc:** implement `lib/balance.ts` with full unit tests
- **Reveal:** plain text screen showing tier verdict and unlocked content. "שמור והתחל" button.
- **Treasure map:** simple list of unlocked islands with names and stats. No map illustration yet.
- **Settings:** form for thresholds, audio toggle, drive history list (raw data).

**Success criteria:** You can complete a full happy-path drive: onboarding → home → roll call → during drive (no auto-active, taps recorded) → end voyage → tier verdict → save → return to home → see drive in history → see unlocked island in treasure map. The "no one tapped during drive" path correctly discards the drive without saving.

### Phase 2 — Visuals & Spyglass (~5–6 hours)

This is where it starts looking like the designer spec.

**Tasks:**
- Implement `OceanBackground`, `WoodPlankButton`, `ParchmentCard`, `Modal` components
- Style the home screen with the harbor scene background; add the `MapChip` in the top corner **[NEW v2]**
- Style the during-drive screen with `PirateButton` components:
  - **Box height: ~150px** **[CHANGED v2 — was 200–250px]**
  - **Three boxes vertically centered as a flex column, gap 15px** **[CHANGED v2]**
  - Default tint: pirate's flag color at ~15% opacity over `--wood-light` base
  - Active state: glowPulse 1.5s, brighter flag-color wash, "מאזין/ה עכשיו" caption (in **black, not pirate color** **[CHANGED v2]**), waving flag, and `MusicBarEQ`
  - **`MusicBarEQ`: four 3px bars in solid `--eq-bar-color` (`#1a1a1a`)** **[CHANGED v2]**, animated with 900ms ease-in-out musicBar keyframes, 110ms stagger
  - Sat-out state: 50% opacity, "נח היום" label, untappable
- Build the `Spyglass` peek with the entry/exit animations (Framer Motion)
- Build `Crate`, `CargoStack` (single primitive, tinted) **[CHANGED v2]**, `ShipPreview` (with shared coord system for cargo + flags), `StatusBanner`
- Implement the reveal animation sequence (Framer Motion timeline):
  - Iris-out transition (~1.5s)
  - Title card splash (~2s)
  - Cargo loading (~5.5s) — pirates walk up gangplank, drop crates onto their bay
  - Pull-back to ship-in-full-view (~2s)
  - Verdict animations (~6s) — sails fill / coastal motor / harbor stay
- Build `TreasureMapView` with hand-drawn map background and tap-to-reveal
- Wire all Hebrew strings through `strings/he.ts` (see §8 for v2 string table)

**Success criteria:** App visually matches the designer spec for all primary screens. Spyglass peek and reveal animations are smooth. Each pirate's cargo column always sits under their own flag, in both LTR and RTL contexts (manually toggle RTL off in dev tools to test).

### Phase 3 — Audio, PWA, polish (~2–3 hours)

**Tasks:**
- Build `lib/audio.ts` with simple play/preload API; respect `audioEnabled` setting
- Add all sound files to `public/audio/` and wire to the right moments
- Configure `vite-plugin-pwa` with the manifest, icons, service worker
- Test PWA install on a real phone (add to home screen)
- Verify offline behavior (toggle airplane mode, app should fully function)
- Edge cases (full list in §11)
- Settings polish: threshold sliders with live preview of "what last drive would have been"
- Implement reset / export buttons

**Success criteria:** App is shippable to family. Installs on a phone home screen, works offline, sounds play, all edge cases handled gracefully.

### Phase 4 (deferred) — V2 features

Out of scope for V1. Architecture supports them:
- Avatar customization UI
- Captain rotation badge
- Today's voyage postcard
- Shared cloud sync (would require a real backend)
- Tablet landscape layouts
- More than 3 pirates / family flexibility
- "Family song" mode (4th button that splits time three ways)

---

## 8. Hebrew & RTL Implementation

**index.html** **[CHANGED v2 — no Google Fonts]**:

```html
<!DOCTYPE html>
<html dir="rtl" lang="he">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>ספינת השודדים המשפחתית</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**RTL exception:** the ship illustration sails left-to-right regardless of UI direction (ships sail LTR intuitively; designer spec v2 §4 confirms). The cargo overlay's coordinate system inside `ShipPreview` should also be LTR (see §6.3 bug fix).

**Tailwind RTL:** Use `tailwindcss-rtl` plugin. Use `ms-*` (margin-inline-start) instead of `ml-*`, `me-*` instead of `mr-*`, etc.

**All Hebrew strings live in `src/strings/he.ts`** as a single object:

```typescript
// src/strings/he.ts
export const he = {
  onboarding: {
    welcome: 'ברוכים הבאים לים שלכם!',
    letsStart: 'בואו נתחיל!',
    crewReady: 'הצוות שלכם מוכן!',
    finish: '🏴‍☠️ הפלגה חדשה',          // [CHANGED v2 — was 'אל הנמל!']
    skip: 'דלג',
    setSailFromOnboarding: 'מפליגים! ⚓',
    pirateRoleKid: 'הקפטן הקטן',
    pirateRoleMom: 'אמא־פיראטית',         // [CHANGED v2 — was 'אמא־פיראטה']
    pirateRoleDad: 'אבא־פיראט',
  },
  home: {
    newVoyage: '🏴‍☠️ הפלגה חדשה',
    treasureMap: '🗺️ מפת האוצר',
    mapChipLabel: '🗺️',                  // [NEW v2 — small chip in top corner]
  },
  rollCall: {
    title: 'מי מפליג היום?',
    sailing: 'מפליג!',
    resting: 'נח',
    setSail: '⚓ מפליגים!',
    nobodySailing: 'אף אחד לא מפליג? בלתי אפשרי!',
  },
  duringDrive: {
    nowPlayingIcon: '🎵',
    nowPlayingCaption: 'מאזין/ה עכשיו',   // [NEW v2 — black text on active state]
    restingToday: 'נח היום',
    endVoyage: 'סיום הפלגה',
    endVoyageConfirm: 'לסיים את ההפלגה?',
    yes: 'כן',
    no: 'לא',
    noOneListening: '',                   // intentionally blank — no "no one is listening" UI text in v2
  },
  spyglass: {
    fairWinds: '⛵ רוח גבית, ימאים!',
    coastal: '🌊 הספינה קצת נטויה...',
    harbor: '⚓ אוי, צד אחד כבד מדי!',
  },
  reveal: {
    title: 'סוף ההפלגה!',
    fairWindsBanner: 'אי חדש התגלה!',
    coastalBanner: 'מצאנו משהו על החוף!',
    harborBanner: 'הספינה קצת נטויה היום, ימאים!',
    saveAndContinue: 'שמור והתחל',
    noTapsMessage: 'אף אחד לא בחר שיר היום',
  },
  treasureMap: {
    backToHarbor: 'חזרה לנמל',
    fogHint: 'מה מסתתר שם? הפליגו בהוגנות כדי לגלות!',
    statsDrawerTitle: '📜 Voyage stats',
    totalIslands: 'איים שגילינו',
    coastalFinds: 'מציאות חופיות',
    totalVoyages: 'הפלגות בסך הכל',
  },
  settings: {
    title: 'הגדרות הורים',
    mathGate: 'מהו 7 + 5?',
    fairWindsThreshold: 'סף רוח גבית',
    harborThreshold: 'סף עגינה',
    audio: 'צלילים',
    fog: 'ערפל על המפה',
    driveHistory: 'היסטוריית הפלגות',
    reset: 'איפוס נתונים',
    export: 'ייצוא נתונים',
  },
};
```

---

## 9. Audio Manager

Unchanged from v1. Simple, no library needed:

```typescript
// src/lib/audio.ts

const sounds: Record<string, HTMLAudioElement> = {};

export function preloadSounds(soundList: { key: string; url: string }[]) {
  soundList.forEach(({ key, url }) => {
    const audio = new Audio(url);
    audio.preload = 'auto';
    sounds[key] = audio;
  });
}

export function playSound(key: string, audioEnabled: boolean) {
  if (!audioEnabled) return;
  const audio = sounds[key];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Audio failures are non-fatal (e.g., user hasn't interacted with page yet)
  });
}
```

Sound keys defined in a constant. Wire to: pirate-button tap, spyglass open/close, cargo clunk (now per-crate-drop), fanfare, ukulele, harbor caw, treasure shimmer, ambient harbor (looping).

---

## 10. PWA Configuration

Unchanged from v1 except no font subsets to cache (system fonts only):

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'audio/*.mp3', 'images/*'],
      manifest: {
        name: 'ספינת השודדים המשפחתית',
        short_name: 'שודדים',
        description: 'אפליקציה למעקב אחרי זמן מוזיקה משפחתי בנסיעות',
        lang: 'he',
        dir: 'rtl',
        theme_color: '#1E5F7A',
        background_color: '#FBF1DC',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // No woff2 in glob — system fonts don't need caching
        globPatterns: ['**/*.{js,css,html,svg,png,mp3}'],
      },
    }),
  ],
});
```

---

## 11. Testing Strategy

This is a personal app — formal testing is overkill **except for the balance calculation and a small set of v2-introduced regression risks**.

**Required tests:**

1. **`lib/balance.ts`** — full table-driven tests covering §5.1, plus edge cases (empty participants, all-zero, sub-minute totals, threshold boundaries).

2. **`store/drivesStore.ts` — v2 active-pirate semantics** **[NEW v2]**:
   - On `startDrive`, `activePirateId` is `null`
   - `tickActivePirate` is a no-op when `activePirateId` is `null`
   - `recordTap` for a participating pirate sets `activePirateId` and pushes a tap event
   - `recordTap` for a non-participating pirate is a no-op
   - `endDrive` returns `null` and discards state when no taps were recorded
   - `endDrive` returns the drive and persists when at least one tap was recorded

3. **`components/ShipPreview.tsx` — cargo/flag alignment under RTL** **[NEW v2]** (lightweight component test, e.g. with React Testing Library):
   - Render with three participants (kid red, mom green, dad purple) inside `<div dir="rtl">`
   - Assert that the `data-pirate-id` of each cargo column matches the `data-pirate-id` of the flag directly above it. (Add `data-pirate-id` attributes to the rendered DOM specifically to enable this check.)

**Use Vitest** (Vite's native test runner). One test file per: `src/lib/balance.test.ts`, `src/store/drivesStore.test.ts`, `src/components/ShipPreview.test.tsx`.

Everything else: manual testing on a real phone.

---

## 12. Edge Cases & Failure Modes

Handle gracefully — don't crash. **[Updated for v2]**

| Scenario | Behavior |
|---|---|
| App closed mid-drive | Auto-save current drive state every 10s. On reopen, prompt: "ההפלגה שלא הסתיימה — להמשיך?" |
| **Drive ended with 0 taps [v2 — now an expected state]** | `endDrive` returns `null`, drive is discarded. Show "אף אחד לא בחר שיר היום" toast. With v2's no-auto-active rule, this state is reachable by simply ending without ever tapping. |
| All 30 islands unlocked, drive is Fair Winds | Show celebratory "all discovered!" message, no new island, drive is logged as Fair Winds |
| localStorage full or unavailable | Fall back to in-memory only with a warning toast: "האחסון מלא — הנתונים לא יישמרו" |
| Audio fails to play | Silent failure, no error UI |
| User toggles audio off mid-drive | Currently-playing sounds finish; new sounds don't play |
| Very long drive (hours) | `CargoStack` caps at 30 with "++" indicator. Math still works on full minutes. |
| Two pirates have identical times (tie for max) | `Math.max` returns the value; the formula doesn't care which pirate "owns" the max. UI on reveal shows tied stacks at equal height. |
| Settings: `fairWindsThreshold > harborThreshold` | Prevent in UI: harbor slider's min is fairWinds value. |
| **Fresh drive screen, user hits "End voyage" immediately [v2]** | Hold-to-confirm still required → confirm modal → endDrive returns null → drive discarded → return to home. Same path as "0 taps". |
| **Drive screen RTL flip — cargo column ends up under wrong flag** | Caught by the §11 ShipPreview alignment test. Visual smoke test in dev: open Spyglass mid-drive, confirm kid's red stack is under the red flag. |

---

## 13. What NOT to Build for V1

Don't get pulled into:
- User accounts / auth
- Cloud sync / multi-device
- Avatar customization (use 3 pre-designed avatars)
- Tablet landscape layouts (portrait only)
- Dark mode
- Tutorials / onboarding tooltips beyond the 3 onboarding screens
- More than 3 pirates
- A "today's voyage" postcard or revisit screen
- User-created islands or treasures
- Captain rotation badge
- Analytics / telemetry
- Internationalization beyond Hebrew (V1 is Hebrew-only)
- A backend of any kind
- **Mixed cargo primitives** (barrels/sacks/chests as stack items) **[CHANGED v2 — these were in v1's plan, now explicitly out]**
- **Custom font loading** (Google Fonts, woff2, etc.) **[CHANGED v2 — system fonts only]**
- **The iPhone-frame chrome and tweaks-panel** from the prototype (`ios-frame.jsx`, `tweaks-panel.jsx`) — those are prototype-only artifacts

---

## 14. Recommended Build Order for Claude Code

If you're handing this whole spec to Claude Code, suggest tackling in this order:

1. Phase 0 (setup), then verify it runs.
2. **`lib/balance.ts` + tests first.** Pin down the most important business logic before any UI.
3. **`store/drivesStore.ts` + the v2 active-pirate semantics tests.** **[v2]** This pins down the second-most-important piece of logic — the active-pirate state machine — before any UI.
4. Phase 1 (functional happy path with placeholder visuals).
5. **Pause and manually test the happy path end-to-end** before adding visuals. Confirm:
   - Drive starts with no pirate active
   - Tapping each pirate switches the active state and accumulates correctly
   - Ending a drive with 0 taps does NOT save
   - Ending a normal drive saves and unlocks the right tier of content
6. Phase 2 (visuals + animations). **Build `Crate` → `CargoStack` → `ShipPreview` in that order**, with the alignment test gate on `ShipPreview` before moving on.
7. Phase 3 (audio + PWA + polish).

Don't build screens out of order. Build the during-drive screen + reveal logic first within Phase 1; those are the heart of the app and validate the data flow. Treasure map can come last in Phase 1 since it just reads from the drives store.

---

## 15. Change log — v1 → v2

Tracked here so a future developer can read the original v1 dev spec alongside this and reconcile diffs in one place.

**Behavior:**
- `activePirateId` initial value changed from "first participating pirate" to **`null`**. `tickActivePirate` is a no-op when null. The drive screen shows no glowing box on entry. First tap selects.
- `endDrive()` now returns `Drive | null`. Returns `null` and discards state when zero taps occurred during the drive — a now-expected outcome under the no-auto-active rule.
- New regression tests in `drivesStore.test.ts` cover the active-pirate state machine (§11).

**Cargo system:**
- Replaced the v1 mix of cargo primitives (barrels, sacks, chests, ropes) with **a single `Crate` primitive, tinted per pirate flag color**. New components: `Crate.tsx`. Modified components: `CargoStack.tsx` (now takes `tint`, renders crates only). Removed: `Barrel.tsx`, `Sack.tsx`, `TreasureChest.tsx`, `RopeCoil.tsx` if they had been scaffolded.
- New regression test: `ShipPreview.test.tsx` asserts cargo columns align with their flags under `dir="rtl"`. The prototype had a real bug here (RTL flexbox flow misaligned cargo with masts) — this test gates the rebuild against the same regression.

**Home screen:**
- Added `MapChip.tsx` — a small map chip in the top corner of the home screen, second entry-point to the Treasure Map.

**Drive screen visuals:**
- Box height ~150px (was 200–250px).
- Three boxes are vertically centered as a flex column, gap 15px (was ~12px).
- Active state's music-bar EQ is solid black (`#1a1a1a`) — new `MusicBarEQ.tsx` component, tied to a CSS var `--eq-bar-color`.
- Active state's "מאזין/ה עכשיו" caption is black, not pirate.color.

**Typography:**
- System font stack (`-apple-system, …, system-ui, sans-serif`) replaces the Heebo / Frank Ruhl Libre / Suez One plan. Display vs. body distinction is by size and weight only.
- `index.html` no longer loads Google Fonts.
- PWA workbox no longer caches woff2.

**Hebrew strings:**
- `אמא־פיראטה` → **`אמא־פיראטית`** (correct grammatical gender). Updated in `DEFAULT_PIRATES` and onboarding.
- Onboarding finish button: `אל הנמל!` → **`🏴‍☠️ הפלגה חדשה`**.
- New string: `duringDrive.nowPlayingCaption` = `מאזין/ה עכשיו`.
- New string: `home.mapChipLabel` for the new home-screen map chip.
- New string: `reveal.noTapsMessage` for the discarded-drive toast.

**Spec hygiene:**
- Added §4a "Design tokens" with confirmed hex values (was scattered across v1 in prose).
- Added §6 "Cargo System" as a dedicated section (was inlined in component descriptions in v1).
- Updated §11 "Testing Strategy" with two new required test files (drivesStore, ShipPreview).
- Updated §13 "What NOT to Build" to explicitly exclude mixed cargo, custom fonts, and prototype chrome.

---

## 16. Definition of Done (V1)

The app is V1-complete when:

- [ ] Three pirates are named via onboarding (with v2 default names), persisted across reloads
- [ ] A drive can be started; **the drive screen shows no auto-glowing pirate on entry [v2]**
- [ ] Tapping a pirate switches the active state and accumulates time correctly
- [ ] Ending a drive with zero taps discards the drive without saving and shows the friendly toast **[v2]**
- [ ] Balance math passes all unit test cases in §5.1
- [ ] Reveal animation plays for all three tiers (Fair Winds, Coastal, Harbor)
- [ ] Spyglass mid-drive peek shows current cargo state and tier banner
- [ ] **All cargo stacks render as a single crate primitive tinted in the matching pirate's flag color [v2]**
- [ ] **Each cargo column sits directly under its own pirate's flag, in both LTR and RTL contexts [v2]**
- [ ] Treasure map shows unlocked islands with detail cards
- [ ] **Treasure map can be reached from both the secondary button and the map chip on the home screen [v2]**
- [ ] Drive history is viewable in settings
- [ ] Threshold settings are adjustable and immediately effective
- [ ] All Hebrew strings render correctly in RTL layout (with v2 copy fixes — `אמא־פיראטית`, `הפלגה חדשה`)
- [ ] Active-state music-bar EQ is solid black and visible against all three flag tints **[v2]**
- [ ] App installs on iOS and Android via "Add to Home Screen"
- [ ] App functions fully offline once installed
- [ ] All sounds play (when audio is on); muting works
- [ ] No console errors during a normal happy-path session
- [ ] Manual test: complete 5 different drives (different balance shapes) and verify tier outcomes match expectations
