/**
 * Tests for Settings IndexedDB Service Layer
 *
 * Covers CRUD operations, default values, validation,
 * partial updates/merging, and schema migration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSettings,
  updateSettings,
  resetSettings,
  validateSettings,
  DEFAULT_SETTINGS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_THEME_MODES,
  SUPPORTED_LANGUAGES,
} from './settingsDb';
import { initDB } from './db';

describe('Settings DB Service', () => {
  beforeEach(async () => {
    // Reset settings before each test
    await resetSettings();
  });

  afterEach(async () => {
    await resetSettings();
  });

  describe('DEFAULT_SETTINGS', () => {
    it('should have the correct default values', () => {
      expect(DEFAULT_SETTINGS.id).toBe('user-settings');
      expect(DEFAULT_SETTINGS.language).toBe('he');
      expect(DEFAULT_SETTINGS.currency).toBe('ILS');
      expect(DEFAULT_SETTINGS.themeMode).toBe('system');
      expect(DEFAULT_SETTINGS.maaserPercentagePeriods).toEqual([
        { percentage: 10, effectiveFrom: '2020-01-01' },
      ]);
      expect(DEFAULT_SETTINGS.updatedAt).toBeNull();
    });
  });

  describe('getSettings', () => {
    it('should return default settings when no settings exist', async () => {
      const settings = await getSettings();

      expect(settings.id).toBe('user-settings');
      expect(settings.language).toBe('he');
      expect(settings.currency).toBe('ILS');
      expect(settings.themeMode).toBe('system');
      expect(settings.maaserPercentagePeriods).toEqual([
        { percentage: 10, effectiveFrom: '2020-01-01' },
      ]);
    });

    it('should return stored settings after they have been saved', async () => {
      await updateSettings({ currency: 'USD' });
      const settings = await getSettings();

      expect(settings.currency).toBe('USD');
      expect(settings.language).toBe('he'); // Other defaults preserved
    });

    it('should merge stored settings with defaults for missing fields', async () => {
      // Directly write a partial settings document to IndexedDB
      const db = await initDB();
      await db.put('settings', {
        id: 'user-settings',
        currency: 'EUR',
        // Missing: language, themeMode, maaserPercentagePeriods, updatedAt
      });

      const settings = await getSettings();

      // Stored value should be used
      expect(settings.currency).toBe('EUR');
      // Missing fields should be filled from defaults
      expect(settings.language).toBe('he');
      expect(settings.themeMode).toBe('system');
      expect(settings.maaserPercentagePeriods).toEqual([
        { percentage: 10, effectiveFrom: '2020-01-01' },
      ]);
    });

    it('should return a new object each time (no shared reference)', async () => {
      const settings1 = await getSettings();
      const settings2 = await getSettings();

      expect(settings1).toEqual(settings2);
      expect(settings1).not.toBe(settings2); // Different object references
    });
  });

  describe('updateSettings', () => {
    it('should update a single field', async () => {
      const result = await updateSettings({ language: 'en' });

      expect(result.language).toBe('en');
      expect(result.currency).toBe('ILS'); // Other fields preserved
    });

    it('should update multiple fields at once', async () => {
      const result = await updateSettings({
        language: 'en',
        currency: 'USD',
        themeMode: 'dark',
      });

      expect(result.language).toBe('en');
      expect(result.currency).toBe('USD');
      expect(result.themeMode).toBe('dark');
    });

    it('should set updatedAt timestamp on every save', async () => {
      const before = new Date().toISOString();
      const result = await updateSettings({ language: 'en' });

      expect(result.updatedAt).toBeDefined();
      expect(result.updatedAt >= before).toBe(true);
    });

    it('should preserve existing settings when updating partially', async () => {
      await updateSettings({ language: 'en', currency: 'EUR' });
      const result = await updateSettings({ themeMode: 'dark' });

      expect(result.language).toBe('en');
      expect(result.currency).toBe('EUR');
      expect(result.themeMode).toBe('dark');
    });

    it('should update maaserPercentagePeriods', async () => {
      const newPeriods = [
        { percentage: 10, effectiveFrom: '2020-01-01' },
        { percentage: 15, effectiveFrom: '2026-01-01' },
      ];
      const result = await updateSettings({ maaserPercentagePeriods: newPeriods });

      expect(result.maaserPercentagePeriods).toEqual(newPeriods);
    });

    it('should always preserve the settings ID', async () => {
      const result = await updateSettings({ id: 'wrong-id', language: 'en' });

      // The ID should always be 'user-settings' regardless of what's passed
      expect(result.id).toBe('user-settings');
    });

    it('should return the complete updated settings object', async () => {
      const result = await updateSettings({ currency: 'GBP' });

      expect(result).toHaveProperty('id', 'user-settings');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('currency', 'GBP');
      expect(result).toHaveProperty('themeMode');
      expect(result).toHaveProperty('maaserPercentagePeriods');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should persist changes to IndexedDB', async () => {
      await updateSettings({ currency: 'USD' });

      // Read directly from IndexedDB to verify persistence
      const db = await initDB();
      const stored = await db.get('settings', 'user-settings');

      expect(stored.currency).toBe('USD');
    });
  });

  describe('resetSettings', () => {
    it('should remove stored settings', async () => {
      await updateSettings({ language: 'en', currency: 'USD' });
      await resetSettings();

      const settings = await getSettings();

      expect(settings.language).toBe('he');
      expect(settings.currency).toBe('ILS');
    });

    it('should return default settings', async () => {
      const result = await resetSettings();

      expect(result.id).toBe('user-settings');
      expect(result.language).toBe('he');
      expect(result.currency).toBe('ILS');
      expect(result.themeMode).toBe('system');
    });

    it('should be safe to call when no settings exist', async () => {
      // resetSettings already called in beforeEach, call again
      const result = await resetSettings();

      expect(result).toBeDefined();
      expect(result.id).toBe('user-settings');
    });

    it('should allow saving new settings after reset', async () => {
      await updateSettings({ currency: 'EUR' });
      await resetSettings();
      await updateSettings({ currency: 'GBP' });

      const settings = await getSettings();
      expect(settings.currency).toBe('GBP');
    });
  });

  describe('validateSettings', () => {
    it('should accept valid partial settings', () => {
      const result = validateSettings({ language: 'en' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept an empty object', () => {
      const result = validateSettings({});
      expect(result.valid).toBe(true);
    });

    it('should reject null', () => {
      const result = validateSettings(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Settings must be an object');
    });

    it('should reject non-object values', () => {
      const result = validateSettings('invalid');
      expect(result.valid).toBe(false);
    });

    describe('language validation', () => {
      it('should accept supported languages', () => {
        for (const lang of SUPPORTED_LANGUAGES) {
          expect(validateSettings({ language: lang }).valid).toBe(true);
        }
      });

      it('should reject unsupported language', () => {
        const result = validateSettings({ language: 'fr' });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Language');
      });
    });

    describe('currency validation', () => {
      it('should accept supported currencies', () => {
        for (const curr of SUPPORTED_CURRENCIES) {
          expect(validateSettings({ currency: curr }).valid).toBe(true);
        }
      });

      it('should reject unsupported currency', () => {
        const result = validateSettings({ currency: 'JPY' });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Currency');
      });
    });

    describe('themeMode validation', () => {
      it('should accept supported theme modes', () => {
        for (const mode of SUPPORTED_THEME_MODES) {
          expect(validateSettings({ themeMode: mode }).valid).toBe(true);
        }
      });

      it('should reject unsupported theme mode', () => {
        const result = validateSettings({ themeMode: 'auto' });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Theme mode');
      });
    });

    describe('maaserPercentagePeriods validation', () => {
      it('should accept valid periods', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [
            { percentage: 10, effectiveFrom: '2020-01-01' },
            { percentage: 15, effectiveFrom: '2026-01-01' },
          ],
        });
        expect(result.valid).toBe(true);
      });

      it('should reject non-array value', () => {
        const result = validateSettings({ maaserPercentagePeriods: 'invalid' });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('must be an array');
      });

      it('should reject period with percentage below 1', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [{ percentage: 0, effectiveFrom: '2020-01-01' }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('between 1 and 100');
      });

      it('should reject period with percentage above 100', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [{ percentage: 101, effectiveFrom: '2020-01-01' }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('between 1 and 100');
      });

      it('should reject period with non-number percentage', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [{ percentage: '10', effectiveFrom: '2020-01-01' }],
        });
        expect(result.valid).toBe(false);
      });

      it('should reject period with invalid date format', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [{ percentage: 10, effectiveFrom: '01/01/2020' }],
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('YYYY-MM-DD');
      });

      it('should reject period with missing effectiveFrom', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [{ percentage: 10 }],
        });
        expect(result.valid).toBe(false);
      });

      it('should reject non-object period entries', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [null],
        });
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('must be an object');
      });

      it('should accept percentage with decimal values', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [{ percentage: 12.5, effectiveFrom: '2020-01-01' }],
        });
        expect(result.valid).toBe(true);
      });

      it('should accept empty periods array', () => {
        const result = validateSettings({ maaserPercentagePeriods: [] });
        expect(result.valid).toBe(true);
      });

      it('should collect multiple errors from different periods', () => {
        const result = validateSettings({
          maaserPercentagePeriods: [
            { percentage: 0, effectiveFrom: 'bad-date' },
            { percentage: 200, effectiveFrom: '2020-01-01' },
          ],
        });
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should validate multiple fields and collect all errors', () => {
      const result = validateSettings({
        language: 'fr',
        currency: 'JPY',
        themeMode: 'auto',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('updateSettings validation', () => {
    it('should reject invalid language', async () => {
      await expect(updateSettings({ language: 'fr' })).rejects.toThrow('Invalid settings');
    });

    it('should reject invalid currency', async () => {
      await expect(updateSettings({ currency: 'JPY' })).rejects.toThrow('Invalid settings');
    });

    it('should reject invalid themeMode', async () => {
      await expect(updateSettings({ themeMode: 'auto' })).rejects.toThrow('Invalid settings');
    });

    it('should reject null input', async () => {
      await expect(updateSettings(null)).rejects.toThrow('Invalid settings');
    });

    it('should reject invalid percentage periods', async () => {
      await expect(
        updateSettings({
          maaserPercentagePeriods: [{ percentage: -5, effectiveFrom: '2020-01-01' }],
        })
      ).rejects.toThrow('Invalid settings');
    });
  });

  describe('IndexedDB schema migration', () => {
    it('should create the settings store in the database', async () => {
      const db = await initDB();
      expect(db.objectStoreNames.contains('settings')).toBe(true);
    });

    it('should preserve the entries store after migration', async () => {
      const db = await initDB();
      expect(db.objectStoreNames.contains('entries')).toBe(true);
    });

    it('should have the correct database version', async () => {
      const db = await initDB();
      expect(db.version).toBe(3);
    });

    it('should allow settings operations alongside entry operations', async () => {
      // Import entry operations from db.js
      const { addEntry, getAllEntries, clearAllEntries } = await import('./db');

      // Save settings
      await updateSettings({ currency: 'USD' });

      // Add an entry
      await addEntry({
        id: 'test-entry-1',
        type: 'income',
        amount: 1000,
        date: '2026-01-15',
      });

      // Verify both work independently
      const settings = await getSettings();
      expect(settings.currency).toBe('USD');

      const entries = await getAllEntries();
      expect(entries).toHaveLength(1);

      // Cleanup
      await clearAllEntries();
    });
  });

  describe('Constants', () => {
    it('should export supported currencies', () => {
      expect(SUPPORTED_CURRENCIES).toEqual(['ILS', 'USD', 'EUR', 'GBP']);
    });

    it('should export supported theme modes', () => {
      expect(SUPPORTED_THEME_MODES).toEqual(['light', 'dark', 'system']);
    });

    it('should export supported languages', () => {
      expect(SUPPORTED_LANGUAGES).toEqual(['he', 'en']);
    });
  });
});
