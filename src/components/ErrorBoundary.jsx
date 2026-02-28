import { Component } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import { ErrorOutline, Refresh } from '@mui/icons-material';

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in the component tree and displays
 * a fallback UI with options to recover.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback, t } = this.props;

      // If custom fallback provided, use it
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default',
          }}
        >
          <Card sx={{ maxWidth: 400, width: '100%' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ErrorOutline
                sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                {t?.errorOccurred || 'Something went wrong'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {t?.errorMessage || 'An unexpected error occurred. Please try again.'}
              </Typography>

              {import.meta.env.DEV && this.state.error && (
                <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                  <AlertTitle>Error Details</AlertTitle>
                  <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {this.state.error.toString()}
                  </Typography>
                </Alert>
              )}

              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRetry}
                fullWidth
              >
                {t?.tryAgain || 'Try Again'}
              </Button>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * IndexedDB Unavailable Error Component
 * Shows when IndexedDB is not supported in the browser
 */
export function IndexedDBUnavailable({ t }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <ErrorOutline
            sx={{ fontSize: 64, color: 'warning.main', mb: 2 }}
          />
          <Typography variant="h5" gutterBottom>
            {t?.browserNotSupported || 'Browser Not Supported'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t?.indexedDBRequired || 'This app requires IndexedDB which is not available in your browser.'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t?.useSupportedBrowser || 'Please use a modern browser like Chrome, Firefox, Safari, or Edge.'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * Migration Error Component
 * Shows when data migration from LocalStorage fails
 */
export function MigrationError({ t, error, onRetry, onBackup }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <ErrorOutline
            sx={{ fontSize: 64, color: 'error.main', mb: 2 }}
          />
          <Typography variant="h5" gutterBottom>
            {t?.migrationFailed || 'Migration Failed'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t?.migrationErrorMessage || 'Failed to migrate your data to the new storage system.'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="caption">
                {error.message || error}
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={onRetry}
              fullWidth
            >
              {t?.tryAgain || 'Try Again'}
            </Button>
            {onBackup && (
              <Button
                variant="outlined"
                onClick={onBackup}
                fullWidth
              >
                {t?.downloadBackup || 'Download Backup'}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

/**
 * Loading Component
 * Shows while app is initializing
 */
export function LoadingState({ t }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Typography variant="h6" color="text.secondary">
        {t?.loading || 'Loading...'}
      </Typography>
    </Box>
  );
}
