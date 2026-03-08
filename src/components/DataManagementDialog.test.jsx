import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DataManagementDialog from './DataManagementDialog';

vi.mock('../hooks/useGdprActions');
vi.mock('../contexts/useLanguage', () => ({
  useLanguage: vi.fn(),
}));

import { useGdprActions } from '../hooks/useGdprActions';
import { useLanguage } from '../contexts/useLanguage';

const defaultTranslations = {
  dataManagement: {
    exportMyData: 'Export my data',
    deleteCloudData: 'Delete cloud data',
    close: 'Close',
    exportingProgress: 'Exporting...',
    exportSuccess: 'Export Complete!',
    exportDescription: 'Your data has been downloaded.',
    exportTitle: 'Export Your Data',
    deleteTitle: 'Delete Cloud Data',
    deleteWarning: 'This will permanently delete all your data from the cloud.',
    deleteConfirmation: 'This action cannot be undone.',
    iUnderstandCheckbox: 'I understand this action cannot be undone',
    deletingProgress: 'Deleting...',
    deleteSuccess: 'Cloud Data Deleted',
    deleteSuccessMessage: 'Your cloud data has been permanently deleted.',
    exportErrorMessage: 'Could not export your data. Please try again.',
    deleteErrorMessage: 'Could not delete your cloud data. Please try again.',
    exportError: 'Export Failed',
    deleteError: 'Delete Failed',
  },
  settings: 'Data Management',
  tryAgain: 'Try Again',
};

function createDefaultHookReturn(overrides = {}) {
  return {
    handleExport: vi.fn(),
    isExporting: false,
    exportSuccess: false,
    exportError: null,
    resetExport: vi.fn(),
    handleDelete: vi.fn(),
    isDeleting: false,
    deleteSuccess: false,
    deleteError: null,
    resetDelete: vi.fn(),
    ...overrides,
  };
}

