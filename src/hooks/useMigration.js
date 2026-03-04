/**
 * Custom Hook for Migration Progress Tracking
 *
 * This hook manages the migration state from IndexedDB to Firestore,
 * providing real-time progress updates and integration with network
 * monitoring for pause/resume functionality.
 *
 * Features:
 * - Migration status management (idle, checking, in-progress, etc.)
 * - Real-time progress tracking with percentage calculation
 * - Network-aware pause/resume on connection changes
 * - Error handling with retry support
 * - Cancellation support (GDPR Article 7.3)
 *
 * @module useMigration
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkMigrationStatus } from '../services/migrationStatusService';
import {
  migrateAllEntries,
  cancelMigration,
  MigrationEngineErrorCodes,
} from '../services/migrationEngine';
import {
  isOnline,
  onConnectionChange,
  classifyError,
  NetworkErrorTypes,
} from '../services/networkMonitor';

// Constants
const MIGRATION_STATUS_QUERY_KEY = ['migration', 'status'];

/**
 * Migration status types
 * @constant
 */
export const MigrationStatus = {
  IDLE: 'idle',
  CHECKING: 'checking',
  CONSENT_PENDING: 'consent-pending',
  IN_PROGRESS: 'in-progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

/**
 * Create default progress state
 * @returns {Object} Default progress object
 */
function createDefaultProgress() {
  return {
    completed: 0,
    total: 0,
    percentage: 0,
  };
}

/**
 * Create default error state
 * @returns {Array} Empty errors array
 */
function createDefaultErrors() {
  return [];
}

/**
 * Calculate smooth percentage for progress bar
 * @param {number} completed - Completed entries
 * @param {number} total - Total entries
 * @returns {number} Percentage (0-100)
 */
function calculatePercentage(completed, total) {
  if (total === 0) return 0;
  const percentage = (completed / total) * 100;
  // Round to 1 decimal place for smooth progress
  return Math.round(percentage * 10) / 10;
}

/**
 * Map error code to user-friendly message key
 * @param {string} errorCode - Error code from migration engine
 * @returns {string} Message key for localization
 */
function getErrorMessageKey(errorCode) {
  switch (errorCode) {
    case MigrationEngineErrorCodes.NETWORK_ERROR:
    case NetworkErrorTypes.NETWORK:
      return 'migration.error.network';
    case MigrationEngineErrorCodes.QUOTA_ERROR:
    case NetworkErrorTypes.QUOTA:
      return 'migration.error.quota';
    case MigrationEngineErrorCodes.AUTH_ERROR:
    case NetworkErrorTypes.AUTH:
      return 'migration.error.auth';
    case MigrationEngineErrorCodes.ALREADY_COMPLETED:
      return 'migration.error.alreadyCompleted';
    case MigrationEngineErrorCodes.CANCELLED:
      return 'migration.error.cancelled';
    default:
      return 'migration.error.unknown';
  }
}

/**
 * Hook to manage migration progress and state
 *
 * @param {string} userId - User ID from Firebase Auth (required for migration)
 * @returns {Object} Migration state and actions
 *
 * @example
 * const {
 *   status,
 *   progress,
 *   startMigration,
 *   cancelMigration,
 *   isInProgress,
 * } = useMigration(userId);
 */
export function useMigration(userId) {
  const queryClient = useQueryClient();

  // Internal state for active migration tracking
  // Note: We use separate state for migration-initiated status changes
  // to avoid conflicts with query-derived status
  const [activeMigrationStatus, setActiveMigrationStatus] = useState(null);
  const [progress, setProgress] = useState(createDefaultProgress);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [errors, setErrors] = useState(createDefaultErrors);

  // Store consent data for passing to migration engine
  const consentDataRef = useRef(null);

  // AbortController for cancellation
  const abortControllerRef = useRef(null);

  // Track if we were paused due to network loss
  const wasPausedRef = useRef(false);

  // Query to check if already migrated
  const {
    data: migrationStatusData,
    isLoading: isCheckingStatus,
    refetch: recheckStatus,
  } = useQuery({
    queryKey: [...MIGRATION_STATUS_QUERY_KEY, userId],
    queryFn: () => checkMigrationStatus(userId),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    // Don't auto-refetch - we control when to check
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Derive status from query data and active migration status
  // Priority: activeMigrationStatus > queryData > loading state > idle
  const status = useMemo(() => {
    // If we have an active migration status (in-progress, paused, failed, cancelled from action)
    if (activeMigrationStatus !== null) {
      return activeMigrationStatus;
    }

    // If query is loading
    if (isCheckingStatus) {
      return MigrationStatus.CHECKING;
    }

    // If query has data, derive status from it
    if (migrationStatusData?.completed) {
      return MigrationStatus.COMPLETED;
    }
    if (migrationStatusData?.cancelled) {
      return MigrationStatus.CANCELLED;
    }

    // Default to idle
    return MigrationStatus.IDLE;
  }, [activeMigrationStatus, isCheckingStatus, migrationStatusData]);

  // Helper to set status (updates activeMigrationStatus)
  const setStatus = useCallback((newStatus) => {
    setActiveMigrationStatus(newStatus);
  }, []);

  // Progress callback for migration engine
  const handleProgress = useCallback((completed, total) => {
    setProgress({
      completed,
      total,
      percentage: calculatePercentage(completed, total),
    });
  }, []);

  // Batch complete callback
  const handleBatchComplete = useCallback((batchNumber) => {
    setCurrentBatch(batchNumber);
  }, []);

  // Migration mutation
  const migrationMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('User ID is required for migration');
      }

      // Create new AbortController for this migration
      abortControllerRef.current = new AbortController();

      const result = await migrateAllEntries(userId, {
        onProgress: handleProgress,
        onBatchComplete: handleBatchComplete,
        signal: abortControllerRef.current.signal,
        // Pass consent data for GDPR compliance
        consentGivenAt: consentDataRef.current?.consentGivenAt,
        consentVersion: consentDataRef.current?.consentVersion,
      });

      return result;
    },
    onMutate: () => {
      // Reset state before starting
      setErrors(createDefaultErrors());
      setProgress(createDefaultProgress());
      setCurrentBatch(0);
      setStatus(MigrationStatus.IN_PROGRESS);
    },
    onSuccess: (result) => {
      if (result.cancelled) {
        setStatus(MigrationStatus.CANCELLED);
      } else if (result.success) {
        setStatus(MigrationStatus.COMPLETED);
        // Update progress to 100%
        setProgress(prev => ({
          ...prev,
          percentage: 100,
        }));
      } else {
        // Partial success or failure
        setStatus(MigrationStatus.FAILED);
        if (result.errorCode) {
          setErrors([{
            code: result.errorCode,
            message: result.errorMessage || 'Migration failed',
            messageKey: getErrorMessageKey(result.errorCode),
            timestamp: new Date(),
          }]);
        }
      }

      // Invalidate status query to refetch
      queryClient.invalidateQueries({
        queryKey: [...MIGRATION_STATUS_QUERY_KEY, userId],
      });
    },
    onError: (error) => {
      const classification = classifyError(error);

      // Network error - pause instead of fail
      if (classification.type === NetworkErrorTypes.NETWORK && !isOnline()) {
        setStatus(MigrationStatus.PAUSED);
        wasPausedRef.current = true;
      } else {
        setStatus(MigrationStatus.FAILED);
      }

      setErrors([{
        code: error.code || 'unknown',
        message: error.message || 'An error occurred during migration',
        messageKey: getErrorMessageKey(error.code),
        timestamp: new Date(),
      }]);
    },
  });

  // Network connection change handler
  useEffect(() => {
    const unsubscribe = onConnectionChange((online) => {
      if (!online && status === MigrationStatus.IN_PROGRESS) {
        // Lost connection during migration - pause
        setStatus(MigrationStatus.PAUSED);
        wasPausedRef.current = true;

        if (import.meta.env.DEV) {
          console.log('useMigration: Paused due to network loss');
        }
      }
      // Note: We don't auto-resume on reconnect - user must manually retry
      // This is safer and gives user control
    });

    return () => {
      unsubscribe();
    };
  }, [status, setStatus]);

  // Cleanup AbortController on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Start migration action
  const startMigration = useCallback(async (consentData = {}) => {
    if (!userId) {
      setErrors([{
        code: 'no-user',
        message: 'User must be signed in to migrate data',
        messageKey: 'migration.error.auth',
        timestamp: new Date(),
      }]);
      return;
    }

    // Check if already completed
    if (migrationStatusData?.completed) {
      setStatus(MigrationStatus.COMPLETED);
      return;
    }

    // Check network status
    if (!isOnline()) {
      setStatus(MigrationStatus.PAUSED);
      setErrors([{
        code: 'offline',
        message: 'Cannot start migration while offline',
        messageKey: 'migration.error.network',
        timestamp: new Date(),
      }]);
      return;
    }

    // Store consent data for passing to migration engine (GDPR compliance)
    consentDataRef.current = {
      consentGivenAt: consentData.consentGivenAt || new Date(),
      consentVersion: consentData.consentVersion || '1.0',
    };

    // Start the mutation
    migrationMutation.mutate();
  }, [userId, migrationStatusData, migrationMutation, setStatus]);

  // Cancel migration action
  const handleCancelMigration = useCallback(async () => {
    // Abort the ongoing migration
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // If in progress, call the cancellation service
    if (status === MigrationStatus.IN_PROGRESS || status === MigrationStatus.PAUSED) {
      try {
        await cancelMigration(userId, progress.completed, 'User cancelled migration');
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('useMigration: Error during cancellation:', error);
        }
        // Don't throw - cancellation should not fail visibly
      }
    }

    setStatus(MigrationStatus.CANCELLED);
    setProgress(createDefaultProgress());
    setCurrentBatch(0);

    // Invalidate status query
    queryClient.invalidateQueries({
      queryKey: [...MIGRATION_STATUS_QUERY_KEY, userId],
    });
  }, [userId, status, progress.completed, queryClient, setStatus]);

  // Retry migration action
  const retryMigration = useCallback(async () => {
    // Clear errors before retry
    setErrors(createDefaultErrors());
    wasPausedRef.current = false;

    // Check network first
    if (!isOnline()) {
      setStatus(MigrationStatus.PAUSED);
      setErrors([{
        code: 'offline',
        message: 'Cannot retry while offline. Please check your connection.',
        messageKey: 'migration.error.network',
        timestamp: new Date(),
      }]);
      return;
    }

    // Start fresh migration
    migrationMutation.mutate();
  }, [migrationMutation, setStatus]);

  // Dismiss error action
  const dismissError = useCallback(() => {
    setErrors(createDefaultErrors());
  }, []);

  // Computed helpers
  const isInProgress = status === MigrationStatus.IN_PROGRESS;
  const isCompleted = status === MigrationStatus.COMPLETED;
  const isPaused = status === MigrationStatus.PAUSED;
  const isFailed = status === MigrationStatus.FAILED;
  const canRetry = (isFailed || isPaused) && errors.length > 0 &&
    errors[0]?.code !== MigrationEngineErrorCodes.QUOTA_ERROR;

  return {
    // State
    status,
    progress,
    currentBatch,
    errors,
    canRetry,

    // Actions
    startMigration,
    cancelMigration: handleCancelMigration,
    retryMigration,
    dismissError,
    recheckStatus,

    // Helpers
    isInProgress,
    isCompleted,
    isPaused,
    isFailed,

    // For testing
    _isCheckingStatus: isCheckingStatus,
  };
}

/**
 * Query keys for migration status
 * Exported for cache invalidation from other components
 */
export const migrationQueryKeys = {
  status: (userId) => [...MIGRATION_STATUS_QUERY_KEY, userId],
};
