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
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PolicyOutlinedIcon from '@mui/icons-material/PolicyOutlined';
import { useLanguage } from '../contexts/useLanguage';
import { useAuth } from '../hooks/useAuth';
import { useMigration } from '../hooks/useMigration';
import DataManagementDialog from './DataManagementDialog';

function UserProfile() {
  const { t, direction } = useLanguage();
  const { user, signOut } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);

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

  const handleExportClick = useCallback(() => {
    handleClose();
    setDialogAction('export');
    setDialogOpen(true);
  }, [handleClose]);

  const handleDeleteClick = useCallback(() => {
    handleClose();
    setDialogAction('delete');
    setDialogOpen(true);
  }, [handleClose]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setDialogAction(null);
  }, []);

  // Firebase console: privacy URL registered at /maaser-tracker/privacy.html
  const handlePrivacyClick = useCallback(() => {
    handleClose();
    window.location.hash = '#/privacy';
  }, [handleClose]);

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

        {/* GDPR data management - only when cloud sync completed */}
        {migrationStatus === 'completed' && (
          <>
            <Divider />
            <MenuItem onClick={handleExportClick}>
              <ListItemIcon>
                <FileUploadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t.dataManagement?.exportMyData || 'Export my data'}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </MenuItem>
            <MenuItem onClick={handleDeleteClick}>
              <ListItemIcon>
                <DeleteForeverIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText
                primary={t.dataManagement?.deleteCloudData || 'Delete cloud data'}
                primaryTypographyProps={{ variant: 'body2', color: 'error.main' }}
              />
            </MenuItem>
          </>
        )}

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

        <Divider />

        {/* Privacy policy - visible to all users */}
        <MenuItem onClick={handlePrivacyClick}>
          <ListItemIcon>
            <PolicyOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={t.privacyPolicyLink || 'Privacy Policy'}
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </MenuItem>
      </Menu>

      <DataManagementDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        initialAction={dialogAction}
      />
    </>
  );
}

export default memo(UserProfile);
