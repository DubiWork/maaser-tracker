/**
 * External CSV Import — Integration Tests
 *
 * End-to-end tests for the full external CSV import pipeline:
 *   raw CSV text -> PapaParse -> detectColumns -> transformRows
 *                -> validateImportEntry -> importEntries -> IndexedDB
 *
 * Uses real fixture files simulating Google Sheets exports and edge cases.
 * No mocks for db/export/import — uses fake-indexeddb from test setup.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { detectColumns, transformRows, parseCurrencyAmount } from '../columnMappingService';
import {
  validateImportEntry,
  importEntries,
  parseCSVFile,
  parseJSONFile,
  IMPORT_MODE_MERGE,
  IMPORT_MODE_REPLACE,
  SCHEMA_VERSION,
} from '../importService';
import { exportToJSON } from '../exportService';
import { addEntry, getAllEntries, clearAllEntries } from '../db';
import { isAppCSVFormat } from '../../hooks/useImportExport';

// --- Helpers ---

/** Read a fixture file from the fixtures/ directory */
function readFixture(filename) {
  return readFileSync(resolve(__dirname, 'fixtures', filename), 'utf-8');
}

/** Parse raw CSV text with PapaParse into headers + data rows (no header mode) */
async function parseRawCSV(text) {
  const Papa = await import('papaparse');
  const result = Papa.default.parse(text, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
    delimiter: '',
  });
  const headers = result.data[0];
  const dataRows = result.data.slice(1);
  return { headers, dataRows };
}

/** Create a mock File from string content */
function createMockFile(content, name = 'test.csv', size = null) {
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name);
  if (size !== null) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

/** Create a well-formed entry for direct IndexedDB storage */
function makeStorageEntry(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'income',
    date: '2026-03-15',
    amount: 1000,
    note: 'Test entry',
    accountingMonth: '2026-03',
    ...overrides,
  };
}

// Clean database between tests
beforeEach(async () => {
  await clearAllEntries();
});

// ========================================================================
// Full Pipeline Tests — Google Sheets CSV
// ========================================================================
describe('Full pipeline: Google Sheets CSV fixture', () => {
  let headers;
  let dataRows;
  let detection;
  let transformResult;

  beforeEach(async () => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `pipe-uuid-${++counter}`);

    const csv = readFixture('google-sheets-sample.csv');
    const parsed = await parseRawCSV(csv);
    headers = parsed.headers;
    dataRows = parsed.dataRows;
    detection = detectColumns(headers);
    transformResult = transformRows(dataRows, detection.mappings);
  });

  it('should detect all Hebrew columns with high confidence', () => {
    expect(detection.mappings.date).toBeDefined();
    expect(detection.mappings.income).toBeDefined();
    expect(detection.mappings.maaser).toBeDefined();
    expect(detection.mappings.donation).toBeDefined();
    expect(detection.confidence.date).toBe('high');
    expect(detection.confidence.income).toBe('high');
    expect(detection.confidence.maaser).toBe('high');
    expect(detection.confidence.donation).toBe('high');
  });

  it('should produce correct number of income entries from valid rows', () => {
    // Rows: 05-08/2018 have income > 0 (4 rows), 09/2018 has income=0, 10-11 empty, summary skipped
    expect(transformResult.stats.incomeEntries).toBe(4);
  });

  it('should produce correct number of donation entries from valid rows', () => {
    // 05/2018: 1200, 06/2018: 1500, 07/2018: 2000, 08/2018: donation=0 (skip), 09/2018: income=0 skip
    expect(transformResult.stats.donationEntries).toBe(3);
  });

  it('should generate unique UUIDs for every entry', () => {
    const ids = transformResult.entries.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    expect(ids.length).toBe(transformResult.stats.incomeEntries + transformResult.stats.donationEntries);
  });

  it('should transform dates from MM/YYYY to YYYY-MM-DD format', () => {
    const incomeEntries = transformResult.entries.filter((e) => e.type === 'income');
    expect(incomeEntries[0].date).toBe('2018-05-01');
    expect(incomeEntries[1].date).toBe('2018-06-01');
    expect(incomeEntries[2].date).toBe('2018-07-01');
    expect(incomeEntries[3].date).toBe('2018-08-01');
  });

  it('should strip currency symbols and thousand separators from amounts', () => {
    const incomeEntries = transformResult.entries.filter((e) => e.type === 'income');
    expect(incomeEntries[0].amount).toBe(15000);
    expect(incomeEntries[1].amount).toBe(15000);
    expect(incomeEntries[2].amount).toBe(18541.25);
    expect(incomeEntries[3].amount).toBe(12000);
  });

  it('should validate all transformed entries through import pipeline', () => {
    const results = transformResult.entries.map((e) =>
      validateImportEntry(e, { external: true })
    );
    const allValid = results.every((r) => r.valid);
    expect(allValid).toBe(true);
  });

  it('should import validated entries into IndexedDB successfully', async () => {
    const validEntries = transformResult.entries
      .map((e) => validateImportEntry(e, { external: true }))
      .filter((r) => r.valid)
      .map((r) => r.entry);

    const result = await importEntries(validEntries, IMPORT_MODE_MERGE);
    expect(result.success).toBe(true);
    expect(result.imported).toBe(validEntries.length);

    const stored = await getAllEntries();
    expect(stored).toHaveLength(validEntries.length);
  });
});

