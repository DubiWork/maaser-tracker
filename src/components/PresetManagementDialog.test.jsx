/**
 * Tests for PresetManagementDialog Component
 *
 * Tests cover:
 * - Renders dialog with presets list
 * - Add new preset flow
 * - Edit existing preset flow
 * - Delete preset with confirmation
 * - Reset defaults with confirmation
 * - Empty state
 * - Loading and mutation pending states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PresetManagementDialog from './PresetManagementDialog';

// ─── Mock hooks ───────────────────────────────────────────────────────────────

vi.mock('../hooks/usePresets', () => ({
  usePresets: vi.fn(),
  useAddPreset: vi.fn(),
  useUpdatePreset: vi.fn(),
  useDeletePreset: vi.fn(),
  presetQueryKeys: {
    all: ['presets'],
    lists: () => ['presets', 'list'],
    byType: (type) => ['presets', 'list', type],
  },
}));

vi.mock('../services/presetService', () => ({
  resetDefaultPresets: vi.fn(),
}));

vi.mock('../contexts/useLanguage', () => ({
  useLanguage: vi.fn(),
}));

import { usePresets, useAddPreset, useUpdatePreset, useDeletePreset } from '../hooks/usePresets';
import { resetDefaultPresets } from '../services/presetService';
import { useLanguage } from '../contexts/useLanguage';

// ─── Sample data ──────────────────────────────────────────────────────────────

const mockIncomePresets = [
  { id: 1, text: 'Salary', type: 'income', isDefault: true, order: 0, createdAt: 1000 },
  { id: 2, text: 'Bonus', type: 'income', isDefault: true, order: 1, createdAt: 1001 },
  { id: 3, text: 'Consulting', type: 'income', isDefault: false, order: 2, createdAt: 1002 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultT = {
  presets: {
    managePresetsTitle: 'Manage Presets',
    addPresetPlaceholder: 'New preset...',
    add: 'Add',
    editPreset: 'Edit preset',
    deletePreset: 'Delete preset',
    defaultBadge: 'Default',
    resetDefaults: 'Reset to defaults',
    confirmDeleteTitle: 'Delete Preset?',
    confirmDeleteMessage: 'Are you sure you want to delete this preset?',
    confirmResetTitle: 'Reset to Defaults?',
    confirmResetMessage: 'This will delete all presets and restore the defaults.',
    confirmButton: 'Confirm',
    cancelButton: 'Cancel',
    closeButton: 'Close',
    emptyState: 'No presets yet. Add one above.',
    saving: 'Saving...',
  },
};

function createMutationFn(overrides = {}) {
  return {
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    ...overrides,
  };
}

function setupMocks({
  presets = mockIncomePresets,
  presetsLoading = false,
  addOverrides = {},
  updateOverrides = {},
  deleteOverrides = {},
} = {}) {
  usePresets.mockReturnValue({ data: presets, isLoading: presetsLoading });
  useAddPreset.mockReturnValue(createMutationFn(addOverrides));
  useUpdatePreset.mockReturnValue(createMutationFn(updateOverrides));
  useDeletePreset.mockReturnValue(createMutationFn(deleteOverrides));
  useLanguage.mockReturnValue({ t: defaultT, direction: 'ltr' });
  resetDefaultPresets.mockResolvedValue(undefined);
}

function renderDialog(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    type: 'income',
    ...props,
  };

  return {
    ...render(
      <QueryClientProvider client={queryClient}>
        <PresetManagementDialog {...defaultProps} />
      </QueryClientProvider>
    ),
    onClose: defaultProps.onClose,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PresetManagementDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('should render dialog when open is true', () => {
      renderDialog();

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      renderDialog({ open: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show dialog title "Manage Presets"', () => {
      renderDialog();

      expect(screen.getByText('Manage Presets')).toBeInTheDocument();
    });

    it('should render all presets for the given type', () => {
      renderDialog({ type: 'income' });

      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('Bonus')).toBeInTheDocument();
      expect(screen.getByText('Consulting')).toBeInTheDocument();
    });

    it('should call usePresets with the given type', () => {
      renderDialog({ type: 'donation' });

      expect(usePresets).toHaveBeenCalledWith('donation');
    });

    it('should show "Default" badge on default presets', () => {
      renderDialog();

      // Salary and Bonus are default, Consulting is not
      const defaultBadges = screen.getAllByText('Default');
      expect(defaultBadges).toHaveLength(2);
    });

    it('should not show "Default" badge on custom presets', () => {
      setupMocks({ presets: [{ id: 3, text: 'Consulting', type: 'income', isDefault: false, order: 2, createdAt: 1002 }] });
      renderDialog();

      expect(screen.queryByText('Default')).not.toBeInTheDocument();
    });

    it('should show add input field and add button', () => {
      renderDialog();

      expect(screen.getByPlaceholderText('New preset...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });

    it('should show edit icon button for each preset', () => {
      renderDialog();

      const editButtons = screen.getAllByLabelText('Edit preset');
      expect(editButtons).toHaveLength(mockIncomePresets.length);
    });

    it('should show delete icon button for each preset', () => {
      renderDialog();

      const deleteButtons = screen.getAllByLabelText('Delete preset');
      expect(deleteButtons).toHaveLength(mockIncomePresets.length);
    });

    it('should show "Reset to defaults" button', () => {
      renderDialog();

      expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument();
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  describe('empty state', () => {
    it('should show empty state message when no presets', () => {
      setupMocks({ presets: [] });
      renderDialog();

      expect(screen.getByText('No presets yet. Add one above.')).toBeInTheDocument();
    });

    it('should not show empty state when presets exist', () => {
      renderDialog();

      expect(screen.queryByText('No presets yet. Add one above.')).not.toBeInTheDocument();
    });
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('should show loading indicator while presets are loading', () => {
      setupMocks({ presetsLoading: true, presets: undefined });
      renderDialog();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  // ── Add preset ─────────────────────────────────────────────────────────────

  describe('add preset', () => {
    it('should call addPreset mutation when add button is clicked with text', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({});
      useAddPreset.mockReturnValue(createMutationFn({ mutateAsync }));
      renderDialog({ type: 'income' });

      const input = screen.getByPlaceholderText('New preset...');
      await user.type(input, 'New Preset');
      await user.click(screen.getByRole('button', { name: /add/i }));

      expect(mutateAsync).toHaveBeenCalledWith({ text: 'New Preset', type: 'income' });
    });

    it('should clear input after successful add', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByPlaceholderText('New preset...');
      await user.type(input, 'New Preset');
      await user.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should disable add button when input is empty', () => {
      renderDialog();

      const addButton = screen.getByRole('button', { name: /add/i });
      expect(addButton).toBeDisabled();
    });

    it('should enable add button when input has text', async () => {
      const user = userEvent.setup();
      renderDialog();

      const input = screen.getByPlaceholderText('New preset...');
      await user.type(input, 'New Preset');

      const addButton = screen.getByRole('button', { name: /add/i });
      expect(addButton).not.toBeDisabled();
    });

    it('should submit add form on Enter key', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({});
      useAddPreset.mockReturnValue(createMutationFn({ mutateAsync }));
      renderDialog({ type: 'income' });

      const input = screen.getByPlaceholderText('New preset...');
      await user.type(input, 'New Preset{Enter}');

      expect(mutateAsync).toHaveBeenCalledWith({ text: 'New Preset', type: 'income' });
    });

    it('should show loading state when add mutation is pending', () => {
      useAddPreset.mockReturnValue(createMutationFn({ isPending: true }));
      renderDialog();

      // Add button should be disabled during pending
      const addButton = screen.getByRole('button', { name: /add/i });
      expect(addButton).toBeDisabled();
    });
  });

  // ── Edit preset ────────────────────────────────────────────────────────────

  describe('edit preset', () => {
    it('should show inline edit mode when edit icon is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      const editButtons = screen.getAllByLabelText('Edit preset');
      await user.click(editButtons[0]); // Edit first preset (Salary)

      // Should show an input field with the preset text
      const editInput = screen.getByDisplayValue('Salary');
      expect(editInput).toBeInTheDocument();
    });

    it('should call updatePreset mutation when edit is saved', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({});
      useUpdatePreset.mockReturnValue(createMutationFn({ mutateAsync }));
      renderDialog();

      const editButtons = screen.getAllByLabelText('Edit preset');
      await user.click(editButtons[0]);

      const editInput = screen.getByDisplayValue('Salary');
      await user.clear(editInput);
      await user.type(editInput, 'Updated Salary');

      // Press Enter to save
      await user.keyboard('{Enter}');

      expect(mutateAsync).toHaveBeenCalledWith({ id: 1, updates: { text: 'Updated Salary' } });
    });

    it('should cancel edit on Escape key', async () => {
      const user = userEvent.setup();
      renderDialog();

      const editButtons = screen.getAllByLabelText('Edit preset');
      await user.click(editButtons[0]);

      const editInput = screen.getByDisplayValue('Salary');
      await user.clear(editInput);
      await user.type(editInput, 'Changed Text');

      await user.keyboard('{Escape}');

      // Original text should be visible again
      expect(screen.getByText('Salary')).toBeInTheDocument();
      // Edit input should be gone
      expect(screen.queryByDisplayValue('Changed Text')).not.toBeInTheDocument();
    });

    it('should exit edit mode after successful save', async () => {
      const user = userEvent.setup();
      renderDialog();

      const editButtons = screen.getAllByLabelText('Edit preset');
      await user.click(editButtons[0]);

      // Input starts with preset text; press Enter to save
      expect(screen.getByDisplayValue('Salary')).toBeInTheDocument();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Salary')).not.toBeInTheDocument();
      });
    });
  });

  // ── Delete preset ──────────────────────────────────────────────────────────

  describe('delete preset', () => {
    it('should show confirmation dialog when delete icon is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      const deleteButtons = screen.getAllByLabelText('Delete preset');
      await user.click(deleteButtons[0]);

      expect(screen.getByText('Delete Preset?')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this preset?')).toBeInTheDocument();
    });

    it('should call deletePreset mutation when confirmed', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({});
      useDeletePreset.mockReturnValue(createMutationFn({ mutateAsync }));
      renderDialog();

      const deleteButtons = screen.getAllByLabelText('Delete preset');
      await user.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(mutateAsync).toHaveBeenCalledWith(1);
    });

    it('should close confirmation dialog when cancelled', async () => {
      const user = userEvent.setup();
      renderDialog();

      const deleteButtons = screen.getAllByLabelText('Delete preset');
      await user.click(deleteButtons[0]);

      expect(screen.getByText('Delete Preset?')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText('Delete Preset?')).not.toBeInTheDocument();
    });

    it('should not call deletePreset when cancelled', async () => {
      const user = userEvent.setup();
      const mutateAsync = vi.fn().mockResolvedValue({});
      useDeletePreset.mockReturnValue(createMutationFn({ mutateAsync }));
      renderDialog();

      const deleteButtons = screen.getAllByLabelText('Delete preset');
      await user.click(deleteButtons[0]);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mutateAsync).not.toHaveBeenCalled();
    });
  });

  // ── Reset defaults ─────────────────────────────────────────────────────────

  describe('reset defaults', () => {
    it('should show confirmation dialog when reset button is clicked', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: /reset to defaults/i }));

      expect(screen.getByText('Reset to Defaults?')).toBeInTheDocument();
      expect(screen.getByText('This will delete all presets and restore the defaults.')).toBeInTheDocument();
    });

    it('should call resetDefaultPresets when confirmed', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: /reset to defaults/i }));

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      expect(resetDefaultPresets).toHaveBeenCalled();
    });

    it('should close confirmation dialog when cancelled', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: /reset to defaults/i }));

      expect(screen.getByText('Reset to Defaults?')).toBeInTheDocument();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(screen.queryByText('Reset to Defaults?')).not.toBeInTheDocument();
    });

    it('should not call resetDefaultPresets when cancelled', async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole('button', { name: /reset to defaults/i }));

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(resetDefaultPresets).not.toHaveBeenCalled();
    });
  });

  // ── Close behavior ─────────────────────────────────────────────────────────

  describe('close behavior', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderDialog({ onClose });

      await user.click(screen.getByRole('button', { name: /close/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  // ── RTL support ────────────────────────────────────────────────────────────

  describe('RTL support', () => {
    it('should apply rtl direction when language is Hebrew', () => {
      useLanguage.mockReturnValue({ t: defaultT, direction: 'rtl' });
      renderDialog();

      const dialog = screen.getByRole('dialog');
      const dirElement = dialog.closest('[dir="rtl"]') || dialog.querySelector('[dir="rtl"]');
      expect(dirElement || dialog.parentElement?.closest('[dir="rtl"]')).toBeTruthy();
    });
  });

  // ── Memoization ────────────────────────────────────────────────────────────

  describe('memoization', () => {
    it('should be exported as a memo component', async () => {
      const mod = await import('./PresetManagementDialog');
      expect(mod.default.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });
});
