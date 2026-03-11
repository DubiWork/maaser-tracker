/**
 * useImportExport Hook
 *
 * Provides React Query mutations for export (JSON/CSV) and import operations.
 * Connects UI components to exportService and importService.
 *
 * Export hooks read entries via useEntries and trigger file downloads.
 * Import hook manages a state machine:
 *   IDLE -> PARSING -> [COLUMN_MAPPING ->] PREVIEW -> IMPORTING -> SUCCESS/ERROR.
 * External CSVs route through COLUMN_MAPPING; app-format CSVs/JSON skip to PREVIEW.
 * Cache invalidation is performed after every successful import.
 */

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEntries, queryKeys } from './useEntries';
import { exportToJSON, exportToCSV, downloadFile, generateFilename } from '../services/exportService';
import {
  parseJSONFile,
  parseCSVFile,
  importEntries,
  validateImportEntry,
  IMPORT_MODE_MERGE,
  IMPORT_MODE_REPLACE,
  stripBOM,
} from '../services/importService';
import { detectColumns, transformRows } from '../services/columnMappingService';

/** Import state machine states */
export const ImportState = {
  IDLE: 'idle',
  PARSING: 'parsing',
  COLUMN_MAPPING: 'column_mapping',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * App's own CSV column headers — used to detect whether a CSV was exported
 * by Ma'aser Tracker (app format) vs. an external spreadsheet.
 */
const APP_CSV_HEADERS = ['id', 'type', 'date', 'amount', 'maaser', 'note', 'accountingMonth'];

/**
 * Hook for exporting entries as JSON.
 *
 * @returns {{ exportJSON: Function, isExporting: boolean, error: string|null, isIOS: boolean, reset: Function }}
 */
export function useExportJSON() {
  const { data: entries } = useEntries();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setIsIOS(false);
  }, []);

  const exportJSON = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    setIsIOS(false);

    try {
      if (!entries || entries.length === 0) {
        throw new Error('No entries to export');
      }

      const json = exportToJSON(entries);
      const filename = generateFilename('json');
      const result = downloadFile(json, filename, 'application/json');
      setIsIOS(result.iosSafari);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  }, [entries]);

  return { exportJSON, isExporting, error, isIOS, reset };
}

/**
 * Hook for exporting entries as CSV.
 *
 * @returns {{ exportCSV: Function, isExporting: boolean, error: string|null, isIOS: boolean, reset: Function }}
 */
export function useExportCSV() {
  const { data: entries } = useEntries();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setIsIOS(false);
  }, []);

  const exportCSV = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    setIsIOS(false);

    try {
      if (!entries || entries.length === 0) {
        throw new Error('No entries to export');
      }

      const csv = await exportToCSV(entries);
      const filename = generateFilename('csv');
      const result = downloadFile(csv, filename, 'text/csv;charset=utf-8');
      setIsIOS(result.iosSafari);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  }, [entries]);

  return { exportCSV, isExporting, error, isIOS, reset };
}

/**
 * Check whether CSV headers match the app's own export format.
 * All 7 required headers must be present (order-independent).
 *
 * @param {string[]} headers - Parsed CSV header row
 * @returns {boolean} true if the CSV is in app format
 */
export function isAppCSVFormat(headers) {
  if (!Array.isArray(headers) || headers.length === 0) return false;
  const normalized = headers.map((h) => (h || '').trim().toLowerCase());
  return APP_CSV_HEADERS.every((expected) => normalized.includes(expected.toLowerCase()));
}

/**
 * Hook for importing entries from a file.
 *
 * Manages the import state machine:
 *   IDLE -> PARSING -> [COLUMN_MAPPING ->] PREVIEW -> IMPORTING -> SUCCESS/ERROR
 *
 * External CSVs route through COLUMN_MAPPING for user-driven column mapping.
 * App-format CSVs and JSON files skip directly to PREVIEW.
 *
 * @returns {Object} Import state and control functions
 */
