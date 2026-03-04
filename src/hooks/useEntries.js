/**
 * Custom React Hooks for Data Access
 *
 * These hooks integrate IndexedDB and Firestore operations with React Query
 * for efficient data fetching, caching, and mutations.
 *
 * Migration-Aware Data Source:
 * - Before migration: Uses IndexedDB (offline-first, local storage)
 * - After migration: Uses Firestore (cloud storage with sync)
 *
 * The data source switch is automatic and transparent to components.
 * All components using these hooks will automatically use the correct
 * data source based on migration status.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllEntries as getAllEntriesFromIndexedDB,
  getEntry as getEntryFromIndexedDB,
  addEntry as addEntryToIndexedDB,
  updateEntry as updateEntryInIndexedDB,
  deleteEntry as deleteEntryFromIndexedDB,
  getEntriesByDateRange as getEntriesByDateRangeFromIndexedDB,
  getEntriesByType as getEntriesByTypeFromIndexedDB,
} from '../services/db';
import { checkMigrationStatus } from '../services/migrationStatusService';
import { isAuthenticated, getCurrentUserId } from '../lib/firebase';

// Query Keys Factory - exported for external use (cache invalidation, testing)
export const queryKeys = {
  all: ['entries'],
  lists: () => [...queryKeys.all, 'list'],
  list: (filters) => [...queryKeys.lists(), filters],
  details: () => [...queryKeys.all, 'detail'],
  detail: (id) => [...queryKeys.details(), id],
  migrationStatus: (userId) => ['migration', 'status', userId],
};

/**
 * Determine which data source to use based on migration status
 *
 * @param {Object|null} migrationStatus - Migration status object
 * @returns {'firestore'|'indexeddb'} Data source identifier
 */
export function getDataSource(migrationStatus) {
  // Use Firestore if migration is completed and user is authenticated
  if (migrationStatus?.completed && isAuthenticated()) {
    return 'firestore';
  }
  // Default to IndexedDB (offline-first)
  return 'indexeddb';
}

/**
 * Hook to get migration status for the current user
 *
 * This hook fetches the migration status from Firestore to determine
 * which data source should be used for entries.
 *
 * @returns {Object} Query result with migration status data
 *
 * @example
 * const { data: migrationStatus, isLoading } = useMigrationStatus();
 * if (migrationStatus?.completed) {
 *   console.log('Using Firestore as data source');
 * }
 */
export function useMigrationStatus() {
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: queryKeys.migrationStatus(userId),
    queryFn: async () => {
      // If not authenticated, return null (use IndexedDB)
      if (!userId || !isAuthenticated()) {
        return null;
      }

      try {
        return await checkMigrationStatus(userId);
      } catch (error) {
        // On error, return null to default to IndexedDB
        if (import.meta.env.DEV) {
          console.warn('useMigrationStatus: Error checking status, defaulting to IndexedDB:', error);
        }
        return null;
      }
    },
    // Only run if user is authenticated
    enabled: !!userId && isAuthenticated(),
    // Cache for longer since migration status rarely changes
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    // Retry on failure
    retry: 2,
  });
}

/**
 * Hook to fetch all entries from the appropriate data source
 *
 * Automatically switches between IndexedDB and Firestore based on
 * migration status. Components don't need to know which data source
 * is being used.
 *
 * @returns {Object} Query result with entries data and data source info
 *
 * @example
 * const { data: entries, isLoading, dataSource } = useEntries();
 * // entries contains all user entries from the appropriate source
 */
