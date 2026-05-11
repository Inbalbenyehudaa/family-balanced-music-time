# Family Pirate Ship — Microcopy Review

**For:** Content UX Writer  
**Purpose:** Full inventory of every user-facing string in the app. Review for tone, clarity, and consistency, then return with tracked edits for code correction.  
**App language:** Hebrew (RTL). All copy is in Hebrew unless noted.  
**How to use this doc:** Each section = one screen. Each table row = one string. The "Source" column links to the exact file and line so edits can be applied directly to code.

---

## Product Overview

Family Pirate Ship is a family screen-time balancing app with a pirate adventure theme. Parents set it up; children interact with it during car rides or device sessions. The core loop:

1. A parent starts a "voyage" (הפלגה) — a listening/screen-time session.
2. Each family member (pirate) gets their share of time.
3. At the end, the app reveals how balanced the session was: perfectly fair earns a new island on the treasure map; moderately unbalanced finds a coastal treasure; very unbalanced returns to port.
4. Over time, the family unlocks a treasure map of 30 islands.

**Three balance tiers:**
- **Fair (רוח גבית)** — balanced listening, new island unlocked
- **Coastal (מציאת חוף)** — slightly unbalanced, coastal find reward
- **Harbor (נמל)** — very unbalanced, no reward

---

## Conventions

| Term used in this doc | Meaning |
|---|---|
| **Heading** | `<h1>`, `<h2>`, `<h3>` |
| **Body text** | `<p>` or plain `<div>` text |
| **Button** | `<button>` or `<PlankButton>` CTA |
| **Label** | Small descriptor text next to a UI control |
| **Badge / chip** | Small inline tag |
| **Inline explainer** | Expandable text block |
| **Toast / confirmation** | Transient feedback message |
| **Placeholder** | Input field placeholder text |
| **Error message** | Validation or system error text |
| **Aria-label** | Accessibility label (screen reader only, not visible) |
| **Map label** | Decorative text on the treasure map |

---

## Screen 1 — Sign In

**Route:** `/`  
**Who sees it:** Any unauthenticated user arriving at the app.  
**What it does:** Shows the app's pirate ship illustration, the app name, a tagline, and a single "Sign in with Google" action. An expandable inline explainer lets curious users understand the data model before signing up.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `ספינת המוזיקה המשפחתית` | Default | Heading (h1) | App name / identity. The only place the full product name appears. | `src/screens/SignIn.tsx:56` |
| 2 | `זמן האזנה שווה לכל המשפחה` | Default | Body text (tagline) | One-line value proposition below the app name. | `src/screens/SignIn.tsx:59` |
| 3 | `כניסה עם Google` | Default (idle) | Button (primary CTA) | Initiates Google OAuth sign-in flow. | `src/screens/SignIn.tsx:63` |
| 4 | `...מתחבר` | Loading (after tap) | Button (primary CTA) | Replaces button label while OAuth is in progress. | `src/screens/SignIn.tsx:63` |
| 5 | `מה זה אומר?` | Default | Text link | Toggles the inline privacy/data explainer open or closed. | `src/screens/SignIn.tsx:76` |
| 6 | `ההרשמה עם Google יוצרת חשבון משפחתי משותף. אנחנו שומרים רק את המידע שנחוץ להפעלת האפליקציה: שמות הפיראטים, הפלגות, ואיים שהתגלו. אין פרסומות, אין סטטיסטיקות בין-משפחתיות, ואפשר למחוק הכל בכל רגע מההגדרות.` | Explainer open | Inline explainer block | Full privacy disclosure shown when user taps the "מה זה אומר?" link. | `src/screens/SignIn.tsx:81–85` |
| 7 | *(dynamic error string from OAuth)* | Error state | Error banner | Shown if Google sign-in throws. Content comes from the caught Error object — not a fixed string. **Note for writer:** this string is not editable here; it surfaces raw JS/network errors. Consider whether a fallback human-readable message is needed. | `src/screens/SignIn.tsx:68` |
| 8 | `Settings` | Default | Aria-label (not visible) | Accessibility label for the compass/settings icon button. | *(Not on this screen — see Home)* |

---

## Screen 2 — Family Naming

