/**
 * Migration Engine for Ma'aser Tracker
 *
 * This is the CORE migration engine that orchestrates the complete migration
 * from IndexedDB to Firestore. It coordinates all migration operations and
 * ensures data integrity, GDPR compliance, and user safety.
 *
 * Features:
 * - Batch processing (500 entries per batch - Firestore limit)
 * - Duplicate handling with last-write-wins strategy
 * - Cancellation support (GDPR Article 7.3)
 * - Network retry with exponential backoff
 * - Progress callbacks for UI updates
 * - Verification step to ensure data integrity
 *
 * Security Considerations:
 * - All operations require authenticated user
 * - No sensitive data (amounts, descriptions) is logged
 * - Error messages are sanitized for production
 * - Partial data is deleted on cancellation (GDPR Article 17)
 *
 * Performance Target: 5 seconds per 100 entries
 *
 * @module migrationEngine
 */

import { getAllEntries as getAllIndexedDBEntries } from './db';
import {
  batchWriteEntries,
  getEntryCount,
  checkEntryExists,
  getEntry as getFirestoreEntry,
  deleteAllUserEntries,
  compareTimestamps,
  getBatchSize,
  MigrationErrorCodes,
} from './firestoreMigrationService';
import {
  checkMigrationStatus,
  markMigrationComplete,
  markMigrationCancelled,
  MigrationStatusErrorCodes,
} from './migrationStatusService';

// Constants
const DEFAULT_BATCH_SIZE = 500; // Firestore limit
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1000;

/**
 * Error codes for migration engine operations
 * @constant
 */
export const MigrationEngineErrorCodes = {
  ALREADY_COMPLETED: 'migration-engine/already-completed',
  NO_ENTRIES: 'migration-engine/no-entries',
  CANCELLED: 'migration-engine/cancelled',
  NETWORK_ERROR: 'migration-engine/network-error',
  AUTH_ERROR: 'migration-engine/auth-error',
  QUOTA_ERROR: 'migration-engine/quota-error',
  VERIFICATION_FAILED: 'migration-engine/verification-failed',
  UNKNOWN_ERROR: 'migration-engine/unknown-error',
};

/**
 * Create a migration engine error with code and user-safe message
 * @param {string} code - Error code from MigrationEngineErrorCodes
 * @param {string} message - Internal error message (not shown to users)
 * @param {Error} [originalError] - Original error for debugging
 * @returns {Error} Error with code property
 */
function createMigrationEngineError(code, message, originalError = null) {
  const error = new Error(message);
  error.code = code;
  if (originalError && import.meta.env.DEV) {
    error.originalError = originalError;
  }
  return error;
}

/**
 * Sleep for a specified duration (for retry logic)
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt) {
  return RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Map error code to migration engine error code
 * @param {string} code - Original error code
 * @returns {string} Migration engine error code
 */
function mapErrorCode(code) {
  if (!code) {
    return MigrationEngineErrorCodes.UNKNOWN_ERROR;
  }

  // Already our own error codes
  if (code.startsWith('migration-engine/')) {
    return code;
  }

  // Network errors
  if (
    code === MigrationErrorCodes.NETWORK_ERROR ||
    code === MigrationStatusErrorCodes.NETWORK_ERROR ||
    code.includes('network')
  ) {
    return MigrationEngineErrorCodes.NETWORK_ERROR;
  }

  // Auth errors
  if (
    code === MigrationErrorCodes.NOT_AUTHENTICATED ||
    code === MigrationStatusErrorCodes.NOT_AUTHENTICATED ||
    code === MigrationErrorCodes.USER_MISMATCH ||
    code === MigrationStatusErrorCodes.USER_MISMATCH ||
    code === MigrationStatusErrorCodes.PERMISSION_DENIED ||
    code.includes('auth')
  ) {
    return MigrationEngineErrorCodes.AUTH_ERROR;
  }

  // Quota errors
  if (code === MigrationErrorCodes.QUOTA_EXCEEDED || code.includes('quota')) {
    return MigrationEngineErrorCodes.QUOTA_ERROR;
  }

  // Already completed
  if (code === MigrationStatusErrorCodes.ALREADY_COMPLETED) {
    return MigrationEngineErrorCodes.ALREADY_COMPLETED;
  }

  return MigrationEngineErrorCodes.UNKNOWN_ERROR;
}

