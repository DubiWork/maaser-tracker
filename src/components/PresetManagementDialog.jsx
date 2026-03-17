/**
 * PresetManagementDialog
 *
 * A dialog for managing note presets (add / edit / delete / reset to defaults).
 * Shows all presets for a given type ('income' | 'donation') and lets the user
 * add new presets, inline-edit existing ones, delete with confirmation, or
 * reset everything back to the built-in defaults.
 *
 * Props:
 *   open    {boolean}          - Whether the dialog is visible
 *   onClose {() => void}       - Called when the dialog should close
 *   type    {'income'|'donation'} - Which preset group to manage
 */

import { useState, useCallback, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Box,
  Typography,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import { useLanguage } from '../contexts/useLanguage';
import { usePresets, useAddPreset, useUpdatePreset, useDeletePreset } from '../hooks/usePresets';
import { resetDefaultPresets } from '../services/presetService';
import { useQueryClient } from '@tanstack/react-query';
import { presetQueryKeys } from '../hooks/usePresets';

// ─── Confirmation sub-dialog ───────────────────────────────────────────────

function ConfirmationDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="contained" color="error" sx={{ textTransform: 'none' }}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

function PresetManagementDialog({ open, onClose, type }) {
  const { t, direction } = useLanguage();
  const p = t?.presets || {};

  const queryClient = useQueryClient();
  const { data: presets, isLoading } = usePresets(type);
  const addPresetMutation = useAddPreset();
  const updatePresetMutation = useUpdatePreset();
  const deletePresetMutation = useDeletePreset();

  // ── Local state ──────────────────────────────────────────────────────────
  const [addText, setAddText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // preset object to delete
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ── Add preset ───────────────────────────────────────────────────────────
  const handleAdd = useCallback(async () => {
    const trimmed = addText.trim();
    if (!trimmed) return;

    await addPresetMutation.mutateAsync({ text: trimmed, type });
    setAddText('');
  }, [addText, addPresetMutation, type]);

  const handleAddKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  // ── Edit preset ──────────────────────────────────────────────────────────
  const startEditing = useCallback((preset) => {
    setEditingId(preset.id);
    setEditText(preset.text);
  }, []);

  const commitEdit = useCallback(async () => {
    const trimmed = editText.trim();
    if (!trimmed || editingId === null) {
      setEditingId(null);
      setEditText('');
      return;
    }

    await updatePresetMutation.mutateAsync({ id: editingId, updates: { text: trimmed } });
    setEditingId(null);
    setEditText('');
  }, [editText, editingId, updatePresetMutation]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  const handleEditKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    },
    [commitEdit, cancelEdit]
  );

  // ── Delete preset ─────────────────────────────────────────────────────────
  const handleDeleteClick = useCallback((preset) => {
    setDeleteTarget(preset);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deletePresetMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deletePresetMutation]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  // ── Reset defaults ────────────────────────────────────────────────────────
  const handleResetClick = useCallback(() => {
    setShowResetConfirm(true);
  }, []);

  const handleResetConfirm = useCallback(async () => {
    await resetDefaultPresets();
    queryClient.invalidateQueries({ queryKey: presetQueryKeys.all });
    setShowResetConfirm(false);
  }, [queryClient]);

  const handleResetCancel = useCallback(() => {
    setShowResetConfirm(false);
  }, []);

  // ── Derived flags ─────────────────────────────────────────────────────────
  const isAddPending = addPresetMutation.isPending;
  const isAddDisabled = !addText.trim() || isAddPending;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        dir={direction}
        aria-labelledby="preset-management-title"
      >
        <DialogTitle id="preset-management-title">
          {p.managePresetsTitle || 'Manage Presets'}
        </DialogTitle>

        <DialogContent>
          {/* Add new preset form */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder={p.addPresetPlaceholder || 'New preset...'}
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              onKeyDown={handleAddKeyDown}
              slotProps={{
                input: {
                  endAdornment: isAddPending ? (
                    <InputAdornment position="end">
                      <CircularProgress size={16} />
                    </InputAdornment>
                  ) : null,
                },
              }}
              disabled={isAddPending}
            />
            <IconButton
              color="primary"
              onClick={handleAdd}
              disabled={isAddDisabled}
              aria-label={p.add || 'Add'}
            >
              <AddIcon />
            </IconButton>
          </Box>

          {/* Preset list */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : !presets || presets.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              {p.emptyState || 'No presets yet. Add one above.'}
            </Typography>
          ) : (
            <List dense disablePadding>
              {presets.map((preset) => (
                <ListItem key={preset.id} divider>
                  {editingId === preset.id ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      onBlur={commitEdit}
                      autoFocus
                    />
                  ) : (
                    <>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {preset.text}
                            {preset.isDefault && (
                              <Chip
                                label={p.defaultBadge || 'Default'}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          aria-label={p.editPreset || 'Edit preset'}
                          onClick={() => startEditing(preset)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          aria-label={p.deletePreset || 'Delete preset'}
                          onClick={() => handleDeleteClick(preset)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
          <Button
            startIcon={<RestoreIcon />}
            onClick={handleResetClick}
            size="small"
            sx={{ textTransform: 'none' }}
          >
            {p.resetDefaults || 'Reset to defaults'}
          </Button>
          <Button onClick={onClose} sx={{ textTransform: 'none' }}>
            {p.closeButton || 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      {!!deleteTarget && (
        <ConfirmationDialog
          open={true}
          title={p.confirmDeleteTitle || 'Delete Preset?'}
          message={p.confirmDeleteMessage || 'Are you sure you want to delete this preset?'}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* Reset defaults confirmation */}
      {showResetConfirm && (
        <ConfirmationDialog
          open={true}
          title={p.confirmResetTitle || 'Reset to Defaults?'}
          message={p.confirmResetMessage || 'This will delete all presets and restore the defaults.'}
          onConfirm={handleResetConfirm}
          onCancel={handleResetCancel}
        />
      )}
    </>
  );
}

export default memo(PresetManagementDialog);
