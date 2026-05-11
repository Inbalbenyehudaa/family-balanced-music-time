# Family Pirate Ship — Content Changes Mini Spec v1

A scope-limiting change to two content lists: **Coastal Findings** (reduced to 8) and **Fair Winds Islands** (reduced to 15, with a simplified data model). Hand this file to Claude Code for implementation. 
---

## Part A — Coastal Findings

### A.1 What changes

**Old behaviour:** Coastal findings defines 15 coastal find items. Coastal-tier drives randomly select one not-yet-found item.

**New behaviour:** Coastal findings defines **exactly 8** coastal find items (listed below). Random selection logic unchanged — just operates over a smaller pool.

**Doc updates** — anywhere "~15 coastal finds" appears in specs or comments, change to "8 coastal finds":

### A.2 The 8 final coastal findings

| # | ID | Hebrew name |
|---|---|---|
| 1 | `bottle-message` | בקבוק עם פתק |
| 2 | `brass-key` | מפתח נחושת |
| 3 | `rubber-duck` | ברווז גומי |
| 4 | `lonely-sock` | גרב בודד |
| 5 | `music-box` | תיבת נגינה קטנה |
| 6 | `clothes-peg` | אטב כביסה |
| 7 | `judo-belt` | חגורת ג׳ודו |
| 8 | `long-stick` | מקל עץ ארוך |

Items 1–5 already existed in the old 15-item list and are kept. Items 6, 7, 8 are **new** additions. All other previously-existing finds (`friendly-gull`, `drifting-hat`, `mystery-crate`, `leaping-fish`, `seaweed-snail`, `rolled-scroll`, `coin-purse`, `single-boot`, `mini-telescope`, `paper-boat`) are **dropped**.

### A.3 Implementation notes

- Update the application and data model to export exactly these 8 items with the IDs in the table above.
- Asset filenames: `/Users/inbalbenyehudam/Private/family-pirate-ship/Images/coastal-findings/{id}.png` — matching the `id` field from the table above.
- Selection logic in `pickCoastalFind` is unchanged.
- **Migration:** if a user's localStorage already has `foundAt` timestamps for old IDs that no longer exist, handle gracefully — drop unknown IDs from the persisted `coastalFinds` array on load, don't crash. Bump the drives-store persist version.
- Update the spec docs (§A.1 above) so the "~15" count no longer appears.

---

## Part B — Fair Winds Islands

### B.1 What changes

**Old behaviour:**
- `lib/islands.ts` defines ~30 islands.
- Each island has: `id`, `name`, `customName?`, `illustrationKey`, `description`, **`creatureName`**, `unlockedAt?`.
- Reveal screen showed island name + creature name.
- Treasure map detail card showed name, day discovered, **creature**, drive stats.

**New behaviour:**
- `lib/islands.ts` defines **exactly 15 islands** (listed below).
- The `creatureName` field is **removed from the data model and UI** everywhere.
- **Reveal screen** shows the **island name only**.
- **Treasure map detail card** shows the **island name + description** (description is new on the detail card; previously it was unused there). Day discovered and drive stats remain.

**Doc updates** — anywhere "~30 islands" appears, change to "15 islands":
- `family_pirate_ship_developer_spec.md` §3 ("the ~30 island content list")
- `family_pirate_ship_spec.md` ("Islands (~30+)")
- `family_pirate_ship_designer_spec_v2.md` §8 ("the 30 islands")
- **Landmark milestones** in `family_pirate_ship_spec.md` currently reference 5/10/20/30 — rescale to **5 / 10 / 15**, with the final whirlpool/secret reveal at 15.
- **All-islands-unlocked celebration** now triggers at 15 (not 30). Wording unchanged.

### B.2 Updated data model

```typescript
// src/types/index.ts — replace existing Island interface

export interface Island {
  id: string;              // stable English kebab-case, e.g. 'pasta-strait'
  name: string;            // default Hebrew display name
  customName?: string;     // user-renamed (optional)
  description: string;     // Hebrew, one short sentence — shown on map detail card
  illustrationKey: string; // maps to /images/islands/{key}.svg|png — equals id for V1
  unlockedAt?: number;     // epoch ms; absent if not yet unlocked
  // creatureName REMOVED
}
```

`illustrationKey` should equal `id` for V1 (keep it as a separate property so a future variant could differ).

