/**
 * useImportExport Hook
 *
 * Provides React Query mutations for export (JSON/CSV) and import operations.
 * Connects UI components to exportService and importService.
 *
 * Export hooks read entries via useEntries and trigger file downloads.
 * Import hook manages a state machine: IDLE -> PARSING -> PREVIEW -> IMPORTING -> SUCCESS/ERROR.
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
  IMPORT_MODE_MERGE,
  IMPORT_MODE_REPLACE,
} from '../services/importService';

/** Import state machine states */
export const ImportState = {
  IDLE: 'idle',
  PARSING: 'parsing',
  PREVIEW: 'preview',
  IMPORTING: 'importing',
  SUCCESS: 'success',
  ERROR: 'error',
};

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
 * Hook for importing entries from a file.
 *
 * Manages the import state machine:
 *   IDLE -> PARSING -> PREVIEW -> IMPORTING -> SUCCESS/ERROR
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

  /**
   * Parse a file and transition to PREVIEW state.
   * @param {File} file - File to parse
   */
  const parseFile = useCallback(async (file) => {
    if (!file) return;

    fileRef.current = file;
    setState(ImportState.PARSING);
    setError(null);
    setParseResult(null);
    setImportResult(null);

    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const result = isCSV ? await parseCSVFile(file) : await parseJSONFile(file);

      // If there are file-level errors AND no valid entries, treat as error
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
    } catch (err) {
      setState(ImportState.ERROR);
      setError(err.message || 'Failed to parse file');
    }
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
    parseFile,
    executeImport,
    reset,
    retry,
  };
}
