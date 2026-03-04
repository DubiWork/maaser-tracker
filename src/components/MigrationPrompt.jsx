/**
 * MigrationPrompt Component
 *
 * Integrates migration logic with authentication flow, ensuring seamless UX.
 * This component triggers migration check on first sign-in and guides users
 * through the GDPR-compliant consent and migration process.
 *
 * Features:
 * - Triggers migration check on first sign-in (3-second delay)
 * - Shows GDPR-compliant consent dialog
 * - Displays migration progress with cancellation support
 * - Shows success/error states with user-friendly messages
 * - Large dataset warnings (WiFi recommendation)
 * - Full bilingual support (Hebrew RTL / English LTR)
 * - Accessible (ARIA, keyboard navigation, focus management)
 *
 * State Machine:
 * NotStarted -> ConsentPending -> (Accept) -> InProgress -> Completed
 *                             -> (Decline) -> Declined
 * InProgress -> (Network Error) -> Paused -> (Retry) -> InProgress
 * InProgress -> (Cancel) -> Cancelled
 */

import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  IconButton,
  Link,
} from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WifiIcon from '@mui/icons-material/Wifi';
import SignalWifiOffIcon from '@mui/icons-material/SignalWifiOff';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoginIcon from '@mui/icons-material/Login';
import { useLanguage } from '../contexts/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { useMigration, MigrationStatus } from '../hooks/useMigration';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getAllEntries } from '../services/db';

// Constants
const CONSENT_DELAY_MS = 3000; // 3 seconds before showing consent
const LARGE_DATASET_THRESHOLD = 250;
const VERY_LARGE_DATASET_THRESHOLD = 500;
const PRIVACY_POLICY_URL = 'https://github.com/DubiWork/maaser-tracker/blob/main/docs/PRIVACY_POLICY.md';
const CONSENT_VERSION = '1.0';

/**
 * Migration prompt states (internal)
 * @constant
 */
const PromptState = {
  HIDDEN: 'hidden',
  CHECKING: 'checking',
  CONSENT: 'consent',
  PROGRESS: 'progress',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  CANCEL_CONFIRM: 'cancel-confirm',
};

/**
 * Estimate migration time based on entry count
 * @param {number} count - Number of entries
 * @returns {number} Estimated time in seconds
 */
function estimateMigrationTime(count) {
  // Roughly 100ms per entry (conservative estimate)
  return Math.ceil(count * 0.1);
}

/**
 * Estimate data size in KB
 * @param {number} count - Number of entries
 * @returns {number} Estimated size in KB
 */
function estimateDataSize(count) {
  // Average entry is about 500 bytes
  return Math.ceil((count * 500) / 1024);
}

/**
 * Format time in human-readable format
 * @param {number} seconds - Time in seconds
 * @param {Object} t - Translation object
 * @returns {string} Formatted time string
 */
