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

    // Months
    months: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
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

    // Months
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
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
