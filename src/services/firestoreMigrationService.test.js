/**
 * Tests for Firestore Migration Service Layer
 *
 * These tests verify all migration operations including:
 * - Batch writes (500 entries per batch)
 * - Entry counting using aggregation
 * - Duplicate detection and last-write-wins strategy
 * - GDPR-compliant data deletion
 * - Authentication validation
 * - Error handling for network, quota, and auth errors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase Firestore module
vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    writeBatch: vi.fn(),
    deleteDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
    getCountFromServer: vi.fn(),
    Timestamp: {
      fromDate: vi.fn((date) => ({
        toDate: () => date,
        _type: 'Timestamp',
      })),
    },
    query: vi.fn((ref) => ref),
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
  batchWriteEntries,
  getEntryCount,
  checkEntryExists,
  getEntry,
  deleteAllUserEntries,
  compareTimestamps,
  resolveDuplicate,
  validateEntryForFirestore,
  getBatchSize,
  validateEntry,
  MigrationErrorCodes,
} from './firestoreMigrationService';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore';

import { auth, isAuthenticated, getCurrentUserId } from '../lib/firebase';

// Test data
const TEST_USER_ID = 'test-user-123';
const TEST_ENTRY_ID = 'entry-456';

const validEntry = {
  id: 'entry-1',
  type: 'income',
  amount: 5000,
  date: '2026-03-01',
  accountingMonth: '2026-03',
  note: 'Monthly salary',
};

const validDonation = {
  id: 'donation-1',
  type: 'donation',
  amount: 500,
  date: '2026-03-01',
  accountingMonth: '2026-03',
  description: 'Charity donation',
};

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

// Helper to create mock batch
function createMockBatch() {
  return {
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };
}

describe('Firestore Migration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAuthenticatedState();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('MigrationErrorCodes', () => {
    it('should export correct error codes', () => {
      expect(MigrationErrorCodes.NOT_AUTHENTICATED).toBe('migration/not-authenticated');
      expect(MigrationErrorCodes.INVALID_USER_ID).toBe('migration/invalid-user-id');
      expect(MigrationErrorCodes.USER_MISMATCH).toBe('migration/user-mismatch');
      expect(MigrationErrorCodes.INVALID_ENTRY).toBe('migration/invalid-entry');
      expect(MigrationErrorCodes.BATCH_WRITE_FAILED).toBe('migration/batch-write-failed');
      expect(MigrationErrorCodes.NETWORK_ERROR).toBe('migration/network-error');
      expect(MigrationErrorCodes.QUOTA_EXCEEDED).toBe('migration/quota-exceeded');
      expect(MigrationErrorCodes.UNKNOWN_ERROR).toBe('migration/unknown-error');
    });
  });

  describe('getBatchSize', () => {
    it('should return 500 (Firestore limit)', () => {
      expect(getBatchSize()).toBe(500);
    });
  });

  describe('validateEntryForFirestore', () => {
    it('should validate a correct income entry', () => {
      const result = validateEntryForFirestore(validEntry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a correct donation entry', () => {
      const result = validateEntryForFirestore(validDonation);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null entry', () => {
      const result = validateEntryForFirestore(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry must be an object');
    });

    it('should reject entry without id', () => {
      const entry = { ...validEntry, id: undefined };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry must have a valid id (string)');
    });

    it('should reject entry with empty id', () => {
      const entry = { ...validEntry, id: '   ' };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry must have a valid id (string)');
    });

    it('should reject entry with invalid type', () => {
      const entry = { ...validEntry, type: 'expense' };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry type must be "income" or "donation"');
    });

    it('should reject entry without date', () => {
      const entry = { ...validEntry, date: undefined };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry must have a valid date (string)');
    });

    it('should reject entry with invalid date format', () => {
      const entry = { ...validEntry, date: 'not-a-date' };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry date must be a valid ISO date string');
    });

    it('should reject entry with zero amount', () => {
      const entry = { ...validEntry, amount: 0 };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry amount must be positive');
    });

    it('should reject entry with negative amount', () => {
      const entry = { ...validEntry, amount: -100 };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry amount must be positive');
    });

    it('should reject entry with amount exceeding max', () => {
      const entry = { ...validEntry, amount: 1000000001 };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must not exceed');
    });

    it('should reject entry with NaN amount', () => {
      const entry = { ...validEntry, amount: NaN };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry must have a valid amount (number)');
    });

    it('should reject entry with non-string note', () => {
      const entry = { ...validEntry, note: 123 };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry note must be a string');
    });

    it('should reject entry with note exceeding max length', () => {
      const entry = { ...validEntry, note: 'x'.repeat(501) };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('must not exceed 500 characters');
    });

    it('should accept entry with empty note', () => {
      const entry = { ...validEntry, note: '' };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(true);
    });

    it('should reject entry with invalid accountingMonth format', () => {
      const entry = { ...validEntry, accountingMonth: '2026-13' };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry accountingMonth must be in YYYY-MM format');
    });

    it('should accept entry without accountingMonth (derived from date)', () => {
      const entry = { ...validEntry, accountingMonth: undefined };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(true);
    });

    it('should collect multiple validation errors', () => {
      const entry = { id: '', type: 'bad', amount: -1 };
      const result = validateEntryForFirestore(entry);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('validateEntry (alias)', () => {
    it('should be an alias for validateEntryForFirestore', () => {
      const result = validateEntry(validEntry);
      expect(result.valid).toBe(true);
    });
  });

  describe('batchWriteEntries', () => {
    let mockBatch;

    beforeEach(() => {
      mockBatch = createMockBatch();
      writeBatch.mockReturnValue(mockBatch);
      collection.mockReturnValue({ _type: 'collection' });
      doc.mockReturnValue({ _type: 'doc' });
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(batchWriteEntries(TEST_USER_ID, [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if userId is empty', async () => {
      await expect(batchWriteEntries('', [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw if userId is null', async () => {
      await expect(batchWriteEntries(null, [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.INVALID_USER_ID,
      });
    });

    it('should throw if userId does not match authenticated user', async () => {
      await expect(batchWriteEntries('different-user', [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.USER_MISMATCH,
      });
    });

    it('should throw if entries is not an array', async () => {
      await expect(batchWriteEntries(TEST_USER_ID, 'not-array')).rejects.toMatchObject({
        code: MigrationErrorCodes.INVALID_ENTRY,
      });
    });

    it('should return empty result for empty array', async () => {
      const result = await batchWriteEntries(TEST_USER_ID, []);
      expect(result).toEqual({ success: 0, failed: [] });
    });

    it('should write valid entries successfully', async () => {
      const entries = [validEntry, validDonation];
      const result = await batchWriteEntries(TEST_USER_ID, entries);

      expect(result.success).toBe(2);
      expect(result.failed).toHaveLength(0);
      expect(mockBatch.set).toHaveBeenCalledTimes(2);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid entries in batch', async () => {
      const invalidEntry = { id: '', type: 'bad', amount: -1 };
      const entries = [validEntry, invalidEntry];

      const result = await batchWriteEntries(TEST_USER_ID, entries);

      expect(result.success).toBe(1);
      expect(result.failed).toHaveLength(1);
      // Empty id reports as 'unknown' for better error tracking
      expect(result.failed[0].id).toBe('unknown');
    });

    it('should process entries in batches of 500', async () => {
      // Create 501 entries to trigger multiple batches
      const entries = Array.from({ length: 501 }, (_, i) => ({
        ...validEntry,
        id: `entry-${i}`,
      }));

      const result = await batchWriteEntries(TEST_USER_ID, entries);

      expect(result.success).toBe(501);
      expect(mockBatch.commit).toHaveBeenCalledTimes(2); // Two batches
    });

    it('should handle batch commit failure', async () => {
      const networkError = new Error('Network unavailable');
      networkError.code = 'unavailable';
      mockBatch.commit.mockRejectedValueOnce(networkError);

      await expect(batchWriteEntries(TEST_USER_ID, [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.NETWORK_ERROR,
      });
    });

    it('should handle quota exceeded error', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.code = 'resource-exhausted';
      mockBatch.commit.mockRejectedValueOnce(quotaError);

      await expect(batchWriteEntries(TEST_USER_ID, [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.QUOTA_EXCEEDED,
      });
    });

    it('should use merge option for set operations', async () => {
      await batchWriteEntries(TEST_USER_ID, [validEntry]);

      expect(mockBatch.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: validEntry.id }),
        { merge: true }
      );
    });

    it('should derive accountingMonth from date if not provided', async () => {
      const entryWithoutAccountingMonth = {
        id: 'entry-no-month',
        type: 'income',
        amount: 1000,
        date: '2026-05-15',
      };

      await batchWriteEntries(TEST_USER_ID, [entryWithoutAccountingMonth]);

      expect(mockBatch.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ accountingMonth: '2026-05' }),
        expect.anything()
      );
    });

    it('should include userId in document data', async () => {
      await batchWriteEntries(TEST_USER_ID, [validEntry]);

      expect(mockBatch.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: TEST_USER_ID }),
        expect.anything()
      );
    });

    it('should handle description field from note', async () => {
      await batchWriteEntries(TEST_USER_ID, [validEntry]);

      expect(mockBatch.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ description: validEntry.note }),
        expect.anything()
      );
    });
  });

  describe('getEntryCount', () => {
    beforeEach(() => {
      collection.mockReturnValue({ _type: 'collection' });
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(getEntryCount(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if userId mismatch', async () => {
      await expect(getEntryCount('different-user')).rejects.toMatchObject({
        code: MigrationErrorCodes.USER_MISMATCH,
      });
    });

    it('should return entry count from aggregation query', async () => {
      getCountFromServer.mockResolvedValueOnce({
        data: () => ({ count: 42 }),
      });

      const count = await getEntryCount(TEST_USER_ID);

      expect(count).toBe(42);
      expect(getCountFromServer).toHaveBeenCalled();
    });

    it('should return 0 for empty collection', async () => {
      getCountFromServer.mockResolvedValueOnce({
        data: () => ({ count: 0 }),
      });

      const count = await getEntryCount(TEST_USER_ID);

      expect(count).toBe(0);
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'unavailable';
      getCountFromServer.mockRejectedValueOnce(networkError);

      await expect(getEntryCount(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationErrorCodes.NETWORK_ERROR,
      });
    });
  });

  describe('checkEntryExists', () => {
    beforeEach(() => {
      doc.mockReturnValue({ _type: 'doc' });
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(checkEntryExists(TEST_USER_ID, TEST_ENTRY_ID)).rejects.toMatchObject({
        code: MigrationErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if entryId is empty', async () => {
      await expect(checkEntryExists(TEST_USER_ID, '')).rejects.toMatchObject({
        code: MigrationErrorCodes.INVALID_ENTRY,
      });
    });

    it('should throw if entryId is null', async () => {
      await expect(checkEntryExists(TEST_USER_ID, null)).rejects.toMatchObject({
        code: MigrationErrorCodes.INVALID_ENTRY,
      });
    });

    it('should throw if entryId is whitespace only', async () => {
      await expect(checkEntryExists(TEST_USER_ID, '   ')).rejects.toMatchObject({
        code: MigrationErrorCodes.INVALID_ENTRY,
      });
    });

    it('should return true if entry exists', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
      });

      const exists = await checkEntryExists(TEST_USER_ID, TEST_ENTRY_ID);

      expect(exists).toBe(true);
    });

    it('should return false if entry does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const exists = await checkEntryExists(TEST_USER_ID, TEST_ENTRY_ID);

      expect(exists).toBe(false);
    });

    it('should handle permission denied errors', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.code = 'permission-denied';
      getDoc.mockRejectedValueOnce(permissionError);

      await expect(checkEntryExists(TEST_USER_ID, TEST_ENTRY_ID)).rejects.toMatchObject({
        code: MigrationErrorCodes.NOT_AUTHENTICATED,
      });
    });
  });

  describe('getEntry', () => {
    beforeEach(() => {
      doc.mockReturnValue({ _type: 'doc' });
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(getEntry(TEST_USER_ID, TEST_ENTRY_ID)).rejects.toMatchObject({
        code: MigrationErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if entryId is invalid', async () => {
      await expect(getEntry(TEST_USER_ID, '')).rejects.toMatchObject({
        code: MigrationErrorCodes.INVALID_ENTRY,
      });
    });

    it('should return null if entry does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const entry = await getEntry(TEST_USER_ID, TEST_ENTRY_ID);

      expect(entry).toBeNull();
    });

    it('should return entry data if exists', async () => {
      const mockData = {
        id: TEST_ENTRY_ID,
        type: 'income',
        amount: 1000,
        date: '2026-03-01',
        createdAt: {
          toDate: () => new Date('2026-03-01T10:00:00Z'),
        },
        updatedAt: {
          toDate: () => new Date('2026-03-01T11:00:00Z'),
        },
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockData,
      });

      const entry = await getEntry(TEST_USER_ID, TEST_ENTRY_ID);

      expect(entry.id).toBe(TEST_ENTRY_ID);
      expect(entry.type).toBe('income');
      expect(entry.amount).toBe(1000);
      expect(entry.createdAt).toBe('2026-03-01T10:00:00.000Z');
      expect(entry.updatedAt).toBe('2026-03-01T11:00:00.000Z');
    });

    it('should handle entries without Timestamp fields', async () => {
      const mockData = {
        id: TEST_ENTRY_ID,
        type: 'income',
        amount: 1000,
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-01T11:00:00Z',
      };

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => mockData,
      });

      const entry = await getEntry(TEST_USER_ID, TEST_ENTRY_ID);

      expect(entry.createdAt).toBe('2026-03-01T10:00:00Z');
      expect(entry.updatedAt).toBe('2026-03-01T11:00:00Z');
    });
  });

  describe('deleteAllUserEntries', () => {
    let mockBatch;

    beforeEach(() => {
      mockBatch = createMockBatch();
      writeBatch.mockReturnValue(mockBatch);
      collection.mockReturnValue({ _type: 'collection' });
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(deleteAllUserEntries(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should throw if userId mismatch', async () => {
      await expect(deleteAllUserEntries('different-user')).rejects.toMatchObject({
        code: MigrationErrorCodes.USER_MISMATCH,
      });
    });

    it('should return 0 if no entries exist', async () => {
      getDocs.mockResolvedValueOnce({
        empty: true,
        docs: [],
      });

      const count = await deleteAllUserEntries(TEST_USER_ID);

      expect(count).toBe(0);
      expect(mockBatch.commit).not.toHaveBeenCalled();
    });

    it('should delete all entries in batches', async () => {
      const mockDocs = Array.from({ length: 3 }, (_, i) => ({
        ref: { id: `entry-${i}` },
      }));

      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const count = await deleteAllUserEntries(TEST_USER_ID);

      expect(count).toBe(3);
      expect(mockBatch.delete).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle large datasets with multiple batches', async () => {
      // Create 501 mock documents
      const mockDocs = Array.from({ length: 501 }, (_, i) => ({
        ref: { id: `entry-${i}` },
      }));

      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const count = await deleteAllUserEntries(TEST_USER_ID);

      expect(count).toBe(501);
      expect(mockBatch.commit).toHaveBeenCalledTimes(2); // Two batches
    });

    it('should handle network errors during delete', async () => {
      const mockDocs = [{ ref: { id: 'entry-1' } }];
      getDocs.mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      });

      const networkError = new Error('Network error');
      networkError.code = 'unavailable';
      mockBatch.commit.mockRejectedValueOnce(networkError);

      await expect(deleteAllUserEntries(TEST_USER_ID)).rejects.toMatchObject({
        code: MigrationErrorCodes.NETWORK_ERROR,
      });
    });
  });

  describe('compareTimestamps', () => {
    it('should return "local" when local is newer', () => {
      const local = { updatedAt: '2026-03-02T12:00:00Z' };
      const firestore = {
        updatedAt: { toDate: () => new Date('2026-03-01T12:00:00Z') },
      };

      const result = compareTimestamps(local, firestore);

      expect(result).toBe('local');
    });

    it('should return "firestore" when firestore is newer', () => {
      const local = { updatedAt: '2026-03-01T12:00:00Z' };
      const firestore = {
        updatedAt: { toDate: () => new Date('2026-03-02T12:00:00Z') },
      };

      const result = compareTimestamps(local, firestore);

      expect(result).toBe('firestore');
    });

    it('should return "equal" when timestamps are the same', () => {
      const local = { updatedAt: '2026-03-01T12:00:00Z' };
      const firestore = {
        updatedAt: { toDate: () => new Date('2026-03-01T12:00:00Z') },
      };

      const result = compareTimestamps(local, firestore);

      expect(result).toBe('equal');
    });

    it('should return "local" when only local entry exists', () => {
      const result = compareTimestamps({ updatedAt: '2026-03-01' }, null);
      expect(result).toBe('local');
    });

    it('should return "firestore" when only firestore entry exists', () => {
      const result = compareTimestamps(null, { updatedAt: new Date() });
      expect(result).toBe('firestore');
    });

    it('should return "equal" when both are null', () => {
      const result = compareTimestamps(null, null);
      expect(result).toBe('equal');
    });

    it('should handle Date objects in firestore entry', () => {
      const local = { updatedAt: '2026-03-01T12:00:00Z' };
      const firestore = { updatedAt: new Date('2026-03-02T12:00:00Z') };

      const result = compareTimestamps(local, firestore);

      expect(result).toBe('firestore');
    });

    it('should handle string dates in firestore entry', () => {
      const local = { updatedAt: '2026-03-02T12:00:00Z' };
      const firestore = { updatedAt: '2026-03-01T12:00:00Z' };

      const result = compareTimestamps(local, firestore);

      expect(result).toBe('local');
    });

    it('should handle missing updatedAt - use 0 as fallback', () => {
      const local = {};
      const firestore = {
        updatedAt: { toDate: () => new Date('2026-03-01T12:00:00Z') },
      };

      const result = compareTimestamps(local, firestore);

      expect(result).toBe('firestore');
    });

    it('should handle invalid local timestamp', () => {
      const local = { updatedAt: 'invalid-date' };
      const firestore = {
        updatedAt: { toDate: () => new Date('2026-03-01T12:00:00Z') },
      };

      const result = compareTimestamps(local, firestore);

      expect(result).toBe('firestore');
    });

    it('should handle invalid firestore timestamp', () => {
      const local = { updatedAt: '2026-03-01T12:00:00Z' };
      const firestore = { updatedAt: 'invalid-date' };

      const result = compareTimestamps(local, firestore);

      expect(result).toBe('local');
    });
  });

  describe('resolveDuplicate', () => {
    beforeEach(() => {
      doc.mockReturnValue({ _type: 'doc' });
    });

    it('should throw if not authenticated', async () => {
      setUnauthenticatedState();

      await expect(resolveDuplicate(TEST_USER_ID, validEntry)).rejects.toMatchObject({
        code: MigrationErrorCodes.NOT_AUTHENTICATED,
      });
    });

    it('should return shouldWrite=false for invalid local entry', async () => {
      const result = await resolveDuplicate(TEST_USER_ID, null);

      expect(result.shouldWrite).toBe(false);
      expect(result.reason).toContain('Invalid');
    });

    it('should return shouldWrite=true when entry does not exist', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => false,
      });

      const result = await resolveDuplicate(TEST_USER_ID, validEntry);

      expect(result.shouldWrite).toBe(true);
      expect(result.reason).toContain('does not exist');
    });

    it('should return shouldWrite=true when local is newer', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...validEntry,
          updatedAt: { toDate: () => new Date('2026-03-01T00:00:00Z') },
        }),
      });

      const localEntry = {
        ...validEntry,
        updatedAt: '2026-03-02T00:00:00Z',
      };

      const result = await resolveDuplicate(TEST_USER_ID, localEntry);

      expect(result.shouldWrite).toBe(true);
      expect(result.reason).toContain('Local entry is newer');
    });

    it('should return shouldWrite=false when firestore is newer', async () => {
      getDoc.mockResolvedValueOnce({
        exists: () => true,
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...validEntry,
          updatedAt: { toDate: () => new Date('2026-03-03T00:00:00Z') },
        }),
      });

      const localEntry = {
        ...validEntry,
        updatedAt: '2026-03-02T00:00:00Z',
      };

      const result = await resolveDuplicate(TEST_USER_ID, localEntry);

      expect(result.shouldWrite).toBe(false);
      expect(result.reason).toContain('Firestore entry is newer');
    });

    it('should return shouldWrite=false when timestamps are equal', async () => {
      const timestamp = '2026-03-02T12:00:00Z';

      getDoc.mockResolvedValueOnce({
        exists: () => true,
      });

      getDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          ...validEntry,
          updatedAt: { toDate: () => new Date(timestamp) },
        }),
      });

      const localEntry = {
        ...validEntry,
        updatedAt: timestamp,
      };

      const result = await resolveDuplicate(TEST_USER_ID, localEntry);

      expect(result.shouldWrite).toBe(false);
      expect(result.reason).toContain('equal');
    });
  });

  describe('Error categorization', () => {
    let mockBatch;

    beforeEach(() => {
      mockBatch = createMockBatch();
      writeBatch.mockReturnValue(mockBatch);
      collection.mockReturnValue({ _type: 'collection' });
      doc.mockReturnValue({ _type: 'doc' });
    });

    it('should categorize network-request-failed as NETWORK_ERROR', async () => {
      const error = new Error('Network failed');
      error.code = 'network-request-failed';
      mockBatch.commit.mockRejectedValueOnce(error);

      await expect(batchWriteEntries(TEST_USER_ID, [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.NETWORK_ERROR,
      });
    });

    it('should categorize unavailable as NETWORK_ERROR', async () => {
      const error = new Error('Service unavailable');
      error.code = 'unavailable';
      mockBatch.commit.mockRejectedValueOnce(error);

      await expect(batchWriteEntries(TEST_USER_ID, [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.NETWORK_ERROR,
      });
    });

    it('should categorize resource-exhausted as QUOTA_EXCEEDED', async () => {
      const error = new Error('Quota exceeded');
      error.code = 'resource-exhausted';
      mockBatch.commit.mockRejectedValueOnce(error);

      await expect(batchWriteEntries(TEST_USER_ID, [validEntry])).rejects.toMatchObject({
        code: MigrationErrorCodes.QUOTA_EXCEEDED,
      });
    });

    it('should categorize unauthenticated as NOT_AUTHENTICATED', async () => {
      const error = new Error('Unauthenticated');
      error.code = 'unauthenticated';
      mockBatch.commit.mockRejectedValueOnce(error);

      // For auth errors, it continues but marks entries as failed
      const result = await batchWriteEntries(TEST_USER_ID, [validEntry]);
      expect(result.failed).toHaveLength(1);
    });

    it('should categorize permission-denied as NOT_AUTHENTICATED', async () => {
      const error = new Error('Permission denied');
      error.code = 'permission-denied';
      mockBatch.commit.mockRejectedValueOnce(error);

      // For permission errors, it continues but marks entries as failed
      const result = await batchWriteEntries(TEST_USER_ID, [validEntry]);
      expect(result.failed).toHaveLength(1);
    });

    it('should categorize unknown errors as UNKNOWN_ERROR', async () => {
      const error = new Error('Something weird happened');
      error.code = 'weird-error';
      mockBatch.commit.mockRejectedValueOnce(error);

      // For unknown errors, it continues but marks entries as failed
      const result = await batchWriteEntries(TEST_USER_ID, [validEntry]);
      expect(result.failed).toHaveLength(1);
    });
  });

  describe('Large dataset performance', () => {
    let mockBatch;

    beforeEach(() => {
      mockBatch = createMockBatch();
      writeBatch.mockReturnValue(mockBatch);
      collection.mockReturnValue({ _type: 'collection' });
      doc.mockReturnValue({ _type: 'doc' });
    });

    it('should handle 100 entries', async () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({
        ...validEntry,
        id: `entry-${i}`,
      }));

      const result = await batchWriteEntries(TEST_USER_ID, entries);

      expect(result.success).toBe(100);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle exactly 500 entries (batch boundary)', async () => {
      const entries = Array.from({ length: 500 }, (_, i) => ({
        ...validEntry,
        id: `entry-${i}`,
      }));

      const result = await batchWriteEntries(TEST_USER_ID, entries);

      expect(result.success).toBe(500);
      expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle 1000 entries (2 batches)', async () => {
      const entries = Array.from({ length: 1000 }, (_, i) => ({
        ...validEntry,
        id: `entry-${i}`,
      }));

      const result = await batchWriteEntries(TEST_USER_ID, entries);

      expect(result.success).toBe(1000);
      expect(mockBatch.commit).toHaveBeenCalledTimes(2);
    });

    it('should handle 5000 entries (10 batches)', async () => {
      const entries = Array.from({ length: 5000 }, (_, i) => ({
        ...validEntry,
        id: `entry-${i}`,
      }));

      const result = await batchWriteEntries(TEST_USER_ID, entries);

      expect(result.success).toBe(5000);
      expect(mockBatch.commit).toHaveBeenCalledTimes(10);
    });
  });

  describe('Edge cases', () => {
    it('should handle entry with description instead of note', async () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        note: undefined,
        description: 'A description',
      });
      expect(result.valid).toBe(true);
    });

    it('should handle entry with both note and description', async () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        note: 'A note',
        description: 'A description',
      });
      expect(result.valid).toBe(true);
    });

    it('should handle numeric id (invalid)', () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        id: 123,
      });
      expect(result.valid).toBe(false);
    });

    it('should handle amount as string (invalid)', () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        amount: '1000',
      });
      expect(result.valid).toBe(false);
    });

    it('should handle very large valid amount', () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        amount: 999999999, // Just under 1 billion
      });
      expect(result.valid).toBe(true);
    });

    it('should handle ISO date with timezone', () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        date: '2026-03-01T12:00:00+03:00',
      });
      expect(result.valid).toBe(true);
    });

    it('should handle date-only format', () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        date: '2026-03-01',
      });
      expect(result.valid).toBe(true);
    });

    it('should handle accountingMonth at year boundary', () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        accountingMonth: '2026-01',
      });
      expect(result.valid).toBe(true);

      const result2 = validateEntryForFirestore({
        ...validEntry,
        accountingMonth: '2026-12',
      });
      expect(result2.valid).toBe(true);
    });

    it('should reject accountingMonth with invalid month 00', () => {
      const result = validateEntryForFirestore({
        ...validEntry,
        accountingMonth: '2026-00',
      });
      expect(result.valid).toBe(false);
    });
  });
});
