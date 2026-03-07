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

    // Data Management - GDPR
    dataManagement: {
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

    // Data Management - GDPR
    dataManagement: {
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