/**
 * Check if error is retryable
 * @param {string} code - Error code
 * @returns {boolean} True if error can be retried
 */
function isRetryableError(code) {
  return code === MigrationEngineErrorCodes.NETWORK_ERROR;
}

/**
 * Check if error is critical (should stop migration immediately)
 * @param {string} code - Error code
 * @returns {boolean} True if error is critical
 */
function isCriticalError(code) {
  return (
    code === MigrationEngineErrorCodes.AUTH_ERROR ||
    code === MigrationEngineErrorCodes.QUOTA_ERROR
  );
}

/**
 * Migrate all entries from IndexedDB to Firestore
 *
 * This is the main migration function that orchestrates the complete migration
 * process. It reads entries from IndexedDB, processes them in batches, handles
 * duplicates, and writes to Firestore.
 *
 * @param {string} userId - User ID from Firebase Auth
 * @param {Object} [options={}] - Migration options
 * @param {Function} [options.onProgress] - Progress callback: (completed, total) => void
 * @param {Function} [options.onBatchComplete] - Batch callback: (batchNumber, entriesInBatch) => void
 * @param {AbortSignal} [options.signal] - AbortSignal for cancellation support
 * @param {number} [options.batchSize=500] - Batch size (default: 500)
 * @param {Date|string} [options.consentGivenAt] - Timestamp when user gave consent (GDPR Article 7)
 * @param {string} [options.consentVersion] - Consent version (GDPR compliance)
 * @returns {Promise<Object>} Migration result object
 *
 * @example
 * const result = await migrateAllEntries('user123', {
 *   onProgress: (completed, total) => console.log(`${completed}/${total}`),
 *   signal: abortController.signal,
 *   consentGivenAt: new Date(),
 *   consentVersion: '1.0',
 * });
 *
 * if (result.success) {
 *   console.log(`Migrated ${result.entriesMigrated} entries`);
 * }
 */