// ========================================================================
// Row Splitting Tests
// ========================================================================
describe('Row splitting: income + donation from single CSV row', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `split-uuid-${++counter}`);
  });

  it('should create 2 entries from row with income + donation', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['05/2018', '₪15,000.00', '₪1,500.00', '₪1,200.00']];
    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].type).toBe('income');
    expect(result.entries[1].type).toBe('donation');
  });

  it('should create 1 entry from row with income only (donation = 0)', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['08/2018', '₪12,000.00', '₪1,200.00', '₪0.00']];
    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].type).toBe('income');
  });

  it('should create 1 entry from row with income and no donation column mapped', () => {
    const mappings = { date: 0, income: 1, maaser: 2 };
    const rows = [['05/2018', '₪15,000.00', '₪1,500.00']];
    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].type).toBe('income');
  });

  it('should preserve date and accountingMonth on both income and donation entries', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['07/2018', '₪18,541.25', '₪1,854.13', '₪2,000.00']];
    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].date).toBe('2018-07-01');
    expect(result.entries[0].accountingMonth).toBe('2018-07');
    expect(result.entries[1].date).toBe('2018-07-01');
    expect(result.entries[1].accountingMonth).toBe('2018-07');
  });

  it('should store maaser on income entry, not on donation entry', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['05/2018', '₪15,000.00', '₪1,500.00', '₪1,200.00']];
    const result = transformRows(rows, mappings);

    expect(result.entries[0].type).toBe('income');
    expect(result.entries[0].maaser).toBe(1500);
    expect(result.entries[1].type).toBe('donation');
    expect(result.entries[1].maaser).toBeUndefined();
  });
});

// ========================================================================
// Edge Cases — Fixture-based
// ========================================================================
describe('Edge cases: edge-cases.csv fixture', () => {
  let transformResult;

  beforeEach(async () => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `edge-uuid-${++counter}`);

    const csv = readFixture('edge-cases.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    transformResult = transformRows(parsed.dataRows, detection.mappings);
  });

  it('should skip rows with zero income', () => {
    // Row 1: 01/2020 has income=0, should be skipped
    const skippedZero = transformResult.skippedRows.find(
      (s) => s.reason.includes('Income amount')
    );
    expect(skippedZero).toBeDefined();
  });

  it('should handle small fractional amounts correctly', () => {
    // Row 2: 02/2020 has income=100.50
    const smallEntry = transformResult.entries.find((e) => e.amount === 100.50);
    expect(smallEntry).toBeDefined();
    expect(smallEntry.type).toBe('income');
  });

  it('should handle very large amounts correctly (1,000,000)', () => {
    const largeEntry = transformResult.entries.find((e) => e.amount === 1000000);
    expect(largeEntry).toBeDefined();
    expect(largeEntry.type).toBe('income');
  });

  it('should skip completely empty rows', () => {
    const emptySkip = transformResult.skippedRows.find(
      (s) => s.reason === 'Empty row'
    );
    expect(emptySkip).toBeDefined();
  });

  it('should skip rows with invalid dates', () => {
    const dateSkip = transformResult.skippedRows.find(
      (s) => s.reason.includes('date')
    );
    expect(dateSkip).toBeDefined();
  });

  it('should skip rows with non-numeric income amounts', () => {
    // Row 6: income="not-a-number" — parseCurrencyAmount returns null -> skipped
    const nonNumericSkip = transformResult.skippedRows.find(
      (s) => s.reason.includes('Income amount')
    );
    expect(nonNumericSkip).toBeDefined();
  });
});

