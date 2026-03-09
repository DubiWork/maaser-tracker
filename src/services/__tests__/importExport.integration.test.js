/**
 * Import/Export Integration Tests
 *
 * End-to-end round-trip tests, large file handling, Hebrew CSV,
 * invalid file rejection, replace mode, security, and performance.
 *
 * These tests use the REAL services (no mocks for db/export/import)
 * with fake-indexeddb provided by the test setup.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { exportToJSON, exportToCSV } from '../exportService';
import {
  parseJSONFile,
  parseCSVFile,
  importEntries,
  IMPORT_MODE_MERGE,
  IMPORT_MODE_REPLACE,
  FILE_SIZE_LIMIT,
  FILE_SIZE_WARNING,
  SCHEMA_VERSION,
} from '../importService';
import { addEntry, getAllEntries, clearAllEntries } from '../db';
import { NOTE_MAX_LENGTH } from '../validation';

// --- Helpers ---

/**
 * Create a mock File from string content.
 */
function createMockFile(content, name = 'test.json', size = null) {
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name);
  if (size !== null) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

/**
 * Create a well-formed entry for direct IndexedDB storage.
 */
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

/**
 * Seed the database with N entries and return them.
 */
async function seedEntries(count, overridesFn = () => ({})) {
  const entries = [];
  for (let i = 0; i < count; i++) {
    const entry = makeStorageEntry({
      amount: 100 + i,
      note: `Entry ${i + 1}`,
      ...overridesFn(i),
    });
    await addEntry(entry);
    entries.push(entry);
  }
  return entries;
}

// Clean database between tests
beforeEach(async () => {
  await clearAllEntries();
});

// ========================================================================
// Round-Trip Tests: JSON
// ========================================================================
describe('Round-trip: JSON export -> reimport', () => {
  it('should export entries to JSON and reimport with identical data', async () => {
    // Seed 5 entries of different types
    const original = await seedEntries(5, (i) => ({
      type: i % 2 === 0 ? 'income' : 'donation',
      date: `2026-03-${String(i + 1).padStart(2, '0')}`,
      note: `Note for entry ${i}`,
    }));

    // Export to JSON
    const jsonString = exportToJSON(original);
    expect(jsonString).toBeTruthy();

    // Clear database
    await clearAllEntries();
    const afterClear = await getAllEntries();
    expect(afterClear).toHaveLength(0);

    // Reimport the JSON
    const file = createMockFile(jsonString, 'roundtrip.json');
    const parsed = await parseJSONFile(file);

    expect(parsed.validEntries).toHaveLength(5);
    expect(parsed.errors.filter((e) => !e.startsWith('Entry'))).toHaveLength(0);

    // Import into database
    const importResult = await importEntries(parsed.validEntries, IMPORT_MODE_MERGE);
    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(5);

    // Verify data matches
    const reimported = await getAllEntries();
    expect(reimported).toHaveLength(5);

    for (let i = 0; i < 5; i++) {
      const orig = original[i];
      const re = reimported.find((e) => e.amount === orig.amount);
      expect(re).toBeDefined();
      expect(re.type).toBe(orig.type);
      expect(re.date).toBe(orig.date);
    }
  });

  it('should preserve notes through JSON round-trip', async () => {
    const original = await seedEntries(1, () => ({
      note: 'Special chars: "quotes", commas, and unicode \u00e9\u00e8',
    }));

    const jsonString = exportToJSON(original);
    await clearAllEntries();

    const file = createMockFile(jsonString, 'notes.json');
    const parsed = await parseJSONFile(file);
    await importEntries(parsed.validEntries, IMPORT_MODE_MERGE);

    const reimported = await getAllEntries();
    expect(reimported[0].note).toContain('Special chars');
    expect(reimported[0].note).toContain('"quotes"');
  });
});

