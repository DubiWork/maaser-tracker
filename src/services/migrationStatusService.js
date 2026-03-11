/**
 * Migration Status Service for Ma'aser Tracker
 *
 * This service tracks migration status in Firestore to ensure migration only
 * happens once per user and works across devices.
 *
 * Security Considerations:
 * - All operations require authenticated user
 * - User ID validation ensures data isolation
 * - Migration can only be completed once (prevent duplicates)
 * - Supports GDPR Article 7.3 (right to withdraw consent)
 *
 * Firestore Path: /users/{userId}/metadata/migration
 *
 * @module migrationStatusService
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db, isAuthenticated, getCurrentUserId } from '../lib/firebase';

// Constants
const MIGRATION_VERSION = '1.0';
const CONSENT_VERSION = '1.0';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Error codes for migration status operations
 * @constant
 */
export const MigrationStatusErrorCodes = {
  NOT_AUTHENTICATED: 'migration-status/not-authenticated',
  INVALID_USER_ID: 'migration-status/invalid-user-id',
  USER_MISMATCH: 'migration-status/user-mismatch',
  ALREADY_COMPLETED: 'migration-status/already-completed',
  INVALID_METADATA: 'migration-status/invalid-metadata',
  NETWORK_ERROR: 'migration-status/network-error',
  PERMISSION_DENIED: 'migration-status/permission-denied',
  UNKNOWN_ERROR: 'migration-status/unknown-error',
  MISSING_CONSENT: 'migration-status/missing-consent',
  RACE_CONDITION: 'migration-status/race-condition',
};

/**
 * Create a migration status error with code and user-safe message
 * @param {string} code - Error code from MigrationStatusErrorCodes
 * @param {string} message - Internal error message (not shown to users)
 * @param {Error} [originalError] - Original error for debugging
 * @returns {Error} Error with code property
 */
function createMigrationStatusError(code, message, originalError = null) {
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
    throw createMigrationStatusError(
      MigrationStatusErrorCodes.NOT_AUTHENTICATED,
      'User must be authenticated to perform migration status operations'
    );
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw createMigrationStatusError(
      MigrationStatusErrorCodes.INVALID_USER_ID,
      'Invalid user ID provided'
    );
  }

  const currentUserId = getCurrentUserId();
  if (userId !== currentUserId) {
    throw createMigrationStatusError(
      MigrationStatusErrorCodes.USER_MISMATCH,
      'User ID does not match authenticated user'
    );
  }
}

/**
 * Categorize Firestore error for appropriate handling
 * @param {Error} error - Firestore error
 * @returns {string} Error code from MigrationStatusErrorCodes
 */
