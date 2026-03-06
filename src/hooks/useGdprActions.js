import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exportUserData, deleteAllCloudData } from '../services/gdprDataService';
import { useClearEntriesCache } from './useEntries';
import { migrationQueryKeys } from './useMigration';
import { getCurrentUserId, isAuthenticated } from '../lib/firebase';

/**
 * Hook providing GDPR data management actions (export + delete).
 *
 * Wraps gdprDataService functions as React Query mutations with
 * automatic cache invalidation after delete.
 *
 * @returns {Object} Export and delete mutations with state helpers
 */
export function useGdprActions() {
  const queryClient = useQueryClient();
  const clearEntriesCache = useClearEntriesCache();

  // --- Export mutation ---
  const exportMutation = useMutation({
    mutationFn: () => {
      const userId = getCurrentUserId();
      if (!userId || !isAuthenticated()) {
        throw new Error('User must be signed in to export data');
      }
      return exportUserData(userId);
    },
    onSuccess: (data) => {
      // Trigger browser download of JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const filename = `maaser-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (import.meta.env.DEV) {
        console.log('useGdprActions: Export downloaded', filename);
      }
    },
  });

  // --- Delete mutation ---
  const deleteMutation = useMutation({
    mutationFn: () => {
      const userId = getCurrentUserId();
      if (!userId || !isAuthenticated()) {
        throw new Error('User must be signed in to delete data');
      }
      return deleteAllCloudData(userId);
    },
    onSuccess: () => {
      // Clear all cached entries and migration status
      clearEntriesCache();

      // Also invalidate migration status so UI reflects reset state
      const userId = getCurrentUserId();
      if (userId) {
        queryClient.invalidateQueries({
          queryKey: migrationQueryKeys.status(userId),
        });
      }

      if (import.meta.env.DEV) {
        console.log('useGdprActions: Cloud data deleted, caches cleared');
      }
    },
  });

  // Convenience wrappers
  const handleExport = useCallback(() => {
    exportMutation.mutate();
  }, [exportMutation]);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate();
  }, [deleteMutation]);

  return {
    // Export
    handleExport,
    isExporting: exportMutation.isPending,
    exportSuccess: exportMutation.isSuccess,
    exportError: exportMutation.error,
    resetExport: exportMutation.reset,

    // Delete
    handleDelete,
    isDeleting: deleteMutation.isPending,
    deleteSuccess: deleteMutation.isSuccess,
    deleteError: deleteMutation.error,
    resetDelete: deleteMutation.reset,
  };
}