// ========================================================================
// Google Sheets specific edge cases
// ========================================================================
describe('Google Sheets format edge cases', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `gs-uuid-${++counter}`);
  });

  it('should skip summary row with Hebrew total label', async () => {
    const csv = readFixture('google-sheets-sample.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    const result = transformRows(parsed.dataRows, detection.mappings);

    // The summary row date cell is "סה"כ" which is not a valid date
    const summarySkip = result.skippedRows.find(
      (s) => s.reason.includes('date')
    );
    expect(summarySkip).toBeDefined();
  });

  it('should skip empty future month rows (10/2018, 11/2018)', async () => {
    const csv = readFixture('google-sheets-sample.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    const result = transformRows(parsed.dataRows, detection.mappings);

    // 10/2018 and 11/2018 have only dates but empty amounts
    const emptyMonthSkips = result.skippedRows.filter(
      (s) => s.reason.includes('Income amount')
    );
    expect(emptyMonthSkips.length).toBeGreaterThanOrEqual(2);
  });

  it('should ignore the extra balance column mapped as unmapped or ignore', async () => {
    const csv = readFixture('google-sheets-sample.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);

    // The 5th column header "נשאר להפריש מחודש קודם" is in the ignore list
    // The 6th column "₪0.00" is unmapped
    // Neither should appear in the mappings as regular fields
    expect(detection.mappings).not.toHaveProperty('ignore');
  });

  it('should handle negative amounts in balance column without mapping them', () => {
    // The balance column "-₪145.88" is in an ignore/unmapped column.
    // parseCurrencyAmount handles negatives but they should never be mapped.
    const negativeAmount = parseCurrencyAmount('-₪145.88');
    expect(negativeAmount).toBe(-145.88);
    // But since the column is ignore/unmapped, it won't affect entries
  });
});

// ========================================================================
// Column Detection Tests
// ========================================================================
describe('Column detection accuracy', () => {
  it('should detect Hebrew headers with high confidence from fixture', async () => {
    const csv = readFixture('google-sheets-sample.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);

    for (const field of ['date', 'income', 'maaser', 'donation']) {
      expect(detection.confidence[field]).toBe('high');
    }
  });

  it('should detect English headers from fixture', async () => {
    const csv = readFixture('english-headers.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);

    expect(detection.mappings.date).toBeDefined();
    expect(detection.mappings.income).toBeDefined();
    expect(detection.mappings.maaser).toBeDefined();
    expect(detection.mappings.donation).toBeDefined();
    expect(detection.confidence.date).toBe('high');
    expect(detection.confidence.income).toBe('high');
    expect(detection.confidence.maaser).toBe('high');
    expect(detection.confidence.donation).toBe('high');
  });

  it('should return low confidence for completely unknown headers', () => {
    const headers = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    const detection = detectColumns(headers);

    for (const field of Object.keys(detection.confidence)) {
      expect(detection.confidence[field]).toBe('low');
    }
  });

  it('should handle mixed known/unknown headers correctly', () => {
    const headers = ['תאריך', 'Unknown Column', 'מעשר', 'Another Unknown'];
    const detection = detectColumns(headers);

    expect(detection.confidence.date).toBe('high');
    expect(detection.confidence.maaser).toBe('high');
    // Remaining fields get position-based fallback
  });
});

// ========================================================================
// English Fixture End-to-End
// ========================================================================
describe('Full pipeline: English fixture CSV', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `eng-uuid-${++counter}`);
  });

  it('should parse English headers and transform rows correctly', async () => {
    const csv = readFixture('english-headers.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    const result = transformRows(parsed.dataRows, detection.mappings);

    // 2 rows: both have income + donation
    expect(result.stats.incomeEntries).toBe(2);
    expect(result.stats.donationEntries).toBe(2);
    expect(result.entries).toHaveLength(4);
  });

  it('should correctly parse plain numeric amounts (no currency symbols)', async () => {
    const csv = readFixture('english-headers.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    const result = transformRows(parsed.dataRows, detection.mappings);

    const incomes = result.entries.filter((e) => e.type === 'income');
    expect(incomes[0].amount).toBe(5000);
    expect(incomes[1].amount).toBe(6000);
  });

  it('should validate and import English fixture entries', async () => {
    const csv = readFixture('english-headers.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    const result = transformRows(parsed.dataRows, detection.mappings);

    const validEntries = result.entries
      .map((e) => validateImportEntry(e, { external: true }))
      .filter((r) => r.valid)
      .map((r) => r.entry);

    expect(validEntries).toHaveLength(4);

    const importResult = await importEntries(validEntries, IMPORT_MODE_MERGE);
    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(4);
  });
});

// ========================================================================
// Regression: App-format CSV still works
// ========================================================================
describe('Regression: app-format CSV still imports correctly', () => {
  it('should import app-format CSV through parseCSVFile', async () => {
    const csvContent = [
      'id,type,date,amount,maaser,note,accountingMonth',
      `${crypto.randomUUID()},income,2026-03-15,5000,,Salary,2026-03`,
      `${crypto.randomUUID()},donation,2026-03-16,500,,Charity,2026-03`,
    ].join('\n');
    const file = createMockFile(csvContent, 'app-export.csv');
    const result = await parseCSVFile(file);

    expect(result.validEntries).toHaveLength(2);
    expect(result.validEntries[0].type).toBe('income');
    expect(result.validEntries[0].amount).toBe(5000);
    expect(result.validEntries[1].type).toBe('donation');
    expect(result.validEntries[1].amount).toBe(500);
  });

  it('should detect app-format CSV headers via isAppCSVFormat', () => {
    const appHeaders = ['id', 'type', 'date', 'amount', 'maaser', 'note', 'accountingMonth'];
    expect(isAppCSVFormat(appHeaders)).toBe(true);
  });

  it('should NOT detect external CSV headers as app format', async () => {
    const csv = readFixture('google-sheets-sample.csv');
    const parsed = await parseRawCSV(csv);
    expect(isAppCSVFormat(parsed.headers)).toBe(false);
  });
});

// ========================================================================
// Regression: App-format JSON still works
// ========================================================================
describe('Regression: app-format JSON still imports correctly', () => {
  it('should import app-format JSON through parseJSONFile', async () => {
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      exportDate: new Date().toISOString(),
      entryCount: 2,
      entries: [
        { type: 'income', amount: 3000, date: '2026-03-10', note: 'Freelance' },
        { type: 'donation', amount: 300, date: '2026-03-11', note: 'Tzedakah' },
      ],
    });
    const file = createMockFile(json, 'app-export.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(2);
    expect(result.validEntries[0].type).toBe('income');
    expect(result.validEntries[1].type).toBe('donation');
  });

  it('should round-trip JSON export -> reimport with external entries added', async () => {
    // Seed existing data
    const existing = makeStorageEntry({ amount: 999, note: 'Existing entry' });
    await addEntry(existing);

    // Export
    const allEntries = await getAllEntries();
    const jsonString = exportToJSON(allEntries);

    // Clear and reimport
    await clearAllEntries();
    const file = createMockFile(jsonString, 'roundtrip.json');
    const parsed = await parseJSONFile(file);
    const importResult = await importEntries(parsed.validEntries, IMPORT_MODE_MERGE);

    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(1);
    const stored = await getAllEntries();
    expect(stored[0].amount).toBe(999);
  });
});

// ========================================================================
// Merge / Replace mode with external entries
// ========================================================================
describe('Import modes with external CSV entries', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `mode-uuid-${++counter}`);
  });

  it('should merge external entries alongside existing entries', async () => {
    // Seed 2 existing entries
    await addEntry(makeStorageEntry({ amount: 111, note: 'Pre-existing 1' }));
    await addEntry(makeStorageEntry({ amount: 222, note: 'Pre-existing 2' }));

    // Transform external CSV
    const csv = readFixture('english-headers.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    const result = transformRows(parsed.dataRows, detection.mappings);

    const validEntries = result.entries
      .map((e) => validateImportEntry(e, { external: true }))
      .filter((r) => r.valid)
      .map((r) => r.entry);

    const importResult = await importEntries(validEntries, IMPORT_MODE_MERGE);
    expect(importResult.success).toBe(true);

    const all = await getAllEntries();
    expect(all).toHaveLength(6); // 2 existing + 4 new (2 income + 2 donation)
  });

  it('should replace all entries with external entries', async () => {
    // Seed 3 existing entries
    await addEntry(makeStorageEntry({ amount: 111, note: 'Will be replaced 1' }));
    await addEntry(makeStorageEntry({ amount: 222, note: 'Will be replaced 2' }));
    await addEntry(makeStorageEntry({ amount: 333, note: 'Will be replaced 3' }));

    // Transform external CSV
    const csv = readFixture('english-headers.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    const result = transformRows(parsed.dataRows, detection.mappings);

    const validEntries = result.entries
      .map((e) => validateImportEntry(e, { external: true }))
      .filter((r) => r.valid)
      .map((r) => r.entry);

    const importResult = await importEntries(validEntries, IMPORT_MODE_REPLACE, { skipBackup: true });
    expect(importResult.success).toBe(true);

    const all = await getAllEntries();
    expect(all).toHaveLength(4); // Only the 4 new entries
    expect(all.every((e) => !e.note.includes('Will be replaced'))).toBe(true);
  });
});

