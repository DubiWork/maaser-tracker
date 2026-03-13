/**
 * SignInDialog Component
 *
 * A modal dialog that explains the benefits of signing in and provides
 * a Google Sign-In button. Users can dismiss the dialog and continue
 * using the app without signing in.
 *
 * Features:
 * - Clear benefit-focused messaging
 * - Google Sign-In button
 * - "Continue without signing in" option
 * - Loading state during sign-in
 * - Error display if sign-in fails
 * - Hebrew/English bilingual support
 */

import { useState, memo, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Link,
} from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import SyncIcon from '@mui/icons-material/Sync';
import StorageIcon from '@mui/icons-material/Storage';
import LockIcon from '@mui/icons-material/Lock';
import GoogleIcon from '@mui/icons-material/Google';
import { useLanguage } from '../contexts/useLanguage';
import { useAuth } from '../hooks/useAuth';

function SignInDialog({ open, onClose }) {
  const { t, direction } = useLanguage();
  const { signIn, clearError } = useAuth();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState(null);

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await signIn();

      if (result === null) {
        // Redirect flow initiated (mobile) -- page will navigate away.
        // Show a brief "redirecting" state in case there is a delay.
        setRedirecting(true);
        setLoading(false);
        return;
      }

      onClose(); // Close dialog on successful sign-in
    } catch (err) {
      // Handle specific error types
      if (err.code === 'cancelled') {
        // User cancelled - just reset loading, don't show error
        setLoading(false);
        return;
      }

      // Map error codes to translated messages
      let errorMessage;
      if (err.code === 'popup-blocked') {
        errorMessage = t.popupBlocked || err.message;
      } else if (err.code === 'network-error') {
        errorMessage = t.networkError || err.message;
      } else if (err.code === 'operation-not-allowed') {
        errorMessage = t.operationNotAllowed || err.message;
      } else if (err.code === 'unauthorized-domain') {
        errorMessage = t.unauthorizedDomain || err.message;
      } else {
        errorMessage = t.signInError || err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [signIn, onClose, t]);

  const handleClose = useCallback(() => {
    if (!loading) {
      setError(null);
      clearError();
      onClose();
    }
  }, [loading, clearError, onClose]);

  const benefits = [
    {
      icon: <DevicesIcon color="primary" />,
      text: t.signInBenefitDevices || 'Access from any device (phone, tablet, PC)',
    },
    {
      icon: <CloudDoneIcon color="primary" />,
      text: t.signInBenefitBackup || 'Automatic cloud backup (never lose data)',
    },
    {
      icon: <SyncIcon color="primary" />,
      text: t.signInBenefitSync || 'Multi-device sync (data everywhere)',
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      dir={direction}
      aria-labelledby="sign-in-dialog-title"
    >
      <DialogTitle id="sign-in-dialog-title" sx={{ textAlign: 'center', pb: 1 }}>
        {t.signInTitle || 'Sign in to unlock cloud features'}
      </DialogTitle>

      <DialogContent>
        {/* Benefits list */}
        <List disablePadding>
          {benefits.map((benefit, index) => (
            <ListItem key={index} disableGutters sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                {benefit.icon}
              </ListItemIcon>
              <ListItemText
                primary={benefit.text}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Current status */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
            p: 1.5,
            bgcolor: 'grey.100',
            borderRadius: 1,
          }}
        >
          <StorageIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {t.signInCurrentStatus || 'Currently using: Local storage only'}
          </Typography>
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Sign in button */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          startIcon={(loading || redirecting) ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
          onClick={handleSignIn}
          disabled={loading || redirecting}
          sx={{
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {redirecting
            ? (t.redirecting || 'Redirecting...')
            : loading
              ? (t.loading || 'Loading...')
              : (t.signInWithGoogle || 'Sign in with Google')
          }
        </Button>

        {/* Privacy note */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            mt: 2,
          }}
        >
          <LockIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            {t.signInPrivacyNote || 'Your data is private and encrypted'}
          </Typography>
        </Box>

        {/* Privacy policy link */}
        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          <Link
            href="#/privacy"
            sx={{ color: 'text.secondary', textDecoration: 'underline' }}
          >
            {t.privacyPolicy?.title || 'Privacy Policy'}
          </Link>
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{ textTransform: 'none' }}
        >
          {t.continueWithoutSignIn || 'Continue without signing in'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default memo(SignInDialog);
