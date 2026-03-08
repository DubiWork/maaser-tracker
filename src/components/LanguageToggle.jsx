import { IconButton, Tooltip } from '@mui/material';
import { Translate } from '@mui/icons-material';
import { useLanguage } from '../contexts/useLanguage';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Tooltip title={language === 'he' ? 'Switch to English' : 'עברית'}>
      <IconButton
        onClick={toggleLanguage}
        color="inherit"
        size="large"
      >
        <Translate />
      </IconButton>
    </Tooltip>
  );
}
