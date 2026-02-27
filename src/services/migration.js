/**
 * Migration Utility for Ma'aser Tracker
 *
 * Handles the migration of data from LocalStorage to IndexedDB
 * This ensures no data loss during the transition
 */

import { addEntry, getAllEntries, clearAllEntries } from './db';

const LOCALSTORAGE_KEY = 'maaser-tracker-entries';
const MIGRATION_FLAG_KEY = 'maaser-tracker-migrated';

/**
 * Check if migration has already been completed
 * @returns {boolean}
 */
export function isMigrationCompleted() {
  try {
    return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted() {
  try {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    console.log('✅ Migration: Marked as completed');
  } catch (error) {
    console.error('❌ Migration: Failed to mark as completed', error);
  }
}

/**
 * Load entries from LocalStorage
 * @returns {Array} Array of entry objects from LocalStorage
 */
function loadFromLocalStorage() {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!stored) {
      console.log('ℹ️ Migration: No data found in LocalStorage');
      return [];
    }

    const entries = JSON.parse(stored);
    console.log(`✅ Migration: Loaded ${entries.length} entries from LocalStorage`);
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    console.error('❌ Migration: Failed to load from LocalStorage', error);
    return [];
  }
}

/**
 * Validate an entry object has required fields
 * @param {Object} entry
 * @returns {boolean}
 */
function validateEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (!entry.id || typeof entry.id !== 'string') return false;
  if (!entry.type || !['income', 'donation'].includes(entry.type)) return false;
  if (!entry.date || typeof entry.date !== 'string') return false;
  if (entry.amount === undefined || typeof entry.amount !== 'number') return false;

  return true;
}

/**
 * Migrate data from LocalStorage to IndexedDB
 * @returns {Promise<Object>} Migration result with statistics
 */
export async function migrateFromLocalStorage() {
  console.log('🔄 Migration: Starting migration from LocalStorage to IndexedDB...');

  // Check if migration already completed
  if (isMigrationCompleted()) {
    console.log('ℹ️ Migration: Already completed, skipping');
    return {
      success: true,
      alreadyMigrated: true,
      entriesMigrated: 0,
      entriesSkipped: 0,
      entriesFailed: 0,
    };
  }

  const result = {
    success: false,
    alreadyMigrated: false,
    entriesMigrated: 0,
    entriesSkipped: 0,
    entriesFailed: 0,
    errors: [],
  };

  try {
    // Load data from LocalStorage
    const localStorageEntries = loadFromLocalStorage();

    if (localStorageEntries.length === 0) {
      console.log('ℹ️ Migration: No entries to migrate');
      markMigrationCompleted();
      result.success = true;
      return result;
    }

    // Check if IndexedDB already has data
    const existingEntries = await getAllEntries();
    const existingIds = new Set(existingEntries.map((e) => e.id));

    // Migrate each entry
    for (const entry of localStorageEntries) {
      // Validate entry
      if (!validateEntry(entry)) {
        console.warn('⚠️ Migration: Invalid entry, skipping', entry);
        result.entriesSkipped++;
        result.errors.push({ entry, reason: 'Invalid entry structure' });
        continue;
      }

      // Skip if already exists in IndexedDB
      if (existingIds.has(entry.id)) {
        console.log(`ℹ️ Migration: Entry ${entry.id} already exists, skipping`);
        result.entriesSkipped++;
        continue;
      }

      // Add to IndexedDB
      try {
        await addEntry(entry);
        result.entriesMigrated++;
      } catch (error) {
        console.error(`❌ Migration: Failed to migrate entry ${entry.id}`, error);
        result.entriesFailed++;
        result.errors.push({ entry, reason: error.message });
      }
    }

    // Mark migration as completed if all entries migrated successfully
    if (result.entriesFailed === 0) {
      markMigrationCompleted();
      result.success = true;
      console.log(`✅ Migration: Successfully migrated ${result.entriesMigrated} entries`);
    } else {
      console.error(`❌ Migration: Completed with ${result.entriesFailed} failures`);
    }

    return result;
  } catch (error) {
    console.error('❌ Migration: Critical error during migration', error);
    result.errors.push({ reason: 'Critical migration error', error: error.message });
    return result;
  }
}

/**
 * Create a backup of LocalStorage data
 * @returns {string|null} JSON string of backup data or null if failed
 */
export function createLocalStorageBackup() {
  try {
    const data = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!data) {
      console.log('ℹ️ Backup: No data to backup');
      return null;
    }

    const backup = {
      timestamp: new Date().toISOString(),
      data: JSON.parse(data),
    };

    const backupString = JSON.stringify(backup, null, 2);
    console.log('✅ Backup: Created successfully');
    return backupString;
  } catch (error) {
    console.error('❌ Backup: Failed to create backup', error);
    return null;
  }
}

/**
 * Restore data from a backup
 * @param {string} backupString - JSON string of backup data
 * @returns {Promise<Object>} Restoration result
 */
export async function restoreFromBackup(backupString) {
  try {
    const backup = JSON.parse(backupString);

    if (!backup.data || !Array.isArray(backup.data)) {
      throw new Error('Invalid backup format');
    }

    console.log(`🔄 Restore: Restoring ${backup.data.length} entries from backup`);

    // Clear existing data
    await clearAllEntries();

    // Add each entry
    let restored = 0;
    let failed = 0;

    for (const entry of backup.data) {
      if (validateEntry(entry)) {
        try {
          await addEntry(entry);
          restored++;
        } catch (error) {
          console.error(`❌ Restore: Failed to restore entry ${entry.id}`, error);
          failed++;
        }
      } else {
        console.warn('⚠️ Restore: Invalid entry in backup, skipping', entry);
        failed++;
      }
    }

    console.log(`✅ Restore: Restored ${restored} entries (${failed} failed)`);

    return {
      success: failed === 0,
      entriesRestored: restored,
      entriesFailed: failed,
    };
  } catch (error) {
    console.error('❌ Restore: Failed to restore from backup', error);
    return {
      success: false,
      entriesRestored: 0,
      entriesFailed: 0,
      error: error.message,
    };
  }
}

/**
 * Clear LocalStorage data after successful migration
 * USE WITH CAUTION - only call after verifying IndexedDB has all data
 */
export function clearLocalStorageAfterMigration() {
  try {
    if (!isMigrationCompleted()) {
      console.warn('⚠️ Cleanup: Migration not completed, skipping LocalStorage cleanup');
      return false;
    }

    localStorage.removeItem(LOCALSTORAGE_KEY);
    console.log('✅ Cleanup: LocalStorage data cleared');
    return true;
  } catch (error) {
    console.error('❌ Cleanup: Failed to clear LocalStorage', error);
    return false;
  }
}
