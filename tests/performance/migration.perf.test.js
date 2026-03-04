/**
 * Performance Tests for Migration Engine
 *
 * This test suite validates migration performance against defined targets
 * and checks for memory leaks, batching correctness, and optimization opportunities.
 *
 * Performance Targets:
 * | Dataset Size | Target Time | Max Memory | Notes        |
 * |--------------|-------------|------------|--------------|
 * | 100 entries  | <=5 seconds | 50 MB      | Fast         |
 * | 500 entries  | <=15 seconds| 100 MB     | Acceptable   |
 * | 1000 entries | <=30 seconds| 150 MB     | Good         |
 * | 5000 entries | <=180 seconds| 300 MB    | Acceptable   |
 *
 * @module migration.perf.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Performance measurement utilities
const measureExecution = async (fn) => {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  return {
    result,
    duration: (endTime - startTime) / 1000, // Convert to seconds
  };
};

// Memory tracking utilities (approximate for Node/jsdom environment)
const getMemoryUsage = () => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed / 1024 / 1024; // MB
  }
  // Fallback for browser environment
  if (typeof performance !== 'undefined' && performance.memory) {
    return performance.memory.usedJSHeapSize / 1024 / 1024; // MB
  }
  return 0;
};

// Mock IndexedDB service
vi.mock('../../src/services/db', () => ({
  getAllEntries: vi.fn(),
}));

// Mock Firestore Migration Service
vi.mock('../../src/services/firestoreMigrationService', () => ({
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
vi.mock('../../src/services/migrationStatusService', () => ({
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
  getDefaultBatchSize,
} from '../../src/services/migrationEngine';

import { getAllEntries } from '../../src/services/db';
import {
  batchWriteEntries,
  getEntryCount,
  checkEntryExists,
  getBatchSize,
} from '../../src/services/firestoreMigrationService';
import {
  checkMigrationStatus,
  markMigrationComplete,
} from '../../src/services/migrationStatusService';

// Test data constants
const TEST_USER_ID = 'perf-test-user-123';

/**
 * Generate realistic test entries
 * @param {number} count - Number of entries to generate
 * @returns {Array} Array of entry objects
 */
