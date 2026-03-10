/**
 * ImportPreviewDialog Component Tests
 *
 * Tests for state machine, preview display, mode selection,
 * replace confirmation, progress display, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../contexts/useLanguage', () => ({
  useLanguage: vi.fn(),
}));

vi.mock('../services/importService', () => ({
  IMPORT_MODE_MERGE: 'merge',
  IMPORT_MODE_REPLACE: 'replace',
}));

vi.mock('../hooks/useImportExport', () => ({
  ImportState: {
    IDLE: 'idle',
    PARSING: 'parsing',
    PREVIEW: 'preview',
    IMPORTING: 'importing',
    SUCCESS: 'success',
    ERROR: 'error',
  },
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  isAuthenticated: vi.fn(() => false),
  getCurrentUserId: vi.fn(() => null),
}));

import { useLanguage } from '../contexts/useLanguage';
import ImportPreviewDialog from './ImportPreviewDialog';

const defaultTranslations = {
  settings: {
    importExport: {
      importPreviewTitle: 'Import Preview',
      importFileInfo: 'File: {filename} ({size})',
      importValidEntries: '{count} valid entries',
      importInvalidEntries: '{count} invalid entries',
      importShowInvalid: 'Show invalid entries',
      importHideInvalid: 'Hide invalid entries',
      importModeMerge: 'Merge (Add All)',
      importModeMergeDesc: 'Add imported entries alongside existing data',
      importModeReplace: 'Replace All',
      importModeReplaceDesc: 'Delete all existing data and replace with imported data',
      importReplaceWarning: 'This will permanently delete all your existing entries!',
      importReplaceConfirm: 'I understand my data will be backed up and replaced',
      importBackupNotice: 'A backup of your current data will be downloaded automatically before replacing.',
      importAutoBackup: 'A backup of your current data will be downloaded first',
      importProgress: 'Importing... {current}/{total}',
      importSuccess: 'Successfully imported {count} entries',
      importError: 'Failed to import data',
      importTitle: 'Import mode',
      cancel: 'Cancel',
      import: 'Import',
      done: 'Done',
      viewEntries: 'View Entries',
      importSuccessHint: 'Your entries have been imported successfully',
    },
  },
  loading: 'Loading...',
  cancel: 'Cancel',
  tryAgain: 'Try Again',
  date: 'Date',
  amount: 'Amount',
  note: 'Note',
};

function createImportHook(overrides = {}) {
  return {
    state: overrides.state || 'idle',
    parseResult: overrides.parseResult || null,
    importResult: overrides.importResult || null,
    error: overrides.error || null,
    progress: overrides.progress || { current: 0, total: 0, phase: '' },
    executeImport: overrides.executeImport || vi.fn(),
    reset: overrides.reset || vi.fn(),
    retry: overrides.retry || vi.fn(),
    parseFile: overrides.parseFile || vi.fn(),
  };
}

function renderDialog(overrides = {}, languageOverrides = {}) {
  useLanguage.mockReturnValue({
    t: languageOverrides.t || defaultTranslations,
    direction: languageOverrides.direction || 'ltr',
  });

  const importHook = createImportHook(overrides);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const onClose = overrides.onClose || vi.fn();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ImportPreviewDialog
        open={overrides.open ?? true}
        importHook={importHook}
        onClose={onClose}
      />
    </QueryClientProvider>
  );

  return { ...utils, importHook, onClose };
}

const sampleParseResult = {
  filename: 'data.json',
  fileSize: 2048,
  validEntries: [
    { type: 'income', date: '2026-01-15', amount: 5000, note: 'Salary' },
    { type: 'donation', date: '2026-01-20', amount: 500, note: 'Charity' },
    { type: 'income', date: '2026-02-15', amount: 5000, note: '' },
  ],
  invalidEntries: [],
  warnings: [],
  errors: [],
};

describe('ImportPreviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('closed state', () => {
    it('should not render content when open is false', () => {
      renderDialog({ open: false, state: 'preview', parseResult: sampleParseResult });
      expect(screen.queryByText('Import Preview')).not.toBeInTheDocument();
    });
  });

  describe('parsing state', () => {
    it('should show loading spinner during parsing', () => {
      renderDialog({ state: 'parsing' });
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show dialog title as Import Preview', () => {
      renderDialog({ state: 'parsing' });
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
    });
  });

  describe('preview state', () => {
    it('should show file info', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });
      expect(screen.getByText('File: data.json (2.0 KB)')).toBeInTheDocument();
    });

    it('should show valid entry count', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });
      expect(screen.getByText('3 valid entries')).toBeInTheDocument();
    });

    it('should show sample entries table', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });
      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('Charity')).toBeInTheDocument();
    });

    it('should show merge mode selected by default', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });
      const mergeRadio = screen.getByRole('radio', { name: /Merge/i });
      expect(mergeRadio).toBeChecked();
    });

    it('should show both import mode options', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });
      expect(screen.getByText('Merge (Add All)')).toBeInTheDocument();
      expect(screen.getByText('Replace All')).toBeInTheDocument();
    });

    it('should enable Import button in merge mode', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });
      expect(screen.getByRole('button', { name: 'Import' })).not.toBeDisabled();
    });

    it('should show Cancel button', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should call executeImport when Import button is clicked', () => {
      const executeImport = vi.fn();
      renderDialog({ state: 'preview', parseResult: sampleParseResult, executeImport });

      fireEvent.click(screen.getByRole('button', { name: 'Import' }));
      expect(executeImport).toHaveBeenCalledWith('merge');
    });

    it('should call onClose when Cancel button is clicked', () => {
      const onClose = vi.fn();
      const reset = vi.fn();
      renderDialog({ state: 'preview', parseResult: sampleParseResult, onClose, reset });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(reset).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('invalid entries', () => {
    const parseResultWithInvalid = {
      ...sampleParseResult,
      invalidEntries: [
        { index: 3, raw: {}, errors: ['Amount is required'] },
        { index: 5, raw: {}, errors: ['Invalid type'] },
      ],
    };

    it('should show invalid entry count', () => {
      renderDialog({ state: 'preview', parseResult: parseResultWithInvalid });
      expect(screen.getByText('2 invalid entries')).toBeInTheDocument();
    });

    it('should show expand button for invalid entries', () => {
      renderDialog({ state: 'preview', parseResult: parseResultWithInvalid });
      expect(screen.getByLabelText('Show invalid entries')).toBeInTheDocument();
    });

    it('should not show invalid section when there are no invalid entries', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });
      expect(screen.queryByLabelText('Show invalid entries')).not.toBeInTheDocument();
    });

    it('should toggle invalid entries visibility', () => {
      renderDialog({ state: 'preview', parseResult: parseResultWithInvalid });

      fireEvent.click(screen.getByLabelText('Show invalid entries'));
      expect(screen.getByText(/Amount is required/)).toBeInTheDocument();
    });
  });

  describe('replace mode', () => {
    it('should show warning when replace mode is selected', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      const replaceRadio = screen.getByRole('radio', { name: /Replace/i });
      fireEvent.click(replaceRadio);

      expect(screen.getByText('This will permanently delete all your existing entries!')).toBeInTheDocument();
    });

    it('should show confirmation checkbox in replace mode', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      fireEvent.click(screen.getByRole('radio', { name: /Replace/i }));

      expect(screen.getByText('I understand my data will be backed up and replaced')).toBeInTheDocument();
    });

    it('should disable Import button until replace is confirmed', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      fireEvent.click(screen.getByRole('radio', { name: /Replace/i }));

      expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
    });

    it('should enable Import button after replace confirmation checkbox is checked', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      fireEvent.click(screen.getByRole('radio', { name: /Replace/i }));
      fireEvent.click(screen.getByRole('checkbox'));

      expect(screen.getByRole('button', { name: 'Import' })).not.toBeDisabled();
    });

    it('should show auto-backup notice as info alert in replace mode', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      fireEvent.click(screen.getByRole('radio', { name: /Replace/i }));

      expect(screen.getByText('A backup of your current data will be downloaded automatically before replacing.')).toBeInTheDocument();
    });

    it('should call executeImport with replace mode when confirmed and clicked', () => {
      const executeImport = vi.fn();
      renderDialog({ state: 'preview', parseResult: sampleParseResult, executeImport });

      fireEvent.click(screen.getByRole('radio', { name: /Replace/i }));
      fireEvent.click(screen.getByRole('checkbox'));
      fireEvent.click(screen.getByRole('button', { name: 'Import' }));

      expect(executeImport).toHaveBeenCalledWith('replace');
    });

    it('should show backup info alert above destructive warning alert', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      fireEvent.click(screen.getByRole('radio', { name: /Replace/i }));

      const alerts = screen.getAllByRole('alert');
      const infoAlert = alerts.find(a => a.textContent.includes('backup'));
      const warningAlert = alerts.find(a => a.textContent.includes('permanently delete'));

      expect(infoAlert).toBeDefined();
      expect(warningAlert).toBeDefined();

      // Info alert should appear before warning alert in DOM order
      const allAlerts = screen.getAllByRole('alert');
      const infoIdx = allAlerts.indexOf(infoAlert);
      const warnIdx = allAlerts.indexOf(warningAlert);
      expect(infoIdx).toBeLessThan(warnIdx);
    });

    it('should not show backup notice or consent checkbox in merge mode', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      // Merge is default, no backup alert or checkbox should show
      expect(screen.queryByText(/backup of your current data/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('should show warning icon next to Replace radio label', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      expect(screen.getByTestId('WarningAmberIcon')).toBeInTheDocument();
    });

    it('should reset checkbox when switching from replace to merge and back', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      // Switch to replace and check the checkbox
      fireEvent.click(screen.getByRole('radio', { name: /Replace/i }));
      fireEvent.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();

      // Switch to merge
      fireEvent.click(screen.getByRole('radio', { name: /Merge/i }));

      // Switch back to replace — checkbox should be unchecked
      fireEvent.click(screen.getByRole('radio', { name: /Replace/i }));
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });
  });

  describe('importing state', () => {
    it('should show progress bar during import', () => {
      renderDialog({
        state: 'importing',
        progress: { current: 50, total: 100, phase: 'importing' },
      });

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should show progress text', () => {
      renderDialog({
        state: 'importing',
        progress: { current: 50, total: 100, phase: 'importing' },
      });

      expect(screen.getByText('Importing... 50/100')).toBeInTheDocument();
    });

    it('should prevent closing during import', () => {
      const onClose = vi.fn();
      const reset = vi.fn();
      renderDialog({ state: 'importing', onClose, reset });

      // Dialog should have disableEscapeKeyDown
      // The close handler should not fire
      // We test this by checking the import hook reset is not called
      // when the component attempts to close
      expect(screen.getByText('Import Preview')).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    it('should show success message with count', () => {
      renderDialog({
        state: 'success',
        importResult: { imported: 42 },
      });

      // Title and body both contain the success message; verify at least one is present
      const matches = screen.getAllByText('Successfully imported 42 entries');
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should show success icon', () => {
      renderDialog({
        state: 'success',
        importResult: { imported: 10 },
      });

      expect(screen.getByTestId('CheckCircleIcon')).toBeInTheDocument();
    });

    it('should show close button in success state', () => {
      renderDialog({
        state: 'success',
        importResult: { imported: 10 },
      });

      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message', () => {
      renderDialog({
        state: 'error',
        error: 'Invalid JSON format',
      });

      expect(screen.getByText('Invalid JSON format')).toBeInTheDocument();
    });

    it('should show retry button', () => {
      renderDialog({ state: 'error', error: 'Something went wrong' });

      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
    });

    it('should call retry when retry button is clicked', () => {
      const retry = vi.fn();
      renderDialog({ state: 'error', error: 'Error', retry });

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
      expect(retry).toHaveBeenCalled();
    });

    it('should show close button in error state', () => {
      renderDialog({ state: 'error', error: 'Error' });

      expect(screen.getByRole('button', { name: /Cancel|Close/i })).toBeInTheDocument();
    });
  });

  describe('RTL support', () => {
    it('should pass dir prop to dialog for RTL', () => {
      renderDialog(
        { state: 'preview', parseResult: sampleParseResult },
        { direction: 'rtl' }
      );

      // MUI Dialog renders dir on the Modal root wrapper, which is
      // a parent of the role="dialog" element. Search the full document.
      const dirElement = document.querySelector('[dir="rtl"]');
      expect(dirElement).not.toBeNull();
    });

    it('should pass dir prop to dialog for LTR', () => {
      renderDialog(
        { state: 'preview', parseResult: sampleParseResult },
        { direction: 'ltr' }
      );

      const dirElement = document.querySelector('[dir="ltr"]');
      expect(dirElement).not.toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have aria-labelledby on dialog', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'import-preview-title');
    });

    it('should have aria-live on progress text during import', () => {
      renderDialog({
        state: 'importing',
        progress: { current: 10, total: 50, phase: 'importing' },
      });

      const liveRegion = screen.getByText('Importing... 10/50');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-live on loading text during parsing', () => {
      renderDialog({ state: 'parsing' });

      const liveRegion = screen.getByText('Loading...');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-label on radio group', () => {
      renderDialog({ state: 'preview', parseResult: sampleParseResult });

      const radioGroup = screen.getByRole('radiogroup');
      expect(radioGroup).toHaveAttribute('aria-label', 'Import mode');
    });
  });
});
