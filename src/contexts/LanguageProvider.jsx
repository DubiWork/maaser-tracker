import { useState, useMemo, useCallback } from 'react';
import { LanguageContext } from './LanguageContext';

const LANGUAGE_STORAGE_KEY = 'maaser-tracker-language';

function getInitialLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'he' || saved === 'en') return saved;
  } catch {
    // localStorage unavailable (e.g. private browsing in some browsers)
  }
  return 'he';
}

const translations = {
  he: {
    appName: 'מעקב מעשר',
    dashboard: 'לוח בקרה',
    addIncome: 'הוסף הכנסה',
    addDonation: 'הוסף תרומה',
    history: 'היסטוריה',

    // Dashboard - All-Time Totals
    allTimeTotals: 'סך הכל מתחילת המעקב',
    totalIncome: 'סך הכל הכנסות',
    totalMaaserOwed: 'סך הכל מעשר חובה',
    totalDonatedAllTime: 'סך הכל נתרם',
    maaserBalance: 'יתרת מעשר',
    youOwe: 'חוב מעשר',
    youHaveCredit: 'זכות',
    allCurrent: 'מעודכן',

    // Dashboard - Celebration-Focused
    donationCelebration: 'תרמת {amount} במעשר!',
    maaserTenPercent: 'מעשר (10%)',
    progress: 'התקדמות',
    donationProgress: 'התקדמות תרומות',
    moreToComplete: 'עוד {amount} להשלמת התקופה',
    allCurrentCelebration: 'מדהים! הכל מעודכן!',
    aheadCelebration: 'מדהים! קדמת ב-{amount}!',
    encouragementAlmostThere: 'כמעט שם! אתה יכול!',
    encouragementGreat: 'התקדמות מצוינת! המשך כך!',
    encouragementGood: 'אתה עושה טוב!',
    encouragementStart: 'כל תרומה נחשבת!',
    encouragementComplete: 'מושלם! כל הכבוד!',

    // Dashboard - This Month
    thisMonth: 'החודש',
    incomeThisMonth: 'הכנסות החודש',
    maaserOwedThisMonth: 'מעשר החודש',
    donatedThisMonth: 'נתרם החודש',
    netChangeThisMonth: 'שינוי נטו',

    // Dashboard - Legacy (for backwards compatibility)
    maaserOwed: 'מעשר לתשלום',
    totalDonated: 'סה"כ נתרם',
    remainingToDonate: 'נותר לתרום',
    noDataYet: 'אין נתונים עדיין',
    addFirstIncome: 'הוסף את ההכנסה הראשונה שלך',

    // Forms
    date: 'תאריך',
    paymentDate: 'תאריך תשלום',
    accountingMonth: 'חודש חשבונאי',
    accountingMonthHelper: 'החודש שאליו משויכת ההכנסה/תרומה לצורך חישוב מעשר',
    amount: 'סכום',
    amountInShekels: 'סכום (₪)',
    calculatedMaaser: 'מעשר מחושב',
    save: 'שמור',
    cancel: 'ביטול',
    delete: 'מחק',
    edit: 'ערוך',

    // History
    income: 'הכנסה',
    donation: 'תרומה',
    maaser: 'מעשר',
    noEntries: 'אין רשומות',
    confirmDelete: 'האם למחוק רשומה זו?',
    yes: 'כן',
    no: 'לא',
    paidOn: 'שולם ב-',

    // Validation
    amountRequired: 'נא להזין סכום',
    invalidAmount: 'סכום לא תקין',
    noteTooLong: 'ההערה חייבת להיות עד 500 תווים',

    // Months
    months: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],

    // Notes
    note: 'הערה',
    noteOptional: 'הערה (אופציונלי)...',

    // Errors & Loading
    loading: 'טוען...',
    errorOccurred: 'אירעה שגיאה',
    errorMessage: 'אירעה שגיאה בלתי צפויה. אנא נסה שוב.',
    tryAgain: 'נסה שוב',
    browserNotSupported: 'דפדפן לא נתמך',
    indexedDBRequired: 'האפליקציה דורשת IndexedDB שאינו זמין בדפדפן שלך.',
    useSupportedBrowser: 'אנא השתמש בדפדפן מודרני כמו Chrome, Firefox, Safari או Edge.',
    migrationFailed: 'ההעברה נכשלה',
    migrationErrorMessage: 'נכשלה העברת הנתונים למערכת האחסון החדשה.',
    downloadBackup: 'הורד גיבוי',

    // Install Prompt
    installApp: 'התקן אפליקציה',
    install: 'התקן',
    notNow: 'לא עכשיו',
    installMessage: 'התקן את האפליקציה לחוויה הטובה ביותר',
    iosInstallInstructions: 'להתקנת האפליקציה באייפון או אייפד:',
    iosStep1: '1. לחץ על כפתור השיתוף',
    iosStep1Hint: 'בתחתית Safari',
    iosStep2: '2. לחץ על "הוסף למסך הבית"',
    iosStep2Hint: 'גלול למטה בתפריט',
    iosStep3: '3. לחץ על "הוסף"',
    iosStep3Hint: 'אשר את ההתקנה',
    gotIt: 'הבנתי',

    // Connection Status
    offline: 'אופליין',
    offlineMessage: 'אין חיבור לאינטרנט. השינויים יישמרו מקומית.',
    backOnline: 'חזרת לאינטרנט',

    // Authentication
    signIn: 'התחבר',
    signOut: 'התנתק',
    signInTitle: 'התחבר לגישה מכל מקום',
    signInWithGoogle: 'התחבר עם Google',
    signInBenefitDevices: 'גישה מכל מכשיר (טלפון, טאבלט, מחשב)',
    signInBenefitBackup: 'גיבוי אוטומטי בענן (לעולם לא תאבד נתונים)',
    signInBenefitSync: 'סנכרון בין מכשירים (הנתונים שלך בכל מקום)',
    signInCurrentStatus: 'כרגע: אחסון מקומי בלבד',
    signInPrivacyNote: 'הנתונים שלך פרטיים ומוצפנים',
    continueWithoutSignIn: 'המשך ללא התחברות',
    userProfile: 'פרופיל משתמש',
    syncStatusSynced: 'מסונכרן',
    syncStatusLocalOnly: 'מקומי בלבד',
    syncedToCloud: 'מסונכרן לענן',
    syncing: 'מסנכרן...',
    syncFailed: 'הסנכרון נכשל',
    signInError: 'שגיאה בהתחברות',
    signOutError: 'שגיאה בהתנתקות',
    signInCancelled: 'ההתחברות בוטלה',
    popupBlocked: 'חלון ההתחברות נחסם. אנא אפשר חלונות קופצים לאתר זה.',
    networkError: 'שגיאת רשת. אנא בדוק את חיבור האינטרנט.',
    privacyPolicyLink: 'מדיניות פרטיות',

    // Data Management - GDPR
    dataManagement: {
      title: 'ניהול נתונים',
      exportMyData: 'ייצוא הנתונים שלי',
      deleteCloudData: 'מחיקת נתוני הענן',
      // Export dialog
      exportTitle: 'ייצוא הנתונים שלך',
      exportDescription: 'הורד את כל הנתונים שלך כקובץ JSON. זה כולל את כל ההכנסות והתרומות שנשמרו בענן.',
      exportingProgress: 'מייצא...',
      exportSuccess: 'הייצוא הושלם!',
      exportSuccessMessage: '{count} רשומות יוצאו בהצלחה.',
      exportFileName: 'שם הקובץ: {filename}',
      exportError: 'הייצוא נכשל',
      exportErrorMessage: 'לא ניתן היה לייצא את הנתונים שלך. אנא נסה שוב.',
      // Delete dialog
      deleteTitle: 'מחיקת נתוני הענן',
      deleteWarning: 'פעולה זו תמחק לצמיתות את כל הנתונים שלך מהענן. הנתונים המקומיים במכשיר זה לא יושפעו.',
      deleteConfirmation: 'הפעולה הזו לא ניתנת לביטול. כל הנתונים שלך בענן יימחקו לצמיתות.',
      iUnderstandCheckbox: 'אני מאשר/ת שלא ניתן לבטל פעולה זו',
      deletingProgress: 'מוחק...',
      deleteSuccess: 'נתוני הענן נמחקו',
      deleteSuccessMessage: 'כל נתוני הענן שלך נמחקו לצמיתות. הנתונים המקומיים במכשיר זה לא השתנו.',
      deleteError: 'המחיקה נכשלה',
      deleteErrorMessage: 'לא ניתן היה למחוק את נתוני הענן שלך. אנא נסה שוב.',
      // Common
      close: 'סגור',
      download: 'הורד',
    },

    // Privacy Policy
    privacyPolicy: {
      title: 'מדיניות פרטיות',
      lastUpdated: 'עודכן לאחרונה: מרץ 2026',
      sections: {
        introduction: {
          title: 'מבוא',
          content: 'מעקב מעשר ("האפליקציה") היא אפליקציית ווב מתקדמת (PWA) למעקב אחר נתינת מעשר — 10% מההכנסה לצדקה, בהתאם למסורת היהודית. האפליקציה מופעלת כפרויקט קוד פתוח וזמינה בכתובת https://dubiwork.github.io/maaser-tracker/. מדיניות פרטיות זו מסבירה אילו נתונים אנו אוספים, כיצד אנו מאחסנים ומשתמשים בהם, ומהן הזכויות שלך בנוגע למידע שלך.',
        },
        dataWeCollect: {
          title: 'נתונים שאנו אוספים',
          content: 'האפליקציה אוספת אך ורק את הנתונים הדרושים לתפקודה:',
          items: [
            'רשומות הכנסה ותרומה — סכומים, תאריכים, והערות שאתה מזין',
            'פרטי חשבון Google — כתובת דוא"ל, שם תצוגה ותמונת פרופיל (רק אם בחרת להתחבר באמצעות Google Sign-In)',
            'העדפת שפה — עברית או אנגלית',
          ],
          noCollection: 'האפליקציה אינה משתמשת בעוגיות (cookies), כלי ניתוח (analytics), מעקב צד שלישי, או פרסום מכל סוג שהוא.',
        },
        howWeStore: {
          title: 'כיצד אנו מאחסנים את הנתונים שלך',
          content: 'הנתונים שלך מאוחסנים בשתי דרכים, בהתאם לבחירתך:',
          items: [
            'אחסון מקומי (IndexedDB) — הנתונים נשמרים במכשיר שלך בלבד, כברירת מחדל. שום מידע לא נשלח לשרת חיצוני אלא אם בחרת במפורש לסנכרן לענן.',
            'אחסון בענן (Firebase Firestore) — אם בחרת לסנכרן את הנתונים שלך, הם מאוחסנים ב-Google Cloud (Firebase) בשרתים בארצות הברית. הסנכרון מתבצע רק לאחר הסכמתך המפורשת.',
            'אימות (Firebase Authentication) — אם התחברת באמצעות Google, פרטי האימות שלך מנוהלים על ידי שירות Firebase Authentication של Google.',
          ],
        },
        howWeUse: {
          title: 'כיצד אנו משתמשים בנתונים שלך',
          content: 'הנתונים שלך משמשים אך ורק לתפקוד האפליקציה — חישוב יתרת מעשר, הצגת היסטוריה וסנכרון בין מכשירים. אנחנו לא מוכרים, משתפים או מעבירים את הנתונים שלך לצד שלישי כלשהו, לעולם לא. אין לנו גישה לנתוני המשתמשים, ואנו לא מנתחים אותם למטרות שיווק או מסחריות.',
        },
        yourRights: {
          title: 'הזכויות שלך (GDPR)',
          content: 'בהתאם לתקנת הגנת המידע הכללית (GDPR) ולחוקי פרטיות רלוונטיים אחרים, עומדות לך הזכויות הבאות:',
          items: [
            'זכות גישה — תוכל לצפות בכל הנתונים שלך בכל עת דרך האפליקציה.',
            'זכות לניידות מידע (סעיף 20) — תוכל לייצא את כל הנתונים שלך כקובץ JSON דרך תפריט "ייצוא הנתונים שלי" בפרופיל המשתמש.',
            'זכות למחיקה (סעיף 17) — תוכל למחוק את כל נתוני הענן שלך לצמיתות דרך תפריט "מחיקת נתוני הענן" בפרופיל המשתמש.',
            'זכות לביטול הסכמה — תוכל לבטל את הסכמתך לסנכרון ענן בכל עת. הנתונים המקומיים שלך יישארו זמינים במכשיר.',
          ],
          implementation: 'כל הזכויות הללו מיושמות ישירות באפליקציה ואינן דורשות יצירת קשר עם המפתח.',
        },
        dataSecurity: {
          title: 'אבטחת מידע',
          content: 'אנו נוקטים באמצעים הבאים להגנה על הנתונים שלך:',
          items: [
            'כל התקשורת עם הענן מתבצעת דרך HTTPS מוצפן.',
            'כללי אבטחה של Firestore מבטיחים שכל משתמש יכול לגשת אך ורק לנתונים שלו.',
            'גישה לנתונים מוגבלת לפי זיהוי משתמש (user-scoped access) — אף משתמש אחר או מנהל מערכת לא יכול לצפות בנתונים שלך.',
          ],
        },
        children: {
          title: 'פרטיות ילדים',
          content: 'האפליקציה אינה מיועדת לילדים מתחת לגיל 13. אנו לא אוספים ביודעין מידע אישי מילדים. אם נודע לך שילד מסר מידע אישי דרך האפליקציה, אנא צור איתנו קשר ונמחק את המידע.',
        },
        changes: {
          title: 'שינויים במדיניות זו',
          content: 'אנו עשויים לעדכן מדיניות פרטיות זו מעת לעת. שינויים יפורסמו בעמוד זה עם עדכון תאריך "עודכן לאחרונה". שימוש מתמשך באפליקציה לאחר פרסום שינויים מהווה הסכמה למדיניות המעודכנת.',
        },
        contact: {
          title: 'יצירת קשר',
          content: 'לשאלות או בקשות בנוגע למדיניות פרטיות זו או לנתונים שלך, ניתן לפנות אלינו דרך עמוד הפרויקט ב-GitHub:',
          link: 'https://github.com/DubiWork/maaser-tracker/issues',
        },
      },
    },

    // Migration - Cloud Sync
    syncToCloud: 'לסנכרן לענן',
    keepLocalOnly: 'להשאיר מקומי בלבד',
    migration: {
      seconds: 'שניות',
      minutes: 'דקות',
      consent: {
        title: 'האם לסנכרן את הנתונים שלך לענן?',
        body: 'נעלה {count} רשומות ל-Firebase כדי שתוכל לגשת אליהן מכל מכשיר.',
        whatData: 'אילו נתונים יעובדו?',
        dataAmounts: 'סכומים, תאריכים, תיאורים',
        whereStored: 'איפה זה יאוחסן?',
        storageLocation: 'Google Cloud (Firebase) - ארה"ב',
        yourRights: 'הזכויות שלך:',
        rightCancel: 'לבטל סנכרון בכל עת',
        rightDelete: 'למחוק את כל הנתונים בענן',
        rightBackup: 'גיבוי מקומי למשך 90 יום',
        privacyPolicy: 'מדיניות פרטיות',
        decline: 'להשאיר מקומי בלבד',
        accept: 'לסנכרן לענן',
      },
      warnings: {
        large: 'יש לך {count} רשומות ({size} KB). הסנכרון ייקח כ-{time} שניות. מומלץ לחבר ל-WiFi.',
        veryLarge: 'יש לך {count} רשומות! זה ייקח מספר דקות. מומלץ מאוד: WiFi, סוללה מלאה, להשאיר את האפליקציה פתוחה.',
      },
      progress: {
        title: 'מסנכרן את הנתונים שלך',
        inProgress: 'מסנכרן {completed} מתוך {total} רשומות...',
        estimatedTime: 'זמן משוער: {time}',
      },
      cancel: {
        confirmTitle: 'לבטל סנכרון?',
        confirmMessage: 'האם אתה בטוח שברצונך לבטל? הנתונים המקומיים שלך יישארו בטוחים, אך הסנכרון לענן ייפסק.',
        continueSync: 'להמשיך סנכרון',
        confirm: 'כן, לבטל',
      },
      success: {
        title: 'הסנכרון הושלם!',
        complete: '{count} רשומות סונכרנו בהצלחה!',
        message: 'הנתונים שלך עכשיו זמינים מכל מכשיר.',
      },
      cancelled: {
        title: 'הסנכרון בוטל',
        message: 'הסנכרון בוטל. הנתונים שלך נשארים מאוחסנים רק במכשיר זה.',
        backupNotice: 'גיבוי מקומי יישמר למשך 90 יום לצורך בטיחות. ניתן למחוק בכל עת בהגדרות.',
      },
      errors: {
        title: 'בעיה בסנכרון',
        pausedTitle: 'הסנכרון הושהה',
        networkFailure: 'הסנכרון הושהה זמנית. נמשיך אוטומטית כשתחזור החיבור לאינטרנט.',
        quotaExceeded: 'שירות הענן זמנית מלא. הנתונים שלך בטוחים. נסה שוב בעוד שעה.',
        authExpired: 'הזדהות פגה תוקף. יש להתחבר מחדש כדי להמשיך בסנכרון.',
        offline: 'אתה במצב לא מקוון. אנא התחבר לאינטרנט כדי לסנכרן את הנתונים שלך.',
        unknown: 'משהו השתבש. הנתונים שלך בטוחים. אם הבעיה נמשכת, צור קשר עם התמיכה.',
        dataSafe: 'הנתונים המקומיים שלך בטוחים ולא השתנו.',
        signInAgain: 'התחבר שוב',
        tryLater: 'נסה מאוחר יותר',
      },
    },

    // Settings
    settings: {
      title: 'הגדרות',
      back: 'חזרה',

      // General section
      general: 'כללי',
      language: 'שפה',
      languageHebrew: 'עברית',
      languageEnglish: 'אנגלית',
      currency: 'מטבע',
      currencyILS: 'שקל ישראלי',
      currencyUSD: 'דולר אמריקאי',
      currencyEUR: 'אירו',
      currencyGBP: 'לירה שטרלינג',

      // Ma'aser calculation section
      maaserCalculation: 'חישוב מעשר',
      currentPercentage: 'אחוז נוכחי',
      defaultPercentage: 'ברירת מחדל (10%)',
      customPercentage: 'אחוז מותאם אישית',
      newPercentage: 'אחוז חדש',
      effectiveFrom: 'בתוקף מתאריך',
      updatePercentage: 'עדכן אחוז',
      percentageHistory: 'היסטוריית אחוזים',
      confirmPercentageChange: 'שינוי אחוז מעשר',
      confirmPercentageMessage: 'האם לשנות את אחוז המעשר ל-{percentage}% החל מ-{date}?',
      percentagePeriodLabel: '{percentage}% החל מ-{date}',

      // Appearance section
      appearance: 'מראה',
      theme: 'ערכת נושא',
      themeLight: 'בהיר',
      themeDark: 'כהה',
      themeSystem: 'ברירת מחדל של המערכת',

      // Data management section
      dataManagementTitle: 'ניהול נתונים',
      exportData: 'ייצוא נתונים',
      importData: 'ייבוא נתונים',
      clearData: 'מחיקת נתונים',
      deleteAccount: 'מחיקת חשבון',
      clearDataConfirm: 'האם אתה בטוח שברצונך למחוק את כל הנתונים?',
      deleteAccountConfirm: 'האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו לא ניתנת לביטול.',
      actionCannotBeUndone: 'פעולה זו לא ניתנת לביטול',

      // Cloud Data & Privacy section (GDPR)
      cloudDataPrivacy: {
        title: 'נתוני ענן ופרטיות',
        description: 'ייצוא או מחיקת נתוני הענן שלך',
        exportMyData: 'ייצוא הנתונים שלי',
        exportDescription: 'הורד את כל נתוני הענן שלך כקובץ JSON',
        deleteAllData: 'מחיקת כל הנתונים',
        deleteDescription: 'מחק לצמיתות את כל נתוני הענן שלך',
        signInToManage: 'התחבר/י כדי לנהל את נתוני הענן שלך',
        deleteLocalData: 'מחיקת נתונים מקומיים',
        deleteLocalDescription: 'מחק את כל הרשומות השמורות במכשיר זה',
        deleteLocalWarning: 'פעולה זו תמחק לצמיתות את כל הרשומות השמורות במכשיר זה. פעולה זו לא ניתנת לביטול.',
        deleteLocalConfirmCheckbox: 'אני מבין/ה שכל הנתונים המקומיים שלי יימחקו לצמיתות',
        deleteLocalSuccess: 'כל הנתונים המקומיים נמחקו בהצלחה',
        deleteLocalButton: 'מחק נתונים מקומיים',
      },

      // About section
      about: 'אודות',
      version: 'גרסה',
      privacyPolicy: 'מדיניות פרטיות',
      termsOfService: 'תנאי שימוש',
      openSourceLicenses: 'רישיונות קוד פתוח',
      sourceCode: 'קוד מקור',

      // Success / Error messages
      settingsSaved: 'ההגדרות נשמרו',
      errorSavingSettings: 'שגיאה בשמירת ההגדרות',
      settingsReset: 'ההגדרות אופסו לברירות מחדל',
      errorLoadingSettings: 'שגיאה בטעינת ההגדרות',

      // Validation
      invalidPercentage: 'אחוז לא תקין',
      percentageRange: 'האחוז חייב להיות בין 1 ל-100',

      // Confirmation dialogs
      areYouSure: 'האם אתה בטוח?',
      confirm: 'אישור',

      // Import/Export (local data backup & restore)
      importExport: {
        sectionTitle: 'ניהול נתונים',
        sectionDescription: 'גיבוי, שחזור או העברת הנתונים שלך',
        // Export
        exportTitle: 'ייצוא נתונים',
        exportJSON: 'ייצוא JSON',
        exportCSV: 'ייצוא CSV',
        exportSuccess: 'הנתונים יוצאו בהצלחה',
        exportError: 'ייצוא הנתונים נכשל',
        exportEmpty: 'אין רשומות לייצוא',
        exportSecurityWarning: 'קובץ זה מכיל את הנתונים הפיננסיים שלך. שמור אותו במקום בטוח.',
        // Import
        importTitle: 'ייבוא נתונים',
        importButton: 'ייבוא מקובץ',
        importPreviewTitle: 'תצוגה מקדימה של ייבוא',
        importFileInfo: 'קובץ: {filename} ({size})',
        importValidEntries: '{count} רשומות תקינות',
        importInvalidEntries: '{count} רשומות לא תקינות',
        importShowInvalid: 'הצג רשומות לא תקינות',
        importHideInvalid: 'הסתר רשומות לא תקינות',
        // Conflict modes
        importModeMerge: 'מיזוג (הוסף הכל)',
        importModeMergeDesc: 'הוסף רשומות מיובאות לצד הנתונים הקיימים',
        importModeReplace: 'החלף הכל',
        importModeReplaceDesc: 'מחק את כל הנתונים הקיימים והחלף בנתונים המיובאים',
        importReplaceWarning: 'פעולה זו תמחק לצמיתות את כל הרשומות הקיימות שלך!',
        importReplaceConfirm: 'אני מבין/ה, החלף את כל הנתונים שלי',
        importAutoBackup: 'גיבוי של הנתונים הנוכחיים שלך יורד תחילה',
        // Progress & results
        importProgress: 'מייבא... {current}/{total}',
        importSuccess: '{count} רשומות יובאו בהצלחה',
        importError: 'ייבוא הנתונים נכשל',
        importInvalidFile: 'פורמט קובץ לא חוקי. אנא בחר קובץ JSON או CSV.',
        importFileTooLarge: 'הקובץ גדול מדי (מקסימום 10 MB)',
        importFileSizeWarning: 'קובץ גדול ({size}). הייבוא עשוי לקחת רגע.',
        // Common
        iosSaveHint: 'הקש על סמל השיתוף כדי לשמור את הקובץ',
        cancel: 'ביטול',
        import: 'ייבוא',
      },
    },
  },
  en: {
    appName: 'Maaser Tracker',
    dashboard: 'Dashboard',
    addIncome: 'Add Income',
    addDonation: 'Add Donation',
    history: 'History',

    // Dashboard - All-Time Totals
    allTimeTotals: 'All-Time Totals',
    totalIncome: 'Total Income',
    totalMaaserOwed: 'Total Ma\'aser Owed',
    totalDonatedAllTime: 'Total Donated',
    maaserBalance: 'Ma\'aser Balance',
    youOwe: 'You Owe',
    youHaveCredit: 'Credit',
    allCurrent: 'All Current',

    // Dashboard - Celebration-Focused
    donationCelebration: 'You\'ve donated {amount} in ma\'aser!',
    maaserTenPercent: 'Ma\'aser (10%)',
    progress: 'Progress',
    donationProgress: 'Donation Progress',
    moreToComplete: '{amount} more to complete this period',
    allCurrentCelebration: 'Amazing! You\'re all current!',
    aheadCelebration: 'Incredible! You\'re {amount} ahead!',
    encouragementAlmostThere: 'Almost there! You\'ve got this!',
    encouragementGreat: 'Great progress! Keep it up!',
    encouragementGood: 'You\'re doing well!',
    encouragementStart: 'Every bit counts!',
    encouragementComplete: 'Perfect! Well done!',

    // Dashboard - This Month
    thisMonth: 'This Month',
    incomeThisMonth: 'Income This Month',
    maaserOwedThisMonth: 'Ma\'aser This Month',
    donatedThisMonth: 'Donated This Month',
    netChangeThisMonth: 'Net Change',

    // Dashboard - Legacy (for backwards compatibility)
    maaserOwed: 'Ma\'aser Owed',
    totalDonated: 'Total Donated',
    remainingToDonate: 'Remaining to Donate',
    noDataYet: 'No data yet',
    addFirstIncome: 'Add your first income',

    // Forms
    date: 'Date',
    paymentDate: 'Payment Date',
    accountingMonth: 'Accounting Month',
    accountingMonthHelper: 'The month this income/donation counts toward for ma\'aser calculation',
    amount: 'Amount',
    amountInShekels: 'Amount (₪)',
    calculatedMaaser: 'Calculated Ma\'aser',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',

    // History
    income: 'Income',
    donation: 'Donation',
    maaser: 'Ma\'aser',
    noEntries: 'No entries',
    confirmDelete: 'Delete this entry?',
    yes: 'Yes',
    no: 'No',
    paidOn: 'Paid on ',

    // Validation
    amountRequired: 'Please enter an amount',
    invalidAmount: 'Invalid amount',
    noteTooLong: 'Note must not exceed 500 characters',

    // Months
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

    // Notes
    note: 'Note',
    noteOptional: 'Optional note...',

    // Errors & Loading
    loading: 'Loading...',
    errorOccurred: 'Something went wrong',
    errorMessage: 'An unexpected error occurred. Please try again.',
    tryAgain: 'Try Again',
    browserNotSupported: 'Browser Not Supported',
    indexedDBRequired: 'This app requires IndexedDB which is not available in your browser.',
    useSupportedBrowser: 'Please use a modern browser like Chrome, Firefox, Safari, or Edge.',
    migrationFailed: 'Migration Failed',
    migrationErrorMessage: 'Failed to migrate your data to the new storage system.',
    downloadBackup: 'Download Backup',

    // Install Prompt
    installApp: 'Install App',
    install: 'Install',
    notNow: 'Not Now',
    installMessage: 'Install for the best experience',
    iosInstallInstructions: 'To install this app on your iPhone or iPad:',
    iosStep1: '1. Tap the Share button',
    iosStep1Hint: 'At the bottom of Safari',
    iosStep2: '2. Tap "Add to Home Screen"',
    iosStep2Hint: 'Scroll down in the menu',
    iosStep3: '3. Tap "Add"',
    iosStep3Hint: 'Confirm the installation',
    gotIt: 'Got it',

    // Connection Status
    offline: 'Offline',
    offlineMessage: 'No internet connection. Changes will be saved locally.',
    backOnline: 'Back online',

    // Authentication
    signIn: 'Sign In',
    signOut: 'Sign Out',
    signInTitle: 'Sign in to unlock cloud features',
    signInWithGoogle: 'Sign in with Google',
    signInBenefitDevices: 'Access from any device (phone, tablet, PC)',
    signInBenefitBackup: 'Automatic cloud backup (never lose data)',
    signInBenefitSync: 'Multi-device sync (data everywhere)',
    signInCurrentStatus: 'Currently using: Local storage only',
    signInPrivacyNote: 'Your data is private and encrypted',
    continueWithoutSignIn: 'Continue without signing in',
    userProfile: 'User Profile',
    syncStatusSynced: 'Synced',
    syncStatusLocalOnly: 'Local only',
    syncedToCloud: 'Synced to cloud',
    syncing: 'Syncing...',
    syncFailed: 'Sync failed',
    signInError: 'Sign in error',
    signOutError: 'Sign out error',
    signInCancelled: 'Sign in cancelled',
    popupBlocked: 'Sign-in popup was blocked. Please allow popups for this site.',
    networkError: 'Network error. Please check your internet connection.',
    privacyPolicyLink: 'Privacy Policy',

    // Data Management - GDPR
    dataManagement: {
      title: 'Data Management',
      exportMyData: 'Export my data',
      deleteCloudData: 'Delete cloud data',
      // Export dialog
      exportTitle: 'Export Your Data',
      exportDescription: 'Download all your data as a JSON file. This includes all income and donation entries stored in the cloud.',
      exportingProgress: 'Exporting...',
      exportSuccess: 'Export Complete!',
      exportSuccessMessage: '{count} entries exported successfully.',
      exportFileName: 'File name: {filename}',
      exportError: 'Export Failed',
      exportErrorMessage: 'Could not export your data. Please try again.',
      // Delete dialog
      deleteTitle: 'Delete Cloud Data',
      deleteWarning: 'This will permanently delete all your data from the cloud. Local data on this device will not be affected.',
      deleteConfirmation: 'This action cannot be undone. All your cloud data will be permanently deleted.',
      iUnderstandCheckbox: 'I understand this action cannot be undone',
      deletingProgress: 'Deleting...',
      deleteSuccess: 'Cloud Data Deleted',
      deleteSuccessMessage: 'All your cloud data has been permanently deleted. Your local data on this device is unchanged.',
      deleteError: 'Delete Failed',
      deleteErrorMessage: 'Could not delete your cloud data. Please try again.',
      // Common
      close: 'Close',
      download: 'Download',
    },

    // Privacy Policy
    privacyPolicy: {
      title: 'Privacy Policy',
      lastUpdated: 'Last updated: March 2026',
      sections: {
        introduction: {
          title: 'Introduction',
          content: 'Ma\'aser Tracker ("the App") is a progressive web application (PWA) for tracking Jewish charitable giving — ma\'aser, the practice of donating 10% of one\'s income to charity. The App is operated as an open-source project and is available at https://dubiwork.github.io/maaser-tracker/. This Privacy Policy explains what data we collect, how we store and use it, and what rights you have regarding your information.',
        },
        dataWeCollect: {
          title: 'Data We Collect',
          content: 'The App collects only the data necessary for its functionality:',
          items: [
            'Income and donation entries — amounts, dates, and notes that you enter',
            'Google account information — email address, display name, and profile photo (only if you choose to sign in with Google Sign-In)',
            'Language preference — Hebrew or English',
          ],
          noCollection: 'The App does not use cookies, analytics, third-party tracking, or advertising of any kind.',
        },
        howWeStore: {
          title: 'How We Store Your Data',
          content: 'Your data is stored in two ways, depending on your choice:',
          items: [
            'Local storage (IndexedDB) — Your data is stored on your device only, by default. No information is sent to any external server unless you explicitly choose to sync to the cloud.',
            'Cloud storage (Firebase Firestore) — If you choose to sync your data, it is stored on Google Cloud (Firebase) servers in the United States. Syncing occurs only after your explicit consent.',
            'Authentication (Firebase Authentication) — If you sign in with Google, your authentication details are managed by Google\'s Firebase Authentication service.',
          ],
        },
        howWeUse: {
          title: 'How We Use Your Data',
          content: 'Your data is used solely for the App\'s functionality — calculating your ma\'aser balance, displaying history, and syncing across devices. We do not sell, share, or transfer your data to any third party, ever. We do not access user data, and we do not analyze it for marketing or commercial purposes.',
        },
        yourRights: {
          title: 'Your Rights (GDPR)',
          content: 'Under the General Data Protection Regulation (GDPR) and other applicable privacy laws, you have the following rights:',
          items: [
            'Right of access — You can view all your data at any time within the App.',
            'Right to data portability (Article 20) — You can export all your data as a JSON file via the "Export my data" option in your User Profile.',
            'Right to erasure (Article 17) — You can permanently delete all your cloud data via the "Delete cloud data" option in your User Profile.',
            'Right to withdraw consent — You can withdraw your consent to cloud sync at any time. Your local data will remain available on your device.',
          ],
          implementation: 'All of these rights are implemented directly within the App and do not require contacting the developer.',
        },
        dataSecurity: {
          title: 'Data Security',
          content: 'We take the following measures to protect your data:',
          items: [
            'All communication with the cloud is conducted over encrypted HTTPS.',
            'Firestore security rules ensure that each user can only access their own data.',
            'Data access is restricted by user identity (user-scoped access) — no other user or administrator can view your data.',
          ],
        },
        children: {
          title: 'Children\'s Privacy',
          content: 'The App is not directed at children under the age of 13. We do not knowingly collect personal information from children. If you become aware that a child has provided personal information through the App, please contact us and we will delete the information.',
        },
        changes: {
          title: 'Changes to This Policy',
          content: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Continued use of the App after changes are published constitutes acceptance of the updated policy.',
        },
        contact: {
          title: 'Contact',
          content: 'For questions or requests regarding this Privacy Policy or your data, you can reach us through the project\'s GitHub page:',
          link: 'https://github.com/DubiWork/maaser-tracker/issues',
        },
      },
    },

    // Migration - Cloud Sync
    syncToCloud: 'Sync to Cloud',
    keepLocalOnly: 'Keep Local Only',
    migration: {
      seconds: 'seconds',
      minutes: 'minutes',
      consent: {
        title: 'Sync Your Data to Cloud?',
        body: "We'll upload {count} entries to Firebase so you can access them from any device.",
        whatData: 'What data will be processed?',
        dataAmounts: 'Amounts, dates, descriptions',
        whereStored: 'Where will it be stored?',
        storageLocation: 'Google Cloud (Firebase) - United States',
        yourRights: 'Your rights:',
        rightCancel: 'Cancel migration anytime',
        rightDelete: 'Delete all cloud data',
        rightBackup: '90-day local backup',
        privacyPolicy: 'Privacy Policy',
        decline: 'Keep Local Only',
        accept: 'Sync to Cloud',
      },
      warnings: {
        large: 'You have {count} entries ({size} KB). Migration will take about {time} seconds. WiFi recommended.',
        veryLarge: 'You have {count} entries! This will take several minutes. Strongly recommended: WiFi, full battery, keep app open.',
      },
      progress: {
        title: 'Syncing Your Data',
        inProgress: 'Migrating {completed} of {total} entries...',
        estimatedTime: 'Estimated time: {time}',
      },
      cancel: {
        confirmTitle: 'Cancel Migration?',
        confirmMessage: 'Are you sure you want to cancel? Your local data will remain safe, but cloud sync will be stopped.',
        continueSync: 'Continue Syncing',
        confirm: 'Yes, Cancel',
      },
      success: {
        title: 'Sync Complete!',
        complete: '{count} entries synced successfully!',
        message: 'Your data is now available on all your devices.',
      },
      cancelled: {
        title: 'Migration Cancelled',
        message: 'Migration cancelled. Your data remains stored only on this device.',
        backupNotice: 'Local backup will be kept for 90 days for safety. You can delete it anytime in Settings.',
      },
      errors: {
        title: 'Migration Issue',
        pausedTitle: 'Migration Paused',
        networkFailure: "Migration paused. We'll continue automatically when you're back online.",
        quotaExceeded: 'Cloud storage temporarily full. Your data is safe. Try again in 1 hour.',
        authExpired: 'Sign-in expired. Please sign in again to continue syncing.',
        offline: "You're offline. Please connect to the internet to sync your data.",
        unknown: 'Something went wrong. Your data is safe. If this continues, contact support.',
        dataSafe: 'Your local data is safe and unchanged.',
        signInAgain: 'Sign In Again',
        tryLater: 'Try Later',
      },
    },

    // Settings
    settings: {
      title: 'Settings',
      back: 'Back',

      // General section
      general: 'General',
      language: 'Language',
      languageHebrew: 'Hebrew',
      languageEnglish: 'English',
      currency: 'Currency',
      currencyILS: 'Israeli Shekel',
      currencyUSD: 'US Dollar',
      currencyEUR: 'Euro',
      currencyGBP: 'British Pound',

      // Ma'aser calculation section
      maaserCalculation: 'Ma\'aser Calculation',
      currentPercentage: 'Current Percentage',
      defaultPercentage: 'Default (10%)',
      customPercentage: 'Custom percentage',
      newPercentage: 'New Percentage',
      effectiveFrom: 'Effective From',
      updatePercentage: 'Update Percentage',
      percentageHistory: 'Percentage History',
      confirmPercentageChange: 'Change Ma\'aser Percentage',
      confirmPercentageMessage: 'Change ma\'aser percentage to {percentage}% starting from {date}?',
      percentagePeriodLabel: '{percentage}% from {date}',

      // Appearance section
      appearance: 'Appearance',
      theme: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System Default',

      // Data management section
      dataManagementTitle: 'Data Management',
      exportData: 'Export Data',
      importData: 'Import Data',
      clearData: 'Clear Data',
      deleteAccount: 'Delete Account',
      clearDataConfirm: 'Are you sure you want to clear all data?',
      deleteAccountConfirm: 'Are you sure you want to delete your account? This action cannot be undone.',
      actionCannotBeUndone: 'This action cannot be undone',

      // Cloud Data & Privacy section (GDPR)
      cloudDataPrivacy: {
        title: 'Cloud Data & Privacy',
        description: 'Export or delete your cloud data',
        exportMyData: 'Export My Data',
        exportDescription: 'Download all your cloud data as a JSON file',
        deleteAllData: 'Delete All Data',
        deleteDescription: 'Permanently delete all your cloud data',
        signInToManage: 'Sign in to manage your cloud data',
        deleteLocalData: 'Delete Local Data',
        deleteLocalDescription: 'Delete all entries stored on this device',
        deleteLocalWarning: 'This will permanently delete all entries stored on this device. This action cannot be undone.',
        deleteLocalConfirmCheckbox: 'I understand all my local data will be permanently deleted',
        deleteLocalSuccess: 'All local data has been deleted successfully',
        deleteLocalButton: 'Delete Local Data',
      },

      // About section
      about: 'About',
      version: 'Version',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      openSourceLicenses: 'Open Source Licenses',
      sourceCode: 'Source Code',

      // Success / Error messages
      settingsSaved: 'Settings saved',
      errorSavingSettings: 'Error saving settings',
      settingsReset: 'Settings reset to defaults',
      errorLoadingSettings: 'Error loading settings',

      // Validation
      invalidPercentage: 'Invalid percentage',
      percentageRange: 'Percentage must be between 1 and 100',

      // Confirmation dialogs
      areYouSure: 'Are you sure?',
      confirm: 'Confirm',

      // Import/Export (local data backup & restore)
      importExport: {
        sectionTitle: 'Data Management',
        sectionDescription: 'Backup, restore, or transfer your data',
        // Export
        exportTitle: 'Export Data',
        exportJSON: 'Export JSON',
        exportCSV: 'Export CSV',
        exportSuccess: 'Data exported successfully',
        exportError: 'Failed to export data',
        exportEmpty: 'No entries to export',
        exportSecurityWarning: 'This file contains your financial data. Store it securely.',
        // Import
        importTitle: 'Import Data',
        importButton: 'Import from File',
        importPreviewTitle: 'Import Preview',
        importFileInfo: 'File: {filename} ({size})',
        importValidEntries: '{count} valid entries',
        importInvalidEntries: '{count} invalid entries',
        importShowInvalid: 'Show invalid entries',
        importHideInvalid: 'Hide invalid entries',
        // Conflict modes
        importModeMerge: 'Merge (Add All)',
        importModeMergeDesc: 'Add imported entries alongside existing data',
        importModeReplace: 'Replace All',
        importModeReplaceDesc: 'Delete all existing data and replace with imported data',
        importReplaceWarning: 'This will permanently delete all your existing entries!',
        importReplaceConfirm: 'I understand, replace all my data',
        importAutoBackup: 'A backup of your current data will be downloaded first',
        // Progress & results
        importProgress: 'Importing... {current}/{total}',
        importSuccess: 'Successfully imported {count} entries',
        importError: 'Failed to import data',
        importInvalidFile: 'Invalid file format. Please select a JSON or CSV file.',
        importFileTooLarge: 'File is too large (max 10 MB)',
        importFileSizeWarning: 'Large file ({size}). Import may take a moment.',
        // Common
        iosSaveHint: 'Tap the share icon to save the file',
        cancel: 'Cancel',
        import: 'Import',
      },
    },
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((lang) => {
    setLanguageState((prev) => {
      const newLang = typeof lang === 'function' ? lang(prev) : lang;
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      } catch {
        // localStorage unavailable
      }
      return newLang;
    });
  }, []);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: translations[language],
    direction: language === 'he' ? 'rtl' : 'ltr',
    toggleLanguage: () => setLanguage(prev => prev === 'he' ? 'en' : 'he'),
  }), [language, setLanguage]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