**Route:** `/onboarding/family`  
**Who sees it:** New users immediately after first sign-in (before onboarding).  
**What it does:** Asks the family for their name, which is used on invitation screens. Children never see this name.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `איך קוראים למשפחה שלכם?` | Default | Heading (h2) | Main prompt asking for the family name. | `src/screens/FamilyNaming.tsx:87` |
| 2 | `השם יופיע בהזמנות שתשלחו לבן/בת הזוג. הילדים לא רואים אותו.` | Default | Body text (sub-label) | Explains scope of the name — reassures parents that kids won't see it. | `src/screens/FamilyNaming.tsx:90` |
| 3 | `שם המשפחה` | Default | Input placeholder | Placeholder in the family name text input. Disappears when user types. | `src/screens/FamilyNaming.tsx:97` |
| 4 | `הלאה` | Default (name entered) | Button (primary CTA) | Submits the family name and proceeds to onboarding. Disabled when input is empty. | `src/screens/FamilyNaming.tsx:117` |
| 5 | `...יוצר` | Loading | Button (primary CTA) | Replaces button label while the family record is being created in the database. | `src/screens/FamilyNaming.tsx:117` |
| 6 | `שם חסר` | Validation error — empty input | Error banner | Shown if user somehow submits with empty name (guard on submit). | `src/screens/FamilyNaming.tsx:34` |
| 7 | `השם ארוך מדי (עד 60 תווים)` | Validation error — name > 60 chars | Error banner | Shown if user exceeds max character length. | `src/screens/FamilyNaming.tsx:38` |
| 8 | `לא הצלחנו לטעון את המשפחה הקיימת: [error]` | Server error — family already exists but lookup failed | Error banner | Shown if the server says the user already belongs to a family but the app can't load it. Includes a raw technical error appended after the colon. | `src/screens/FamilyNaming.tsx:66–67` |
| 9 | `החשבון הזה כבר שייך למשפחה, נסה להתנתק ולהתחבר שוב` | Server error — family exists, no detail available | Error banner | Fallback when the family-already-exists conflict has no additional error detail. | `src/screens/FamilyNaming.tsx:68` |

---

## Screen 3 — Onboarding (3 steps)

**Route:** `/onboarding/welcome`, `/onboarding/names`, `/onboarding/crew-ready`  
**Who sees it:** New users, immediately after family naming.  
**What it does:** Three-step flow with progress dots. Step 1 = welcome with the ship. Step 2 = name the three pirates (mom, dad, child). Step 3 = crew confirmation before first voyage.

### Step 1 — Welcome (`ScreenWelcome`)

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `בואו נתחיל! ⚓` | Default | Button (primary CTA) | Advances from the welcome illustration to the crew-naming step. | `src/screens/Onboarding.tsx:52` |

> **Note:** This step has no heading or body text — the illustration carries the full welcome message. The only copy is the CTA.

### Step 2 — Name the Crew (`ScreenNames`)

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `תנו שם לצוות שלכם` | Default | Heading (h2) | Prompt to name all three pirates. | `src/screens/Onboarding.tsx:81` |
| 2 | `כל פיראט מקבל דגל בצבע משלו` | Default | Body text (sub-label) | Explains the color-flag mechanic shown on the cards. | `src/screens/Onboarding.tsx:84` |
| 3 | `{p.role}` | Default — per pirate card | Label (above name input) | Shows the pirate's role label (e.g. "אמא", "אבא", "ילד/ה"). These role strings come from the data layer — not hardcoded here. **Note for writer:** verify the role strings in `src/data.ts` or the pirates store. | `src/screens/Onboarding.tsx:96` |
| 4 | `דלג` | Default | Button (secondary) | Skips the naming step entirely, proceeding with default pirate names. | `src/screens/Onboarding.tsx:118` |
| 5 | `צאו לדרך! ⚓` | Default (names filled) | Button (primary CTA) | Saves pirate names and advances to the crew-ready screen. | `src/screens/Onboarding.tsx:121` |

### Step 3 — Crew Ready (`ScreenCrewReady`)

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `הצוות שלכם מוכן!` | Default | Heading (h1) | Congratulatory confirmation shown after names are set. Pirates are displayed with their names. | `src/screens/Onboarding.tsx:151` |
| 2 | `🏴‍☠️ הפלגה חדשה` | Default | Button (primary CTA) | Launches the first voyage from the crew-ready screen, routing to Roll Call. | `src/screens/Onboarding.tsx:182` |

---

## Screen 4 — Home