function categorizeFirestoreError(error) {
  const errorCode = error?.code || '';

  // Network errors
  if (
    errorCode === 'unavailable' ||
    errorCode === 'network-request-failed' ||
    errorCode === 'aborted' ||
    error.message?.includes('network') ||
    error.message?.includes('offline')
  ) {
    return MigrationStatusErrorCodes.NETWORK_ERROR;
  }

  // Permission errors
  if (
    errorCode === 'permission-denied' ||
    error.message?.includes('permission')
  ) {
    return MigrationStatusErrorCodes.PERMISSION_DENIED;
  }

  // Authentication errors
  if (
    errorCode === 'unauthenticated' ||
    error.message?.includes('auth')
  ) {
    return MigrationStatusErrorCodes.NOT_AUTHENTICATED;
  }

  return MigrationStatusErrorCodes.UNKNOWN_ERROR;
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
 * Get the document reference for migration metadata
 * @param {string} userId - User ID
 * @returns {DocumentReference} Firestore document reference
 */
function getMigrationDocRef(userId) {
  return doc(db, 'users', userId, 'metadata', 'migration');
}

/**
 * Get the collection reference for migration history
 * @param {string} userId - User ID
 * @returns {CollectionReference} Firestore collection reference
 */
function getMigrationHistoryCollection(userId) {
  return collection(db, 'users', userId, 'metadata', 'migration', 'history');
}

/**
 * Check if migration already completed for this user
 *
 * Checks the migration metadata document to determine if migration
 * has already been completed. This status persists across devices.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @returns {Promise<{completed: boolean, completedAt: Date|null, version: string|null, entriesMigrated: number|null, cancelled: boolean}>} Migration status
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const status = await checkMigrationStatus('user123');
 * if (status.completed) {
 *   console.log(`Migration completed at ${status.completedAt}`);
 * }
 */
export async function checkMigrationStatus(userId) {
  validateAuthentication(userId);

  let lastError = null;

  // Retry logic with exponential backoff for network errors
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const docRef = getMigrationDocRef(userId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // No migration document - migration not started
        return {
          completed: false,
          completedAt: null,
          version: null,
          entriesMigrated: null,
          cancelled: false,
        };
      }

      const data = docSnap.data();

      // Convert Firestore Timestamp to Date
      let completedAt = null;
      if (data.completedAt) {
        if (data.completedAt.toDate) {
          completedAt = data.completedAt.toDate();
        } else if (data.completedAt instanceof Date) {
          completedAt = data.completedAt;
        } else {
          completedAt = new Date(data.completedAt);
        }
      }

      let cancelledAt = null;
      if (data.cancelledAt) {
        if (data.cancelledAt.toDate) {
          cancelledAt = data.cancelledAt.toDate();
        } else if (data.cancelledAt instanceof Date) {
          cancelledAt = data.cancelledAt;
        } else {
          cancelledAt = new Date(data.cancelledAt);
        }
      }

      if (import.meta.env.DEV) {
        console.log('Migration status:', {
          completed: data.completed || false,
          cancelled: data.cancelled || false,
        });
      }

      return {
        completed: data.completed || false,
        completedAt,
        version: data.version || null,
        entriesMigrated: data.entriesMigrated ?? null,
        cancelled: data.cancelled || false,
        cancelledAt,
        cancelReason: data.cancelReason || null,
        entriesProcessed: data.entriesProcessed ?? null,
      };
    } catch (error) {
      lastError = error;
      const errorCode = categorizeFirestoreError(error);

      if (import.meta.env.DEV) {
        console.error(`Migration status check attempt ${attempt + 1} failed:`, error);
      }

      // Only retry on network errors
      if (errorCode === MigrationStatusErrorCodes.NETWORK_ERROR && attempt < MAX_RETRY_ATTEMPTS - 1) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      // For auth/permission errors, throw immediately
      throw createMigrationStatusError(
        errorCode,
        'Failed to check migration status',
        error
      );
    }
  }

  // All retries exhausted
  throw createMigrationStatusError(
    MigrationStatusErrorCodes.NETWORK_ERROR,
    'Failed to check migration status after multiple attempts',
    lastError
  );
}

/**
 * Mark migration as complete with metadata
 *
 * Stores completion timestamp, entry count, device info, and migration version.
 * This operation will fail if migration is already completed (prevents duplicates).
 * Uses Firestore transaction to prevent race conditions from multiple devices.
 *
 * GDPR Article 7: Records user consent timestamp and version.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @param {Object} metadata - Migration metadata
 * @param {number} metadata.entriesMigrated - Number of entries migrated (must be >= 0)
 * @param {Date|string} metadata.consentGivenAt - Timestamp when user gave consent (required for GDPR)
 * @param {string} [metadata.consentVersion] - Consent version (defaults to current version)
 * @param {string} [metadata.device] - Device info (defaults to navigator.userAgent)
 * @param {string} [metadata.source] - Source system (defaults to 'indexeddb')
 * @returns {Promise<boolean>} True if marked successfully
 * @throws {Error} If not authenticated, userId mismatch, already completed, missing consent, or race condition
 *
 * @example
 * const success = await markMigrationComplete('user123', {
 *   entriesMigrated: 150,
 *   consentGivenAt: new Date(),
 *   device: navigator.userAgent
 * });
 */
