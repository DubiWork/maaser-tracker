/**
 * IndexedDB Service Layer for Ma'aser Tracker
 *
 * This service provides a robust data persistence layer using IndexedDB,
 * replacing the temporary LocalStorage solution.
 *
 * Database Schema:
 * - Store: 'entries'
 * - Indexes: date, type, amount, accountingMonth
 */

import { openDB } from 'idb';
import { validateEntry, getAccountingMonthFromDate } from './validation';

const DB_NAME = 'maaser-tracker';
const DB_VERSION = 2; // Bumped version for accountingMonth index
const STORE_NAME = 'entries';

/**
 * Initialize and open the IndexedDB database
 * Creates the database and object stores if they don't exist
 */
export async function initDB() {
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Create the entries object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: false, // We'll generate IDs ourselves
          });

          // Create indexes for efficient querying
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('amount', 'amount', { unique: false });
          store.createIndex('accountingMonth', 'accountingMonth', { unique: false });

          if (import.meta.env.DEV) {
            console.log('IndexedDB: Object store and indexes created');
          }
        } else if (oldVersion < 2) {
          // Migration: Add accountingMonth index if upgrading from v1
          const store = transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('accountingMonth')) {
            store.createIndex('accountingMonth', 'accountingMonth', { unique: false });
            if (import.meta.env.DEV) {
              console.log('IndexedDB: Added accountingMonth index');
            }
          }
        }
      },
      blocked() {
        console.warn('IndexedDB: Database blocked by another connection');
      },
      blocking() {
        console.warn('IndexedDB: This connection is blocking a version upgrade');
      },
    });

    // Run migration for existing entries without accountingMonth
    await migrateAccountingMonth(db);

    return db;
  } catch (error) {
    console.error('IndexedDB: Failed to initialize database', error);
    throw error;
  }
}

/**
 * Migrate existing entries to have accountingMonth field
 * @param {IDBDatabase} db - Database instance
 */
async function migrateAccountingMonth(db) {
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entries = await store.getAll();

    let migratedCount = 0;
    for (const entry of entries) {
      if (!entry.accountingMonth && entry.date) {
        entry.accountingMonth = getAccountingMonthFromDate(entry.date);
        await store.put(entry);
        migratedCount++;
      }
    }

    await tx.done;

    if (migratedCount > 0 && import.meta.env.DEV) {
      console.log(`IndexedDB: Migrated ${migratedCount} entries with accountingMonth`);
    }
  } catch (error) {
    console.error('IndexedDB: Failed to migrate accountingMonth', error);
    // Don't throw - migration failure shouldn't break the app
  }
}

/**
 * Add a new entry to the database
 * @param {Object} entry - Entry object with id, type, date, amount, note
 * @returns {Promise<string>} The ID of the added entry
 * @throws {Error} If entry validation fails
 */
export async function addEntry(entry) {
  // Validate entry before storing
  const validation = validateEntry(entry);
  if (!validation.valid) {
    const error = new Error(`Invalid entry: ${validation.errors.join(', ')}`);
    console.error('IndexedDB: Entry validation failed', validation.errors);
    throw error;
  }

  try {
    const db = await initDB();
    await db.add(STORE_NAME, entry);
    if (import.meta.env.DEV) {
      console.log('IndexedDB: Entry added', entry.id);
    }
    return entry.id;
  } catch (error) {
    console.error('IndexedDB: Failed to add entry', error);
    throw error;
  }
}

/**
 * Update an existing entry in the database
 * @param {Object} entry - Entry object with id and updated fields
 * @returns {Promise<string>} The ID of the updated entry
 * @throws {Error} If entry validation fails
 */
export async function updateEntry(entry) {
  // Validate entry before storing
  const validation = validateEntry(entry);
  if (!validation.valid) {
    const error = new Error(`Invalid entry: ${validation.errors.join(', ')}`);
    console.error('IndexedDB: Entry validation failed', validation.errors);
    throw error;
  }

  try {
    const db = await initDB();
    await db.put(STORE_NAME, entry);
    if (import.meta.env.DEV) {
      console.log('IndexedDB: Entry updated', entry.id);
    }
    return entry.id;
  } catch (error) {
    console.error('IndexedDB: Failed to update entry', error);
    throw error;
  }
}

