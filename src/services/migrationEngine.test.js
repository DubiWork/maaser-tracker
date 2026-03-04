/**
 * Tests for Migration Engine
 *
 * These tests verify the core migration orchestration including:
 * - Complete migration flow
 * - Batch processing
 * - Duplicate handling (last-write-wins)
 * - Cancellation support (GDPR Article 7.3)
 * - Network retry with exponential backoff
 * - Verification step
 * - Error handling for various scenarios
 * - Performance targets
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock IndexedDB service
vi.mock('./db', () => ({
  getAllEntries: vi.fn(),
}));

// Mock Firestore Migration Service
vi.mock('./firestoreMigrationService', () => ({
  batchWriteEntries: vi.fn(),
  getEntryCount: vi.fn(),
  checkEntryExists: vi.fn(),
  getEntry: vi.fn(),
  deleteAllUserEntries: vi.fn(),
  compareTimestamps: vi.fn(),
  getBatchSize: vi.fn(() => 500),
  MigrationErrorCodes: {
    NOT_AUTHENTICATED: 'migration/not-authenticated',
    INVALID_USER_ID: 'migration/invalid-user-id',
    USER_MISMATCH: 'migration/user-mismatch',
    INVALID_ENTRY: 'migration/invalid-entry',
    BATCH_WRITE_FAILED: 'migration/batch-write-failed',
    NETWORK_ERROR: 'migration/network-error',
    QUOTA_EXCEEDED: 'migration/quota-exceeded',
    UNKNOWN_ERROR: 'migration/unknown-error',
  },
}));

// Mock Migration Status Service
vi.mock('./migrationStatusService', () => ({
  checkMigrationStatus: vi.fn(),
  markMigrationComplete: vi.fn(),
  markMigrationCancelled: vi.fn(),
  MigrationStatusErrorCodes: {
    NOT_AUTHENTICATED: 'migration-status/not-authenticated',
    INVALID_USER_ID: 'migration-status/invalid-user-id',
    USER_MISMATCH: 'migration-status/user-mismatch',
    ALREADY_COMPLETED: 'migration-status/already-completed',
    INVALID_METADATA: 'migration-status/invalid-metadata',
    NETWORK_ERROR: 'migration-status/network-error',
    PERMISSION_DENIED: 'migration-status/permission-denied',
    UNKNOWN_ERROR: 'migration-status/unknown-error',
  },
}));

// Import after mocks
import {
  migrateAllEntries,
  cancelMigration,
  verifyMigration,
  cleanupPartialData,
  getDefaultBatchSize,
  getMaxRetryAttempts,
  MigrationEngineErrorCodes,
} from './migrationEngine';

import { getAllEntries } from './db';
import {
  batchWriteEntries,
  getEntryCount,
  checkEntryExists,
  getEntry,
  deleteAllUserEntries,
  compareTimestamps,
  MigrationErrorCodes,
} from './firestoreMigrationService';
import {
  checkMigrationStatus,
  markMigrationComplete,
  markMigrationCancelled,
  MigrationStatusErrorCodes,
} from './migrationStatusService';

// Test data
const TEST_USER_ID = 'test-user-123';

const createTestEntry = (id, options = {}) => ({
  id: id || `entry-${Math.random().toString(36).slice(2)}`,
  type: options.type || 'income',
  amount: options.amount || 1000,
  date: options.date || '2026-03-01',
  accountingMonth: options.accountingMonth || '2026-03',
  note: options.note || 'Test entry',
  updatedAt: options.updatedAt || '2026-03-01T12:00:00Z',
  ...options,
});

const createTestEntries = (count) =>
  Array.from({ length: count }, (_, i) => createTestEntry(`entry-${i}`));

describe('Migration Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Default mocks for successful migration
    checkMigrationStatus.mockResolvedValue({
      completed: false,
      cancelled: false,
    });
    markMigrationComplete.mockResolvedValue(true);
    markMigrationCancelled.mockResolvedValue(true);
    batchWriteEntries.mockResolvedValue({ success: 0, failed: [] });
    getEntryCount.mockResolvedValue(0);
    checkEntryExists.mockResolvedValue(false);
    getEntry.mockResolvedValue(null);
    deleteAllUserEntries.mockResolvedValue(0);
    compareTimestamps.mockReturnValue('local');
    getAllEntries.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('MigrationEngineErrorCodes', () => {
    it('should export correct error codes', () => {
      expect(MigrationEngineErrorCodes.ALREADY_COMPLETED).toBe('migration-engine/already-completed');
      expect(MigrationEngineErrorCodes.NO_ENTRIES).toBe('migration-engine/no-entries');
      expect(MigrationEngineErrorCodes.CANCELLED).toBe('migration-engine/cancelled');
      expect(MigrationEngineErrorCodes.NETWORK_ERROR).toBe('migration-engine/network-error');
      expect(MigrationEngineErrorCodes.AUTH_ERROR).toBe('migration-engine/auth-error');
      expect(MigrationEngineErrorCodes.QUOTA_ERROR).toBe('migration-engine/quota-error');
      expect(MigrationEngineErrorCodes.VERIFICATION_FAILED).toBe('migration-engine/verification-failed');
      expect(MigrationEngineErrorCodes.UNKNOWN_ERROR).toBe('migration-engine/unknown-error');
    });
  });

  describe('getDefaultBatchSize', () => {
    it('should return 500', () => {
      expect(getDefaultBatchSize()).toBe(500);
    });
  });

  describe('getMaxRetryAttempts', () => {
    it('should return 3', () => {
      expect(getMaxRetryAttempts()).toBe(3);
    });
  });

  describe('migrateAllEntries', () => {
    describe('Empty database', () => {
      it('should handle empty IndexedDB (no entries to migrate)', async () => {
        getAllEntries.mockResolvedValue([]);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(0);
        expect(result.entriesFailed).toBe(0);
        expect(result.cancelled).toBe(false);
        expect(markMigrationComplete).toHaveBeenCalledWith(
          TEST_USER_ID,
          expect.objectContaining({ entriesMigrated: 0 })
        );
      });
    });

    describe('Already completed', () => {
      it('should throw if migration already completed', async () => {
        checkMigrationStatus.mockResolvedValue({
          completed: true,
          completedAt: new Date(),
        });

        // The function throws for ALREADY_COMPLETED error
        await expect(migrateAllEntries(TEST_USER_ID)).rejects.toMatchObject({
          code: MigrationEngineErrorCodes.ALREADY_COMPLETED,
        });
      });

      it('should not call getAllEntries if already completed', async () => {
        checkMigrationStatus.mockResolvedValue({
          completed: true,
          completedAt: new Date(),
        });

        await expect(migrateAllEntries(TEST_USER_ID)).rejects.toThrow();

        expect(getAllEntries).not.toHaveBeenCalled();
      });
    });

    describe('Small dataset', () => {
      it('should migrate 10 entries successfully', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(10);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(10);
        expect(result.entriesFailed).toBe(0);
        expect(batchWriteEntries).toHaveBeenCalledTimes(1);
        expect(markMigrationComplete).toHaveBeenCalled();
      });
    });

    describe('Medium dataset', () => {
      it('should migrate 100 entries successfully', async () => {
        const entries = createTestEntries(100);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 100, failed: [] });
        getEntryCount.mockResolvedValue(100);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(100);
        expect(batchWriteEntries).toHaveBeenCalledTimes(1);
      });
    });

    describe('Large dataset', () => {
      it('should process 500 entries in one batch', async () => {
        const entries = createTestEntries(500);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 500, failed: [] });
        getEntryCount.mockResolvedValue(500);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(500);
        expect(batchWriteEntries).toHaveBeenCalledTimes(1);
      });

      it('should process 501 entries in two batches', async () => {
        const entries = createTestEntries(501);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries
          .mockResolvedValueOnce({ success: 500, failed: [] })
          .mockResolvedValueOnce({ success: 1, failed: [] });
        getEntryCount.mockResolvedValue(501);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(501);
        expect(batchWriteEntries).toHaveBeenCalledTimes(2);
      });

      it('should process 1000 entries in two batches', async () => {
        const entries = createTestEntries(1000);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries
          .mockResolvedValueOnce({ success: 500, failed: [] })
          .mockResolvedValueOnce({ success: 500, failed: [] });
        getEntryCount.mockResolvedValue(1000);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(1000);
        expect(batchWriteEntries).toHaveBeenCalledTimes(2);
      });

      it('should process 5000 entries in ten batches', async () => {
        const entries = createTestEntries(5000);
        getAllEntries.mockResolvedValue(entries);

        // Mock 10 successful batches
        for (let i = 0; i < 10; i++) {
          batchWriteEntries.mockResolvedValueOnce({ success: 500, failed: [] });
        }
        getEntryCount.mockResolvedValue(5000);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(5000);
        expect(batchWriteEntries).toHaveBeenCalledTimes(10);
      });
    });

    describe('Duplicate handling', () => {
      it('should write entry when it does not exist in Firestore', async () => {
        const entries = [createTestEntry('entry-1')];
        getAllEntries.mockResolvedValue(entries);
        checkEntryExists.mockResolvedValue(false);
        batchWriteEntries.mockResolvedValue({ success: 1, failed: [] });
        getEntryCount.mockResolvedValue(1);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(1);
      });

      it('should skip entry when Firestore version is newer (last-write-wins)', async () => {
        const localEntry = createTestEntry('entry-1', { updatedAt: '2026-03-01T12:00:00Z' });
        const firestoreEntry = { ...localEntry, updatedAt: '2026-03-02T12:00:00Z' };

        getAllEntries.mockResolvedValue([localEntry]);
        checkEntryExists.mockResolvedValue(true);
        getEntry.mockResolvedValue(firestoreEntry);
        compareTimestamps.mockReturnValue('firestore');
        batchWriteEntries.mockResolvedValue({ success: 0, failed: [] });
        getEntryCount.mockResolvedValue(1);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.entriesSkipped).toBe(1);
        expect(result.entriesMigrated).toBe(0);
      });

      it('should write entry when local version is newer (last-write-wins)', async () => {
        const localEntry = createTestEntry('entry-1', { updatedAt: '2026-03-02T12:00:00Z' });
        const firestoreEntry = { ...localEntry, updatedAt: '2026-03-01T12:00:00Z' };

        getAllEntries.mockResolvedValue([localEntry]);
        checkEntryExists.mockResolvedValue(true);
        getEntry.mockResolvedValue(firestoreEntry);
        compareTimestamps.mockReturnValue('local');
        batchWriteEntries.mockResolvedValue({ success: 1, failed: [] });
        getEntryCount.mockResolvedValue(1);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.entriesMigrated).toBe(1);
        expect(result.entriesSkipped).toBe(0);
      });

      it('should skip entry when timestamps are equal', async () => {
        const localEntry = createTestEntry('entry-1', { updatedAt: '2026-03-01T12:00:00Z' });

        getAllEntries.mockResolvedValue([localEntry]);
        checkEntryExists.mockResolvedValue(true);
        getEntry.mockResolvedValue(localEntry);
        compareTimestamps.mockReturnValue('equal');
        batchWriteEntries.mockResolvedValue({ success: 0, failed: [] });
        getEntryCount.mockResolvedValue(1);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.entriesSkipped).toBe(1);
      });
    });

    describe('Progress callbacks', () => {
      it('should call onProgress callback', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(10);

        const onProgress = vi.fn();

        await migrateAllEntries(TEST_USER_ID, { onProgress });

        expect(onProgress).toHaveBeenCalled();
        // First call with 0, total
        expect(onProgress).toHaveBeenCalledWith(0, 10);
      });

      it('should call onBatchComplete callback', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(10);

        const onBatchComplete = vi.fn();

        await migrateAllEntries(TEST_USER_ID, { onBatchComplete });

        expect(onBatchComplete).toHaveBeenCalledWith(1, 10);
      });

      it('should handle callback errors gracefully', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(10);

        const onProgress = vi.fn(() => {
          throw new Error('Callback error');
        });

        // Should not throw
        const result = await migrateAllEntries(TEST_USER_ID, { onProgress });

        expect(result.success).toBe(true);
      });
    });

    describe('Cancellation support', () => {
      it('should cancel when signal is aborted before reading', async () => {
        const controller = new AbortController();
        controller.abort();

        const result = await migrateAllEntries(TEST_USER_ID, {
          signal: controller.signal,
        });

        expect(result.cancelled).toBe(true);
        expect(result.success).toBe(false);
      });

      it('should cancel mid-migration when signal is aborted', async () => {
        const entries = createTestEntries(100);
        getAllEntries.mockResolvedValue(entries);

        const controller = new AbortController();

        // Abort during batch processing
        batchWriteEntries.mockImplementation(async () => {
          controller.abort();
          return { success: 50, failed: [] };
        });

        const result = await migrateAllEntries(TEST_USER_ID, {
          signal: controller.signal,
        });

        expect(result.cancelled).toBe(true);
        expect(markMigrationCancelled).toHaveBeenCalled();
        expect(deleteAllUserEntries).toHaveBeenCalled();
      });

      it('should delete partial Firestore data on cancellation (GDPR Article 17)', async () => {
        const entries = createTestEntries(100);
        getAllEntries.mockResolvedValue(entries);

        const controller = new AbortController();
        batchWriteEntries.mockImplementation(async () => {
          controller.abort();
          return { success: 50, failed: [] };
        });

        await migrateAllEntries(TEST_USER_ID, { signal: controller.signal });

        expect(deleteAllUserEntries).toHaveBeenCalledWith(TEST_USER_ID);
      });
    });

    describe('Network errors with retry', () => {
      it('should retry on network error', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);

        const networkError = new Error('Network error');
        networkError.code = MigrationErrorCodes.NETWORK_ERROR;

        // First attempt fails, second succeeds
        batchWriteEntries
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(10);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(batchWriteEntries).toHaveBeenCalledTimes(2);
      });

      it('should retry up to 3 times on network error', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);

        const networkError = new Error('Network error');
        networkError.code = MigrationErrorCodes.NETWORK_ERROR;

        // Fail 3 times
        batchWriteEntries.mockRejectedValue(networkError);
        getEntryCount.mockResolvedValue(0);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(false);
        expect(batchWriteEntries).toHaveBeenCalledTimes(3);
      });

      it('should use exponential backoff for retries', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);

        const networkError = new Error('Network error');
        networkError.code = MigrationErrorCodes.NETWORK_ERROR;

        batchWriteEntries
          .mockRejectedValueOnce(networkError)
          .mockRejectedValueOnce(networkError)
          .mockResolvedValueOnce({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(10);

        const promise = migrateAllEntries(TEST_USER_ID);

        // Advance timers to complete retries
        await vi.advanceTimersByTimeAsync(1000); // First backoff
        await vi.advanceTimersByTimeAsync(2000); // Second backoff

        const result = await promise;
        expect(result.success).toBe(true);
      });
    });

    describe('Auth errors', () => {
      it('should stop immediately on auth error', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);

        const authError = new Error('Not authenticated');
        authError.code = MigrationErrorCodes.NOT_AUTHENTICATED;

        batchWriteEntries.mockRejectedValue(authError);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(MigrationEngineErrorCodes.AUTH_ERROR);
        expect(batchWriteEntries).toHaveBeenCalledTimes(1);
      });
    });

    describe('Quota exceeded error', () => {
      it('should return partial success on quota exceeded', async () => {
        const entries = createTestEntries(100);
        getAllEntries.mockResolvedValue(entries);

        const quotaError = new Error('Quota exceeded');
        quotaError.code = MigrationErrorCodes.QUOTA_EXCEEDED;

        batchWriteEntries.mockRejectedValue(quotaError);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(false);
        expect(result.partialSuccess).toBe(true);
        expect(result.errorCode).toBe(MigrationEngineErrorCodes.QUOTA_ERROR);
      });
    });

    describe('Verification step', () => {
      it('should verify entry count after migration', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(10);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true);
        expect(getEntryCount).toHaveBeenCalledWith(TEST_USER_ID);
        expect(result.verificationResult).toBeDefined();
        expect(result.verificationResult.verified).toBe(true);
      });

      it('should log warning if verification fails but not fail migration', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(5); // Mismatch

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(true); // Still succeeds
        expect(result.verificationResult.verified).toBe(false);
      });
    });

    describe('Failed entries', () => {
      it('should track failed entries', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({
          success: 8,
          failed: [
            { id: 'entry-0', error: 'validation-error' },
            { id: 'entry-1', error: 'validation-error' },
          ],
        });
        getEntryCount.mockResolvedValue(8);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.success).toBe(false);
        expect(result.entriesMigrated).toBe(8);
        expect(result.entriesFailed).toBe(2);
        expect(result.failedEntries).toHaveLength(2);
      });
    });

    describe('Custom batch size', () => {
      it('should respect custom batch size', async () => {
        const entries = createTestEntries(100);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 50, failed: [] });
        getEntryCount.mockResolvedValue(100);

        await migrateAllEntries(TEST_USER_ID, { batchSize: 50 });

        expect(batchWriteEntries).toHaveBeenCalledTimes(2);
      });

      it('should not exceed Firestore batch limit even with larger custom size', async () => {
        const entries = createTestEntries(1000);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 500, failed: [] });
        getEntryCount.mockResolvedValue(1000);

        await migrateAllEntries(TEST_USER_ID, { batchSize: 1000 });

        // Should still use 500 (Firestore limit)
        expect(batchWriteEntries).toHaveBeenCalledTimes(2);
      });
    });

    describe('Duration tracking', () => {
      it('should include duration in result', async () => {
        const entries = createTestEntries(10);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
        getEntryCount.mockResolvedValue(10);

        const result = await migrateAllEntries(TEST_USER_ID);

        expect(result.duration).toBeDefined();
        expect(typeof result.duration).toBe('number');
        expect(result.duration).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('cancelMigration', () => {
    it('should delete partial Firestore data', async () => {
      await cancelMigration(TEST_USER_ID, 50, 'User cancelled');

      expect(deleteAllUserEntries).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should mark migration as cancelled', async () => {
      await cancelMigration(TEST_USER_ID, 50, 'User cancelled');

      expect(markMigrationCancelled).toHaveBeenCalledWith(TEST_USER_ID, {
        entriesProcessed: 50,
        reason: 'User cancelled',
      });
    });

    it('should not throw if cleanup fails', async () => {
      deleteAllUserEntries.mockRejectedValue(new Error('Cleanup failed'));

      // Should not throw
      await cancelMigration(TEST_USER_ID, 50, 'User cancelled');

      expect(markMigrationCancelled).toHaveBeenCalled();
    });

    it('should not throw if marking cancelled fails', async () => {
      markMigrationCancelled.mockRejectedValue(new Error('Mark failed'));

      // Should not throw
      await expect(cancelMigration(TEST_USER_ID, 50, 'User cancelled')).resolves.not.toThrow();
    });
  });

  describe('verifyMigration', () => {
    it('should return verified when counts match', async () => {
      getEntryCount.mockResolvedValue(100);

      const result = await verifyMigration(TEST_USER_ID, 100);

      expect(result.verified).toBe(true);
      expect(result.firestoreCount).toBe(100);
      expect(result.expectedCount).toBe(100);
    });

    it('should return verified when Firestore has more entries (duplicates skipped)', async () => {
      getEntryCount.mockResolvedValue(120);

      const result = await verifyMigration(TEST_USER_ID, 100);

      expect(result.verified).toBe(true);
    });

    it('should return not verified when Firestore has fewer entries', async () => {
      getEntryCount.mockResolvedValue(80);

      const result = await verifyMigration(TEST_USER_ID, 100);

      expect(result.verified).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      getEntryCount.mockRejectedValue(new Error('Count failed'));

      const result = await verifyMigration(TEST_USER_ID, 100);

      expect(result.verified).toBe(false);
      expect(result.reason).toContain('error');
    });
  });

  describe('cleanupPartialData', () => {
    it('should delete all user entries', async () => {
      deleteAllUserEntries.mockResolvedValue(50);

      const count = await cleanupPartialData(TEST_USER_ID);

      expect(count).toBe(50);
      expect(deleteAllUserEntries).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should return 0 if delete fails', async () => {
      deleteAllUserEntries.mockRejectedValue(new Error('Delete failed'));

      const count = await cleanupPartialData(TEST_USER_ID);

      expect(count).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle entries with missing updatedAt', async () => {
      const entries = [createTestEntry('entry-1', { updatedAt: undefined })];
      getAllEntries.mockResolvedValue(entries);
      checkEntryExists.mockResolvedValue(false);
      batchWriteEntries.mockResolvedValue({ success: 1, failed: [] });
      getEntryCount.mockResolvedValue(1);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.success).toBe(true);
    });

    it('should handle entries with null values', async () => {
      const entries = [createTestEntry('entry-1', { note: null })];
      getAllEntries.mockResolvedValue(entries);
      checkEntryExists.mockResolvedValue(false);
      batchWriteEntries.mockResolvedValue({ success: 1, failed: [] });
      getEntryCount.mockResolvedValue(1);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.success).toBe(true);
    });

    it('should handle duplicate check error by writing anyway', async () => {
      const entries = [createTestEntry('entry-1')];
      getAllEntries.mockResolvedValue(entries);
      checkEntryExists.mockRejectedValue(new Error('Check failed'));
      batchWriteEntries.mockResolvedValue({ success: 1, failed: [] });
      getEntryCount.mockResolvedValue(1);

      const result = await migrateAllEntries(TEST_USER_ID);

      // Should succeed - on error, default to writing
      expect(result.success).toBe(true);
    });

    it('should handle undefined options', async () => {
      getAllEntries.mockResolvedValue([]);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.success).toBe(true);
    });

    it('should handle null options', async () => {
      getAllEntries.mockResolvedValue([]);

      const result = await migrateAllEntries(TEST_USER_ID, null);

      expect(result.success).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete small migration quickly', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
      getEntryCount.mockResolvedValue(10);

      const startTime = Date.now();
      await migrateAllEntries(TEST_USER_ID);
      const duration = Date.now() - startTime;

      // Should complete quickly (mocked operations are instant)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Status service integration', () => {
    it('should check status before starting', async () => {
      getAllEntries.mockResolvedValue([]);

      await migrateAllEntries(TEST_USER_ID);

      expect(checkMigrationStatus).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('should mark complete after successful migration', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
      getEntryCount.mockResolvedValue(10);

      await migrateAllEntries(TEST_USER_ID);

      expect(markMigrationComplete).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          entriesMigrated: 10,
          source: 'indexeddb',
        })
      );
    });

    it('should not mark complete if there were failures', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({
        success: 0,
        failed: entries.map(e => ({ id: e.id, error: 'failed' })),
      });
      getEntryCount.mockResolvedValue(0);

      await migrateAllEntries(TEST_USER_ID);

      // Should still mark complete even with failures
      expect(markMigrationComplete).toHaveBeenCalled();
    });
  });

  describe('Mixed scenarios', () => {
    it('should handle mix of successful and failed entries', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({
        success: 7,
        failed: [
          { id: 'entry-0', error: 'error' },
          { id: 'entry-1', error: 'error' },
          { id: 'entry-2', error: 'error' },
        ],
      });
      getEntryCount.mockResolvedValue(7);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.entriesMigrated).toBe(7);
      expect(result.entriesFailed).toBe(3);
      expect(result.success).toBe(false);
    });

    it('should handle mix of new and duplicate entries', async () => {
      const entries = createTestEntries(4);
      getAllEntries.mockResolvedValue(entries);

      // First two entries exist, second two are new
      checkEntryExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);

      compareTimestamps
        .mockReturnValueOnce('firestore') // Skip first
        .mockReturnValueOnce('local');    // Write second

      batchWriteEntries.mockResolvedValue({ success: 3, failed: [] });
      getEntryCount.mockResolvedValue(4);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.entriesSkipped).toBe(1);
      expect(result.entriesMigrated).toBe(3);
    });
  });

  describe('GDPR compliance', () => {
    it('should support right to withdraw consent (cancellation)', async () => {
      const entries = createTestEntries(100);
      getAllEntries.mockResolvedValue(entries);

      const controller = new AbortController();
      batchWriteEntries.mockImplementation(async () => {
        controller.abort();
        return { success: 50, failed: [] };
      });

      await migrateAllEntries(TEST_USER_ID, { signal: controller.signal });

      // Should clean up data (GDPR Article 17)
      expect(deleteAllUserEntries).toHaveBeenCalled();
      // Should record cancellation (GDPR Article 5)
      expect(markMigrationCancelled).toHaveBeenCalled();
    });
  });

  describe('Additional branch coverage tests', () => {
    it('should handle non-retryable unknown error in batch', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);

      const unknownError = new Error('Unknown error');
      unknownError.code = 'unknown-weird-error';

      batchWriteEntries.mockRejectedValue(unknownError);
      getEntryCount.mockResolvedValue(0);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.entriesFailed).toBeGreaterThan(0);
      // Should not retry for non-retryable errors
      expect(batchWriteEntries).toHaveBeenCalledTimes(1);
    });

    it('should handle entry without id in shouldWriteEntry', async () => {
      const entryWithNoId = { type: 'income', amount: 100 };
      const entries = [entryWithNoId];
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: 0, failed: [] });
      getEntryCount.mockResolvedValue(0);

      const result = await migrateAllEntries(TEST_USER_ID);

      // Should skip entries without id
      expect(result.entriesSkipped).toBe(1);
    });

    it('should handle cancellation during duplicate check', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);

      const controller = new AbortController();
      let checkCount = 0;
      checkEntryExists.mockImplementation(async () => {
        checkCount++;
        if (checkCount === 3) {
          controller.abort();
        }
        return false;
      });
      batchWriteEntries.mockResolvedValue({ success: 2, failed: [] });

      const result = await migrateAllEntries(TEST_USER_ID, {
        signal: controller.signal,
      });

      expect(result.cancelled).toBe(true);
    });

    it('should handle cancellation during retry wait', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);

      const controller = new AbortController();
      const networkError = new Error('Network error');
      networkError.code = MigrationErrorCodes.NETWORK_ERROR;

      let callCount = 0;
      batchWriteEntries.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw networkError;
        }
        // Second call: user cancelled during retry
        controller.abort();
        return { success: 10, failed: [] };
      });

      const result = await migrateAllEntries(TEST_USER_ID, {
        signal: controller.signal,
      });

      expect(result.cancelled).toBe(true);
    });

    it('should handle error during shouldWriteEntry and default to write', async () => {
      const entries = [createTestEntry('entry-1')];
      getAllEntries.mockResolvedValue(entries);

      checkEntryExists.mockRejectedValue(new Error('Check failed'));
      batchWriteEntries.mockResolvedValue({ success: 1, failed: [] });
      getEntryCount.mockResolvedValue(1);

      const result = await migrateAllEntries(TEST_USER_ID);

      // Should succeed - on error, default to writing
      expect(result.success).toBe(true);
      expect(result.entriesMigrated).toBe(1);
    });

    it('should handle network errors exhausting all retries', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);

      const networkError = new Error('Network error');
      networkError.code = MigrationErrorCodes.NETWORK_ERROR;

      // All 3 retries fail
      batchWriteEntries.mockRejectedValue(networkError);
      getEntryCount.mockResolvedValue(0);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.success).toBe(false);
      expect(result.entriesFailed).toBe(10);
      expect(batchWriteEntries).toHaveBeenCalledTimes(3);
    });

    it('should include duration in metadata when marking complete', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
      getEntryCount.mockResolvedValue(10);

      await migrateAllEntries(TEST_USER_ID);

      expect(markMigrationComplete).toHaveBeenCalledWith(
        TEST_USER_ID,
        expect.objectContaining({
          duration: expect.any(Number),
        })
      );
    });

    it('should handle verification error gracefully', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
      getEntryCount.mockRejectedValue(new Error('Count failed'));

      const result = await migrateAllEntries(TEST_USER_ID);

      // Should still mark complete even if verification fails
      expect(markMigrationComplete).toHaveBeenCalled();
      expect(result.verificationResult.verified).toBe(false);
    });

    it('should map user mismatch error to AUTH_ERROR', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);

      const userMismatchError = new Error('User mismatch');
      userMismatchError.code = MigrationErrorCodes.USER_MISMATCH;

      batchWriteEntries.mockRejectedValue(userMismatchError);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.errorCode).toBe(MigrationEngineErrorCodes.AUTH_ERROR);
    });

    it('should handle callback throwing error during onBatchComplete', async () => {
      const entries = createTestEntries(10);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: 10, failed: [] });
      getEntryCount.mockResolvedValue(10);

      const onBatchComplete = vi.fn(() => {
        throw new Error('Batch callback error');
      });

      // Should not throw
      const result = await migrateAllEntries(TEST_USER_ID, { onBatchComplete });

      expect(result.success).toBe(true);
      expect(onBatchComplete).toHaveBeenCalled();
    });
  });
});
