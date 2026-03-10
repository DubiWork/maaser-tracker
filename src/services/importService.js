/**
 * Import Service for Ma'aser Tracker
 *
 * Parses and validates JSON and CSV files for import.
 * Handles Hebrew/English column mapping, date format detection,
 * amount coercion, and security sanitization.
 *
 * Import Engine (batch write & conflict resolution):
 * - Two modes: MERGE (add alongside existing) and REPLACE (clear + add)
 * - Batch processing: 100 entries/batch for IndexedDB
 * - Progress callbacks for UI updates
 * - Auto-backup before Replace mode
 * - Maaser recalculation after import
 */

import { NOTE_MAX_LENGTH, getAccountingMonthFromDate } from './validation';
import { addEntry, getAllEntries, clearAllEntries } from './db';
import { exportToJSON, downloadFile, generateFilename } from './exportService';

// --- Constants ---

/** Soft warning threshold in bytes (5 MB) */
export const FILE_SIZE_WARNING = 5 * 1024 * 1024;

/** Hard rejection threshold in bytes (10 MB) */
export const FILE_SIZE_LIMIT = 10 * 1024 * 1024;

/** Current schema version for JSON export/import */
export const SCHEMA_VERSION = 1;

/** Valid entry type values */
const VALID_TYPES = ['income', 'donation', 'maaser'];

/** Keys considered dangerous for prototype pollution */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Hebrew-to-English column header mapping.
 * Keys are lowercase-trimmed Hebrew headers; values are internal field names.
 */
export const HEBREW_HEADER_MAP = {
  'סוג': 'type',
  'סכום': 'amount',
  'תאריך': 'date',
  'הערה': 'note',
  'הערות': 'note',
  'מעשר': 'maaser',
  'מזהה': 'id',
};

/**
 * English-to-internal column header mapping (case-insensitive).
 */
const ENGLISH_HEADER_MAP = {
  'type': 'type',
  'amount': 'amount',
  'date': 'date',
  'note': 'note',
  'notes': 'note',
  'maaser': 'maaser',
  'id': 'id',
};

/**
 * Hebrew type value mapping to internal values.
 */
export const HEBREW_TYPE_MAP = {
  'הכנסה': 'income',
  'תרומה': 'donation',
  'מעשר': 'maaser',
};

// --- File Size Validation ---

/**
 * Validate file size against limits.
 * @param {File} file - File object to check
 * @returns {{ valid: boolean, warning: boolean, error: string|null }}
 */
export function validateFileSize(file) {
  if (!file || typeof file.size !== 'number') {
    return { valid: false, warning: false, error: 'Invalid file object' };
  }

  if (file.size > FILE_SIZE_LIMIT) {
    return {
      valid: false,
      warning: false,
      error: `File size (${formatBytes(file.size)}) exceeds maximum limit of ${formatBytes(FILE_SIZE_LIMIT)}`,
    };
  }

  if (file.size > FILE_SIZE_WARNING) {
    return {
      valid: true,
      warning: true,
      error: null,
    };
  }

  return { valid: true, warning: false, error: null };
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// --- BOM Stripping ---

/**
 * Strip UTF-8 BOM from text content.
 * @param {string} text - Raw text that may contain BOM
 * @returns {string} Text without BOM
 */
export function stripBOM(text) {
  if (typeof text !== 'string') return text;
  if (text.charCodeAt(0) === 0xFEFF) {
    return text.slice(1);
  }
  return text;
}

// --- Security: Prototype Pollution Protection ---

/**
 * Recursively strip dangerous keys from an object to prevent prototype pollution.
 * @param {*} obj - Object to sanitize
 * @returns {*} Sanitized object (new copy)
 */
export function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean = {};
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.includes(key)) continue;
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
}

// --- Date Parsing ---

/**
 * Detect and parse a date value into ISO format (YYYY-MM-DD).
 *
 * Tries formats in order:
 * 1. ISO 8601 (YYYY-MM-DD or full ISO string)
 * 2. DD/MM/YYYY (Israeli locale default)
 * 3. MM/DD/YYYY
 *
 * @param {string} value - Date string to parse
 * @returns {{ date: string|null, format: string|null, error: string|null }}
 */
