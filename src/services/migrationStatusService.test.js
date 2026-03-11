/**
 * Tests for Migration Status Service
 *
 * These tests verify all migration status tracking operations including:
 * - Checking migration status
 * - Marking migration as complete
 * - Marking migration as cancelled (GDPR Article 7.3)
 * - Retrieving migration history
 * - Authentication validation
 * - Error handling for network, auth, and permission errors
 * - Race condition prevention
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase Firestore module
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
    Timestamp: {
      fromDate: vi.fn((date) => ({
        toDate: () => date,
        _type: 'Timestamp',
      })),
    },
    query: vi.fn((ref) => ref),
    orderBy: vi.fn(() => 'orderBy'),
    runTransaction: vi.fn(),
  };
});

// Mock Firebase lib
vi.mock('../lib/firebase', () => ({
  db: { _type: 'mockFirestore' },
  auth: {
    currentUser: null,
  },
  isAuthenticated: vi.fn(),
  getCurrentUserId: vi.fn(),
}));

// Import after mocks are set up
import {
  checkMigrationStatus,
  markMigrationComplete,
  markMigrationCancelled,
  getMigrationHistory,
  getMigrationVersion,
  getConsentVersion,
  MigrationStatusErrorCodes,
} from './migrationStatusService';

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  runTransaction,
} from 'firebase/firestore';

import { auth, isAuthenticated, getCurrentUserId } from '../lib/firebase';

// Test data
const TEST_USER_ID = 'test-user-123';

// Helper to set up authenticated state
function setAuthenticatedState(userId = TEST_USER_ID) {
  auth.currentUser = { uid: userId };
  isAuthenticated.mockReturnValue(true);
  getCurrentUserId.mockReturnValue(userId);
}

// Helper to set up unauthenticated state
function setUnauthenticatedState() {
  auth.currentUser = null;
  isAuthenticated.mockReturnValue(false);
  getCurrentUserId.mockReturnValue(null);
}

describe('Migration Status Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedState();
    doc.mockReturnValue({ _type: 'doc' });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('MigrationStatusErrorCodes', () => {
    it('should export correct error codes', () => {
      expect(MigrationStatusErrorCodes.NOT_AUTHENTICATED).toBe('migration-status/not-authenticated');
      expect(MigrationStatusErrorCodes.INVALID_USER_ID).toBe('migration-status/invalid-user-id');
      expect(MigrationStatusErrorCodes.USER_MISMATCH).toBe('migration-status/user-mismatch');
      expect(MigrationStatusErrorCodes.ALREADY_COMPLETED).toBe('migration-status/already-completed');
      expect(MigrationStatusErrorCodes.INVALID_METADATA).toBe('migration-status/invalid-metadata');
      expect(MigrationStatusErrorCodes.NETWORK_ERROR).toBe('migration-status/network-error');
      expect(MigrationStatusErrorCodes.PERMISSION_DENIED).toBe('migration-status/permission-denied');
      expect(MigrationStatusErrorCodes.UNKNOWN_ERROR).toBe('migration-status/unknown-error');
      expect(MigrationStatusErrorCodes.MISSING_CONSENT).toBe('migration-status/missing-consent');
      expect(MigrationStatusErrorCodes.RACE_CONDITION).toBe('migration-status/race-condition');
    });
  });

  describe('getMigrationVersion', () => {
    it('should return current migration version', () => {
      expect(getMigrationVersion()).toBe('1.0');
    });
  });

  describe('getConsentVersion', () => {
    it('should return current consent version', () => {
      expect(getConsentVersion()).toBe('1.0');
    });
  });

  describe('checkMigrationStatus', () => {
    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if userId is empty', async () => {
      await expect(checkMigrationStatus('')).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw if userId is null', async () => {
      await expect(checkMigrationStatus(null)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw if userId is whitespace only', async () => {
      await expect(checkMigrationStatus('   ')).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw if userId does not match authenticated user', async () => {
      await expect(checkMigrationStatus('different-user')).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.USER_MISMATCH,
      });
    });

    it('should return not completed status when document does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const status = await checkMigrationStatus(TEST_USER_ID);

      expect(status.completed).toBe(false);
      expect(status.completedAt).toBeNull();
      expect(status.version).toBeNull();
      expect(status.entriesMigrated).toBeNull();
      expect(status.cancelled).toBe(false);
    });

    it('should return completed status when migration is done', async () => {
      const mockDate = new Date('2026-03-01T12:00:00Z');
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          completed: true,
          completedAt: { toDate: () => mockDate },
          version: '1.0',
          entriesMigrated: 150,
          cancelled: false,
        }),
      });

      const status = await checkMigrationStatus(TEST_USER_ID);

      expect(status.completed).toBe(true);
      expect(status.completedAt).toEqual(mockDate);
      expect(status.version).toBe('1.0');
      expect(status.entriesMigrated).toBe(150);
      expect(status.cancelled).toBe(false);
    });

    it('should return cancelled status when migration was cancelled', async () => {
      const mockDate = new Date('2026-03-01T12:00:00Z');
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          completed: false,
          cancelled: true,
          cancelledAt: { toDate: () => mockDate },
          cancelReason: 'User cancelled',
          entriesProcessed: 50,
        }),
      });

      const status = await checkMigrationStatus(TEST_USER_ID);

      expect(status.completed).toBe(false);
      expect(status.cancelled).toBe(true);
      expect(status.cancelledAt).toEqual(mockDate);
      expect(status.cancelReason).toBe('User cancelled');
      expect(status.entriesProcessed).toBe(50);
    });

    it('should handle Date objects in timestamps', async () => {
      const mockDate = new Date('2026-03-01T12:00:00Z');
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          completed: true,
          completedAt: mockDate,
          version: '1.0',
          entriesMigrated: 100,
        }),
      });

      const status = await checkMigrationStatus(TEST_USER_ID);

      expect(status.completedAt).toEqual(mockDate);
    });

    it('should handle string timestamps', async () => {
      const dateString = '2026-03-01T12:00:00Z';
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          completed: true,
          completedAt: dateString,
          version: '1.0',
          entriesMigrated: 100,
        }),
      });

      const status = await checkMigrationStatus(TEST_USER_ID);

      expect(status.completedAt).toEqual(new Date(dateString));
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';

      // Fail twice, then succeed
      getDoc
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          exists: () => false,
        });

      const status = await checkMigrationStatus(TEST_USER_ID);

      expect(status.completed).toBe(false);
      expect(getDoc).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries on persistent network error', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';

      getDoc.mockRejectedValue(networkError);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });

      expect(getDoc).toHaveBeenCalledTimes(3);
    });

    it('should throw immediately on permission denied error', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.code = 'permission-denied';

      getDoc.mockRejectedValueOnce(permissionError);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.PERMISSION_DENIED,
      });

      expect(getDoc).toHaveBeenCalledTimes(1);
    });

    it('should throw immediately on unauthenticated error', async () => {
      const authError = new Error('Unauthenticated');
      authError.code = 'unauthenticated';

      getDoc.mockRejectedValueOnce(authError);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({}),
      });

      const status = await checkMigrationStatus(TEST_USER_ID);

      expect(status.completed).toBe(false);
      expect(status.completedAt).toBeNull();
      expect(status.version).toBeNull();
      expect(status.entriesMigrated).toBeNull();
      expect(status.cancelled).toBe(false);
    });
  });

  describe('markMigrationComplete', () => {
    beforeEach(() => {
      // Default: no existing migration document
      getDoc.mockResolvedValue({
        exists: () => false,
      });
      setDoc.mockResolvedValue(undefined);
      // Mock runTransaction to execute the callback
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if userId mismatch', async () => {
      await expect(markMigrationComplete('different-user', {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.USER_MISMATCH,
      });
    });

    it('should throw if metadata is not an object', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, null)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if metadata is a string', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, 'invalid')).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if entriesMigrated is missing', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, { consentGivenAt: new Date() })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if entriesMigrated is negative', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: -1,
        consentGivenAt: new Date(),
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if entriesMigrated is NaN', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: NaN,
        consentGivenAt: new Date(),
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if entriesMigrated is a string', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: '100',
        consentGivenAt: new Date(),
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if consentGivenAt is missing (GDPR compliance)', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, { entriesMigrated: 100 })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.MISSING_CONSENT,
      });
    });

    it('should throw if migration already completed (via transaction)', async () => {
      // Mock transaction to find existing completed document
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              completed: true,
              completedAt: { toDate: () => new Date() },
            }),
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.ALREADY_COMPLETED,
      });
    });

    it('should successfully mark migration as complete with consent', async () => {
      const consentDate = new Date('2026-03-01T12:00:00Z');
      const result = await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 150,
        consentGivenAt: consentDate,
      });

      expect(result).toBe(true);
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should accept custom source', async () => {
      await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        source: 'localstorage',
        consentGivenAt: new Date(),
      });

      expect(runTransaction).toHaveBeenCalled();
    });

    it('should accept custom device info', async () => {
      await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        device: 'Custom Device Info',
        consentGivenAt: new Date(),
      });

      expect(runTransaction).toHaveBeenCalled();
    });

    it('should accept zero entries migrated', async () => {
      const result = await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 0,
        consentGivenAt: new Date(),
      });

      expect(result).toBe(true);
    });

    it('should accept custom consent version', async () => {
      const result = await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
        consentVersion: '2.0',
      });

      expect(result).toBe(true);
    });

    it('should accept string timestamp for consent', async () => {
      const result = await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: '2026-03-01T12:00:00Z',
      });

      expect(result).toBe(true);
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';

      // First attempt fails, second succeeds
      runTransaction
        .mockRejectedValueOnce(networkError)
        .mockImplementationOnce(async (db, callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({ exists: () => false }),
            set: vi.fn(),
          };
          await callback(mockTransaction);
        });

      const result = await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      });

      expect(result).toBe(true);
    });

    it('should throw after max retries on persistent network error', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';

      runTransaction.mockRejectedValue(networkError);

      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });
    });

    it('should also write to history collection', async () => {
      await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      });

      // runTransaction for main write + setDoc for history
      expect(runTransaction).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    it('should not fail if history write fails', async () => {
      setDoc.mockRejectedValueOnce(new Error('History write failed'));

      const result = await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      });

      expect(result).toBe(true);
    });
  });

  describe('markMigrationCancelled', () => {
    beforeEach(() => {
      // Default: no existing migration document (for transaction mock)
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });
      setDoc.mockResolvedValue(undefined);
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(markMigrationCancelled(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if userId mismatch', async () => {
      await expect(markMigrationCancelled('different-user')).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.USER_MISMATCH,
      });
    });

    it('should throw if metadata is not an object', async () => {
      await expect(markMigrationCancelled(TEST_USER_ID, 'invalid')).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if entriesProcessed is negative', async () => {
      await expect(markMigrationCancelled(TEST_USER_ID, { entriesProcessed: -1 })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if entriesProcessed is NaN', async () => {
      await expect(markMigrationCancelled(TEST_USER_ID, { entriesProcessed: NaN })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_METADATA,
      });
    });

    it('should throw if migration already completed (detected inside transaction)', async () => {
      // Mock transaction to find existing completed document
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              completed: true,
              completedAt: { toDate: () => new Date() },
            }),
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await expect(markMigrationCancelled(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.ALREADY_COMPLETED,
      });
    });

    it('should use runTransaction (not bare setDoc) for atomic check-and-write', async () => {
      await markMigrationCancelled(TEST_USER_ID, {
        entriesProcessed: 50,
        reason: 'User cancelled',
      });

      expect(runTransaction).toHaveBeenCalled();
      // Verify the transaction callback was invoked with db
      expect(runTransaction.mock.calls[0][0]).toEqual({ _type: 'mockFirestore' });
    });

    it('should successfully mark migration as cancelled', async () => {
      const result = await markMigrationCancelled(TEST_USER_ID, {
        entriesProcessed: 50,
        reason: 'User cancelled',
      });

      expect(result).toBe(true);
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should write correct cancellation data inside transaction', async () => {
      let capturedData = null;
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn((ref, data) => { capturedData = data; }),
        };
        await callback(mockTransaction);
      });

      await markMigrationCancelled(TEST_USER_ID, {
        entriesProcessed: 50,
        reason: 'User cancelled',
      });

      expect(capturedData).not.toBeNull();
      expect(capturedData.completed).toBe(false);
      expect(capturedData.cancelled).toBe(true);
      expect(capturedData.cancelReason).toBe('User cancelled');
      expect(capturedData.entriesProcessed).toBe(50);
      expect(capturedData.userId).toBe(TEST_USER_ID);
    });

    it('should work with empty metadata', async () => {
      const result = await markMigrationCancelled(TEST_USER_ID);

      expect(result).toBe(true);
    });

    it('should work with null metadata', async () => {
      const result = await markMigrationCancelled(TEST_USER_ID, null);

      expect(result).toBe(true);
    });

    it('should accept zero entries processed', async () => {
      let capturedData = null;
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn((ref, data) => { capturedData = data; }),
        };
        await callback(mockTransaction);
      });

      const result = await markMigrationCancelled(TEST_USER_ID, { entriesProcessed: 0 });

      expect(result).toBe(true);
      expect(capturedData.entriesProcessed).toBe(0);
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';

      runTransaction
        .mockRejectedValueOnce(networkError)
        .mockImplementationOnce(async (db, callback) => {
          const mockTransaction = {
            get: vi.fn().mockResolvedValue({ exists: () => false }),
            set: vi.fn(),
          };
          await callback(mockTransaction);
        });

      const result = await markMigrationCancelled(TEST_USER_ID);

      expect(result).toBe(true);
    });

    it('should throw after max retries on persistent network error', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';

      runTransaction.mockRejectedValue(networkError);

      await expect(markMigrationCancelled(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });
    });

    it('should also write to history collection via setDoc', async () => {
      await markMigrationCancelled(TEST_USER_ID);

      // runTransaction for main write + setDoc for history
      expect(runTransaction).toHaveBeenCalledTimes(1);
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    it('should not fail if history write fails', async () => {
      setDoc.mockRejectedValueOnce(new Error('History write failed'));

      const result = await markMigrationCancelled(TEST_USER_ID);

      expect(result).toBe(true);
    });

    it('should detect race condition: cancellation fails if completed between read and write', async () => {
      // Simulate: transaction reads doc as completed (another device completed between our check and write)
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              completed: true,
              completedAt: { toDate: () => new Date() },
              entriesMigrated: 100,
            }),
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await expect(markMigrationCancelled(TEST_USER_ID, {
        entriesProcessed: 25,
        reason: 'User cancelled mid-migration',
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.ALREADY_COMPLETED,
        message: 'Cannot cancel an already completed migration',
      });

      // Verify transaction.set was NOT called (write was prevented)
      const txCallback = runTransaction.mock.calls[0][1];
      const spyTransaction = {
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ completed: true }),
        }),
        set: vi.fn(),
      };
      await expect(txCallback(spyTransaction)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.ALREADY_COMPLETED,
      });
      expect(spyTransaction.set).not.toHaveBeenCalled();
    });

    it('should not retry ALREADY_COMPLETED errors', async () => {
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ completed: true }),
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await expect(markMigrationCancelled(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.ALREADY_COMPLETED,
      });

      // Should only be called once (no retry)
      expect(runTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMigrationHistory', () => {
    beforeEach(() => {
      getDoc.mockResolvedValue({
        exists: () => false,
      });
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(getMigrationHistory(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if userId mismatch', async () => {
      await expect(getMigrationHistory('different-user')).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.USER_MISMATCH,
      });
    });

    it('should return empty array when no history exists', async () => {
      getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const history = await getMigrationHistory(TEST_USER_ID);

      expect(history).toEqual([]);
    });

    it('should return current status as history when history subcollection is empty but main doc exists', async () => {
      getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      // After getDocs, it checks main document
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          completed: true,
          completedAt: { toDate: () => new Date('2026-03-01') },
          entriesMigrated: 100,
          version: '1.0',
        }),
      });

      const history = await getMigrationHistory(TEST_USER_ID);

      expect(history).toHaveLength(1);
      expect(history[0].eventType).toBe('completed');
      expect(history[0].completed).toBe(true);
    });

    it('should return history entries sorted by timestamp descending', async () => {
      const mockDocs = [
        {
          id: 'completed-123',
          data: () => ({
            eventType: 'completed',
            completed: true,
            completedAt: { toDate: () => new Date('2026-03-02') },
            timestamp: { toDate: () => new Date('2026-03-02') },
            entriesMigrated: 150,
            version: '1.0',
          }),
        },
        {
          id: 'cancelled-456',
          data: () => ({
            eventType: 'cancelled',
            cancelled: true,
            cancelledAt: { toDate: () => new Date('2026-03-01') },
            timestamp: { toDate: () => new Date('2026-03-01') },
            entriesProcessed: 50,
            cancelReason: 'User cancelled',
          }),
        },
      ];

      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const history = await getMigrationHistory(TEST_USER_ID);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('completed-123');
      expect(history[0].eventType).toBe('completed');
      expect(history[1].id).toBe('cancelled-456');
      expect(history[1].eventType).toBe('cancelled');
    });

    it('should handle Date objects in history timestamps', async () => {
      const mockDate = new Date('2026-03-01T12:00:00Z');
      const mockDocs = [
        {
          id: 'event-1',
          data: () => ({
            eventType: 'completed',
            timestamp: mockDate,
            completedAt: mockDate,
          }),
        },
      ];

      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const history = await getMigrationHistory(TEST_USER_ID);

      expect(history[0].timestamp).toEqual(mockDate);
      expect(history[0].completedAt).toEqual(mockDate);
    });

    it('should handle string timestamps in history', async () => {
      const dateString = '2026-03-01T12:00:00Z';
      const mockDocs = [
        {
          id: 'event-1',
          data: () => ({
            eventType: 'completed',
            timestamp: dateString,
            completedAt: dateString,
          }),
        },
      ];

      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const history = await getMigrationHistory(TEST_USER_ID);

      expect(history[0].timestamp).toEqual(new Date(dateString));
    });

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';

      getDocs
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          empty: true,
          docs: [],
        });

      const history = await getMigrationHistory(TEST_USER_ID);

      expect(history).toEqual([]);
      expect(getDocs).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries on persistent network error', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';

      getDocs.mockRejectedValue(networkError);

      await expect(getMigrationHistory(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });
    });

    it('should handle missing optional fields in history entries', async () => {
      const mockDocs = [
        {
          id: 'event-1',
          data: () => ({
            eventType: 'completed',
          }),
        },
      ];

      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const history = await getMigrationHistory(TEST_USER_ID);

      expect(history[0].completed).toBe(false);
      expect(history[0].cancelled).toBe(false);
      expect(history[0].completedAt).toBeNull();
      expect(history[0].cancelledAt).toBeNull();
      expect(history[0].entriesMigrated).toBeNull();
    });
  });

  describe('Race condition prevention', () => {
    beforeEach(() => {
      setDoc.mockResolvedValue(undefined);
    });

    it('should prevent completing migration twice using transaction', async () => {
      // First call: not completed
      runTransaction.mockImplementationOnce(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      });

      // Second call: now completed (within transaction)
      runTransaction.mockImplementationOnce(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              completed: true,
              completedAt: { toDate: () => new Date() },
            }),
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 50,
        consentGivenAt: new Date(),
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.ALREADY_COMPLETED,
      });
    });

    it('should prevent cancelling completed migration via transaction', async () => {
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              completed: true,
              completedAt: { toDate: () => new Date() },
            }),
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await expect(markMigrationCancelled(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.ALREADY_COMPLETED,
      });
    });

    it('should allow cancelling after previous cancellation', async () => {
      // First cancel
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => false,
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });
      setDoc.mockResolvedValue(undefined);

      await markMigrationCancelled(TEST_USER_ID, { reason: 'First cancel' });

      // Second cancel - should work since it wasn't completed
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({
              completed: false,
              cancelled: true,
            }),
          }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      const result = await markMigrationCancelled(TEST_USER_ID, { reason: 'Second cancel' });

      expect(result).toBe(true);
    });

    it('should use atomic transaction to prevent race conditions in markMigrationComplete', async () => {
      // Verify that runTransaction is called for markMigrationComplete
      runTransaction.mockImplementationOnce(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: new Date(),
      });

      expect(runTransaction).toHaveBeenCalled();
    });

    it('should use atomic transaction to prevent race conditions in markMigrationCancelled', async () => {
      runTransaction.mockImplementationOnce(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });

      await markMigrationCancelled(TEST_USER_ID, {
        entriesProcessed: 50,
        reason: 'User cancelled',
      });

      expect(runTransaction).toHaveBeenCalled();
    });
  });

  describe('Error categorization', () => {
    it('should categorize network-request-failed as NETWORK_ERROR', async () => {
      const error = new Error('Network failed');
      error.code = 'network-request-failed';
      // Mock for all 3 retry attempts
      getDoc.mockRejectedValue(error);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });
    });

    it('should categorize unavailable as NETWORK_ERROR', async () => {
      const error = new Error('Service unavailable');
      error.code = 'unavailable';
      // Mock for all 3 retry attempts
      getDoc.mockRejectedValue(error);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });
    });

    it('should categorize aborted as NETWORK_ERROR (transaction contention)', async () => {
      const error = new Error('Transaction contention');
      error.code = 'aborted';
      // Mock for all 3 retry attempts
      getDoc.mockRejectedValue(error);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });
    });

    it('should categorize permission-denied as PERMISSION_DENIED', async () => {
      const error = new Error('Permission denied');
      error.code = 'permission-denied';
      getDoc.mockRejectedValueOnce(error);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.PERMISSION_DENIED,
      });
    });

    it('should categorize unauthenticated as NOT_AUTHENTICATED', async () => {
      const error = new Error('Unauthenticated');
      error.code = 'unauthenticated';
      getDoc.mockRejectedValueOnce(error);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should categorize unknown errors as UNKNOWN_ERROR', async () => {
      const error = new Error('Something weird');
      error.code = 'weird-error';
      getDoc.mockRejectedValueOnce(error);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.UNKNOWN_ERROR,
      });
    });

    it('should detect network error from message', async () => {
      const error = new Error('network connection lost');
      // Mock for all 3 retry attempts
      getDoc.mockRejectedValue(error);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });
    });

    it('should detect offline error from message', async () => {
      const error = new Error('You appear to be offline');
      // Mock for all 3 retry attempts
      getDoc.mockRejectedValue(error);

      await expect(checkMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.NETWORK_ERROR,
      });
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn(),
        };
        await callback(mockTransaction);
      });
      setDoc.mockResolvedValue(undefined);
    });

    it('should handle entriesMigrated of 0', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          completed: true,
          entriesMigrated: 0,
        }),
      });

      const status = await checkMigrationStatus(TEST_USER_ID);

      expect(status.entriesMigrated).toBe(0);
    });

    it('should handle very large entriesMigrated', async () => {
      const result = await markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 999999,
        consentGivenAt: new Date(),
      });

      expect(result).toBe(true);
    });

    it('should handle special characters in cancel reason', async () => {
      let capturedData = null;
      runTransaction.mockImplementation(async (db, callback) => {
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => false }),
          set: vi.fn((ref, data) => { capturedData = data; }),
        };
        await callback(mockTransaction);
      });
      setDoc.mockResolvedValue(undefined);

      const result = await markMigrationCancelled(TEST_USER_ID, {
        reason: 'User said: "Cancel <now>!" & left',
      });

      expect(result).toBe(true);
      expect(capturedData.cancelReason).toBe('User said: "Cancel <now>!" & left');
    });

    it('should handle empty string userId', async () => {
      await expect(checkMigrationStatus('')).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_USER_ID,
      });
    });

    it('should handle non-string userId', async () => {
      await expect(checkMigrationStatus(123)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_USER_ID,
      });
    });

    it('should handle undefined userId', async () => {
      await expect(checkMigrationStatus(undefined)).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw MISSING_CONSENT when consentGivenAt is undefined', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: undefined,
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.MISSING_CONSENT,
      });
    });

    it('should throw MISSING_CONSENT when consentGivenAt is null', async () => {
      await expect(markMigrationComplete(TEST_USER_ID, {
        entriesMigrated: 100,
        consentGivenAt: null,
      })).rejects.toMatchObject({
        code: MigrationStatusErrorCodes.MISSING_CONSENT,
      });
    });
  });
});
