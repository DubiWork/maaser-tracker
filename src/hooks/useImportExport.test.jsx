/**
 * useImportExport Hook Tests
 *
 * Tests for useExportJSON, useExportCSV, and useImport hooks.
 * Includes tests for external CSV detection and column mapping flow.
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
  validateImportEntry: vi.fn(),
  stripBOM: vi.fn((text) => text),
  IMPORT_MODE_MERGE: 'merge',
  IMPORT_MODE_REPLACE: 'replace',
}));

vi.mock('../services/columnMappingService', () => ({
  detectColumns: vi.fn(),
  transformRows: vi.fn(),
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

// Mock PapaParse as dynamic import — the hook does `import('papaparse')` at runtime
const mockPapaParse = {
  parse: vi.fn(),
};
vi.mock('papaparse', () => ({
  default: { parse: (...args) => mockPapaParse.parse(...args) },
}));

import { useExportJSON, useExportCSV, useImport, ImportState, isAppCSVFormat } from './useImportExport';
import { exportToJSON, exportToCSV, downloadFile, generateFilename } from '../services/exportService';
import { parseJSONFile, parseCSVFile, importEntries, validateImportEntry } from '../services/importService';
import { detectColumns, transformRows } from '../services/columnMappingService';
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

  it('should parse an app-format CSV file and transition to PREVIEW', async () => {
    // Mock PapaParse to return app-format headers
    mockPapaParse.parse.mockReturnValue({
      data: [
        ['id', 'type', 'date', 'amount', 'maaser', 'note', 'accountingMonth'],
        ['abc-123', 'income', '2026-01-15', '5000', '500', 'Salary', '2026-01'],
      ],
      errors: [],
      meta: { fields: [] },
    });

    parseCSVFile.mockResolvedValue({
      validEntries: [{ type: 'income', date: '2026-01-15', amount: 5000 }],
      invalidEntries: [],
      errors: [],
      warnings: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const csvContent = 'id,type,date,amount,maaser,note,accountingMonth\nabc-123,income,2026-01-15,5000,500,Salary,2026-01';
    const mockFile = new File([csvContent], 'data.csv', { type: 'text/csv' });

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

  it('should have COLUMN_MAPPING in ImportState', () => {
    expect(ImportState.COLUMN_MAPPING).toBe('column_mapping');
  });

  it('should expose externalCSVData as null initially', () => {
    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });
    expect(result.current.externalCSVData).toBeNull();
  });
});

describe('isAppCSVFormat', () => {
  it('should return true for exact app headers', () => {
    expect(isAppCSVFormat(['id', 'type', 'date', 'amount', 'maaser', 'note', 'accountingMonth'])).toBe(true);
  });

  it('should return true for app headers in different order', () => {
    expect(isAppCSVFormat(['date', 'type', 'id', 'amount', 'accountingMonth', 'note', 'maaser'])).toBe(true);
  });

  it('should return true for app headers with extra columns', () => {
    expect(isAppCSVFormat(['id', 'type', 'date', 'amount', 'maaser', 'note', 'accountingMonth', 'extra'])).toBe(true);
  });

  it('should return true regardless of case', () => {
    expect(isAppCSVFormat(['ID', 'Type', 'Date', 'Amount', 'Maaser', 'Note', 'AccountingMonth'])).toBe(true);
  });

  it('should return false for external CSV headers', () => {
    expect(isAppCSVFormat(['תאריך', 'הכנסה', 'מעשר', 'הופרש'])).toBe(false);
  });

  it('should return false when missing required headers', () => {
    expect(isAppCSVFormat(['date', 'amount', 'note'])).toBe(false);
  });

  it('should return false for empty array', () => {
    expect(isAppCSVFormat([])).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isAppCSVFormat(null)).toBe(false);
    expect(isAppCSVFormat(undefined)).toBe(false);
  });

  it('should handle headers with whitespace', () => {
    expect(isAppCSVFormat([' id ', ' type ', ' date ', ' amount ', ' maaser ', ' note ', ' accountingMonth '])).toBe(true);
  });
});

describe('useImport — external CSV flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should route external CSV to COLUMN_MAPPING state', async () => {
    mockPapaParse.parse.mockReturnValue({
      data: [
        ['תאריך', 'הכנסה', 'מעשר', 'הופרש'],
        ['1/2026', '10000', '1000', '500'],
        ['2/2026', '12000', '1200', '600'],
      ],
      errors: [],
      meta: {},
    });

    detectColumns.mockReturnValue({
      mappings: { date: 0, income: 1, maaser: 2, donation: 3 },
      confidence: { date: 'high', income: 'high', maaser: 'high', donation: 'high' },
      unmapped: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const csvContent = 'תאריך,הכנסה,מעשר,הופרש\n1/2026,10000,1000,500\n2/2026,12000,1200,600';
    const mockFile = new File([csvContent], 'maaser-sheet.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.state).toBe(ImportState.COLUMN_MAPPING);
    expect(result.current.externalCSVData).not.toBeNull();
    expect(result.current.externalCSVData.headers).toEqual(['תאריך', 'הכנסה', 'מעשר', 'הופרש']);
    expect(result.current.externalCSVData.allRows).toHaveLength(2);
    expect(result.current.externalCSVData.sampleRows).toHaveLength(2);
    expect(result.current.externalCSVData.detectionResult.mappings.date).toBe(0);
    expect(detectColumns).toHaveBeenCalledWith(['תאריך', 'הכנסה', 'מעשר', 'הופרש']);
  });

  it('should limit sampleRows to first 5', async () => {
    const rows = Array.from({ length: 10 }, (_, i) => [`${i + 1}/2026`, `${(i + 1) * 1000}`, '100', '50']);
    mockPapaParse.parse.mockReturnValue({
      data: [['date', 'income', 'donation', 'tithe'], ...rows],
      errors: [],
      meta: {},
    });

    detectColumns.mockReturnValue({
      mappings: { date: 0, income: 1, donation: 2, maaser: 3 },
      confidence: {},
      unmapped: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['csv content'], 'big.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.externalCSVData.allRows).toHaveLength(10);
    expect(result.current.externalCSVData.sampleRows).toHaveLength(5);
  });

  it('should transition to ERROR when CSV has no data rows', async () => {
    mockPapaParse.parse.mockReturnValue({
      data: [['header1']],
      errors: [],
      meta: {},
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['header1'], 'empty.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.state).toBe(ImportState.ERROR);
    expect(result.current.error).toBe('No data rows found in CSV');
  });

  it('should confirm mapping and transition to PREVIEW', async () => {
    // Setup: get to COLUMN_MAPPING state
    mockPapaParse.parse.mockReturnValue({
      data: [
        ['תאריך', 'הכנסה', 'מעשר', 'הופרש'],
        ['1/2026', '10000', '1000', '500'],
      ],
      errors: [],
      meta: {},
    });

    detectColumns.mockReturnValue({
      mappings: { date: 0, income: 1, maaser: 2, donation: 3 },
      confidence: { date: 'high', income: 'high', maaser: 'high', donation: 'high' },
      unmapped: [],
    });

    transformRows.mockReturnValue({
      entries: [
        { id: 'uuid-1', type: 'income', date: '2026-01-01', amount: 10000, maaser: 1000, accountingMonth: '2026-01', note: '' },
        { id: 'uuid-2', type: 'donation', date: '2026-01-01', amount: 500, accountingMonth: '2026-01', note: '' },
      ],
      skippedRows: [],
      stats: { totalRows: 1, incomeEntries: 1, donationEntries: 1, skipped: 0 },
    });

    validateImportEntry.mockImplementation((entry) => ({
      valid: true,
      entry,
      errors: [],
    }));

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['csv content'], 'maaser.csv', { type: 'text/csv' });

    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.state).toBe(ImportState.COLUMN_MAPPING);

    // Confirm mapping
    act(() => {
      result.current.confirmMapping({ date: 0, income: 1, maaser: 2, donation: 3 });
    });

    expect(result.current.state).toBe(ImportState.PREVIEW);
    expect(result.current.parseResult.validEntries).toHaveLength(2);
    expect(result.current.parseResult.filename).toBe('maaser.csv');
    expect(result.current.parseResult.externalImportStats).toBeDefined();
    expect(transformRows).toHaveBeenCalledWith(
      [['1/2026', '10000', '1000', '500']],
      { date: 0, income: 1, maaser: 2, donation: 3 }
    );
  });

  it('should add skipped row warnings to parse result', async () => {
    mockPapaParse.parse.mockReturnValue({
      data: [
        ['date', 'income'],
        ['1/2026', '10000'],
        ['bad', ''],
      ],
      errors: [],
      meta: {},
    });

    detectColumns.mockReturnValue({
      mappings: { date: 0, income: 1 },
      confidence: {},
      unmapped: [],
    });

    transformRows.mockReturnValue({
      entries: [
        { id: 'uuid-1', type: 'income', date: '2026-01-01', amount: 10000, accountingMonth: '2026-01', note: '' },
      ],
      skippedRows: [{ row: 2, reason: 'Invalid or missing date' }],
      stats: { totalRows: 2, incomeEntries: 1, donationEntries: 0, skipped: 1 },
    });

    validateImportEntry.mockImplementation((entry) => ({
      valid: true,
      entry,
      errors: [],
    }));

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['csv'], 'data.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    act(() => {
      result.current.confirmMapping({ date: 0, income: 1 });
    });

    expect(result.current.parseResult.warnings).toHaveLength(1);
    expect(result.current.parseResult.warnings[0]).toContain('1 rows skipped');
  });

  it('should transition to ERROR if no valid entries after mapping', async () => {
    mockPapaParse.parse.mockReturnValue({
      data: [
        ['date', 'income'],
        ['bad', ''],
      ],
      errors: [],
      meta: {},
    });

    detectColumns.mockReturnValue({
      mappings: { date: 0, income: 1 },
      confidence: {},
      unmapped: [],
    });

    transformRows.mockReturnValue({
      entries: [],
      skippedRows: [{ row: 1, reason: 'Invalid or missing date' }],
      stats: { totalRows: 1, incomeEntries: 0, donationEntries: 0, skipped: 1 },
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['csv'], 'bad.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    act(() => {
      result.current.confirmMapping({ date: 0, income: 1 });
    });

    expect(result.current.state).toBe(ImportState.ERROR);
    expect(result.current.error).toBe('No valid entries after column mapping');
  });

  it('should go back to IDLE from COLUMN_MAPPING via goBackToFileSelect', async () => {
    mockPapaParse.parse.mockReturnValue({
      data: [
        ['date', 'income'],
        ['1/2026', '10000'],
      ],
      errors: [],
      meta: {},
    });

    detectColumns.mockReturnValue({
      mappings: { date: 0, income: 1 },
      confidence: {},
      unmapped: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['csv'], 'data.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.state).toBe(ImportState.COLUMN_MAPPING);

    act(() => {
      result.current.goBackToFileSelect();
    });

    expect(result.current.state).toBe(ImportState.IDLE);
    expect(result.current.externalCSVData).toBeNull();
  });

  it('should reset clears externalCSVData', async () => {
    mockPapaParse.parse.mockReturnValue({
      data: [
        ['date', 'income'],
        ['1/2026', '10000'],
      ],
      errors: [],
      meta: {},
    });

    detectColumns.mockReturnValue({
      mappings: { date: 0, income: 1 },
      confidence: {},
      unmapped: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['csv'], 'data.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.parseFile(mockFile);
    });

    expect(result.current.externalCSVData).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe(ImportState.IDLE);
    expect(result.current.externalCSVData).toBeNull();
  });

  it('should not confirm mapping when externalCSVData is null', () => {
    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    act(() => {
      result.current.confirmMapping({ date: 0, income: 1 });
    });

    // Should remain in IDLE, no error thrown
    expect(result.current.state).toBe(ImportState.IDLE);
  });

  it('should complete full external CSV flow: parse -> map -> preview -> import', async () => {
    // Step 1: Parse external CSV
    mockPapaParse.parse.mockReturnValue({
      data: [
        ['תאריך', 'הכנסה', 'מעשר', 'הופרש'],
        ['1/2026', '10000', '1000', '500'],
      ],
      errors: [],
      meta: {},
    });

    detectColumns.mockReturnValue({
      mappings: { date: 0, income: 1, maaser: 2, donation: 3 },
      confidence: { date: 'high', income: 'high', maaser: 'high', donation: 'high' },
      unmapped: [],
    });

    transformRows.mockReturnValue({
      entries: [
        { id: 'uuid-1', type: 'income', date: '2026-01-01', amount: 10000, maaser: 1000, accountingMonth: '2026-01', note: '' },
        { id: 'uuid-2', type: 'donation', date: '2026-01-01', amount: 500, accountingMonth: '2026-01', note: '' },
      ],
      skippedRows: [],
      stats: { totalRows: 1, incomeEntries: 1, donationEntries: 1, skipped: 0 },
    });

    validateImportEntry.mockImplementation((entry) => ({
      valid: true,
      entry,
      errors: [],
    }));

    importEntries.mockResolvedValue({
      success: true,
      mode: 'merge',
      imported: 2,
      backedUp: 0,
      failed: [],
      errors: [],
    });

    const { result } = renderHook(() => useImport(), { wrapper: createWrapper() });

    const mockFile = new File(['csv'], 'maaser.csv', { type: 'text/csv' });

    // Parse -> COLUMN_MAPPING
    await act(async () => {
      await result.current.parseFile(mockFile);
    });
    expect(result.current.state).toBe(ImportState.COLUMN_MAPPING);

    // Confirm mapping -> PREVIEW
    act(() => {
      result.current.confirmMapping({ date: 0, income: 1, maaser: 2, donation: 3 });
    });
    expect(result.current.state).toBe(ImportState.PREVIEW);
    expect(result.current.parseResult.validEntries).toHaveLength(2);

    // Execute import -> SUCCESS
    await act(async () => {
      await result.current.executeImport('merge');
    });
    expect(result.current.state).toBe(ImportState.SUCCESS);
    expect(result.current.importResult.imported).toBe(2);
  });
});
