# Family Pirate Ship — Developer Spec v1

A full-stack technical spec for building V1 of the Family Pirate Ship app. Written to be fed into Claude Code for agentic development. Self-contained: behavior rules, types, file structure, algorithms, and a phased build plan are all here.

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
| Styling | Tailwind CSS | Fast iteration, RTL plugin available |
| Animations | Framer Motion | Sequencing, layout animations, spring physics — needed for reveal |
| Routing | React Router v6 | Multi-screen nav |
| State | Zustand + persist middleware | Simpler than Redux, localStorage built-in |
| Persistence | localStorage (via Zustand persist) | Private to device, no infra needed |
| PWA | vite-plugin-pwa | Installable on phone, works offline |
| Audio | HTMLAudioElement directly | No library needed for this scale |
| Icons | Lucide React (generic UI) + custom SVG (pirate-themed) | Lightweight |
| Fonts | Google Fonts: Heebo (body), Frank Ruhl Libre (display) | Free, excellent Hebrew support |
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
- `DuringDriveScreen` mounts → starts an interval timer (1Hz)
- Each tick increments the active pirate's accumulator
- Pirate-button tap → swaps the active pirate, records a tap event
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
│   │   ├── PirateButton.tsx
│   │   ├── ShipPreview.tsx
│   │   ├── CargoStack.tsx
│   │   ├── Spyglass.tsx
│   │   ├── StatusBanner.tsx
│   │   ├── WoodPlankButton.tsx
│   │   ├── Avatar.tsx
│   │   ├── FlagBadge.tsx
│   │   ├── Modal.tsx
│   │   ├── ParchmentCard.tsx
│   │   ├── OceanBackground.tsx
│   │   └── TreasureMapView.tsx
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
│       └── globals.css           # Tailwind + custom utilities
├── index.html                    # has dir="rtl" lang="he"
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

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
  
  startDrive: (participatingPirateIds: string[]) => void;
  recordTap: (pirateId: string) => void;          // changes which pirate is "active"
  tickActivePirate: () => void;                   // called by timer, +1 second
  endDrive: () => Drive;                          // computes balance, persists, returns drive
  cancelDrive: () => void;                        // discards current drive
  
  unlockedIslandIds: string[];                    // computed from islands
  totalDrivesLogged: number;                      // computed
}

export interface SettingsStore {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  resetToDefaults: () => void;
}
```

---

## 5. Core Algorithms

### 5.1 Balance Calculation

This is the most logic-heavy part of the app. **Add unit tests** (the only place tests are mandatory).

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

### 5.2 Drive Timer

Active-pirate accumulation logic. Encapsulated in a custom hook.

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
      tickActivePirate();
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentDrive, tickActivePirate]);
}
```

The store tracks which pirate is "active" — initially the first one in roll-call order. Each tick increments that pirate's `totalSeconds`. A `recordTap(pirateId)` call swaps which pirate is active (and pushes a timestamp to `tapEvents`).

If no pirate has been tapped yet at drive start, default to active = the first participating pirate so the timer doesn't lose data.

### 5.3 Island Selection

When a Fair Winds drive ends, pick a random island from the not-yet-unlocked list:

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

Same pattern for `pickCoastalFind`.

When all 30 islands are unlocked, Fair Winds drives still complete normally but the reveal screen shows "all islands discovered!" — celebratory but no new content.

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

Keys: `pirate-ship-pirates-v1`, `pirate-ship-drives-v1`, `pirate-ship-settings-v1`.

---

## 6. Implementation Phases

Each phase produces a working app. Test at each milestone.

### Phase 0 — Project setup (~30 min)

**Tasks:**
- `pnpm create vite . --template react-ts`
- Install: `react-router-dom`, `zustand`, `framer-motion`, `tailwindcss`, `lucide-react`
- Install vite-plugin-pwa
- Configure Tailwind with the color tokens from designer spec
- Set up index.html with `<html dir="rtl" lang="he">`
- Load Heebo + Frank Ruhl Libre from Google Fonts
- Create empty stub files for all screens, components, types, stores, lib
- Set up React Router with all routes pointing to placeholder components
- Initialize empty Zustand stores with persist middleware

**Success criteria:** App runs (`pnpm dev`), navigates between blank screens, state persists across reload, RTL layout is active.

### Phase 1 — Core flow, no animations, no real visuals (~3 hours)

Get the entire happy path working with placeholder visuals (text + minimal CSS). This proves the data flow before any visual polish.

