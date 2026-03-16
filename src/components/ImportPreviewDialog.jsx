/**
 * ImportPreviewDialog Component
 *
 * State-machine dialog for previewing and executing data imports.
 * States: IDLE -> PARSING -> [COLUMN_MAPPING ->] PREVIEW -> IMPORTING -> SUCCESS/ERROR
 *
 * External CSVs route through COLUMN_MAPPING for user-driven column mapping.
 * App-format CSVs and JSON files skip directly to PREVIEW.
 *
 * Features:
 * - File info display
 * - Valid/invalid entry counts
 * - Sample entries table (first 5)
 * - Merge/Replace radio group
 * - Replace mode: backup info alert + warning alert + confirmation checkbox
 * - LinearProgress during import
 * - RTL support
 * - Accessible: aria-live, focus management, keyboard navigation
 * - Full-screen on mobile (<600px)
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  useMediaQuery,
  useTheme,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useLanguage } from '../contexts/useLanguage';
import { ImportState } from '../hooks/useImportExport';
import { IMPORT_MODE_MERGE, IMPORT_MODE_REPLACE } from '../services/importService';
import ColumnMappingStep from './ColumnMappingStep';

/** Maximum number of sample entries to display in preview */
const MAX_SAMPLE_ENTRIES = 5;

/**
 * Format file size to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function ImportPreviewDialog({ open, importHook, onClose, onNavigateToTab }) {
  const { t, direction } = useLanguage();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const titleRef = useRef(null);

  const st = t.settings?.importExport || {};
  const {
    state,
    parseResult,
    importResult,
    error,
    progress,
    externalCSVData,
    executeImport,
    confirmMapping,
    goBackToFileSelect,
    reset,
    retry,
  } = importHook;

  const [importMode, setImportMode] = useState(IMPORT_MODE_MERGE);
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [showInvalid, setShowInvalid] = useState(false);

  const isImporting = state === ImportState.IMPORTING;
  const progressPercent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  // Focus management: focus title when dialog opens
  useEffect(() => {
    if (open && titleRef.current) {
      titleRef.current.focus();
    }
  }, [open, state]);

  const handleModeChange = useCallback((event) => {
    setImportMode(event.target.value);
    setReplaceConfirmed(false);
  }, []);

  const handleReplaceConfirmChange = useCallback((event) => {
    setReplaceConfirmed(event.target.checked);
  }, []);

  const handleImport = useCallback(() => {
    executeImport(importMode);
  }, [executeImport, importMode]);

  const handleClose = useCallback(() => {
    if (isImporting) return;
    // Reset local state before closing
    setImportMode(IMPORT_MODE_MERGE);
    setReplaceConfirmed(false);
    setShowInvalid(false);
    reset();
    onClose();
  }, [isImporting, reset, onClose]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const handleColumnMappingConfirm = useCallback((finalMappings) => {
    confirmMapping(finalMappings);
  }, [confirmMapping]);

  const handleColumnMappingBack = useCallback(() => {
    goBackToFileSelect();
  }, [goBackToFileSelect]);

  const handleToggleInvalid = useCallback(() => {
    setShowInvalid((prev) => !prev);
  }, []);

  const handleViewEntries = useCallback(() => {
    // Reset dialog state, then navigate to History tab (tab 3)
    setImportMode(IMPORT_MODE_MERGE);
    setReplaceConfirmed(false);
    setShowInvalid(false);
    reset();
    onClose();
    if (onNavigateToTab) {
      onNavigateToTab(3);
    }
  }, [reset, onClose, onNavigateToTab]);

  const canImport = state === ImportState.PREVIEW
    && parseResult?.validEntries?.length > 0
    && (importMode !== IMPORT_MODE_REPLACE || replaceConfirmed);

  const getTitle = () => {
    switch (state) {
      case ImportState.PARSING:
        return st.importPreviewTitle || 'Import Preview';
      case ImportState.COLUMN_MAPPING: {
        const ext = t.settings?.externalImport || {};
        return ext.mapColumns || 'Map Columns';
      }
      case ImportState.PREVIEW:
        return st.importPreviewTitle || 'Import Preview';
      case ImportState.IMPORTING:
        return st.importPreviewTitle || 'Import Preview';
      case ImportState.SUCCESS:
        return st.importPreviewTitle || 'Import Complete';
      case ImportState.ERROR:
        return st.importError || 'Import Failed';
      default:
        return st.importPreviewTitle || 'Import Preview';
    }
  };

  const renderParsing = () => (
    <DialogContent>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography aria-live="polite">
          {t.loading || 'Loading...'}
        </Typography>
      </Box>
    </DialogContent>
  );

  const renderPreview = () => {
    if (!parseResult) return null;

    const { filename, fileSize, validEntries, invalidEntries } = parseResult;
    const sampleEntries = validEntries.slice(0, MAX_SAMPLE_ENTRIES);

    const fileInfo = (st.importFileInfo || 'File: {filename} ({size})')
      .replace('{filename}', filename)
      .replace('{size}', formatFileSize(fileSize));

    const validText = (st.importValidEntries || '{count} valid entries')
      .replace('{count}', String(validEntries.length));

    const invalidText = (st.importInvalidEntries || '{count} invalid entries')
      .replace('{count}', String(invalidEntries.length));

    return (
      <DialogContent dividers>
        {/* File info */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1, unicodeBidi: 'isolate' }}
        >
          {fileInfo}
        </Typography>

        {/* Valid / Invalid counts */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="body2">{validText}</Typography>
          </Box>
          {invalidEntries.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ErrorIcon color="error" fontSize="small" />
              <Typography variant="body2">{invalidText}</Typography>
              <IconButton
                size="small"
                onClick={handleToggleInvalid}
                aria-label={showInvalid
                  ? (st.importHideInvalid || 'Hide invalid entries')
                  : (st.importShowInvalid || 'Show invalid entries')}
                aria-expanded={showInvalid}
              >
                {showInvalid ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Invalid entries expandable section */}
        {invalidEntries.length > 0 && (
          <Collapse in={showInvalid}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {invalidEntries.slice(0, 5).map((inv, idx) => (
                <Typography key={idx} variant="caption" component="div">
                  Row {inv.index + 1}: {inv.errors.join(', ')}
                </Typography>
              ))}
              {invalidEntries.length > 5 && (
                <Typography variant="caption" color="text.secondary">
                  ...and {invalidEntries.length - 5} more
                </Typography>
              )}
            </Alert>
          </Collapse>
        )}

        {/* Sample entries table */}
        {sampleEntries.length > 0 && (
          <TableContainer sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>{t.date || 'Date'}</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">{t.amount || 'Amount'}</TableCell>
                  <TableCell>{t.note || 'Note'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sampleEntries.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>{entry.type}</TableCell>
                    <TableCell align="right">{entry.amount}</TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.note || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Import mode radio group */}
        <FormControl component="fieldset" sx={{ mb: 1 }}>
          <RadioGroup
            value={importMode}
            onChange={handleModeChange}
            aria-label={st.importTitle || 'Import mode'}
          >
            <FormControlLabel
              value={IMPORT_MODE_MERGE}
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {st.importModeMerge || 'Merge (Add All)'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {st.importModeMergeDesc || 'Add imported entries alongside existing data'}
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value={IMPORT_MODE_REPLACE}
              control={<Radio />}
              label={
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {st.importModeReplace || 'Replace All'}
                      </Typography>
                      <WarningAmberIcon fontSize="small" color="warning" />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {st.importModeReplaceDesc || 'Delete all existing data and replace with imported data'}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {/* Replace mode: backup info + destructive warning + consent checkbox */}
        {importMode === IMPORT_MODE_REPLACE && (
          <Box sx={{ mt: 1 }}>
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mb: 1 }}>
              {st.importBackupNotice || 'A backup of your current data will be downloaded automatically before replacing.'}
            </Alert>
            <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 1 }}>
              {st.importReplaceWarning || 'This will permanently delete all your existing entries!'}
            </Alert>
            <FormControlLabel
              control={
                <Checkbox
                  checked={replaceConfirmed}
                  onChange={handleReplaceConfirmChange}
                  color="warning"
                />
              }
              label={
                <Typography variant="body2">
                  {st.importReplaceConfirm || 'I understand my data will be backed up and replaced'}
                </Typography>
              }
            />
          </Box>
        )}
      </DialogContent>
    );
  };

  const renderImporting = () => (
    <DialogContent>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{ width: '100%', mb: 2, height: 8, borderRadius: 4 }}
        />
        <Typography aria-live="polite" variant="body2">
          {(st.importProgress || 'Importing... {current}/{total}')
            .replace('{current}', String(progress.current))
            .replace('{total}', String(progress.total))}
        </Typography>
      </Box>
    </DialogContent>
  );

  const renderSuccess = () => (
    <>
      <DialogContent>
        <Box
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}
          role="status"
          aria-live="polite"
        >
          <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {(st.importSuccess || 'Successfully imported {count} entries')
              .replace('{count}', String(importResult?.imported || 0))}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {st.importSuccessHint || 'Your entries have been imported successfully'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }} size="large">
          {st.done || 'Done'}
        </Button>
        {onNavigateToTab && (
          <Button
            onClick={handleViewEntries}
            variant="contained"
            sx={{ textTransform: 'none' }}
            size="large"
            autoFocus
          >
            {st.viewEntries || 'View Entries'}
          </Button>
        )}
      </DialogActions>
    </>
  );

  const renderError = () => (
    <>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || (st.importError || 'Failed to import data')}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }} size="large">
          {st.cancel || t.cancel || 'Close'}
        </Button>
        <Button onClick={handleRetry} variant="contained" sx={{ textTransform: 'none' }} size="large">
          {t.tryAgain || 'Try Again'}
        </Button>
      </DialogActions>
    </>
  );

  const renderColumnMapping = () => {
    if (!externalCSVData) return null;

    return (
      <DialogContent dividers>
        <ColumnMappingStep
          headers={externalCSVData.headers}
          sampleRows={externalCSVData.sampleRows}
          detectionResult={externalCSVData.detectionResult}
          onConfirm={handleColumnMappingConfirm}
          onBack={handleColumnMappingBack}
        />
      </DialogContent>
    );
  };

  const renderContent = () => {
    switch (state) {
      case ImportState.PARSING:
        return renderParsing();
      case ImportState.COLUMN_MAPPING:
        return renderColumnMapping();
      case ImportState.PREVIEW:
        return (
          <>
            {renderPreview()}
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose} sx={{ textTransform: 'none' }} size="large">
                {st.cancel || t.cancel || 'Cancel'}
              </Button>
              <Button
                onClick={handleImport}
                variant="contained"
                disabled={!canImport}
                sx={{ textTransform: 'none' }}
                size="large"
              >
                {st.import || 'Import'}
              </Button>
            </DialogActions>
          </>
        );
      case ImportState.IMPORTING:
        return renderImporting();
      case ImportState.SUCCESS:
        return renderSuccess();
      case ImportState.ERROR:
        return renderError();
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isImporting ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      dir={direction}
      aria-labelledby="import-preview-title"
      disableEscapeKeyDown={isImporting}
    >
      <DialogTitle
        id="import-preview-title"
        ref={titleRef}
        tabIndex={-1}
        sx={{ textAlign: 'center', pb: 1 }}
      >
        {getTitle()}
      </DialogTitle>
      {renderContent()}
    </Dialog>
  );
}

export default memo(ImportPreviewDialog);
