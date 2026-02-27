/**
 * Custom React Hooks for Data Access
 *
 * These hooks integrate IndexedDB operations with React Query
 * for efficient data fetching, caching, and mutations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAllEntries,
  getEntry,
  addEntry,
  updateEntry,
  deleteEntry,
  getEntriesByDateRange,
  getEntriesByType,
} from '../services/db';

// Query Keys Factory
export const queryKeys = {
  all: ['entries'],
  lists: () => [...queryKeys.all, 'list'],
  list: (filters) => [...queryKeys.lists(), filters],
  details: () => [...queryKeys.all, 'detail'],
  detail: (id) => [...queryKeys.details(), id],
};

/**
 * Hook to fetch all entries
 * @returns {Object} Query result with entries data
 */
export function useEntries() {
  return useQuery({
    queryKey: queryKeys.lists(),
    queryFn: getAllEntries,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to fetch a single entry by ID
 * @param {string} id - Entry ID
 * @returns {Object} Query result with entry data
 */
export function useEntry(id) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => getEntry(id),
    enabled: !!id, // Only run if ID is provided
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook to fetch entries by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} options - React Query options
 * @returns {Object} Query result with filtered entries
 */
export function useEntriesByDateRange(startDate, endDate, options = {}) {
  return useQuery({
    queryKey: queryKeys.list({ dateRange: { startDate, endDate } }),
    queryFn: () => getEntriesByDateRange(startDate, endDate),
    enabled: !!(startDate && endDate), // Only run if dates are provided
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook to fetch entries by type (income or donation)
 * @param {string} type - 'income' or 'donation'
 * @param {Object} options - React Query options
 * @returns {Object} Query result with filtered entries
 */
export function useEntriesByType(type, options = {}) {
  return useQuery({
    queryKey: queryKeys.list({ type }),
    queryFn: () => getEntriesByType(type),
    enabled: !!type,
    staleTime: 1000 * 60 * 5,
    ...options,
  });
}

/**
 * Hook to add a new entry
 * @returns {Object} Mutation object with mutate function
 */
export function useAddEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addEntry,
    onSuccess: (id, newEntry) => {
      // Invalidate and refetch entries list
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });

      // Optionally set the new entry in cache
      queryClient.setQueryData(queryKeys.detail(id), newEntry);

      console.log('useAddEntry: Entry added successfully', id);
    },
    // Optimistic update for better UX
    onMutate: async (newEntry) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.lists() });

      // Snapshot previous value
      const previousEntries = queryClient.getQueryData(queryKeys.lists());

      // Optimistically update cache
      queryClient.setQueryData(queryKeys.lists(), (old) => {
        return old ? [...old, newEntry] : [newEntry];
      });

      // Return context with snapshot
      return { previousEntries };
    },
    // If mutation fails, use context to roll back
    onError: (error, newEntry, context) => {
      console.error('useAddEntry: Failed to add entry', error);
      if (context?.previousEntries) {
        queryClient.setQueryData(queryKeys.lists(), context.previousEntries);
      }
    },
  });
}

/**
 * Hook to update an existing entry
 * @returns {Object} Mutation object with mutate function
 */
export function useUpdateEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEntry,
    onSuccess: (id, updatedEntry) => {
      // Invalidate and refetch entries list
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });

      // Update the specific entry in cache
      queryClient.setQueryData(queryKeys.detail(id), updatedEntry);

      console.log('useUpdateEntry: Entry updated successfully', id);
    },
    // Optimistic update
    onMutate: async (updatedEntry) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.lists() });
      await queryClient.cancelQueries({ queryKey: queryKeys.detail(updatedEntry.id) });

      const previousEntries = queryClient.getQueryData(queryKeys.lists());
      const previousEntry = queryClient.getQueryData(queryKeys.detail(updatedEntry.id));

      // Optimistically update lists
      queryClient.setQueryData(queryKeys.lists(), (old) => {
        if (!old) return old;
        return old.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry));
      });

      // Optimistically update detail
      queryClient.setQueryData(queryKeys.detail(updatedEntry.id), updatedEntry);

      return { previousEntries, previousEntry };
    },
    onError: (error, updatedEntry, context) => {
      console.error('useUpdateEntry: Failed to update entry', error);
      if (context?.previousEntries) {
        queryClient.setQueryData(queryKeys.lists(), context.previousEntries);
      }
      if (context?.previousEntry) {
        queryClient.setQueryData(queryKeys.detail(updatedEntry.id), context.previousEntry);
      }
    },
  });
}

/**
 * Hook to delete an entry
 * @returns {Object} Mutation object with mutate function
 */
export function useDeleteEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEntry,
    onSuccess: (_, deletedId) => {
      // Invalidate and refetch entries list
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });

      // Remove the specific entry from cache
      queryClient.removeQueries({ queryKey: queryKeys.detail(deletedId) });

      console.log('useDeleteEntry: Entry deleted successfully', deletedId);
    },
    // Optimistic update
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.lists() });

      const previousEntries = queryClient.getQueryData(queryKeys.lists());

      // Optimistically remove from list
      queryClient.setQueryData(queryKeys.lists(), (old) => {
        if (!old) return old;
        return old.filter((entry) => entry.id !== deletedId);
      });

      return { previousEntries };
    },
    onError: (error, deletedId, context) => {
      console.error('useDeleteEntry: Failed to delete entry', error);
      if (context?.previousEntries) {
        queryClient.setQueryData(queryKeys.lists(), context.previousEntries);
      }
    },
  });
}

/**
 * Hook to save (add or update) an entry
 * Automatically determines whether to add or update based on entry.id
 * @returns {Object} Mutation object with mutate function
 */
export function useSaveEntry() {
  const addMutation = useAddEntry();
  const updateMutation = useUpdateEntry();

  return {
    mutate: (entry) => {
      // Check if entry exists by checking if it has an id that's not new
      const isExisting = entry.id && entry.id !== '';

      if (isExisting) {
        updateMutation.mutate(entry);
      } else {
        addMutation.mutate(entry);
      }
    },
    isLoading: addMutation.isPending || updateMutation.isPending,
    isError: addMutation.isError || updateMutation.isError,
    error: addMutation.error || updateMutation.error,
    isSuccess: addMutation.isSuccess || updateMutation.isSuccess,
  };
}