**Route:** `/home`  
**Who sees it:** Returning users; the main hub after every voyage.  
**What it does:** Shows the family ship, a count of unlocked islands, and two primary actions. The compass icon leads to Settings; the map chip shows island count and leads to the Treasure Map.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `Settings` | Default | Aria-label (not visible) | Accessibility label for the compass icon button that opens Settings. | `src/screens/Home.tsx:29` |
| 2 | `Open map` | Default | Aria-label (not visible) | Accessibility label for the map chip button that opens the Treasure Map. | `src/screens/Home.tsx:41` |
| 3 | `{islandsCount}` | Default | Badge / chip (next to map icon) | Displays the number of unlocked islands. No label — just the number next to a map icon. **Note for writer:** no unit label ("איים") — consider whether the number alone is self-explanatory to a new user with 0 islands. | `src/screens/Home.tsx:48` |
| 4 | `🏴‍☠️ הפלגה חדשה` | Default | Button (primary CTA, large) | Opens Roll Call sheet to start a new voyage. | `src/screens/Home.tsx:75` |
| 5 | `🗺️ מפת האוצר` | Default | Button (secondary CTA) | Opens the Treasure Map screen. | `src/screens/Home.tsx:83` |

---

## Screen 5 — Roll Call

**Route:** Bottom sheet overlay (appears over Home)  
**Who sees it:** Parent/adult initiating a new voyage.  
**What it does:** A bottom sheet where the user selects which family members are sailing today. Each pirate has a toggle. At least one must be active to proceed.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `מי בנסיעה היום?` | Default | Heading (h2) | Main prompt for the roll call selection. | `src/screens/RollCall.tsx:37` |
| 2 | `{p.name}` | Default — per pirate row | Label (pirate name) | Displays each pirate's current name. Dynamic. | `src/screens/RollCall.tsx:49` |
| 3 | `בפנים!` | Per pirate — toggled ON | Status label (below name) | Shows when a pirate is active/selected for the voyage. | `src/screens/RollCall.tsx:52` |
| 4 | `לא כאן` | Per pirate — toggled OFF | Status label (below name) | Shows when a pirate is sitting this voyage out. | `src/screens/RollCall.tsx:53` |
| 5 | `Toggle` | Per pirate — default | Aria-label (not visible) | Accessibility label for the toggle switch on each pirate row. **Note for writer:** "Toggle" is English and generic — consider a more descriptive Hebrew label like `הוסף/הסר מהפלגה`. | `src/screens/RollCall.tsx:61` |
| 6 | `אף אחד לא מפליג? בלתי אפשרי! 🤨` | Error state — all toggles OFF | Validation message | Shown when the user has toggled all pirates off. Prevents sailing with zero crew. | `src/screens/RollCall.tsx:86` |
| 7 | `⚓ מפליגים!` | Default (at least 1 active) | Button (primary CTA) | Confirms the selected crew and starts the voyage. Disabled when count = 0. | `src/screens/RollCall.tsx:90` |

---

## Screen 6 — Drive (Active Voyage)

**Route:** `/drive` (active session screen)  
**Who sees it:** All family members during an active listening/driving session.  
**What it does:** Shows large tap-to-select pirate buttons. The active pirate (currently listening) is highlighted with a glow. A timer counts each pirate's accumulated time. After 5 minutes, the spyglass icon glows as a hint. A hold-to-end button lets the parent end the voyage.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `{p.name}` | Default — per pirate button | Label (pirate name, large) | Each pirate's name displayed on their large tap button. | `src/screens/Drive.tsx:105` |
| 2 | `🎵` | Per pirate — currently active | Animated icon (inline with name) | Music note appears next to the active pirate's name while they are listening. | `src/screens/Drive.tsx:111` |
| 3 | `מאזין/ה עכשיו` | Per pirate — currently active | Status label (below name) | Confirms which pirate is currently accumulating listening time. | `src/screens/Drive.tsx:117` |
| 4 | `לא כאן היום` | Per pirate — sat out (not sailing) | Status label (below name) | Shown on pirates excluded from this voyage during Roll Call. They appear dimmed. | `src/screens/Drive.tsx:122` |
| 5 | `{p.name} listening time` | Per pirate — default | Aria-label (not visible) | Accessibility label for the per-pirate timer chip. Note: this label is in English while the app is in Hebrew. | `src/screens/Drive.tsx:149` |
| 6 | `{mm:ss}` | Per pirate — not sat out | Timer chip | Shows accumulated listening time for each pirate in mm:ss format. No label — just the number. | `src/screens/Drive.tsx:158` |
| 7 | `סיימו הפלגה` | Default | Hold-to-end button | A press-and-hold button (1 second) that ends the voyage and triggers the Reveal. Appears in the footer, bottom-left. | `src/screens/Drive.tsx:197` |

---

## Screen 7 — Spyglass