**Tasks:**
- **Onboarding:** three text inputs for pirate names, "Set sail!" button → home
- **Home screen:** two buttons — "New voyage" (→ roll call), "Treasure map" (→ map)
- **Roll call:** three toggles for sailing/resting + "Set sail!" → during drive
- **During drive:** three plain buttons (one per pirate), tap to switch active. Display the active pirate's name large at top. Hidden seconds counter for debugging only. End voyage button at bottom (with hold + confirm).
- **Balance calc:** implement `lib/balance.ts` with full unit tests
- **Reveal:** plain text screen showing "Tier: Fair Winds! New island: [Name]" or similar. "Save & done" button.
- **Treasure map:** simple list of unlocked islands with names and stats. No map illustration yet.
- **Settings:** form for thresholds, audio toggle, drive history list (raw data).

**Success criteria:** You can complete a full happy-path drive: onboarding → home → roll call → during drive (taps recorded) → end voyage → tier verdict → save → return to home → see drive in history → see unlocked island in treasure map.

### Phase 2 — Visuals & Spyglass (~5–6 hours)

This is where it starts looking like the designer spec.

**Tasks:**
- Implement `OceanBackground`, `WoodPlankButton`, `ParchmentCard`, `Modal` components
- Style the home screen with the harbor scene background (use the asset)
- Style the during-drive screen with `PirateButton` components — full glow, pulse, sat-out states
- Build the `Spyglass` peek with the entry/exit animations (Framer Motion)
- Build `ShipPreview`, `CargoStack`, `StatusBanner` components
- Implement the reveal animation sequence (Framer Motion timeline):
  - Iris-out transition
  - Title card splash
  - Pirate walk-up animations (use simple sprite sheet or just sliding avatars with cargo barrels appearing)
  - Verdict animations (sails fill, ship sails, fog rolls back / coastal motor / harbor stay)
- Build `TreasureMapView` with hand-drawn map background and tap-to-reveal
- Wire all Hebrew strings through `strings/he.ts`
- Configure font loading

**Success criteria:** App visually matches the designer spec for all primary screens. Spyglass peek and reveal animations are smooth and theatrical.

### Phase 3 — Audio, PWA, polish (~2–3 hours)

**Tasks:**
- Build `lib/audio.ts` with simple play/preload API; respect audioEnabled setting
- Add all sound files to `public/audio/` and wire to the right moments
- Configure `vite-plugin-pwa` with the manifest, icons, service worker
- Test PWA install on a real phone (add to home screen)
- Verify offline behavior (toggle airplane mode, app should fully function)
- Edge cases:
  - Crash mid-drive → auto-save state every 10 seconds, recover on reopen
  - Drive ended with zero taps → friendly "no songs claimed" message, don't save
  - Very long drives → cap cargo visual at a reasonable max with "++"
- Settings polish: threshold sliders with live preview of "what last drive would have been"
- Implement reset / export buttons

**Success criteria:** App is shippable to family. Installs on a phone home screen, works offline, sounds play, all edge cases handled gracefully.

### Phase 4 (deferred) — V2 features

Out of scope for V1 but worth knowing the architecture supports them:
- Avatar customization UI
- Captain rotation badge
- Today's voyage postcard
- Shared cloud sync (would require a real backend)
- Tablet landscape layouts
- More than 3 pirates / family flexibility

---

## 7. Hebrew & RTL Implementation