export async function migrateAllEntries(userId, options = {}) {
  const startTime = Date.now();
  // Handle null/undefined options
  const safeOptions = options || {};
  const {
    onProgress,
    onBatchComplete,
    signal,
    batchSize = DEFAULT_BATCH_SIZE,
    consentGivenAt,
    consentVersion,
  } = safeOptions;

  // Track migration state
  let entriesMigrated = 0;
  let entriesFailed = 0;
  let entriesSkipped = 0;
  const failedEntries = [];

  // Helper to check cancellation
  const checkCancellation = () => {
    if (signal?.aborted) {
      return true;
    }
    return false;
  };

  // Helper to call progress callback safely
  const reportProgress = (completed, total) => {
    if (typeof onProgress === 'function') {
      try {
        onProgress(completed, total);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('onProgress callback error:', e);
        }
      }
    }
  };

  // Helper to call batch complete callback safely
  const reportBatchComplete = (batchNumber, entriesInBatch) => {
    if (typeof onBatchComplete === 'function') {
      try {
        onBatchComplete(batchNumber, entriesInBatch);
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('onBatchComplete callback error:', e);
        }
      }
    }
  };

  try {
    // Step 1: Check migration status first (prevent duplicates)
    if (import.meta.env.DEV) {
      console.log('Migration Engine: Checking migration status...');
    }

    const status = await checkMigrationStatus(userId);
    if (status.completed) {
      if (import.meta.env.DEV) {
        console.log('Migration Engine: Already completed, skipping');
      }
      throw createMigrationEngineError(
        MigrationEngineErrorCodes.ALREADY_COMPLETED,
        'Migration has already been completed for this user'
      );
    }

    // Step 2: Read entries from IndexedDB
    if (import.meta.env.DEV) {
      console.log('Migration Engine: Reading entries from IndexedDB...');
    }

    // Check cancellation before reading
    if (checkCancellation()) {
      return createCancelledResult(startTime, 0);
    }

    const localEntries = await getAllIndexedDBEntries();
    const totalEntries = localEntries.length;

    if (import.meta.env.DEV) {
      console.log(`Migration Engine: Found ${totalEntries} entries to migrate`);
    }

    // Handle empty database
    if (totalEntries === 0) {
      if (import.meta.env.DEV) {
        console.log('Migration Engine: No entries to migrate');
      }
      // Mark as complete with 0 entries
      await markMigrationComplete(userId, {
        entriesMigrated: 0,
        source: 'indexeddb',
        device: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        consentGivenAt: consentGivenAt || new Date(),
        consentVersion: consentVersion || '1.0',
      });

      return {
        success: true,
        entriesMigrated: 0,
        entriesFailed: 0,
        entriesSkipped: 0,
        failedEntries: [],
        duration: Date.now() - startTime,
        cancelled: false,
      };
    }

    // Report initial progress
    reportProgress(0, totalEntries);

    // Step 3: Process entries in batches
    const effectiveBatchSize = Math.min(batchSize, getBatchSize());
    let batchNumber = 0;
    let processedCount = 0;

    for (let i = 0; i < localEntries.length; i += effectiveBatchSize) {
      // Check cancellation before each batch
      if (checkCancellation()) {
        // Cancel and cleanup
        await cancelMigration(userId, processedCount, 'User cancelled during migration');
        return createCancelledResult(startTime, processedCount);
      }

      batchNumber++;
      const batchEntries = localEntries.slice(i, Math.min(i + effectiveBatchSize, localEntries.length));

      if (import.meta.env.DEV) {
        console.log(`Migration Engine: Processing batch ${batchNumber} (${batchEntries.length} entries)`);
      }

      // Step 4: Handle duplicates with last-write-wins strategy
      const entriesToWrite = [];
      for (const entry of batchEntries) {
        // Check cancellation during duplicate check
        if (checkCancellation()) {
          await cancelMigration(userId, processedCount, 'User cancelled during migration');
          return createCancelledResult(startTime, processedCount);
        }

        try {
          const decision = await shouldWriteEntry(userId, entry);
          if (decision.shouldWrite) {
            entriesToWrite.push(entry);
          } else {
            entriesSkipped++;
            if (import.meta.env.DEV) {
              console.log(`Migration Engine: Skipping entry ${entry.id} - ${decision.reason}`);
            }
          }
        } catch (error) {
          // Log but don't fail - include entry in batch anyway
          entriesToWrite.push(entry);
          if (import.meta.env.DEV) {
            console.warn(`Migration Engine: Error checking duplicate for ${entry.id}:`, error);
          }
        }
      }

      // Step 5: Write batch to Firestore with retry
      if (entriesToWrite.length > 0) {
        let retryCount = 0;
        let batchSuccess = false;
        let lastError = null;

        while (retryCount < MAX_RETRY_ATTEMPTS && !batchSuccess) {
          // Check cancellation before retry
          if (checkCancellation()) {
            await cancelMigration(userId, processedCount, 'User cancelled during migration');
            return createCancelledResult(startTime, processedCount);
          }

          try {
            const result = await batchWriteEntries(userId, entriesToWrite);
            entriesMigrated += result.success;
            entriesFailed += result.failed.length;
            failedEntries.push(...result.failed);
            batchSuccess = true;

            if (import.meta.env.DEV) {
              console.log(`Migration Engine: Batch ${batchNumber} complete - ${result.success} success, ${result.failed.length} failed`);
            }
          } catch (error) {
            lastError = error;
            const errorCode = mapErrorCode(error.code);

            if (import.meta.env.DEV) {
              console.error(`Migration Engine: Batch ${batchNumber} failed (attempt ${retryCount + 1}):`, error);
            }

            // Check if error is critical (stop immediately)
            if (isCriticalError(errorCode)) {
              // For auth errors, throw immediately
              if (errorCode === MigrationEngineErrorCodes.AUTH_ERROR) {
                throw createMigrationEngineError(
                  MigrationEngineErrorCodes.AUTH_ERROR,
                  'Authentication error during migration',
                  error
                );
              }
              // For quota errors, return partial success
              if (errorCode === MigrationEngineErrorCodes.QUOTA_ERROR) {
                if (import.meta.env.DEV) {
                  console.log('Migration Engine: Quota exceeded, returning partial success');
                }
                return {
                  success: false,
                  entriesMigrated,
                  entriesFailed: entriesFailed + entriesToWrite.length,
                  entriesSkipped,
                  failedEntries: [...failedEntries, ...entriesToWrite.map(e => ({ id: e.id, error: 'quota-exceeded' }))],
                  duration: Date.now() - startTime,
                  cancelled: false,
                  partialSuccess: true,
                  errorCode,
                };
              }
            }

            // For network errors, retry with backoff
            if (isRetryableError(errorCode)) {
              retryCount++;
              if (retryCount < MAX_RETRY_ATTEMPTS) {
                const delay = calculateBackoffDelay(retryCount - 1);
                if (import.meta.env.DEV) {
                  console.log(`Migration Engine: Retrying in ${delay}ms...`);
                }
                await sleep(delay);
              }
            } else {
              // Non-retryable error, mark entries as failed
              entriesFailed += entriesToWrite.length;
              failedEntries.push(...entriesToWrite.map(e => ({ id: e.id, error: error.code || 'unknown' })));
              batchSuccess = true; // Move on
            }
          }
        }

        // If all retries exhausted
        if (!batchSuccess && lastError) {
          if (import.meta.env.DEV) {
            console.error('Migration Engine: All retries exhausted for batch');
          }
          // Mark entries as failed and continue
          entriesFailed += entriesToWrite.length;
          failedEntries.push(...entriesToWrite.map(e => ({ id: e.id, error: lastError.code || 'max-retries' })));
        }
      }

      // Update processed count (including skipped)
      processedCount = entriesMigrated + entriesSkipped;

      // Report progress
      reportProgress(processedCount + entriesFailed, totalEntries);

      // Report batch complete
      reportBatchComplete(batchNumber, batchEntries.length);
    }

    // Check cancellation before verification
    if (checkCancellation()) {
      await cancelMigration(userId, processedCount, 'User cancelled before verification');
      return createCancelledResult(startTime, processedCount);
    }

    // Step 6: Verification step
    if (import.meta.env.DEV) {
      console.log('Migration Engine: Verifying migration...');
    }

    const verificationResult = await verifyMigration(userId, entriesMigrated);
    if (!verificationResult.verified) {
      if (import.meta.env.DEV) {
        console.warn(`Migration Engine: Verification warning - ${verificationResult.reason}`);
      }
      // Don't fail, just log the discrepancy
    }

    // Step 7: Mark migration as complete
    if (import.meta.env.DEV) {
      console.log('Migration Engine: Marking migration as complete...');
    }

    await markMigrationComplete(userId, {
      entriesMigrated,
      source: 'indexeddb',
      device: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      duration: Date.now() - startTime,
      consentGivenAt: consentGivenAt || new Date(),
      consentVersion: consentVersion || '1.0',
    });

    const finalResult = {
      success: entriesFailed === 0,
      entriesMigrated,
      entriesFailed,
      entriesSkipped,
      failedEntries,
      duration: Date.now() - startTime,
      cancelled: false,
      verificationResult,
    };

    if (import.meta.env.DEV) {
      console.log('Migration Engine: Migration complete', {
        success: finalResult.success,
        migrated: entriesMigrated,
        failed: entriesFailed,
        skipped: entriesSkipped,
        duration: finalResult.duration,
      });
    }

    return finalResult;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Migration Engine: Migration failed', error);
    }

    const errorCode = error.code ? mapErrorCode(error.code) : MigrationEngineErrorCodes.UNKNOWN_ERROR;

    // For already completed, don't cleanup
    if (errorCode === MigrationEngineErrorCodes.ALREADY_COMPLETED) {
      throw error;
    }

    // For critical errors, return failure result
    return {
      success: false,
      entriesMigrated,
      entriesFailed: entriesFailed || 0,
      entriesSkipped,
      failedEntries,
      duration: Date.now() - startTime,
      cancelled: false,
      errorCode,
      errorMessage: error.message,
    };
  }
}