export function parseDateValue(value) {
  if (!value || typeof value !== 'string') {
    return { date: null, format: null, error: 'Date value is required' };
  }

  const trimmed = value.trim();

  // Try ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isValidDateParts(year, month, day)) {
      return { date: `${year}-${month}-${day}`, format: 'ISO', error: null };
    }
  }

  // Try DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const ddmmMatch = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (ddmmMatch) {
    const [, part1, part2, year] = ddmmMatch;
    const day = part1.padStart(2, '0');
    const month = part2.padStart(2, '0');

    // Try DD/MM/YYYY first (Israeli default)
    if (isValidDateParts(year, month, day)) {
      return {
        date: `${year}-${month}-${day}`,
        format: 'DD/MM/YYYY',
        error: null,
      };
    }

    // Try MM/DD/YYYY
    const altDay = part2.padStart(2, '0');
    const altMonth = part1.padStart(2, '0');
    if (isValidDateParts(year, altMonth, altDay)) {
      return {
        date: `${year}-${altMonth}-${altDay}`,
        format: 'MM/DD/YYYY',
        error: null,
      };
    }
  }

  return { date: null, format: null, error: `Unable to parse date: "${trimmed}"` };
}

/**
 * Validate date parts are within valid ranges.
 * @param {string} year
 * @param {string} month
 * @param {string} day
 * @returns {boolean}
 */
function isValidDateParts(year, month, day) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  // Validate actual date (handles Feb 30, etc.)
  const testDate = new Date(y, m - 1, d);
  return (
    testDate.getFullYear() === y &&
    testDate.getMonth() === m - 1 &&
    testDate.getDate() === d
  );
}

// --- Header Mapping ---

/**
 * Map CSV headers (Hebrew or English) to internal field names.
 * @param {string[]} headers - Raw header strings from CSV
 * @returns {{ mapped: Record<string, string>, unmapped: string[] }}
 */
export function mapCSVHeaders(headers) {
  if (!Array.isArray(headers)) {
    return { mapped: {}, unmapped: [] };
  }

  const mapped = {};
  const unmapped = [];

  for (const header of headers) {
    const trimmed = (header || '').trim();
    const lower = trimmed.toLowerCase();

    // Try Hebrew mapping first
    const hebrewMatch = HEBREW_HEADER_MAP[trimmed];
    if (hebrewMatch) {
      mapped[header] = hebrewMatch;
      continue;
    }

    // Try English mapping (case-insensitive)
    const englishMatch = ENGLISH_HEADER_MAP[lower];
    if (englishMatch) {
      mapped[header] = englishMatch;
      continue;
    }

    unmapped.push(header);
  }

  return { mapped, unmapped };
}

// --- Amount Coercion ---

/**
 * Parse and coerce an amount value to a valid positive number.
 * Handles string amounts, comma-separated numbers (e.g., "1,000.50").
 * @param {*} value - Amount value to coerce
 * @returns {{ amount: number|null, error: string|null }}
 */
export function parseAmount(value) {
  if (value === null || value === undefined || value === '') {
    return { amount: null, error: 'Amount is required' };
  }

  let num;

  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    // Remove commas used as thousand separators
    const cleaned = value.trim().replace(/,/g, '');
    num = Number(cleaned);
  } else {
    return { amount: null, error: 'Amount must be a number or numeric string' };
  }

  if (!Number.isFinite(num)) {
    return { amount: null, error: 'Amount must be a finite number' };
  }

  if (num <= 0) {
    return { amount: null, error: 'Amount must be positive' };
  }

  return { amount: num, error: null };
}

// --- Type Mapping ---

/**
 * Map a type value (Hebrew or English) to an internal type.
 * @param {string} value - Raw type value
 * @returns {{ type: string|null, error: string|null }}
 */
export function mapTypeValue(value) {
  if (!value || typeof value !== 'string') {
    return { type: null, error: 'Type is required' };
  }

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();

  // Direct English match
  if (VALID_TYPES.includes(lower)) {
    return { type: lower, error: null };
  }

  // Hebrew match
  const hebrewMatch = HEBREW_TYPE_MAP[trimmed];
  if (hebrewMatch) {
    return { type: hebrewMatch, error: null };
  }

  return {
    type: null,
    error: `Invalid type: "${trimmed}". Expected: income, donation, maaser`,
  };
}

// --- Note Sanitization ---

/**
 * Sanitize a note field: trim, enforce max length, strip control characters.
 * @param {*} value - Raw note value
 * @returns {string} Sanitized note (empty string if invalid)
 */
