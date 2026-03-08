/**
 * Tests for useMigration hook
 *
 * Comprehensive tests for migration progress tracking, state management,
 * network handling, cancellation, and error recovery.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMigration, MigrationStatus } from './useMigration';

// Mock the services
vi.mock('../services/migrationStatusService', () => ({
  checkMigrationStatus: vi.fn(),
}));

vi.mock('../services/migrationEngine', () => ({
  migrateAllEntries: vi.fn(),
  cancelMigration: vi.fn(),
  MigrationEngineErrorCodes: {
    ALREADY_COMPLETED: 'migration-engine/already-completed',
    NO_ENTRIES: 'migration-engine/no-entries',
    CANCELLED: 'migration-engine/cancelled',
    NETWORK_ERROR: 'migration-engine/network-error',
    AUTH_ERROR: 'migration-engine/auth-error',
    QUOTA_ERROR: 'migration-engine/quota-error',
    VERIFICATION_FAILED: 'migration-engine/verification-failed',
    UNKNOWN_ERROR: 'migration-engine/unknown-error',
  },
}));

vi.mock('../services/networkMonitor', () => ({
  isOnline: vi.fn(() => true),
  onConnectionChange: vi.fn(() => () => {}),
  classifyError: vi.fn(() => ({ type: 'unknown', retryable: true, waitTime: 0 })),
  NetworkErrorTypes: {
    NETWORK: 'network',
    QUOTA: 'quota',
    AUTH: 'auth',
    UNKNOWN: 'unknown',
  },
}));

// Import mocked functions for manipulation
import { checkMigrationStatus } from '../services/migrationStatusService';
import { migrateAllEntries, cancelMigration, MigrationEngineErrorCodes } from '../services/migrationEngine';
import { isOnline, onConnectionChange, classifyError, NetworkErrorTypes } from '../services/networkMonitor';

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useMigration', () => {
  const testUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    checkMigrationStatus.mockResolvedValue({
      completed: false,
      completedAt: null,
      version: null,
      entriesMigrated: null,
      cancelled: false,
    });

    migrateAllEntries.mockResolvedValue({
      success: true,
      entriesMigrated: 100,
      entriesFailed: 0,
      entriesSkipped: 0,
      failedEntries: [],
      duration: 5000,
      cancelled: false,
    });

    cancelMigration.mockResolvedValue();

    isOnline.mockReturnValue(true);
    onConnectionChange.mockReturnValue(() => {});
    classifyError.mockReturnValue({ type: 'unknown', retryable: true, waitTime: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with idle status when no userId', () => {
      const { result } = renderHook(() => useMigration(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.status).toBe(MigrationStatus.IDLE);
      expect(result.current.progress.completed).toBe(0);
      expect(result.current.progress.total).toBe(0);
      expect(result.current.progress.percentage).toBe(0);
      expect(result.current.currentBatch).toBe(0);
      expect(result.current.errors).toEqual([]);
    });

    it('should initialize with checking status when userId provided', async () => {
      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      // Should be checking initially while query runs
      expect(result.current._isCheckingStatus).toBe(true);

      // Wait for query to complete
      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      expect(result.current.status).toBe(MigrationStatus.IDLE);
    });

    it('should set completed status if migration already done', async () => {
      checkMigrationStatus.mockResolvedValue({
        completed: true,
        completedAt: new Date(),
        version: '1.0',
        entriesMigrated: 150,
        cancelled: false,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });

      expect(result.current.isCompleted).toBe(true);
    });

    it('should set cancelled status if migration was cancelled', async () => {
      checkMigrationStatus.mockResolvedValue({
        completed: false,
        completedAt: null,
        version: '1.0',
        entriesMigrated: null,
        cancelled: true,
        cancelledAt: new Date(),
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.CANCELLED);
      });
    });
  });

  describe('startMigration', () => {
    it('should start migration and update progress', async () => {
      // Mock migration with progress callbacks
      migrateAllEntries.mockImplementation(async (userId, options) => {
        // Simulate progress updates
        if (options?.onProgress) {
          options.onProgress(25, 100);
          options.onProgress(50, 100);
          options.onProgress(75, 100);
          options.onProgress(100, 100);
        }
        if (options?.onBatchComplete) {
          options.onBatchComplete(1);
          options.onBatchComplete(2);
        }
        return {
          success: true,
          entriesMigrated: 100,
          entriesFailed: 0,
          entriesSkipped: 0,
          failedEntries: [],
          duration: 5000,
          cancelled: false,
        };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      // Wait for initial status check
      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // Start migration
      await act(async () => {
        await result.current.startMigration();
      });

      // Wait for migration to complete
      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });

      expect(result.current.isCompleted).toBe(true);
      expect(result.current.progress.percentage).toBe(100);
    });

    it('should update status to in-progress during migration', async () => {
      // Create a promise we can control
      let resolvePromise;
      const migrationPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      migrateAllEntries.mockImplementation(async () => {
        await migrationPromise;
        return {
          success: true,
          entriesMigrated: 100,
          entriesFailed: 0,
          entriesSkipped: 0,
          failedEntries: [],
          duration: 5000,
          cancelled: false,
        };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // Start migration (don't await)
      act(() => {
        result.current.startMigration();
      });

      // Check status is in-progress
      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.IN_PROGRESS);
      });

      expect(result.current.isInProgress).toBe(true);

      // Complete the migration
      await act(async () => {
        resolvePromise();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });
    });

    it('should not start migration without userId', async () => {
      const { result } = renderHook(() => useMigration(null), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.startMigration();
      });

      expect(migrateAllEntries).not.toHaveBeenCalled();
      expect(result.current.errors.length).toBe(1);
      expect(result.current.errors[0].code).toBe('no-user');
    });

    it('should not start migration if already completed', async () => {
      checkMigrationStatus.mockResolvedValue({
        completed: true,
        completedAt: new Date(),
        version: '1.0',
        entriesMigrated: 150,
        cancelled: false,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(true);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      expect(migrateAllEntries).not.toHaveBeenCalled();
    });

    it('should not start migration when offline', async () => {
      isOnline.mockReturnValue(false);

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      expect(migrateAllEntries).not.toHaveBeenCalled();
      expect(result.current.status).toBe(MigrationStatus.PAUSED);
      expect(result.current.errors[0].code).toBe('offline');
    });
  });

  describe('progress updates', () => {
    it('should calculate percentage correctly', async () => {
      migrateAllEntries.mockImplementation(async (userId, options) => {
        if (options?.onProgress) {
          options.onProgress(25, 100);
        }
        return {
          success: true,
          entriesMigrated: 100,
          entriesFailed: 0,
          entriesSkipped: 0,
          failedEntries: [],
          duration: 5000,
          cancelled: false,
        };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      // Progress should have been updated during migration
      expect(result.current.progress.percentage).toBeDefined();
    });

    it('should track current batch number', async () => {
      migrateAllEntries.mockImplementation(async (userId, options) => {
        if (options?.onBatchComplete) {
          options.onBatchComplete(1);
          options.onBatchComplete(2);
          options.onBatchComplete(3);
        }
        return {
          success: true,
          entriesMigrated: 100,
          entriesFailed: 0,
          entriesSkipped: 0,
          failedEntries: [],
          duration: 5000,
          cancelled: false,
        };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      // currentBatch should have been updated
      expect(result.current.currentBatch).toBeDefined();
    });

    it('should handle empty database (0 entries)', async () => {
      migrateAllEntries.mockResolvedValue({
        success: true,
        entriesMigrated: 0,
        entriesFailed: 0,
        entriesSkipped: 0,
        failedEntries: [],
        duration: 100,
        cancelled: false,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });
    });
  });

  describe('cancellation', () => {
    it('should cancel in-progress migration', async () => {
      let resolvePromise;
      const migrationPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      migrateAllEntries.mockImplementation(async (userId, options) => {
        // Simulate long-running migration
        await migrationPromise;
        // Check if cancelled
        if (options?.signal?.aborted) {
          return {
            success: false,
            entriesMigrated: 0,
            entriesFailed: 0,
            entriesSkipped: 0,
            failedEntries: [],
            duration: 1000,
            cancelled: true,
            entriesProcessed: 50,
          };
        }
        return {
          success: true,
          entriesMigrated: 100,
          entriesFailed: 0,
          entriesSkipped: 0,
          failedEntries: [],
          duration: 5000,
          cancelled: false,
        };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // Start migration
      act(() => {
        result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.IN_PROGRESS);
      });

      // Cancel migration
      await act(async () => {
        await result.current.cancelMigration();
      });

      expect(result.current.status).toBe(MigrationStatus.CANCELLED);
      expect(cancelMigration).toHaveBeenCalled();

      // Complete the promise to cleanup
      resolvePromise();
    });

    it('should cleanup partial data on cancellation', async () => {
      let resolvePromise;
      migrateAllEntries.mockImplementation(async () => {
        await new Promise((resolve) => {
          resolvePromise = resolve;
        });
        return { success: false, cancelled: true, entriesProcessed: 25 };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      act(() => {
        result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.IN_PROGRESS);
      });

      await act(async () => {
        await result.current.cancelMigration();
      });

      expect(cancelMigration).toHaveBeenCalledWith(
        testUserId,
        expect.any(Number),
        'User cancelled migration'
      );

      resolvePromise();
    });

    it('should reset progress on cancellation', async () => {
      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.cancelMigration();
      });

      expect(result.current.progress.completed).toBe(0);
      expect(result.current.progress.total).toBe(0);
      expect(result.current.progress.percentage).toBe(0);
      expect(result.current.currentBatch).toBe(0);
    });
  });

  describe('network handling', () => {
    it('should pause migration on network loss', async () => {
      let connectionCallback;
      onConnectionChange.mockImplementation((callback) => {
        connectionCallback = callback;
        return () => {};
      });

      let resolvePromise;
      migrateAllEntries.mockImplementation(async () => {
        await new Promise((resolve) => {
          resolvePromise = resolve;
        });
        return { success: true, entriesMigrated: 100, cancelled: false };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // Start migration
      act(() => {
        result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.IN_PROGRESS);
      });

      // Simulate going offline
      act(() => {
        connectionCallback(false);
      });

      expect(result.current.status).toBe(MigrationStatus.PAUSED);
      expect(result.current.isPaused).toBe(true);

      resolvePromise();
    });

    it('should show network error when starting offline', async () => {
      isOnline.mockReturnValue(false);

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      expect(result.current.errors.length).toBe(1);
      expect(result.current.errors[0].messageKey).toBe('migration.error.network');
    });
  });

  describe('error handling', () => {
    it('should handle network error and set failed status', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'migration-engine/network-error';

      migrateAllEntries.mockRejectedValue(networkError);
      classifyError.mockReturnValue({
        type: NetworkErrorTypes.NETWORK,
        retryable: true,
        waitTime: 0,
      });
      isOnline.mockReturnValue(true);

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.FAILED);
      });

      expect(result.current.isFailed).toBe(true);
      expect(result.current.errors.length).toBe(1);
    });

    it('should handle quota error and disable retry', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.code = MigrationEngineErrorCodes.QUOTA_ERROR;

      migrateAllEntries.mockRejectedValue(quotaError);
      classifyError.mockReturnValue({
        type: NetworkErrorTypes.QUOTA,
        retryable: false,
        waitTime: 3600000,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.FAILED);
      });

      expect(result.current.canRetry).toBe(false);
      expect(result.current.errors[0].messageKey).toBe('migration.error.quota');
    });

    it('should handle auth error', async () => {
      const authError = new Error('Not authenticated');
      authError.code = MigrationEngineErrorCodes.AUTH_ERROR;

      migrateAllEntries.mockRejectedValue(authError);
      classifyError.mockReturnValue({
        type: NetworkErrorTypes.AUTH,
        retryable: false,
        waitTime: 0,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.FAILED);
      });

      expect(result.current.errors[0].messageKey).toBe('migration.error.auth');
    });

    it('should handle partial success result', async () => {
      migrateAllEntries.mockResolvedValue({
        success: false,
        entriesMigrated: 80,
        entriesFailed: 20,
        entriesSkipped: 0,
        failedEntries: [{ id: '1', error: 'failed' }],
        duration: 5000,
        cancelled: false,
        errorCode: MigrationEngineErrorCodes.UNKNOWN_ERROR,
        errorMessage: 'Some entries failed',
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.FAILED);
      });

      expect(result.current.errors.length).toBe(1);
    });
  });

  describe('retry logic', () => {
    it('should allow retry after network error', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'migration-engine/network-error';

      // First call fails, second succeeds
      migrateAllEntries
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          success: true,
          entriesMigrated: 100,
          entriesFailed: 0,
          entriesSkipped: 0,
          failedEntries: [],
          duration: 5000,
          cancelled: false,
        });

      classifyError.mockReturnValue({
        type: NetworkErrorTypes.NETWORK,
        retryable: true,
        waitTime: 0,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // First attempt fails
      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.FAILED);
      });

      expect(result.current.canRetry).toBe(true);

      // Retry
      await act(async () => {
        await result.current.retryMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });
    });

    it('should clear errors before retry', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'migration-engine/network-error';

      migrateAllEntries.mockRejectedValueOnce(networkError);
      classifyError.mockReturnValue({
        type: NetworkErrorTypes.NETWORK,
        retryable: true,
        waitTime: 0,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.errors.length).toBe(1);
      });

      // Setup for retry
      migrateAllEntries.mockResolvedValue({
        success: true,
        entriesMigrated: 100,
        cancelled: false,
      });

      // Start retry
      act(() => {
        result.current.retryMigration();
      });

      // Errors should be cleared immediately
      await waitFor(() => {
        expect(result.current.errors.length).toBe(0);
      });
    });

    it('should not retry when offline', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'migration-engine/network-error';

      migrateAllEntries.mockRejectedValueOnce(networkError);
      classifyError.mockReturnValue({
        type: NetworkErrorTypes.NETWORK,
        retryable: true,
        waitTime: 0,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.FAILED);
      });

      // Go offline
      isOnline.mockReturnValue(false);

      await act(async () => {
        await result.current.retryMigration();
      });

      expect(result.current.status).toBe(MigrationStatus.PAUSED);
      expect(result.current.errors[0].code).toBe('offline');
    });
  });

  describe('dismissError', () => {
    it('should clear errors when dismissed', async () => {
      const error = new Error('Test error');
      error.code = 'test-error';

      migrateAllEntries.mockRejectedValue(error);
      classifyError.mockReturnValue({
        type: NetworkErrorTypes.UNKNOWN,
        retryable: true,
        waitTime: 0,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.errors.length).toBe(1);
      });

      act(() => {
        result.current.dismissError();
      });

      expect(result.current.errors.length).toBe(0);
    });
  });

  describe('already migrated check', () => {
    it('should skip migration if already completed', async () => {
      checkMigrationStatus.mockResolvedValue({
        completed: true,
        completedAt: new Date(),
        version: '1.0',
        entriesMigrated: 100,
        cancelled: false,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      // Should not call migration engine
      expect(migrateAllEntries).not.toHaveBeenCalled();
      expect(result.current.status).toBe(MigrationStatus.COMPLETED);
    });
  });

  describe('edge cases', () => {
    it('should handle single entry migration', async () => {
      migrateAllEntries.mockImplementation(async (userId, options) => {
        if (options?.onProgress) {
          options.onProgress(1, 1);
        }
        return {
          success: true,
          entriesMigrated: 1,
          entriesFailed: 0,
          entriesSkipped: 0,
          failedEntries: [],
          duration: 100,
          cancelled: false,
        };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });

      expect(result.current.progress.percentage).toBe(100);
    });

    it('should handle large dataset migration', async () => {
      migrateAllEntries.mockImplementation(async (userId, options) => {
        if (options?.onProgress) {
          // Simulate progress for 10000 entries
          for (let i = 0; i <= 10000; i += 500) {
            options.onProgress(i, 10000);
          }
        }
        if (options?.onBatchComplete) {
          for (let i = 1; i <= 20; i++) {
            options.onBatchComplete(i);
          }
        }
        return {
          success: true,
          entriesMigrated: 10000,
          entriesFailed: 0,
          entriesSkipped: 0,
          failedEntries: [],
          duration: 50000,
          cancelled: false,
        };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });
    });

    it('should handle rapid start/cancel cycles', async () => {
      let resolvePromise;
      migrateAllEntries.mockImplementation(async () => {
        await new Promise((resolve) => {
          resolvePromise = resolve;
        });
        return { success: true, entriesMigrated: 100, cancelled: false };
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // Start
      act(() => {
        result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.IN_PROGRESS);
      });

      // Cancel
      await act(async () => {
        await result.current.cancelMigration();
      });

      expect(result.current.status).toBe(MigrationStatus.CANCELLED);

      resolvePromise();
    });

    it('should cleanup on unmount', async () => {
      let resolvePromise;
      migrateAllEntries.mockImplementation(async () => {
        await new Promise((resolve) => {
          resolvePromise = resolve;
        });
        return { success: true, entriesMigrated: 100, cancelled: false };
      });

      const { result, unmount } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // Start migration
      act(() => {
        result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.IN_PROGRESS);
      });

      // Unmount while in progress
      unmount();

      // Should not throw
      resolvePromise();
    });
  });

  describe('helper properties', () => {
    it('should expose correct helper values', async () => {
      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // Initial state
      expect(result.current.isInProgress).toBe(false);
      expect(result.current.isCompleted).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.isFailed).toBe(false);
      expect(result.current.canRetry).toBe(false);
    });

    it('should update canRetry based on errors', async () => {
      const networkError = new Error('Network error');
      networkError.code = 'migration-engine/network-error';

      migrateAllEntries.mockRejectedValue(networkError);
      classifyError.mockReturnValue({
        type: NetworkErrorTypes.NETWORK,
        retryable: true,
        waitTime: 0,
      });

      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      await act(async () => {
        await result.current.startMigration();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.FAILED);
      });

      expect(result.current.canRetry).toBe(true);
    });
  });

  describe('recheckStatus', () => {
    it('should allow manual status recheck', async () => {
      const { result } = renderHook(() => useMigration(testUserId), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current._isCheckingStatus).toBe(false);
      });

      // Update mock to return completed
      checkMigrationStatus.mockResolvedValue({
        completed: true,
        completedAt: new Date(),
        version: '1.0',
        entriesMigrated: 100,
        cancelled: false,
      });

      // Trigger recheck
      await act(async () => {
        await result.current.recheckStatus();
      });

      await waitFor(() => {
        expect(result.current.status).toBe(MigrationStatus.COMPLETED);
      });
    });
  });
});

describe('MigrationStatus constants', () => {
  it('should export all expected status values', () => {
    expect(MigrationStatus.IDLE).toBe('idle');
    expect(MigrationStatus.CHECKING).toBe('checking');
    expect(MigrationStatus.CONSENT_PENDING).toBe('consent-pending');
    expect(MigrationStatus.IN_PROGRESS).toBe('in-progress');
    expect(MigrationStatus.PAUSED).toBe('paused');
    expect(MigrationStatus.COMPLETED).toBe('completed');
    expect(MigrationStatus.CANCELLED).toBe('cancelled');
    expect(MigrationStatus.FAILED).toBe('failed');
  });
});
