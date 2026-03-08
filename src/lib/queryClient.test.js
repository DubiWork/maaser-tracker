/**
 * Tests for queryClient utilities
 *
 * Tests cover:
 * - Cache invalidation functions
 * - Cache clearing functions
 * - Query key constants
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import {
  queryClient,
  ENTRIES_QUERY_KEYS,
  invalidateEntriesCache,
  clearEntriesCache,
  invalidateMigrationStatus,
  clearAllUserCache,
  setQueryData,
} from './queryClient';

describe('ENTRIES_QUERY_KEYS', () => {
  it('should have correct query key structure', () => {
    expect(ENTRIES_QUERY_KEYS.all).toEqual(['entries']);
    expect(ENTRIES_QUERY_KEYS.lists()).toEqual(['entries', 'list']);
    expect(ENTRIES_QUERY_KEYS.list({ type: 'income' })).toEqual(['entries', 'list', { type: 'income' }]);
    expect(ENTRIES_QUERY_KEYS.details()).toEqual(['entries', 'detail']);
    expect(ENTRIES_QUERY_KEYS.detail('entry-1')).toEqual(['entries', 'detail', 'entry-1']);
    expect(ENTRIES_QUERY_KEYS.migrationStatus('user-123')).toEqual(['migration', 'status', 'user-123']);
  });

  it('should support filter variations for list key', () => {
    expect(ENTRIES_QUERY_KEYS.list({ dateRange: { start: '2026-01-01', end: '2026-12-31' } }))
      .toEqual(['entries', 'list', { dateRange: { start: '2026-01-01', end: '2026-12-31' } }]);
  });
});

describe('invalidateEntriesCache', () => {
  let testClient;

  beforeEach(() => {
    testClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  it('should invalidate all entries queries', async () => {
    const invalidateSpy = vi.spyOn(testClient, 'invalidateQueries');
    const refetchSpy = vi.spyOn(testClient, 'refetchQueries');

    await invalidateEntriesCache(testClient);

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ENTRIES_QUERY_KEYS.all });
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: ENTRIES_QUERY_KEYS.all,
      type: 'active',
    });
  });

  it('should use default queryClient when not provided', async () => {
    // Test that it doesn't throw when using default client
    await expect(invalidateEntriesCache()).resolves.not.toThrow();
  });
});

describe('clearEntriesCache', () => {
  let testClient;

  beforeEach(() => {
    testClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  it('should remove all entries queries from cache', () => {
    const removeSpy = vi.spyOn(testClient, 'removeQueries');

    clearEntriesCache(testClient);

    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ENTRIES_QUERY_KEYS.all });
  });

  it('should use default queryClient when not provided', () => {
    expect(() => clearEntriesCache()).not.toThrow();
  });
});

describe('invalidateMigrationStatus', () => {
  let testClient;

  beforeEach(() => {
    testClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  it('should invalidate migration status for specific user', async () => {
    const invalidateSpy = vi.spyOn(testClient, 'invalidateQueries');

    await invalidateMigrationStatus(testClient, 'user-123');

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ENTRIES_QUERY_KEYS.migrationStatus('user-123'),
    });
  });

  it('should not invalidate when userId is not provided', async () => {
    const invalidateSpy = vi.spyOn(testClient, 'invalidateQueries');

    await invalidateMigrationStatus(testClient, null);

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('should not invalidate when userId is empty string', async () => {
    const invalidateSpy = vi.spyOn(testClient, 'invalidateQueries');

    await invalidateMigrationStatus(testClient, '');

    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('clearAllUserCache', () => {
  let testClient;

  beforeEach(() => {
    testClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  it('should remove entries and migration queries', () => {
    const removeSpy = vi.spyOn(testClient, 'removeQueries');

    clearAllUserCache(testClient);

    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ENTRIES_QUERY_KEYS.all });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['migration'] });
  });
});

describe('setQueryData', () => {
  let testClient;

  beforeEach(() => {
    testClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  it('should set query data directly', () => {
    const setSpy = vi.spyOn(testClient, 'setQueryData');
    const testData = { progress: 50 };

    setQueryData(testClient, ['migration', 'progress'], testData);

    expect(setSpy).toHaveBeenCalledWith(['migration', 'progress'], testData);
  });

  it('should be able to retrieve set data', () => {
    const testData = { progress: 75, total: 100 };

    setQueryData(testClient, ['migration', 'progress'], testData);

    const retrievedData = testClient.getQueryData(['migration', 'progress']);
    expect(retrievedData).toEqual(testData);
  });
});

describe('queryClient singleton', () => {
  it('should be a QueryClient instance', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });

  it('should have correct default options', () => {
    const options = queryClient.getDefaultOptions();

    expect(options.queries.staleTime).toBe(1000 * 60 * 5); // 5 minutes
    expect(options.queries.gcTime).toBe(1000 * 60 * 10); // 10 minutes
    expect(options.queries.retry).toBe(3);
    expect(options.queries.refetchOnWindowFocus).toBe(true);
    expect(options.queries.refetchOnReconnect).toBe(false);
    expect(options.mutations.retry).toBe(1);
  });
});