**Route:** Overlay over Drive screen (triggered by spyglass icon tap)  
**Who sees it:** Anyone during an active voyage, after 5+ minutes have elapsed.  
**What it does:** Mid-voyage "peek" at the current balance. Shows the ship with cargo stacks representing each pirate's share, and a tier banner indicating the current balance status.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `Close` | Default | Aria-label (not visible) | Accessibility label for the ✕ close button. Note: English while app is in Hebrew. | `src/screens/Spyglass.tsx:93` |
| 2 | `⛵ רוח גבית! זמן האזנה שווה` | Tier = fair (balanced) | Pennant banner | Mid-voyage status message when listening time is well-balanced. | `src/screens/Spyglass.tsx:58` |
| 3 | `🌊 הספינה קצת נטויה...אזנו את הזמן` | Tier = coastal (slightly unbalanced) | Pennant banner | Mid-voyage status message when one pirate has noticeably more time. | `src/screens/Spyglass.tsx:59` |
| 4 | `[harbor icon] מישהו משתלט, אתם לא זזים` | Tier = harbor (very unbalanced) | Pennant banner | Mid-voyage status message when the imbalance is severe. The harbor SVG icon appears inline before the text. | `src/screens/Spyglass.tsx:64–66` |

---

## Screen 8 — Reveal

**Route:** `/reveal` (post-voyage results screen)  
**Who sees it:** All family members immediately after ending a voyage.  
**What it does:** Cinematic reveal sequence (5 auto-advancing stages). Stage 1: dark screen iris-opens to harbor scene. Stage 2: "End of voyage!" splash. Stage 3: ship appears with cargo stacks. Stage 4: verdict banner + reward. Stage 5: save button appears.

**Three outcome branches:**
- **Fair:** New island is revealed with its illustration
- **Coastal:** A coastal find item appears (name shown below icon)  
- **Harbor:** No reward — just the verdict

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `סוף ההפלגה!` | Stage 2 (auto, ~1.5s) | Heading / splash card | Dramatic end-of-voyage announcement on a gold card, rotated slightly. Iris-in reveal effect. | `src/screens/Reveal.tsx:90` |
| 2 | `האזנה משותפת - אי חדש התגלה!` | Stage 4 — tier = fair | Pennant banner | Verdict for a balanced voyage. Island illustration fades in below. | `src/screens/Reveal.tsx:161` |
| 3 | `האזנה קצת נטויה - מצאתם משהו על החוף!` | Stage 4 — tier = coastal | Pennant banner | Verdict for a moderately unbalanced voyage. Coastal find icon and name appear below. | `src/screens/Reveal.tsx:162` |
| 4 | `נתקעתם בנמל - נסו לחלוק יותר פעם הבאה` | Stage 4 — tier = harbor | Pennant banner | Verdict for a very unbalanced voyage. No reward shown. | `src/screens/Reveal.tsx:163` |
| 5 | `{coastalFind.name}` | Stage 4 — tier = coastal | Label (below coastal find icon) | Name of the specific coastal find item (e.g. "בקבוק עם פתק", "מפתח נחושת"). Source list in `src/data.ts:36–44`. | `src/screens/Reveal.tsx:203` |
| 6 | `שמור והתחל ⚓` | Stage 5 (auto, ~14.5s) | Button (primary CTA) | Saves the voyage result to history and returns to Home. Appears after the full reveal animation completes. | `src/screens/Reveal.tsx:218` |

---

## Screen 9 — Confirm End

**Route:** Modal overlay (triggered by hold-to-end button on Drive screen, before the hold completes — **Note:** currently this dialog is imported but the hold interaction completes directly. Review whether this dialog is still in use.)  
**What it does:** A confirmation modal asking the user to confirm ending the voyage. Two buttons: yes or no.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `לסיים את ההפלגה?` | Default | Heading (h3) | Confirmation question. The ⚓ emoji appears above it as a decorative element. | `src/screens/ConfirmEnd.tsx:16` |
| 2 | `כן` | Default | Button (primary CTA) | Confirms the voyage should end. Triggers the Reveal flow. | `src/screens/ConfirmEnd.tsx:20` |
| 3 | `לא` | Default | Button (secondary) | Dismisses the modal and returns to the active Drive screen. | `src/screens/ConfirmEnd.tsx:22` |

---

## Screen 10 — Treasure Map

