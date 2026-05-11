/* global React */
// data.js — islands + coastal finds (compiled from islands.ts + coastalFinds.ts)

const ISLANDS = [
  { id: 'coral-cove', name: 'מפרץ האלמוגים', creatureName: 'הצב המזמר', description: 'צב זקן ויפה שמכיר את כל שירי הים העתיקים, כולל שיר אחד ארוך במיוחד על מקרל.' },
  { id: 'frostbeard-isle', name: 'אי הקרח־זקן', creatureName: 'פינגווינים בכובעי שודדים', description: 'פינגווינים קטנים עם זקנים מקרח, שמשוכנעים שהם שודדי הים הכי מפחידים בעולם.' },
  { id: 'banana-bay', name: 'מפרץ הבננה', creatureName: 'ממלכת הקופים', description: 'קופים שמסרבים לוותר ולו על בננה אחת, אבל מציעים לכם עצים בנדיבות.' },
  { id: 'glow-lagoon', name: 'לגונת האור', creatureName: 'דגי הזוהר', description: 'דגים שמאירים את הים בלילה ומתעקשים שזה רק כדי לקרוא ספרים בשקט.' },
  { id: 'volcano-peak', name: 'פסגת הר הגעש', creatureName: 'דרקון האש הקטן', description: 'דרקון אש שמנסה להבעיר את הים כל יום, אבל הים תמיד יוצא מנצח.' },
  { id: 'cloud-atoll', name: 'איי העננים', creatureName: 'כבשי השמיים', description: 'כבשים שצומחות מתוך עננים ומסרבות בנימוס לרדת לקרקע.' },
  { id: 'mirror-island', name: 'האי המראה', creatureName: 'השודדים־תאומים', description: 'בכל פעם שמסתכלים במראה רואים שודד נוסף, בדיוק כמוכם, רק קצת יותר מצחיק.' },
  { id: 'music-reef', name: 'שונית המוזיקה', creatureName: 'סרטני הזמר', description: 'סרטנים שמנגנים על הצדפים שלהם ומתחרים כל הזמן מי שר יותר יפה.' },
  { id: 'candy-cay', name: 'האי המתוק', creatureName: 'דקלי הסוכריות', description: 'דקלים שמלאים סוכריות, אבל מזהירים אתכם מראש: לא לאכול הכל בבת אחת!' },
  { id: 'sleepy-shore', name: 'החוף הישנוני', creatureName: 'עצלני הים', description: 'עצלנים שמתעוררים בקושי פעם בחודש, ורק בשביל לפהק קצת.' },
  { id: 'diamond-dunes', name: 'חולות היהלום', creatureName: 'לטאות עיני־יהלום', description: 'לטאות שעיניהן עשויות יהלום אמיתי, ומאוד מאוד אוהבות שמשבחים אותן.' },
  { id: 'honeycomb-isle', name: 'אי הכוורת', creatureName: 'דבורים ענקיות וידידותיות', description: 'דבורים גדולות כמו ספינות שמסתבר שהן ביישניות מאוד מאוד.' },
  { id: 'whisper-wood', name: 'יער הלחישות', creatureName: 'העצים המדברים', description: 'עצים שלוחשים סודות עתיקים, אבל כל הסודות הם בעצם על מזג האוויר.' },
  { id: 'rainbow-reef', name: 'שונית הקשת', creatureName: 'להקת דגי הצבעים', description: 'דגים בכל הצבעים שמחליפים מקומות כל כמה שניות, רק כדי לבלבל אתכם.' },
  { id: 'stormy-spit', name: 'לשון הסערה', creatureName: 'סרטן המטרייה', description: 'סרטן קטן עם מטרייה אחת קטנה שמשוכנע שהיא מספיקה לכל האי.' },
  { id: 'cocoa-coast', name: 'חוף השוקו', creatureName: 'דובי השוקולד', description: 'דובים עם פרווה בצבע שוקולד שמסבירים בכל הזדמנות שזה לא שוקולד אמיתי.' },
  { id: 'origami-isle', name: 'אי האוריגמי', creatureName: 'ציפורי הנייר', description: 'ציפורים מקופלות מנייר שמתעופפות נהדר, אבל מסרבות בכל תוקף להירטב.' },
  { id: 'carnival-cove', name: 'מפרץ הקרקס', creatureName: 'כלב־ים המופע', description: 'כלב־ים שמכיר חמישה טריקים, ומתעקש להראות לכם את כולם בכל ביקור.' },
  { id: 'library-atoll', name: 'אי הספרייה', creatureName: 'הינשוף הקורא', description: 'ינשוף שקרא את כל הספרים בים, אבל עדיין לא מצא את הסוף של אחד מהם.' },
  { id: 'mosaic-bay', name: 'מפרץ הפסיפס', creatureName: 'התמנון המרצף', description: 'תמנון עם דוגמת אריחים על הגוף, שמשנה את הצבעים בכל פעם שמסתכלים הצידה.' },
  { id: 'spaghetti-strait', name: 'מצר הספגטי', creatureName: 'מדוזת האטריות', description: 'מדוזה עם זרועות ארוכות כמו אטריות, שלא בטוחה אם היא חיה או ארוחת צהריים.' },
  { id: 'cactus-key', name: 'אי הקקטוס', creatureName: 'תוכי הקקטוסים', description: 'תוכי שודד שגר בתוך קקטוס וצוחק על כל מי שמנסה לשבת לידו.' },
  { id: 'bubble-bay', name: 'מפרץ הבועות', creatureName: 'צפרדעי הבועות', description: 'צפרדעים שמרחפות בתוך בועות סבון גדולות, ולא תמיד מחליטות לאן הן רוצות לעוף.' },
  { id: 'lonely-lighthouse', name: 'המגדלור הבודד', creatureName: 'שומר המגדלור', description: 'שחף ששומר על המגדלור הזקן, ובדיוק עכשיו מאוד רוצה למצוא חבר חדש.' },
  { id: 'velvet-volcano', name: 'הר הגעש הקטיפתי', creatureName: 'שבלולי הלבה', description: 'שבלולים ענקיים שמבעירים לבה סגולה לאט מאוד מאוד, כי הם פשוט שבלולים.' },
  { id: 'pancake-point', name: 'קצה הפנקייק', creatureName: 'דוב הבוקר הישן', description: 'דוב שישן על מגדל סלעים שנראה בדיוק כמו ערימת פנקייקים, ולא מוכן לקבל הסבר אחר.' },
  { id: 'echo-cliff', name: 'צוק ההד', creatureName: 'העז המיודלת', description: 'עז שצועקת לעצמה כדי לשמוע הד, ומתווכחת עם עצמה כל היום בלי להתעייף.' },
  { id: 'pearl-pond', name: 'בריכת הפנינה', creatureName: 'צדפות עם אופי', description: 'צדפות שכל אחת חושבת שהפנינה שלה היא הכי יפה והכי גדולה. לא להגיד להן אחרת!' },
  { id: 'flag-forest', name: 'יער הדגלים', creatureName: 'עצי הדגלים', description: 'עצים שצומחים עם דגלים במקום עלים, ולכל אחד מהם יש דגל בצבע משלו.' },
  { id: 'last-lagoon', name: 'הלגונה האחרונה', creatureName: 'דרקון הים הידידותי', description: 'דרקון ים גדול ועתיק שמברך לשלום כל מי שהגיע אליו ביחד עם המשפחה.' },
];

const COASTAL_FINDS = [
  { id: 'bottle-message', name: 'בקבוק עם פתק' },
  { id: 'friendly-gull', name: 'שחף ידידותי' },
  { id: 'drifting-hat', name: 'כובע צף' },
  { id: 'mystery-crate', name: 'ארגז מסתורי' },
  { id: 'leaping-fish', name: 'דג קופץ' },
  { id: 'brass-key', name: 'מפתח נחושת' },
  { id: 'rubber-duck', name: 'ברווז גומי' },
  { id: 'seaweed-snail', name: 'חילזון על אצות' },
  { id: 'lonely-sock', name: 'גרב בודד' },
  { id: 'rolled-scroll', name: 'מגילה מגולגלת' },
  { id: 'coin-purse', name: 'ארנק מטבעות' },
  { id: 'music-box', name: 'תיבת נגינה קטנה' },
  { id: 'single-boot', name: 'מגף בודד' },
  { id: 'mini-telescope', name: 'משקפת קטנה' },
  { id: 'paper-boat', name: 'סירת נייר עם שודד פצפון' },
];

window.ISLANDS = ISLANDS;
window.COASTAL_FINDS = COASTAL_FINDS;