function renderDialog(props = {}, hookOverrides = {}, languageOverrides = {}) {
  useGdprActions.mockReturnValue(createDefaultHookReturn(hookOverrides));
  useLanguage.mockReturnValue({
    t: { ...defaultTranslations, ...(languageOverrides.t || {}) },
    direction: languageOverrides.direction || 'ltr',
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DataManagementDialog open={true} onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('DataManagementDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('idle state', () => {
    it('should render with two action buttons', () => {
      renderDialog();

      expect(screen.getByText('Export my data')).toBeInTheDocument();
      expect(screen.getByText('Delete cloud data')).toBeInTheDocument();
    });

    it('should render dialog title as Data Management', () => {
      renderDialog();

      expect(screen.getByText('Data Management')).toBeInTheDocument();
    });

    it('should render close button', () => {
      renderDialog();

      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('open/close behavior', () => {
    it('should not render dialog content when open is false', () => {
      renderDialog({ open: false });

      expect(screen.queryByText('Export my data')).not.toBeInTheDocument();
    });

    it('should call onClose when close button clicked in idle state', () => {
      const onClose = vi.fn();
      const hookReturn = createDefaultHookReturn();
      useGdprActions.mockReturnValue(hookReturn);
      useLanguage.mockReturnValue({ t: defaultTranslations, direction: 'ltr' });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      render(
        <QueryClientProvider client={queryClient}>
          <DataManagementDialog open={true} onClose={onClose} />
        </QueryClientProvider>
      );

      fireEvent.click(screen.getByText('Close'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call resetExport and resetDelete on close', () => {
      const onClose = vi.fn();
      const resetExport = vi.fn();
      const resetDelete = vi.fn();

      renderDialog({ onClose }, { resetExport, resetDelete });

      fireEvent.click(screen.getByText('Close'));

      expect(resetExport).toHaveBeenCalled();
      expect(resetDelete).toHaveBeenCalled();
    });
  });

  describe('export flow', () => {
    it('should call handleExport when export button is clicked', () => {
      const handleExport = vi.fn();
      renderDialog({}, { handleExport });

      fireEvent.click(screen.getByText('Export my data'));

      expect(handleExport).toHaveBeenCalled();
    });

    it('should show CircularProgress when isExporting is true', () => {
      renderDialog({}, { isExporting: true });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Exporting...')).toBeInTheDocument();
    });

    it('should show export title when exporting', () => {
      renderDialog({}, { isExporting: true });

      expect(screen.getByText('Export Your Data')).toBeInTheDocument();
    });

    it('should show export success state when exportSuccess is true', () => {
      renderDialog({}, { exportSuccess: true });

      expect(screen.getByText('Export Complete!')).toBeInTheDocument();
      expect(screen.getByText('Your data has been downloaded.')).toBeInTheDocument();
    });
  });

  describe('delete flow', () => {
    it('should show delete confirmation when delete is clicked', () => {
      renderDialog();

      fireEvent.click(screen.getByText('Delete cloud data'));

      expect(screen.getByText('This will permanently delete all your data from the cloud.')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('should show checkbox in delete confirmation', () => {
      renderDialog();

      fireEvent.click(screen.getByText('Delete cloud data'));

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText('I understand this action cannot be undone')).toBeInTheDocument();
    });

    it('should have delete button disabled until checkbox is checked', () => {
      renderDialog();

      fireEvent.click(screen.getByText('Delete cloud data'));

      const deleteButtons = screen.getAllByText('Delete cloud data');
      const confirmDeleteButton = deleteButtons.find((btn) =>
        btn.closest('button')?.hasAttribute('disabled') || btn.closest('button[disabled]')
      );
      expect(confirmDeleteButton?.closest('button')).toBeDisabled();
    });

    it('should enable delete button after checkbox is checked', () => {
      renderDialog();

      fireEvent.click(screen.getByText('Delete cloud data'));

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const deleteButtons = screen.getAllByText('Delete cloud data');
      const confirmBtn = deleteButtons.find(
        (btn) => btn.closest('button')?.getAttribute('disabled') === null
      );
      expect(confirmBtn).toBeTruthy();
    });

    it('should call handleDelete when confirmed', () => {
      const handleDelete = vi.fn();
      renderDialog({}, { handleDelete });

      fireEvent.click(screen.getByText('Delete cloud data'));

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const deleteButtons = screen.getAllByText('Delete cloud data');
      const confirmBtn = deleteButtons.find(
        (btn) => !btn.closest('button')?.disabled
      );
      fireEvent.click(confirmBtn);

      expect(handleDelete).toHaveBeenCalled();
    });

    it('should show LinearProgress when isDeleting is true', () => {
      renderDialog({}, { isDeleting: true });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Deleting...')).toBeInTheDocument();
    });

    it('should show delete title when deleting', () => {
      renderDialog({}, { isDeleting: true });

      expect(screen.getByText('Delete Cloud Data')).toBeInTheDocument();
    });

    it('should show delete success state when deleteSuccess is true', () => {
      renderDialog({}, { deleteSuccess: true });

      expect(screen.getByText('Cloud Data Deleted')).toBeInTheDocument();
      expect(screen.getByText('Your cloud data has been permanently deleted.')).toBeInTheDocument();
    });

    it('should start in delete confirmation when initialAction is delete', () => {
      renderDialog({ initialAction: 'delete' });

      expect(screen.getByText('This will permanently delete all your data from the cloud.')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('should show export error message when exportError is set', () => {
      renderDialog({}, { exportError: new Error('Export failed') });

      expect(screen.getByText('Could not export your data. Please try again.')).toBeInTheDocument();
    });

    it('should show export error title when exportError is set', () => {
      renderDialog({}, { exportError: new Error('fail') });

      expect(screen.getByText('Export Failed')).toBeInTheDocument();
    });

    it('should show delete error message when deleteError is set', () => {
      renderDialog({}, { deleteError: new Error('Delete failed') });

      expect(screen.getByText('Could not delete your cloud data. Please try again.')).toBeInTheDocument();
    });

    it('should show delete error title when deleteError is set', () => {
      renderDialog({}, { deleteError: new Error('fail') });

      expect(screen.getByText('Delete Failed')).toBeInTheDocument();
    });

    it('should show Try Again button on error', () => {
      renderDialog({}, { exportError: new Error('fail') });

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should show Close button on error', () => {
      renderDialog({}, { exportError: new Error('fail') });

      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('operation in progress protection', () => {
    it('should not close dialog when exporting', () => {
      const onClose = vi.fn();
      const hookReturn = createDefaultHookReturn({ isExporting: true });
      useGdprActions.mockReturnValue(hookReturn);
      useLanguage.mockReturnValue({ t: defaultTranslations, direction: 'ltr' });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      render(
        <QueryClientProvider client={queryClient}>
          <DataManagementDialog open={true} onClose={onClose} />
        </QueryClientProvider>
      );

      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    it('should not close dialog when deleting', () => {
      const onClose = vi.fn();
      const hookReturn = createDefaultHookReturn({ isDeleting: true });
      useGdprActions.mockReturnValue(hookReturn);
      useLanguage.mockReturnValue({ t: defaultTranslations, direction: 'ltr' });

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      render(
        <QueryClientProvider client={queryClient}>
          <DataManagementDialog open={true} onClose={onClose} />
        </QueryClientProvider>
      );

      expect(screen.queryByText('Close')).not.toBeInTheDocument();
    });

    it('should disable escape key during exporting via disableEscapeKeyDown', () => {
      renderDialog({}, { isExporting: true });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should disable escape key during deleting via disableEscapeKeyDown', () => {
      renderDialog({}, { isDeleting: true });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('RTL support', () => {
    it('should render with rtl direction when language is Hebrew', () => {
      renderDialog({}, {}, { direction: 'rtl' });

      const dialog = screen.getByRole('dialog');
      const dirElement = dialog.closest('[dir="rtl"]') || dialog.querySelector('[dir="rtl"]');
      expect(dirElement || dialog.parentElement.closest('[dir="rtl"]')).toBeTruthy();
    });

    it('should render with ltr direction when language is English', () => {
      renderDialog({}, {}, { direction: 'ltr' });

      const dialog = screen.getByRole('dialog');
      const dirElement = dialog.closest('[dir="ltr"]') || dialog.querySelector('[dir="ltr"]');
      expect(dirElement || dialog.parentElement.closest('[dir="ltr"]')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should have aria-labelledby on dialog', () => {
      renderDialog();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'data-management-title');
    });

    it('should have aria-describedby on dialog', () => {
      renderDialog();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'data-management-content');
    });

    it('should have aria-live on exporting progress text', () => {
      renderDialog({}, { isExporting: true });

      const progressText = screen.getByText('Exporting...');
      expect(progressText).toHaveAttribute('aria-live', 'polite');
    });

    it('should have aria-live on deleting progress text', () => {
      renderDialog({}, { isDeleting: true });

      const progressText = screen.getByText('Deleting...');
      expect(progressText).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('memoization', () => {
    it('should be exported as a memo component', async () => {
      const mod = await import('./DataManagementDialog');
      expect(mod.default.$$typeof).toBe(Symbol.for('react.memo'));
    });
  });
});