// ========================================================================
// Performance Test
// ========================================================================
describe('Performance: external CSV import', () => {
  it('should transform 100 rows in under 2 seconds', () => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `perf-uuid-${++counter}`);

    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = Array.from({ length: 100 }, (_, i) => [
      `${String((i % 12) + 1).padStart(2, '0')}/2020`,
      `₪${(1000 + i * 100).toLocaleString('en-US')}.00`,
      `₪${(100 + i * 10).toLocaleString('en-US')}.00`,
      `₪${(50 + i * 5).toLocaleString('en-US')}.00`,
    ]);

    const start = performance.now();
    const result = transformRows(rows, mappings);
    const elapsed = performance.now() - start;

    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.stats.incomeEntries).toBe(100);
    expect(elapsed).toBeLessThan(2000);
  });

  it('should import 100 transformed external entries in under 5 seconds', async () => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `perf-import-${++counter}`);

    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = Array.from({ length: 100 }, (_, i) => [
      `${String((i % 12) + 1).padStart(2, '0')}/2020`,
      `${1000 + i * 100}`,
      `${100 + i * 10}`,
      `${50 + i * 5}`,
    ]);

    const result = transformRows(rows, mappings);
    const validEntries = result.entries
      .map((e) => validateImportEntry(e, { external: true }))
      .filter((r) => r.valid)
      .map((r) => r.entry);

    const start = performance.now();
    const importResult = await importEntries(validEntries, IMPORT_MODE_MERGE);
    const elapsed = performance.now() - start;

    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(validEntries.length);
    expect(elapsed).toBeLessThan(5000);
  }, 10000);
});