### B.3 The 15 islands

| # | ID | Hebrew name (display) | Hebrew description |
|---|---|---|---|
| 1 | `pasta-strait` | מצר הפסטה | מדוזות עם זרועות ארוכות כמו ספגטי חיות בו |
| 2 | `candy-island` | האי המתוק | עצי דקל שמלאים סוכריות |
| 3 | `cocoa-beach` | חוף השוקו | החוף שבו אדון שוקו אוהב לבקר חבר שלו |
| 4 | `library-island` | אי הספרייה | מלא בינשופים שקוראים בו את כל הספרים |
| 5 | `itamars-dreams` | אי החלומות של איתמר | איתמר מטפס בו על הקירות ופוגש שדים כחולים |
| 6 | `pancake-point` | קצה הפנקייק | דובים ישנים על מגדלי סלעים שנראים כמו פנקייקים בערימה |
| 7 | `origami-island` | אי האוריגמי | ציפורים מקופלות מנייר מתעופפות שם |
| 8 | `adventure-bay` | מפרץ ההרפתקאות | יחידת חילוץ (paw patrol) מבלה שם |
| 9 | `kinder-egg-island` | אי ביצי הקינדר | ביצי קינדר שוקולד ענקיות מונחות שם על החוף |
| 10 | `red-click-bay` | מפרץ הקליק האדום | שוקולד קליק אדום גדל שם על השיחים |
| 11 | `glow-lagoon` | לגונת האור | דגים מאירים שם את הלילה |
| 12 | `pea-island` | אי האפונה | אי שמלא בצמחים מטפסים של אפונה |
| 13 | `bubble-bay` | מפרץ הבועות | צפרדעים שמרחפים בתוך בועות סבון ענקיות |
| 14 | `croissant-bay` | מפרץ הקוראסון | אופה שמחלק קוראסון שוקולד טעים לילדים |
| 15 | `bamba-pool` | בריכת הבמבה | דובים יושבים בתוך בריכה של חטיפי במבה אוסם |

### B.4 Implementation notes

- Update `src/lib/islands.ts` to export exactly these 15 islands with the IDs, names, and descriptions above.
- Remove `creatureName` from:
  - The `Island` interface in `src/types/index.ts`
  - The islands data array
  - **Reveal screen** (`RevealScreen.tsx`) — show island **name only** on Fair Winds verdict (no creature line).
  - **Treasure map detail card** (`TreasureMapView.tsx` / inside `TreasureMapScreen.tsx`) — show **name + description**, plus the existing day-discovered and drive stats. The description is the Hebrew one-liner from the table above.
- `pickIslandToUnlock` selection logic is unchanged — just operates over 15 items.
- **Migration:** any user with persisted `islands` in localStorage from a previous build may have `unlockedAt` timestamps on island IDs that no longer exist. On load, drop unknown IDs gracefully and merge in any new IDs as `unlockedAt: undefined`. Bump the drives-store persist version.
- Update asset folder `/public/images/islands/` to contain exactly `{id}.svg` (or `.png`) for the 15 IDs above.
- Update `landmark_milestones` thresholds to **5 / 10 / 15**.
- Update the all-islands-unlocked celebration trigger to 15.

---

## Part C — Out of scope

- No changes to balance math, tier thresholds, or selection randomness.
- No changes to the reveal animation timing — coastal find / island appears exactly as before, just from a smaller pool.
- No changes to renaming / `customName` flow — still supported for islands.
- No changes to the treasure map's fog / zoom / pan behaviour.
- No changes to pirate identities, Drive screen, Spyglass, Settings, or any other screen.

---

## Part D — Recommended order of work

1. Update types (`src/types/index.ts`) — remove `creatureName`.
2. Replace `src/lib/coastalFinds.ts` and `src/lib/islands.ts` with the new content.
3. Add the localStorage migration to the drives store (drop unknown IDs, merge new ones) and bump persist version.
4. Update `RevealScreen.tsx` — drop creature line.
5. Update treasure map detail card — show description, drop creature.
6. Update doc files (counts, milestones).
7. Wait for creative agent to deliver the 8 + 15 = **23 illustrations**, drop them in `/public/images/coastal-finds/` and `/public/images/islands/`.
8. Manual end-to-end test: run a Fair Winds drive → verify reveal shows name only → verify map detail card shows name + description.
