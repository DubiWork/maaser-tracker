/**
 * Tests for Settings Translation Keys
 *
 * Verifies that all settings-related translation keys exist in both
 * Hebrew (he) and English (en) translations, have non-empty string values,
 * and that both languages have identical key structures.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from './LanguageProvider';
import { useLanguage } from './useLanguage';

// Expected settings keys (flat list of dot-separated paths within settings)
const EXPECTED_SETTINGS_KEYS = [
  'title',
  'back',
  // General section
  'general',
  'language',
  'languageHebrew',
  'languageEnglish',
  'currency',
  'currencyILS',
  'currencyUSD',
  'currencyEUR',
  'currencyGBP',
  // Ma'aser calculation section
  'maaserCalculation',
  'currentPercentage',
  'defaultPercentage',
  'customPercentage',
  'newPercentage',
  'effectiveFrom',
  'updatePercentage',
  'percentageHistory',
  'confirmPercentageChange',
  'confirmPercentageMessage',
  'percentagePeriodLabel',
  // Appearance section
  'appearance',
  'theme',
  'themeLight',
  'themeDark',
  'themeSystem',
  // Data management section
  'dataManagementTitle',
  'exportData',
  'importData',
  'clearData',
  'deleteAccount',
  'clearDataConfirm',
  'deleteAccountConfirm',
  'actionCannotBeUndone',
  // About section
  'about',
  'version',
  'privacyPolicy',
  'termsOfService',
  'openSourceLicenses',
  'sourceCode',
  // Success / Error messages
  'settingsSaved',
  'errorSavingSettings',
  'settingsReset',
  'errorLoadingSettings',
  // Validation
  'invalidPercentage',
  'percentageRange',
  // Confirmation dialogs
  'areYouSure',
  'confirm',
  // Import/Export (nested object)
  'importExport',
];

/**
 * Helper component that reads translations from context and renders them
 * as a JSON data attribute for test assertions.
 */
function TranslationReader() {
  const { t, language } = useLanguage();
  return (
    <div
      data-testid="translations"
      data-language={language}
      data-settings={JSON.stringify(t.settings)}
    />
  );
}

/**
 * Render TranslationReader within LanguageProvider and extract settings.
 * Uses localStorage to control language selection.
 */
function getSettingsTranslations(language) {
  localStorage.setItem('maaser-tracker-language', language);
  const { unmount } = render(
    <LanguageProvider>
      <TranslationReader />
    </LanguageProvider>
  );
  const el = screen.getByTestId('translations');
  const settings = JSON.parse(el.getAttribute('data-settings'));
  unmount();
  return settings;
}

