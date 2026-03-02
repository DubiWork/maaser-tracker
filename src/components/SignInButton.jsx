/**
 * SignInButton Component
 *
 * A simple button shown in the app bar when the user is NOT signed in.
 * Clicking it opens the SignInDialog modal.
 *
 * This button is unobtrusive and does not block app usage.
 */

import { useState, memo } from 'react';
import { Button } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { useLanguage } from '../contexts/useLanguage';
import SignInDialog from './SignInDialog';

function SignInButton() {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <Button
        color="inherit"
        startIcon={<LoginIcon />}
        onClick={handleOpenDialog}
        sx={{
          textTransform: 'none',
          fontWeight: 500,
        }}
      >
        {t.signIn || 'Sign In'}
      </Button>

      <SignInDialog open={dialogOpen} onClose={handleCloseDialog} />
    </>
  );
}

export default memo(SignInButton);
