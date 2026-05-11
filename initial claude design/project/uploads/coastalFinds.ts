// src/lib/coastalFinds.ts
// Content for the 15 coastal finds — small surprises for tier-2 (Coastal Sailing) drives.
// Each has stable English `id` for code references and Hebrew kid-facing fields.
// See content_notes.md for native-review checklist.

import type { CoastalFind } from '../types';

export const COASTAL_FINDS: CoastalFind[] = [
  {
    id: 'bottle-message',
    name: 'בקבוק עם פתק',
    illustrationKey: 'bottle-message',
  },
  {
    id: 'friendly-gull',
    name: 'שחף ידידותי',
    illustrationKey: 'friendly-gull',
  },
  {
    id: 'drifting-hat',
    name: 'כובע צף',
    illustrationKey: 'drifting-hat',
  },
  {
    id: 'mystery-crate',
    name: 'ארגז מסתורי',
    illustrationKey: 'mystery-crate',
  },
  {
    id: 'leaping-fish',
    name: 'דג קופץ',
    illustrationKey: 'leaping-fish',
  },
  {
    id: 'brass-key',
    name: 'מפתח נחושת',
    illustrationKey: 'brass-key',
  },
  {
    id: 'rubber-duck',
    name: 'ברווז גומי',
    illustrationKey: 'rubber-duck',
  },
  {
    id: 'seaweed-snail',
    name: 'חילזון על אצות',
    illustrationKey: 'seaweed-snail',
  },
  {
    id: 'lonely-sock',
    name: 'גרב בודד',
    illustrationKey: 'lonely-sock',
  },
  {
    id: 'rolled-scroll',
    name: 'מגילה מגולגלת',
    illustrationKey: 'rolled-scroll',
  },
  {
    id: 'coin-purse',
    name: 'ארנק מטבעות',
    illustrationKey: 'coin-purse',
  },
  {
    id: 'music-box',
    name: 'תיבת נגינה קטנה',
    illustrationKey: 'music-box',
  },
  {
    id: 'single-boot',
    name: 'מגף בודד',
    illustrationKey: 'single-boot',
  },
  {
    id: 'mini-telescope',
    name: 'משקפת קטנה',
    illustrationKey: 'mini-telescope',
  },
  {
    id: 'paper-boat',
    name: 'סירת נייר עם שודד פצפון',
    illustrationKey: 'paper-boat',
  },
];

/**
 * Pick a random coastal find for a Coastal Sailing reveal.
 * Coastal finds CAN repeat across drives — they're smaller surprises, not rare unlocks.
 * Always returns a value (never null) since the pool can be reused.
 */
export function pickCoastalFind(): CoastalFind {
  return COASTAL_FINDS[Math.floor(Math.random() * COASTAL_FINDS.length)];
}

/** Look up a coastal find by id. */
export function getCoastalFindById(id: string): CoastalFind | undefined {
  return COASTAL_FINDS.find(f => f.id === id);
}
