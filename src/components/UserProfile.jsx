/**
 * UserProfile Component
 *
 * Displays the user's avatar and provides a dropdown menu with:
 * - Sync status indicator
 * - Sign out option
 *
 * Only shown when the user is signed in.
 */

import { useState, memo, useCallback, useMemo } from 'react';
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import StorageIcon from '@mui/icons-material/Storage';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import SyncIcon from '@mui/icons-material/Sync';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useLanguage } from '../contexts/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { useMigration } from '../hooks/useMigration';

function UserProfile() {
  const { t, direction } = useLanguage();
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  const open = Boolean(anchorEl);

  const { status: migrationStatus } = useMigration(user?.uid);

  const syncStatus = useMemo(() => {
    switch (migrationStatus) {
      case 'completed':
        return { icon: <CloudDoneIcon fontSize="small" />, text: t.syncedToCloud };
      case 'in-progress':
        return { icon: <SyncIcon fontSize="small" />, text: t.syncing };
      case 'failed':
        return { icon: <ErrorOutlineIcon fontSize="small" />, text: t.syncFailed };
      default:
        return { icon: <StorageIcon fontSize="small" />, text: t.syncStatusLocalOnly };
    }
  }, [migrationStatus, t]);

  const handleClick = useCallback((event) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await signOut();
      handleClose();
    } catch {
      // Error is handled by AuthProvider
    } finally {
      setSigningOut(false);
    }
  }, [signOut, handleClose]);

  if (!user) {
    return null;
  }

  // Get initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        aria-label={t.userProfile || 'User Profile'}
      >
        <Avatar
          src={user.photoURL}
          alt={user.displayName || user.email}
          sx={{
            width: 32,
            height: 32,
            bgcolor: 'secondary.main',
            fontSize: '0.875rem',
          }}
        >
          {getInitials(user.displayName)}
        </Avatar>
      </IconButton>

      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        dir={direction}
        transformOrigin={{ horizontal: direction === 'rtl' ? 'left' : 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: direction === 'rtl' ? 'left' : 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 200 },
        }}
      >
        {/* User info header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {user.displayName || t.userProfile}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user.email}
          </Typography>
        </Box>

        <Divider />

        {/* Sync status */}
        <MenuItem disabled>
          <ListItemIcon>
            {syncStatus.icon}
          </ListItemIcon>
          <ListItemText
            primary={syncStatus.text}
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </MenuItem>

        <Divider />

        {/* Sign out */}
        <MenuItem onClick={handleSignOut} disabled={signingOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={signingOut ? (t.loading || 'Loading...') : (t.signOut || 'Sign Out')}
          />
        </MenuItem>
      </Menu>
    </>
  );
}

export default memo(UserProfile);
