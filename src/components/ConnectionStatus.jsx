/**
 * ConnectionStatus Component
 *
 * Displays a banner when the user is offline to inform them
 * that the app is working in offline mode.
 */

import { memo } from 'react';
import { Box, Typography, Slide } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useLanguage } from '../contexts/useLanguage';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * ConnectionStatus displays an offline indicator banner
 * @param {Object} props - Component props
 * @param {function} props.onOnline - Callback when connection is restored
 * @param {function} props.onOffline - Callback when connection is lost
 */
function ConnectionStatus({ onOnline, onOffline }) {
  const { t, direction } = useLanguage();
  const { isOffline } = useOnlineStatus({ onOnline, onOffline });

  return (
    <Slide direction="down" in={isOffline} mountOnEnter unmountOnExit>
      <Box
        role="status"
        aria-live="polite"
        dir={direction}
        sx={{
          position: 'fixed',
          top: 56, // Below AppBar
          left: 0,
          right: 0,
          zIndex: 1100,
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          py: 1,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          boxShadow: 1,
        }}
      >
        <WifiOffIcon fontSize="small" />
        <Typography variant="body2" component="span" fontWeight="medium">
          {t.offline || 'Offline'}
        </Typography>
        <Typography
          variant="body2"
          component="span"
          sx={{
            display: { xs: 'none', sm: 'inline' },
            opacity: 0.9,
          }}
        >
          {' - '}
          {t.offlineMessage || 'No internet connection. Changes will be saved locally.'}
        </Typography>
      </Box>
    </Slide>
  );
}

export default memo(ConnectionStatus);
