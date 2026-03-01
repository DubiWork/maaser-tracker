/**
 * Tests for IndexedDB Service Layer
 *
 * These tests verify CRUD operations, querying, and error handling
 * for the IndexedDB data persistence layer.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initDB,
  addEntry,
  updateEntry,
  deleteEntry,
  getEntry,
  getAllEntries,
  getEntriesByDateRange,
  getEntriesByType,
  clearAllEntries,
  getStorageInfo,
  isIndexedDBSupported,
} from './db';

// Test data
const mockIncome = {
  id: 'income-1',
  type: 'income',
  amount: 5000,
  date: '2026-03-01',
  note: 'Monthly salary',
};

const mockDonation = {
  id: 'donation-1',
  type: 'donation',
  amount: 500,
  date: '2026-03-01',
  note: 'Charity donation',
};

describe('IndexedDB Service', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await clearAllEntries();
  });

  afterEach(async () => {
    // Clean up after each test
    await clearAllEntries();
  });

  describe('initDB', () => {
    it('should initialize the database successfully', async () => {
      const db = await initDB();
      expect(db).toBeDefined();
      expect(db.name).toBe('maaser-tracker');
    });

    it('should create the entries object store', async () => {
      const db = await initDB();
      expect(db.objectStoreNames.contains('entries')).toBe(true);
    });
  });

  describe('isIndexedDBSupported', () => {
    it('should return true when IndexedDB is available', () => {
      expect(isIndexedDBSupported()).toBe(true);
    });

    it('should return false when IndexedDB is not available', () => {
      const originalIndexedDB = global.indexedDB;
      const originalWindow = global.window;
      // @ts-ignore - intentionally setting to undefined for test
      global.indexedDB = undefined;
      // @ts-ignore
      global.window = {};
      expect(isIndexedDBSupported()).toBe(false);
      global.indexedDB = originalIndexedDB;
      global.window = originalWindow;
    });

    it('should return false when accessing window.indexedDB throws', () => {
      const originalWindow = global.window;
      // Create a window object that throws when indexedDB is accessed
      // @ts-ignore
      global.window = {
        get indexedDB() {
          throw new Error('Security error');
        },
      };

      expect(isIndexedDBSupported()).toBe(false);
      global.window = originalWindow;
    });
  });

  describe('addEntry', () => {
    it('should add an income entry successfully', async () => {
      const id = await addEntry(mockIncome);
      expect(id).toBe(mockIncome.id);
    });

    it('should add a donation entry successfully', async () => {
      const id = await addEntry(mockDonation);
      expect(id).toBe(mockDonation.id);
    });

    it('should reject invalid entries by throwing', async () => {
      const invalidEntry = {
        id: 'invalid-1',
        type: 'invalid',
        amount: -100,
        date: '2026-03-01',
      };

      await expect(addEntry(invalidEntry)).rejects.toThrow('Invalid entry');
    });

    it('should reject null entry by throwing', async () => {
      await expect(addEntry(null)).rejects.toThrow();
    });

    it('should reject entry without required fields', async () => {
      const incomplete = { type: 'income' };
      await expect(addEntry(incomplete)).rejects.toThrow('Invalid entry');
    });

    it('should reject duplicate IDs by throwing', async () => {
      await addEntry(mockIncome);
      // IndexedDB throws ConstraintError for duplicate keys
      await expect(addEntry(mockIncome)).rejects.toThrow();
    });
  });

  describe('getEntry', () => {
    it('should retrieve an existing entry by ID', async () => {
      await addEntry(mockIncome);
      const entry = await getEntry(mockIncome.id);

      expect(entry).toBeDefined();
      expect(entry.id).toBe(mockIncome.id);
      expect(entry.amount).toBe(mockIncome.amount);
    });

    it('should return undefined for non-existent ID', async () => {
      const entry = await getEntry('non-existent-id');
      expect(entry).toBeUndefined();
    });
  });

  describe('getAllEntries', () => {
    it('should return an empty array when no entries exist', async () => {
      const entries = await getAllEntries();
      expect(entries).toEqual([]);
    });

    it('should return all entries', async () => {
      await addEntry(mockIncome);
      await addEntry(mockDonation);

      const entries = await getAllEntries();
      expect(entries).toHaveLength(2);
    });
  });

  describe('getEntriesByType', () => {
    beforeEach(async () => {
      await addEntry(mockIncome);
      await addEntry(mockDonation);
    });

    it('should return only income entries', async () => {
      const incomes = await getEntriesByType('income');
      expect(incomes).toHaveLength(1);
      expect(incomes[0].type).toBe('income');
    });

    it('should return only donation entries', async () => {
      const donations = await getEntriesByType('donation');
      expect(donations).toHaveLength(1);
      expect(donations[0].type).toBe('donation');
    });

    it('should return empty array for non-existent type', async () => {
      const entries = await getEntriesByType('nonexistent');
      expect(entries).toEqual([]);
    });
  });

  describe('getEntriesByDateRange', () => {
    beforeEach(async () => {
      await addEntry({ ...mockIncome, id: 'jan', date: '2026-01-15' });
      await addEntry({ ...mockIncome, id: 'feb', date: '2026-02-15' });
      await addEntry({ ...mockIncome, id: 'mar', date: '2026-03-15' });
    });

    it('should return entries within date range', async () => {
      const entries = await getEntriesByDateRange('2026-02-01', '2026-03-31');
      expect(entries).toHaveLength(2);
      expect(entries.map(e => e.id)).toContain('feb');
      expect(entries.map(e => e.id)).toContain('mar');
    });

    it('should return empty array when no entries in range', async () => {
      const entries = await getEntriesByDateRange('2025-01-01', '2025-12-31');
      expect(entries).toEqual([]);
    });

    it('should include entries on boundary dates', async () => {
      const entries = await getEntriesByDateRange('2026-02-15', '2026-02-15');
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe('feb');
    });
  });

  describe('updateEntry', () => {
    beforeEach(async () => {
      await addEntry(mockIncome);
    });

    it('should update an existing entry', async () => {
      const updated = { ...mockIncome, amount: 6000 };
      const id = await updateEntry(updated);

      expect(id).toBe(mockIncome.id);

      const entry = await getEntry(mockIncome.id);
      expect(entry.amount).toBe(6000);
    });

    it('should reject update with invalid data', async () => {
      const invalid = { ...mockIncome, amount: -100 };
      await expect(updateEntry(invalid)).rejects.toThrow('Invalid entry');
    });
  });

  describe('deleteEntry', () => {
    beforeEach(async () => {
      await addEntry(mockIncome);
    });

    it('should delete an existing entry', async () => {
      await deleteEntry(mockIncome.id);
      const entry = await getEntry(mockIncome.id);
      expect(entry).toBeUndefined();
    });

    it('should not throw for non-existent entry', async () => {
      // IndexedDB delete doesn't throw for non-existent keys
      await expect(deleteEntry('non-existent')).resolves.not.toThrow();
    });
  });

  describe('clearAllEntries', () => {
    it('should remove all entries', async () => {
      await addEntry(mockIncome);
      await addEntry(mockDonation);

      await clearAllEntries();

      const entries = await getAllEntries();
      expect(entries).toHaveLength(0);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage information object', async () => {
      const info = await getStorageInfo();
      expect(info).toBeDefined();
      expect(typeof info.usage).toBe('number');
      expect(typeof info.quota).toBe('number');
    });

    it('should return default values when navigator.storage is not available', async () => {
      const originalNavigator = global.navigator;
      // @ts-ignore - intentionally setting to empty object for test
      global.navigator = {};

      const info = await getStorageInfo();
      expect(info).toEqual({ usage: 0, quota: 0, percentUsed: 0 });

      global.navigator = originalNavigator;
    });

    it('should return default values when navigator.storage.estimate throws', async () => {
      const originalNavigator = global.navigator;
      // @ts-ignore
      global.navigator = {
        storage: {
          estimate: async () => {
            throw new Error('Storage estimate failed');
          },
        },
      };

      const info = await getStorageInfo();
      expect(info).toEqual({ usage: 0, quota: 0, percentUsed: 0 });

      global.navigator = originalNavigator;
    });
  });

  describe('Error Handling', () => {
    it('should handle null entry by throwing', async () => {
      await expect(addEntry(null)).rejects.toThrow();
    });

    it('should handle missing required fields by throwing', async () => {
      const incomplete = { type: 'income' };
      await expect(addEntry(incomplete)).rejects.toThrow('Invalid entry');
    });
  });
});
