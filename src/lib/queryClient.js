/**
 * React Query Configuration
 *
 * Configures the QueryClient with appropriate defaults for the app.
 * Provides cache invalidation utilities for migration operations.
 *
 * Migration Integration:
 * - invalidateEntriesCache() - Force refresh after migration completes
 * - clearEntriesCache() - Clear all cached entries data
 * - prefetchEntriesFromFirestore() - Pre-load data from Firestore
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh (5 minutes)
      staleTime: 1000 * 60 * 5,
      // How long inactive data stays in cache (10 minutes)
      gcTime: 1000 * 60 * 10,
      // Retry failed queries up to 3 times
      retry: 3,
      // Delay between retries (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for data freshness
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect for offline-first behavior
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

/**
 * Query key constants for entries data
 * Used for cache invalidation and prefetching
 */
export const ENTRIES_QUERY_KEYS = {
  all: ['entries'],
  lists: () => [...ENTRIES_QUERY_KEYS.all, 'list'],
  list: (filters) => [...ENTRIES_QUERY_KEYS.lists(), filters],
  details: () => [...ENTRIES_QUERY_KEYS.all, 'detail'],
  detail: (id) => [...ENTRIES_QUERY_KEYS.details(), id],
  migrationStatus: (userId) => ['migration', 'status', userId],
};

/**
 * Invalidate all entries queries and force refetch from data source
 *
 * Call this after migration completes to ensure UI shows data from
 * the new data source (Firestore instead of IndexedDB).
 *
 * @param {QueryClient} client - QueryClient instance (defaults to singleton)
 * @returns {Promise<void>}
 *
 * @example
 * // After migration completes
 * await invalidateEntriesCache();
 * // All components using useEntries will refetch from Firestore
 */
export async function invalidateEntriesCache(client = queryClient) {
  if (import.meta.env.DEV) {
    console.log('QueryClient: Invalidating all entries cache');
  }

  // Invalidate all queries under 'entries' key
  await client.invalidateQueries({ queryKey: ENTRIES_QUERY_KEYS.all });

  // Force immediate refetch of active queries
  await client.refetchQueries({
    queryKey: ENTRIES_QUERY_KEYS.all,
    type: 'active',
  });

  if (import.meta.env.DEV) {
    console.log('QueryClient: Entries cache invalidated and refetched');
  }
}

/**
 * Clear all cached entries data without refetching
 *
 * Use this when you want to remove stale data but don't want
 * to trigger a refetch (e.g., during sign-out).
 *
 * @param {QueryClient} client - QueryClient instance (defaults to singleton)
 *
 * @example
 * // On sign-out
 * clearEntriesCache();
 * // User's data is removed from cache
 */
export function clearEntriesCache(client = queryClient) {
  if (import.meta.env.DEV) {
    console.log('QueryClient: Clearing all entries cache');
  }

  // Remove all queries under 'entries' key
  client.removeQueries({ queryKey: ENTRIES_QUERY_KEYS.all });

  if (import.meta.env.DEV) {
    console.log('QueryClient: Entries cache cleared');
  }
}

/**
 * Invalidate migration status cache and force refetch
 *
 * Call this after migration status changes to ensure UI reflects
 * the current migration state.
 *
 * @param {QueryClient} client - QueryClient instance (defaults to singleton)
 * @param {string} userId - User ID to invalidate status for
 * @returns {Promise<void>}
 *
 * @example
 * // After migration completes or is cancelled
 * await invalidateMigrationStatus(queryClient, userId);
 */
export async function invalidateMigrationStatus(client = queryClient, userId) {
  if (!userId) {
    if (import.meta.env.DEV) {
      console.warn('QueryClient: Cannot invalidate migration status without userId');
    }
    return;
  }

  if (import.meta.env.DEV) {
    console.log('QueryClient: Invalidating migration status for user:', userId);
  }

  await client.invalidateQueries({
    queryKey: ENTRIES_QUERY_KEYS.migrationStatus(userId),
  });

  if (import.meta.env.DEV) {
    console.log('QueryClient: Migration status cache invalidated');
  }
}

/**
 * Clear all user-specific cache data
 *
 * Use this on sign-out to remove all user data from cache,
 * including entries and migration status.
 *
 * @param {QueryClient} client - QueryClient instance (defaults to singleton)
 *
 * @example
 * // On sign-out
 * clearAllUserCache();
 */
export function clearAllUserCache(client = queryClient) {
  if (import.meta.env.DEV) {
    console.log('QueryClient: Clearing all user cache');
  }

  // Clear entries
  client.removeQueries({ queryKey: ENTRIES_QUERY_KEYS.all });

  // Clear migration status
  client.removeQueries({ queryKey: ['migration'] });

  if (import.meta.env.DEV) {
    console.log('QueryClient: All user cache cleared');
  }
}

/**
 * Set query data directly (for optimistic updates during migration)
 *
 * Use this to show migration progress optimistically while the
 * actual migration is happening in the background.
 *
 * @param {QueryClient} client - QueryClient instance
 * @param {Array} queryKey - Query key to update
 * @param {*} data - Data to set
 *
 * @example
 * // During migration progress
 * setQueryData(queryClient, ['migration', 'progress'], { percent: 50 });
 */
export function setQueryData(client, queryKey, data) {
  client.setQueryData(queryKey, data);
}