**Route:** `/map`  
**Who sees it:** Any family member tapping "מפת האוצר" from Home.  
**What it does:** Full-screen parchment map showing all islands. Unlocked islands show their name and are tappable. Locked islands appear as blurred circles. A stats drawer shows lifetime voyage data. The "הסטטיסטיקה" button toggles it open.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `📜 הסטטיסטיקה` | Default | Button (stats drawer toggle) | Opens/closes the statistics drawer. | `src/screens/Map.tsx:60` |
| 2 | `איים שהתגלו` | Stats drawer open | Stat label | Shows count of unlocked islands. | `src/screens/Map.tsx:70` |
| 3 | `מציאות חוף` | Stats drawer open | Stat label | Shows count of "coastal" tier voyages. | `src/screens/Map.tsx:73` |
| 4 | `הפלגות בסך הכל` | Stats drawer open | Stat label | Shows total voyage count. | `src/screens/Map.tsx:75` |
| 5 | `~ Hic sunt dracones ~` | Default | Map decorative label | Latin phrase ("here be dragons") as aged-map flavour text. Rotated, faded. **Note for writer:** this is intentionally in Latin as a genre nod — flag if you want to discuss. | `src/screens/Map.tsx:85` |
| 6 | `{isl.name}` | Unlocked island | Island name label (below island icon) | Each unlocked island shows its Hebrew name. Full name list in `src/data.ts:3–34`. | `src/screens/Map.tsx:134` |
| 7 | `הנמל שלנו` | Default | Map label (home harbor) | Labels the ship icon anchored at the bottom-right of the map as the family's home port. | `src/screens/Map.tsx:151` |
| 8 | `חזרה לנמל ←` | Default | Button (secondary CTA) | Returns to the Home screen. | `src/screens/Map.tsx:159` |

---

## Screen 11 — Island Detail

**Route:** Bottom sheet overlay (appears over the Treasure Map)  
**Who sees it:** Any user tapping an unlocked island on the map.  
**What it does:** Slides up from the bottom. Shows the island illustration, name, description, and three stats: discovery date, voyage duration, and the largest-share percentage.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `{island.name}` | Default | Heading (h2) | Island's Hebrew name. | `src/screens/IslandDetail.tsx:31` |
| 2 | `{island.description}` | Default | Body text | Island's flavour description. Full list of descriptions in `src/data.ts:4–33`. | `src/screens/IslandDetail.tsx:37` |
| 3 | `התגלה ב` | Default | Stat label | Label for the discovery date stat. Value is a hardcoded date string `"06.05.2026"` — **this appears to be placeholder/test data, not dynamic.** | `src/screens/IslandDetail.tsx:40` |
| 4 | `זמן הפלגה` | Default | Stat label | Label for the voyage duration stat. Value is hardcoded `"42 דק׳"` — **placeholder/test data.** | `src/screens/IslandDetail.tsx:41` |
| 5 | `החלק הגדול ביותר` | Default | Stat label | Label for the largest single share percentage. Value is hardcoded `"38%"` — **placeholder/test data.** | `src/screens/IslandDetail.tsx:42` |

> **Development note for Inbal:** The three stat values in IslandDetail are hardcoded. Flag for the dev team — these should be driven by the actual drive data associated with the island unlock.

---

## Screen 12 — Settings

**Route:** `/settings` (guarded behind Math Gate)  
**Who sees it:** Parents only, after passing the math gate.  
**What it does:** Two-part screen. First, a math addition problem gates entry (child-proofing). Then the full settings form with sliders, toggles, voyage history, and crew editing.

### Part A — Math Gate (`ScreenMathGate`)

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `← חזרה` | Default | Text button (back) | Returns to the Home screen without entering Settings. | `src/screens/Settings.tsx:35` |
| 2 | `הגדרות הורים` | Default | Heading (h2) | Section title for the math gate screen. | `src/screens/Settings.tsx:41` |
| 3 | `רק לקפטנים בוגרים - נא לפתור:` | Default | Body text | Explanation of why the math problem exists — framed in pirate voice ("captains"). | `src/screens/Settings.tsx:43` |
| 4 | `{a} + {b} = ?` | Default | Math problem display | Randomly generated addition problem (each operand 2–7). | `src/screens/Settings.tsx:49` |
| 5 | `?` | Default | Input placeholder | Placeholder in the answer input field. | `src/screens/Settings.tsx:58` |
| 6 | `המשך` | Default (correct answer entered) | Button (primary CTA) | Submits the answer. Disabled until the entered value matches the sum. | `src/screens/Settings.tsx:71` |

