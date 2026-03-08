/**
 * Tests for PrivacyPolicy component
 *
 * The PrivacyPolicy component is a standalone page (no auth required)
 * that renders the privacy policy content in Hebrew (default) or English,
 * with a language toggle and back navigation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageProvider';
import PrivacyPolicy from './PrivacyPolicy';

// Hebrew section titles (default language)
const HE_SECTION_TITLES = [
  'מבוא',
  'נתונים שאנו אוספים',
  'כיצד אנו מאחסנים את הנתונים שלך',
  'כיצד אנו משתמשים בנתונים שלך',
  'הזכויות שלך (GDPR)',
  'אבטחת מידע',
  'פרטיות ילדים',
  'שינויים במדיניות זו',
  'יצירת קשר',
];

// English section titles
const EN_SECTION_TITLES = [
  'Introduction',
  'Data We Collect',
  'How We Store Your Data',
  'How We Use Your Data',
  'Your Rights (GDPR)',
  'Data Security',
  "Children's Privacy",
  'Changes to This Policy',
  'Contact',
];

// Sections that have items arrays (Hebrew keys for reference)
const SECTIONS_WITH_ITEMS = [
  'dataWeCollect',
  'howWeStore',
  'yourRights',
  'dataSecurity',
];

function renderPrivacyPolicy() {
  return render(
    <LanguageProvider>
      <PrivacyPolicy />
    </LanguageProvider>
  );
}

describe('PrivacyPolicy', () => {
  let originalHash;

  beforeEach(() => {
    originalHash = window.location.hash;
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  describe('rendering (basic)', () => {
    it('should render the privacy policy title in Hebrew by default', () => {
      renderPrivacyPolicy();

      expect(screen.getByText('מדיניות פרטיות')).toBeInTheDocument();
    });

    it('should render all 9 section headings in Hebrew', () => {
      renderPrivacyPolicy();

      for (const title of HE_SECTION_TITLES) {
        expect(screen.getByText(title)).toBeInTheDocument();
      }
    });

    it('should render the "Last updated" text', () => {
      renderPrivacyPolicy();

      expect(screen.getByText('עודכן לאחרונה: מרץ 2026')).toBeInTheDocument();
    });

    it('should render a top back button', () => {
      renderPrivacyPolicy();

      const backButtons = screen.getAllByText('חזרה');
      expect(backButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should render a bottom back button', () => {
      renderPrivacyPolicy();

      expect(screen.getByText('חזרה לאפליקציה')).toBeInTheDocument();
    });

    it('should render language toggle button', () => {
      renderPrivacyPolicy();

      expect(screen.getByText('English')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    it('should render content text for each section', () => {
      renderPrivacyPolicy();

      // Check a representative content snippet from each section type
      // Introduction content
      expect(
        screen.getByText(/מעקב מעשר \("האפליקציה"\) היא אפליקציית ווב מתקדמת/)
      ).toBeInTheDocument();

      // howWeUse content (no items, just text)
      expect(
        screen.getByText(/הנתונים שלך משמשים אך ורק לתפקוד האפליקציה/)
      ).toBeInTheDocument();

      // children content
      expect(
        screen.getByText(/האפליקציה אינה מיועדת לילדים מתחת לגיל 13/)
      ).toBeInTheDocument();

      // changes content
      expect(
        screen.getByText(/אנו עשויים לעדכן מדיניות פרטיות זו/)
      ).toBeInTheDocument();
    });

    it('should render list items for dataWeCollect section', () => {
      renderPrivacyPolicy();

      expect(
        screen.getByText(/רשומות הכנסה ותרומה — סכומים, תאריכים, והערות שאתה מזין/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/פרטי חשבון Google/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/העדפת שפה — עברית או אנגלית/)
      ).toBeInTheDocument();
    });

    it('should render list items for howWeStore section', () => {
      renderPrivacyPolicy();

      expect(
        screen.getByText(/אחסון מקומי \(IndexedDB\)/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/אחסון בענן \(Firebase Firestore\)/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/אימות \(Firebase Authentication\)/)
      ).toBeInTheDocument();
    });

    it('should render list items for yourRights section', () => {
      renderPrivacyPolicy();

      expect(screen.getByText(/זכות גישה/)).toBeInTheDocument();
      expect(screen.getByText(/זכות לניידות מידע/)).toBeInTheDocument();
      expect(screen.getByText(/זכות למחיקה/)).toBeInTheDocument();
      expect(screen.getByText(/זכות לביטול הסכמה/)).toBeInTheDocument();
    });

    it('should render list items for dataSecurity section', () => {
      renderPrivacyPolicy();

      expect(screen.getByText(/כל התקשורת עם הענן מתבצעת דרך HTTPS מוצפן/)).toBeInTheDocument();
      expect(screen.getByText(/כללי אבטחה של Firestore/)).toBeInTheDocument();
      expect(screen.getByText(/גישה לנתונים מוגבלת לפי זיהוי משתמש/)).toBeInTheDocument();
    });

    it('should render the noCollection notice for dataWeCollect section', () => {
      renderPrivacyPolicy();

      expect(
        screen.getByText(/האפליקציה אינה משתמשת בעוגיות/)
      ).toBeInTheDocument();
    });

    it('should render the implementation note for yourRights section', () => {
      renderPrivacyPolicy();

      expect(
        screen.getByText(/כל הזכויות הללו מיושמות ישירות באפליקציה/)
      ).toBeInTheDocument();
    });

    it('should render the contact link', () => {
      renderPrivacyPolicy();

      const link = screen.getByRole('link', {
        name: 'https://github.com/DubiWork/maaser-tracker/issues',
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute(
        'href',
        'https://github.com/DubiWork/maaser-tracker/issues'
      );
    });

    it('should render the contact link with target="_blank" and rel="noopener noreferrer"', () => {
      renderPrivacyPolicy();

      const link = screen.getByRole('link', {
        name: 'https://github.com/DubiWork/maaser-tracker/issues',
      });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('language toggle', () => {
    it('should default to Hebrew content', () => {
      renderPrivacyPolicy();

      expect(screen.getByText('מדיניות פרטיות')).toBeInTheDocument();
      expect(screen.getByText('עודכן לאחרונה: מרץ 2026')).toBeInTheDocument();
    });

    it('should switch to English when toggle is clicked', () => {
      renderPrivacyPolicy();

      // Click the language toggle
      fireEvent.click(screen.getByText('English'));

      // Title should now be in English
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Last updated: March 2026')).toBeInTheDocument();
    });

    it('should render all 9 English section titles after toggle', () => {
      renderPrivacyPolicy();

      fireEvent.click(screen.getByText('English'));

      for (const title of EN_SECTION_TITLES) {
        expect(screen.getByText(title)).toBeInTheDocument();
      }
    });

    it('should switch back to Hebrew when toggle is clicked again', () => {
      renderPrivacyPolicy();

      // Switch to English
      fireEvent.click(screen.getByText('English'));
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();

      // Switch back to Hebrew
      fireEvent.click(screen.getByText('\u05E2\u05D1\u05E8\u05D9\u05EA'));
      expect(screen.getByText('מדיניות פרטיות')).toBeInTheDocument();
    });

    it('should change direction to ltr when switched to English', () => {
      renderPrivacyPolicy();

      // Default is rtl
      const rootBox = screen.getByText('מדיניות פרטיות').closest('[dir]');
      expect(rootBox).toHaveAttribute('dir', 'rtl');

      // Switch to English
      fireEvent.click(screen.getByText('English'));

      const rootBoxEn = screen.getByText('Privacy Policy').closest('[dir]');
      expect(rootBoxEn).toHaveAttribute('dir', 'ltr');
    });

    it('should change direction back to rtl when switched back to Hebrew', () => {
      renderPrivacyPolicy();

      // Switch to English
      fireEvent.click(screen.getByText('English'));
      const rootBoxEn = screen.getByText('Privacy Policy').closest('[dir]');
      expect(rootBoxEn).toHaveAttribute('dir', 'ltr');

      // Switch back to Hebrew
      fireEvent.click(screen.getByText('\u05E2\u05D1\u05E8\u05D9\u05EA'));
      const rootBoxHe = screen.getByText('מדיניות פרטיות').closest('[dir]');
      expect(rootBoxHe).toHaveAttribute('dir', 'rtl');
    });

    it('should show toggle label as "English" when in Hebrew mode', () => {
      renderPrivacyPolicy();

      expect(screen.getByText('English')).toBeInTheDocument();
    });

    it('should show toggle label as Hebrew text when in English mode', () => {
      renderPrivacyPolicy();

      fireEvent.click(screen.getByText('English'));

      expect(screen.getByText('\u05E2\u05D1\u05E8\u05D9\u05EA')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('should set window.location.hash to empty string when top back button is clicked', () => {
      renderPrivacyPolicy();

      // The top back button has text "חזרה" (short label)
      const topBackButton = screen.getAllByRole('button').find(
        (btn) => btn.textContent.includes('חזרה') && !btn.textContent.includes('לאפליקציה')
      );
      fireEvent.click(topBackButton);

      expect(window.location.hash).toBe('');
    });

    it('should set window.location.hash to empty string when bottom back button is clicked', () => {
      renderPrivacyPolicy();

      const bottomBackButton = screen.getByText('חזרה לאפליקציה').closest('button');
      fireEvent.click(bottomBackButton);

      expect(window.location.hash).toBe('');
    });

    it('should render without authentication (no auth wrapper needed)', () => {
      // PrivacyPolicy renders with just LanguageProvider — no AuthProvider or QueryClientProvider
      const { container } = renderPrivacyPolicy();

      expect(container.firstChild).toBeTruthy();
      expect(screen.getByText('מדיניות פרטיות')).toBeInTheDocument();
    });
  });

  describe('responsive and accessibility', () => {
    it('should have h1 for the main title', () => {
      renderPrivacyPolicy();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('מדיניות פרטיות');
    });

    it('should have h2 for all section headings', () => {
      renderPrivacyPolicy();

      const h2Headings = screen.getAllByRole('heading', { level: 2 });
      expect(h2Headings).toHaveLength(9);

      const headingTexts = h2Headings.map((h) => h.textContent);
      for (const title of HE_SECTION_TITLES) {
        expect(headingTexts).toContain(title);
      }
    });

    it('should have proper heading hierarchy (one h1, multiple h2)', () => {
      renderPrivacyPolicy();

      const h1Headings = screen.getAllByRole('heading', { level: 1 });
      const h2Headings = screen.getAllByRole('heading', { level: 2 });

      expect(h1Headings).toHaveLength(1);
      expect(h2Headings).toHaveLength(9);
    });

    it('should have accessible label on back button in Hebrew', () => {
      renderPrivacyPolicy();

      // Top back button has aria-label="חזרה לאפליקציה", bottom has visible text
      const backButtons = screen.getAllByRole('button', { name: /חזרה/ });
      expect(backButtons.length).toBeGreaterThanOrEqual(2);

      // Verify the top button has the aria-label
      const topButton = backButtons.find(
        (btn) => btn.getAttribute('aria-label') === 'חזרה לאפליקציה'
      );
      expect(topButton).toBeTruthy();
    });

    it('should have accessible label on back button in English', () => {
      renderPrivacyPolicy();

      fireEvent.click(screen.getByText('English'));

      const backButton = screen.getByRole('button', { name: 'Back to app' });
      expect(backButton).toBeInTheDocument();
    });

    it('should render contact link with proper accessibility attributes', () => {
      renderPrivacyPolicy();

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', 'https://github.com/DubiWork/maaser-tracker/issues');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('English content verification', () => {
    it('should render English content text for sections', () => {
      renderPrivacyPolicy();
      fireEvent.click(screen.getByText('English'));

      // Introduction
      expect(
        screen.getByText(/Ma'aser Tracker \("the App"\) is a progressive web application/)
      ).toBeInTheDocument();

      // howWeUse
      expect(
        screen.getByText(/Your data is used solely for the App's functionality/)
      ).toBeInTheDocument();
    });

    it('should render English list items for dataWeCollect section', () => {
      renderPrivacyPolicy();
      fireEvent.click(screen.getByText('English'));

      expect(
        screen.getByText(/Income and donation entries/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Google account information/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Language preference — Hebrew or English/)
      ).toBeInTheDocument();
    });

    it('should render the English noCollection notice', () => {
      renderPrivacyPolicy();
      fireEvent.click(screen.getByText('English'));

      expect(
        screen.getByText(/The App does not use cookies, analytics/)
      ).toBeInTheDocument();
    });

    it('should render the English implementation note for yourRights', () => {
      renderPrivacyPolicy();
      fireEvent.click(screen.getByText('English'));

      expect(
        screen.getByText(/All of these rights are implemented directly/)
      ).toBeInTheDocument();
    });
  });
});