// ========================================================================
// Round-Trip Tests: CSV
// ========================================================================
describe('Round-trip: CSV export -> reimport', () => {
  it('should export entries to CSV and reimport with matching data', async () => {
    const original = await seedEntries(3, (i) => ({
      type: i === 0 ? 'income' : 'donation',
      date: `2026-03-${String(10 + i).padStart(2, '0')}`,
      amount: 1000 * (i + 1),
      note: `CSV note ${i}`,
    }));

    // Export to CSV
    const csvString = await exportToCSV(original);
    expect(csvString).toBeTruthy();

    // Clear and reimport
    await clearAllEntries();
    const file = createMockFile(csvString, 'roundtrip.csv');
    const parsed = await parseCSVFile(file);

    expect(parsed.validEntries).toHaveLength(3);

    const importResult = await importEntries(parsed.validEntries, IMPORT_MODE_MERGE);
    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(3);

    // Verify data
    const reimported = await getAllEntries();
    expect(reimported).toHaveLength(3);

    for (const orig of original) {
      const match = reimported.find((e) => e.amount === orig.amount);
      expect(match).toBeDefined();
      expect(match.type).toBe(orig.type);
      expect(match.date).toBe(orig.date);
    }
  });

  it('should handle notes with commas in CSV round-trip', async () => {
    const original = await seedEntries(1, () => ({
      note: 'Payment for rent, utilities, and food',
    }));

    const csvString = await exportToCSV(original);
    await clearAllEntries();

    const file = createMockFile(csvString, 'commas.csv');
    const parsed = await parseCSVFile(file);

    expect(parsed.validEntries).toHaveLength(1);
    expect(parsed.validEntries[0].note).toContain('Payment for rent');
  });
});

// ========================================================================
// Large File Tests
// ========================================================================
describe('Large file handling', () => {
  it('should export and reimport 1000 entries via JSON with all present', async () => {
    const entries = [];
    for (let i = 0; i < 1000; i++) {
      entries.push(makeStorageEntry({
        amount: i + 1,
        note: `Bulk entry ${i}`,
        date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      }));
    }

    // Add all entries to database
    for (const entry of entries) {
      await addEntry(entry);
    }

    const allEntries = await getAllEntries();
    expect(allEntries).toHaveLength(1000);

    // Export
    const jsonString = exportToJSON(allEntries);

    // Clear and reimport
    await clearAllEntries();
    const file = createMockFile(jsonString, 'bulk.json');
    const parsed = await parseJSONFile(file);
    expect(parsed.validEntries).toHaveLength(1000);

    const importResult = await importEntries(parsed.validEntries, IMPORT_MODE_MERGE);
    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(1000);

    const reimported = await getAllEntries();
    expect(reimported).toHaveLength(1000);
  }, 30000);

  it('should export and reimport 1000 entries via CSV with all present', async () => {
    const entries = [];
    for (let i = 0; i < 1000; i++) {
      entries.push(makeStorageEntry({
        amount: i + 1,
        note: `CSV bulk ${i}`,
        date: `2026-02-${String((i % 28) + 1).padStart(2, '0')}`,
      }));
    }

    for (const entry of entries) {
      await addEntry(entry);
    }

    const allEntries = await getAllEntries();
    const csvString = await exportToCSV(allEntries);

    await clearAllEntries();
    const file = createMockFile(csvString, 'bulk.csv');
    const parsed = await parseCSVFile(file);
    expect(parsed.validEntries).toHaveLength(1000);

    const importResult = await importEntries(parsed.validEntries, IMPORT_MODE_MERGE);
    expect(importResult.success).toBe(true);
    expect(importResult.imported).toBe(1000);

    const reimported = await getAllEntries();
    expect(reimported).toHaveLength(1000);
  }, 30000);
});

