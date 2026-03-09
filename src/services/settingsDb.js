/**
 * Settings Service Layer for Ma'aser Tracker
 *
 * Provides CRUD operations for user settings stored in IndexedDB.
 * Uses the same database instance as the entries service (db.js).
 *
 * Settings are stored as a singleton document with id "user-settings".
 */

import { initDB } from './db';

const SETTINGS_STORE_NAME = 'settings';
const SETTINGS_ID = 'user-settings';

/**
 * Default settings values
 * These are used when no settings exist in the database (first launch).
 */
export const DEFAULT_SETTINGS = {
  id: SETTINGS_ID,
  language: 'he',
  currency: 'ILS',
  maaserPercentagePeriods: [{ percentage: 10, effectiveFrom: '2020-01-01' }],
  themeMode: 'system',
  updatedAt: null, // Will be set on first save
};

/**
 * Supported currency codes
 */
export const SUPPORTED_CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'];

/**
 * Supported theme modes
 */
export const SUPPORTED_THEME_MODES = ['light', 'dark', 'system'];

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ['he', 'en'];

/**
 * Validate a partial settings object.
 * Only validates fields that are present in the object.
 * @param {Object} partial - Partial settings object to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateSettings(partial) {
  const errors = [];

  if (!partial || typeof partial !== 'object') {
    return { valid: false, errors: ['Settings must be an object'] };
  }

  if ('language' in partial) {
    if (!SUPPORTED_LANGUAGES.includes(partial.language)) {
      errors.push(`Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`);
    }
  }

  if ('currency' in partial) {
    if (!SUPPORTED_CURRENCIES.includes(partial.currency)) {
      errors.push(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`);
    }
  }

  if ('themeMode' in partial) {
    if (!SUPPORTED_THEME_MODES.includes(partial.themeMode)) {
      errors.push(`Theme mode must be one of: ${SUPPORTED_THEME_MODES.join(', ')}`);
    }
  }

  if ('maaserPercentagePeriods' in partial) {
    if (!Array.isArray(partial.maaserPercentagePeriods)) {
      errors.push('maaserPercentagePeriods must be an array');
    } else {
      for (let i = 0; i < partial.maaserPercentagePeriods.length; i++) {
        const period = partial.maaserPercentagePeriods[i];
        if (!period || typeof period !== 'object') {
          errors.push(`maaserPercentagePeriods[${i}] must be an object`);
          continue;
        }
        if (typeof period.percentage !== 'number' || period.percentage < 1 || period.percentage > 100) {
          errors.push(`maaserPercentagePeriods[${i}].percentage must be a number between 1 and 100`);
        }
        if (typeof period.effectiveFrom !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(period.effectiveFrom)) {
          errors.push(`maaserPercentagePeriods[${i}].effectiveFrom must be a date string in YYYY-MM-DD format`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get settings from IndexedDB.
 * Returns the stored settings merged with defaults, so any missing fields
 * are filled in with default values.
 * @returns {Promise<Object>} The settings object (always returns a complete object)
 */
export async function getSettings() {
  try {
    const db = await initDB();
    const stored = await db.get(SETTINGS_STORE_NAME, SETTINGS_ID);

    if (!stored) {
      return { ...DEFAULT_SETTINGS };
    }

    // Merge stored settings with defaults to ensure all fields exist
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('SettingsDB: Failed to get settings', error);
    }
    throw error;
  }
}

/**
 * Update settings with a partial object.
 * Merges the provided fields with existing settings and saves to IndexedDB.
 * @param {Object} partial - Partial settings object with fields to update
 * @returns {Promise<Object>} The complete updated settings object
 * @throws {Error} If validation fails
 */
export async function updateSettings(partial) {
  // Validate the partial update
  const validation = validateSettings(partial);
  if (!validation.valid) {
    const error = new Error(`Invalid settings: ${validation.errors.join(', ')}`);
    if (import.meta.env.DEV) {
      console.error('SettingsDB: Settings validation failed', validation.errors);
    }
    throw error;
  }

  try {
    const db = await initDB();
    const existing = await db.get(SETTINGS_STORE_NAME, SETTINGS_ID);
    const current = existing || { ...DEFAULT_SETTINGS };

    const updated = {
      ...current,
      ...partial,
      id: SETTINGS_ID, // Ensure ID is always correct
      updatedAt: new Date().toISOString(),
    };

    await db.put(SETTINGS_STORE_NAME, updated);

    if (import.meta.env.DEV) {
      console.log('SettingsDB: Settings updated', Object.keys(partial));
    }

    return updated;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('SettingsDB: Failed to update settings', error);
    }
    throw error;
  }
}

/**
 * Reset settings to default values.
 * Removes the stored settings document, so the next getSettings() call
 * will return defaults.
 * @returns {Promise<Object>} The default settings object
 */
export async function resetSettings() {
  try {
    const db = await initDB();
    await db.delete(SETTINGS_STORE_NAME, SETTINGS_ID);

    if (import.meta.env.DEV) {
      console.log('SettingsDB: Settings reset to defaults');
    }

    return { ...DEFAULT_SETTINGS };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('SettingsDB: Failed to reset settings', error);
    }
    throw error;
  }
}
