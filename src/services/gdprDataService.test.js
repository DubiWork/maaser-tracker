import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: { _type: 'mockFirestore' },
  auth: { currentUser: null },
  isAuthenticated: vi.fn(),
  getCurrentUserId: vi.fn(),
}));

vi.mock('./firestoreMigrationService', () => ({
  deleteAllUserEntries: vi.fn(),
}));

import {
  exportUserData,
  deleteAllCloudData,
  resetMigrationStatus,
  GdprErrorCodes,
} from './gdprDataService';

import {
  collection,
  doc,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

import { auth, isAuthenticated, getCurrentUserId } from '../lib/firebase';
import { deleteAllUserEntries } from './firestoreMigrationService';

const TEST_USER_ID = 'test-user-123';

function setAuthenticated(userId = TEST_USER_ID) {
  auth.currentUser = { uid: userId };
  isAuthenticated.mockReturnValue(true);
  getCurrentUserId.mockReturnValue(userId);
}

function setUnauthenticated() {
  auth.currentUser = null;
  isAuthenticated.mockReturnValue(false);
  getCurrentUserId.mockReturnValue(null);
}

describe('gdprDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setUnauthenticated();
  });

  describe('GdprErrorCodes', () => {
    it('should export all expected error codes', () => {
      expect(GdprErrorCodes.NOT_AUTHENTICATED).toBe('gdpr/not-authenticated');
      expect(GdprErrorCodes.INVALID_USER_ID).toBe('gdpr/invalid-user-id');
      expect(GdprErrorCodes.USER_MISMATCH).toBe('gdpr/user-mismatch');
      expect(GdprErrorCodes.EXPORT_FAILED).toBe('gdpr/export-failed');
      expect(GdprErrorCodes.DELETE_FAILED).toBe('gdpr/delete-failed');
      expect(GdprErrorCodes.NETWORK_ERROR).toBe('gdpr/network-error');
    });
  });

  describe('exportUserData', () => {
    it('should return correct envelope structure with entries', async () => {
      setAuthenticated();
      const mockDocs = [
        {
          data: () => ({
            type: 'income',
            amount: 5000,
            date: '2026-01-01',
            createdAt: { toDate: () => new Date('2026-01-01T10:00:00Z') },
            updatedAt: { toDate: () => new Date('2026-01-01T10:00:00Z') },
          }),
        },
        {
          data: () => ({
            type: 'donation',
            amount: 500,
            date: '2026-01-02',
            createdAt: { toDate: () => new Date('2026-01-02T10:00:00Z') },
            updatedAt: null,
          }),
        },
      ];
      getDocs.mockResolvedValue({ docs: mockDocs });
      collection.mockReturnValue('entries-ref');

      const result = await exportUserData(TEST_USER_ID);

      expect(result).toHaveProperty('exportedAt');
      expect(result.schemaVersion).toBe(1);
      expect(result.entries).toHaveLength(2);
      expect(typeof result.exportedAt).toBe('string');
      expect(new Date(result.exportedAt).toISOString()).toBe(result.exportedAt);
    });

    it('should convert Firestore timestamps to ISO strings', async () => {
      setAuthenticated();
      const createdDate = new Date('2026-03-01T12:00:00Z');
      const updatedDate = new Date('2026-03-02T14:00:00Z');
      getDocs.mockResolvedValue({
        docs: [
          {
            data: () => ({
              type: 'income',
              amount: 1000,
              createdAt: { toDate: () => createdDate },
              updatedAt: { toDate: () => updatedDate },
            }),
          },
        ],
      });
      collection.mockReturnValue('entries-ref');

      const result = await exportUserData(TEST_USER_ID);

      expect(result.entries[0].createdAt).toBe('2026-03-01T12:00:00.000Z');
      expect(result.entries[0].updatedAt).toBe('2026-03-02T14:00:00.000Z');
    });

    it('should handle entries with plain string timestamps', async () => {
      setAuthenticated();
      getDocs.mockResolvedValue({
        docs: [
          {
            data: () => ({
              type: 'income',
              amount: 1000,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-02',
            }),
          },
        ],
      });
      collection.mockReturnValue('entries-ref');

      const result = await exportUserData(TEST_USER_ID);

      expect(result.entries[0].createdAt).toBe('2026-01-01');
      expect(result.entries[0].updatedAt).toBe('2026-01-02');
    });

    it('should return empty entries array when no cloud data exists', async () => {
      setAuthenticated();
      getDocs.mockResolvedValue({ docs: [] });
      collection.mockReturnValue('entries-ref');

      const result = await exportUserData(TEST_USER_ID);

      expect(result.entries).toEqual([]);
      expect(result.schemaVersion).toBe(1);
      expect(result).toHaveProperty('exportedAt');
    });

    it('should include all entry fields in export', async () => {
      setAuthenticated();
      const entryData = {
        type: 'income',
        amount: 5000,
        date: '2026-03-01',
        accountingMonth: '2026-03',
        note: 'Salary',
        createdAt: { toDate: () => new Date('2026-03-01T00:00:00Z') },
        updatedAt: { toDate: () => new Date('2026-03-01T00:00:00Z') },
      };
      getDocs.mockResolvedValue({ docs: [{ data: () => entryData }] });
      collection.mockReturnValue('entries-ref');

      const result = await exportUserData(TEST_USER_ID);

      expect(result.entries[0].type).toBe('income');
      expect(result.entries[0].amount).toBe(5000);
      expect(result.entries[0].date).toBe('2026-03-01');
      expect(result.entries[0].accountingMonth).toBe('2026-03');
      expect(result.entries[0].note).toBe('Salary');
    });

    it('should call collection with correct path', async () => {
      setAuthenticated();
      getDocs.mockResolvedValue({ docs: [] });
      collection.mockReturnValue('entries-ref');

      await exportUserData(TEST_USER_ID);

      expect(collection).toHaveBeenCalledWith(
        { _type: 'mockFirestore' },
        'users',
        TEST_USER_ID,
        'entries'
      );
    });

    it('should throw NOT_AUTHENTICATED when user is not authenticated', async () => {
      setUnauthenticated();

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw INVALID_USER_ID when userId is empty', async () => {
      isAuthenticated.mockReturnValue(true);
      getCurrentUserId.mockReturnValue('');

      await expect(exportUserData('')).rejects.toMatchObject({
        code: GdprErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw INVALID_USER_ID when userId is null', async () => {
      isAuthenticated.mockReturnValue(true);
      getCurrentUserId.mockReturnValue(null);

      await expect(exportUserData(null)).rejects.toMatchObject({
        code: GdprErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw INVALID_USER_ID when userId is whitespace only', async () => {
      isAuthenticated.mockReturnValue(true);
      getCurrentUserId.mockReturnValue('  ');

      await expect(exportUserData('  ')).rejects.toMatchObject({
        code: GdprErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw USER_MISMATCH when userId does not match authenticated user', async () => {
      isAuthenticated.mockReturnValue(true);
      getCurrentUserId.mockReturnValue('different-user');

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.USER_MISMATCH,
      });
    });

    it('should throw EXPORT_FAILED when Firestore query fails', async () => {
      setAuthenticated();
      collection.mockReturnValue('entries-ref');
      getDocs.mockRejectedValue(new Error('Firestore internal error'));

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.EXPORT_FAILED,
      });
    });

    it('should throw NETWORK_ERROR when Firestore returns unavailable', async () => {
      setAuthenticated();
      collection.mockReturnValue('entries-ref');
      const networkError = new Error('Service unavailable');
      networkError.code = 'unavailable';
      getDocs.mockRejectedValue(networkError);

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NETWORK_ERROR,
      });
    });

    it('should throw NETWORK_ERROR when Firestore returns network-request-failed', async () => {
      setAuthenticated();
      collection.mockReturnValue('entries-ref');
      const networkError = new Error('Network request failed');
      networkError.code = 'network-request-failed';
      getDocs.mockRejectedValue(networkError);

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NETWORK_ERROR,
      });
    });

    it('should throw NETWORK_ERROR when error message contains network', async () => {
      setAuthenticated();
      collection.mockReturnValue('entries-ref');
      getDocs.mockRejectedValue(new Error('network connection lost'));

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NETWORK_ERROR,
      });
    });

    it('should throw NETWORK_ERROR when error message contains offline', async () => {
      setAuthenticated();
      collection.mockReturnValue('entries-ref');
      getDocs.mockRejectedValue(new Error('client is offline'));

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NETWORK_ERROR,
      });
    });

    it('should throw NOT_AUTHENTICATED for unauthenticated Firestore errors', async () => {
      setAuthenticated();
      collection.mockReturnValue('entries-ref');
      const authError = new Error('Unauthenticated');
      authError.code = 'unauthenticated';
      getDocs.mockRejectedValue(authError);

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw NOT_AUTHENTICATED for permission-denied Firestore errors', async () => {
      setAuthenticated();
      collection.mockReturnValue('entries-ref');
      const permError = new Error('Permission denied');
      permError.code = 'permission-denied';
      getDocs.mockRejectedValue(permError);

      await expect(exportUserData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should preserve original error as cause', async () => {
      setAuthenticated();
      collection.mockReturnValue('entries-ref');
      const originalError = new Error('Original Firestore error');
      getDocs.mockRejectedValue(originalError);

      try {
        await exportUserData(TEST_USER_ID);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error.cause).toBe(originalError);
      }
    });
  });

  describe('deleteAllCloudData', () => {
    it('should delete all entries and migration data and return result', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(42);

      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: true, docs: [] });
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      const result = await deleteAllCloudData(TEST_USER_ID);

      expect(result).toEqual({ deletedEntries: 42, migrationReset: true });
    });

    it('should call deleteAllUserEntries with the userId', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(0);
      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: true, docs: [] });
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      await deleteAllCloudData(TEST_USER_ID);

      expect(deleteAllUserEntries).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should delete migration history docs in batches', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(10);

      const historyDocs = Array.from({ length: 3 }, (_, i) => ({
        ref: `history-doc-ref-${i}`,
      }));

      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: false, docs: historyDocs });

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(),
      };
      writeBatch.mockReturnValue(mockBatch);
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      await deleteAllCloudData(TEST_USER_ID);

      expect(mockBatch.delete).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should batch delete history docs in groups of 500', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(0);

      const historyDocs = Array.from({ length: 502 }, (_, i) => ({
        ref: `history-doc-ref-${i}`,
      }));

      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: false, docs: historyDocs });

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(),
      };
      writeBatch.mockReturnValue(mockBatch);
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      await deleteAllCloudData(TEST_USER_ID);

      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
      expect(mockBatch.delete).toHaveBeenCalledTimes(502);
    });

    it('should delete migration metadata document', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(0);
      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: true, docs: [] });
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      await deleteAllCloudData(TEST_USER_ID);

      expect(doc).toHaveBeenCalledWith(
        { _type: 'mockFirestore' },
        'users',
        TEST_USER_ID,
        'metadata',
        'migration'
      );
      expect(deleteDoc).toHaveBeenCalledWith('migration-doc-ref');
    });

    it('should skip batch delete when history is empty', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(5);
      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: true, docs: [] });
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      await deleteAllCloudData(TEST_USER_ID);

      expect(writeBatch).not.toHaveBeenCalled();
    });

    it('should throw NOT_AUTHENTICATED when user is not authenticated', async () => {
      setUnauthenticated();

      await expect(deleteAllCloudData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw DELETE_FAILED when deleteAllUserEntries fails', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteAllCloudData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.DELETE_FAILED,
      });
    });

    it('should throw NETWORK_ERROR when entry deletion hits network error', async () => {
      setAuthenticated();
      const networkError = new Error('unavailable');
      networkError.code = 'unavailable';
      deleteAllUserEntries.mockRejectedValue(networkError);

      await expect(deleteAllCloudData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NETWORK_ERROR,
      });
    });

    it('should throw DELETE_FAILED when migration history deletion fails', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(5);
      collection.mockReturnValue('history-ref');
      getDocs.mockRejectedValue(new Error('History read failed'));

      await expect(deleteAllCloudData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.DELETE_FAILED,
      });
    });

    it('should throw DELETE_FAILED when migration doc deleteDoc fails', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(5);
      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: true, docs: [] });
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockRejectedValue(new Error('Delete doc failed'));

      await expect(deleteAllCloudData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.DELETE_FAILED,
      });
    });

    it('should throw NETWORK_ERROR when migration metadata deletion hits network error', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(5);
      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: true, docs: [] });
      doc.mockReturnValue('migration-doc-ref');
      const networkError = new Error('Network failure');
      networkError.code = 'unavailable';
      deleteDoc.mockRejectedValue(networkError);

      await expect(deleteAllCloudData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NETWORK_ERROR,
      });
    });

    it('should preserve original error as cause on entry deletion failure', async () => {
      setAuthenticated();
      const originalError = new Error('original');
      deleteAllUserEntries.mockRejectedValue(originalError);

      try {
        await deleteAllCloudData(TEST_USER_ID);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error.cause).toBe(originalError);
      }
    });

    it('should throw USER_MISMATCH when userId does not match authenticated user', async () => {
      isAuthenticated.mockReturnValue(true);
      getCurrentUserId.mockReturnValue('different-user');

      await expect(deleteAllCloudData(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.USER_MISMATCH,
      });
    });

    it('should call collection with correct history path', async () => {
      setAuthenticated();
      deleteAllUserEntries.mockResolvedValue(0);
      collection.mockReturnValue('history-ref');
      getDocs.mockResolvedValue({ empty: true, docs: [] });
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      await deleteAllCloudData(TEST_USER_ID);

      expect(collection).toHaveBeenCalledWith(
        { _type: 'mockFirestore' },
        'users',
        TEST_USER_ID,
        'metadata',
        'migration',
        'history'
      );
    });
  });

  describe('resetMigrationStatus', () => {
    it('should delete migration document', async () => {
      setAuthenticated();
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      await resetMigrationStatus(TEST_USER_ID);

      expect(doc).toHaveBeenCalledWith(
        { _type: 'mockFirestore' },
        'users',
        TEST_USER_ID,
        'metadata',
        'migration'
      );
      expect(deleteDoc).toHaveBeenCalledWith('migration-doc-ref');
    });

    it('should throw NOT_AUTHENTICATED when user is not authenticated', async () => {
      setUnauthenticated();

      await expect(resetMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw INVALID_USER_ID when userId is empty', async () => {
      isAuthenticated.mockReturnValue(true);
      getCurrentUserId.mockReturnValue('');

      await expect(resetMigrationStatus('')).rejects.toMatchObject({
        code: GdprErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw USER_MISMATCH when userId does not match', async () => {
      isAuthenticated.mockReturnValue(true);
      getCurrentUserId.mockReturnValue('other-user');

      await expect(resetMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.USER_MISMATCH,
      });
    });

    it('should handle already-deleted document gracefully (no error on missing doc)', async () => {
      setAuthenticated();
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockResolvedValue();

      await expect(resetMigrationStatus(TEST_USER_ID)).resolves.toBeUndefined();
    });

    it('should throw DELETE_FAILED when deleteDoc fails', async () => {
      setAuthenticated();
      doc.mockReturnValue('migration-doc-ref');
      deleteDoc.mockRejectedValue(new Error('Delete failed'));

      await expect(resetMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.DELETE_FAILED,
      });
    });

    it('should throw NETWORK_ERROR when deleteDoc hits network error', async () => {
      setAuthenticated();
      doc.mockReturnValue('migration-doc-ref');
      const networkError = new Error('offline');
      networkError.code = 'unavailable';
      deleteDoc.mockRejectedValue(networkError);

      await expect(resetMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NETWORK_ERROR,
      });
    });

    it('should throw NOT_AUTHENTICATED for permission-denied Firestore error', async () => {
      setAuthenticated();
      doc.mockReturnValue('migration-doc-ref');
      const permError = new Error('Permission denied');
      permError.code = 'permission-denied';
      deleteDoc.mockRejectedValue(permError);

      await expect(resetMigrationStatus(TEST_USER_ID)).rejects.toMatchObject({
        code: GdprErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should preserve original error as cause', async () => {
      setAuthenticated();
      doc.mockReturnValue('migration-doc-ref');
      const originalError = new Error('original failure');
      deleteDoc.mockRejectedValue(originalError);

      try {
        await resetMigrationStatus(TEST_USER_ID);
        expect.unreachable('Should have thrown');
      } catch (error) {
        expect(error.cause).toBe(originalError);
      }
    });
  });
});