describe('Settings Translation Keys', () => {
  let heSettings;
  let enSettings;

  beforeEach(() => {
    localStorage.clear();
    heSettings = getSettingsTranslations('he');
    enSettings = getSettingsTranslations('en');
  });

  describe('Hebrew translations', () => {
    it('should have a settings object', () => {
      expect(heSettings).toBeDefined();
      expect(typeof heSettings).toBe('object');
    });

    it('should contain all expected keys', () => {
      for (const key of EXPECTED_SETTINGS_KEYS) {
        expect(heSettings).toHaveProperty(key);
      }
    });

    it('should have non-empty string values for all flat keys', () => {
      for (const key of EXPECTED_SETTINGS_KEYS) {
        const value = heSettings[key];
        if (typeof value === 'object') continue; // Skip nested objects (e.g., importExport)
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have proper Hebrew content (not English)', () => {
      // Verify a few key Hebrew strings to ensure they are actual Hebrew
      expect(heSettings.title).toBe('הגדרות');
      expect(heSettings.general).toBe('כללי');
      expect(heSettings.about).toBe('אודות');
      expect(heSettings.appearance).toBe('מראה');
    });
  });

  describe('English translations', () => {
    it('should have a settings object', () => {
      expect(enSettings).toBeDefined();
      expect(typeof enSettings).toBe('object');
    });

    it('should contain all expected keys', () => {
      for (const key of EXPECTED_SETTINGS_KEYS) {
        expect(enSettings).toHaveProperty(key);
      }
    });

    it('should have non-empty string values for all flat keys', () => {
      for (const key of EXPECTED_SETTINGS_KEYS) {
        const value = enSettings[key];
        if (typeof value === 'object') continue; // Skip nested objects (e.g., importExport)
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
      }
    });

    it('should have proper English content (not Hebrew)', () => {
      expect(enSettings.title).toBe('Settings');
      expect(enSettings.general).toBe('General');
      expect(enSettings.about).toBe('About');
      expect(enSettings.appearance).toBe('Appearance');
    });
  });

  describe('Key parity between languages', () => {
    it('should have identical key sets in both languages', () => {
      const heKeys = Object.keys(heSettings).sort();
      const enKeys = Object.keys(enSettings).sort();
      expect(heKeys).toEqual(enKeys);
    });

    it('should not have any extra keys in Hebrew beyond expected', () => {
      const heKeys = Object.keys(heSettings);
      for (const key of heKeys) {
        expect(EXPECTED_SETTINGS_KEYS).toContain(key);
      }
    });

    it('should not have any extra keys in English beyond expected', () => {
      const enKeys = Object.keys(enSettings);
      for (const key of enKeys) {
        expect(EXPECTED_SETTINGS_KEYS).toContain(key);
      }
    });

    it('should have the same number of keys in both languages', () => {
      expect(Object.keys(heSettings).length).toBe(Object.keys(enSettings).length);
    });

    it('should have different values between languages for all flat keys', () => {
      // Every key should have a different value in Hebrew vs English
      // (they are different languages, so values should differ)
      for (const key of EXPECTED_SETTINGS_KEYS) {
        if (typeof heSettings[key] === 'object') continue; // Skip nested objects
        expect(heSettings[key]).not.toBe(enSettings[key]);
      }
    });
  });

  describe('Template strings', () => {
    it('should have matching template placeholders in both languages', () => {
      // Keys known to contain template placeholders
      const templateKeys = [
        'confirmPercentageMessage',
        'percentagePeriodLabel',
      ];

      for (const key of templateKeys) {
        const hePlaceholders = (heSettings[key].match(/\{[^}]+\}/g) || []).sort();
        const enPlaceholders = (enSettings[key].match(/\{[^}]+\}/g) || []).sort();
        expect(hePlaceholders).toEqual(enPlaceholders);
      }
    });

    it('confirmPercentageMessage should contain {percentage} and {date}', () => {
      expect(heSettings.confirmPercentageMessage).toContain('{percentage}');
      expect(heSettings.confirmPercentageMessage).toContain('{date}');
      expect(enSettings.confirmPercentageMessage).toContain('{percentage}');
      expect(enSettings.confirmPercentageMessage).toContain('{date}');
    });

    it('percentagePeriodLabel should contain {percentage} and {date}', () => {
      expect(heSettings.percentagePeriodLabel).toContain('{percentage}');
      expect(heSettings.percentagePeriodLabel).toContain('{date}');
      expect(enSettings.percentagePeriodLabel).toContain('{percentage}');
      expect(enSettings.percentagePeriodLabel).toContain('{date}');
    });
  });

  describe('Currency labels', () => {
    it('should have labels for all supported currencies', () => {
      const currencyKeys = ['currencyILS', 'currencyUSD', 'currencyEUR', 'currencyGBP'];
      for (const key of currencyKeys) {
        expect(heSettings[key]).toBeDefined();
        expect(enSettings[key]).toBeDefined();
      }
    });

    it('should have correct English currency labels', () => {
      expect(enSettings.currencyILS).toBe('Israeli Shekel');
      expect(enSettings.currencyUSD).toBe('US Dollar');
      expect(enSettings.currencyEUR).toBe('Euro');
      expect(enSettings.currencyGBP).toBe('British Pound');
    });

    it('should have correct Hebrew currency labels', () => {
      expect(heSettings.currencyILS).toBe('שקל ישראלי');
      expect(heSettings.currencyUSD).toBe('דולר אמריקאי');
      expect(heSettings.currencyEUR).toBe('אירו');
      expect(heSettings.currencyGBP).toBe('לירה שטרלינג');
    });
  });

  describe('Theme labels', () => {
    it('should have labels for all theme modes', () => {
      const themeKeys = ['themeLight', 'themeDark', 'themeSystem'];
      for (const key of themeKeys) {
        expect(heSettings[key]).toBeDefined();
        expect(enSettings[key]).toBeDefined();
      }
    });

    it('should have correct English theme labels', () => {
      expect(enSettings.themeLight).toBe('Light');
      expect(enSettings.themeDark).toBe('Dark');
      expect(enSettings.themeSystem).toBe('System Default');
    });
  });

  describe('Key count', () => {
    it('should have the expected number of settings keys', () => {
      expect(Object.keys(heSettings).length).toBe(EXPECTED_SETTINGS_KEYS.length);
      expect(Object.keys(enSettings).length).toBe(EXPECTED_SETTINGS_KEYS.length);
    });
  });

  describe('Import/Export translations (settings.importExport)', () => {
    const EXPECTED_IMPORT_EXPORT_KEYS = [
      'sectionTitle',
      'sectionDescription',
      'exportTitle',
      'exportJSON',
      'exportCSV',
      'exportSuccess',
      'exportError',
      'exportEmpty',
      'exportSecurityWarning',
      'importTitle',
      'importButton',
      'importPreviewTitle',
      'importFileInfo',
      'importValidEntries',
      'importInvalidEntries',
      'importShowInvalid',
      'importHideInvalid',
      'importModeMerge',
      'importModeMergeDesc',
      'importModeReplace',
      'importModeReplaceDesc',
      'importReplaceWarning',
      'importReplaceConfirm',
      'importAutoBackup',
      'importProgress',
      'importSuccess',
      'importError',
      'importInvalidFile',
      'importFileTooLarge',
      'importFileSizeWarning',
      'iosSaveHint',
      'cancel',
      'import',
      'done',
      'viewEntries',
      'importSuccessHint',
    ];

    it('should have importExport as a nested object in both languages', () => {
      expect(typeof heSettings.importExport).toBe('object');
      expect(typeof enSettings.importExport).toBe('object');
    });

    it('should contain all expected import/export keys in Hebrew', () => {
      for (const key of EXPECTED_IMPORT_EXPORT_KEYS) {
        expect(heSettings.importExport).toHaveProperty(key);
      }
    });

    it('should contain all expected import/export keys in English', () => {
      for (const key of EXPECTED_IMPORT_EXPORT_KEYS) {
        expect(enSettings.importExport).toHaveProperty(key);
      }
    });

    it('should have identical key sets in both languages', () => {
      const heKeys = Object.keys(heSettings.importExport).sort();
      const enKeys = Object.keys(enSettings.importExport).sort();
      expect(heKeys).toEqual(enKeys);
    });

    it('should have the expected number of import/export keys', () => {
      expect(Object.keys(heSettings.importExport).length).toBe(EXPECTED_IMPORT_EXPORT_KEYS.length);
      expect(Object.keys(enSettings.importExport).length).toBe(EXPECTED_IMPORT_EXPORT_KEYS.length);
    });

    it('should have non-empty string values for all import/export keys', () => {
      for (const key of EXPECTED_IMPORT_EXPORT_KEYS) {
        expect(typeof heSettings.importExport[key]).toBe('string');
        expect(heSettings.importExport[key].trim().length).toBeGreaterThan(0);
        expect(typeof enSettings.importExport[key]).toBe('string');
        expect(enSettings.importExport[key].trim().length).toBeGreaterThan(0);
      }
    });

    it('should have proper Hebrew content for import/export keys', () => {
      expect(heSettings.importExport.sectionTitle).toBe('ניהול נתונים');
      expect(heSettings.importExport.exportTitle).toBe('ייצוא נתונים');
      expect(heSettings.importExport.importTitle).toBe('ייבוא נתונים');
    });

    it('should have proper English content for import/export keys', () => {
      expect(enSettings.importExport.sectionTitle).toBe('Data Management');
      expect(enSettings.importExport.exportTitle).toBe('Export Data');
      expect(enSettings.importExport.importTitle).toBe('Import Data');
    });

    it('should have matching template placeholders in both languages', () => {
      const templateKeys = [
        'importFileInfo',
        'importValidEntries',
        'importInvalidEntries',
        'importProgress',
        'importSuccess',
        'importFileSizeWarning',
      ];

      for (const key of templateKeys) {
        const hePlaceholders = (heSettings.importExport[key].match(/\{[^}]+\}/g) || []).sort();
        const enPlaceholders = (enSettings.importExport[key].match(/\{[^}]+\}/g) || []).sort();
        expect(hePlaceholders).toEqual(enPlaceholders);
      }
    });

    it('should be separate from dataManagement namespace', () => {
      // Verify importExport keys do not collide with top-level dataManagement keys
      expect(heSettings.importExport).not.toBe(heSettings.dataManagement);
      expect(enSettings.importExport).not.toBe(enSettings.dataManagement);
    });
  });
});