export function sanitizeNote(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return String(value);

  // Strip control characters (except newlines and tabs)
  // eslint-disable-next-line no-control-regex
  let sanitized = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  sanitized = sanitized.trim();

  if (sanitized.length > NOTE_MAX_LENGTH) {
    sanitized = sanitized.slice(0, NOTE_MAX_LENGTH);
  }

  return sanitized;
}

// --- Entry Validation ---

/**
 * Validate and normalize a single import entry.
 * Coerces types, maps Hebrew values, validates all fields.
 *
 * @param {Object} raw - Raw entry object from parsed file
 * @returns {{ valid: boolean, entry: Object|null, errors: string[] }}
 */
export function validateImportEntry(raw) {
  const errors = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, entry: null, errors: ['Entry must be an object'] };
  }

  // Sanitize for prototype pollution
  const entry = sanitizeObject(raw);

  // Type
  const typeResult = mapTypeValue(entry.type);
  if (typeResult.error) {
    errors.push(typeResult.error);
  }

  // Amount
  const amountResult = parseAmount(entry.amount);
  if (amountResult.error) {
    errors.push(amountResult.error);
  }

  // Date
  const dateResult = parseDateValue(entry.date);
  if (dateResult.error) {
    errors.push(dateResult.error);
  }

  // Note (optional)
  const note = sanitizeNote(entry.note);

  if (errors.length > 0) {
    return { valid: false, entry: null, errors };
  }

  return {
    valid: true,
    entry: {
      type: typeResult.type,
      amount: amountResult.amount,
      date: dateResult.date,
      note: note || undefined,
    },
    errors: [],
  };
}

// --- JSON Parsing ---

/**
 * Read and parse a JSON file with schema validation.
 *
 * Expected JSON envelope:
 * {
 *   "version": 1,
 *   "exportedAt": "...",
 *   "entries": [...]
 * }
 *
 * @param {File} file - File object to parse
 * @returns {Promise<{ validEntries: Object[], invalidEntries: Object[], errors: string[], warnings: string[] }>}
 */
export async function parseJSONFile(file) {
  const sizeCheck = validateFileSize(file);
  const warnings = [];

  if (!sizeCheck.valid) {
    return { validEntries: [], invalidEntries: [], errors: [sizeCheck.error], warnings: [] };
  }
  if (sizeCheck.warning) {
    warnings.push('File is large and may take a while to process');
  }

  let text;
  try {
    text = await file.text();
  } catch {
    return { validEntries: [], invalidEntries: [], errors: ['Failed to read file'], warnings };
  }

  // Strip BOM
  text = stripBOM(text);

  // Parse JSON
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { validEntries: [], invalidEntries: [], errors: ['Invalid JSON format'], warnings };
  }

  // Prototype pollution protection
  data = sanitizeObject(data);

  // Validate envelope
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { validEntries: [], invalidEntries: [], errors: ['JSON must be an object with version and entries'], warnings };
  }

  if (data.version !== SCHEMA_VERSION) {
    return {
      validEntries: [],
      invalidEntries: [],
      errors: [`Unsupported schema version: ${data.version}. Expected: ${SCHEMA_VERSION}`],
      warnings,
    };
  }

  if (!Array.isArray(data.entries)) {
    return { validEntries: [], invalidEntries: [], errors: ['JSON must contain an "entries" array'], warnings };
  }

  if (data.entries.length === 0) {
    return { validEntries: [], invalidEntries: [], errors: ['No entries found in file'], warnings };
  }

  // Validate each entry
  const validEntries = [];
  const invalidEntries = [];
  const entryErrors = [];

  for (let i = 0; i < data.entries.length; i++) {
    const result = validateImportEntry(data.entries[i]);
    if (result.valid) {
      validEntries.push(result.entry);
    } else {
      invalidEntries.push({ index: i, raw: data.entries[i], errors: result.errors });
      entryErrors.push(`Entry ${i + 1}: ${result.errors.join(', ')}`);
    }
  }

  return { validEntries, invalidEntries, errors: entryErrors, warnings };
}

// --- CSV Parsing ---