export async function markMigrationComplete(userId, metadata) {
  validateAuthentication(userId);

  // Validate metadata
  if (!metadata || typeof metadata !== 'object') {
    throw createMigrationStatusError(
      MigrationStatusErrorCodes.INVALID_METADATA,
      'Migration metadata must be an object'
    );
  }

  if (typeof metadata.entriesMigrated !== 'number' ||
      isNaN(metadata.entriesMigrated) ||
      metadata.entriesMigrated < 0) {
    throw createMigrationStatusError(
      MigrationStatusErrorCodes.INVALID_METADATA,
      'entriesMigrated must be a non-negative number'
    );
  }

  // Validate consent (GDPR Article 7)
  if (!metadata.consentGivenAt) {
    throw createMigrationStatusError(
      MigrationStatusErrorCodes.MISSING_CONSENT,
      'consentGivenAt is required for GDPR compliance'
    );
  }

  // Normalize consent timestamp
  let consentTimestamp;
  if (metadata.consentGivenAt instanceof Date) {
    consentTimestamp = Timestamp.fromDate(metadata.consentGivenAt);
  } else if (typeof metadata.consentGivenAt === 'string') {
    consentTimestamp = Timestamp.fromDate(new Date(metadata.consentGivenAt));
  } else if (metadata.consentGivenAt?.toDate) {
    // Already a Firestore Timestamp
    consentTimestamp = metadata.consentGivenAt;
  } else {
    throw createMigrationStatusError(
      MigrationStatusErrorCodes.INVALID_METADATA,
      'consentGivenAt must be a Date, string, or Firestore Timestamp'
    );
  }

  let lastError = null;

  // Retry logic with exponential backoff for network errors
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const docRef = getMigrationDocRef(userId);

      // Use Firestore transaction to ensure atomicity (prevent race conditions)
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);

        // Check if already completed inside the transaction
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.completed) {
            throw createMigrationStatusError(
              MigrationStatusErrorCodes.ALREADY_COMPLETED,
              'Migration has already been completed for this user'
            );
          }
        }

        const migrationData = {
          completed: true,
          completedAt: serverTimestamp(),
          version: MIGRATION_VERSION,
          entriesMigrated: metadata.entriesMigrated,
          source: metadata.source || 'indexeddb',
          device: metadata.device || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
          cancelled: false,
          cancelledAt: null,
          cancelReason: null,
          entriesProcessed: null,
          userId: userId,
          updatedAt: serverTimestamp(),
          // GDPR consent fields
          consentGivenAt: consentTimestamp,
          consentVersion: metadata.consentVersion || CONSENT_VERSION,
        };

        transaction.set(docRef, migrationData);
      });

      // Save to history for audit trail (outside transaction - non-critical)
      try {
        const historyRef = doc(getMigrationHistoryCollection(userId), `completed-${Date.now()}`);
        await setDoc(historyRef, {
          eventType: 'completed',
          completed: true,
          completedAt: serverTimestamp(),
          version: MIGRATION_VERSION,
          entriesMigrated: metadata.entriesMigrated,
          source: metadata.source || 'indexeddb',
          device: metadata.device || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'),
          cancelled: false,
          userId: userId,
          timestamp: serverTimestamp(),
          consentGivenAt: consentTimestamp,
          consentVersion: metadata.consentVersion || CONSENT_VERSION,
        });
      } catch (historyError) {
        // Log but don't fail - history is secondary
        if (import.meta.env.DEV) {
          console.warn('Failed to save migration history:', historyError);
        }
      }

      if (import.meta.env.DEV) {
        console.log('Migration marked as complete:', {
          entriesMigrated: metadata.entriesMigrated,
          version: MIGRATION_VERSION,
          consentVersion: metadata.consentVersion || CONSENT_VERSION,
        });
      }

      return true;
    } catch (error) {
      // Don't retry if it's an ALREADY_COMPLETED error (race condition detected)
      if (error.code === MigrationStatusErrorCodes.ALREADY_COMPLETED) {
        throw error;
      }

      lastError = error;
      const errorCode = categorizeFirestoreError(error);

      if (import.meta.env.DEV) {
        console.error(`Mark migration complete attempt ${attempt + 1} failed:`, error);
      }

      // Only retry on network errors
      if (errorCode === MigrationStatusErrorCodes.NETWORK_ERROR && attempt < MAX_RETRY_ATTEMPTS - 1) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      // For auth/permission errors, throw immediately
      throw createMigrationStatusError(
        errorCode,
        'Failed to mark migration as complete',
        error
      );
    }
  }

  // All retries exhausted
  throw createMigrationStatusError(
    MigrationStatusErrorCodes.NETWORK_ERROR,
    'Failed to mark migration as complete after multiple attempts',
    lastError
  );
}

