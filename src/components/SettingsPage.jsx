/**
 * SettingsPage Component
 *
 * Full settings page with six sections:
 * 1. General (language, currency)
 * 2. Ma'aser Calculation (percentage management)
 * 3. Appearance (theme toggle)
 * 4. Data Management (import/export)
 * 5. Cloud Data & Privacy (GDPR: export/delete data)
 * 6. About (version, links)
 *
 * All settings auto-save immediately except ma'aser percentage
 * which requires confirmation via dialog.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Alert,
  Box,
  Typography,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  TextField,
  Slider,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  Paper,
  Link,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';
import SecurityIcon from '@mui/icons-material/Security';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useLanguage } from '../contexts/useLanguage';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { clearAllEntries } from '../services/db';
import { queryKeys } from '../hooks/useEntries';
import ImportExportSection from './ImportExportSection';
import DataManagementDialog from './DataManagementDialog';

const APP_VERSION = '1.2.0';
const GITHUB_URL = 'https://github.com/DubiWork/maaser-tracker';

const CURRENCY_OPTIONS = [
  { code: 'ILS', symbol: '\u20AA' },
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '\u20AC' },
  { code: 'GBP', symbol: '\u00A3' },
];

function formatDateForDisplay(dateStr, language) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SettingsPage({ onBack }) {
  const { t, language, direction } = useLanguage();
  const {
    settings,
    isLoading,
    updateLanguage,
    updateCurrency,
    updateThemeMode,
    updateMaaserPercentage,
    getCurrentMaaserPercentage,
  } = useSettings();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const st = t.settings;
  const cdp = st.cloudDataPrivacy || {};

  // Ma'aser percentage form state
  const [newPercentage, setNewPercentage] = useState(10);
  const [effectiveDate, setEffectiveDate] = useState(getTodayString);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [percentageError, setPercentageError] = useState('');

  // GDPR Cloud Data & Privacy state
  const [gdprDialogOpen, setGdprDialogOpen] = useState(false);
  const [gdprDialogAction, setGdprDialogAction] = useState(null);

  // Local data deletion state
  const [deleteLocalDialogOpen, setDeleteLocalDialogOpen] = useState(false);
  const [deleteLocalConfirmed, setDeleteLocalConfirmed] = useState(false);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);
  const [deleteLocalSnackbar, setDeleteLocalSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const currentPercentage = useMemo(
    () => getCurrentMaaserPercentage(),
    [getCurrentMaaserPercentage]
  );

  const sortedPeriodsDesc = useMemo(() => {
    if (!settings.maaserPercentagePeriods) return [];
    return [...settings.maaserPercentagePeriods].sort(
      (a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)
    );
  }, [settings.maaserPercentagePeriods]);

  // Back arrow depends on direction
  const BackArrow = direction === 'rtl' ? ArrowForwardIcon : ArrowBackIcon;

  // --- Handlers ---

  const handleLanguageChange = useCallback(
    (event) => {
      updateLanguage(event.target.value);
    },
    [updateLanguage]
  );

  const handleCurrencyChange = useCallback(
    (event) => {
      updateCurrency(event.target.value);
    },
    [updateCurrency]
  );

  const handleThemeChange = useCallback(
    (_event, newMode) => {
      if (newMode !== null) {
        updateThemeMode(newMode);
      }
    },
    [updateThemeMode]
  );

  const handleSliderChange = useCallback((_event, value) => {
    setNewPercentage(value);
    setPercentageError('');
  }, []);

  const handlePercentageInputChange = useCallback(
    (event) => {
      const val = event.target.value;
      if (val === '') {
        setNewPercentage('');
        setPercentageError('');
        return;
      }
      const num = parseFloat(val);
      if (isNaN(num)) {
        setPercentageError(st.invalidPercentage);
        return;
      }
      if (num < 1 || num > 100) {
        setPercentageError(st.percentageRange);
        setNewPercentage(num);
        return;
      }
      setNewPercentage(num);
      setPercentageError('');
    },
    [st.invalidPercentage, st.percentageRange]
  );

  const handleEffectiveDateChange = useCallback((event) => {
    setEffectiveDate(event.target.value);
  }, []);

  const handleUpdateClick = useCallback(() => {
    const pct = typeof newPercentage === 'number' ? newPercentage : parseFloat(newPercentage);
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setPercentageError(st.percentageRange);
      return;
    }
    setConfirmDialogOpen(true);
  }, [newPercentage, st.percentageRange]);

  const handleConfirmPercentage = useCallback(async () => {
    const pct = typeof newPercentage === 'number' ? newPercentage : parseFloat(newPercentage);
    setConfirmDialogOpen(false);
    await updateMaaserPercentage(pct, effectiveDate);
  }, [newPercentage, effectiveDate, updateMaaserPercentage]);

  const handleCancelConfirm = useCallback(() => {
    setConfirmDialogOpen(false);
  }, []);

  const handlePrivacyClick = useCallback(() => {
    window.location.hash = '#/privacy';
  }, []);

  // --- GDPR Cloud Data & Privacy Handlers ---

  const handleGdprExportClick = useCallback(() => {
    setGdprDialogAction('export');
    setGdprDialogOpen(true);
  }, []);

  const handleGdprDeleteClick = useCallback(() => {
    setGdprDialogAction('delete');
    setGdprDialogOpen(true);
  }, []);

  const handleGdprDialogClose = useCallback(() => {
    setGdprDialogOpen(false);
    setGdprDialogAction(null);
  }, []);

  // --- Local Data Deletion Handlers ---

  const handleDeleteLocalClick = useCallback(() => {
    setDeleteLocalDialogOpen(true);
    setDeleteLocalConfirmed(false);
  }, []);

  const handleDeleteLocalCancel = useCallback(() => {
    setDeleteLocalDialogOpen(false);
    setDeleteLocalConfirmed(false);
  }, []);

  const handleDeleteLocalConfirm = useCallback(async () => {
    setIsDeletingLocal(true);
    try {
      await clearAllEntries();
      queryClient.removeQueries({ queryKey: queryKeys.all });
      await queryClient.refetchQueries({ queryKey: queryKeys.all, type: 'all' });
      setDeleteLocalDialogOpen(false);
      setDeleteLocalConfirmed(false);
      setDeleteLocalSnackbar({
        open: true,
        message: cdp.deleteLocalSuccess || 'All local data has been deleted successfully',
        severity: 'success',
      });
    } catch {
      setDeleteLocalSnackbar({
        open: true,
        message: st.errorSavingSettings || 'An error occurred',
        severity: 'error',
      });
    } finally {
      setIsDeletingLocal(false);
    }
  }, [cdp.deleteLocalSuccess, st.errorSavingSettings, queryClient]);

  const handleDeleteLocalSnackbarClose = useCallback(() => {
    setDeleteLocalSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  // Currency label helper
  const getCurrencyLabel = useCallback(
    (code) => {
      switch (code) {
        case 'ILS': return st.currencyILS;
        case 'USD': return st.currencyUSD;
        case 'EUR': return st.currencyEUR;
        case 'GBP': return st.currencyGBP;
        default: return code;
      }
    },
    [st.currencyILS, st.currencyUSD, st.currencyEUR, st.currencyGBP]
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  const confirmMessage = st.confirmPercentageMessage
    .replace('{percentage}', String(typeof newPercentage === 'number' ? newPercentage : parseFloat(newPercentage) || 0))
    .replace('{date}', formatDateForDisplay(effectiveDate, language));

  return (
    <Box sx={{ pb: 2 }}>
      {/* Header with back button */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <IconButton
          onClick={onBack}
          aria-label={st.back}
          edge="start"
          sx={{ mr: direction === 'ltr' ? 1 : 0, ml: direction === 'rtl' ? 1 : 0 }}
        >
          <BackArrow />
        </IconButton>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
          {st.title}
        </Typography>
      </Box>

      {/* Section 1: General */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 500, mb: 2 }}>
          {st.general}
        </Typography>

        {/* Language selector */}
        <FormControl fullWidth sx={{ mb: 2 }} size="small">
          <InputLabel id="settings-language-label">{st.language}</InputLabel>
          <Select
            labelId="settings-language-label"
            id="settings-language"
            value={settings.language}
            label={st.language}
            onChange={handleLanguageChange}
          >
            <MenuItem value="he">{st.languageHebrew}</MenuItem>
            <MenuItem value="en">{st.languageEnglish}</MenuItem>
          </Select>
        </FormControl>

        {/* Currency selector */}
        <FormControl fullWidth size="small">
          <InputLabel id="settings-currency-label">{st.currency}</InputLabel>
          <Select
            labelId="settings-currency-label"
            id="settings-currency"
            value={settings.currency}
            label={st.currency}
            onChange={handleCurrencyChange}
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <MenuItem key={opt.code} value={opt.code}>
                {getCurrencyLabel(opt.code)} ({opt.symbol})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* Section 2: Ma'aser Calculation */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 500, mb: 2 }}>
          {st.maaserCalculation}
        </Typography>

        {/* Current percentage display */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            mb: 2,
            p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
            {st.currentPercentage}:
          </Typography>
          <Typography
            variant="h4"
            component="span"
            color="primary"
            sx={{ fontWeight: 700 }}
            aria-label={`${st.currentPercentage}: ${currentPercentage}%`}
          >
            {currentPercentage}%
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* New percentage input */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {st.newPercentage}
        </Typography>

        <Slider
          value={typeof newPercentage === 'number' ? newPercentage : 10}
          onChange={handleSliderChange}
          min={1}
          max={100}
          step={0.5}
          aria-label={st.newPercentage}
          sx={{ mb: 1 }}
        />

        <TextField
          id="settings-percentage-input"
          type="number"
          size="small"
          value={newPercentage}
          onChange={handlePercentageInputChange}
          error={!!percentageError}
          helperText={percentageError}
          slotProps={{
            input: {
              endAdornment: <Typography variant="body2">%</Typography>,
            },
            htmlInput: {
              min: 1,
              max: 100,
              step: 0.01,
              'aria-label': st.newPercentage,
            },
          }}
          sx={{ mb: 2, width: 150 }}
        />

        {/* Effective from date */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {st.effectiveFrom}
          </Typography>
          <TextField
            id="settings-effective-date"
            type="date"
            size="small"
            value={effectiveDate}
            onChange={handleEffectiveDateChange}
            slotProps={{
              htmlInput: {
                'aria-label': st.effectiveFrom,
              },
            }}
          />
        </Box>

        {/* Update button */}
        <Button
          variant="contained"
          onClick={handleUpdateClick}
          disabled={!!percentageError || newPercentage === '' || newPercentage === currentPercentage}
        >
          {st.updatePercentage}
        </Button>

        {/* Percentage history accordion */}
        {sortedPeriodsDesc.length > 0 && (
          <Accordion sx={{ mt: 2 }} disableGutters>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="percentage-history-content"
              id="percentage-history-header"
            >
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {st.percentageHistory}
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List dense disablePadding>
                {sortedPeriodsDesc.map((period, index) => (
                  <ListItem key={`${period.effectiveFrom}-${period.percentage}`} divider={index < sortedPeriodsDesc.length - 1}>
                    <ListItemText
                      primary={st.percentagePeriodLabel
                        .replace('{percentage}', String(period.percentage))
                        .replace('{date}', formatDateForDisplay(period.effectiveFrom, language))}
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}
      </Paper>

      {/* Section 3: Appearance */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 500, mb: 2 }}>
          {st.appearance}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {st.theme}
        </Typography>

        <ToggleButtonGroup
          value={settings.themeMode}
          exclusive
          onChange={handleThemeChange}
          aria-label={st.theme}
          fullWidth
          size="small"
        >
          <ToggleButton value="light" aria-label={st.themeLight}>
            <LightModeIcon sx={{ mr: 0.5 }} />
            {st.themeLight}
          </ToggleButton>
          <ToggleButton value="dark" aria-label={st.themeDark}>
            <DarkModeIcon sx={{ mr: 0.5 }} />
            {st.themeDark}
          </ToggleButton>
          <ToggleButton value="system" aria-label={st.themeSystem}>
            <SettingsBrightnessIcon sx={{ mr: 0.5 }} />
            {st.themeSystem}
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {/* Section 4: Data Management (Import/Export) */}
      <ImportExportSection />

      {/* Section 5: Cloud Data & Privacy (GDPR) */}
      <Paper sx={{ p: 2, mb: 2 }} data-testid="cloud-data-privacy-section">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <SecurityIcon color="action" fontSize="small" />
          <Typography variant="h6" component="h2" sx={{ fontWeight: 500 }}>
            {cdp.title || 'Cloud Data & Privacy'}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {cdp.description || 'Export or delete your cloud data'}
        </Typography>

        {user ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              onClick={handleGdprExportClick}
              sx={{ textTransform: 'none', justifyContent: 'flex-start', py: 1.5 }}
              aria-label={cdp.exportMyData || 'Export My Data'}
            >
              <Box sx={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {cdp.exportMyData || 'Export My Data'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {cdp.exportDescription || 'Download all your cloud data as a JSON file'}
                </Typography>
              </Box>
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={handleGdprDeleteClick}
              sx={{ textTransform: 'none', justifyContent: 'flex-start', py: 1.5 }}
              aria-label={cdp.deleteAllData || 'Delete All Data'}
            >
              <Box sx={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {cdp.deleteAllData || 'Delete All Data'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {cdp.deleteDescription || 'Permanently delete all your cloud data'}
                </Typography>
              </Box>
            </Button>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 1 }}>
            {cdp.signInToManage || 'Sign in to manage your cloud data'}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Local data deletion - available to all users */}
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={handleDeleteLocalClick}
          sx={{ textTransform: 'none', justifyContent: 'flex-start', py: 1.5, width: '100%' }}
          aria-label={cdp.deleteLocalData || 'Delete Local Data'}
        >
          <Box sx={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {cdp.deleteLocalData || 'Delete Local Data'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {cdp.deleteLocalDescription || 'Delete all entries stored on this device'}
            </Typography>
          </Box>
        </Button>
      </Paper>

      {/* Section 6: About */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 500, mb: 2 }}>
          {st.about}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t.appName}
          </Typography>
          <Typography variant="body2">
            {st.version} {APP_VERSION}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          <Link
            component="button"
            variant="body2"
            onClick={handlePrivacyClick}
            sx={{ textAlign: direction === 'rtl' ? 'right' : 'left' }}
          >
            {st.privacyPolicy}
          </Link>
          <Link
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
          >
            {st.sourceCode}
          </Link>
        </Box>
      </Paper>

      {/* Confirmation dialog for percentage change */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelConfirm}
        aria-labelledby="confirm-percentage-dialog-title"
      >
        <DialogTitle id="confirm-percentage-dialog-title">
          {st.confirmPercentageChange}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelConfirm}>
            {t.cancel}
          </Button>
          <Button onClick={handleConfirmPercentage} variant="contained" autoFocus>
            {st.confirm}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GDPR Data Management Dialog (cloud export/delete) */}
      <DataManagementDialog
        open={gdprDialogOpen}
        onClose={handleGdprDialogClose}
        initialAction={gdprDialogAction}
      />

      {/* Local data deletion confirmation dialog */}
      <Dialog
        open={deleteLocalDialogOpen}
        onClose={isDeletingLocal ? undefined : handleDeleteLocalCancel}
        dir={direction}
        aria-labelledby="delete-local-dialog-title"
        disableEscapeKeyDown={isDeletingLocal}
      >
        <DialogTitle id="delete-local-dialog-title">
          {cdp.deleteLocalData || 'Delete Local Data'}
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {cdp.deleteLocalWarning || 'This will permanently delete all entries stored on this device. This action cannot be undone.'}
          </Alert>
          <FormControlLabel
            control={
              <Checkbox
                checked={deleteLocalConfirmed}
                onChange={(e) => setDeleteLocalConfirmed(e.target.checked)}
                color="error"
                disabled={isDeletingLocal}
              />
            }
            label={cdp.deleteLocalConfirmCheckbox || 'I understand all my local data will be permanently deleted'}
          />
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            onClick={handleDeleteLocalCancel}
            disabled={isDeletingLocal}
            sx={{ textTransform: 'none' }}
          >
            {t.cancel}
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={isDeletingLocal ? <CircularProgress size={16} color="inherit" /> : <DeleteForeverIcon />}
            disabled={!deleteLocalConfirmed || isDeletingLocal}
            onClick={handleDeleteLocalConfirm}
            sx={{ textTransform: 'none' }}
          >
            {cdp.deleteLocalButton || 'Delete Local Data'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for local deletion feedback */}
      <Snackbar
        open={deleteLocalSnackbar.open}
        autoHideDuration={4000}
        onClose={handleDeleteLocalSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleDeleteLocalSnackbarClose}
          severity={deleteLocalSnackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {deleteLocalSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