export function useImport() {
  const queryClient = useQueryClient();
  const [state, setState] = useState(ImportState.IDLE);
  const [parseResult, setParseResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const fileRef = useRef(null);

  // External CSV column mapping data (populated for external CSVs)
  const [externalCSVData, setExternalCSVData] = useState(null);

  /**
   * Parse a file and transition to PREVIEW or COLUMN_MAPPING state.
   * - JSON files: always go to PREVIEW (existing behavior)
   * - CSV files in app format: go to PREVIEW (existing behavior)
   * - CSV files in external format: go to COLUMN_MAPPING
   * @param {File} file - File to parse
   */
  const parseFile = useCallback(async (file) => {
    if (!file) return;

    fileRef.current = file;
    setState(ImportState.PARSING);
    setError(null);
    setParseResult(null);
    setImportResult(null);
    setExternalCSVData(null);

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');

      if (isCSV) {
        // Read file text and parse with PapaParse to inspect headers
        let text = await file.text();
        text = stripBOM(text);

        let Papa;
        try {
          const module = await import('papaparse');
          Papa = module.default || module;
        } catch {
          setState(ImportState.ERROR);
          setError('Failed to load CSV parser');
          return;
        }

        const rawParse = Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          dynamicTyping: false,
          delimiter: '',
        });

        if (!rawParse.data || rawParse.data.length < 2) {
          setState(ImportState.ERROR);
          setError('No data rows found in CSV');
          return;
        }

        const headers = rawParse.data[0];
        const dataRows = rawParse.data.slice(1);

        if (isAppCSVFormat(headers)) {
          // App format — use existing parseCSVFile pipeline
          const result = await parseCSVFile(file);

          if (result.validEntries.length === 0 && result.errors.length > 0) {
            setState(ImportState.ERROR);
            setError(result.errors[0]);
            return;
          }

          setParseResult({
            filename: file.name,
            fileSize: file.size,
            validEntries: result.validEntries,
            invalidEntries: result.invalidEntries,
            warnings: result.warnings,
            errors: result.errors,
          });
          setState(ImportState.PREVIEW);
        } else {
          // External CSV — route to column mapping
          const detection = detectColumns(headers);

          setExternalCSVData({
            headers,
            allRows: dataRows,
            sampleRows: dataRows.slice(0, 5),
            detectionResult: detection,
          });
          setState(ImportState.COLUMN_MAPPING);
        }
      } else {
        // JSON file — existing behavior
        const result = await parseJSONFile(file);

        if (result.validEntries.length === 0 && result.errors.length > 0) {
          setState(ImportState.ERROR);
          setError(result.errors[0]);
          return;
        }

        setParseResult({
          filename: file.name,
          fileSize: file.size,
          validEntries: result.validEntries,
          invalidEntries: result.invalidEntries,
          warnings: result.warnings,
          errors: result.errors,
        });
        setState(ImportState.PREVIEW);
      }
    } catch (err) {
      setState(ImportState.ERROR);
      setError(err.message || 'Failed to parse file');
    }
  }, []);

  /**
   * Confirm column mapping and transform external CSV rows into app entries.
   * Transitions from COLUMN_MAPPING to PREVIEW.
   *
   * @param {Record<string, number>} finalMappings - User-confirmed column mappings
   */
  const confirmMapping = useCallback((finalMappings) => {
    if (!externalCSVData) return;

    const { allRows } = externalCSVData;
    const { entries, skippedRows, stats } = transformRows(allRows, finalMappings);

    // Validate each transformed entry through the import pipeline
    const validEntries = [];
    const invalidEntries = [];
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const result = validateImportEntry(entries[i], { external: true });
      if (result.valid) {
        validEntries.push(result.entry);
      } else {
        invalidEntries.push({ index: i, raw: entries[i], errors: result.errors });
        errors.push(`Entry ${i + 1}: ${result.errors.join(', ')}`);
      }
    }

    // Add skipped-row info to errors for visibility
    const warnings = [];
    if (skippedRows.length > 0) {
      warnings.push(
        `${skippedRows.length} rows skipped: ${skippedRows.slice(0, 3).map((s) => `row ${s.row} (${s.reason})`).join(', ')}${skippedRows.length > 3 ? '...' : ''}`
      );
    }

    if (validEntries.length === 0) {
      setState(ImportState.ERROR);
      setError(errors[0] || 'No valid entries after column mapping');
      return;
    }

    setParseResult({
      filename: fileRef.current?.name || 'external.csv',
      fileSize: fileRef.current?.size || 0,
      validEntries,
      invalidEntries,
      warnings,
      errors,
      externalImportStats: stats,
    });
    setState(ImportState.PREVIEW);
  }, [externalCSVData]);

  /**
   * Go back from COLUMN_MAPPING to IDLE (file select).
   */
  const goBackToFileSelect = useCallback(() => {
    setState(ImportState.IDLE);
    setExternalCSVData(null);
    fileRef.current = null;
  }, []);

  /**
   * Execute the import with the given mode.
   * @param {string} mode - 'merge' or 'replace'
   */
  const executeImport = useCallback(async (mode = IMPORT_MODE_MERGE) => {
    if (!parseResult || parseResult.validEntries.length === 0) return;

    setState(ImportState.IMPORTING);
    setProgress({ current: 0, total: parseResult.validEntries.length, phase: 'starting' });

    try {
      const result = await importEntries(
        parseResult.validEntries,
        mode,
        {
          onProgress: (p) => setProgress(p),
          skipBackup: mode !== IMPORT_MODE_REPLACE ? true : false,
        }
      );

      if (result.success) {
        setImportResult(result);
        setState(ImportState.SUCCESS);
        // Remove cached entries entirely so Dashboard/History fetch fresh data on mount.
        // invalidateQueries only marks stale — unmounted queries won't refetch,
        // and 5-min staleTime may serve pre-import data on remount.
        queryClient.removeQueries({ queryKey: queryKeys.all });
      } else {
        setState(ImportState.ERROR);
        setError(result.errors?.[0] || 'Import failed');
      }
    } catch (err) {
      setState(ImportState.ERROR);
      setError(err.message || 'Import failed');
    }
  }, [parseResult, queryClient]);

  /**
   * Reset the import state machine back to IDLE.
   */
  const reset = useCallback(() => {
    setState(ImportState.IDLE);
    setParseResult(null);
    setImportResult(null);
    setError(null);
    setProgress({ current: 0, total: 0, phase: '' });
    setExternalCSVData(null);
    fileRef.current = null;
  }, []);

  /**
   * Retry parsing the last file after an error.
   */
  const retry = useCallback(() => {
    if (fileRef.current) {
      parseFile(fileRef.current);
    }
  }, [parseFile]);

  return {
    state,
    parseResult,
    importResult,
    error,
    progress,
    externalCSVData,
    parseFile,
    confirmMapping,
    goBackToFileSelect,
    executeImport,
    reset,
    retry,
  };
}