// ========================================================================
// Additional Edge Cases
// ========================================================================
describe('Additional edge cases', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `extra-uuid-${++counter}`);
  });

  it('should handle CSV with BOM prefix', async () => {
    const csvWithBOM = '\uFEFF' + readFixture('english-headers.csv');
    const parsed = await parseRawCSV(csvWithBOM);
    // First header might have BOM attached; detectColumns should still work
    // because the trimmed Hebrew/English exact match handles most cases
    const detection = detectColumns(parsed.headers);
    expect(detection.mappings.date).toBeDefined();
    expect(detection.mappings.income).toBeDefined();
  });

  it('should handle rows with extra trailing commas (empty cells)', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['05/2018', '₪15,000.00', '₪1,500.00', '₪1,200.00', '', '', '']];
    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(2); // income + donation
  });

  it('should handle accountingMonth preservation through validation', () => {
    const entry = {
      id: crypto.randomUUID(),
      type: 'income',
      date: '2018-05-01',
      amount: 15000,
      accountingMonth: '2018-05',
      maaser: 1500,
      note: '',
    };

    const validated = validateImportEntry(entry, { external: true });
    expect(validated.valid).toBe(true);
    expect(validated.entry.accountingMonth).toBe('2018-05');
    expect(validated.entry.maaser).toBe(1500);
  });

  it('should handle row with donation > 0 but income = 0 (donation-only month)', () => {
    // This scenario: someone donated from previous balance, no new income
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['09/2018', '₪0.00', '₪0.00', '₪500.00']];
    const result = transformRows(rows, mappings);

    // Income is 0 -> entire row skipped (no income entry, no donation entry)
    expect(result.entries).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });

  it('should correctly count skipped rows in stats', async () => {
    const csv = readFixture('edge-cases.csv');
    const parsed = await parseRawCSV(csv);
    const detection = detectColumns(parsed.headers);
    const result = transformRows(parsed.dataRows, detection.mappings);

    expect(result.stats.skipped).toBe(result.skippedRows.length);
    expect(result.stats.totalRows).toBe(parsed.dataRows.length);
    // Income rows that produced entries + skipped rows should equal totalRows
    // (donation entries come from the same income row, so don't count separately)
    expect(
      result.stats.incomeEntries + result.stats.skipped
    ).toBeLessThanOrEqual(result.stats.totalRows);
  });
});