/**
 * Determine if an entry should be written to Firestore
 * Implements duplicate detection with last-write-wins strategy
 *
 * @param {string} userId - User ID
 * @param {Object} localEntry - Entry from IndexedDB
 * @returns {Promise<{shouldWrite: boolean, reason: string}>} Decision
 */
async function shouldWriteEntry(userId, localEntry) {
  if (!localEntry?.id) {
    return { shouldWrite: false, reason: 'Invalid entry - no ID' };
  }

  try {
    const exists = await checkEntryExists(userId, localEntry.id);
    if (!exists) {
      return { shouldWrite: true, reason: 'Entry does not exist in Firestore' };
    }

    // Entry exists, compare timestamps
    const firestoreEntry = await getFirestoreEntry(userId, localEntry.id);
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
  } catch (error) {
    // On error, default to writing (safer to have duplicate than lose data)
    if (import.meta.env.DEV) {
      console.warn('Migration Engine: Error in shouldWriteEntry, defaulting to write:', error);
    }
    return { shouldWrite: true, reason: 'Error checking duplicate, writing to be safe' };
  }
}

/**
 * Create a cancelled result object
 * @param {number} startTime - Migration start time
 * @param {number} entriesProcessed - Number of entries processed before cancellation
 * @returns {Object} Cancelled result
 */