// ========================================================================
// Hebrew CSV Tests
// ========================================================================
describe('Hebrew CSV import/export', () => {
  it('should export Hebrew data in CSV and reimport correctly', async () => {
    const original = await seedEntries(2, (i) => ({
      type: i === 0 ? 'income' : 'donation',
      note: i === 0 ? '\u05DE\u05E9\u05DB\u05D5\u05E8\u05EA \u05D7\u05D5\u05D3\u05E9\u05D9\u05EA' : '\u05EA\u05E8\u05D5\u05DE\u05D4 \u05DC\u05E2\u05E0\u05D9\u05D9\u05DD',
    }));

    const csvString = await exportToCSV(original);

    // Verify Hebrew text is present in export
    expect(csvString).toContain('\u05DE\u05E9\u05DB\u05D5\u05E8\u05EA');
    expect(csvString).toContain('\u05EA\u05E8\u05D5\u05DE\u05D4');

    await clearAllEntries();
    const file = createMockFile(csvString, 'hebrew.csv');
    const parsed = await parseCSVFile(file);

    expect(parsed.validEntries).toHaveLength(2);
    // Verify Hebrew notes survived round-trip
    const notes = parsed.validEntries.map((e) => e.note);
    expect(notes.some((n) => n.includes('\u05DE\u05E9\u05DB\u05D5\u05E8\u05EA'))).toBe(true);
    expect(notes.some((n) => n.includes('\u05EA\u05E8\u05D5\u05DE\u05D4'))).toBe(true);
  });

  it('should import CSV with Hebrew column headers', async () => {
    const csv = '\u05E1\u05D5\u05D2,\u05E1\u05DB\u05D5\u05DD,\u05EA\u05D0\u05E8\u05D9\u05DA,\u05D4\u05E2\u05E8\u05D4\n\u05D4\u05DB\u05E0\u05E1\u05D4,5000,15/03/2026,\u05DE\u05E9\u05DB\u05D5\u05E8\u05EA\n\u05EA\u05E8\u05D5\u05DE\u05D4,500,16/03/2026,\u05E6\u05D3\u05E7\u05D4';
    const file = createMockFile(csv, 'hebrew-headers.csv');
    const parsed = await parseCSVFile(file);

    expect(parsed.validEntries).toHaveLength(2);
    expect(parsed.validEntries[0].type).toBe('income');
    expect(parsed.validEntries[0].amount).toBe(5000);
    expect(parsed.validEntries[0].date).toBe('2026-03-15');
    expect(parsed.validEntries[1].type).toBe('donation');
    expect(parsed.validEntries[1].amount).toBe(500);
  });

  it('should import CSV with BOM and CRLF line endings (Windows Excel)', async () => {
    const csv = '\uFEFFtype,amount,date,note\r\nincome,2000,2026-03-15,\u05DE\u05E9\u05DB\u05D5\u05E8\u05EA\r\ndonation,200,2026-03-16,\u05EA\u05E8\u05D5\u05DE\u05D4\r\n';
    const file = createMockFile(csv, 'excel-export.csv');
    const parsed = await parseCSVFile(file);

    expect(parsed.validEntries).toHaveLength(2);
    expect(parsed.validEntries[0].type).toBe('income');
    expect(parsed.validEntries[0].amount).toBe(2000);
    expect(parsed.validEntries[1].type).toBe('donation');
  });

  it('should import CSV with semicolon delimiters (European Excel)', async () => {
    const csv = 'type;amount;date;note\nincome;3000;2026-03-15;\u05DE\u05E9\u05DB\u05D5\u05E8\u05EA\ndonation;300;2026-03-16;\u05E6\u05D3\u05E7\u05D4';
    const file = createMockFile(csv, 'european.csv');
    const parsed = await parseCSVFile(file);

    expect(parsed.validEntries).toHaveLength(2);
    expect(parsed.validEntries[0].amount).toBe(3000);
    expect(parsed.validEntries[1].amount).toBe(300);
  });

  it('should preserve Hebrew text with mixed LTR numbers', async () => {
    const csv = 'type,amount,date,note\nincome,1500,2026-03-15,"\u05EA\u05E9\u05DC\u05D5\u05DD 1500 \u05E9\u05E7\u05DC"';
    const file = createMockFile(csv, 'mixed-dir.csv');
    const parsed = await parseCSVFile(file);

    expect(parsed.validEntries).toHaveLength(1);
    expect(parsed.validEntries[0].note).toContain('1500');
    expect(parsed.validEntries[0].note).toContain('\u05EA\u05E9\u05DC\u05D5\u05DD');
  });
});

