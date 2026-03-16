/**
 * React Query Hooks for Preset Service
 *
 * Provides hooks for reading and mutating note presets stored in IndexedDB.
 * All mutations invalidate the presets query cache so UI stays in sync.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPresetsByType,
  addPreset,
  updatePreset,
  deletePreset,
  reorderPresets,
} from '../services/presetService';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const presetQueryKeys = {
  all: ['presets'],
  lists: () => [...presetQueryKeys.all, 'list'],
  byType: (type) => [...presetQueryKeys.lists(), type],
};

// ─── Query Hooks ──────────────────────────────────────────────────────────────

/**
 * Hook to fetch all presets for a given type, sorted by order.
 *
 * @param {string|null} type - 'income' | 'donation' | null (disabled when null)
 * @returns {Object} React Query result with presets data
 *
 * @example
 * const { data: presets, isLoading } = usePresets('income');
 */
export function usePresets(type) {
  return useQuery({
    queryKey: presetQueryKeys.byType(type),
    queryFn: () => getPresetsByType(type),
    enabled: !!type,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,   // 10 minutes
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

/**
 * Hook to add a new preset.
 *
 * @returns {Object} Mutation object — call `mutate({ text, type })` or `mutateAsync`
 *
 * @example
 * const addPresetMutation = useAddPreset();
 * addPresetMutation.mutate({ text: 'Consulting', type: 'income' });
 */
export function useAddPreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ text, type }) => addPreset(text, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presetQueryKeys.all });
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('useAddPreset: Failed to add preset', error);
      }
    },
  });
}

/**
 * Hook to update an existing preset.
 *
 * @returns {Object} Mutation object — call `mutate({ id, updates })` or `mutateAsync`
 *
 * @example
 * const updatePresetMutation = useUpdatePreset();
 * updatePresetMutation.mutate({ id: 1, updates: { text: 'New Label' } });
 */
export function useUpdatePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }) => updatePreset(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presetQueryKeys.all });
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('useUpdatePreset: Failed to update preset', error);
      }
    },
  });
}

/**
 * Hook to delete a preset by id.
 *
 * @returns {Object} Mutation object — call `mutate(id)` or `mutateAsync(id)`
 *
 * @example
 * const deletePresetMutation = useDeletePreset();
 * deletePresetMutation.mutate(1);
 */
export function useDeletePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deletePreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presetQueryKeys.all });
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('useDeletePreset: Failed to delete preset', error);
      }
    },
  });
}

/**
 * Hook to reorder presets.
 *
 * @returns {Object} Mutation object — call `mutate(presetIds)` or `mutateAsync(presetIds)`
 *
 * @example
 * const reorderPresetsMutation = useReorderPresets();
 * reorderPresetsMutation.mutate([3, 1, 2]); // Sets order: 3→0, 1→1, 2→2
 */
export function useReorderPresets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (presetIds) => reorderPresets(presetIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: presetQueryKeys.all });
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.error('useReorderPresets: Failed to reorder presets', error);
      }
    },
  });
}
