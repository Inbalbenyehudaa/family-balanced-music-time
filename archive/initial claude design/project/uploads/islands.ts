// src/lib/islands.ts
// Content for all 30 islands. Each has stable English `id` for code references
// and Hebrew kid-facing fields. See content_notes.md for native-review checklist.

import type { Island } from '../types';

export const ISLANDS: Island[] = [
  {
    id: 'coral-cove',
    name: 'מפרץ האלמוגים',
    illustrationKey: 'coral-cove',
    creatureName: 'הצב המזמר',
    description: 'צב זקן ויפה שמכיר את כל שירי הים העתיקים, כולל שיר אחד ארוך במיוחד על מקרל.',
  },
  {
    id: 'frostbeard-isle',
    name: 'אי הקרח־זקן',
    illustrationKey: 'frostbeard-isle',
    creatureName: 'פינגווינים בכובעי שודדים',
    description: 'פינגווינים קטנים עם זקנים מקרח, שמשוכנעים שהם שודדי הים הכי מפחידים בעולם.',
  },
  {
    id: 'banana-bay',
    name: 'מפרץ הבננה',
    illustrationKey: 'banana-bay',
    creatureName: 'ממלכת הקופים',
    description: 'קופים שמסרבים לוותר ולו על בננה אחת, אבל מציעים לכם עצים בנדיבות.',
  },
  {
    id: 'glow-lagoon',
    name: 'לגונת האור',
    illustrationKey: 'glow-lagoon',
    creatureName: 'דגי הזוהר',
    description: 'דגים שמאירים את הים בלילה ומתעקשים שזה רק כדי לקרוא ספרים בשקט.',
  },
  {
    id: 'volcano-peak',
    name: 'פסגת הר הגעש',
    illustrationKey: 'volcano-peak',
    creatureName: 'דרקון האש הקטן',
    description: 'דרקון אש שמנסה להבעיר את הים כל יום, אבל הים תמיד יוצא מנצח.',
  },
  {
    id: 'cloud-atoll',
    name: 'איי העננים',
    illustrationKey: 'cloud-atoll',
    creatureName: 'כבשי השמיים',
    description: 'כבשים שצומחות מתוך עננים ומסרבות בנימוס לרדת לקרקע.',
  },
  {
    id: 'mirror-island',
    name: 'האי המראה',
    illustrationKey: 'mirror-island',
    creatureName: 'השודדים־תאומים',
    description: 'בכל פעם שמסתכלים במראה רואים שודד נוסף, בדיוק כמוכם, רק קצת יותר מצחיק.',
  },
  {
    id: 'music-reef',
    name: 'שונית המוזיקה',
    illustrationKey: 'music-reef',
    creatureName: 'סרטני הזמר',
    description: 'סרטנים שמנגנים על הצדפים שלהם ומתחרים כל הזמן מי שר יותר יפה.',
  },
  {
    id: 'candy-cay',
    name: 'האי המתוק',
    illustrationKey: 'candy-cay',
    creatureName: 'דקלי הסוכריות',
    description: 'דקלים שמלאים סוכריות, אבל מזהירים אתכם מראש: לא לאכול הכל בבת אחת!',
  },
  {
    id: 'sleepy-shore',
    name: 'החוף הישנוני',
    illustrationKey: 'sleepy-shore',
    creatureName: 'עצלני הים',
    description: 'עצלנים שמתעוררים בקושי פעם בחודש, ורק בשביל לפהק קצת.',
  },
  {
    id: 'diamond-dunes',
    name: 'חולות היהלום',
    illustrationKey: 'diamond-dunes',
    creatureName: 'לטאות עיני־יהלום',
    description: 'לטאות שעיניהן עשויות יהלום אמיתי, ומאוד מאוד אוהבות שמשבחים אותן.',
  },
  {
    id: 'honeycomb-isle',
    name: 'אי הכוורת',
    illustrationKey: 'honeycomb-isle',
    creatureName: 'דבורים ענקיות וידידותיות',
    description: 'דבורים גדולות כמו ספינות שמסתבר שהן ביישניות מאוד מאוד.',
  },
  {
    id: 'whisper-wood',
    name: 'יער הלחישות',
    illustrationKey: 'whisper-wood',
    creatureName: 'העצים המדברים',
    description: 'עצים שלוחשים סודות עתיקים, אבל כל הסודות הם בעצם על מזג האוויר.',
  },
  {
    id: 'rainbow-reef',
    name: 'שונית הקשת',
    illustrationKey: 'rainbow-reef',
    creatureName: 'להקת דגי הצבעים',
    description: 'דגים בכל הצבעים שמחליפים מקומות כל כמה שניות, רק כדי לבלבל אתכם.',
  },
  {
    id: 'stormy-spit',
    name: 'לשון הסערה',
    illustrationKey: 'stormy-spit',
    creatureName: 'סרטן המטרייה',
    description: 'סרטן קטן עם מטרייה אחת קטנה שמשוכנע שהיא מספיקה לכל האי.',
  },
  {
    id: 'cocoa-coast',
    name: 'חוף השוקו',
    illustrationKey: 'cocoa-coast',
    creatureName: 'דובי השוקולד',
    description: 'דובים עם פרווה בצבע שוקולד שמסבירים בכל הזדמנות שזה לא שוקולד אמיתי.',
  },
  {
    id: 'origami-isle',
    name: 'אי האוריגמי',
    illustrationKey: 'origami-isle',
    creatureName: 'ציפורי הנייר',
    description: 'ציפורים מקופלות מנייר שמתעופפות נהדר, אבל מסרבות בכל תוקף להירטב.',
  },
  {
    id: 'carnival-cove',
    name: 'מפרץ הקרקס',
    illustrationKey: 'carnival-cove',
    creatureName: 'כלב־ים המופע',
    description: 'כלב־ים שמכיר חמישה טריקים, ומתעקש להראות לכם את כולם בכל ביקור.',
  },
  {
    id: 'library-atoll',
    name: 'אי הספרייה',
    illustrationKey: 'library-atoll',
    creatureName: 'הינשוף הקורא',
    description: 'ינשוף שקרא את כל הספרים בים, אבל עדיין לא מצא את הסוף של אחד מהם.',
  },
  {
    id: 'mosaic-bay',
    name: 'מפרץ הפסיפס',
    illustrationKey: 'mosaic-bay',
    creatureName: 'התמנון המרצף',
    description: 'תמנון עם דוגמת אריחים על הגוף, שמשנה את הצבעים בכל פעם שמסתכלים הצידה.',
  },
  {
    id: 'spaghetti-strait',
    name: 'מצר הספגטי',
    illustrationKey: 'spaghetti-strait',
    creatureName: 'מדוזת האטריות',
    description: 'מדוזה עם זרועות ארוכות כמו אטריות, שלא בטוחה אם היא חיה או ארוחת צהריים.',
  },
  {
    id: 'cactus-key',
    name: 'אי הקקטוס',
    illustrationKey: 'cactus-key',
    creatureName: 'תוכי הקקטוסים',
    description: 'תוכי שודד שגר בתוך קקטוס וצוחק על כל מי שמנסה לשבת לידו.',
  },
  {
    id: 'bubble-bay',
    name: 'מפרץ הבועות',
    illustrationKey: 'bubble-bay',
    creatureName: 'צפרדעי הבועות',
    description: 'צפרדעים שמרחפות בתוך בועות סבון גדולות, ולא תמיד מחליטות לאן הן רוצות לעוף.',
  },
  {
    id: 'lonely-lighthouse',
    name: 'המגדלור הבודד',
    illustrationKey: 'lonely-lighthouse',
    creatureName: 'שומר המגדלור',
    description: 'שחף ששומר על המגדלור הזקן, ובדיוק עכשיו מאוד רוצה למצוא חבר חדש.',
  },
  {
    id: 'velvet-volcano',
    name: 'הר הגעש הקטיפתי',
    illustrationKey: 'velvet-volcano',
    creatureName: 'שבלולי הלבה',
    description: 'שבלולים ענקיים שמבעירים לבה סגולה לאט מאוד מאוד, כי הם פשוט שבלולים.',
  },
  {
    id: 'pancake-point',
    name: 'קצה הפנקייק',
    illustrationKey: 'pancake-point',
    creatureName: 'דוב הבוקר הישן',
    description: 'דוב שישן על מגדל סלעים שנראה בדיוק כמו ערימת פנקייקים, ולא מוכן לקבל הסבר אחר.',
  },
  {
    id: 'echo-cliff',
    name: 'צוק ההד',
    illustrationKey: 'echo-cliff',
    creatureName: 'העז המיודלת',
    description: 'עז שצועקת לעצמה כדי לשמוע הד, ומתווכחת עם עצמה כל היום בלי להתעייף.',
  },
  {
    id: 'pearl-pond',
    name: 'בריכת הפנינה',
    illustrationKey: 'pearl-pond',
    creatureName: 'צדפות עם אופי',
    description: 'צדפות שכל אחת חושבת שהפנינה שלה היא הכי יפה והכי גדולה. לא להגיד להן אחרת!',
  },
  {
    id: 'flag-forest',
    name: 'יער הדגלים',
    illustrationKey: 'flag-forest',
    creatureName: 'עצי הדגלים',
    description: 'עצים שצומחים עם דגלים במקום עלים, ולכל אחד מהם יש דגל בצבע משלו.',
  },
  {
    id: 'last-lagoon',
    name: 'הלגונה האחרונה',
    illustrationKey: 'last-lagoon',
    creatureName: 'דרקון הים הידידותי',
    description: 'דרקון ים גדול ועתיק שמברך לשלום כל מי שהגיע אליו ביחד עם המשפחה.',
  },
];

/**
 * Pick a random not-yet-unlocked island for a Fair Winds reveal.
 * Returns null when all 30 are already unlocked.
 */
export function pickIslandToUnlock(unlockedIslandIds: string[]): Island | null {
  const locked = ISLANDS.filter(i => !unlockedIslandIds.includes(i.id));
  if (locked.length === 0) return null;
  return locked[Math.floor(Math.random() * locked.length)];
}

/** Look up an island by id. */
export function getIslandById(id: string): Island | undefined {
  return ISLANDS.find(i => i.id === id);
}
