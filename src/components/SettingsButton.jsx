/**
 * SettingsButton Component
 *
 * Gear icon button for the AppBar that navigates to the Settings page.
 * Uses translation keys for accessible labels.
 */

import { memo } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLanguage } from '../contexts/useLanguage';

function SettingsButton({ onClick }) {
  const { t } = useLanguage();

  return (
    <Tooltip title={t.settings.title}>
      <IconButton
        onClick={onClick}
        color="inherit"
        size="large"
        aria-label={t.settings.title}
      >
        <SettingsIcon />
      </IconButton>
    </Tooltip>
  );
}

export default memo(SettingsButton);
