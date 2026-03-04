/**
 * Firestore Migration Service Layer for Ma'aser Tracker
 *
 * This service provides functions for migrating data from IndexedDB to Firestore.
 * It handles batch operations, duplicate detection, and GDPR-compliant data deletion.
 *
 * Security Considerations:
 * - All operations require authenticated user
 * - User ID validation ensures data isolation
 * - No sensitive data (amounts, descriptions) is logged
 * - Error messages are sanitized for production
 *
 * Performance Considerations:
 * - Batch writes limited to 500 entries (Firestore limit)
 * - Target: 5 seconds per 100 entries
 *
 * @module firestoreMigrationService
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp,
  getCountFromServer,
  Timestamp,
  query,
} from 'firebase/firestore';
import { db, isAuthenticated, getCurrentUserId } from '../lib/firebase';

// Constants
const BATCH_SIZE = 500; // Firestore maximum batch size
const MAX_AMOUNT = 1000000000; // 1 billion - reasonable upper limit
const MAX_NOTE_LENGTH = 500;
const VALID_ENTRY_TYPES = ['income', 'donation'];

/**
 * Error codes for migration operations
 * @constant
 */
export const MigrationErrorCodes = {
  NOT_AUTHENTICATED: 'migration/not-authenticated',
  INVALID_USER_ID: 'migration/invalid-user-id',
  USER_MISMATCH: 'migration/user-mismatch',
  INVALID_ENTRY: 'migration/invalid-entry',
  BATCH_WRITE_FAILED: 'migration/batch-write-failed',
  NETWORK_ERROR: 'migration/network-error',
  QUOTA_EXCEEDED: 'migration/quota-exceeded',
  UNKNOWN_ERROR: 'migration/unknown-error',
};

/**
 * Create a migration error with code and user-safe message
 * @param {string} code - Error code from MigrationErrorCodes
 * @param {string} message - Internal error message (not shown to users)
 * @param {Error} [originalError] - Original error for debugging
 * @returns {Error} Error with code property
 */
function createMigrationError(code, message, originalError = null) {
  const error = new Error(message);
  error.code = code;
  if (originalError && import.meta.env.DEV) {
    error.originalError = originalError;
  }
  return error;
}

/**
 * Validate that user is authenticated and userId matches
 * @param {string} userId - User ID to validate
 * @throws {Error} If not authenticated or userId mismatch
 */
function validateAuthentication(userId) {
  if (!isAuthenticated()) {
    throw createMigrationError(
      MigrationErrorCodes.NOT_AUTHENTICATED,
      'User must be authenticated to perform migration operations'
    );
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw createMigrationError(
      MigrationErrorCodes.INVALID_USER_ID,
      'Invalid user ID provided'
    );
  }

  const currentUserId = getCurrentUserId();
  if (userId !== currentUserId) {
    throw createMigrationError(
      MigrationErrorCodes.USER_MISMATCH,
      'User ID does not match authenticated user'
    );
  }
}

/**
 * Validate a single entry for Firestore storage
 * @param {Object} entry - Entry to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateEntryForFirestore(entry) {
  const errors = [];

  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Entry must be an object'] };
  }

  // Required: id (string)
  if (!entry.id || typeof entry.id !== 'string' || entry.id.trim() === '') {
    errors.push('Entry must have a valid id (string)');
  }

  // Required: type ('income' or 'donation')
  if (!entry.type || !VALID_ENTRY_TYPES.includes(entry.type)) {
    errors.push('Entry type must be "income" or "donation"');
  }

  // Required: date (string in ISO format)
  if (!entry.date || typeof entry.date !== 'string') {
    errors.push('Entry must have a valid date (string)');
  } else {
    // Validate date is parseable
    const parsedDate = new Date(entry.date);
    if (isNaN(parsedDate.getTime())) {
      errors.push('Entry date must be a valid ISO date string');
    }
  }

  // Required: amount (positive number within bounds)
  if (entry.amount === undefined || typeof entry.amount !== 'number' || isNaN(entry.amount)) {
    errors.push('Entry must have a valid amount (number)');
  } else if (entry.amount <= 0) {
    errors.push('Entry amount must be positive');
  } else if (entry.amount > MAX_AMOUNT) {
    errors.push(`Entry amount must not exceed ${MAX_AMOUNT}`);
  }

  // Optional: note/description (string with max length)
  const note = entry.note || entry.description;
  if (note !== undefined && note !== null && note !== '') {
    if (typeof note !== 'string') {
      errors.push('Entry note must be a string');
    } else if (note.length > MAX_NOTE_LENGTH) {
      errors.push(`Entry note must not exceed ${MAX_NOTE_LENGTH} characters`);
    }
  }

  // Optional: accountingMonth (string in YYYY-MM format)
  if (entry.accountingMonth !== undefined && entry.accountingMonth !== null) {
    const pattern = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!pattern.test(entry.accountingMonth)) {
      errors.push('Entry accountingMonth must be in YYYY-MM format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Convert entry to Firestore document format
 * @param {Object} entry - Entry from IndexedDB
 * @param {string} userId - User ID for redundant storage
 * @returns {Object} Firestore document data
 */