### Part B — Settings Form (`ScreenSettings`)

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `← חזרה` | Default | Text button (back) | Returns to the previous screen (Home). | `src/screens/Settings.tsx:129` |
| 2 | `הגדרות הורים` | Default | Heading (h2) | Page title for the settings form. | `src/screens/Settings.tsx:131` |
| 3 | `ספים לאיזון` | Default | Section heading | Groups the two balance-threshold sliders. | `src/screens/Settings.tsx:135` |
| 4 | `סף רוח גבית - האזנה שווה בין הורים וילדים` | Default | Slider label | Label for the "fair wind" threshold slider. Controls the upper bound of the "balanced" tier. | `src/screens/Settings.tsx:137` |
| 5 | `≤ {value}% חלק הגדול` | Default — updates live | Slider value display | Live-updating formatted value for the fair threshold slider. Shows the maximum share one pirate can hold while still counting as "fair". | `src/screens/Settings.tsx:143` |
| 6 | `סף נמל - רק אחד רוב הזמן` | Default | Slider label | Label for the "harbor" threshold slider. Controls when a session is marked as severely unbalanced. | `src/screens/Settings.tsx:146` |
| 7 | `> {value}%` | Default — updates live | Slider value display | Live-updating value for the harbor threshold slider. | `src/screens/Settings.tsx:152` |
| 8 | `כללי` | Default | Section heading | Groups the general toggle settings. | `src/screens/Settings.tsx:156` |
| 9 | `🔊 צלילים` | Default | Toggle label | Label for the sound effects on/off toggle. | `src/screens/Settings.tsx:158` |
| 10 | `🌫️ ערפל על איים בלתי מגולים` | Default | Toggle label | Label for the fog-of-war toggle that hides undiscovered islands on the map. | `src/screens/Settings.tsx:163` |
| 11 | `היסטוריה` | Default | Section heading | Groups the recent voyage history list. | `src/screens/Settings.tsx:169` |
| 12 | `אין הפלגות עדיין` | Empty state — no voyages | Body text | Shown when the history section has no drives to display. | `src/screens/Settings.tsx:172` |
| 13 | `🌞 רוח גבית` | History row — tier = fair | Badge / chip | Tier label for a balanced historical voyage. | `src/screens/Settings.tsx:181` |
| 14 | `🌊 חוף` | History row — tier = coastal | Badge / chip | Tier label for a coastal historical voyage. | `src/screens/Settings.tsx:183` |
| 15 | `⚓ נמל` | History row — tier = harbor | Badge / chip | Tier label for a harbor (unbalanced) historical voyage. | `src/screens/Settings.tsx:184` |
| 16 | `{d.date} · {d.totalMin} דק׳` | History row — default | Body text (sub-label) | Shows the voyage date and total duration. | `src/screens/Settings.tsx:210–213` |
| 17 | `<1 דק׳` | History row — voyage < 1 minute | Body text (sub-label) | Edge case: very short voyages display "<1 דק׳" instead of "0 דק׳". | `src/screens/Settings.tsx:212` |
| 18 | `{pirateeName} ({minutes} דק׳)` | History row — pirate with most time | Body text | Shows the pirate who listened the most in that voyage, alongside their flag color. | `src/screens/Settings.tsx:223` |
| 19 | `עריכת הצוות` | Default | Section heading | Groups the pirate name editing inputs. | `src/screens/Settings.tsx:233` |
| 20 | `✓ נשמר` | After save — 1.8s then fades | Confirmation toast | Brief inline confirmation shown after pirate names are saved successfully. | `src/screens/Settings.tsx:255` |
| 21 | `שמירה` | Default (names edited) | Button (save crew) | Saves edited pirate names. Disabled and dimmed when no names have changed. | `src/screens/Settings.tsx:265` |
| 22 | `איפוס נתונים` | Default | Button (destructive, outlined red) | Resets all app data. Triggers a confirmation flow (not shown here — check route/App logic). | `src/screens/Settings.tsx:272` |

---

## Screen 13 — Auth Callback

**Route:** `/auth/callback`  
**Who sees it:** Any user being redirected back from Google OAuth.  
**What it does:** Transitional loading screen while Supabase parses the OAuth token and the app resolves the user's session. Automatically redirects in < 2 seconds. Not a designed UX screen — purely functional.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `רגע אחד...` | Default (loading) | Body text | Loading message shown while OAuth callback is being processed. | `src/screens/AuthCallback.tsx:51` |

---

## Shared Components

### OfflineIndicator

**Where it appears:** Top-left corner of the Drive screen (active voyage).  
**Visibility:** Hidden when online and no queue. Visible only when offline or when 3+ voyages are queued for sync.

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `אופליין — ההפלגה תישמר כשתהיה רשת` | Device is offline | Floating pill / badge | Reassures the user that the current voyage won't be lost when connectivity resumes. | `src/components/OfflineIndicator.tsx:20` |
| 2 | `{n} הפלגות מחכות לסנכרון` | Online but ≥ 3 voyages queued | Floating pill / badge | Alerts the parent that several voyages haven't synced yet. `{n}` is the queue count. | `src/components/OfflineIndicator.tsx:21` |