/**
 * Mark migration as cancelled by user (GDPR Article 7.3)
 *
 * Records that the user cancelled the migration process.
 * This supports the right to withdraw consent.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @param {Object} metadata - Cancellation metadata
 * @param {number} [metadata.entriesProcessed] - Number of entries processed before cancellation
 * @param {string} [metadata.reason] - User-provided or system reason for cancellation
 * @returns {Promise<boolean>} True if marked successfully
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const success = await markMigrationCancelled('user123', {
 *   entriesProcessed: 50,
 *   reason: 'User cancelled during migration'
 * });
 */
export async function markMigrationCancelled(userId, metadata = {}) {
  validateAuthentication(userId);

  // Normalize null/undefined to empty object
  const normalizedMetadata = metadata || {};

  // Validate metadata if provided
  if (typeof normalizedMetadata !== 'object') {
    throw createMigrationStatusError(
      MigrationStatusErrorCodes.INVALID_METADATA,
      'Cancellation metadata must be an object'
    );
  }

  if (normalizedMetadata.entriesProcessed !== undefined && normalizedMetadata.entriesProcessed !== null) {
    if (typeof normalizedMetadata.entriesProcessed !== 'number' ||
        isNaN(normalizedMetadata.entriesProcessed) ||
        normalizedMetadata.entriesProcessed < 0) {
      throw createMigrationStatusError(
        MigrationStatusErrorCodes.INVALID_METADATA,
        'entriesProcessed must be a non-negative number'
      );
    }
  }

  let lastError = null;

  // Retry logic with exponential backoff for network errors
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const docRef = getMigrationDocRef(userId);

      // Use Firestore transaction to prevent TOCTOU race condition:
      // Another device could complete migration between check and write.
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(docRef);

        // Check if already completed inside the transaction (atomic)
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.completed) {
            throw createMigrationStatusError(
              MigrationStatusErrorCodes.ALREADY_COMPLETED,
              'Cannot cancel an already completed migration'
            );
          }
        }

        const cancellationData = {
          completed: false,
          completedAt: null,
          version: MIGRATION_VERSION,
          entriesMigrated: null,
          source: 'indexeddb',
          device: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          cancelled: true,
          cancelledAt: serverTimestamp(),
          cancelReason: normalizedMetadata.reason || 'User cancelled migration',
          entriesProcessed: normalizedMetadata.entriesProcessed ?? 0,
          userId: userId,
          updatedAt: serverTimestamp(),
        };

        transaction.set(docRef, cancellationData);
      });

      // Also save to history for audit trail (outside transaction - non-critical)
      try {
        const historyRef = doc(getMigrationHistoryCollection(userId), `cancelled-${Date.now()}`);
        await setDoc(historyRef, {
          eventType: 'cancelled',
          completed: false,
          cancelled: true,
          cancelledAt: serverTimestamp(),
          cancelReason: normalizedMetadata.reason || 'User cancelled migration',
          entriesProcessed: normalizedMetadata.entriesProcessed ?? 0,
          version: MIGRATION_VERSION,
          source: 'indexeddb',
          device: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          userId: userId,
          timestamp: serverTimestamp(),
        });
      } catch (historyError) {
        // Log but don't fail - history is secondary
        if (import.meta.env.DEV) {
          console.warn('Failed to save cancellation history:', historyError);
        }
      }

      if (import.meta.env.DEV) {
        console.log('Migration marked as cancelled:', {
          entriesProcessed: normalizedMetadata.entriesProcessed ?? 0,
          reason: normalizedMetadata.reason || 'User cancelled migration',
        });
      }

      return true;
    } catch (error) {
      // Don't retry if it's an ALREADY_COMPLETED error (race condition detected)
      if (error.code === MigrationStatusErrorCodes.ALREADY_COMPLETED) {
        throw error;
      }

      lastError = error;
      const errorCode = categorizeFirestoreError(error);

      if (import.meta.env.DEV) {
        console.error(`Mark migration cancelled attempt ${attempt + 1} failed:`, error);
      }

      // Only retry on network errors
      if (errorCode === MigrationStatusErrorCodes.NETWORK_ERROR && attempt < MAX_RETRY_ATTEMPTS - 1) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      // For auth/permission errors, throw immediately
      throw createMigrationStatusError(
        errorCode,
        'Failed to mark migration as cancelled',
        error
      );
    }
  }

  // All retries exhausted
  throw createMigrationStatusError(
    MigrationStatusErrorCodes.NETWORK_ERROR,
    'Failed to mark migration as cancelled after multiple attempts',
    lastError
  );
}

