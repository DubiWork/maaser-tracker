import { useState, useCallback, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  Alert,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useLanguage } from '../contexts/useLanguage';
import { useGdprActions } from '../hooks/useGdprActions';

const DialogState = {
  IDLE: 'idle',
  EXPORTING: 'exporting',
  EXPORT_SUCCESS: 'export-success',
  CONFIRMING_DELETE: 'confirming-delete',
  DELETING: 'deleting',
  DELETE_SUCCESS: 'delete-success',
  ERROR: 'error',
};

function deriveState({ showDeleteConfirm, isExporting, exportSuccess, exportError, isDeleting, deleteSuccess, deleteError }) {
  if (isDeleting) return DialogState.DELETING;
  if (deleteSuccess) return DialogState.DELETE_SUCCESS;
  if (deleteError) return DialogState.ERROR;
  if (isExporting) return DialogState.EXPORTING;
  if (exportSuccess) return DialogState.EXPORT_SUCCESS;
  if (exportError) return DialogState.ERROR;
  if (showDeleteConfirm) return DialogState.CONFIRMING_DELETE;
  return DialogState.IDLE;
}

function DataManagementDialog({ open, onClose, initialAction = null }) {
  const { t, direction } = useLanguage();
  const {
    handleExport,
    isExporting,
    exportSuccess,
    exportError,
    resetExport,
    handleDelete,
    isDeleting,
    deleteSuccess,
    deleteError,
    resetDelete,
  } = useGdprActions();

  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(() => initialAction === 'delete');

  const dm = t.dataManagement || {};

  const asyncState = deriveState({
    showDeleteConfirm,
    isExporting,
    exportSuccess,
    exportError,
    isDeleting,
    deleteSuccess,
    deleteError,
  });

  const isOperationInProgress = asyncState === DialogState.EXPORTING || asyncState === DialogState.DELETING;

  const handleClose = useCallback(() => {
    if (isOperationInProgress) return;

    resetExport();
    resetDelete();
    setDeleteConfirmed(false);
    setShowDeleteConfirm(false);
    onClose();
  }, [isOperationInProgress, resetExport, resetDelete, onClose]);

  const handleExportClick = useCallback(() => {
    resetDelete();
    handleExport();
  }, [resetDelete, handleExport]);

  const handleDeleteClick = useCallback(() => {
    resetExport();
    setShowDeleteConfirm(true);
  }, [resetExport]);

  const handleConfirmDelete = useCallback(() => {
    handleDelete();
  }, [handleDelete]);

  const handleRetry = useCallback(() => {
    if (exportError) {
      resetExport();
      handleExport();
    } else if (deleteError) {
      resetDelete();
      handleDelete();
    }
  }, [exportError, deleteError, resetExport, resetDelete, handleExport, handleDelete]);

  const handleBackToIdle = useCallback(() => {
    resetExport();
    resetDelete();
    setDeleteConfirmed(false);
    setShowDeleteConfirm(false);
  }, [resetExport, resetDelete]);

  const handleDeleteSuccessClose = useCallback(() => {
    resetDelete();
    setDeleteConfirmed(false);
    setShowDeleteConfirm(false);
    onClose();
  }, [resetDelete, onClose]);

  const renderContent = () => {
    switch (asyncState) {
      case DialogState.IDLE:
        return (
          <>
            <DialogContent id="data-management-content">
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportClick}
                  sx={{ textTransform: 'none', justifyContent: 'flex-start', py: 1.5 }}
                >
                  {dm.exportMyData || 'Export my data'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  startIcon={<DeleteForeverIcon />}
                  onClick={handleDeleteClick}
                  sx={{ textTransform: 'none', justifyContent: 'flex-start', py: 1.5 }}
                >
                  {dm.deleteCloudData || 'Delete cloud data'}
                </Button>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose} sx={{ textTransform: 'none' }} size="large">
                {dm.close || 'Close'}
              </Button>
            </DialogActions>
          </>
        );

      case DialogState.EXPORTING:
        return (
          <>
            <DialogContent id="data-management-content">
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography aria-live="polite">
                  {dm.exportingProgress || 'Exporting...'}
                </Typography>
              </Box>
            </DialogContent>
          </>
        );

      case DialogState.EXPORT_SUCCESS:
        return (
          <>
            <DialogContent id="data-management-content">
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {dm.exportSuccess || 'Export Complete!'}
                </Typography>
                <Typography color="text.secondary" aria-live="polite">
                  {dm.exportDescription || 'Your data has been downloaded.'}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleClose} variant="contained" sx={{ textTransform: 'none' }} size="large">
                {dm.close || 'Close'}
              </Button>
            </DialogActions>
          </>
        );

      case DialogState.CONFIRMING_DELETE:
        return (
          <>
            <DialogContent id="data-management-content">
              <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
                {dm.deleteWarning || 'This will permanently delete all your data from the cloud. Local data on this device will not be affected.'}
              </Alert>
              <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 'medium' }}>
                {dm.deleteConfirmation || 'This action cannot be undone. All your cloud data will be permanently deleted.'}
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={deleteConfirmed}
                    onChange={(e) => setDeleteConfirmed(e.target.checked)}
                    color="error"
                  />
                }
                label={dm.iUnderstandCheckbox || 'I understand this action cannot be undone'}
              />
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
              <Button onClick={handleBackToIdle} sx={{ textTransform: 'none' }} size="large">
                {dm.close || 'Close'}
              </Button>
              <Button
                variant="contained"
                color="error"
                size="large"
                startIcon={<DeleteForeverIcon />}
                disabled={!deleteConfirmed}
                onClick={handleConfirmDelete}
                sx={{ textTransform: 'none' }}
              >
                {dm.deleteCloudData || 'Delete cloud data'}
              </Button>
            </DialogActions>
          </>
        );

      case DialogState.DELETING:
        return (
          <>
            <DialogContent id="data-management-content">
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                <LinearProgress variant="indeterminate" sx={{ width: '100%', mb: 2, height: 6, borderRadius: 3 }} />
                <Typography aria-live="polite">
                  {dm.deletingProgress || 'Deleting...'}
                </Typography>
              </Box>
            </DialogContent>
          </>
        );

      case DialogState.DELETE_SUCCESS:
        return (
          <>
            <DialogContent id="data-management-content">
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {dm.deleteSuccess || 'Cloud Data Deleted'}
                </Typography>
                <Typography color="text.secondary" sx={{ textAlign: 'center' }} aria-live="polite">
                  {dm.deleteSuccessMessage || 'Your cloud data has been permanently deleted. Your local data on this device is unchanged.'}
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
              <Button onClick={handleDeleteSuccessClose} variant="contained" sx={{ textTransform: 'none' }} size="large">
                {dm.close || 'Close'}
              </Button>
            </DialogActions>
          </>
        );

      case DialogState.ERROR:
        return (
          <>
            <DialogContent id="data-management-content">
              <Alert severity="error" sx={{ mb: 2 }}>
                {exportError
                  ? (dm.exportErrorMessage || 'Could not export your data. Please try again.')
                  : (dm.deleteErrorMessage || 'Could not delete your cloud data. Please try again.')}
              </Alert>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
              <Button onClick={handleBackToIdle} sx={{ textTransform: 'none' }} size="large">
                {dm.close || 'Close'}
              </Button>
              <Button onClick={handleRetry} variant="contained" sx={{ textTransform: 'none' }} size="large">
                {t.tryAgain || 'Try Again'}
              </Button>
            </DialogActions>
          </>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (asyncState) {
      case DialogState.EXPORTING:
      case DialogState.EXPORT_SUCCESS:
        return dm.exportTitle || 'Export Your Data';
      case DialogState.CONFIRMING_DELETE:
      case DialogState.DELETING:
      case DialogState.DELETE_SUCCESS:
        return dm.deleteTitle || 'Delete Cloud Data';
      case DialogState.ERROR:
        return exportError
          ? (dm.exportError || 'Export Failed')
          : (dm.deleteError || 'Delete Failed');
      default:
        return dm.title || 'Data Management';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={isOperationInProgress ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      dir={direction}
      aria-labelledby="data-management-title"
      aria-describedby="data-management-content"
      disableEscapeKeyDown={isOperationInProgress}
    >
      <DialogTitle id="data-management-title" sx={{ textAlign: 'center', pb: 1 }}>
        {getTitle()}
      </DialogTitle>
      {renderContent()}
    </Dialog>
  );
}

export default memo(DataManagementDialog);