### PlankButton

**What it is:** The app's primary button component, styled as a wooden plank. Used throughout the app. The button itself has no hardcoded copy — all text is passed as `children` from the calling screen. No copy review needed on this component directly.

---

## Global / Route-Level Error States

These strings appear in the route guards (`src/routes/guards.tsx`) — not on any specific screen, but shown as full-screen blocking errors.

### LoadingShell

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | *(no text)* | App bootstrapping | Full-screen spinner | Shown while auth state is being resolved on any guarded route. Intentionally has no text. | `src/routes/guards.tsx:13–22` |

### FamilyLookupError

| # | Copy | State / Context | UI Element | Product behavior | Source |
|---|---|---|---|---|---|
| 1 | `לא הצלחנו לטעון את המשפחה` | Error state | Heading (h3) | Main error heading when the family record can't be loaded. | `src/routes/guards.tsx:48` |
| 2 | `הרשת אולי פחות טובה כרגע. נסו שוב, ואם זה נמשך — התנתקו והתחברו שוב.` | Error state | Body text | Friendly explanation + recovery instructions. | `src/routes/guards.tsx:51` |
| 3 | `{message}` | Error state | Pre-formatted technical error block | Raw technical error string displayed in a `<pre>` block below the friendly message. Visible to users — **note for writer:** consider whether this raw error output should be hidden or softened. | `src/routes/guards.tsx:55` |
| 4 | `נסה שוב` | Error state | Button (primary) | Retries the family data fetch. | `src/routes/guards.tsx:62` |
| 5 | `התנתקות` | Error state | Button (destructive, outlined red) | Signs the user out and redirects to `/`. | `src/routes/guards.tsx:67` |

---

## Island & Coastal Find Names (Data Layer)

These strings come from `src/data.ts` and are surfaced across Map, Island Detail, and Reveal screens.

### Islands (`ISLANDS` — 30 total)

| ID | Name | Creature | Description excerpt |
|---|---|---|---|
| `coral-cove` | מפרץ האלמוגים | הצב המזמר | צב זקן ויפה שמכיר את כל שירי הים העתיקים... |
| `frostbeard-isle` | אי הקרח־זקן | פינגווינים בכובעי שודדים | פינגווינים קטנים עם זקנים מקרח... |
| `banana-bay` | מפרץ הבננה | ממלכת הקופים | קופים שמסרבים לוותר ולו על בננה אחת... |
| `glow-lagoon` | לגונת האור | דגי הזוהר | דגים שמאירים את הים בלילה... |
| `volcano-peak` | פסגת הר הגעש | דרקון האש הקטן | דרקון אש שמנסה להבעיר את הים כל יום... |
| `cloud-atoll` | איי העננים | כבשי השמיים | כבשים שצומחות מתוך עננים... |
| `mirror-island` | האי המראה | השודדים־תאומים | בכל פעם שמסתכלים במראה רואים שודד נוסף... |
| `music-reef` | שונית המוזיקה | סרטני הזמר | סרטנים שמנגנים על הצדפים שלהם... |
| `candy-cay` | האי המתוק | דקלי הסוכריות | דקלים שמלאים סוכריות... |
| `sleepy-shore` | החוף הישנוני | עצלני הים | עצלנים שמתעוררים בקושי פעם בחודש... |
| `diamond-dunes` | חולות היהלום | לטאות עיני־יהלום | לטאות שעיניהן עשויות יהלום אמיתי... |
| `honeycomb-isle` | אי הכוורת | דבורים ענקיות וידידותיות | דבורות גדולות כמו ספינות שמסתבר שהן ביישניות... |
| `whisper-wood` | יער הלחישות | העצים המדברים | עצים שלוחשים סודות עתיקים, אבל כל הסודות הם על מזג האוויר... |
| `rainbow-reef` | שונית הקשת | להקת דגי הצבעים | דגים בכל הצבעים שמחליפים מקומות... |
| `stormy-spit` | לשון הסערה | סרטן המטרייה | סרטן קטן עם מטרייה אחת קטנה... |
| `cocoa-coast` | חוף השוקו | דובי השוקולד | דובים עם פרווה בצבע שוקולד... |
| `origami-isle` | אי האוריגמי | ציפורי הנייר | ציפורים מקופלות מנייר שמתעופפות נהדר... |
| `carnival-cove` | מפרץ הקרקס | כלב־ים המופע | כלב־ים שמכיר חמישה טריקים... |
| `library-atoll` | אי הספרייה | הינשוף הקורא | ינשוף שקרא את כל הספרים בים... |
| `mosaic-bay` | מפרץ הפסיפס | התמנון המרצף | תמנון עם דוגמת אריחים על הגוף... |
| `spaghetti-strait` | מצר הספגטי | מדוזת האטריות | מדוזה עם זרועות ארוכות כמו אטריות... |
| `cactus-key` | אי הקקטוס | תוכי הקקטוסים | תוכי שודד שגר בתוך קקטוס... |
| `bubble-bay` | מפרץ הבועות | צפרדעי הבועות | צפרדעים שמרחפות בתוך בועות סבון גדולות... |
| `lonely-lighthouse` | המגדלור הבודד | שומר המגדלור | שחף ששומר על המגדלור הזקן... |
| `velvet-volcano` | הר הגעש הקטיפתי | שבלולי הלבה | שבלולים ענקיים שמבעירים לבה סגולה לאט מאוד... |
| `pancake-point` | קצה הפנקייק | דוב הבוקר הישן | דוב שישן על מגדל סלעים שנראה כמו ערימת פנקייקים... |
| `echo-cliff` | צוק ההד | העז המיודלת | עז שצועקת לעצמה כדי לשמוע הד... |
| `pearl-pond` | בריכת הפנינה | צדפות עם אופי | צדפות שכל אחת חושבת שהפנינה שלה היא הכי יפה... |
| `flag-forest` | יער הדגלים | עצי הדגלים | עצים שצומחים עם דגלים במקום עלים... |
| `last-lagoon` | הלגונה האחרונה | דרקון הים הידידותי | דרקון ים גדול ועתיק שמברך לשלום כל מי שהגיע אליו ביחד עם המשפחה. |