export function useEntries() {
  const { data: migrationStatus } = useMigrationStatus();
  const dataSource = getDataSource(migrationStatus);
  const userId = getCurrentUserId();

  const query = useQuery({
    queryKey: [...queryKeys.lists(), { dataSource, userId }],
    queryFn: async () => {
      if (dataSource === 'firestore' && userId) {
        // Firestore data source (after migration)
        // Note: Firestore service will be implemented in a later sub-task
        // For now, we import and use the migration service's getEntries if available
        // or fall back to IndexedDB
        try {
          // Dynamic import to avoid circular dependency
          const { getDocs, collection } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const entriesRef = collection(db, 'users', userId, 'entries');
          const snapshot = await getDocs(entriesRef);

          const entries = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              // Convert Firestore Timestamps to ISO strings
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            };
          });

          if (import.meta.env.DEV) {
            console.log(`useEntries: Fetched ${entries.length} entries from Firestore`);
          }

          return entries;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('useEntries: Firestore fetch failed, falling back to IndexedDB:', error);
          }
          // Fall back to IndexedDB on error
          return getAllEntriesFromIndexedDB();
        }
      }

      // IndexedDB data source (default, before migration)
      return getAllEntriesFromIndexedDB();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  // Extend the query result with data source info
  return {
    ...query,
    dataSource,
    migrationStatus,
  };
}

/**
 * Hook to fetch a single entry by ID from the appropriate data source
 *
 * @param {string} id - Entry ID
 * @returns {Object} Query result with entry data
 *
 * @example
 * const { data: entry, isLoading } = useEntry('entry-123');
 */
export function useEntry(id) {
  const { data: migrationStatus } = useMigrationStatus();
  const dataSource = getDataSource(migrationStatus);
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: [...queryKeys.detail(id), { dataSource, userId }],
    queryFn: async () => {
      if (dataSource === 'firestore' && userId) {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const docRef = doc(db, 'users', userId, 'entries', id);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) {
            return undefined;
          }

          const data = docSnap.data();
          return {
            ...data,
            id: docSnap.id,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
          };
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('useEntry: Firestore fetch failed, falling back to IndexedDB:', error);
          }
          return getEntryFromIndexedDB(id);
        }
      }

      return getEntryFromIndexedDB(id);
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch entries by date range from the appropriate data source
 *
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} options - React Query options
 * @returns {Object} Query result with filtered entries
 *
 * @example
 * const { data: entries } = useEntriesByDateRange('2026-01-01', '2026-12-31');
 */
export function useEntriesByDateRange(startDate, endDate, options = {}) {
  const { data: migrationStatus } = useMigrationStatus();
  const dataSource = getDataSource(migrationStatus);
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: [...queryKeys.list({ dateRange: { startDate, endDate } }), { dataSource, userId }],
    queryFn: async () => {
      if (dataSource === 'firestore' && userId) {
        try {
          const { getDocs, collection, query, where, orderBy } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const entriesRef = collection(db, 'users', userId, 'entries');
          const q = query(
            entriesRef,
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'desc')
          );
          const snapshot = await getDocs(q);

          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            };
          });
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('useEntriesByDateRange: Firestore fetch failed, falling back to IndexedDB:', error);
          }
          return getEntriesByDateRangeFromIndexedDB(startDate, endDate);
        }
      }

      return getEntriesByDateRangeFromIndexedDB(startDate, endDate);
    },
    enabled: !!(startDate && endDate),
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook to fetch entries by type from the appropriate data source
 *
 * @param {string} type - 'income' or 'donation'
 * @param {Object} options - React Query options
 * @returns {Object} Query result with filtered entries
 *
 * @example
 * const { data: incomeEntries } = useEntriesByType('income');
 */
export function useEntriesByType(type, options = {}) {
  const { data: migrationStatus } = useMigrationStatus();
  const dataSource = getDataSource(migrationStatus);
  const userId = getCurrentUserId();

  return useQuery({
    queryKey: [...queryKeys.list({ type }), { dataSource, userId }],
    queryFn: async () => {
      if (dataSource === 'firestore' && userId) {
        try {
          const { getDocs, collection, query, where, orderBy } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const entriesRef = collection(db, 'users', userId, 'entries');
          const q = query(
            entriesRef,
            where('type', '==', type),
            orderBy('date', 'desc')
          );
          const snapshot = await getDocs(q);

          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              ...data,
              id: doc.id,
              createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
              updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
            };
          });
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('useEntriesByType: Firestore fetch failed, falling back to IndexedDB:', error);
          }
          return getEntriesByTypeFromIndexedDB(type);
        }
      }

      return getEntriesByTypeFromIndexedDB(type);
    },
    enabled: !!type,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook to add a new entry to the appropriate data source
 *
 * After migration, new entries are written to Firestore.
 * Before migration, entries are written to IndexedDB.
 *
 * @returns {Object} Mutation object with mutate function
 *
 * @example
 * const addEntry = useAddEntry();
 * addEntry.mutate({ type: 'income', amount: 1000, date: '2026-03-01' });
 */
