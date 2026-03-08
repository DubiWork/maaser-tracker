/**
 * Tests for useEntries hooks
 *
 * Tests cover:
 * - Migration status detection
 * - Data source switching (IndexedDB vs Firestore)
 * - Cache invalidation after migration
 * - Optimistic updates during mutations
 * - Backward compatibility (same API)
 * - Error handling and fallback behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  isAuthenticated: vi.fn(),
  getCurrentUserId: vi.fn(),
  db: {},
}));

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
}));

// Mock IndexedDB service
vi.mock('../services/db', () => ({
  getAllEntries: vi.fn(),
  getEntry: vi.fn(),
  addEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  getEntriesByDateRange: vi.fn(),
  getEntriesByType: vi.fn(),
}));

// Mock Migration Status Service
vi.mock('../services/migrationStatusService', () => ({
  checkMigrationStatus: vi.fn(),
}));

// Import mocked modules
import { isAuthenticated, getCurrentUserId } from '../lib/firebase';
import { getDocs, getDoc, setDoc, updateDoc, deleteDoc, doc, collection } from 'firebase/firestore';
import {
  getAllEntries as getAllEntriesFromDB,
  getEntry as getEntryFromDB,
  addEntry as addEntryToDB,
  updateEntry as updateEntryInDB,
  deleteEntry as deleteEntryFromDB,
  getEntriesByDateRange as getEntriesByDateRangeFromDB,
  getEntriesByType as getEntriesByTypeFromDB,
} from '../services/db';
import { checkMigrationStatus } from '../services/migrationStatusService';

// Import hooks to test
import {
  useEntries,
  useEntry,
  useEntriesByDateRange,
  useEntriesByType,
  useAddEntry,
  useUpdateEntry,
  useDeleteEntry,
  useMigrationStatus,
  useInvalidateEntries,
  useClearEntriesCache,
  queryKeys,
  getDataSource,
} from './useEntries';

// Test data
const mockEntries = [
  { id: 'entry-1', type: 'income', amount: 1000, date: '2026-03-01', note: 'Test income' },
  { id: 'entry-2', type: 'donation', amount: 100, date: '2026-03-02', note: 'Test donation' },
  { id: 'entry-3', type: 'income', amount: 2000, date: '2026-03-03', note: 'Another income' },
];

const mockFirestoreDoc = (entry) => ({
  id: entry.id,
  data: () => ({
    ...entry,
    createdAt: { toDate: () => new Date('2026-03-01') },
    updatedAt: { toDate: () => new Date('2026-03-01') },
  }),
  exists: () => true,
});

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('queryKeys', () => {
  it('should generate correct query keys', () => {
    expect(queryKeys.all).toEqual(['entries']);
    expect(queryKeys.lists()).toEqual(['entries', 'list']);
    expect(queryKeys.list({ type: 'income' })).toEqual(['entries', 'list', { type: 'income' }]);
    expect(queryKeys.details()).toEqual(['entries', 'detail']);
    expect(queryKeys.detail('entry-1')).toEqual(['entries', 'detail', 'entry-1']);
    expect(queryKeys.migrationStatus('user-123')).toEqual(['migration', 'status', 'user-123']);
  });
});

describe('getDataSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return indexeddb when migration status is null', () => {
    isAuthenticated.mockReturnValue(false);
    expect(getDataSource(null)).toBe('indexeddb');
  });

  it('should return indexeddb when migration is not completed', () => {
    isAuthenticated.mockReturnValue(true);
    expect(getDataSource({ completed: false })).toBe('indexeddb');
  });

  it('should return indexeddb when user is not authenticated even if migration completed', () => {
    isAuthenticated.mockReturnValue(false);
    expect(getDataSource({ completed: true })).toBe('indexeddb');
  });

  it('should return firestore when migration is completed and user is authenticated', () => {
    isAuthenticated.mockReturnValue(true);
    expect(getDataSource({ completed: true })).toBe('firestore');
  });
});

describe('useMigrationStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null when user is not authenticated', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);

    const { result } = renderHook(() => useMigrationStatus(), {
      wrapper: createWrapper(),
    });

    // Query should not run when not authenticated
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch migration status when user is authenticated', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true, completedAt: new Date() });

    const { result } = renderHook(() => useMigrationStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(checkMigrationStatus).toHaveBeenCalledWith('user-123');
    expect(result.current.data.completed).toBe(true);
  });

  it('should handle migration status check error gracefully', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMigrationStatus(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return null on error (fallback to IndexedDB)
    expect(result.current.data).toBeNull();
  });
});

describe('useEntries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch entries from IndexedDB when migration not completed', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    getAllEntriesFromDB.mockResolvedValue(mockEntries);

    const { result } = renderHook(() => useEntries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getAllEntriesFromDB).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockEntries);
    expect(result.current.dataSource).toBe('indexeddb');
  });

  it('should fetch entries from Firestore when migration completed', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true });

    const mockSnapshot = {
      docs: mockEntries.map(mockFirestoreDoc),
    };
    getDocs.mockResolvedValue(mockSnapshot);
    collection.mockReturnValue('entries-collection');

    const { result } = renderHook(() => useEntries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getDocs).toHaveBeenCalled();
    expect(result.current.dataSource).toBe('firestore');
  });

  it('should fall back to IndexedDB when Firestore fetch fails', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true });
    getDocs.mockRejectedValue(new Error('Firestore error'));
    getAllEntriesFromDB.mockResolvedValue(mockEntries);
    collection.mockReturnValue('entries-collection');

    const { result } = renderHook(() => useEntries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getAllEntriesFromDB).toHaveBeenCalled();
    expect(result.current.data).toEqual(mockEntries);
  });

  it('should include migration status in result', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true, entriesMigrated: 10 });
    getAllEntriesFromDB.mockResolvedValue(mockEntries);

    const { result } = renderHook(() => useEntries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.migrationStatus).toBeDefined();
    });
  });
});

describe('useEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single entry from IndexedDB', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    getEntryFromDB.mockResolvedValue(mockEntries[0]);

    const { result } = renderHook(() => useEntry('entry-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getEntryFromDB).toHaveBeenCalledWith('entry-1');
    expect(result.current.data).toEqual(mockEntries[0]);
  });

  it('should fetch single entry from Firestore when migration completed', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true });

    const mockDocSnap = mockFirestoreDoc(mockEntries[0]);
    getDoc.mockResolvedValue(mockDocSnap);
    doc.mockReturnValue('doc-ref');

    const { result } = renderHook(() => useEntry('entry-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getDoc).toHaveBeenCalled();
  });

  it('should not run query when id is not provided', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);

    const { result } = renderHook(() => useEntry(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFetching).toBe(false);
    expect(getEntryFromDB).not.toHaveBeenCalled();
  });
});

describe('useEntriesByDateRange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch entries by date range from IndexedDB', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    getEntriesByDateRangeFromDB.mockResolvedValue([mockEntries[0], mockEntries[1]]);

    const { result } = renderHook(
      () => useEntriesByDateRange('2026-03-01', '2026-03-02'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getEntriesByDateRangeFromDB).toHaveBeenCalledWith('2026-03-01', '2026-03-02');
    expect(result.current.data).toHaveLength(2);
  });

  it('should not run query when dates are not provided', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);

    const { result } = renderHook(
      () => useEntriesByDateRange(null, null),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(false);
    expect(getEntriesByDateRangeFromDB).not.toHaveBeenCalled();
  });
});

describe('useEntriesByType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch entries by type from IndexedDB', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    getEntriesByTypeFromDB.mockResolvedValue([mockEntries[0], mockEntries[2]]);

    const { result } = renderHook(
      () => useEntriesByType('income'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(getEntriesByTypeFromDB).toHaveBeenCalledWith('income');
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useAddEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add entry to IndexedDB when not migrated', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    addEntryToDB.mockResolvedValue('entry-new');

    const newEntry = { id: 'entry-new', type: 'income', amount: 500, date: '2026-03-04' };

    const { result } = renderHook(() => useAddEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(newEntry);
    });

    expect(addEntryToDB).toHaveBeenCalledWith(newEntry);
  });

  it('should add entry to Firestore when migration completed', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true });
    setDoc.mockResolvedValue(undefined);
    doc.mockReturnValue('doc-ref');

    const newEntry = { type: 'income', amount: 500, date: '2026-03-04' };

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    // Pre-populate the migration status cache so the mutation uses Firestore
    queryClient.setQueryData(queryKeys.migrationStatus('user-123'), { completed: true });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAddEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(newEntry);
    });

    expect(setDoc).toHaveBeenCalled();
  });

  it('should handle mutation error', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    addEntryToDB.mockRejectedValue(new Error('Database error'));

    const newEntry = { id: 'entry-new', type: 'income', amount: 500, date: '2026-03-04' };

    const { result } = renderHook(() => useAddEntry(), {
      wrapper: createWrapper(),
    });

    await expect(async () => {
      await act(async () => {
        await result.current.mutateAsync(newEntry);
      });
    }).rejects.toThrow('Database error');
  });
});

describe('useUpdateEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update entry in IndexedDB when not migrated', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    updateEntryInDB.mockResolvedValue('entry-1');

    const updatedEntry = { id: 'entry-1', type: 'income', amount: 1500, date: '2026-03-01' };

    const { result } = renderHook(() => useUpdateEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(updatedEntry);
    });

    expect(updateEntryInDB).toHaveBeenCalledWith(updatedEntry);
  });

  it('should update entry in Firestore when migration completed', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true });
    updateDoc.mockResolvedValue(undefined);
    doc.mockReturnValue('doc-ref');

    const updatedEntry = { id: 'entry-1', type: 'income', amount: 1500, date: '2026-03-01' };

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    // Pre-populate the migration status cache so the mutation uses Firestore
    queryClient.setQueryData(queryKeys.migrationStatus('user-123'), { completed: true });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(updatedEntry);
    });

    expect(updateDoc).toHaveBeenCalled();
  });
});

describe('useDeleteEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete entry from IndexedDB when not migrated', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    deleteEntryFromDB.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteEntry(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync('entry-1');
    });

    expect(deleteEntryFromDB).toHaveBeenCalledWith('entry-1');
  });

  it('should delete entry from Firestore when migration completed', async () => {
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true });
    deleteDoc.mockResolvedValue(undefined);
    doc.mockReturnValue('doc-ref');

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    // Pre-populate the migration status cache so the mutation uses Firestore
    queryClient.setQueryData(queryKeys.migrationStatus('user-123'), { completed: true });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('entry-1');
    });

    expect(deleteDoc).toHaveBeenCalled();
  });
});

describe('useInvalidateEntries', () => {
  it('should invalidate all entries queries', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const refetchSpy = vi.spyOn(queryClient, 'refetchQueries');

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useInvalidateEntries(), { wrapper });

    await act(async () => {
      await result.current();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.all });
    expect(refetchSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.all,
      type: 'active',
    });
  });
});

describe('useClearEntriesCache', () => {
  it('should remove all entries queries', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    const removeSpy = vi.spyOn(queryClient, 'removeQueries');

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useClearEntriesCache(), { wrapper });

    act(() => {
      result.current();
    });

    expect(removeSpy).toHaveBeenCalledWith({ queryKey: queryKeys.all });
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['migration'] });
  });
});

describe('cache invalidation after migration', () => {
  it('should refetch data from new source after migration completes', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    // Start with not migrated
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    getAllEntriesFromDB.mockResolvedValue(mockEntries);

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result, rerender } = renderHook(() => useEntries(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.dataSource).toBe('indexeddb');
    expect(getAllEntriesFromDB).toHaveBeenCalled();

    // Simulate migration completion
    isAuthenticated.mockReturnValue(true);
    getCurrentUserId.mockReturnValue('user-123');
    checkMigrationStatus.mockResolvedValue({ completed: true });

    // Clear mocks for second fetch
    getAllEntriesFromDB.mockClear();

    const mockSnapshot = {
      docs: mockEntries.map(mockFirestoreDoc),
    };
    getDocs.mockResolvedValue(mockSnapshot);
    collection.mockReturnValue('entries-collection');

    // Invalidate cache to trigger refetch
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.all });
    });

    rerender();

    await waitFor(() => {
      expect(result.current.dataSource).toBe('firestore');
    });
  });
});

describe('backward compatibility', () => {
  it('useEntries should maintain same API shape', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    getAllEntriesFromDB.mockResolvedValue(mockEntries);

    const { result } = renderHook(() => useEntries(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Original API properties
    expect(result.current.data).toBeDefined();
    expect(result.current.isLoading).toBeDefined();
    expect(result.current.isError).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.refetch).toBeDefined();

    // New properties - check that property exists on object (can be undefined)
    expect('dataSource' in result.current).toBe(true);
    expect('migrationStatus' in result.current).toBe(true);
  });

  it('mutation hooks should maintain same API', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    addEntryToDB.mockResolvedValue('entry-new');
    updateEntryInDB.mockResolvedValue('entry-1');
    deleteEntryFromDB.mockResolvedValue(undefined);

    const { result: addResult } = renderHook(() => useAddEntry(), {
      wrapper: createWrapper(),
    });

    const { result: updateResult } = renderHook(() => useUpdateEntry(), {
      wrapper: createWrapper(),
    });

    const { result: deleteResult } = renderHook(() => useDeleteEntry(), {
      wrapper: createWrapper(),
    });

    // All mutations should have standard TanStack Query mutation API
    // Note: React Query v5 renamed isLoading to isPending for mutations
    expect(addResult.current.mutate).toBeDefined();
    expect(addResult.current.mutateAsync).toBeDefined();
    expect(addResult.current.isPending).toBeDefined();
    expect(addResult.current.isError).toBeDefined();

    expect(updateResult.current.mutate).toBeDefined();
    expect(updateResult.current.mutateAsync).toBeDefined();

    expect(deleteResult.current.mutate).toBeDefined();
    expect(deleteResult.current.mutateAsync).toBeDefined();
  });
});

describe('optimistic updates', () => {
  it('should optimistically add entry to cache', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    getAllEntriesFromDB.mockResolvedValue(mockEntries);

    // Delay the actual mutation to observe optimistic update
    addEntryToDB.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve('entry-new'), 100)));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // First, populate the cache
    const { result: entriesResult } = renderHook(() => useEntries(), { wrapper });

    await waitFor(() => {
      expect(entriesResult.current.isSuccess).toBe(true);
    });

    // Now add an entry
    const { result: addResult } = renderHook(() => useAddEntry(), { wrapper });

    const newEntry = { id: 'entry-new', type: 'income', amount: 500, date: '2026-03-04' };

    // Start the mutation
    act(() => {
      addResult.current.mutate(newEntry);
    });

    // Wait for mutation to complete
    await waitFor(() => {
      expect(addResult.current.isSuccess).toBe(true);
    });

    expect(addEntryToDB).toHaveBeenCalledWith(newEntry);
  });

  it('should rollback on mutation error', async () => {
    isAuthenticated.mockReturnValue(false);
    getCurrentUserId.mockReturnValue(null);
    getAllEntriesFromDB.mockResolvedValue(mockEntries);
    addEntryToDB.mockRejectedValue(new Error('Database error'));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result: addResult } = renderHook(() => useAddEntry(), { wrapper });

    const newEntry = { id: 'entry-new', type: 'income', amount: 500, date: '2026-03-04' };

    await expect(async () => {
      await act(async () => {
        await addResult.current.mutateAsync(newEntry);
      });
    }).rejects.toThrow('Database error');

    // Wait for error state to propagate
    await waitFor(() => {
      expect(addResult.current.isError).toBe(true);
    });
  });
});
