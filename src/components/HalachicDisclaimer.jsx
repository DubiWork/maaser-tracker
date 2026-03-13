/**
 * HalachicDisclaimer Component
 *
 * Displays an informational alert in the Settings/About section
 * advising users that the app is for tracking purposes only
 * and does not replace rabbinic guidance.
 *
 * Shows a brief summary by default (collapsed). Users can expand
 * to read the full disclaimer via a "Read more" toggle.
 *
 * Uses MUI Alert with Collapse for a collapsible experience.
 * Renders correctly in both RTL (Hebrew) and LTR (English).
 */

import { useState, useCallback } from 'react';
import { Alert, AlertTitle, Collapse, Box, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useLanguage } from '../contexts/useLanguage';

export default function HalachicDisclaimer() {
  const { t } = useLanguage();
  const st = t.settings;
  const disclaimer = st.halachicDisclaimer || {};

  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const title = disclaimer.title || 'Important Notice';
  const briefText =
    disclaimer.text ||
    'This tool is for tracking purposes only and does not constitute halachic rulings. Please consult a qualified rabbi for halachic questions.';
  const expandedText =
    disclaimer.expandedText ||
    'This application provides tracking tools for calculating ma\'aser kesafim (monetary tithe). The calculations presented are for illustration purposes only and do not constitute halachic rulings. Tithe rates, exemptions, and calculation rules may vary according to community custom and rabbinic authority. It is strongly recommended to consult a qualified rabbi for any halachic questions regarding ma\'aser kesafim.';
  const toggleLabel = expanded
    ? disclaimer.showLess || 'Show less'
    : disclaimer.showMore || 'Read more';

  return (
    <Box sx={{ mb: 2 }} data-testid="halachic-disclaimer">
      <Alert
        severity="info"
        role="region"
        aria-label={title}
        sx={{
          '& .MuiAlert-message': { width: '100%' },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <AlertTitle sx={{ mb: 0 }}>{title}</AlertTitle>
          <Button
            size="small"
            onClick={handleToggle}
            aria-expanded={expanded}
            aria-controls="halachic-disclaimer-content"
            endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ textTransform: 'none', minWidth: 'auto', flexShrink: 0 }}
          >
            {toggleLabel}
          </Button>
        </Box>
        <Box sx={{ mt: 1 }}>{briefText}</Box>
        <Collapse in={expanded} id="halachic-disclaimer-content">
          <Box sx={{ mt: 1 }}>{expandedText}</Box>
        </Collapse>
      </Alert>
    </Box>
  );
}