function entryToFirestoreDoc(entry, userId) {
  const doc = {
    id: entry.id,
    type: entry.type,
    amount: entry.amount,
    date: entry.date,
    accountingMonth: entry.accountingMonth || deriveAccountingMonth(entry.date),
    userId: userId,
    createdAt: entry.createdAt ? Timestamp.fromDate(new Date(entry.createdAt)) : serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Only include description if present
  if (entry.note || entry.description) {
    doc.description = (entry.note || entry.description).substring(0, MAX_NOTE_LENGTH);
  }

  return doc;
}

/**
 * Derive accounting month from date
 * @param {string} date - Date string in ISO format
 * @returns {string} Accounting month in YYYY-MM format
 */
function deriveAccountingMonth(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get the collection reference for user entries
 * @param {string} userId - User ID
 * @returns {CollectionReference} Firestore collection reference
 */
function getEntriesCollection(userId) {
  return collection(db, 'users', userId, 'entries');
}

/**
 * Get the document reference for a specific entry
 * @param {string} userId - User ID
 * @param {string} entryId - Entry ID
 * @returns {DocumentReference} Firestore document reference
 */
function getEntryDocRef(userId, entryId) {
  return doc(db, 'users', userId, 'entries', entryId);
}

/**
 * Categorize Firestore error for appropriate handling
 * @param {Error} error - Firestore error
 * @returns {string} Error code from MigrationErrorCodes
 */
function categorizeFirestoreError(error) {
  const errorCode = error?.code || '';

  // Network errors
  if (
    errorCode === 'unavailable' ||
    errorCode === 'network-request-failed' ||
    error.message?.includes('network') ||
    error.message?.includes('offline')
  ) {
    return MigrationErrorCodes.NETWORK_ERROR;
  }

  // Quota errors
  if (
    errorCode === 'resource-exhausted' ||
    error.message?.includes('quota') ||
    error.message?.includes('exceeded')
  ) {
    return MigrationErrorCodes.QUOTA_EXCEEDED;
  }

  // Authentication errors
  if (
    errorCode === 'unauthenticated' ||
    errorCode === 'permission-denied' ||
    error.message?.includes('auth')
  ) {
    return MigrationErrorCodes.NOT_AUTHENTICATED;
  }

  return MigrationErrorCodes.UNKNOWN_ERROR;
}

/**
 * Write entries to Firestore in batches
 *
 * Writes entries to Firestore in batches of 500 (Firestore limit).
 * Each batch is atomic - all entries in a batch succeed or fail together.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @param {Array<Object>} entries - Array of entries to write
 * @returns {Promise<{ success: number, failed: Array<{ id: string, error: string }> }>} Result object
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const result = await batchWriteEntries('user123', entries);
 * console.log(`Wrote ${result.success} entries, ${result.failed.length} failed`);
 */
export async function batchWriteEntries(userId, entries) {
  validateAuthentication(userId);

  if (!Array.isArray(entries)) {
    throw createMigrationError(
      MigrationErrorCodes.INVALID_ENTRY,
      'Entries must be an array'
    );
  }

  if (entries.length === 0) {
    return { success: 0, failed: [] };
  }

  let successCount = 0;
  const failedEntries = [];

  // Process entries in batches
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batchEntries = entries.slice(i, Math.min(i + BATCH_SIZE, entries.length));
    const batch = writeBatch(db);
    const validBatchEntries = [];

    // Validate and add entries to batch
    for (const entry of batchEntries) {
      const validation = validateEntryForFirestore(entry);

      if (!validation.valid) {
        failedEntries.push({
          id: entry?.id || 'unknown',
          error: validation.errors.join('; '),
        });
        continue;
      }

      const docRef = getEntryDocRef(userId, entry.id);
      const docData = entryToFirestoreDoc(entry, userId);
      batch.set(docRef, docData, { merge: true });
      validBatchEntries.push(entry);
    }

    // Commit batch if there are valid entries
    if (validBatchEntries.length > 0) {
      try {
        await batch.commit();
        successCount += validBatchEntries.length;

        if (import.meta.env.DEV) {
          console.log(`Firestore: Batch committed (${validBatchEntries.length} entries)`);
        }
      } catch (error) {
        const errorCode = categorizeFirestoreError(error);

        if (import.meta.env.DEV) {
          console.error('Firestore batch write failed:', error);
        }

        // Mark all entries in this batch as failed
        for (const entry of validBatchEntries) {
          failedEntries.push({
            id: entry.id,
            error: errorCode,
          });
        }

        // For critical errors, stop processing
        if (
          errorCode === MigrationErrorCodes.NETWORK_ERROR ||
          errorCode === MigrationErrorCodes.QUOTA_EXCEEDED
        ) {
          throw createMigrationError(
            errorCode,
            'Batch write failed due to infrastructure error',
            error
          );
        }
      }
    }
  }

  return {
    success: successCount,
    failed: failedEntries,
  };
}

/**
 * Get the total count of entries for a user
 *
 * Uses Firestore aggregation query for efficient counting without
 * downloading all documents.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @returns {Promise<number>} Total entry count
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const count = await getEntryCount('user123');
 * console.log(`User has ${count} entries in Firestore`);
 */
export async function getEntryCount(userId) {
  validateAuthentication(userId);

  try {
    const entriesRef = getEntriesCollection(userId);
    const q = query(entriesRef);
    const snapshot = await getCountFromServer(q);
    const count = snapshot.data().count;

    if (import.meta.env.DEV) {
      console.log(`Firestore: Entry count for user: ${count}`);
    }

    return count;
  } catch (error) {
    const errorCode = categorizeFirestoreError(error);

    if (import.meta.env.DEV) {
      console.error('Firestore getEntryCount failed:', error);
    }

    throw createMigrationError(
      errorCode,
      'Failed to get entry count',
      error
    );
  }
}

/**
 * Check if an entry already exists in Firestore
 *
 * Uses getDoc() for efficient single document lookup.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @param {string} entryId - Entry ID to check
 * @returns {Promise<boolean>} True if entry exists
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const exists = await checkEntryExists('user123', 'entry456');
 * if (exists) {
 *   console.log('Entry already migrated');
 * }
 */
export async function checkEntryExists(userId, entryId) {
  validateAuthentication(userId);

  if (!entryId || typeof entryId !== 'string' || entryId.trim() === '') {
    throw createMigrationError(
      MigrationErrorCodes.INVALID_ENTRY,
      'Invalid entry ID provided'
    );
  }

  try {
    const docRef = getEntryDocRef(userId, entryId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    const errorCode = categorizeFirestoreError(error);

    if (import.meta.env.DEV) {
      console.error('Firestore checkEntryExists failed:', error);
    }

    throw createMigrationError(
      errorCode,
      'Failed to check entry existence',
      error
    );
  }
}

/**
 * Retrieve a single entry from Firestore
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @param {string} entryId - Entry ID to retrieve
 * @returns {Promise<Object|null>} Entry object or null if not found
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const entry = await getEntry('user123', 'entry456');
 * if (entry) {
 *   console.log(`Entry amount: ${entry.amount}`);
 * }
 */
export async function getEntry(userId, entryId) {
  validateAuthentication(userId);

  if (!entryId || typeof entryId !== 'string' || entryId.trim() === '') {
    throw createMigrationError(
      MigrationErrorCodes.INVALID_ENTRY,
      'Invalid entry ID provided'
    );
  }

  try {
    const docRef = getEntryDocRef(userId, entryId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    // Convert Firestore Timestamps to ISO strings for consistency
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };
  } catch (error) {
    const errorCode = categorizeFirestoreError(error);

    if (import.meta.env.DEV) {
      console.error('Firestore getEntry failed:', error);
    }

    throw createMigrationError(
      errorCode,
      'Failed to retrieve entry',
      error
    );
  }
}

/**
 * Delete all entries for a user (GDPR Article 17 - Right to Erasure)
 *
 * Deletes all entries in batches of 500 (Firestore limit).
 * This operation is irreversible.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @returns {Promise<number>} Number of deleted entries
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const deletedCount = await deleteAllUserEntries('user123');
 * console.log(`Deleted ${deletedCount} entries`);
 */
export async function deleteAllUserEntries(userId) {
  validateAuthentication(userId);

  let deletedCount = 0;

  try {
    const entriesRef = getEntriesCollection(userId);

    // Get all documents
    const snapshot = await getDocs(entriesRef);

    if (snapshot.empty) {
      if (import.meta.env.DEV) {
        console.log('Firestore: No entries to delete');
      }
      return 0;
    }

    const docs = snapshot.docs;

    // Delete in batches
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batchDocs = docs.slice(i, Math.min(i + BATCH_SIZE, docs.length));
      const batch = writeBatch(db);

      for (const docSnapshot of batchDocs) {
        batch.delete(docSnapshot.ref);
      }

      await batch.commit();
      deletedCount += batchDocs.length;

      if (import.meta.env.DEV) {
        console.log(`Firestore: Deleted batch of ${batchDocs.length} entries`);
      }
    }

    if (import.meta.env.DEV) {
      console.log(`Firestore: Total deleted entries: ${deletedCount}`);
    }

    return deletedCount;
  } catch (error) {
    const errorCode = categorizeFirestoreError(error);

    if (import.meta.env.DEV) {
      console.error('Firestore deleteAllUserEntries failed:', error);
    }

    throw createMigrationError(
      errorCode,
      'Failed to delete user entries',
      error
    );
  }
}

/**
 * Compare timestamps for duplicate detection (last-write-wins strategy)
 *
 * Compares local entry timestamp with Firestore entry timestamp.
 * Returns which version is newer based on updatedAt field.
 *
 * @param {Object} localEntry - Entry from IndexedDB
 * @param {Object} firestoreEntry - Entry from Firestore
 * @returns {'local'|'firestore'|'equal'} Which entry is newer
 *
 * @example
 * const winner = compareTimestamps(localEntry, firestoreEntry);
 * if (winner === 'local') {
 *   // Update Firestore with local entry
 * }
 */
export function compareTimestamps(localEntry, firestoreEntry) {
  if (!localEntry || !firestoreEntry) {
    return localEntry ? 'local' : (firestoreEntry ? 'firestore' : 'equal');
  }

  const localTime = localEntry.updatedAt
    ? new Date(localEntry.updatedAt).getTime()
    : 0;

  let firestoreTime = 0;
  if (firestoreEntry.updatedAt) {
    // Handle Firestore Timestamp
    if (firestoreEntry.updatedAt.toDate) {
      firestoreTime = firestoreEntry.updatedAt.toDate().getTime();
    } else if (firestoreEntry.updatedAt instanceof Date) {
      firestoreTime = firestoreEntry.updatedAt.getTime();
    } else {
      firestoreTime = new Date(firestoreEntry.updatedAt).getTime();
    }
  }

  if (isNaN(localTime) && isNaN(firestoreTime)) {
    return 'equal';
  }
  if (isNaN(localTime)) {
    return 'firestore';
  }
  if (isNaN(firestoreTime)) {
    return 'local';
  }

  if (localTime > firestoreTime) {
    return 'local';
  } else if (firestoreTime > localTime) {
    return 'firestore';
  }

  return 'equal';
}

/**
 * Resolve duplicates using last-write-wins strategy
 *
 * Checks if entry exists in Firestore and compares timestamps.
 * Returns whether the local entry should be written.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @param {Object} localEntry - Entry from IndexedDB
 * @returns {Promise<{ shouldWrite: boolean, reason: string }>} Decision and reason
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const decision = await resolveDuplicate('user123', localEntry);
 * if (decision.shouldWrite) {
 *   await batchWriteEntries('user123', [localEntry]);
 * }
 */
export async function resolveDuplicate(userId, localEntry) {
  validateAuthentication(userId);

  if (!localEntry?.id) {
    return { shouldWrite: false, reason: 'Invalid local entry' };
  }

  const exists = await checkEntryExists(userId, localEntry.id);

  if (!exists) {
    return { shouldWrite: true, reason: 'Entry does not exist in Firestore' };
  }

  const firestoreEntry = await getEntry(userId, localEntry.id);
  const comparison = compareTimestamps(localEntry, firestoreEntry);

  switch (comparison) {
    case 'local':
      return { shouldWrite: true, reason: 'Local entry is newer (last-write-wins)' };
    case 'firestore':
      return { shouldWrite: false, reason: 'Firestore entry is newer (last-write-wins)' };
    case 'equal':
    default:
      return { shouldWrite: false, reason: 'Timestamps are equal, keeping Firestore version' };
  }
}

/**
 * Get batch size constant
 * @returns {number} Maximum batch size for Firestore operations
 */
export function getBatchSize() {
  return BATCH_SIZE;
}

/**
 * Validate entry for migration (alias for validateEntryForFirestore)
 * @param {Object} entry - Entry to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validateEntry(entry) {
  return validateEntryForFirestore(entry);
}
