# Ma'aser Tracker - Product Descriptions

Shareable product descriptions for different audiences and formats.
Use the version that best fits where you are sharing.

---

## 1. One-Liner (~20 words)

### English

Ma'aser Tracker is a free app that helps you track income, donations, and your 10% obligation -- privately, from any device. Try it: https://dubiwork.github.io/maaser-tracker/

### Hebrew

<div dir="rtl">

מעקב מעשר -- אפליקציה חינמית לניהול הכנסות, תרומות וחובת המעשר שלך, בפרטיות מלאה ומכל מכשיר. נסו עכשיו: https://dubiwork.github.io/maaser-tracker/

</div>

---

## 2. Paragraph (~200 words, for community bulletins and social media)

### English

**Ma'aser Tracker** is a free app that makes it simple to keep track of your ma'aser -- the 10% of income we set aside for tzedakah. You enter your income and donations, and the app calculates what you owe, what you have given, and where you stand. It works in both Hebrew and English, and you can install it on your phone, tablet, or computer like a regular app.

What makes it different is the approach to privacy. Your financial data stays on your device. There is no account to create, no login required, and nothing is sent to a server unless you choose to enable cloud sync later. It also works offline, so you can update your records anytime -- even without an internet connection.

Whether you track ma'aser on paper, in a spreadsheet, or just try to keep it in your head, this app is meant to make that easier. It is built for families who want a clear, honest picture of their giving without handing their financial information to a third party.

It is completely free, with no ads and no paid tiers. Give it a try at https://dubiwork.github.io/maaser-tracker/

### Hebrew

<div dir="rtl">

**מעקב מעשר** היא אפליקציה חינמית שעוזרת לנהל את חשבון המעשר בצורה פשוטה ונוחה. מזינים הכנסות ותרומות, והאפליקציה מחשבת בדיוק כמה חובת מעשר נותרה, כמה כבר נתרם, ומה המצב הכולל. האפליקציה פועלת בעברית ובאנגלית, וניתן להתקין אותה על הטלפון, הטאבלט או המחשב כמו אפליקציה רגילה.

הדבר שמייחד את האפליקציה הוא הגישה לפרטיות. הנתונים הפיננסיים שלכם נשארים על המכשיר שלכם. אין צורך ליצור חשבון, אין צורך בהתחברות, ושום מידע לא נשלח לשרת חיצוני אלא אם בוחרים להפעיל סנכרון ענן בהמשך. האפליקציה פועלת גם ללא חיבור לאינטרנט, כך שאפשר לעדכן רשומות בכל זמן.

בין אם אתם עוקבים אחרי המעשר על דף, באקסל, או פשוט בראש -- האפליקציה הזו נבנתה כדי להקל על התהליך. היא מיועדת למשפחות שרוצות תמונה ברורה של הנתינה שלהן, בלי למסור מידע פיננסי לגורם חיצוני.

האפליקציה חינמית לחלוטין, ללא פרסומות וללא מסלולים בתשלום. נסו עכשיו: https://dubiwork.github.io/maaser-tracker/

</div>

---

## 3. Technical Brief (~300 words, for developer communities)

### English

**Ma'aser Tracker** is an open-source Progressive Web App for tracking Jewish charitable giving obligations (ma'aser -- 10% of income). It is designed as a privacy-first, offline-capable tool that runs entirely in the browser.

**Tech stack:** React 19, Vite 7, Material-UI 6, IndexedDB (via `idb`), Firebase (optional cloud sync), React Query for data access. The app is fully bilingual (Hebrew RTL / English LTR) with a custom context-based i18n system.

**Privacy model:** By default, all data is stored locally in IndexedDB. No account creation, no server calls, no telemetry. Users who want multi-device sync can opt in to Firebase Firestore, with GDPR-compliant consent and the ability to delete cloud data at any time. Firebase API keys are public by design; security is enforced through Firestore rules that restrict access to authenticated users reading only their own data.

**Quality and testing:** The project has over 2,100 automated tests (Vitest + jsdom for unit/integration, Playwright for end-to-end regression). Service-layer coverage is enforced at 80% or higher. CI runs on every pull request via GitHub Actions, and the regression suite runs daily against both staging and production.

**Architecture highlights:**
- Offline-first with service worker (Workbox via vite-plugin-pwa)
- Migration engine for IndexedDB-to-Firestore with batch processing, exponential backoff, and progress tracking
- CSV import/export for data portability
- PWA installable on iOS, Android, and desktop
- Dual deployment: GitHub Pages (production) + Netlify (preview/staging)

The project follows an epic-branch model with sub-issue PRs, automated code review, and a staged rollout process (feature branch, epic branch, develop, staging bake, main).

Contributions are welcome. The issue board is actively maintained, and issues are groomed with acceptance criteria and test plans. See the repository for contributing guidelines.

**Repository:** https://github.com/DubiWork/maaser-tracker
**Live app:** https://dubiwork.github.io/maaser-tracker/
**License:** MIT

### Hebrew

<div dir="rtl">

**מעקב מעשר** היא אפליקציית קוד פתוח מסוג Progressive Web App למעקב אחר חובת מעשר (10% מההכנסה). האפליקציה תוכננה עם דגש על פרטיות ויכולת עבודה אופליין, והיא רצה במלואה בדפדפן.

**מחסנית טכנולוגית:** React 19, Vite 7, Material-UI 6, IndexedDB (דרך `idb`), Firebase (סנכרון ענן אופציונלי), React Query לניהול נתונים. האפליקציה דו-לשונית (עברית RTL / אנגלית LTR) עם מערכת תרגום מבוססת Context.

**מודל פרטיות:** כברירת מחדל, כל הנתונים נשמרים מקומית ב-IndexedDB. אין יצירת חשבון, אין קריאות לשרת, אין טלמטריה. משתמשים שרוצים סנכרון בין מכשירים יכולים להצטרף ל-Firebase Firestore, עם הסכמה תואמת GDPR ואפשרות למחוק נתוני ענן בכל עת. האבטחה נאכפת דרך Firestore Rules שמגבילים גישה למשתמשים מאומתים בלבד.

**איכות ובדיקות:** הפרויקט כולל מעל 2,100 בדיקות אוטומטיות (Vitest + jsdom ליחידה/אינטגרציה, Playwright לרגרסיית end-to-end). כיסוי שכבת השירותים נאכף ברמה של 80% ומעלה. CI רץ על כל Pull Request דרך GitHub Actions, וחבילת הרגרסיה רצה יומית מול סביבות staging ו-production.

**נקודות ארכיטקטורה:**
- Offline-first עם Service Worker (Workbox דרך vite-plugin-pwa)
- מנוע מיגרציה מ-IndexedDB ל-Firestore עם עיבוד באצוות, backoff מעריכי ומעקב התקדמות
- ייבוא/ייצוא CSV לניידות נתונים
- PWA שניתן להתקנה על iOS, Android ו-desktop
- פריסה כפולה: GitHub Pages (ייצור) + Netlify (preview/staging)

הפרויקט עובד עם מודל epic-branch עם PR לתתי-משימות, סקירת קוד אוטומטית ותהליך שחרור מדורג. תרומות קוד יתקבלו בשמחה -- לוח המשימות מתוחזק באופן שוטף עם קריטריונים ותוכניות בדיקה. ראו את המאגר לפרטים נוספים.

**מאגר:** https://github.com/DubiWork/maaser-tracker
**אפליקציה:** https://dubiwork.github.io/maaser-tracker/
**רישיון:** MIT

</div>