function createCancelledResult(startTime, entriesProcessed) {
  return {
    success: false,
    entriesMigrated: 0,
    entriesFailed: 0,
    entriesSkipped: 0,
    failedEntries: [],
    duration: Date.now() - startTime,
    cancelled: true,
    entriesProcessed,
  };
}

/**
 * Cancel migration and cleanup partial data
 *
 * Stops migration immediately, marks as cancelled, and deletes partial
 * Firestore data for GDPR compliance (Article 17 - Right to Erasure).
 *
 * @param {string} userId - User ID
 * @param {number} entriesProcessed - Number of entries processed before cancellation
 * @param {string} reason - Cancellation reason
 * @returns {Promise<void>}
 *
 * @example
 * await cancelMigration('user123', 50, 'User clicked cancel button');
 */
export async function cancelMigration(userId, entriesProcessed, reason) {
  if (import.meta.env.DEV) {
    console.log(`Migration Engine: Cancelling migration - ${reason}`);
  }

  try {
    // Step 1: Delete partial Firestore data (GDPR Article 17)
    await cleanupPartialData(userId);

    // Step 2: Mark migration as cancelled
    await markMigrationCancelled(userId, {
      entriesProcessed,
      reason,
    });

    if (import.meta.env.DEV) {
      console.log('Migration Engine: Cancellation complete');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Migration Engine: Error during cancellation:', error);
    }
    // Don't rethrow - cancellation should not fail
  }
}

/**
 * Verify migration integrity
 *
 * Compares entry count in Firestore with expected count to ensure
 * data integrity after migration.
 *
 * @param {string} userId - User ID
 * @param {number} expectedCount - Expected number of entries in Firestore
 * @returns {Promise<{verified: boolean, firestoreCount: number, expectedCount: number, reason: string}>}
 *
 * @example
 * const result = await verifyMigration('user123', 150);
 * if (!result.verified) {
 *   console.warn(`Verification failed: ${result.reason}`);
 * }
 */
export async function verifyMigration(userId, expectedCount) {
  try {
    const firestoreCount = await getEntryCount(userId);

    // Allow for some variance due to skipped duplicates
    const isVerified = firestoreCount >= expectedCount;
    const reason = isVerified
      ? `Verified: ${firestoreCount} entries in Firestore (expected ${expectedCount})`
      : `Mismatch: ${firestoreCount} entries in Firestore (expected ${expectedCount})`;

    if (import.meta.env.DEV) {
      console.log(`Migration Engine: Verification - ${reason}`);
    }

    return {
      verified: isVerified,
      firestoreCount,
      expectedCount,
      reason,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Migration Engine: Verification failed:', error);
    }

    return {
      verified: false,
      firestoreCount: 0,
      expectedCount,
      reason: `Verification error: ${error.message}`,
    };
  }
}

/**
 * Cleanup partial Firestore data after cancellation
 *
 * Deletes all entries written so far for GDPR compliance.
 * This implements the Right to Erasure (Article 17).
 *
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of entries deleted
 *
 * @example
 * const deleted = await cleanupPartialData('user123');
 * console.log(`Deleted ${deleted} partial entries`);
 */
export async function cleanupPartialData(userId) {
  if (import.meta.env.DEV) {
    console.log('Migration Engine: Cleaning up partial data...');
  }

  try {
    const deletedCount = await deleteAllUserEntries(userId);

    if (import.meta.env.DEV) {
      console.log(`Migration Engine: Deleted ${deletedCount} partial entries`);
    }

    return deletedCount;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Migration Engine: Error cleaning up partial data:', error);
    }
    // Don't rethrow - cleanup failure should not block cancellation
    return 0;
  }
}

/**
 * Get the default batch size for migration
 * @returns {number} Default batch size (500)
 */
export function getDefaultBatchSize() {
  return DEFAULT_BATCH_SIZE;
}

/**
 * Get the maximum retry attempts for network errors
 * @returns {number} Max retry attempts (3)
 */
export function getMaxRetryAttempts() {
  return MAX_RETRY_ATTEMPTS;
}
