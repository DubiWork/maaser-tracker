/**
 * Export Service for Ma'aser Tracker
 *
 * Provides JSON and CSV export functionality for entry data.
 * CSV uses PapaParse (dynamic import) with UTF-8 BOM for Hebrew Excel compatibility.
 * Includes formula injection prevention for CSV cells.
 */

/** Current export schema version */
const EXPORT_SCHEMA_VERSION = 1;

/** Internal fields that should be stripped from exported entries */
const INTERNAL_FIELDS = ['createdAt', 'updatedAt', 'userId'];

/** Characters that trigger formula execution in spreadsheet applications */
const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@'];

/** UTF-8 BOM for Excel Hebrew compatibility */
const UTF8_BOM = '\uFEFF';

/** CSV column headers (English) */
const CSV_HEADERS = ['id', 'type', 'date', 'amount', 'maaser', 'note', 'accountingMonth'];

/**
 * Normalize a date value to YYYY-MM-DD format.
 * Handles full ISO strings (e.g., "2026-03-01T00:00:00.000Z") and
 * plain date strings (e.g., "2026-03-01").
 * @param {string} dateValue - Date string to normalize
 * @returns {string} Date in YYYY-MM-DD format, or original value if not parseable
 */
function normalizeDateToYMD(dateValue) {
  if (!dateValue || typeof dateValue !== 'string') return dateValue;
  try {
    return new Date(dateValue).toISOString().split('T')[0];
  } catch {
    return dateValue;
  }
}

/**
 * Strip internal/server-side fields from an entry for export.
 * @param {Object} entry - Entry object potentially containing internal fields
 * @returns {Object} Entry with internal fields removed
 */
function stripInternalFields(entry) {
  const cleaned = { ...entry };
  for (const field of INTERNAL_FIELDS) {
    delete cleaned[field];
  }
  return cleaned;
}

/**
 * Prepare an entry for export by stripping internal fields
 * and normalizing the date to YYYY-MM-DD format.
 * @param {Object} entry - Entry object to prepare
 * @returns {Object} Cleaned entry with normalized date
 */
function prepareEntryForExport(entry) {
  const cleaned = stripInternalFields(entry);
  if (cleaned.date) {
    cleaned.date = normalizeDateToYMD(cleaned.date);
  }
  return cleaned;
}

/**
 * Sanitize a cell value to prevent CSV formula injection.
 * Prefixes cells starting with =, +, -, @ with a single quote.
 * @param {*} value - Cell value to sanitize
 * @returns {*} Sanitized value (string if prefixed, original otherwise)
 */
function sanitizeCsvCell(value) {
  if (typeof value !== 'string') return value;
  if (value.length === 0) return value;
  if (FORMULA_TRIGGER_CHARS.includes(value[0])) {
    return "'" + value;
  }
  return value;
}

/**
 * Sanitize all string fields in an entry for CSV export.
 * @param {Object} entry - Entry object
 * @returns {Object} Entry with sanitized string fields
 */
function sanitizeEntryForCsv(entry) {
  const sanitized = {};
  for (const [key, value] of Object.entries(entry)) {
    sanitized[key] = sanitizeCsvCell(value);
  }
  return sanitized;
}

/**
 * Generate a filename for export.
 * @param {'json' | 'csv'} format - Export format
 * @returns {string} Filename in format: maaser-tracker-YYYY-MM-DD.{json|csv}
 */
export function generateFilename(format) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `maaser-tracker-${year}-${month}-${day}.${format}`;
}

/**
 * Export entries to JSON format with a schema v1 envelope.
 * Strips internal fields (createdAt, updatedAt, userId) from entries.
 *
 * @param {Array<Object>} entries - Array of entry objects to export
 * @returns {string} JSON string with schema envelope
 * @throws {Error} If entries is empty or not an array
 */
export function exportToJSON(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('No entries to export');
  }

  const cleanedEntries = entries.map(prepareEntryForExport);

  const envelope = {
    version: EXPORT_SCHEMA_VERSION,
    exportDate: new Date().toISOString(),
    entryCount: cleanedEntries.length,
    entries: cleanedEntries,
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Export entries to CSV format using PapaParse.
 * Includes UTF-8 BOM prefix for Hebrew Excel compatibility.
 * Prevents formula injection by prefixing dangerous cell values.
 * PapaParse is loaded via dynamic import to enable code splitting.
 *
 * @param {Array<Object>} entries - Array of entry objects to export
 * @returns {Promise<string>} CSV string with UTF-8 BOM prefix
 * @throws {Error} If entries is empty or not an array
 */
export async function exportToCSV(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('No entries to export');
  }

  const Papa = await import('papaparse');

  const cleanedEntries = entries.map(prepareEntryForExport);
  const sanitizedEntries = cleanedEntries.map(sanitizeEntryForCsv);

  const csv = Papa.default.unparse(sanitizedEntries, {
    columns: CSV_HEADERS,
    header: true,
  });

  return UTF8_BOM + csv;
}

/**
 * Detect if the current browser is iOS Safari.
 * On iOS Safari, programmatic download is unreliable.
 * @returns {boolean} True if running on iOS Safari
 */
function isIOSSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  return isIOS && isSafari;
}

/**
 * Trigger a file download in the browser.
 * Creates a temporary Blob URL, clicks an anchor element, then revokes the URL.
 * On iOS Safari, opens the content in a new tab with a save instruction.
 *
 * @param {string} content - File content to download
 * @param {string} filename - Name for the downloaded file
 * @param {string} mimeType - MIME type of the content (e.g., 'application/json', 'text/csv')
 * @returns {{ downloaded: boolean, iosSafari: boolean }} Result indicating download method used
 */
export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  if (isIOSSafari()) {
    window.open(url, '_blank');
    // Revoke after a delay to allow the new tab to load
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { downloaded: true, iosSafari: true };
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return { downloaded: true, iosSafari: false };
}
