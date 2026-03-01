import { useState, useMemo } from 'react';
import { LanguageContext } from './LanguageContext';

const translations = {
  he: {
    appName: 'מעקב מעשר',
    dashboard: 'לוח בקרה',
    addIncome: 'הוסף הכנסה',
    addDonation: 'הוסף תרומה',
    history: 'היסטוריה',

    // Dashboard
    incomeThisMonth: 'הכנסות החודש',
    maaserOwed: 'מעשר לתשלום',
    totalDonated: 'סה"כ נתרם',
    remainingToDonate: 'נותר לתרום',
    noDataYet: 'אין נתונים עדיין',
    addFirstIncome: 'הוסף את ההכנסה הראשונה שלך',

    // Forms
    date: 'תאריך',
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
  },
  en: {
    appName: 'Maaser Tracker',
    dashboard: 'Dashboard',
    addIncome: 'Add Income',
    addDonation: 'Add Donation',
    history: 'History',

    // Dashboard
    incomeThisMonth: 'Income This Month',
    maaserOwed: 'Ma\'aser Owed',
    totalDonated: 'Total Donated',
    remainingToDonate: 'Remaining to Donate',
    noDataYet: 'No data yet',
    addFirstIncome: 'Add your first income',

    // Forms
    date: 'Date',
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
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('he');

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: translations[language],
    direction: language === 'he' ? 'rtl' : 'ltr',
    toggleLanguage: () => setLanguage(prev => prev === 'he' ? 'en' : 'he'),
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