/**
 * Read and parse a CSV file with header mapping.
 *
 * Supports Hebrew and English column headers.
 * Uses PapaParse for robust CSV parsing (BOM, CRLF, delimiters).
 *
 * @param {File} file - File object to parse
 * @returns {Promise<{ validEntries: Object[], invalidEntries: Object[], errors: string[], warnings: string[] }>}
 */
export async function parseCSVFile(file) {
  const sizeCheck = validateFileSize(file);
  const warnings = [];

  if (!sizeCheck.valid) {
    return { validEntries: [], invalidEntries: [], errors: [sizeCheck.error], warnings: [] };
  }
  if (sizeCheck.warning) {
    warnings.push('File is large and may take a while to process');
  }

  let text;
  try {
    text = await file.text();
  } catch {
    return { validEntries: [], invalidEntries: [], errors: ['Failed to read file'], warnings };
  }

  // Strip BOM
  text = stripBOM(text);

  // Dynamic import of PapaParse
  let Papa;
  try {
    const module = await import('papaparse');
    Papa = module.default || module;
  } catch {
    return { validEntries: [], invalidEntries: [], errors: ['Failed to load CSV parser'], warnings };
  }

  // Parse CSV
  const parseResult = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // We handle type coercion ourselves
    delimiter: '', // Auto-detect (supports comma, semicolon, tab)
  });

  if (parseResult.errors && parseResult.errors.length > 0) {
    const criticalErrors = parseResult.errors.filter(
      (e) => e.type === 'Delimiter' || e.type === 'FieldMismatch'
    );
    if (criticalErrors.length > 0) {
      return {
        validEntries: [],
        invalidEntries: [],
        errors: criticalErrors.map((e) => `CSV parse error (row ${e.row + 1}): ${e.message}`),
        warnings,
      };
    }
    // Non-critical errors become warnings
    for (const e of parseResult.errors) {
      warnings.push(`CSV warning (row ${(e.row ?? 0) + 1}): ${e.message}`);
    }
  }

  if (!parseResult.data || parseResult.data.length === 0) {
    return { validEntries: [], invalidEntries: [], errors: ['No data rows found in CSV'], warnings };
  }

  // Map headers
  const headers = parseResult.meta?.fields || [];
  const { mapped, unmapped } = mapCSVHeaders(headers);

  if (unmapped.length > 0) {
    warnings.push(`Unmapped columns will be ignored: ${unmapped.join(', ')}`);
  }

  // Check we have minimum required mapped headers
  const mappedValues = Object.values(mapped);
  const hasType = mappedValues.includes('type');
  const hasAmount = mappedValues.includes('amount');
  const hasDate = mappedValues.includes('date');

  if (!hasType || !hasAmount || !hasDate) {
    const missing = [];
    if (!hasType) missing.push('type');
    if (!hasAmount) missing.push('amount');
    if (!hasDate) missing.push('date');
    return {
      validEntries: [],
      invalidEntries: [],
      errors: [`Missing required columns: ${missing.join(', ')}`],
      warnings,
    };
  }

  // Convert rows to entries using header mapping
  const validEntries = [];
  const invalidEntries = [];
  const entryErrors = [];

  for (let i = 0; i < parseResult.data.length; i++) {
    const row = parseResult.data[i];
    const rawEntry = {};

    for (const [originalHeader, fieldName] of Object.entries(mapped)) {
      rawEntry[fieldName] = row[originalHeader];
    }

    const result = validateImportEntry(rawEntry);
    if (result.valid) {
      validEntries.push(result.entry);
    } else {
      invalidEntries.push({ index: i, raw: rawEntry, errors: result.errors });
      entryErrors.push(`Row ${i + 1}: ${result.errors.join(', ')}`);
    }
  }

  if (validEntries.length === 0 && invalidEntries.length === 0) {
    return { validEntries: [], invalidEntries: [], errors: ['No data rows found in CSV'], warnings };
  }

  return { validEntries, invalidEntries, errors: entryErrors, warnings };
}

// ========================================================================
// Import Engine — Batch Write & Conflict Resolution
// ========================================================================

/** Import mode: add entries alongside existing data */
export const IMPORT_MODE_MERGE = 'merge';

/** Import mode: clear all existing data, then add entries */
export const IMPORT_MODE_REPLACE = 'replace';

/** Batch size for IndexedDB writes */
export const INDEXEDDB_BATCH_SIZE = 100;