/**
 * Retrieve all migration attempts for debugging
 *
 * Returns the history of all migration events (completions, cancellations)
 * for debugging and audit purposes.
 *
 * @param {string} userId - User ID (must match authenticated user)
 * @returns {Promise<Array<Object>>} Array of migration events
 * @throws {Error} If not authenticated or userId mismatch
 *
 * @example
 * const history = await getMigrationHistory('user123');
 * console.log(`Found ${history.length} migration events`);
 */
export async function getMigrationHistory(userId) {
  validateAuthentication(userId);

  let lastError = null;

  // Retry logic with exponential backoff for network errors
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const historyRef = getMigrationHistoryCollection(userId);
      const q = query(historyRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Also check the main migration document for current state
        const mainStatus = await checkMigrationStatus(userId);
        if (mainStatus.completed || mainStatus.cancelled) {
          // Return current status as the only history entry
          return [{
            id: 'current',
            eventType: mainStatus.completed ? 'completed' : 'cancelled',
            completed: mainStatus.completed,
            completedAt: mainStatus.completedAt,
            cancelled: mainStatus.cancelled,
            cancelledAt: mainStatus.cancelledAt,
            cancelReason: mainStatus.cancelReason,
            entriesMigrated: mainStatus.entriesMigrated,
            entriesProcessed: mainStatus.entriesProcessed,
            version: mainStatus.version,
          }];
        }
        return [];
      }

      const history = snapshot.docs.map(docSnap => {
        const data = docSnap.data();

        // Convert Firestore Timestamps to Dates
        let timestamp = null;
        if (data.timestamp) {
          if (data.timestamp.toDate) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp instanceof Date) {
            timestamp = data.timestamp;
          } else {
            timestamp = new Date(data.timestamp);
          }
        }

        let completedAt = null;
        if (data.completedAt) {
          if (data.completedAt.toDate) {
            completedAt = data.completedAt.toDate();
          } else if (data.completedAt instanceof Date) {
            completedAt = data.completedAt;
          } else {
            completedAt = new Date(data.completedAt);
          }
        }

        let cancelledAt = null;
        if (data.cancelledAt) {
          if (data.cancelledAt.toDate) {
            cancelledAt = data.cancelledAt.toDate();
          } else if (data.cancelledAt instanceof Date) {
            cancelledAt = data.cancelledAt;
          } else {
            cancelledAt = new Date(data.cancelledAt);
          }
        }

        return {
          id: docSnap.id,
          eventType: data.eventType,
          completed: data.completed || false,
          completedAt,
          cancelled: data.cancelled || false,
          cancelledAt,
          cancelReason: data.cancelReason || null,
          entriesMigrated: data.entriesMigrated ?? null,
          entriesProcessed: data.entriesProcessed ?? null,
          version: data.version || null,
          source: data.source || null,
          device: data.device || null,
          timestamp,
        };
      });

      if (import.meta.env.DEV) {
        console.log(`Migration history: ${history.length} events`);
      }

      return history;
    } catch (error) {
      lastError = error;
      const errorCode = categorizeFirestoreError(error);

      if (import.meta.env.DEV) {
        console.error(`Get migration history attempt ${attempt + 1} failed:`, error);
      }

      // Only retry on network errors
      if (errorCode === MigrationStatusErrorCodes.NETWORK_ERROR && attempt < MAX_RETRY_ATTEMPTS - 1) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
        continue;
      }

      // For auth/permission errors, throw immediately
      throw createMigrationStatusError(
        errorCode,
        'Failed to retrieve migration history',
        error
      );
    }
  }

  // All retries exhausted
  throw createMigrationStatusError(
    MigrationStatusErrorCodes.NETWORK_ERROR,
    'Failed to retrieve migration history after multiple attempts',
    lastError
  );
}

/**
 * Get current migration version
 * @returns {string} Current migration schema version
 */
export function getMigrationVersion() {
  return MIGRATION_VERSION;
}

/**
 * Get current consent version
 * @returns {string} Current consent policy version (for GDPR compliance)
 */
export function getConsentVersion() {
  return CONSENT_VERSION;
}
