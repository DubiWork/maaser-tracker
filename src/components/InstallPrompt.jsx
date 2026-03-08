/**
 * InstallPrompt Component
 *
 * Displays a prompt to install the PWA with platform-specific instructions
 * Supports both standard browsers (Chrome, Edge) and iOS Safari
 */

import { useState } from 'react';
import {
  Snackbar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as GetAppIcon,
  IosShare as IosShareIcon,
  AddBox as AddBoxIcon,
} from '@mui/icons-material';
import { useLanguage } from '../contexts/useLanguage';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * InstallPrompt displays an install banner or iOS instructions dialog
 * @param {Object} props - Component props
 * @param {boolean} props.hasUserEngaged - Whether user has engaged with the app
 */
export default function InstallPrompt({ hasUserEngaged = false }) {
  const { t, direction } = useLanguage();
  const [showIOSDialog, setShowIOSDialog] = useState(false);

  const {
    isIOS,
    shouldShowPrompt,
    promptInstall,
    dismiss,
  } = useInstallPrompt({ hasUserEngaged });

  // Handle install button click
  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSDialog(true);
    } else {
      const result = await promptInstall();
      if (result.outcome === 'accepted') {
        // Installation started
      }
    }
  };

  // Handle dismiss button click
  const handleDismiss = () => {
    dismiss();
  };

  // Handle iOS dialog close
  const handleCloseIOSDialog = () => {
    setShowIOSDialog(false);
  };

  // Don't render if prompt shouldn't be shown
  if (!shouldShowPrompt) {
    return null;
  }

  return (
    <>
      {/* Install Snackbar */}
      <Snackbar
        open={shouldShowPrompt && !showIOSDialog}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          mb: 8,
          '& .MuiSnackbarContent-root': {
            flexWrap: 'nowrap',
            bgcolor: 'primary.main',
          },
        }}
        message={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GetAppIcon sx={{ fontSize: 20 }} />
            <Typography variant="body2">
              {t.installMessage || 'Install for the best experience'}
            </Typography>
          </Box>
        }
        action={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              color="inherit"
              size="small"
              onClick={handleInstall}
              sx={{ fontWeight: 'bold' }}
            >
              {t.install || 'Install'}
            </Button>
            <IconButton
              size="small"
              color="inherit"
              onClick={handleDismiss}
              aria-label={t.notNow || 'Not now'}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      />

      {/* iOS Installation Instructions Dialog */}
      <Dialog
        open={showIOSDialog}
        onClose={handleCloseIOSDialog}
        dir={direction}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GetAppIcon color="primary" />
          {t.installApp || 'Install App'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t.iosInstallInstructions || 'To install this app on your iPhone or iPad:'}
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <IosShareIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t.iosStep1 || '1. Tap the Share button'}
                secondary={t.iosStep1Hint || 'At the bottom of Safari'}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <AddBoxIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={t.iosStep2 || '2. Tap "Add to Home Screen"'}
                secondary={t.iosStep2Hint || 'Scroll down in the menu'}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Typography variant="h6" color="primary" sx={{ width: 24, textAlign: 'center' }}>
                  3
                </Typography>
              </ListItemIcon>
              <ListItemText
                primary={t.iosStep3 || '3. Tap "Add"'}
                secondary={t.iosStep3Hint || 'Confirm the installation'}
              />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseIOSDialog} color="primary">
            {t.gotIt || 'Got it'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
