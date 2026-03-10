/**
 * useImportExport Hook Tests
 *
 * Tests for useExportJSON, useExportCSV, and useImport hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock services before imports
vi.mock('../services/exportService', () => ({
  exportToJSON: vi.fn(),
  exportToCSV: vi.fn(),
  downloadFile: vi.fn(),
  generateFilename: vi.fn(),
}));

vi.mock('../services/importService', () => ({
  parseJSONFile: vi.fn(),
  parseCSVFile: vi.fn(),
  importEntries: vi.fn(),
  IMPORT_MODE_MERGE: 'merge',
  IMPORT_MODE_REPLACE: 'replace',
}));

vi.mock('./useEntries', () => ({
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

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  isAuthenticated: vi.fn(() => false),
  getCurrentUserId: vi.fn(() => null),
}));

import { useExportJSON, useExportCSV, useImport, ImportState } from './useImportExport';
import { exportToJSON, exportToCSV, downloadFile, generateFilename } from '../services/exportService';
import { parseJSONFile, parseCSVFile, importEntries } from '../services/importService';
import { useEntries } from './useEntries';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockEntries = [
  { id: '1', type: 'income', date: '2026-01-15', amount: 5000, note: 'Salary' },
  { id: '2', type: 'donation', date: '2026-01-20', amount: 500, note: 'Charity' },
];

describe('useExportJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEntries.mockReturnValue({ data: mockEntries });
    exportToJSON.mockReturnValue('{"test":"json"}');
    generateFilename.mockReturnValue('maaser-tracker-2026-03-09.json');
    downloadFile.mockReturnValue({ downloaded: true, iosSafari: false });
  });

  it('should export entries as JSON and trigger download', async () => {
    const { result } = renderHook(() => useExportJSON(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportJSON();
    });

    expect(exportToJSON).toHaveBeenCalledWith(mockEntries);
    expect(downloadFile).toHaveBeenCalledWith('{"test":"json"}', 'maaser-tracker-2026-03-09.json', 'application/json');
    expect(result.current.error).toBeNull();
    expect(result.current.isExporting).toBe(false);
  });

  it('should set error when no entries exist', async () => {
    useEntries.mockReturnValue({ data: [] });
    const { result } = renderHook(() => useExportJSON(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportJSON();
    });

    expect(result.current.error).toBe('No entries to export');
    expect(exportToJSON).not.toHaveBeenCalled();
  });

  it('should set error when entries are null', async () => {
    useEntries.mockReturnValue({ data: null });
    const { result } = renderHook(() => useExportJSON(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportJSON();
    });

    expect(result.current.error).toBe('No entries to export');
  });

  it('should detect iOS Safari download', async () => {
    downloadFile.mockReturnValue({ downloaded: true, iosSafari: true });
    const { result } = renderHook(() => useExportJSON(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportJSON();
    });

    expect(result.current.isIOS).toBe(true);
  });

  it('should handle export service errors', async () => {
    exportToJSON.mockImplementation(() => { throw new Error('JSON serialize failed'); });
    const { result } = renderHook(() => useExportJSON(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportJSON();
    });

    expect(result.current.error).toBe('JSON serialize failed');
  });

  it('should reset error state via reset()', async () => {
    useEntries.mockReturnValue({ data: [] });
    const { result } = renderHook(() => useExportJSON(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportJSON();
    });
    expect(result.current.error).toBe('No entries to export');

    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBeNull();
  });
});

describe('useExportCSV', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEntries.mockReturnValue({ data: mockEntries });
    exportToCSV.mockResolvedValue('csv,content');
    generateFilename.mockReturnValue('maaser-tracker-2026-03-09.csv');
    downloadFile.mockReturnValue({ downloaded: true, iosSafari: false });
  });

  it('should export entries as CSV and trigger download', async () => {
    const { result } = renderHook(() => useExportCSV(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportCSV();
    });

    expect(exportToCSV).toHaveBeenCalledWith(mockEntries);
    expect(downloadFile).toHaveBeenCalledWith('csv,content', 'maaser-tracker-2026-03-09.csv', 'text/csv;charset=utf-8');
    expect(result.current.error).toBeNull();
  });

  it('should set error when no entries exist', async () => {
    useEntries.mockReturnValue({ data: [] });
    const { result } = renderHook(() => useExportCSV(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportCSV();
    });

    expect(result.current.error).toBe('No entries to export');
    expect(exportToCSV).not.toHaveBeenCalled();
  });

  it('should handle CSV export errors', async () => {
    exportToCSV.mockRejectedValue(new Error('PapaParse failed'));
    const { result } = renderHook(() => useExportCSV(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportCSV();
    });

    expect(result.current.error).toBe('PapaParse failed');
  });

  it('should detect iOS Safari for CSV download', async () => {
    downloadFile.mockReturnValue({ downloaded: true, iosSafari: true });
    const { result } = renderHook(() => useExportCSV(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.exportCSV();
    });

    expect(result.current.isIOS).toBe(true);
  });
});

describe('useImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start in IDLE state', () => {
    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });
    expect(result.current.state).toBe(ImportState.IDLE);
    expect(result.current.parseResult).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should parse a JSON file and transition to PREVIEW', async () => {
    parseJSONFile.mockResolvedValue({
      validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
      invalidEntries: [],
      errors: [],
      warnings: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['{}'], 'data.json', { type: 'application/json' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.state).toBe(ImportState.PREVIEW);
    expect(result.current.parseResult).not.toBeNull();
    expect(result.current.parseResult.validEntries).toHaveLength(1);
    expect(result.current.parseResult.filename).toBe('data.json');
  });

  it('should parse a CSV file and transition to PREVIEW', async () => {
    parseCSVFile.mockResolvedValue({
      validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
      invalidEntries: [],
      errors: [],
      warnings: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File([''], 'data.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(parseCSVFile).toHaveBeenCalledWith(mockFile);
    expect(result.current.state).toBe(ImportState.PREVIEW);
  });

  it('should transition to ERROR when no valid entries', async () => {
    parseJSONFile.mockResolvedValue({
      validEntries: [],
      invalidEntries: [],
      errors: ['Invalid JSON format'],
      warnings: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['bad'], 'data.json', { type: 'application/json' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.state).toBe(ImportState.ERROR);
    expect(result.current.error).toBe('Invalid JSON format');
  });

  it('should transition to ERROR on parse exception', async () => {
    parseJSONFile.mockRejectedValue(new Error('File read failed'));

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File([''], 'data.json', { type: 'application/json' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.state).toBe(ImportState.ERROR);
    expect(result.current.error).toBe('File read failed');
  });

  it('should execute import in merge mode successfully', async () => {
    const validEntries = [
      { type: 'income', date: '2026-01-15', amount: 5000 },
      { type: 'donation', date: '2026-01-20', amount: 500 },
    ];

    parseJSONFile.mockResolvedValue({
      validEntries,
      invalidEntries: [],
      errors: [],
      warnings: [],
    });

    importEntries.mockResolvedValue({
      success: true,
      mode: 'merge',
      imported: 2,
      backedUp: 0,
      failed: [],
      errors: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['{}'], 'data.json', { type: 'application/json' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.state).toBe(ImportState.PREVIEW);

    await act(async () => {
      await result.current.executeImport('merge');
    });

    expect(result.current.state).toBe(ImportState.SUCCESS);
    expect(result.current.importResult.imported).toBe(2);
  });

  it('should execute import in replace mode', async () => {
    parseJSONFile.mockResolvedValue({
      validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
      invalidEntries: [],
      errors: [],
      warnings: [],
    });

    importEntries.mockResolvedValue({
      success: true,
      mode: 'replace',
      imported: 1,
      backedUp: 3,
      failed: [],
      errors: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['{}'], 'data.json', { type: 'application/json' });
    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    await act(async () => {
      await result.current.executeImport('replace');
    });

    expect(result.current.state).toBe(ImportState.SUCCESS);
    expect(importEntries).toHaveBeenCalledWith(
      expect.any(Array),
      'replace',
      expect.objectContaining({ skipBackup: false })
    );
  });

  it('should transition to ERROR on import failure', async () => {
    parseJSONFile.mockResolvedValue({
      validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
      invalidEntries: [],
      errors: [],
      warnings: [],
    });

    importEntries.mockResolvedValue({
      success: false,
      mode: 'merge',
      imported: 0,
      backedUp: 0,
      failed: [],
      errors: ['Failed to write entry'],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['{}'], 'data.json', { type: 'application/json' });
    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    await act(async () => {
      await result.current.executeImport('merge');
    });

    expect(result.current.state).toBe(ImportState.ERROR);
    expect(result.current.error).toBe('Failed to write entry');
  });

  it('should transition to ERROR on import exception', async () => {
    parseJSONFile.mockResolvedValue({
      validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
      invalidEntries: [],
      errors: [],
      warnings: [],
    });

    importEntries.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['{}'], 'data.json', { type: 'application/json' });
    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    await act(async () => {
      await result.current.executeImport('merge');
    });

    expect(result.current.state).toBe(ImportState.ERROR);
    expect(result.current.error).toBe('Network error');
  });

  it('should reset all state back to IDLE', async () => {
    parseJSONFile.mockResolvedValue({
      validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
      invalidEntries: [],
      errors: [],
      warnings: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['{}'], 'data.json', { type: 'application/json' });
    await act(async () => {
      await result.current.parseFile(mockFile);
    });
    expect(result.current.state).toBe(ImportState.PREVIEW);

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe(ImportState.IDLE);
    expect(result.current.parseResult).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.importResult).toBeNull();
  });

  it('should retry parsing the last file', async () => {
    parseJSONFile
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce({
        validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
        invalidEntries: [],
        errors: [],
        warnings: [],
      });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['{}'], 'data.json', { type: 'application/json' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });
    expect(result.current.state).toBe(ImportState.ERROR);

    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.state).toBe(ImportState.PREVIEW);
  });

  it('should not parse when file is null', async () => {
    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.parseFile(null);
    });

    expect(result.current.state).toBe(ImportState.IDLE);
    expect(parseJSONFile).not.toHaveBeenCalled();
    expect(parseCSVFile).not.toHaveBeenCalled();
  });

  it('should not execute import when no parse result', async () => {
    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.executeImport('merge');
    });

    expect(result.current.state).toBe(ImportState.IDLE);
    expect(importEntries).not.toHaveBeenCalled();
  });

  it('should include file metadata in parse result', async () => {
    parseJSONFile.mockResolvedValue({
      validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
      invalidEntries: [{ index: 1, raw: {}, errors: ['bad'] }],
      errors: [],
      warnings: ['File is large'],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['x'.repeat(1000)], 'test.json', { type: 'application/json' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.parseResult.filename).toBe('test.json');
    expect(result.current.parseResult.fileSize).toBe(1000);
    expect(result.current.parseResult.invalidEntries).toHaveLength(1);
    expect(result.current.parseResult.warnings).toContain('File is large');
  });
});