export function useAddEntry() {
  const queryClient = useQueryClient();
  const { data: migrationStatus } = useMigrationStatus();
  const dataSource = getDataSource(migrationStatus);
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (newEntry) => {
      if (dataSource === 'firestore' && userId) {
        try {
          const { setDoc, doc, serverTimestamp } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const entryId = newEntry.id || `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const docRef = doc(db, 'users', userId, 'entries', entryId);

          await setDoc(docRef, {
            ...newEntry,
            id: entryId,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          return entryId;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('useAddEntry: Firestore write failed:', error);
          }
          throw error;
        }
      }

      return addEntryToIndexedDB(newEntry);
    },
    onSuccess: (id, newEntry) => {
      // Invalidate and refetch entries list
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });

      // Optionally set the new entry in cache
      queryClient.setQueryData([...queryKeys.detail(id), { dataSource, userId }], newEntry);

      if (import.meta.env.DEV) {
        console.log('useAddEntry: Entry added successfully', id, 'to', dataSource);
      }
    },
    // Optimistic update for better UX
    onMutate: async (newEntry) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.lists() });

      // Snapshot previous value
      const previousEntries = queryClient.getQueryData([...queryKeys.lists(), { dataSource, userId }]);

      // Optimistically update cache
      queryClient.setQueryData([...queryKeys.lists(), { dataSource, userId }], (old) => {
        return old ? [...old, newEntry] : [newEntry];
      });

      // Return context with snapshot
      return { previousEntries };
    },
    // If mutation fails, use context to roll back
    onError: (error, newEntry, context) => {
      console.error('useAddEntry: Failed to add entry', error);
      if (context?.previousEntries) {
        queryClient.setQueryData([...queryKeys.lists(), { dataSource, userId }], context.previousEntries);
      }
    },
  });
}

/**
 * Hook to update an existing entry in the appropriate data source
 *
 * @returns {Object} Mutation object with mutate function
 *
 * @example
 * const updateEntry = useUpdateEntry();
 * updateEntry.mutate({ id: 'entry-123', amount: 1500 });
 */
export function useUpdateEntry() {
  const queryClient = useQueryClient();
  const { data: migrationStatus } = useMigrationStatus();
  const dataSource = getDataSource(migrationStatus);
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (updatedEntry) => {
      if (dataSource === 'firestore' && userId) {
        try {
          const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const docRef = doc(db, 'users', userId, 'entries', updatedEntry.id);

          await updateDoc(docRef, {
            ...updatedEntry,
            updatedAt: serverTimestamp(),
          });

          return updatedEntry.id;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('useUpdateEntry: Firestore update failed:', error);
          }
          throw error;
        }
      }

      return updateEntryInIndexedDB(updatedEntry);
    },
    onSuccess: (id, updatedEntry) => {
      // Invalidate and refetch entries list
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });

      // Update the specific entry in cache
      queryClient.setQueryData([...queryKeys.detail(id), { dataSource, userId }], updatedEntry);

      if (import.meta.env.DEV) {
        console.log('useUpdateEntry: Entry updated successfully', id, 'in', dataSource);
      }
    },
    // Optimistic update
    onMutate: async (updatedEntry) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.detail(updatedEntry.id) });

      const previousEntries = queryClient.getQueryData([...queryKeys.lists(), { dataSource, userId }]);
      const previousEntry = queryClient.getQueryData([...queryKeys.detail(updatedEntry.id), { dataSource, userId }]);

      // Optimistically update lists
      queryClient.setQueryData([...queryKeys.lists(), { dataSource, userId }], (old) => {
        if (!old) return old;
        return old.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry));
      });

      // Optimistically update detail
      queryClient.setQueryData([...queryKeys.detail(updatedEntry.id), { dataSource, userId }], updatedEntry);

      return { previousEntries, previousEntry };
    },
    onError: (error, updatedEntry, context) => {
      console.error('useUpdateEntry: Failed to update entry', error);
      if (context?.previousEntries) {
        queryClient.setQueryData([...queryKeys.lists(), { dataSource, userId }], context.previousEntries);
      }
      if (context?.previousEntry) {
        queryClient.setQueryData([...queryKeys.detail(updatedEntry.id), { dataSource, userId }], context.previousEntry);
      }
    },
  });
}

/**
 * Hook to delete an entry from the appropriate data source
 *
 * @returns {Object} Mutation object with mutate function
 *
 * @example
 * const deleteEntry = useDeleteEntry();
 * deleteEntry.mutate('entry-123');
 */
export function useDeleteEntry() {
  const queryClient = useQueryClient();
  const { data: migrationStatus } = useMigrationStatus();
  const dataSource = getDataSource(migrationStatus);
  const userId = getCurrentUserId();

  return useMutation({
    mutationFn: async (deletedId) => {
      if (dataSource === 'firestore' && userId) {
        try {
          const { deleteDoc, doc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');

          const docRef = doc(db, 'users', userId, 'entries', deletedId);
          await deleteDoc(docRef);

          return deletedId;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('useDeleteEntry: Firestore delete failed:', error);
          }
          throw error;
        }
      }

      await deleteEntryFromIndexedDB(deletedId);
      return deletedId;
    },
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch entries list
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });

      // Remove the specific entry from cache
      queryClient.removeQueries({ queryKey: [...queryKeys.detail(deletedId), { dataSource, userId }] });

      if (import.meta.env.DEV) {
        console.log('useDeleteEntry: Entry deleted successfully', deletedId, 'from', dataSource);
      }
    },
    // Optimistic update
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.lists() });

      const previousEntries = queryClient.getQueryData([...queryKeys.lists(), { dataSource, userId }]);

      // Optimistically remove from list
      queryClient.setQueryData([...queryKeys.lists(), { dataSource, userId }], (old) => {
        if (!old) return old;
        return old.filter((entry) => entry.id !== deletedId);
      });

      return { previousEntries };
    },
    onError: (error, deletedId, context) => {
      console.error('useDeleteEntry: Failed to delete entry', error);
      if (context?.previousEntries) {
        queryClient.setQueryData([...queryKeys.lists(), { dataSource, userId }], context.previousEntries);
      }
    },
  });
}

/**
 * Hook to invalidate all entries cache after migration
 *
 * This is a utility hook that components can use to force a refresh
 * of entries data after migration completes.
 *
 * @returns {Function} Function to invalidate entries cache
 *
 * @example
 * const invalidateEntries = useInvalidateEntries();
 * // After migration completes
 * await invalidateEntries();
 */
export function useInvalidateEntries() {
  const queryClient = useQueryClient();

  return async () => {
    if (import.meta.env.DEV) {
      console.log('useInvalidateEntries: Invalidating all entries cache');
    }

    // Invalidate all queries under 'entries' key
    await queryClient.invalidateQueries({ queryKey: queryKeys.all });

    // Force immediate refetch of active queries
    await queryClient.refetchQueries({
      queryKey: queryKeys.all,
      type: 'active',
    });

    if (import.meta.env.DEV) {
      console.log('useInvalidateEntries: Entries cache invalidated and refetched');
    }
  };
}

/**
 * Hook to clear entries cache (e.g., on sign-out)
 *
 * @returns {Function} Function to clear entries cache
 *
 * @example
 * const clearEntries = useClearEntriesCache();
 * // On sign-out
 * clearEntries();
 */
export function useClearEntriesCache() {
  const queryClient = useQueryClient();

  return () => {
    if (import.meta.env.DEV) {
      console.log('useClearEntriesCache: Clearing all entries cache');
    }

    queryClient.removeQueries({ queryKey: queryKeys.all });
    queryClient.removeQueries({ queryKey: ['migration'] });

    if (import.meta.env.DEV) {
      console.log('useClearEntriesCache: Entries cache cleared');
    }
  };
}