/**
 * Yield control to the main thread to avoid UI freezing.
 * Uses setTimeout(0) to let the browser process pending events.
 * @returns {Promise<void>}
 */
function yieldToMainThread() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Prepare a validated entry for storage by assigning a new UUID,
 * accountingMonth, and ensuring all required fields are present.
 *
 * @param {Object} entry - Validated entry from parseJSONFile/parseCSVFile
 * @returns {Object} Entry ready for IndexedDB storage
 */
export function prepareEntryForStorage(entry) {
  const id = crypto.randomUUID();
  const accountingMonth = getAccountingMonthFromDate(entry.date);

  return {
    id,
    type: entry.type,
    amount: entry.amount,
    date: entry.date,
    note: entry.note || '',
    accountingMonth,
  };
}

/**
 * Create an auto-backup of current entries as a JSON download.
 * Called automatically before Replace mode to protect user data.
 *
 * @param {Array} entries - Current entries to back up
 * @returns {{ success: boolean, entryCount: number, error: string|null }}
 */
export function createAutoBackup(entries) {
  if (!entries || entries.length === 0) {
    return { success: true, entryCount: 0, error: null };
  }

  try {
    const json = exportToJSON(entries);
    const filename = `backup-before-import-${generateFilename('json')}`;
    downloadFile(json, filename, 'application/json');
    return { success: true, entryCount: entries.length, error: null };
  } catch (err) {
    return { success: false, entryCount: 0, error: err.message };
  }
}

/**
 * Write entries to IndexedDB in batches, yielding to the main thread
 * between each batch to keep the UI responsive.
 *
 * @param {Array} entries - Prepared entries (with id, accountingMonth, etc.)
 * @param {Object} options
 * @param {number} [options.batchSize=100] - Entries per batch
 * @param {Function} [options.onProgress] - Callback: ({ current, total, phase })
 * @param {number} [options.startOffset=0] - Starting offset for progress reporting
 * @returns {Promise<{ written: number, failed: Array, errors: string[] }>}
 */
export async function batchWriteIndexedDB(entries, options = {}) {
  const batchSize = options.batchSize || INDEXEDDB_BATCH_SIZE;
  const onProgress = options.onProgress || null;
  const startOffset = options.startOffset || 0;

  let written = 0;
  const failed = [];
  const errors = [];

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    for (const entry of batch) {
      try {
        await addEntry(entry);
        written++;
      } catch (err) {
        failed.push({ entry, error: err.message });
        errors.push(`Failed to write entry ${entry.id}: ${err.message}`);
      }
    }

    if (onProgress) {
      onProgress({
        current: startOffset + Math.min(i + batchSize, entries.length),
        total: startOffset + entries.length,
        phase: 'importing',
      });
    }

    // Yield to main thread between batches (not after last batch)
    if (i + batchSize < entries.length) {
      await yieldToMainThread();
    }
  }

  return { written, failed, errors };
}

/**
 * Import entries in MERGE mode: generate new UUIDs and add alongside existing data.
 *
 * @param {Array} validatedEntries - Entries from parseJSONFile/parseCSVFile
 * @param {Object} [options]
 * @param {Function} [options.onProgress] - Progress callback
 * @returns {Promise<{ success: boolean, imported: number, failed: Array, errors: string[] }>}
 */
export async function mergeEntries(validatedEntries, options = {}) {
  const onProgress = options.onProgress || null;

  if (!validatedEntries || validatedEntries.length === 0) {
    return { success: false, imported: 0, failed: [], errors: ['No entries to import'] };
  }

  // Validation phase
  if (onProgress) {
    onProgress({ current: 0, total: validatedEntries.length, phase: 'validating' });
  }

  // Prepare entries with new UUIDs and accountingMonth
  const prepared = validatedEntries.map(prepareEntryForStorage);

  // Import phase
  const result = await batchWriteIndexedDB(prepared, {
    batchSize: INDEXEDDB_BATCH_SIZE,
    onProgress,
  });

  // Complete phase
  if (onProgress) {
    onProgress({
      current: validatedEntries.length,
      total: validatedEntries.length,
      phase: 'complete',
    });
  }

  return {
    success: result.errors.length === 0,
    imported: result.written,
    failed: result.failed,
    errors: result.errors,
  };
}