**index.html:**
```html
<!DOCTYPE html>
<html dir="rtl" lang="he">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700&family=Frank+Ruhl+Libre:wght@500;700&display=swap" rel="stylesheet" />
    <title>ספינת השודדים המשפחתית</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Tailwind RTL:** Tailwind v3 supports logical properties via the `tailwindcss-rtl` plugin. Use `ms-*` (margin-inline-start) instead of `ml-*`, `me-*` instead of `mr-*`, etc. Or write a simple wrapper that picks the right direction.

**All Hebrew strings live in `src/strings/he.ts`** as a single object. This makes review by a native speaker easy.

```typescript
// src/strings/he.ts
export const he = {
  onboarding: {
    welcome: 'ברוכים הבאים לים שלכם!',
    letsStart: 'בואו נתחיל!',
    crewReady: 'הצוות שלכם מוכן!',
    toHarbor: 'אל הנמל!',
  },
  home: {
    newVoyage: 'הפלגה חדשה',
    treasureMap: 'מפת האוצר',
  },
  rollCall: {
    title: 'מי מפליג היום?',
    sailing: 'מפליג!',
    resting: 'נח',
    setSail: 'מפליגים!',
    nobodySailing: 'אף אחד לא מפליג? בלתי אפשרי!',
  },
  duringDrive: {
    nowPlaying: '🎵',
    restingToday: 'נח היום',
    endVoyage: 'סיום הפלגה',
    endVoyageConfirm: 'לסיים את ההפלגה?',
    yes: 'כן',
    no: 'לא',
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
  },
  treasureMap: {
    backToHarbor: 'חזרה לנמל',
    fogHint: 'מה מסתתר שם? הפליגו בהוגנות כדי לגלות!',
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

## 8. Audio Manager

Simple, no library needed:

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

Sound keys defined in a constant. Wire to: pirate-button tap, spyglass open/close, cargo clunk, fanfare, ukulele, harbor caw, treasure shimmer, ambient harbor (looping).

---

## 9. PWA Configuration

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
        globPatterns: ['**/*.{js,css,html,svg,png,mp3,woff2}'],
      },
    }),
  ],
});
```

---

## 10. Testing Strategy

This is a personal app — formal testing is overkill **except for the balance calculation**. That math is the core of the lesson; bugs there silently break the experience.

**Required tests:**
- `lib/balance.ts` — full table-driven tests covering the cases in section 5.1, plus edge cases (empty participants, all-zero, sub-minute totals, threshold boundaries)

**Use Vitest** (Vite's native test runner). One test file: `src/lib/balance.test.ts`.

Everything else: manual testing on a real phone.

---

## 11. Edge Cases & Failure Modes

Handle gracefully — don't crash:

| Scenario | Behavior |
|---|---|
| App closed mid-drive | Auto-save current drive state every 10s. On reopen, prompt: "ההפלגה שלא הסתיימה — להמשיך?" (Continue the unfinished voyage?) |
| Drive ended with 0 taps | Show "אף אחד לא בחר שיר היום" (No one picked a song), don't save the drive |
| All 30 islands unlocked, drive is Fair Winds | Show celebratory "all discovered!" message, no new island, drive is logged as Fair Winds |
| localStorage full or unavailable | Fall back to in-memory only with a warning toast: "האחסון מלא — הנתונים לא יישמרו" (Storage full — data won't persist) |
| Audio fails to play | Silent failure, no error UI |
| User toggles audio off mid-drive | Currently-playing sounds finish; new sounds don't play |
| Very long drive (hours) | Cap cargo visual at ~30 items with "++" indicator. Math still works on full minutes. |
| Two pirates have identical times (tie for max) | `Math.max` returns the value; the formula doesn't care which pirate "owns" the max. UI on reveal shows both stacks at equal height. |
| Settings: fairWindsThreshold > harborThreshold | Prevent in UI: harbor slider's min is fairWinds value. |

---

## 12. What NOT to Build for V1

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

---

## 13. Recommended Build Order for Claude Code

If you're handing this whole spec to Claude Code, suggest tackling in this order:

1. Phase 0 (setup), then verify it runs.
2. **`lib/balance.ts` + tests first.** This pins down the most important business logic before any UI is built. Tests should pass against the table in 5.1.
3. Phase 1 (functional happy path with placeholder visuals).
4. **Pause and manually test the happy path end-to-end** before adding visuals. Confirm islands unlock correctly, history persists, tiers compute right.
5. Phase 2 (visuals + animations).
6. Phase 3 (audio + PWA + polish).

Don't build screens out of order. Build the during-drive screen + reveal logic first within Phase 1; those are the heart of the app and validate the data flow. Treasure map can come last in Phase 1 since it just reads from the drives store.

---

## 14. Definition of Done (V1)

The app is V1-complete when:

- [ ] Three pirates are named via onboarding, persisted across reloads
- [ ] A drive can be started, paused via pirate tapping, ended with a tier verdict
- [ ] Balance math passes all unit test cases in 5.1
- [ ] Reveal animation plays for all three tiers (Fair Winds, Coastal, Harbor)
- [ ] Spyglass mid-drive peek shows current cargo state and tier banner
- [ ] Treasure map shows unlocked islands with detail cards
- [ ] Drive history is viewable in settings
- [ ] Threshold settings are adjustable and immediately effective
- [ ] All Hebrew strings render correctly in RTL layout
- [ ] App installs on iOS and Android via "Add to Home Screen"
- [ ] App functions fully offline once installed
- [ ] All sounds play (when audio is on); muting works
- [ ] No console errors during a normal happy-path session
- [ ] Manual test: complete 5 different drives (different balance shapes) and verify tier outcomes match expectations