*Full descriptions: `src/data.ts:4–34`*

### Coastal Finds (`COASTAL_FINDS` — 8 total)

These names appear on the Reveal screen when the voyage tier is "coastal."

| ID | Name |
|---|---|
| `bottle-message` | בקבוק עם פתק |
| `brass-key` | מפתח נחושת |
| `rubber-duck` | ברווז גומי |
| `lonely-sock` | גרב בודד |
| `music-box` | תיבת נגינה קטנה |
| `clothes-peg` | אטב כביסה |
| `judo-belt` | חגורת ג׳ודו |
| `long-stick` | מקל עץ ארוך |

*Source: `src/data.ts:36–44`*

---

## Flagged Items for Writer Attention

These are copy issues or open questions to resolve before sign-off:

| # | Issue | Location |
|---|---|---|
| 1 | **Aria-labels in English** — `"Settings"`, `"Open map"`, `"Close"`, `"Toggle"`, and `"{p.name} listening time"` are in English while the entire app is in Hebrew. Screen reader users with Hebrew enabled will hear English words. | Home:29, Home:41, Spyglass:93, RollCall:61, Drive:149 |
| 2 | **"Toggle" is generic and English** — the Roll Call toggle aria-label should describe what the toggle does in Hebrew. | `src/screens/RollCall.tsx:61` |
| 3 | **Island count chip has no label** — the map chip on Home shows just a number. A first-time user with 0 islands has no context for what the number means. | `src/screens/Home.tsx:48` |
| 4 | **Hardcoded stat values in Island Detail** — "התגלה ב", "זמן הפלגה", and "חלק הגדול ביותר" show hardcoded placeholder data (`"06.05.2026"`, `"42 דק׳"`, `"38%"`). These will need to be dynamic. | `src/screens/IslandDetail.tsx:40–42` |
| 5 | **Raw technical error shown to user** — `FamilyLookupError` renders a `<pre>` block with the raw JS error string. Consider whether to hide this or replace with a friendlier fallback. | `src/routes/guards.tsx:53–57` |
| 6 | **Gender ambiguity** — `מאזין/ה עכשיו` on Drive uses a slash convention. Confirm this is the preferred approach across the app, or decide on a consistent gender-neutral pattern. | `src/screens/Drive.tsx:117` |
| 7 | **`Hic sunt dracones` is Latin** — intentional genre flavor. Confirm it stays as-is or should be translated/replaced for a child audience. | `src/screens/Map.tsx:85` |
| 8 | **"ConfirmEnd" dialog usage** — the dialog exists in code but the Drive screen uses a hold-to-complete interaction that ends the voyage directly without this dialog. Confirm if this component is still used in the current flow. | `src/screens/ConfirmEnd.tsx` |

---

*Document generated: 2026-05-10*  
*Source directory: `src/` under `/Users/inbalbenyehudam/Private/family-pirate-ship/`*