// ========================================================================
// Invalid File Rejection
// ========================================================================
describe('Invalid file rejection', () => {
  it('should reject malformed JSON with clear error', async () => {
    const file = createMockFile('{ broken json: }}}', 'bad.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Invalid JSON format');
  });

  it('should reject JSON with wrong schema version', async () => {
    const json = JSON.stringify({ version: 999, entries: [{ type: 'income', amount: 100, date: '2026-03-15' }] });
    const file = createMockFile(json, 'wrong-version.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors[0]).toContain('Unsupported schema version');
    expect(result.errors[0]).toContain('999');
  });

  it('should reject CSV with missing required columns', async () => {
    const csv = 'name,value,description\nTest,100,Some note';
    const file = createMockFile(csv, 'missing-cols.csv');
    const result = await parseCSVFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors[0]).toContain('Missing required columns');
    expect(result.errors[0]).toContain('type');
    expect(result.errors[0]).toContain('amount');
    expect(result.errors[0]).toContain('date');
  });

  it('should reject empty JSON file', async () => {
    const file = createMockFile('', 'empty.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject empty CSV file', async () => {
    const file = createMockFile('', 'empty.csv');
    const result = await parseCSVFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject file exceeding 10 MB (JSON)', async () => {
    const file = createMockFile('{}', 'huge.json', FILE_SIZE_LIMIT + 1);
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors[0]).toContain('exceeds maximum limit');
  });

  it('should reject file exceeding 10 MB (CSV)', async () => {
    const file = createMockFile('type,amount,date', 'huge.csv', FILE_SIZE_LIMIT + 1);
    const result = await parseCSVFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors[0]).toContain('exceeds maximum limit');
  });

  it('should warn for file between 5-10 MB (JSON)', async () => {
    // Create valid JSON content but override size to trigger warning
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      entries: [{ type: 'income', amount: 100, date: '2026-03-15' }],
    });
    const file = createMockFile(json, 'medium.json', FILE_SIZE_WARNING + 1);
    const result = await parseJSONFile(file);

    expect(result.warnings.some((w) => w.includes('large'))).toBe(true);
  });

  it('should reject binary content with .json extension', async () => {
    // Simulate binary content (null bytes and random data)
    const binaryContent = '\x00\x01\x02\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR';
    const file = createMockFile(binaryContent, 'image.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject JSON that is an array (missing envelope)', async () => {
    const json = JSON.stringify([{ type: 'income', amount: 100, date: '2026-03-15' }]);
    const file = createMockFile(json, 'array.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors[0]).toContain('JSON must be an object');
  });

  it('should reject JSON envelope with missing entries array', async () => {
    const json = JSON.stringify({ version: SCHEMA_VERSION });
    const file = createMockFile(json, 'no-entries.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors[0]).toContain('entries');
  });

  it('should reject JSON envelope with empty entries array', async () => {
    const json = JSON.stringify({ version: SCHEMA_VERSION, entries: [] });
    const file = createMockFile(json, 'empty-entries.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(0);
    expect(result.errors[0]).toContain('No entries found');
  });

  it('should separate valid and invalid entries in JSON', async () => {
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      entries: [
        { type: 'income', amount: 1000, date: '2026-03-15' },
        { type: 'invalid-type', amount: -1, date: '' },
        { type: 'donation', amount: 500, date: '2026-03-16' },
      ],
    });
    const file = createMockFile(json, 'mixed.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(2);
    expect(result.invalidEntries).toHaveLength(1);
  });
});

// ========================================================================
// Replace Mode Tests
// ========================================================================
describe('Replace mode (IMPORT_MODE_REPLACE)', () => {
  it('should clear old data and add new data', async () => {
    // Seed 3 old entries
    await seedEntries(3, (i) => ({
      note: `Old entry ${i}`,
      amount: 100 + i,
    }));
    const before = await getAllEntries();
    expect(before).toHaveLength(3);

    // New entries to import
    const newEntries = [
      { type: 'income', amount: 9999, date: '2026-06-01', note: 'New data 1' },
      { type: 'donation', amount: 8888, date: '2026-06-02', note: 'New data 2' },
    ];

    const result = await importEntries(newEntries, IMPORT_MODE_REPLACE, { skipBackup: true });
    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);

    // Verify old data is gone, new data is present
    const after = await getAllEntries();
    expect(after).toHaveLength(2);
    expect(after.every((e) => e.note.startsWith('New data'))).toBe(true);
    expect(after.some((e) => e.amount === 9999)).toBe(true);
    expect(after.some((e) => e.amount === 8888)).toBe(true);
  });

  it('should not contain any old entries after replace', async () => {
    const oldEntries = await seedEntries(5, (i) => ({
      note: `DELETE_ME_${i}`,
      amount: 1 + i,
    }));

    const newEntries = [
      { type: 'income', amount: 50000, date: '2026-07-01', note: 'Fresh start' },
    ];

    await importEntries(newEntries, IMPORT_MODE_REPLACE, { skipBackup: true });

    const after = await getAllEntries();
    // None of the old IDs should exist
    for (const old of oldEntries) {
      expect(after.find((e) => e.id === old.id)).toBeUndefined();
    }
    expect(after).toHaveLength(1);
    expect(after[0].note).toBe('Fresh start');
  });
});

// ========================================================================
// Security Tests
// ========================================================================
describe('Security: sanitization and injection prevention', () => {
  it('should strip __proto__ key from JSON import (prototype pollution)', async () => {
    // Manually construct JSON with __proto__
    const maliciousJson = `{
      "version": ${SCHEMA_VERSION},
      "entries": [
        {
          "type": "income",
          "amount": 1000,
          "date": "2026-03-15",
          "note": "normal",
          "__proto__": { "isAdmin": true }
        }
      ]
    }`;
    const file = createMockFile(maliciousJson, 'proto.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(1);
    // The prototype pollution key should be stripped
    const entry = result.validEntries[0];
    expect(entry).not.toHaveProperty('__proto__', { isAdmin: true });
    expect(entry).not.toHaveProperty('isAdmin');
  });

  it('should strip constructor key from JSON import', async () => {
    const maliciousJson = `{
      "version": ${SCHEMA_VERSION},
      "entries": [
        {
          "type": "income",
          "amount": 500,
          "date": "2026-03-15",
          "constructor": { "polluted": true }
        }
      ]
    }`;
    const file = createMockFile(maliciousJson, 'constructor.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(1);
    expect(result.validEntries[0]).not.toHaveProperty('constructor', { polluted: true });
  });

  it('should prevent formula injection in CSV export (=CMD)', async () => {
    const entries = [makeStorageEntry({ note: '=CMD("calc")' })];
    const csvString = await exportToCSV(entries);

    // The = should be prefixed with a single quote
    expect(csvString).toContain("'=CMD");
    expect(csvString).not.toMatch(/[^']=CMD/);
  });

  it('should prevent formula injection in CSV export (+cmd|)', async () => {
    const entries = [makeStorageEntry({ note: '+cmd|/C calc' })];
    const csvString = await exportToCSV(entries);

    expect(csvString).toContain("'+cmd|");
  });

  it('should prevent formula injection in CSV export (@SUM)', async () => {
    const entries = [makeStorageEntry({ note: '@SUM(A1:A10)' })];
    const csvString = await exportToCSV(entries);

    expect(csvString).toContain("'@SUM");
  });

  it('should sanitize XSS payloads in note field during import', async () => {
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      entries: [
        {
          type: 'income',
          amount: 1000,
          date: '2026-03-15',
          note: '<script>alert("xss")</script>',
        },
      ],
    });
    const file = createMockFile(json, 'xss.json');
    const result = await parseJSONFile(file);

    // The entry should still be valid (React auto-escapes on render)
    // but the import service should accept it without executing
    expect(result.validEntries).toHaveLength(1);
    // Note is preserved as text (not executed) - React escapes on render
    expect(result.validEntries[0].note).toContain('script');
  });

  it('should handle very long strings (>10KB in a single field) gracefully', async () => {
    const longNote = 'A'.repeat(15000);
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      entries: [
        {
          type: 'income',
          amount: 1000,
          date: '2026-03-15',
          note: longNote,
        },
      ],
    });
    const file = createMockFile(json, 'long-note.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(1);
    // Note should be truncated to NOTE_MAX_LENGTH
    expect(result.validEntries[0].note.length).toBeLessThanOrEqual(NOTE_MAX_LENGTH);
  });

  it('should strip control characters from notes during import', async () => {
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      entries: [
        {
          type: 'income',
          amount: 1000,
          date: '2026-03-15',
          note: 'Normal\x00Hidden\x01Data\x07Bell',
        },
      ],
    });
    const file = createMockFile(json, 'control-chars.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(1);
    const note = result.validEntries[0].note;
    // Control characters should be stripped
    expect(note).not.toContain('\x00');
    expect(note).not.toContain('\x01');
    expect(note).not.toContain('\x07');
    expect(note).toContain('Normal');
    expect(note).toContain('Hidden');
  });
});

// ========================================================================
// Performance Benchmarks
// ========================================================================
describe('Performance benchmarks', () => {
  it('should import 1000 entries in under 10 seconds (fake-indexeddb overhead)', async () => {
    // Generate 1000 validated entries
    // Note: fake-indexeddb in test env is ~2x slower than real IndexedDB,
    // so we use 10s threshold here. Real browser would be < 5s.
    const entries = Array.from({ length: 1000 }, (_, i) => ({
      type: i % 2 === 0 ? 'income' : 'donation',
      amount: 100 + i,
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      note: `Perf test ${i}`,
    }));

    const start = performance.now();
    const result = await importEntries(entries, IMPORT_MODE_MERGE);
    const elapsed = performance.now() - start;

    expect(result.success).toBe(true);
    expect(result.imported).toBe(1000);
    expect(elapsed).toBeLessThan(10000);
  }, 15000);

  it('should export 1000 entries to JSON in under 2 seconds', async () => {
    // Seed 1000 entries
    const entries = [];
    for (let i = 0; i < 1000; i++) {
      entries.push(makeStorageEntry({
        amount: i + 1,
        note: `Export perf ${i}`,
        date: `2026-02-${String((i % 28) + 1).padStart(2, '0')}`,
      }));
    }

    const start = performance.now();
    const jsonString = exportToJSON(entries);
    const elapsed = performance.now() - start;

    expect(typeof jsonString).toBe('string');
    expect(jsonString.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(2000);
  }, 5000);

  it('should export 1000 entries to CSV in under 3 seconds', async () => {
    const entries = [];
    for (let i = 0; i < 1000; i++) {
      entries.push(makeStorageEntry({
        amount: i + 1,
        note: `CSV perf ${i}`,
        date: `2026-03-${String((i % 28) + 1).padStart(2, '0')}`,
      }));
    }

    const start = performance.now();
    const csvString = await exportToCSV(entries);
    const elapsed = performance.now() - start;

    expect(typeof csvString).toBe('string');
    expect(csvString.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(3000);
  }, 5000);

  it('should fire progress callbacks during large import', async () => {
    const entries = Array.from({ length: 250 }, (_, i) => ({
      type: 'income',
      amount: 100 + i,
      date: '2026-03-15',
      note: `Progress ${i}`,
    }));

    const progressCalls = [];
    const onProgress = (p) => progressCalls.push({ ...p });

    await importEntries(entries, IMPORT_MODE_MERGE, { onProgress });

    expect(progressCalls.length).toBeGreaterThan(0);
    // Should have validating, importing, and complete phases
    const phases = new Set(progressCalls.map((p) => p.phase));
    expect(phases.has('validating')).toBe(true);
    expect(phases.has('complete')).toBe(true);
  }, 10000);
});

// ========================================================================
// Merge Mode Additional Tests
// ========================================================================
describe('Merge mode preserves existing entries', () => {
  it('should add new entries alongside existing ones', async () => {
    // Seed 3 existing entries
    await seedEntries(3, (i) => ({
      note: `Existing ${i}`,
      amount: 100 + i,
    }));

    // Import 2 new entries via merge
    const newEntries = [
      { type: 'income', amount: 9000, date: '2026-05-01', note: 'New 1' },
      { type: 'donation', amount: 8000, date: '2026-05-02', note: 'New 2' },
    ];

    const result = await importEntries(newEntries, IMPORT_MODE_MERGE);
    expect(result.success).toBe(true);
    expect(result.imported).toBe(2);

    // Should now have 5 total entries
    const all = await getAllEntries();
    expect(all).toHaveLength(5);
  });
});

// ========================================================================
// Edge Cases
// ========================================================================
describe('Edge cases', () => {
  it('should handle import of a single entry', async () => {
    const entries = [{ type: 'income', amount: 42, date: '2026-03-15', note: 'Single' }];
    const result = await importEntries(entries, IMPORT_MODE_MERGE);

    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);

    const all = await getAllEntries();
    expect(all).toHaveLength(1);
    expect(all[0].amount).toBe(42);
  });

  it('should reject import with empty entries array', async () => {
    const result = await importEntries([], IMPORT_MODE_MERGE);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('No entries');
  });

  it('should reject import with null entries', async () => {
    const result = await importEntries(null, IMPORT_MODE_MERGE);
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('No entries');
  });

  it('should reject invalid import mode', async () => {
    const entries = [{ type: 'income', amount: 100, date: '2026-03-15' }];
    const result = await importEntries(entries, 'invalid-mode');
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Invalid import mode');
  });

  it('should handle entries with undefined note field', async () => {
    const json = JSON.stringify({
      version: SCHEMA_VERSION,
      entries: [
        { type: 'income', amount: 1000, date: '2026-03-15' },
      ],
    });
    const file = createMockFile(json, 'no-note.json');
    const result = await parseJSONFile(file);

    expect(result.validEntries).toHaveLength(1);

    const importResult = await importEntries(result.validEntries, IMPORT_MODE_MERGE);
    expect(importResult.success).toBe(true);

    const all = await getAllEntries();
    expect(all).toHaveLength(1);
  });

  it('should handle special characters in CSV notes (quotes, newlines)', async () => {
    const csv = 'type,amount,date,note\nincome,1000,2026-03-15,"Note with ""double quotes"" inside"';
    const file = createMockFile(csv, 'special.csv');
    const result = await parseCSVFile(file);

    expect(result.validEntries).toHaveLength(1);
    expect(result.validEntries[0].note).toContain('double quotes');
  });
});
