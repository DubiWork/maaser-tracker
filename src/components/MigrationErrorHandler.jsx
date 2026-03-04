/**
 * MigrationErrorHandler Component
 *
 * Displays migration errors with user-friendly messages and retry capabilities.
 * Implements comprehensive error handling for the migration process from
 * IndexedDB to Firestore.
 *
 * Features:
 * - User-friendly error messages (non-technical language)
 * - Different error types (network, quota, auth, unknown)
 * - Retry capabilities for retryable errors
 * - Full bilingual support (Hebrew RTL / English LTR)
 * - Accessible (ARIA, keyboard navigation, focus management)
 * - Always reassures user their data is safe
 *
 * Error Types Handled:
 * 1. Network errors - retryable, shows "Try Now" button
 * 2. Quota errors - not retryable, shows wait time (1 hour)
 * 3. Auth errors - requires re-sign-in
 * 4. Unknown errors - retryable once, shows error code for support
 * 5. Partial success - shows completion percentage and failed count
 *
 * @module MigrationErrorHandler
 */

import { memo, useCallback, useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Alert,
  Box,
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoginIcon from '@mui/icons-material/Login';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ContactSupportIcon from '@mui/icons-material/ContactSupport';
import { useLanguage } from '../contexts/useLanguage';
import { NetworkErrorTypes } from '../services/networkMonitor';

// Constants
const SUPPORT_EMAIL = 'support@maaser-tracker.app';
const QUOTA_WAIT_TIME_HOURS = 1;

/**
 * Error type classification for UI rendering (internal only)
 * @constant
 */
const ErrorTypes = {
  NETWORK: 'network',
  QUOTA: 'quota',
  AUTH: 'auth',
  UNKNOWN: 'unknown',
  PARTIAL_SUCCESS: 'partial-success',
};

/**
 * Classify error based on error code
 * @param {Object} error - Error object with code property
 * @returns {string} Error type constant
 */
function classifyErrorType(error) {
  if (!error || !error.code) {
    return ErrorTypes.UNKNOWN;
  }

  const code = error.code.toLowerCase();

  // Network errors
  if (
    code.includes('network') ||
    code.includes('offline') ||
    code === NetworkErrorTypes.NETWORK
  ) {
    return ErrorTypes.NETWORK;
  }

  // Quota errors
  if (
    code.includes('quota') ||
    code.includes('resource-exhausted') ||
    code === NetworkErrorTypes.QUOTA
  ) {
    return ErrorTypes.QUOTA;
  }

  // Auth errors
  if (
    code.includes('auth') ||
    code.includes('permission') ||
    code.includes('unauthorized') ||
    code.includes('unauthenticated') ||
    code === NetworkErrorTypes.AUTH
  ) {
    return ErrorTypes.AUTH;
  }

  // Partial success
  if (code.includes('partial')) {
    return ErrorTypes.PARTIAL_SUCCESS;
  }

  return ErrorTypes.UNKNOWN;
}

/**
 * Get error icon based on error type
 * @param {string} errorType - Error type constant
 * @returns {React.Element} Icon component
 */
function getErrorIcon(errorType) {
  switch (errorType) {
    case ErrorTypes.NETWORK:
      return <WifiOffIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />;
    case ErrorTypes.QUOTA:
      return <AccessTimeIcon sx={{ fontSize: 48, color: 'warning.main', mb: 1 }} />;
    case ErrorTypes.AUTH:
      return <LoginIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />;
    case ErrorTypes.PARTIAL_SUCCESS:
      return <CheckCircleOutlineIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />;
    case ErrorTypes.UNKNOWN:
    default:
      return <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />;
  }
}

/**
 * Get alert severity based on error type
 * @param {string} errorType - Error type constant
 * @returns {string} MUI Alert severity
 */
function getAlertSeverity(errorType) {
  switch (errorType) {
    case ErrorTypes.NETWORK:
    case ErrorTypes.QUOTA:
      return 'warning';
    case ErrorTypes.PARTIAL_SUCCESS:
      return 'success';
    case ErrorTypes.AUTH:
    case ErrorTypes.UNKNOWN:
    default:
      return 'error';
  }
}

/**
 * MigrationErrorHandler Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.error - Error object with code, message, messageKey, timestamp, context
 * @param {Function} props.onRetry - Callback when retry is clicked
 * @param {Function} props.onDismiss - Callback when dismiss is clicked
 * @param {boolean} [props.canRetry=true] - Whether retry is allowed
 * @param {Function} [props.onSignIn] - Callback when sign-in is clicked (for auth errors)
 * @param {Function} [props.onContactSupport] - Callback when contact support is clicked
 */
function MigrationErrorHandler({
  error,
  onRetry,
  onDismiss,
  canRetry = true,
  onSignIn,
  onContactSupport,
}) {
  const { t, direction } = useLanguage();
  const retryButtonRef = useRef(null);
  const dialogRef = useRef(null);

  // Get translation helpers - memoized to avoid unnecessary re-renders
  const migrationT = useMemo(() => t.migration || {}, [t.migration]);
  const errorsT = useMemo(() => migrationT.errors || {}, [migrationT.errors]);

  // Classify error type
  const errorType = classifyErrorType(error);

  // Get localized error message
  const getErrorMessage = useCallback(() => {
    if (!error) {
      return errorsT.unknown || 'Something went wrong. Your data is safe. If this continues, contact support.';
    }

    // Check if error has a messageKey and translation exists
    if (error.messageKey) {
      const keyParts = error.messageKey.split('.');
      const lastKey = keyParts[keyParts.length - 1];
      if (errorsT[lastKey]) {
        return errorsT[lastKey];
      }
    }

    // Fallback based on error type
    switch (errorType) {
      case ErrorTypes.NETWORK:
        return errorsT.networkFailure || "Migration paused. We'll continue automatically when you're back online.";
      case ErrorTypes.QUOTA:
        return errorsT.quotaExceeded || 'Cloud storage temporarily full. Your data is safe. Try again in 1 hour.';
      case ErrorTypes.AUTH:
        return errorsT.authExpired || 'Sign-in expired. Please sign in again to continue syncing.';
      case ErrorTypes.PARTIAL_SUCCESS:
        // Format partial success message with context
        if (error.context) {
          const { percent, failed, success } = error.context;
          return (errorsT.partialSuccess || 'Migration completed at {percent}%. {failed} entries failed.')
            .replace('{percent}', percent || 0)
            .replace('{failed}', failed || 0)
            .replace('{success}', success || 0);
        }
        return errorsT.unknown || 'Migration completed with some errors.';
      case ErrorTypes.UNKNOWN:
      default:
        return errorsT.unknown || 'Something went wrong. Your data is safe. If this continues, contact support.';
    }
  }, [error, errorType, errorsT]);

  // Get dialog title based on error type
  const getDialogTitle = useCallback(() => {
    switch (errorType) {
      case ErrorTypes.NETWORK:
        return errorsT.pausedTitle || 'Migration Paused';
      case ErrorTypes.QUOTA:
        return errorsT.quotaTitle || 'Please Wait';
      case ErrorTypes.AUTH:
        return errorsT.authTitle || 'Sign-In Required';
      case ErrorTypes.PARTIAL_SUCCESS:
        return migrationT.success?.partial || 'Migration Partially Complete';
      case ErrorTypes.UNKNOWN:
      default:
        return errorsT.title || 'Migration Issue';
    }
  }, [errorType, errorsT, migrationT]);

  // Focus management - focus retry button when dialog opens
  useEffect(() => {
    if (error && retryButtonRef.current) {
      // Delay focus to allow dialog animation
      const timeoutId = setTimeout(() => {
        retryButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [error]);

  // Keyboard handler for escape and enter
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onDismiss?.();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // Determine default action based on error type
      if (errorType === ErrorTypes.AUTH) {
        onSignIn?.();
      } else if (canRetry && errorType !== ErrorTypes.QUOTA) {
        onRetry?.();
      } else {
        onDismiss?.();
      }
    }
  }, [errorType, canRetry, onRetry, onDismiss, onSignIn]);

  // Handle retry click
  const handleRetry = useCallback(() => {
    onRetry?.();
  }, [onRetry]);

  // Handle dismiss click
  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  // Handle sign in click
  const handleSignIn = useCallback(() => {
    onSignIn?.();
  }, [onSignIn]);

  // Handle contact support click
  const handleContactSupport = useCallback(() => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      // Default: open email client
      window.open(`mailto:${SUPPORT_EMAIL}?subject=Migration Error&body=Error Code: ${error?.code || 'unknown'}`, '_blank');
    }
  }, [error?.code, onContactSupport]);

  // Don't render if no error
  if (!error) {
    return null;
  }

  // Determine if retry should be disabled
  const isRetryDisabled = !canRetry || errorType === ErrorTypes.QUOTA;

  // Render action buttons based on error type
  const renderActions = () => {
    switch (errorType) {
      case ErrorTypes.NETWORK:
        return (
          <>
            <Button
              onClick={handleDismiss}
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              {t.ok || 'OK'}
            </Button>
            <Button
              ref={retryButtonRef}
              onClick={handleRetry}
              variant="contained"
              disabled={isRetryDisabled}
              startIcon={<RefreshIcon />}
              sx={{ textTransform: 'none' }}
            >
              {t.tryNow || 'Try Now'}
            </Button>
          </>
        );

      case ErrorTypes.QUOTA:
        return (
          <>
            <Button
              onClick={handleDismiss}
              variant="contained"
              sx={{ textTransform: 'none' }}
              ref={retryButtonRef}
            >
              {errorsT.tryLater || 'Try Later'}
            </Button>
          </>
        );

      case ErrorTypes.AUTH:
        return (
          <Button
            ref={retryButtonRef}
            onClick={handleSignIn}
            variant="contained"
            startIcon={<LoginIcon />}
            sx={{ textTransform: 'none' }}
          >
            {errorsT.signInAgain || t.signIn || 'Sign In Again'}
          </Button>
        );

      case ErrorTypes.PARTIAL_SUCCESS:
        return (
          <>
            <Button
              onClick={handleDismiss}
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              {t.continue || 'Continue'}
            </Button>
            <Button
              ref={retryButtonRef}
              onClick={handleRetry}
              variant="contained"
              disabled={isRetryDisabled}
              startIcon={<RefreshIcon />}
              sx={{ textTransform: 'none' }}
            >
              {t.retryFailed || 'Retry Failed'}
            </Button>
          </>
        );

      case ErrorTypes.UNKNOWN:
      default:
        return (
          <>
            <Button
              onClick={handleContactSupport}
              color="inherit"
              startIcon={<ContactSupportIcon />}
              sx={{ textTransform: 'none' }}
            >
              {t.contactSupport || 'Contact Support'}
            </Button>
            <Button
              ref={retryButtonRef}
              onClick={handleRetry}
              variant="contained"
              disabled={isRetryDisabled}
              startIcon={<RefreshIcon />}
              sx={{ textTransform: 'none' }}
            >
              {t.tryAgain || 'Try Again'}
            </Button>
          </>
        );
    }
  };

  return (
    <Dialog
      open={Boolean(error)}
      onClose={handleDismiss}
      onKeyDown={handleKeyDown}
      maxWidth="xs"
      fullWidth
      dir={direction}
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby="migration-error-title"
      aria-describedby="migration-error-description"
    >
      <DialogTitle
        id="migration-error-title"
        sx={{ textAlign: 'center', pb: 1 }}
      >
        {getErrorIcon(errorType)}
        <Typography variant="h6" component="div">
          {getDialogTitle()}
        </Typography>
      </DialogTitle>

      <DialogContent id="migration-error-description" sx={{ textAlign: 'center' }}>
        {/* Error message alert */}
        <Alert
          severity={getAlertSeverity(errorType)}
          sx={{ mb: 2, textAlign: direction === 'rtl' ? 'right' : 'left' }}
          aria-live="assertive"
        >
          {getErrorMessage()}
        </Alert>

        {/* Wait time for quota errors */}
        {errorType === ErrorTypes.QUOTA && (
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <AccessTimeIcon color="action" fontSize="small" />
            <Typography variant="body2" color="text.secondary">
              {(t.waitTime || 'Estimated wait time: {hours} hour(s)').replace('{hours}', QUOTA_WAIT_TIME_HOURS)}
            </Typography>
          </Box>
        )}

        {/* Error code for support reference (unknown errors only) */}
        {errorType === ErrorTypes.UNKNOWN && error?.code && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 2, fontFamily: 'monospace' }}
          >
            {t.errorCode || 'Error code'}: {error.code}
          </Typography>
        )}

        {/* Data safe reassurance message */}
        <Typography variant="body2" color="text.secondary">
          {errorsT.dataSafe || 'Your local data is safe and unchanged.'}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
        {renderActions()}
      </DialogActions>
    </Dialog>
  );
}

MigrationErrorHandler.propTypes = {
  error: PropTypes.shape({
    code: PropTypes.string,
    message: PropTypes.string,
    messageKey: PropTypes.string,
    timestamp: PropTypes.instanceOf(Date),
    context: PropTypes.shape({
      percent: PropTypes.number,
      failed: PropTypes.number,
      success: PropTypes.number,
    }),
  }),
  onRetry: PropTypes.func.isRequired,
  onDismiss: PropTypes.func.isRequired,
  canRetry: PropTypes.bool,
  onSignIn: PropTypes.func,
  onContactSupport: PropTypes.func,
};

export default memo(MigrationErrorHandler);
