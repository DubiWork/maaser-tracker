/**
 * Migration Utility for Ma'aser Tracker
 *
 * Handles the migration of data from LocalStorage to IndexedDB
 * This ensures no data loss during the transition
 */

import { addEntry, getAllEntries, clearAllEntries } from './db';
import { isValidEntry } from './validation';

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
    if (import.meta.env.DEV) {
      console.log('Migration: Marked as completed');
    }
  } catch (error) {
    console.error('Migration: Failed to mark as completed', error);
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
      if (import.meta.env.DEV) {
        console.log('Migration: No data found in LocalStorage');
      }
      return [];
    }

    const entries = JSON.parse(stored);
    if (import.meta.env.DEV) {
      console.log(`Migration: Loaded ${entries.length} entries from LocalStorage`);
    }
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    console.error('Migration: Failed to load from LocalStorage', error);
    return [];
  }
}

/**
 * Migrate data from LocalStorage to IndexedDB
 * @returns {Promise<Object>} Migration result with statistics
 */
export async function migrateFromLocalStorage() {
  if (import.meta.env.DEV) {
    console.log('Migration: Starting migration from LocalStorage to IndexedDB...');
  }

  // Check if migration already completed
  if (isMigrationCompleted()) {
    if (import.meta.env.DEV) {
      console.log('Migration: Already completed, skipping');
    }
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
      if (import.meta.env.DEV) {
        console.log('Migration: No entries to migrate');
      }
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
      if (!isValidEntry(entry)) {
        if (import.meta.env.DEV) {
          console.warn('Migration: Invalid entry, skipping', entry);
        }
        result.entriesSkipped++;
        result.errors.push({ entry, reason: 'Invalid entry structure' });
        continue;
      }

      // Skip if already exists in IndexedDB
      if (existingIds.has(entry.id)) {
        if (import.meta.env.DEV) {
          console.log(`Migration: Entry ${entry.id} already exists, skipping`);
        }
        result.entriesSkipped++;
        continue;
      }

      // Add to IndexedDB
      try {
        await addEntry(entry);
        result.entriesMigrated++;
      } catch (error) {
        console.error(`Migration: Failed to migrate entry ${entry.id}`, error);
        result.entriesFailed++;
        result.errors.push({ entry, reason: error.message });
      }
    }

    // Mark migration as completed if all entries migrated successfully
    if (result.entriesFailed === 0) {
      markMigrationCompleted();
      result.success = true;
      if (import.meta.env.DEV) {
        console.log(`Migration: Successfully migrated ${result.entriesMigrated} entries`);
      }
    } else {
      console.error(`Migration: Completed with ${result.entriesFailed} failures`);
    }

    return result;
  } catch (error) {
    console.error('Migration: Critical error during migration', error);
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
      if (import.meta.env.DEV) {
        console.log('Backup: No data to backup');
      }
      return null;
    }

    const backup = {
      timestamp: new Date().toISOString(),
      data: JSON.parse(data),
    };

    const backupString = JSON.stringify(backup, null, 2);
    if (import.meta.env.DEV) {
      console.log('Backup: Created successfully');
    }
    return backupString;
  } catch (error) {
    console.error('Backup: Failed to create backup', error);
    return null;
  }
}

/**
 * Create a backup of current IndexedDB data
 * @returns {Promise<Object|null>} Backup object or null if failed
 */
async function createCurrentDataBackup() {
  try {
    const entries = await getAllEntries();
    return {
      timestamp: new Date().toISOString(),
      data: entries,
    };
  } catch (error) {
    console.error('Restore: Failed to create backup of current data', error);
    return null;
  }
}

/**
 * Restore data from a backup with atomic operation (rollback on failure)
 * @param {string} backupString - JSON string of backup data
 * @returns {Promise<Object>} Restoration result
 */
export async function restoreFromBackup(backupString) {
  let currentDataBackup = null;

  try {
    const backup = JSON.parse(backupString);

    if (!backup.data || !Array.isArray(backup.data)) {
      throw new Error('Invalid backup format');
    }

    if (import.meta.env.DEV) {
      console.log(`Restore: Restoring ${backup.data.length} entries from backup`);
    }

    // SECURITY FIX: Create backup of current data BEFORE clearing
    // This enables rollback if restore fails
    currentDataBackup = await createCurrentDataBackup();
    if (!currentDataBackup) {
      throw new Error('Failed to backup current data before restore');
    }

    // Clear existing data
    await clearAllEntries();

    // Add each entry
    let restored = 0;
    let failed = 0;
    const failedEntries = [];

    for (const entry of backup.data) {
      if (isValidEntry(entry)) {
        try {
          await addEntry(entry);
          restored++;
        } catch (error) {
          console.error(`Restore: Failed to restore entry ${entry.id}`, error);
          failed++;
          failedEntries.push({ entry, error: error.message });
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('Restore: Invalid entry in backup, skipping', entry);
        }
        failed++;
        failedEntries.push({ entry, error: 'Invalid entry structure' });
      }
    }

    // Check if restore was successful
    if (restored === 0 && backup.data.length > 0) {
      // Complete failure - rollback to previous state
      throw new Error('No entries were restored successfully, rolling back');
    }

    if (import.meta.env.DEV) {
      console.log(`Restore: Restored ${restored} entries (${failed} failed)`);
    }

    return {
      success: failed === 0,
      entriesRestored: restored,
      entriesFailed: failed,
      failedEntries: failedEntries.length > 0 ? failedEntries : undefined,
    };
  } catch (error) {
    console.error('Restore: Failed to restore from backup', error);

    // Attempt rollback if we have a backup of the previous state
    if (currentDataBackup && currentDataBackup.data.length > 0) {
      if (import.meta.env.DEV) {
        console.log('Restore: Attempting rollback to previous state...');
      }
      try {
        await clearAllEntries();
        for (const entry of currentDataBackup.data) {
          await addEntry(entry);
        }
        if (import.meta.env.DEV) {
          console.log('Restore: Rollback successful, original data restored');
        }
      } catch (rollbackError) {
        console.error('Restore: Rollback failed, data may be in inconsistent state', rollbackError);
      }
    }

    return {
      success: false,
      entriesRestored: 0,
      entriesFailed: 0,
      error: error.message,
      rolledBack: currentDataBackup !== null,
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
      console.warn('Cleanup: Migration not completed, skipping LocalStorage cleanup');
      return false;
    }

    localStorage.removeItem(LOCALSTORAGE_KEY);
    if (import.meta.env.DEV) {
      console.log('Cleanup: LocalStorage data cleared');
    }
    return true;
  } catch (error) {
    console.error('Cleanup: Failed to clear LocalStorage', error);
    return false;
  }
}
