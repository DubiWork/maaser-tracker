/**
 * Tests for Migration Service
 *
 * Tests for migrating data from LocalStorage to IndexedDB
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  migrateFromLocalStorage,
  createLocalStorageBackup,
  isMigrationCompleted,
  restoreFromBackup,
  clearLocalStorageAfterMigration,
} from './migration';
import { clearAllEntries, getAllEntries } from './db';

// LocalStorage keys used by migration service
const LOCALSTORAGE_KEY = 'maaser-tracker-entries';
const MIGRATION_FLAG_KEY = 'maaser-tracker-migrated';

// Test data
const validIncomeEntry = {
  id: 'income-1',
  type: 'income',
  date: '2026-03-01',
  amount: 5000,
  note: 'Monthly salary',
};

const validDonationEntry = {
  id: 'donation-1',
  type: 'donation',
  date: '2026-03-05',
  amount: 500,
  note: 'Charity',
};

const invalidEntry = {
  id: 'invalid-1',
  type: 'invalid-type',
  date: '2026-03-01',
  amount: -100,
};

describe('Migration Service', () => {
  beforeEach(async () => {
    // Clear LocalStorage before each test
    localStorage.clear();
    // Clear IndexedDB before each test
    await clearAllEntries();
  });

  afterEach(async () => {
    // Clean up after each test
    localStorage.clear();
    await clearAllEntries();
    vi.restoreAllMocks();
  });

  describe('isMigrationCompleted', () => {
    it('should return false when migration flag is not set', () => {
      expect(isMigrationCompleted()).toBe(false);
    });

    it('should return true when migration flag is set to "true"', () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      expect(isMigrationCompleted()).toBe(true);
    });

    it('should return false when migration flag is set to something else', () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'false');
      expect(isMigrationCompleted()).toBe(false);
    });

    it('should return false when localStorage throws an error', () => {
      // Save original getItem
      const originalGetItem = localStorage.getItem;
      // Replace with throwing version
      localStorage.getItem = () => {
        throw new Error('LocalStorage error');
      };

      const result = isMigrationCompleted();

      // Restore original
      localStorage.getItem = originalGetItem;

      expect(result).toBe(false);
    });
  });

  describe('migrateFromLocalStorage', () => {
    describe('when migration is already completed', () => {
      beforeEach(() => {
        localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      });

      it('should return success with alreadyMigrated flag', async () => {
        const result = await migrateFromLocalStorage();

        expect(result.success).toBe(true);
        expect(result.alreadyMigrated).toBe(true);
        expect(result.entriesMigrated).toBe(0);
        expect(result.entriesSkipped).toBe(0);
        expect(result.entriesFailed).toBe(0);
      });

      it('should not modify IndexedDB', async () => {
        await migrateFromLocalStorage();
        const entries = await getAllEntries();
        expect(entries).toHaveLength(0);
      });
    });

    describe('when no data exists in LocalStorage', () => {
      it('should return success with zero migrations', async () => {
        const result = await migrateFromLocalStorage();

        expect(result.success).toBe(true);
        expect(result.alreadyMigrated).toBe(false);
        expect(result.entriesMigrated).toBe(0);
        expect(result.entriesSkipped).toBe(0);
        expect(result.entriesFailed).toBe(0);
      });

      it('should mark migration as completed', async () => {
        await migrateFromLocalStorage();
        expect(isMigrationCompleted()).toBe(true);
      });
    });

    describe('when valid data exists in LocalStorage', () => {
      beforeEach(() => {
        localStorage.setItem(
          LOCALSTORAGE_KEY,
          JSON.stringify([validIncomeEntry, validDonationEntry])
        );
      });

      it('should migrate all valid entries', async () => {
        const result = await migrateFromLocalStorage();

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(2);
        expect(result.entriesSkipped).toBe(0);
        expect(result.entriesFailed).toBe(0);
      });

      it('should store entries in IndexedDB', async () => {
        await migrateFromLocalStorage();
        const entries = await getAllEntries();

        expect(entries).toHaveLength(2);
        expect(entries.map(e => e.id)).toContain(validIncomeEntry.id);
        expect(entries.map(e => e.id)).toContain(validDonationEntry.id);
      });

      it('should mark migration as completed', async () => {
        await migrateFromLocalStorage();
        expect(isMigrationCompleted()).toBe(true);
      });
    });

    describe('when invalid data exists in LocalStorage', () => {
      it('should skip invalid entries', async () => {
        localStorage.setItem(
          LOCALSTORAGE_KEY,
          JSON.stringify([validIncomeEntry, invalidEntry])
        );

        const result = await migrateFromLocalStorage();

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(1);
        expect(result.entriesSkipped).toBe(1);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should record errors for invalid entries', async () => {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([invalidEntry]));

        const result = await migrateFromLocalStorage();

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].reason).toContain('Invalid entry');
      });
    });

    describe('when duplicate entries exist', () => {
      beforeEach(async () => {
        // First add an entry to IndexedDB
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([validIncomeEntry]));
        await migrateFromLocalStorage();
        // Clear migration flag to allow re-migration
        localStorage.removeItem(MIGRATION_FLAG_KEY);
      });

      it('should skip entries that already exist in IndexedDB', async () => {
        // Try to migrate again with same data
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([validIncomeEntry]));

        const result = await migrateFromLocalStorage();

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(0);
        expect(result.entriesSkipped).toBe(1);
      });
    });

    describe('when LocalStorage contains corrupted data', () => {
      it('should handle invalid JSON gracefully', async () => {
        localStorage.setItem(LOCALSTORAGE_KEY, 'not valid json');

        const result = await migrateFromLocalStorage();

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(0);
      });

      it('should handle non-array data gracefully', async () => {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ not: 'array' }));

        const result = await migrateFromLocalStorage();

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(0);
      });
    });
  });

  describe('createLocalStorageBackup', () => {
    it('should return null when no data exists', () => {
      const backup = createLocalStorageBackup();
      expect(backup).toBeNull();
    });

    it('should create a backup string when data exists', () => {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([validIncomeEntry]));

      const backup = createLocalStorageBackup();

      expect(backup).not.toBeNull();
      expect(typeof backup).toBe('string');
    });

    it('should include timestamp in backup', () => {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([validIncomeEntry]));

      const backup = createLocalStorageBackup();
      const parsed = JSON.parse(backup);

      expect(parsed.timestamp).toBeDefined();
      expect(new Date(parsed.timestamp)).toBeInstanceOf(Date);
    });

    it('should include data in backup', () => {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([validIncomeEntry]));

      const backup = createLocalStorageBackup();
      const parsed = JSON.parse(backup);

      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0].id).toBe(validIncomeEntry.id);
    });

    it('should return null when localStorage throws an error', () => {
      // Save original getItem
      const originalGetItem = localStorage.getItem;
      // Replace with throwing version
      localStorage.getItem = () => {
        throw new Error('LocalStorage error');
      };

      const backup = createLocalStorageBackup();

      // Restore original
      localStorage.getItem = originalGetItem;

      expect(backup).toBeNull();
    });

    it('should handle corrupted JSON in localStorage', () => {
      localStorage.setItem(LOCALSTORAGE_KEY, 'invalid json');

      const backup = createLocalStorageBackup();
      expect(backup).toBeNull();
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore entries from valid backup', async () => {
      const backup = JSON.stringify({
        timestamp: new Date().toISOString(),
        data: [validIncomeEntry, validDonationEntry],
      });

      const result = await restoreFromBackup(backup);

      expect(result.success).toBe(true);
      expect(result.entriesRestored).toBe(2);
      expect(result.entriesFailed).toBe(0);
    });

    it('should populate IndexedDB after restore', async () => {
      const backup = JSON.stringify({
        timestamp: new Date().toISOString(),
        data: [validIncomeEntry],
      });

      await restoreFromBackup(backup);
      const entries = await getAllEntries();

      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(validIncomeEntry.id);
    });

    it('should fail for invalid backup format', async () => {
      const backup = JSON.stringify({ invalid: 'format' });

      const result = await restoreFromBackup(backup);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid backup format');
    });

    it('should fail for invalid JSON', async () => {
      const result = await restoreFromBackup('not json');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should skip invalid entries in backup', async () => {
      const backup = JSON.stringify({
        timestamp: new Date().toISOString(),
        data: [validIncomeEntry, invalidEntry],
      });

      const result = await restoreFromBackup(backup);

      expect(result.entriesRestored).toBe(1);
      expect(result.entriesFailed).toBe(1);
    });

    it('should clear existing data before restore', async () => {
      // First add some data
      const backup1 = JSON.stringify({
        timestamp: new Date().toISOString(),
        data: [validIncomeEntry],
      });
      await restoreFromBackup(backup1);

      // Now restore different data
      const backup2 = JSON.stringify({
        timestamp: new Date().toISOString(),
        data: [validDonationEntry],
      });
      await restoreFromBackup(backup2);

      const entries = await getAllEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(validDonationEntry.id);
    });

    it('should rollback on complete failure', async () => {
      // First add some data
      const backup1 = JSON.stringify({
        timestamp: new Date().toISOString(),
        data: [validIncomeEntry],
      });
      await restoreFromBackup(backup1);

      // Try to restore only invalid entries
      const backup2 = JSON.stringify({
        timestamp: new Date().toISOString(),
        data: [invalidEntry],
      });
      const result = await restoreFromBackup(backup2);

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);

      // Original data should be restored
      const entries = await getAllEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe(validIncomeEntry.id);
    });
  });

  describe('clearLocalStorageAfterMigration', () => {
    it('should not clear if migration is not completed', () => {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([validIncomeEntry]));

      const result = clearLocalStorageAfterMigration();

      expect(result).toBe(false);
      expect(localStorage.getItem(LOCALSTORAGE_KEY)).not.toBeNull();
    });

    it('should clear LocalStorage when migration is completed', () => {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify([validIncomeEntry]));
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

      const result = clearLocalStorageAfterMigration();

      expect(result).toBe(true);
      expect(localStorage.getItem(LOCALSTORAGE_KEY)).toBeNull();
    });

    it('should return true even if no data to clear', () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

      const result = clearLocalStorageAfterMigration();

      expect(result).toBe(true);
    });

    it('should return false when localStorage throws an error', () => {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');

      // Save original removeItem
      const originalRemoveItem = localStorage.removeItem;
      // Replace with throwing version
      localStorage.removeItem = () => {
        throw new Error('LocalStorage error');
      };

      const result = clearLocalStorageAfterMigration();

      // Restore original
      localStorage.removeItem = originalRemoveItem;

      expect(result).toBe(false);
    });
  });
});