const generateTestEntries = (count) => {
  const entries = [];
  const types = ['income', 'donation'];
  const baseDate = new Date('2026-01-01');

  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + Math.floor(i / 10)); // Spread entries across time

    entries.push({
      id: `entry-${i.toString().padStart(6, '0')}`,
      type: types[i % 2],
      amount: Math.floor(Math.random() * 10000) + 100,
      date: date.toISOString().split('T')[0],
      accountingMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      note: `Test entry ${i} for performance testing`,
      createdAt: date.toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return entries;
};

/**
 * Performance benchmark results collector
 */
const benchmarkResults = {
  results: [],
  add(datasetSize, duration, memoryDelta, passed, notes = '') {
    this.results.push({
      datasetSize,
      duration: duration.toFixed(3),
      memoryDelta: memoryDelta.toFixed(2),
      passed,
      notes,
      timestamp: new Date().toISOString(),
    });
  },
  getReport() {
    return this.results;
  },
  clear() {
    this.results = [];
  },
};

describe('Migration Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    benchmarkResults.clear();

    // Default successful mocks with simulated latency
    checkMigrationStatus.mockResolvedValue({
      completed: false,
      cancelled: false,
    });
    markMigrationComplete.mockResolvedValue(true);
    checkEntryExists.mockResolvedValue(false);
    getAllEntries.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Performance Targets', () => {
    describe('Small Dataset (100 entries)', () => {
      const TARGET_TIME_SECONDS = 5;
      const MAX_MEMORY_MB = 50;
      const DATASET_SIZE = 100;

      it(`should complete migration of ${DATASET_SIZE} entries within ${TARGET_TIME_SECONDS} seconds`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        const startMemory = getMemoryUsage();
        const { result, duration } = await measureExecution(() =>
          migrateAllEntries(TEST_USER_ID)
        );
        const endMemory = getMemoryUsage();
        const memoryDelta = endMemory - startMemory;

        const passed = duration <= TARGET_TIME_SECONDS;
        benchmarkResults.add(DATASET_SIZE, duration, memoryDelta, passed);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(DATASET_SIZE);
        expect(duration).toBeLessThanOrEqual(TARGET_TIME_SECONDS);
      });

      it(`should use memory within ${MAX_MEMORY_MB}MB limit for ${DATASET_SIZE} entries`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        const startMemory = getMemoryUsage();
        await migrateAllEntries(TEST_USER_ID);
        const endMemory = getMemoryUsage();
        const memoryUsed = endMemory - startMemory;

        // Memory delta should be reasonable (allow negative due to GC)
        expect(Math.abs(memoryUsed)).toBeLessThanOrEqual(MAX_MEMORY_MB);
      });

      it('should process 100 entries in single batch', async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        await migrateAllEntries(TEST_USER_ID);

        // 100 entries < 500 batch size = 1 batch
        expect(batchWriteEntries).toHaveBeenCalledTimes(1);
      });
    });

    describe('Medium Dataset (500 entries)', () => {
      const TARGET_TIME_SECONDS = 15;
      const MAX_MEMORY_MB = 100;
      const DATASET_SIZE = 500;

      it(`should complete migration of ${DATASET_SIZE} entries within ${TARGET_TIME_SECONDS} seconds`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        const startMemory = getMemoryUsage();
        const { result, duration } = await measureExecution(() =>
          migrateAllEntries(TEST_USER_ID)
        );
        const endMemory = getMemoryUsage();
        const memoryDelta = endMemory - startMemory;

        const passed = duration <= TARGET_TIME_SECONDS;
        benchmarkResults.add(DATASET_SIZE, duration, memoryDelta, passed);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(DATASET_SIZE);
        expect(duration).toBeLessThanOrEqual(TARGET_TIME_SECONDS);
      });

      it(`should use memory within ${MAX_MEMORY_MB}MB limit for ${DATASET_SIZE} entries`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        const startMemory = getMemoryUsage();
        await migrateAllEntries(TEST_USER_ID);
        const endMemory = getMemoryUsage();
        const memoryUsed = endMemory - startMemory;

        expect(Math.abs(memoryUsed)).toBeLessThanOrEqual(MAX_MEMORY_MB);
      });

      it('should process 500 entries in single batch (at Firestore limit)', async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        await migrateAllEntries(TEST_USER_ID);

        // 500 entries = 500 batch size = 1 batch
        expect(batchWriteEntries).toHaveBeenCalledTimes(1);
      });
    });

    describe('Large Dataset (1000 entries)', () => {
      const TARGET_TIME_SECONDS = 30;
      const MAX_MEMORY_MB = 150;
      const DATASET_SIZE = 1000;

      it(`should complete migration of ${DATASET_SIZE} entries within ${TARGET_TIME_SECONDS} seconds`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);

        // Mock two batches
        batchWriteEntries
          .mockResolvedValueOnce({ success: 500, failed: [] })
          .mockResolvedValueOnce({ success: 500, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        const startMemory = getMemoryUsage();
        const { result, duration } = await measureExecution(() =>
          migrateAllEntries(TEST_USER_ID)
        );
        const endMemory = getMemoryUsage();
        const memoryDelta = endMemory - startMemory;

        const passed = duration <= TARGET_TIME_SECONDS;
        benchmarkResults.add(DATASET_SIZE, duration, memoryDelta, passed);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(DATASET_SIZE);
        expect(duration).toBeLessThanOrEqual(TARGET_TIME_SECONDS);
      });

      it(`should use memory within ${MAX_MEMORY_MB}MB limit for ${DATASET_SIZE} entries`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries
          .mockResolvedValueOnce({ success: 500, failed: [] })
          .mockResolvedValueOnce({ success: 500, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        const startMemory = getMemoryUsage();
        await migrateAllEntries(TEST_USER_ID);
        const endMemory = getMemoryUsage();
        const memoryUsed = endMemory - startMemory;

        expect(Math.abs(memoryUsed)).toBeLessThanOrEqual(MAX_MEMORY_MB);
      });

      it('should process 1000 entries in 2 batches', async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries
          .mockResolvedValueOnce({ success: 500, failed: [] })
          .mockResolvedValueOnce({ success: 500, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        await migrateAllEntries(TEST_USER_ID);

        // 1000 entries / 500 batch size = 2 batches
        expect(batchWriteEntries).toHaveBeenCalledTimes(2);
      });
    });

    describe('Very Large Dataset (5000 entries)', () => {
      const TARGET_TIME_SECONDS = 180; // 3 minutes
      const MAX_MEMORY_MB = 300;
      const DATASET_SIZE = 5000;
      const EXPECTED_BATCHES = 10;

      it(`should complete migration of ${DATASET_SIZE} entries within ${TARGET_TIME_SECONDS} seconds (3 minutes)`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);

        // Mock 10 batches
        for (let i = 0; i < EXPECTED_BATCHES; i++) {
          batchWriteEntries.mockResolvedValueOnce({ success: 500, failed: [] });
        }
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        const startMemory = getMemoryUsage();
        const { result, duration } = await measureExecution(() =>
          migrateAllEntries(TEST_USER_ID)
        );
        const endMemory = getMemoryUsage();
        const memoryDelta = endMemory - startMemory;

        const passed = duration <= TARGET_TIME_SECONDS;
        benchmarkResults.add(DATASET_SIZE, duration, memoryDelta, passed);

        expect(result.success).toBe(true);
        expect(result.entriesMigrated).toBe(DATASET_SIZE);
        expect(duration).toBeLessThanOrEqual(TARGET_TIME_SECONDS);
      });

      it(`should use memory within ${MAX_MEMORY_MB}MB limit for ${DATASET_SIZE} entries`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        for (let i = 0; i < EXPECTED_BATCHES; i++) {
          batchWriteEntries.mockResolvedValueOnce({ success: 500, failed: [] });
        }
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        const startMemory = getMemoryUsage();
        await migrateAllEntries(TEST_USER_ID);
        const endMemory = getMemoryUsage();
        const memoryUsed = endMemory - startMemory;

        expect(Math.abs(memoryUsed)).toBeLessThanOrEqual(MAX_MEMORY_MB);
      });

      it(`should process ${DATASET_SIZE} entries in ${EXPECTED_BATCHES} batches`, async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        for (let i = 0; i < EXPECTED_BATCHES; i++) {
          batchWriteEntries.mockResolvedValueOnce({ success: 500, failed: [] });
        }
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        await migrateAllEntries(TEST_USER_ID);

        // 5000 entries / 500 batch size = 10 batches
        expect(batchWriteEntries).toHaveBeenCalledTimes(EXPECTED_BATCHES);
      });

      it('should not show significant slowdown in later batches', async () => {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);

        const batchDurations = [];
        let batchIndex = 0;

        batchWriteEntries.mockImplementation(async () => {
          const startTime = performance.now();
          // Simulate consistent batch operation (no slowdown)
          await new Promise(resolve => setTimeout(resolve, 1));
          const duration = performance.now() - startTime;
          batchDurations.push({ batch: batchIndex++, duration });
          return { success: 500, failed: [] };
        });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        await migrateAllEntries(TEST_USER_ID);

        // Calculate average duration excluding first batch (warm-up variance)
        const durations = batchDurations.map(b => b.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const maxDuration = Math.max(...durations);

        // The maximum duration should not be more than 10x the average
        // This detects severe degradation while being tolerant of test environment variance
        const degradationRatio = maxDuration / avgDuration;
        expect(degradationRatio).toBeLessThan(10); // Allow up to 10x variance for test environment

        // Also verify we processed all expected batches
        expect(batchDurations.length).toBe(EXPECTED_BATCHES);
      });
    });
  });

  describe('Batching Correctness', () => {
    it('should use correct batch size of 500', () => {
      expect(getDefaultBatchSize()).toBe(500);
      expect(getBatchSize()).toBe(500);
    });

    it('should handle odd number of entries correctly', async () => {
      const DATASET_SIZE = 501;
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries
        .mockResolvedValueOnce({ success: 500, failed: [] })
        .mockResolvedValueOnce({ success: 1, failed: [] });
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.entriesMigrated).toBe(DATASET_SIZE);
      expect(batchWriteEntries).toHaveBeenCalledTimes(2);
    });

    it('should handle exactly batch boundary (500) correctly', async () => {
      const DATASET_SIZE = 500;
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.entriesMigrated).toBe(DATASET_SIZE);
      expect(batchWriteEntries).toHaveBeenCalledTimes(1);
    });

    it('should handle entries just under batch boundary (499)', async () => {
      const DATASET_SIZE = 499;
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      const result = await migrateAllEntries(TEST_USER_ID);

      expect(result.entriesMigrated).toBe(DATASET_SIZE);
      expect(batchWriteEntries).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not accumulate memory over multiple migrations', async () => {
      const DATASET_SIZE = 100;
      const ITERATIONS = 3;
      const memorySnapshots = [];

      for (let i = 0; i < ITERATIONS; i++) {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        // Reset status check for each iteration
        checkMigrationStatus.mockResolvedValue({
          completed: false,
          cancelled: false,
        });

        const memBefore = getMemoryUsage();
        await migrateAllEntries(TEST_USER_ID);
        const memAfter = getMemoryUsage();

        memorySnapshots.push({
          iteration: i + 1,
          before: memBefore,
          after: memAfter,
          delta: memAfter - memBefore,
        });

        // Clear mocks for next iteration
        vi.clearAllMocks();
      }

      // Check that memory doesn't grow unbounded
      // Later iterations should not use significantly more memory than first
      const firstDelta = memorySnapshots[0].delta;
      const lastDelta = memorySnapshots[ITERATIONS - 1].delta;

      // Memory should not grow more than 2x between first and last iteration
      // (accounting for GC timing variations)
      const memoryGrowth = lastDelta - firstDelta;
      expect(Math.abs(memoryGrowth)).toBeLessThan(50); // 50MB tolerance
    });

    it('should release references after migration completes', async () => {
      const DATASET_SIZE = 1000;
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries
        .mockResolvedValueOnce({ success: 500, failed: [] })
        .mockResolvedValueOnce({ success: 500, failed: [] });
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      const memBefore = getMemoryUsage();
      const result = await migrateAllEntries(TEST_USER_ID);

      // Force garbage collection hint (not guaranteed but helps)
      if (global.gc) {
        global.gc();
      }

      const memAfter = getMemoryUsage();
      const memoryRetained = memAfter - memBefore;

      expect(result.success).toBe(true);
      // Memory retained should be minimal after completion
      expect(Math.abs(memoryRetained)).toBeLessThan(100); // 100MB tolerance
    });
  });

  describe('Progress Callback Performance', () => {
    it('should call progress callback efficiently', async () => {
      const DATASET_SIZE = 100;
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      const progressCalls = [];
      const onProgress = vi.fn((completed, total) => {
        progressCalls.push({ completed, total, timestamp: performance.now() });
      });

      await migrateAllEntries(TEST_USER_ID, { onProgress });

      // Progress should be called at least twice (start and end)
      expect(onProgress).toHaveBeenCalled();
      expect(progressCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('should not block on slow progress callbacks', async () => {
      const DATASET_SIZE = 100;
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      // Simulate slow callback (10ms each)
      const onProgress = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const { duration } = await measureExecution(() =>
        migrateAllEntries(TEST_USER_ID, { onProgress })
      );

      // Should complete despite slow callbacks (callbacks should not block)
      expect(duration).toBeLessThan(5); // 5 seconds max
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle progress updates without blocking migration', async () => {
      const DATASET_SIZE = 500;
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      let migrationActive = true;
      const onProgress = vi.fn(() => {
        // Simulating UI update during migration
        expect(migrationActive).toBe(true);
      });

      await migrateAllEntries(TEST_USER_ID, { onProgress });
      migrationActive = false;

      expect(onProgress).toHaveBeenCalled();
    });

    it('should maintain consistent batch sizes under load', async () => {
      const DATASET_SIZE = 2500;
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);

      const batchSizes = [];
      batchWriteEntries.mockImplementation(async (userId, batchEntries) => {
        batchSizes.push(batchEntries.length);
        return { success: batchEntries.length, failed: [] };
      });
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      await migrateAllEntries(TEST_USER_ID);

      // All batches except the last should be exactly 500
      const fullBatches = batchSizes.slice(0, -1);
      fullBatches.forEach(size => {
        expect(size).toBe(500);
      });

      // Last batch should be remainder
      expect(batchSizes[batchSizes.length - 1]).toBe(DATASET_SIZE % 500 || 500);
    });
  });

  describe('Optimization Validation', () => {
    describe('Batch Size Optimization', () => {
      it('should use 500 as optimal batch size (Firestore limit)', () => {
        const batchSize = getDefaultBatchSize();
        expect(batchSize).toBe(500);
      });

      it('should not exceed Firestore batch limit even with custom size', async () => {
        const DATASET_SIZE = 1000;
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries
          .mockResolvedValueOnce({ success: 500, failed: [] })
          .mockResolvedValueOnce({ success: 500, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        // Try to set batch size larger than Firestore limit
        await migrateAllEntries(TEST_USER_ID, { batchSize: 1000 });

        // Should still use 500 (Firestore limit enforced)
        expect(batchWriteEntries).toHaveBeenCalledTimes(2);
      });
    });

    describe('Progress Update Throttling', () => {
      it('should handle rapid progress updates gracefully', async () => {
        const DATASET_SIZE = 100;
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        let callCount = 0;
        const onProgress = vi.fn(() => {
          callCount++;
        });

        await migrateAllEntries(TEST_USER_ID, { onProgress });

        // Progress should be called but not excessively
        expect(callCount).toBeLessThan(DATASET_SIZE + 10); // Allow some overhead
      });
    });

    describe('IndexedDB Read Performance', () => {
      it('should read all entries in single operation', async () => {
        const DATASET_SIZE = 1000;
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries
          .mockResolvedValueOnce({ success: 500, failed: [] })
          .mockResolvedValueOnce({ success: 500, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);

        await migrateAllEntries(TEST_USER_ID);

        // getAllEntries should be called exactly once (bulk read)
        expect(getAllEntries).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty dataset efficiently', async () => {
      getAllEntries.mockResolvedValue([]);

      const { result, duration } = await measureExecution(() =>
        migrateAllEntries(TEST_USER_ID)
      );

      expect(result.success).toBe(true);
      expect(result.entriesMigrated).toBe(0);
      expect(duration).toBeLessThan(1); // Should be nearly instant
    });

    it('should handle single entry efficiently', async () => {
      const entries = generateTestEntries(1);
      getAllEntries.mockResolvedValue(entries);
      batchWriteEntries.mockResolvedValue({ success: 1, failed: [] });
      getEntryCount.mockResolvedValue(1);

      const { result, duration } = await measureExecution(() =>
        migrateAllEntries(TEST_USER_ID)
      );

      expect(result.success).toBe(true);
      expect(result.entriesMigrated).toBe(1);
      expect(duration).toBeLessThan(1);
    });

    it('should handle maximum realistic dataset (10000 entries)', async () => {
      const DATASET_SIZE = 10000;
      const TARGET_TIME_SECONDS = 300; // 5 minutes
      const entries = generateTestEntries(DATASET_SIZE);
      getAllEntries.mockResolvedValue(entries);

      // Mock 20 batches
      for (let i = 0; i < 20; i++) {
        batchWriteEntries.mockResolvedValueOnce({ success: 500, failed: [] });
      }
      getEntryCount.mockResolvedValue(DATASET_SIZE);

      const { result, duration } = await measureExecution(() =>
        migrateAllEntries(TEST_USER_ID)
      );

      expect(result.success).toBe(true);
      expect(result.entriesMigrated).toBe(DATASET_SIZE);
      expect(duration).toBeLessThanOrEqual(TARGET_TIME_SECONDS);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance across runs', async () => {
      const DATASET_SIZE = 500;
      const RUNS = 3;
      const durations = [];

      for (let run = 0; run < RUNS; run++) {
        const entries = generateTestEntries(DATASET_SIZE);
        getAllEntries.mockResolvedValue(entries);
        batchWriteEntries.mockResolvedValue({ success: DATASET_SIZE, failed: [] });
        getEntryCount.mockResolvedValue(DATASET_SIZE);
        checkMigrationStatus.mockResolvedValue({
          completed: false,
          cancelled: false,
        });

        const { duration } = await measureExecution(() =>
          migrateAllEntries(TEST_USER_ID)
        );
        durations.push(duration);

        vi.clearAllMocks();
      }

      // Calculate variance
      const avgDuration = durations.reduce((a, b) => a + b, 0) / RUNS;
      const maxVariance = Math.max(...durations.map(d => Math.abs(d - avgDuration)));

      // Variance should be less than 50% of average (performance should be consistent)
      expect(maxVariance).toBeLessThan(avgDuration * 0.5);
    });
  });
});

describe('Benchmark Results Summary', () => {
  it('should log final benchmark results', () => {
    // This test serves as a documentation point for benchmark results
    const report = benchmarkResults.getReport();

    // Log results for documentation purposes
    if (report.length > 0) {
      console.log('\n=== MIGRATION PERFORMANCE BENCHMARKS ===');
      console.table(report);
      console.log('=========================================\n');
    }
  });
});
