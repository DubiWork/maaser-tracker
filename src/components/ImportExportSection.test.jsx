/**
 * ImportExportSection Component Tests
 *
 * Tests for export/import buttons, disabled states, and file picker behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../contexts/useLanguage', () => ({
  useLanguage: vi.fn(),
}));

vi.mock('../hooks/useEntries', () => ({
  useEntries: vi.fn(),
  queryKeys: {
    all: ['entries'],
    lists: () => ['entries', 'list'],
    list: (f) => ['entries', 'list', f],
    details: () => ['entries', 'detail'],
    detail: (id) => ['entries', 'detail', id],
    migrationStatus: (uid) => ['migration', 'status', uid],
  },
  useMigrationStatus: vi.fn(() => ({ data: null })),
}));

vi.mock('../hooks/useImportExport', () => ({
  useExportJSON: vi.fn(),
  useExportCSV: vi.fn(),
  useImport: vi.fn(),
  ImportState: {
    IDLE: 'idle',
    PARSING: 'parsing',
    PREVIEW: 'preview',
    IMPORTING: 'importing',
    SUCCESS: 'success',
    ERROR: 'error',
  },
}));

vi.mock('./ImportPreviewDialog', () => ({
  default: vi.fn(({ open }) => open ? <div data-testid="import-preview-dialog">Import Preview Dialog</div> : null),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  isAuthenticated: vi.fn(() => false),
  getCurrentUserId: vi.fn(() => null),
}));

import { useLanguage } from '../contexts/useLanguage';
import { useEntries } from '../hooks/useEntries';
import { useExportJSON, useExportCSV, useImport } from '../hooks/useImportExport';
import ImportExportSection from './ImportExportSection';

const defaultTranslations = {
  settings: {
    importExport: {
      sectionTitle: 'Data Management',
      sectionDescription: 'Backup, restore, or transfer your data',
      exportTitle: 'Export Data',
      exportJSON: 'Export JSON',
      exportCSV: 'Export CSV',
      exportSuccess: 'Data exported successfully',
      exportError: 'Failed to export data',
      exportEmpty: 'No entries to export',
      exportSecurityWarning: 'Store it securely.',
      importTitle: 'Import Data',
      importButton: 'Import from File',
      iosSaveHint: 'Tap the share icon to save',
    },
  },
  cancel: 'Cancel',
  tryAgain: 'Try Again',
};

function setupMocks(overrides = {}) {
  useLanguage.mockReturnValue({
    t: overrides.t || defaultTranslations,
    direction: overrides.direction || 'ltr',
  });

  useEntries.mockReturnValue({
    data: 'entries' in overrides ? overrides.entries : [{ id: '1', type: 'income', amount: 5000 }],
  });

  useExportJSON.mockReturnValue({
    exportJSON: overrides.exportJSON || vi.fn(),
    isExporting: overrides.isExportingJSON || false,
    error: overrides.exportJSONError || null,
    isIOS: overrides.isIOS || false,
    reset: vi.fn(),
  });

  useExportCSV.mockReturnValue({
    exportCSV: overrides.exportCSV || vi.fn(),
    isExporting: overrides.isExportingCSV || false,
    error: overrides.exportCSVError || null,
    isIOS: overrides.isIOS || false,
    reset: vi.fn(),
  });

  useImport.mockReturnValue({
    state: overrides.importState || 'idle',
    parseResult: overrides.parseResult || null,
    importResult: overrides.importResult || null,
    error: overrides.importError || null,
    progress: overrides.progress || { current: 0, total: 0, phase: '' },
    parseFile: overrides.parseFile || vi.fn(),
    executeImport: overrides.executeImport || vi.fn(),
    reset: overrides.importReset || vi.fn(),
    retry: overrides.importRetry || vi.fn(),
  });
}

function renderSection(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ImportExportSection {...props} />
    </QueryClientProvider>
  );
}

describe('ImportExportSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  describe('rendering', () => {
    it('should render section title and description', () => {
      renderSection();

      expect(screen.getByText('Data Management')).toBeInTheDocument();
      expect(screen.getByText('Backup, restore, or transfer your data')).toBeInTheDocument();
    });

    it('should render Export JSON button', () => {
      renderSection();

      expect(screen.getByRole('button', { name: 'Export JSON' })).toBeInTheDocument();
    });

    it('should render Export CSV button', () => {
      renderSection();

      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    });

    it('should render Import from File button', () => {
      renderSection();

      expect(screen.getByRole('button', { name: 'Import from File' })).toBeInTheDocument();
    });

    it('should render hidden file input with correct accept attribute', () => {
      renderSection();

      const fileInput = screen.getByTestId('import-file-input');
      expect(fileInput).toHaveAttribute('accept', '.json,.csv');
      expect(fileInput).toHaveAttribute('type', 'file');
    });

    it('should have data-testid on section container', () => {
      renderSection();

      expect(screen.getByTestId('import-export-section')).toBeInTheDocument();
    });
  });

  describe('disabled states', () => {
    it('should disable export buttons when no entries exist', () => {
      setupMocks({ entries: [] });
      renderSection();

      expect(screen.getByRole('button', { name: 'Export JSON' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    });

    it('should disable export buttons when entries are null', () => {
      setupMocks({ entries: null });
      renderSection();

      expect(screen.getByRole('button', { name: 'Export JSON' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    });

    it('should enable export buttons when entries exist', () => {
      setupMocks({ entries: [{ id: '1' }] });
      renderSection();

      expect(screen.getByRole('button', { name: 'Export JSON' })).not.toBeDisabled();
      expect(screen.getByRole('button', { name: 'Export CSV' })).not.toBeDisabled();
    });

    it('should disable buttons during JSON export operation', () => {
      setupMocks({ isExportingJSON: true });
      renderSection();

      expect(screen.getByRole('button', { name: 'Export JSON' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Import from File' })).toBeDisabled();
    });

    it('should disable buttons during CSV export operation', () => {
      setupMocks({ isExportingCSV: true });
      renderSection();

      expect(screen.getByRole('button', { name: 'Export JSON' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    });
  });

  describe('export actions', () => {
    it('should call exportJSON when Export JSON button is clicked', () => {
      const mockExport = vi.fn();
      setupMocks({ exportJSON: mockExport });
      renderSection();

      fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));

      expect(mockExport).toHaveBeenCalled();
    });

    it('should call exportCSV when Export CSV button is clicked', () => {
      const mockExport = vi.fn();
      setupMocks({ exportCSV: mockExport });
      renderSection();

      fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

      expect(mockExport).toHaveBeenCalled();
    });
  });

  describe('import actions', () => {
    it('should call parseFile when a file is selected', () => {
      const mockParseFile = vi.fn();
      setupMocks({ parseFile: mockParseFile });
      renderSection();

      const fileInput = screen.getByTestId('import-file-input');
      const mockFile = new File(['{}'], 'test.json', { type: 'application/json' });

      fireEvent.change(fileInput, { target: { files: [mockFile] } });

      expect(mockParseFile).toHaveBeenCalledWith(mockFile);
    });

    it('should open ImportPreviewDialog when import state is not idle', () => {
      setupMocks({ importState: 'preview' });
      renderSection();

      expect(screen.getByTestId('import-preview-dialog')).toBeInTheDocument();
    });

    it('should not open ImportPreviewDialog when import state is idle', () => {
      setupMocks({ importState: 'idle' });
      renderSection();

      expect(screen.queryByTestId('import-preview-dialog')).not.toBeInTheDocument();
    });
  });

  describe('RTL support', () => {
    it('should render correctly in RTL mode', () => {
      setupMocks({ direction: 'rtl' });
      renderSection();

      expect(screen.getByText('Data Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Export JSON' })).toBeInTheDocument();
    });
  });

  describe('section headings', () => {
    it('should render export and import subsection headings', () => {
      renderSection();

      expect(screen.getByText('Export Data')).toBeInTheDocument();
      expect(screen.getByText('Import Data')).toBeInTheDocument();
    });
  });
});
