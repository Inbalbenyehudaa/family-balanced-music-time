# Family Pirate Ship — Content Notes

Companion to `islands.ts` and `coastalFinds.ts`. Explains the creative choices, flags what needs native-Hebrew review before V1, and documents one small data-model adjustment for the developer spec.

---

## Creative direction taken

**Funny, never sweet.** Every island description has a tiny twist — something the creature is doing wrong, embarrassed about, stubbornly insisting on. The aim is comedy, not awe. A 4.5-year-old should giggle at the description as a parent reads it aloud, not just nod solemnly at "a beautiful turtle."

Examples of the twist pattern:
- **Coral Cove turtle:** sings sea songs *including one really long one about mackerel*
- **Frostbeard penguins:** *think* they're the scariest pirates alive (they're not)
- **Banana Bay monkeys:** won't share bananas but generously offer trees
- **Sleepy Shore sloths:** wake up monthly, only to yawn

This pattern is consistent across all 30 islands. If you replace any descriptions, keep the twist — without it the islands flatten into generic kids-app entries.

**Names: short, evocative, alliteration-friendly.** Hebrew names are 2–3 words, rhythmically punchy. Where possible, I matched the alliterative feel of the English (Coral Cove → מפרץ האלמוגים, Banana Bay → מפרץ הבננה, Mosaic Bay → מפרץ הפסיפס). A few don't alliterate but read well in Hebrew on their own.

**Creature names are titles, not personal names.** "The Singing Turtle" / "הצב המזמר" rather than "Bob the Turtle." This keeps it archetypal — easier to illustrate, easier for a 4yo to remember, doesn't lock in a specific personality the artwork has to match.

---

## Native-review checklist

I drafted the Hebrew myself and I'm not a native speaker. Treat what's there as competent draft, not publication-ready. **Get a Hebrew-speaking adult to scan for:**

**Tone calibration.** The brief was "funny, full-swashbuckling pirate-comedy." Some of my drafts may have landed closer to "cute" or "neutral storybook." Specifically scrutinize:
- Are the descriptions actually funny *in Hebrew rhythm*? (Translated humor often dies in translation.)
- Do any phrasings sound stiff, archaic, or textbook-y?
- Would a 4-year-old find these phrases comfortable to hear out loud?

**Word choice.** A few terms I used that a native speaker should sanity-check:
- "מזמר" (singing) vs "שר" — used "מזמר" for poetic/old-feel, but "שר" might feel more natural to a kid
- "מפליגים!" (we're sailing!) — used as an exclamation throughout the app; verify the energy fits a swashbuckling exclamation
- "מיודלת" (yodels, of the goat) — uncommon word, possibly too obscure or possibly perfect, native call needed
- "מרצף" (tile-laying, of the octopus on Mosaic Bay) — wordplay attempt that may or may not land
- "מקרל" (mackerel) — used Latin transliteration; check if Hebrew prefers a different word for the fish
- "פנקייקים" — used as transliteration; verify whether "לביבות" or another word fits better for kid audiences

**Specific lines worth a careful pass:**
- *Library Atoll* — the "still hasn't found the end of one of them" joke might need rephrasing for natural Hebrew rhythm
- *Spaghetti Strait* — the "she's not sure if she's alive or lunch" gag is the riskiest translation; if it doesn't land, replace with another visual gag
- *Pearl Pond* — "לא להגיד להן אחרת!" (don't tell them otherwise!) — verify the conspiratorial-aside tone reads as intended
- *Last Lagoon* — the "for those who arrived together with their family" line is the only one that explicitly references the family-balance theme; make sure it doesn't feel preachy

**Coastal finds.** All 15 names are short noun phrases. Less risk in the writing — but still worth checking if any sound awkward (e.g., "ארנק מטבעות" / "coin purse" might be more naturally "כיס מטבעות").

---

## Small data-model adjustment

The developer spec's `CoastalFind` type included an optional `foundAt?: number` field, implying one-time-per-find unlocks like islands. **Coastal finds in this content are designed to repeat across drives** — there are only 15 of them, and a family doing weekly drives would otherwise exhaust the pool too fast.

**Adjusted model for Claude Code:**

```typescript
// CoastalFind no longer carries foundAt — finds can repeat
export interface CoastalFind {
  id: string;
  name: string;
  illustrationKey: string;
}

// The Drive record still tracks which find appeared (via coastalFindId)
// Cumulative "Total coastal finds" count = number of Coastal-tier drives
// (a meaningful number even with repeats)
```

The developer spec's `DrivesStore.coastalFinds` field should be removed or repurposed — finds aren't persisted as a discoverable collection, they're just a content pool referenced from drive records.

This is the only adjustment to the developer spec; everything else stands as written.

---

## Asset list implications

`islands.ts` defines 30 `illustrationKey` values, each expecting a corresponding image at `/public/images/islands/{key}.svg` (or .png). Each illustration should depict the creature/scene, not just the landscape — the image is what the kid sees on the reveal screen and on the treasure map detail card.

`coastalFinds.ts` defines 15 `illustrationKey` values, each expecting `/public/images/coastal-finds/{key}.svg`. These can be smaller / simpler — they appear once per coastal reveal in the bobbing water, not as full hero illustrations.

For early prototyping with Claude design or Imagine, a sensible order to commission illustrations in:

1. **The 6 most-distinctive islands** (so each has a clear identity at first glance):
   - coral-cove, frostbeard-isle, volcano-peak, mirror-island, candy-cay, last-lagoon
2. **One coastal find** to establish the smaller-illustration style (suggest: bottle-message)
3. **Pirate avatars + ship** (these are higher-priority than any single island)
4. The remaining 24 islands, in any order
5. The remaining 14 coastal finds

Until illustrations exist, the app can use a simple placeholder pattern: colored circle with the creature name in display font.

---

## What's NOT in this content

A few content gaps to flag for a future pass:

- **No island categorization or themes** beyond the descriptions. If V2 adds "this week's island theme" or filtering, ids would need theme tags added.
- **No "rare" islands.** All 30 are equally weighted in the random pool. If V2 wants milestone-rare unlocks (e.g., the Last Lagoon should appear only after 25 prior unlocks), add an `unlockOrder` or `rarity` field.
- **No island-specific sounds.** The reveal uses the generic "treasure shimmer" sound for all islands. Per-island sounds are deferred.
- **No Hebrew alt text or accessibility labels** on illustrations. Should be added when the illustration assets are commissioned.
- **No localized variants.** V1 is Hebrew-only by design. If you ever want an English version for visiting grandparents, all the strings would need a parallel `en.ts`.