/**
 * Delete an entry from the database
 * @param {string} id - The ID of the entry to delete
 * @returns {Promise<void>}
 */
export async function deleteEntry(id) {
  try {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
    if (import.meta.env.DEV) {
      console.log('IndexedDB: Entry deleted', id);
    }
  } catch (error) {
    console.error('IndexedDB: Failed to delete entry', error);
    throw error;
  }
}

/**
 * Get a single entry by ID
 * @param {string} id - The ID of the entry to retrieve
 * @returns {Promise<Object|undefined>} The entry object or undefined if not found
 */
export async function getEntry(id) {
  try {
    const db = await initDB();
    const entry = await db.get(STORE_NAME, id);
    return entry;
  } catch (error) {
    console.error('IndexedDB: Failed to get entry', error);
    throw error;
  }
}

/**
 * Get all entries from the database
 * @returns {Promise<Array>} Array of all entry objects
 */
export async function getAllEntries() {
  try {
    const db = await initDB();
    const entries = await db.getAll(STORE_NAME);
    if (import.meta.env.DEV) {
      console.log(`IndexedDB: Retrieved ${entries.length} entries`);
    }
    return entries;
  } catch (error) {
    console.error('IndexedDB: Failed to get all entries', error);
    throw error;
  }
}

/**
 * Get entries within a specific date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of entries within the date range
 */
export async function getEntriesByDateRange(startDate, endDate) {
  try {
    const db = await initDB();
    const index = db.transaction(STORE_NAME).store.index('date');

    // Use IDBKeyRange to get entries between dates
    const range = IDBKeyRange.bound(startDate, endDate);
    const entries = await index.getAll(range);

    if (import.meta.env.DEV) {
      console.log(`IndexedDB: Retrieved ${entries.length} entries for date range ${startDate} - ${endDate}`);
    }
    return entries;
  } catch (error) {
    console.error('IndexedDB: Failed to get entries by date range', error);
    throw error;
  }
}

/**
 * Get entries by type (income or donation)
 * @param {string} type - 'income' or 'donation'
 * @returns {Promise<Array>} Array of entries of the specified type
 */
export async function getEntriesByType(type) {
  try {
    const db = await initDB();
    const index = db.transaction(STORE_NAME).store.index('type');
    const entries = await index.getAll(type);

    if (import.meta.env.DEV) {
      console.log(`IndexedDB: Retrieved ${entries.length} ${type} entries`);
    }
    return entries;
  } catch (error) {
    console.error('IndexedDB: Failed to get entries by type', error);
    throw error;
  }
}

/**
 * Get entries by accounting month
 * @param {string} accountingMonth - Accounting month in YYYY-MM format
 * @returns {Promise<Array>} Array of entries for the specified accounting month
 */
export async function getEntriesByAccountingMonth(accountingMonth) {
  try {
    const db = await initDB();
    const index = db.transaction(STORE_NAME).store.index('accountingMonth');
    const entries = await index.getAll(accountingMonth);

    if (import.meta.env.DEV) {
      console.log(`IndexedDB: Retrieved ${entries.length} entries for accounting month ${accountingMonth}`);
    }
    return entries;
  } catch (error) {
    console.error('IndexedDB: Failed to get entries by accounting month', error);
    throw error;
  }
}

/**
 * Clear all entries from the database (use with caution!)
 * @returns {Promise<void>}
 */
export async function clearAllEntries() {
  try {
    const db = await initDB();
    await db.clear(STORE_NAME);
    if (import.meta.env.DEV) {
      console.log('IndexedDB: All entries cleared');
    }
  } catch (error) {
    console.error('IndexedDB: Failed to clear entries', error);
    throw error;
  }
}

/**
 * Get storage quota information
 * @returns {Promise<Object>} Object with usage and quota in bytes
 */
export async function getStorageInfo() {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentUsed: estimate.quota ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : 0,
      };
    }
    return { usage: 0, quota: 0, percentUsed: 0 };
  } catch (error) {
    console.error('IndexedDB: Failed to get storage info', error);
    return { usage: 0, quota: 0, percentUsed: 0 };
  }
}

/**
 * Check if IndexedDB is supported and available
 * @returns {boolean}
 */
export function isIndexedDBSupported() {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}