function formatTime(seconds, t) {
  if (seconds < 60) {
    return `${seconds} ${t.migration?.seconds || 'seconds'}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${t.migration?.minutes || 'minutes'}`;
}

/**
 * MigrationPrompt Component
 *
 * @param {Object} props - Component props
 * @param {boolean} [props.autoTrigger=true] - Whether to auto-trigger on first sign-in
 * @param {function} [props.onComplete] - Callback when migration completes
 * @param {function} [props.onCancel] - Callback when migration is cancelled
 */
function MigrationPrompt({ autoTrigger = true, onComplete, onCancel }) {
  const { t, direction } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const { isOnline } = useOnlineStatus();

  const {
    status: migrationStatus,
    progress,
    errors,
    canRetry,
    startMigration,
    cancelMigration,
    retryMigration,
    isInProgress,
    isCompleted,
    isPaused,
    isFailed,
  } = useMigration(user?.uid);

  // Local state - user-driven state only
  const [userPromptState, setUserPromptState] = useState(PromptState.HIDDEN);
  const [localEntryCount, setLocalEntryCount] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Refs for tracking (to avoid setState in effects)
  const hasCompletedCallbackRef = useRef(false);
  const hasCancelledCallbackRef = useRef(false);
  const prevIsCompletedRef = useRef(isCompleted);
  const prevMigrationStatusRef = useRef(migrationStatus);
  const hasCheckedFirstSignInRef = useRef(false);

  // Derive effective prompt state from migration status and user state
  // This avoids setState in useEffect
  const promptState = useMemo(() => {
    // User-driven states take precedence for consent dialog
    if (userPromptState === PromptState.CONSENT) {
      // But if migration is in progress, show progress
      if (isInProgress) return PromptState.PROGRESS;
      return PromptState.CONSENT;
    }

    // Migration status-driven states
    if (isInProgress) return PromptState.PROGRESS;
    if (isCompleted) return PromptState.SUCCESS;
    if (isFailed || isPaused) return PromptState.ERROR;
    if (migrationStatus === MigrationStatus.CANCELLED) return PromptState.CANCELLED;

    // Default to user-driven state
    return userPromptState;
  }, [userPromptState, isInProgress, isCompleted, isFailed, isPaused, migrationStatus]);

  // Handle callbacks after render (using layout effect pattern)
  useEffect(() => {
    // Call onComplete when transitioning to completed state
    if (isCompleted && !prevIsCompletedRef.current && !hasCompletedCallbackRef.current) {
      hasCompletedCallbackRef.current = true;
      onComplete?.();
    }
    prevIsCompletedRef.current = isCompleted;

    // Call onCancel when transitioning to cancelled state
    if (migrationStatus === MigrationStatus.CANCELLED &&
        prevMigrationStatusRef.current !== MigrationStatus.CANCELLED &&
        !hasCancelledCallbackRef.current) {
      hasCancelledCallbackRef.current = true;
      onCancel?.();
    }
    prevMigrationStatusRef.current = migrationStatus;
  }); // Intentionally no dependencies - runs after every render to catch state changes

  // Refs
  const consentTimerRef = useRef(null);
  const previousAuthStateRef = useRef(null);
  const dialogRef = useRef(null);

  // Get translations with fallbacks
  const migrationT = t.migration || {};

  // Check for local entries when component mounts or user changes
  useEffect(() => {
    async function checkLocalEntries() {
      try {
        const entries = await getAllEntries();
        setLocalEntryCount(entries.length);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('MigrationPrompt: Failed to check local entries:', error);
        }
        setLocalEntryCount(0);
      }
    }

    if (isAuthenticated) {
      checkLocalEntries();
    }
  }, [isAuthenticated]);

  // Auto-trigger migration check on first sign-in
  useEffect(() => {
    if (!autoTrigger) {
      return;
    }

    // Detect first sign-in (was not authenticated, now is)
    const wasAuthenticated = previousAuthStateRef.current;
    const isFirstSignIn = !wasAuthenticated && isAuthenticated && !hasCheckedFirstSignInRef.current;

    previousAuthStateRef.current = isAuthenticated;

    if (isFirstSignIn && localEntryCount > 0) {
      hasCheckedFirstSignInRef.current = true;

      // Show consent dialog after delay (app loads in background)
      consentTimerRef.current = setTimeout(() => {
        // Only show if migration not already completed
        if (migrationStatus !== MigrationStatus.COMPLETED &&
            migrationStatus !== MigrationStatus.CANCELLED) {
          setUserPromptState(PromptState.CONSENT);
        }
      }, CONSENT_DELAY_MS);
    }

    return () => {
      if (consentTimerRef.current) {
        clearTimeout(consentTimerRef.current);
      }
    };
  }, [autoTrigger, isAuthenticated, localEntryCount, migrationStatus]);

  // Handle consent acceptance
  const handleAccept = useCallback(async () => {
    // Record consent timestamp for GDPR compliance (Article 7)
    const consentTimestamp = new Date();
    setUserPromptState(PromptState.PROGRESS);
    await startMigration({
      consentGivenAt: consentTimestamp,
      consentVersion: CONSENT_VERSION,
    });
  }, [startMigration]);

  // Handle consent decline
  const handleDecline = useCallback(() => {
    setUserPromptState(PromptState.HIDDEN);
    onCancel?.();
  }, [onCancel]);

  // Handle cancellation request
  const handleCancelRequest = useCallback(() => {
    setShowCancelConfirm(true);
  }, []);

  // Confirm cancellation
  const handleConfirmCancel = useCallback(async () => {
    setShowCancelConfirm(false);
    await cancelMigration();
    setUserPromptState(PromptState.CANCELLED);
    onCancel?.();
  }, [cancelMigration, onCancel]);

  // Cancel the cancellation confirmation
  const handleCancelConfirmDismiss = useCallback(() => {
    setShowCancelConfirm(false);
  }, []);

  // Handle retry
  const handleRetry = useCallback(async () => {
    setUserPromptState(PromptState.PROGRESS);
    await retryMigration();
  }, [retryMigration]);

  // Handle sign in again (for auth errors)
  const handleSignInAgain = useCallback(() => {
    setUserPromptState(PromptState.HIDDEN);
    // Auth will be handled by the AuthProvider
  }, []);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setUserPromptState(PromptState.HIDDEN);
  }, []);

  // Focus trap for dialogs
  useEffect(() => {
    if (promptState !== PromptState.HIDDEN && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [promptState]);

  // Keyboard handler for escape
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      if (showCancelConfirm) {
        handleCancelConfirmDismiss();
      } else if (promptState === PromptState.CONSENT) {
        handleDecline();
      } else if (promptState === PromptState.SUCCESS ||
                 promptState === PromptState.CANCELLED ||
                 promptState === PromptState.ERROR) {
        handleDismiss();
      }
    }
  }, [promptState, showCancelConfirm, handleDecline, handleDismiss, handleCancelConfirmDismiss]);

  // Don't render if hidden or no user
  if (promptState === PromptState.HIDDEN || !isAuthenticated) {
    return null;
  }

  // Don't render if no local entries to migrate
  if (localEntryCount === 0 && promptState === PromptState.CONSENT) {
    return null;
  }

  // Determine if this is a large dataset
  const isLargeDataset = localEntryCount >= LARGE_DATASET_THRESHOLD;
  const isVeryLargeDataset = localEntryCount >= VERY_LARGE_DATASET_THRESHOLD;
  const estimatedTime = estimateMigrationTime(localEntryCount);
  const estimatedSize = estimateDataSize(localEntryCount);

  // Get error message key
  const getErrorMessage = () => {
    if (errors.length === 0) {
      return migrationT.errors?.unknown || t.errorMessage || 'Something went wrong. Your data is safe.';
    }
    const error = errors[0];
    if (error.messageKey && migrationT.errors?.[error.messageKey.split('.').pop()]) {
      return migrationT.errors[error.messageKey.split('.').pop()];
    }
    // Fallback error messages
    switch (error.code) {
      case 'network-error':
      case 'migration/network-error':
        return migrationT.errors?.networkFailure || "Migration paused. We'll continue automatically when you're back online.";
      case 'auth-error':
      case 'migration/auth-error':
        return migrationT.errors?.authExpired || 'Sign-in expired. Please sign in again to continue syncing.';
      case 'quota-error':
      case 'migration/quota-error':
        return migrationT.errors?.quotaExceeded || 'Cloud storage temporarily full. Your data is safe. Try again in 1 hour.';
      default:
        return migrationT.errors?.unknown || 'Something went wrong. Your data is safe. If this continues, contact support.';
    }
  };

  // Determine error action
  const getErrorAction = () => {
    if (errors.length === 0) return 'retry';
    const error = errors[0];
    if (error.code === 'auth-error' || error.code === 'migration/auth-error') {
      return 'sign-in';
    }
    if (error.code === 'quota-error' || error.code === 'migration/quota-error') {
      return 'wait';
    }
    return 'retry';
  };

  return (
    <>
      {/* Consent Dialog */}
      <Dialog
        open={promptState === PromptState.CONSENT}
        onClose={handleDecline}
        onKeyDown={handleKeyDown}
        maxWidth="sm"
        fullWidth
        dir={direction}
        ref={dialogRef}
        aria-labelledby="migration-consent-title"
        aria-describedby="migration-consent-description"
      >
        <DialogTitle id="migration-consent-title" sx={{ textAlign: 'center', pb: 1 }}>
          <CloudSyncIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" component="div">
            {migrationT.consent?.title || t.syncToCloud || 'Sync Your Data to Cloud?'}
          </Typography>
        </DialogTitle>

        <DialogContent id="migration-consent-description">
          {/* Entry count info */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1, color: 'primary.contrastText' }}>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {migrationT.consent?.body?.replace('{count}', localEntryCount) ||
               `We'll upload ${localEntryCount} entries to Firebase so you can access them from any device.`}
            </Typography>
          </Box>

          {/* Large dataset warning */}
          {isLargeDataset && (
            <Alert
              severity={isVeryLargeDataset ? 'warning' : 'info'}
              icon={<WifiIcon />}
              sx={{ mb: 2 }}
            >
              {isVeryLargeDataset
                ? (migrationT.warnings?.veryLarge?.replace('{count}', localEntryCount) ||
                   `You have ${localEntryCount} entries! This will take several minutes. Strongly recommended: WiFi, full battery, keep app open.`)
                : (migrationT.warnings?.large?.replace('{count}', localEntryCount).replace('{size}', estimatedSize).replace('{time}', estimatedTime) ||
                   `You have ${localEntryCount} entries (${estimatedSize} KB). Migration will take about ${estimatedTime} seconds. WiFi recommended.`)}
            </Alert>
          )}

          {/* Not on WiFi warning */}
          {!isOnline && (
            <Alert severity="error" icon={<SignalWifiOffIcon />} sx={{ mb: 2 }}>
              {migrationT.errors?.offline || "You're offline. Please connect to the internet to sync your data."}
            </Alert>
          )}

          {/* What data will be processed */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
            {migrationT.consent?.whatData || 'What data will be processed?'}
          </Typography>
          <List dense disablePadding>
            <ListItem disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <StorageIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={migrationT.consent?.dataAmounts || 'Amounts, dates, descriptions'}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>

          {/* Where is it stored */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
            {migrationT.consent?.whereStored || 'Where will it be stored?'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {migrationT.consent?.storageLocation || 'Google Cloud (Firebase) - United States'}
          </Typography>

          {/* Your rights */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
            {migrationT.consent?.yourRights || 'Your rights:'}
          </Typography>
          <List dense disablePadding>
            <ListItem disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CloseIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={migrationT.consent?.rightCancel || 'Cancel migration anytime'}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <DeleteOutlineIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={migrationT.consent?.rightDelete || 'Delete all cloud data'}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem disableGutters sx={{ py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <SecurityIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={migrationT.consent?.rightBackup || '90-day local backup'}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>

          <Divider sx={{ my: 2 }} />

          {/* Privacy policy link */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            <Link
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ textDecoration: 'underline' }}
            >
              {migrationT.consent?.privacyPolicy || 'Privacy Policy'}
            </Link>
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            onClick={handleDecline}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            {migrationT.consent?.decline || t.keepLocalOnly || 'Keep Local Only'}
          </Button>
          <Button
            onClick={handleAccept}
            variant="contained"
            disabled={!isOnline}
            startIcon={<CloudSyncIcon />}
            sx={{ textTransform: 'none' }}
          >
            {migrationT.consent?.accept || t.syncToCloud || 'Sync to Cloud'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Progress Dialog */}
      <Dialog
        open={promptState === PromptState.PROGRESS}
        maxWidth="xs"
        fullWidth
        dir={direction}
        aria-labelledby="migration-progress-title"
        aria-describedby="migration-progress-description"
        disableEscapeKeyDown
      >
        <DialogTitle id="migration-progress-title" sx={{ textAlign: 'center', pb: 1 }}>
          <CloudSyncIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" component="div">
            {migrationT.progress?.title || 'Syncing Your Data'}
          </Typography>
        </DialogTitle>

        <DialogContent id="migration-progress-description">
          {/* Progress bar */}
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={progress.percentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, textAlign: 'center' }}
              aria-live="polite"
            >
              {migrationT.progress?.inProgress?.replace('{completed}', progress.completed).replace('{total}', progress.total) ||
               `Migrating ${progress.completed} of ${progress.total} entries...`}
            </Typography>
          </Box>

          {/* Estimated time remaining */}
          {progress.total > 0 && progress.completed < progress.total && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
              {migrationT.progress?.estimatedTime?.replace('{time}', formatTime(Math.ceil((progress.total - progress.completed) * 0.1), t)) ||
               `Estimated time: ${formatTime(Math.ceil((progress.total - progress.completed) * 0.1), t)}`}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={handleCancelRequest}
            color="error"
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            {t.cancel || 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={showCancelConfirm}
        onClose={handleCancelConfirmDismiss}
        onKeyDown={handleKeyDown}
        maxWidth="xs"
        fullWidth
        dir={direction}
        aria-labelledby="cancel-confirm-title"
      >
        <DialogTitle id="cancel-confirm-title">
          {migrationT.cancel?.confirmTitle || 'Cancel Migration?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {migrationT.cancel?.confirmMessage ||
             'Are you sure you want to cancel? Your local data will remain safe, but cloud sync will be stopped.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirmDismiss} sx={{ textTransform: 'none' }}>
            {migrationT.cancel?.continueSync || 'Continue Syncing'}
          </Button>
          <Button onClick={handleConfirmCancel} color="error" sx={{ textTransform: 'none' }}>
            {migrationT.cancel?.confirm || 'Yes, Cancel'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={promptState === PromptState.SUCCESS}
        onClose={handleDismiss}
        onKeyDown={handleKeyDown}
        maxWidth="xs"
        fullWidth
        dir={direction}
        aria-labelledby="migration-success-title"
      >
        <DialogTitle id="migration-success-title" sx={{ textAlign: 'center', pb: 1 }}>
          <CelebrationIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
          <Typography variant="h6" component="div">
            {migrationT.success?.title || 'Sync Complete!'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center' }}>
          <CloudDoneIcon sx={{ fontSize: 64, color: 'success.light', mb: 2 }} />
          <Typography variant="body1" sx={{ mb: 1 }}>
            {migrationT.success?.complete?.replace('{count}', progress.total) ||
             `${progress.total} entries synced successfully!`}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {migrationT.success?.message || 'Your data is now available on all your devices.'}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={handleDismiss}
            variant="contained"
            color="success"
            sx={{ textTransform: 'none' }}
          >
            {t.gotIt || 'Got it'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog
        open={promptState === PromptState.ERROR}
        onClose={handleDismiss}
        onKeyDown={handleKeyDown}
        maxWidth="xs"
        fullWidth
        dir={direction}
        aria-labelledby="migration-error-title"
      >
        <DialogTitle id="migration-error-title" sx={{ textAlign: 'center', pb: 1 }}>
          <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
          <Typography variant="h6" component="div">
            {isPaused
              ? (migrationT.errors?.pausedTitle || 'Migration Paused')
              : (migrationT.errors?.title || 'Migration Issue')}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center' }}>
          <Alert severity={isPaused ? 'warning' : 'error'} sx={{ mb: 2, textAlign: direction === 'rtl' ? 'right' : 'left' }}>
            {getErrorMessage()}
          </Alert>

          {/* Reassurance message */}
          <Typography variant="body2" color="text.secondary">
            {migrationT.errors?.dataSafe || 'Your local data is safe and unchanged.'}
          </Typography>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          {getErrorAction() === 'sign-in' ? (
            <Button
              onClick={handleSignInAgain}
              variant="contained"
              startIcon={<LoginIcon />}
              sx={{ textTransform: 'none' }}
            >
              {migrationT.errors?.signInAgain || t.signIn || 'Sign In Again'}
            </Button>
          ) : getErrorAction() === 'wait' ? (
            <Button
              onClick={handleDismiss}
              variant="contained"
              sx={{ textTransform: 'none' }}
            >
              {migrationT.errors?.tryLater || 'Try Later'}
            </Button>
          ) : (
            <>
              <Button
                onClick={handleDismiss}
                color="inherit"
                sx={{ textTransform: 'none' }}
              >
                {t.cancel || 'Cancel'}
              </Button>
              <Button
                onClick={handleRetry}
                variant="contained"
                disabled={!canRetry || !isOnline}
                startIcon={<RefreshIcon />}
                sx={{ textTransform: 'none' }}
              >
                {t.tryAgain || 'Try Again'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Cancelled Dialog */}
      <Dialog
        open={promptState === PromptState.CANCELLED}
        onClose={handleDismiss}
        onKeyDown={handleKeyDown}
        maxWidth="xs"
        fullWidth
        dir={direction}
        aria-labelledby="migration-cancelled-title"
      >
        <DialogTitle id="migration-cancelled-title" sx={{ textAlign: 'center', pb: 1 }}>
          <StorageIcon sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
          <Typography variant="h6" component="div">
            {migrationT.cancelled?.title || 'Migration Cancelled'}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {migrationT.cancelled?.message ||
             'Migration cancelled. Your data remains stored only on this device.'}
          </Typography>

          {/* 90-day backup notice */}
          <Alert severity="info" sx={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
            {migrationT.cancelled?.backupNotice ||
             'Local backup will be kept for 90 days for safety. You can delete it anytime in Settings.'}
          </Alert>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
          <Button
            onClick={handleDismiss}
            variant="contained"
            sx={{ textTransform: 'none' }}
          >
            {t.gotIt || 'Got it'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default memo(MigrationPrompt);
