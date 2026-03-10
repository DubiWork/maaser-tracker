/**
 * ImportExportSection Component
 *
 * Section 5 in SettingsPage — "Data Management" for local data backup/restore.
 * Provides export buttons (JSON/CSV) and import button with hidden file input.
 * Launches ImportPreviewDialog on file selection.
 */

import { useState, useRef, useCallback, memo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  Divider,
  Snackbar,
  Alert,
  Tooltip,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useLanguage } from '../contexts/useLanguage';
import { useEntries } from '../hooks/useEntries';
import { useExportJSON, useExportCSV, useImport } from '../hooks/useImportExport';
import ImportPreviewDialog from './ImportPreviewDialog';

function ImportExportSection() {
  const { t } = useLanguage();
  const { data: entries } = useEntries();
  const exportJSON = useExportJSON();
  const exportCSV = useExportCSV();
  const importHook = useImport();
  const fileInputRef = useRef(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const st = t.settings?.importExport || {};
  const hasEntries = entries && entries.length > 0;
  const isOperationActive = exportJSON.isExporting || exportCSV.isExporting;

  const handleExportJSON = useCallback(async () => {
    await exportJSON.exportJSON();
    if (exportJSON.error) {
      setSnackbar({ open: true, message: st.exportError || 'Failed to export data', severity: 'error' });
    } else if (exportJSON.isIOS) {
      setSnackbar({ open: true, message: st.iosSaveHint || 'Tap the share icon to save the file', severity: 'info' });
    } else {
      setSnackbar({ open: true, message: st.exportSecurityWarning || 'This file contains your financial data. Store it securely.', severity: 'warning' });
    }
  }, [exportJSON, st.exportError, st.iosSaveHint, st.exportSecurityWarning]);

  const handleExportCSV = useCallback(async () => {
    await exportCSV.exportCSV();
    if (exportCSV.error) {
      setSnackbar({ open: true, message: st.exportError || 'Failed to export data', severity: 'error' });
    } else if (exportCSV.isIOS) {
      setSnackbar({ open: true, message: st.iosSaveHint || 'Tap the share icon to save the file', severity: 'info' });
    } else {
      setSnackbar({ open: true, message: st.exportSecurityWarning || 'This file contains your financial data. Store it securely.', severity: 'warning' });
    }
  }, [exportCSV, st.exportError, st.iosSaveHint, st.exportSecurityWarning]);

  const handleImportClick = useCallback(() => {
    if (fileInputRef.current) {
      // Reset the value so re-selecting the same file fires onChange
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file) {
      importHook.parseFile(file);
    }
  }, [importHook]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const handleDialogClose = useCallback(() => {
    importHook.reset();
  }, [importHook]);

  const noEntriesTooltip = st.exportEmpty || 'No entries to export';

  return (
    <>
      <Paper sx={{ p: 2, mb: 2 }} data-testid="import-export-section">
        <Typography variant="h6" component="h2" sx={{ fontWeight: 500, mb: 0.5 }}>
          {st.sectionTitle || 'Data Management'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {st.sectionDescription || 'Backup, restore, or transfer your data'}
        </Typography>

        {/* Export area */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {st.exportTitle || 'Export Data'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Tooltip title={hasEntries ? '' : noEntriesTooltip} arrow>
            <span>
              <Button
                variant="outlined"
                startIcon={<FileUploadIcon />}
                onClick={handleExportJSON}
                disabled={!hasEntries || isOperationActive}
                sx={{ textTransform: 'none' }}
                aria-label={st.exportJSON || 'Export JSON'}
              >
                {st.exportJSON || 'Export JSON'}
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={hasEntries ? '' : noEntriesTooltip} arrow>
            <span>
              <Button
                variant="outlined"
                startIcon={<TableChartIcon />}
                onClick={handleExportCSV}
                disabled={!hasEntries || isOperationActive}
                sx={{ textTransform: 'none' }}
                aria-label={st.exportCSV || 'Export CSV'}
              >
                {st.exportCSV || 'Export CSV'}
              </Button>
            </span>
          </Tooltip>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Import area */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {st.importTitle || 'Import Data'}
        </Typography>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<FileDownloadIcon />}
          onClick={handleImportClick}
          disabled={isOperationActive}
          sx={{ textTransform: 'none' }}
          aria-label={st.importButton || 'Import from File'}
        >
          {st.importButton || 'Import from File'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.csv"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          aria-hidden="true"
          data-testid="import-file-input"
        />
      </Paper>

      {/* Import Preview Dialog */}
      <ImportPreviewDialog
        open={importHook.state !== 'idle'}
        importHook={importHook}
        onClose={handleDialogClose}
      />

      {/* Snackbar for export feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default memo(ImportExportSection);