/**
 * Import entries in REPLACE mode: auto-backup existing data, clear all entries,
 * then batch-add the imported entries.
 *
 * @param {Array} validatedEntries - Entries from parseJSONFile/parseCSVFile
 * @param {Object} [options]
 * @param {Function} [options.onProgress] - Progress callback
 * @param {boolean} [options.skipBackup=false] - Skip auto-backup (for testing)
 * @returns {Promise<{ success: boolean, imported: number, backedUp: number, failed: Array, errors: string[] }>}
 */
export async function replaceAllEntries(validatedEntries, options = {}) {
  const onProgress = options.onProgress || null;
  const skipBackup = options.skipBackup || false;

  if (!validatedEntries || validatedEntries.length === 0) {
    return { success: false, imported: 0, backedUp: 0, failed: [], errors: ['No entries to import'] };
  }

  const errors = [];
  let backedUp = 0;

  // Validation phase
  if (onProgress) {
    onProgress({ current: 0, total: validatedEntries.length, phase: 'validating' });
  }

  // Backup phase
  if (!skipBackup) {
    if (onProgress) {
      onProgress({ current: 0, total: validatedEntries.length, phase: 'backing-up' });
    }

    try {
      const existingEntries = await getAllEntries();
      if (existingEntries.length > 0) {
        const backupResult = createAutoBackup(existingEntries);
        if (!backupResult.success) {
          return {
            success: false,
            imported: 0,
            backedUp: 0,
            failed: [],
            errors: [`Auto-backup failed: ${backupResult.error}. Import aborted for safety.`],
          };
        }
        backedUp = backupResult.entryCount;
      }
    } catch (err) {
      return {
        success: false,
        imported: 0,
        backedUp: 0,
        failed: [],
        errors: [`Failed to read existing entries for backup: ${err.message}. Import aborted.`],
      };
    }
  }

  // Clearing phase
  if (onProgress) {
    onProgress({ current: 0, total: validatedEntries.length, phase: 'clearing' });
  }

  try {
    await clearAllEntries();
  } catch (err) {
    return {
      success: false,
      imported: 0,
      backedUp,
      failed: [],
      errors: [`Failed to clear existing entries: ${err.message}. Import aborted.`],
    };
  }

  // Prepare entries with new UUIDs
  const prepared = validatedEntries.map(prepareEntryForStorage);

  // Import phase
  const writeResult = await batchWriteIndexedDB(prepared, {
    batchSize: INDEXEDDB_BATCH_SIZE,
    onProgress,
  });

  // Complete phase
  if (onProgress) {
    onProgress({
      current: validatedEntries.length,
      total: validatedEntries.length,
      phase: 'complete',
    });
  }

  return {
    success: writeResult.errors.length === 0,
    imported: writeResult.written,
    backedUp,
    failed: writeResult.failed,
    errors: [...errors, ...writeResult.errors],
  };
}

/**
 * Main import orchestrator. Delegates to merge or replace based on mode.
 *
 * @param {Array} validatedEntries - Entries from parseJSONFile/parseCSVFile
 * @param {string} mode - Import mode: 'merge' or 'replace'
 * @param {Object} [options]
 * @param {Function} [options.onProgress] - Progress callback: ({ current, total, phase })
 * @param {boolean} [options.skipBackup=false] - Skip auto-backup in replace mode
 * @returns {Promise<{ success: boolean, mode: string, imported: number, backedUp: number, failed: Array, errors: string[] }>}
 */
export async function importEntries(validatedEntries, mode = IMPORT_MODE_MERGE, options = {}) {
  if (mode !== IMPORT_MODE_MERGE && mode !== IMPORT_MODE_REPLACE) {
    return {
      success: false,
      mode,
      imported: 0,
      backedUp: 0,
      failed: [],
      errors: [`Invalid import mode: "${mode}". Use "${IMPORT_MODE_MERGE}" or "${IMPORT_MODE_REPLACE}".`],
    };
  }

  if (!validatedEntries || validatedEntries.length === 0) {
    return {
      success: false,
      mode,
      imported: 0,
      backedUp: 0,
      failed: [],
      errors: ['No entries to import'],
    };
  }

  if (mode === IMPORT_MODE_REPLACE) {
    const result = await replaceAllEntries(validatedEntries, options);
    return { ...result, mode };
  }

  // Default: MERGE mode
  const result = await mergeEntries(validatedEntries, options);
  return { ...result, mode, backedUp: 0 };
}
