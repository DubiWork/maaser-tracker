import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, isAuthenticated, getCurrentUserId } from '../lib/firebase';
import { deleteAllUserEntries } from './firestoreMigrationService';

const BATCH_SIZE = 500;

export const GdprErrorCodes = {
  NOT_AUTHENTICATED: 'gdpr/not-authenticated',
  INVALID_USER_ID: 'gdpr/invalid-user-id',
  USER_MISMATCH: 'gdpr/user-mismatch',
  EXPORT_FAILED: 'gdpr/export-failed',
  DELETE_FAILED: 'gdpr/delete-failed',
  NETWORK_ERROR: 'gdpr/network-error',
};

function createGdprError(code, message, originalError) {
  const error = new Error(message);
  error.code = code;
  if (originalError) error.cause = originalError;
  return error;
}

function validateAuthentication(userId) {
  if (!isAuthenticated()) {
    throw createGdprError(
      GdprErrorCodes.NOT_AUTHENTICATED,
      'User must be authenticated'
    );
  }

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw createGdprError(
      GdprErrorCodes.INVALID_USER_ID,
      'Invalid user ID'
    );
  }

  if (userId !== getCurrentUserId()) {
    throw createGdprError(
      GdprErrorCodes.USER_MISMATCH,
      'User ID does not match authenticated user'
    );
  }
}

function categorizeFirestoreError(error) {
  const errorCode = error?.code || '';

  if (
    errorCode === 'unavailable' ||
    errorCode === 'network-request-failed' ||
    error.message?.includes('network') ||
    error.message?.includes('offline')
  ) {
    return GdprErrorCodes.NETWORK_ERROR;
  }

  if (
    errorCode === 'unauthenticated' ||
    errorCode === 'permission-denied' ||
    error.message?.includes('auth')
  ) {
    return GdprErrorCodes.NOT_AUTHENTICATED;
  }

  return null;
}

export async function exportUserData(userId) {
  validateAuthentication(userId);

  try {
    const entriesRef = collection(db, 'users', userId, 'entries');
    const snapshot = await getDocs(entriesRef);

    const entries = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    if (import.meta.env.DEV) {
      console.log(`GDPR export: ${entries.length} entries exported`);
    }

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      entries,
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('GDPR export failed:', error);
    }

    const networkCode = categorizeFirestoreError(error);
    throw createGdprError(
      networkCode || GdprErrorCodes.EXPORT_FAILED,
      'Failed to export user data',
      error
    );
  }
}

export async function deleteAllCloudData(userId) {
  validateAuthentication(userId);

  let deletedEntries = 0;

  try {
    // Step 1: Delete all user entries (reuse existing service)
    deletedEntries = await deleteAllUserEntries(userId);

    if (import.meta.env.DEV) {
      console.log(`GDPR delete: ${deletedEntries} entries deleted`);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('GDPR delete entries failed:', error);
    }

    const networkCode = categorizeFirestoreError(error);
    throw createGdprError(
      networkCode || GdprErrorCodes.DELETE_FAILED,
      'Failed to delete user entries',
      error
    );
  }

  try {
    // Step 2: Delete migration history docs
    const historyRef = collection(db, 'users', userId, 'metadata', 'migration', 'history');
    const historySnapshot = await getDocs(historyRef);

    if (!historySnapshot.empty) {
      const docs = historySnapshot.docs;

      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batchDocs = docs.slice(i, Math.min(i + BATCH_SIZE, docs.length));
        const batch = writeBatch(db);

        for (const docSnap of batchDocs) {
          batch.delete(docSnap.ref);
        }

        await batch.commit();

        if (import.meta.env.DEV) {
          console.log(`GDPR delete: ${batchDocs.length} history docs deleted`);
        }
      }
    }

    // Step 3: Delete migration metadata doc
    const migrationDocRef = doc(db, 'users', userId, 'metadata', 'migration');
    await deleteDoc(migrationDocRef);

    if (import.meta.env.DEV) {
      console.log('GDPR delete: migration metadata deleted');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('GDPR delete migration data failed:', error);
    }

    const networkCode = categorizeFirestoreError(error);
    throw createGdprError(
      networkCode || GdprErrorCodes.DELETE_FAILED,
      'Failed to delete migration data',
      error
    );
  }

  return {
    deletedEntries,
    migrationReset: true,
  };
}

export async function resetMigrationStatus(userId) {
  validateAuthentication(userId);

  try {
    const migrationDocRef = doc(db, 'users', userId, 'metadata', 'migration');
    await deleteDoc(migrationDocRef);

    if (import.meta.env.DEV) {
      console.log('GDPR: migration status reset via deleteDoc');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('GDPR reset migration status failed:', error);
    }

    const networkCode = categorizeFirestoreError(error);
    throw createGdprError(
      networkCode || GdprErrorCodes.DELETE_FAILED,
      'Failed to reset migration status',
      error
    );
  }
}
