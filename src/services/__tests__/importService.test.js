/**
 * Tests for Import Service
 *
 * Covers JSON/CSV parsing, date detection, header mapping,
 * amount coercion, type mapping, security sanitization, and file size validation.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateFileSize,
  FILE_SIZE_WARNING,
  FILE_SIZE_LIMIT,
  stripBOM,
  sanitizeObject,
  parseDateValue,
  mapCSVHeaders,
  HEBREW_HEADER_MAP,
  HEBREW_TYPE_MAP,
  parseAmount,
  mapTypeValue,
  sanitizeNote,
  validateImportEntry,
  parseJSONFile,
  parseCSVFile,
  SCHEMA_VERSION,
} from '../importService';
import { NOTE_MAX_LENGTH } from '../validation';

// --- Helper: create a mock File ---
function createMockFile(content, name = 'test.json', size = null) {
  const blob = new Blob([content], { type: 'text/plain' });
  const file = new File([blob], name);
  if (size !== null) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
}

// ========================================================================
// validateFileSize
// ========================================================================
describe('validateFileSize', () => {
  it('should accept a small file', () => {
    const file = createMockFile('small', 'test.json', 1000);
    const result = validateFileSize(file);
    expect(result.valid).toBe(true);
    expect(result.warning).toBe(false);
    expect(result.error).toBeNull();
  });

  it('should warn for files above 5MB', () => {
    const file = createMockFile('', 'big.json', FILE_SIZE_WARNING + 1);
    const result = validateFileSize(file);
    expect(result.valid).toBe(true);
    expect(result.warning).toBe(true);
    expect(result.error).toBeNull();
  });

  it('should reject files above 10MB', () => {
    const file = createMockFile('', 'huge.json', FILE_SIZE_LIMIT + 1);
    const result = validateFileSize(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds maximum limit');
  });

  it('should accept file exactly at 5MB', () => {
    const file = createMockFile('', 'edge.json', FILE_SIZE_WARNING);
    const result = validateFileSize(file);
    expect(result.valid).toBe(true);
    expect(result.warning).toBe(false);
  });

  it('should accept file exactly at 10MB', () => {
    const file = createMockFile('', 'edge.json', FILE_SIZE_LIMIT);
    const result = validateFileSize(file);
    expect(result.valid).toBe(true);
    expect(result.warning).toBe(true);
  });

  it('should reject null file', () => {
    const result = validateFileSize(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid file object');
  });

  it('should reject file without size property', () => {
    const result = validateFileSize({});
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid file object');
  });
});

// ========================================================================
// stripBOM
// ========================================================================
describe('stripBOM', () => {
  it('should strip UTF-8 BOM from text', () => {
    const text = '\uFEFFhello world';
    expect(stripBOM(text)).toBe('hello world');
  });

  it('should return text unchanged if no BOM', () => {
    const text = 'hello world';
    expect(stripBOM(text)).toBe('hello world');
  });

  it('should return non-string values as-is', () => {
    expect(stripBOM(null)).toBe(null);
    expect(stripBOM(undefined)).toBe(undefined);
    expect(stripBOM(123)).toBe(123);
  });

  it('should handle empty string', () => {
    expect(stripBOM('')).toBe('');
  });

  it('should handle BOM-only string', () => {
    expect(stripBOM('\uFEFF')).toBe('');
  });
});

// ========================================================================
// sanitizeObject (prototype pollution protection)
// ========================================================================
describe('sanitizeObject', () => {
  it('should strip __proto__ key', () => {
    const obj = { name: 'test', '__proto__': { polluted: true } };
    const result = sanitizeObject(obj);
    expect(result.name).toBe('test');
    expect(result).not.toHaveProperty('__proto__', { polluted: true });
  });

  it('should strip constructor key', () => {
    const obj = { name: 'test', constructor: { polluted: true } };
    const result = sanitizeObject(obj);
    expect(result.name).toBe('test');
    expect(result).not.toHaveProperty('constructor');
  });

  it('should strip prototype key', () => {
    const obj = { name: 'test', prototype: { polluted: true } };
    const result = sanitizeObject(obj);
    expect(result.name).toBe('test');
    expect(result).not.toHaveProperty('prototype');
  });

  it('should recursively sanitize nested objects', () => {
    const obj = { a: { '__proto__': 'bad', b: 'good' } };
    const result = sanitizeObject(obj);
    expect(result.a.b).toBe('good');
    expect(Object.keys(result.a)).toEqual(['b']);
  });

  it('should sanitize arrays', () => {
    const arr = [{ '__proto__': 'bad', a: 1 }, { b: 2 }];
    const result = sanitizeObject(arr);
    expect(result).toHaveLength(2);
    expect(Object.keys(result[0])).toEqual(['a']);
    expect(result[1].b).toBe(2);
  });

  it('should return primitives unchanged', () => {
    expect(sanitizeObject(null)).toBe(null);
    expect(sanitizeObject('string')).toBe('string');
    expect(sanitizeObject(42)).toBe(42);
    expect(sanitizeObject(true)).toBe(true);
  });

  it('should handle empty object', () => {
    expect(sanitizeObject({})).toEqual({});
  });
});

// ========================================================================
// parseDateValue
// ========================================================================
describe('parseDateValue', () => {
  describe('ISO 8601 format', () => {
    it('should parse YYYY-MM-DD', () => {
      const result = parseDateValue('2026-03-15');
      expect(result.date).toBe('2026-03-15');
      expect(result.format).toBe('ISO');
      expect(result.error).toBeNull();
    });

    it('should parse full ISO datetime string', () => {
      const result = parseDateValue('2026-03-15T10:30:00.000Z');
      expect(result.date).toBe('2026-03-15');
      expect(result.format).toBe('ISO');
    });

    it('should reject invalid ISO date (Feb 30)', () => {
      const result = parseDateValue('2026-02-30');
      expect(result.date).toBeNull();
      expect(result.error).toContain('Unable to parse date');
    });
  });

  describe('DD/MM/YYYY format (Israeli default)', () => {
    it('should parse DD/MM/YYYY', () => {
      const result = parseDateValue('15/03/2026');
      expect(result.date).toBe('2026-03-15');
      expect(result.format).toBe('DD/MM/YYYY');
    });

    it('should parse D/M/YYYY (single digits)', () => {
      const result = parseDateValue('5/3/2026');
      expect(result.date).toBe('2026-03-05');
      expect(result.format).toBe('DD/MM/YYYY');
    });

    it('should parse DD.MM.YYYY (dot separator)', () => {
      const result = parseDateValue('15.03.2026');
      expect(result.date).toBe('2026-03-15');
      expect(result.format).toBe('DD/MM/YYYY');
    });

    it('should parse DD-MM-YYYY (dash separator)', () => {
      const result = parseDateValue('15-03-2026');
      expect(result.date).toBe('2026-03-15');
      expect(result.format).toBe('DD/MM/YYYY');
    });
  });

  describe('MM/DD/YYYY fallback', () => {
    it('should fall back to MM/DD/YYYY when DD/MM/YYYY is invalid', () => {
      // 13 cannot be a month in DD/MM, but can be a day in MM/DD
      // 01/13/2026 -> month=13 invalid for DD/MM, so try MM=01, DD=13
      const result = parseDateValue('01/13/2026');
      expect(result.date).toBe('2026-01-13');
      expect(result.format).toBe('MM/DD/YYYY');
    });
  });

  describe('ambiguous dates default to DD/MM/YYYY', () => {
    it('should prefer DD/MM/YYYY for ambiguous dates like 05/06/2026', () => {
      const result = parseDateValue('05/06/2026');
      // DD=05, MM=06 -> June 5th (Israeli default)
      expect(result.date).toBe('2026-06-05');
      expect(result.format).toBe('DD/MM/YYYY');
    });
  });

  describe('error cases', () => {
    it('should return error for null', () => {
      const result = parseDateValue(null);
      expect(result.date).toBeNull();
      expect(result.error).toBe('Date value is required');
    });

    it('should return error for empty string', () => {
      const result = parseDateValue('');
      expect(result.date).toBeNull();
      expect(result.error).toBe('Date value is required');
    });

    it('should return error for non-string', () => {
      const result = parseDateValue(12345);
      expect(result.date).toBeNull();
      expect(result.error).toBe('Date value is required');
    });

    it('should return error for garbage text', () => {
      const result = parseDateValue('not-a-date');
      expect(result.date).toBeNull();
      expect(result.error).toContain('Unable to parse date');
    });

    it('should return error for invalid date parts (month 13 in ISO)', () => {
      const result = parseDateValue('2026-13-01');
      expect(result.date).toBeNull();
    });
  });
});

// ========================================================================
// mapCSVHeaders
// ========================================================================
describe('mapCSVHeaders', () => {
  it('should map Hebrew headers to internal names', () => {
    const headers = ['סוג', 'סכום', 'תאריך', 'הערה'];
    const { mapped, unmapped } = mapCSVHeaders(headers);
    expect(mapped['סוג']).toBe('type');
    expect(mapped['סכום']).toBe('amount');
    expect(mapped['תאריך']).toBe('date');
    expect(mapped['הערה']).toBe('note');
    expect(unmapped).toHaveLength(0);
  });

  it('should map English headers case-insensitively', () => {
    const headers = ['Type', 'Amount', 'Date', 'Note'];
    const { mapped } = mapCSVHeaders(headers);
    expect(mapped['Type']).toBe('type');
    expect(mapped['Amount']).toBe('amount');
    expect(mapped['Date']).toBe('date');
    expect(mapped['Note']).toBe('note');
  });

  it('should track unmapped headers', () => {
    const headers = ['type', 'amount', 'date', 'unknown_column'];
    const { unmapped } = mapCSVHeaders(headers);
    expect(unmapped).toContain('unknown_column');
  });

  it('should handle mixed Hebrew and English headers', () => {
    const headers = ['סוג', 'amount', 'תאריך', 'note'];
    const { mapped, unmapped } = mapCSVHeaders(headers);
    expect(mapped['סוג']).toBe('type');
    expect(mapped['amount']).toBe('amount');
    expect(mapped['תאריך']).toBe('date');
    expect(mapped['note']).toBe('note');
    expect(unmapped).toHaveLength(0);
  });

  it('should handle empty headers array', () => {
    const { mapped, unmapped } = mapCSVHeaders([]);
    expect(Object.keys(mapped)).toHaveLength(0);
    expect(unmapped).toHaveLength(0);
  });

  it('should handle non-array input gracefully', () => {
    const { mapped, unmapped } = mapCSVHeaders(null);
    expect(Object.keys(mapped)).toHaveLength(0);
    expect(unmapped).toHaveLength(0);
  });

  it('should map "notes" (plural) to note', () => {
    const headers = ['notes'];
    const { mapped } = mapCSVHeaders(headers);
    expect(mapped['notes']).toBe('note');
  });

  it('should map Hebrew "הערות" (plural) to note', () => {
    const headers = ['הערות'];
    const { mapped } = mapCSVHeaders(headers);
    expect(mapped['הערות']).toBe('note');
  });

  it('should map "מעשר" to maaser', () => {
    const headers = ['מעשר'];
    const { mapped } = mapCSVHeaders(headers);
    expect(mapped['מעשר']).toBe('maaser');
  });
});

// ========================================================================
// parseAmount
// ========================================================================
describe('parseAmount', () => {
  it('should accept a valid number', () => {
    const result = parseAmount(1000);
    expect(result.amount).toBe(1000);
    expect(result.error).toBeNull();
  });

  it('should accept a decimal number', () => {
    const result = parseAmount(1000.50);
    expect(result.amount).toBe(1000.50);
  });

  it('should parse a numeric string', () => {
    const result = parseAmount('1000');
    expect(result.amount).toBe(1000);
  });

  it('should parse a comma-separated string', () => {
    const result = parseAmount('1,000.50');
    expect(result.amount).toBe(1000.50);
  });

  it('should parse a string with multiple commas', () => {
    const result = parseAmount('1,000,000');
    expect(result.amount).toBe(1000000);
  });

  it('should reject null', () => {
    const result = parseAmount(null);
    expect(result.amount).toBeNull();
    expect(result.error).toBe('Amount is required');
  });

  it('should reject empty string', () => {
    const result = parseAmount('');
    expect(result.amount).toBeNull();
    expect(result.error).toBe('Amount is required');
  });

  it('should reject NaN', () => {
    const result = parseAmount(NaN);
    expect(result.amount).toBeNull();
    expect(result.error).toBe('Amount must be a finite number');
  });

  it('should reject Infinity', () => {
    const result = parseAmount(Infinity);
    expect(result.amount).toBeNull();
    expect(result.error).toBe('Amount must be a finite number');
  });

  it('should reject negative amount', () => {
    const result = parseAmount(-100);
    expect(result.amount).toBeNull();
    expect(result.error).toBe('Amount must be positive');
  });

  it('should reject zero', () => {
    const result = parseAmount(0);
    expect(result.amount).toBeNull();
    expect(result.error).toBe('Amount must be positive');
  });

  it('should reject non-numeric string', () => {
    const result = parseAmount('abc');
    expect(result.amount).toBeNull();
    expect(result.error).toBe('Amount must be a finite number');
  });

  it('should reject boolean', () => {
    const result = parseAmount(true);
    expect(result.amount).toBeNull();
    expect(result.error).toBe('Amount must be a number or numeric string');
  });
});

// ========================================================================
// mapTypeValue
// ========================================================================
describe('mapTypeValue', () => {
  it('should map "income" directly', () => {
    expect(mapTypeValue('income').type).toBe('income');
  });

  it('should map "donation" directly', () => {
    expect(mapTypeValue('donation').type).toBe('donation');
  });

  it('should map "maaser" directly', () => {
    expect(mapTypeValue('maaser').type).toBe('maaser');
  });

  it('should be case-insensitive for English', () => {
    expect(mapTypeValue('Income').type).toBe('income');
    expect(mapTypeValue('DONATION').type).toBe('donation');
  });

  it('should map Hebrew "הכנסה" to income', () => {
    expect(mapTypeValue('הכנסה').type).toBe('income');
  });

  it('should map Hebrew "תרומה" to donation', () => {
    expect(mapTypeValue('תרומה').type).toBe('donation');
  });

  it('should map Hebrew "מעשר" to maaser', () => {
    expect(mapTypeValue('מעשר').type).toBe('maaser');
  });

  it('should reject invalid type', () => {
    const result = mapTypeValue('expense');
    expect(result.type).toBeNull();
    expect(result.error).toContain('Invalid type');
  });

  it('should reject null', () => {
    const result = mapTypeValue(null);
    expect(result.type).toBeNull();
    expect(result.error).toBe('Type is required');
  });

  it('should reject empty string', () => {
    const result = mapTypeValue('');
    expect(result.type).toBeNull();
    expect(result.error).toBe('Type is required');
  });

  it('should trim whitespace', () => {
    expect(mapTypeValue('  income  ').type).toBe('income');
  });
});

// ========================================================================
// sanitizeNote
// ========================================================================
describe('sanitizeNote', () => {
  it('should return empty string for null', () => {
    expect(sanitizeNote(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(sanitizeNote(undefined)).toBe('');
  });

  it('should convert non-string to string', () => {
    expect(sanitizeNote(123)).toBe('123');
  });

  it('should trim whitespace', () => {
    expect(sanitizeNote('  hello  ')).toBe('hello');
  });

  it('should strip control characters', () => {
    expect(sanitizeNote('hello\x00world')).toBe('helloworld');
  });

  it('should truncate to NOTE_MAX_LENGTH', () => {
    const longNote = 'a'.repeat(NOTE_MAX_LENGTH + 100);
    const result = sanitizeNote(longNote);
    expect(result.length).toBe(NOTE_MAX_LENGTH);
  });

  it('should preserve valid text', () => {
    expect(sanitizeNote('Monthly salary')).toBe('Monthly salary');
  });

  it('should preserve Hebrew text', () => {
    expect(sanitizeNote('משכורת חודשית')).toBe('משכורת חודשית');
  });
});

// ========================================================================
// validateImportEntry
// ========================================================================
describe('validateImportEntry', () => {
  it('should validate a complete valid entry', () => {
    const raw = { type: 'income', amount: 1000, date: '2026-03-15', note: 'salary' };
    const result = validateImportEntry(raw);
    expect(result.valid).toBe(true);
    expect(result.entry.type).toBe('income');
    expect(result.entry.amount).toBe(1000);
    expect(result.entry.date).toBe('2026-03-15');
    expect(result.entry.note).toBe('salary');
  });

  it('should validate entry with Hebrew type', () => {
    const raw = { type: 'הכנסה', amount: 500, date: '2026-03-15' };
    const result = validateImportEntry(raw);
    expect(result.valid).toBe(true);
    expect(result.entry.type).toBe('income');
  });

  it('should coerce string amount', () => {
    const raw = { type: 'income', amount: '1,000.50', date: '2026-03-15' };
    const result = validateImportEntry(raw);
    expect(result.valid).toBe(true);
    expect(result.entry.amount).toBe(1000.50);
  });

  it('should parse DD/MM/YYYY date', () => {
    const raw = { type: 'income', amount: 100, date: '15/03/2026' };
    const result = validateImportEntry(raw);
    expect(result.valid).toBe(true);
    expect(result.entry.date).toBe('2026-03-15');
  });

  it('should strip dangerous keys from entry', () => {
    const raw = {
      type: 'income',
      amount: 100,
      date: '2026-03-15',
      '__proto__': { polluted: true },
    };
    const result = validateImportEntry(raw);
    expect(result.valid).toBe(true);
    expect(result.entry).not.toHaveProperty('__proto__');
  });

  it('should omit note when empty', () => {
    const raw = { type: 'income', amount: 100, date: '2026-03-15' };
    const result = validateImportEntry(raw);
    expect(result.valid).toBe(true);
    expect(result.entry.note).toBeUndefined();
  });

  it('should reject null entry', () => {
    const result = validateImportEntry(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Entry must be an object');
  });

  it('should collect multiple errors', () => {
    const raw = { type: 'invalid', amount: -1, date: '' };
    const result = validateImportEntry(raw);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ========================================================================
// parseJSONFile
// ========================================================================
describe('parseJSONFile', () => {
  it('should parse a valid JSON file with schema v1 envelope', async () => {
    const data = {
      version: 1,
      exportedAt: '2026-03-15T00:00:00Z',
      entries: [
        { type: 'income', amount: 1000, date: '2026-03-15', note: 'salary' },
        { type: 'donation', amount: 100, date: '2026-03-16' },
      ],
    };
    const file = createMockFile(JSON.stringify(data), 'export.json');
    const result = await parseJSONFile(file);
    expect(result.validEntries).toHaveLength(2);
    expect(result.invalidEntries).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle BOM in JSON file', async () => {
    const data = {
      version: 1,
      entries: [{ type: 'income', amount: 100, date: '2026-03-15' }],
    };
    const file = createMockFile('\uFEFF' + JSON.stringify(data), 'bom.json');
    const result = await parseJSONFile(file);
    expect(result.validEntries).toHaveLength(1);
  });

  it('should reject file exceeding size limit', async () => {
    const file = createMockFile('{}', 'huge.json', FILE_SIZE_LIMIT + 1);
    const result = await parseJSONFile(file);
    expect(result.validEntries).toHaveLength(0);
    expect(result.errors[0]).toContain('exceeds maximum limit');
  });

  it('should warn for large files below limit', async () => {
    const data = {
      version: 1,
      entries: [{ type: 'income', amount: 100, date: '2026-03-15' }],
    };
    const file = createMockFile(JSON.stringify(data), 'big.json', FILE_SIZE_WARNING + 1);
    const result = await parseJSONFile(file);
    expect(result.warnings).toContain('File is large and may take a while to process');
  });

  it('should reject invalid JSON syntax', async () => {
    const file = createMockFile('{ not valid json', 'bad.json');
    const result = await parseJSONFile(file);
    expect(result.errors).toContain('Invalid JSON format');
  });

  it('should reject wrong schema version', async () => {
    const data = { version: 99, entries: [] };
    const file = createMockFile(JSON.stringify(data), 'wrong.json');
    const result = await parseJSONFile(file);
    expect(result.errors[0]).toContain('Unsupported schema version');
  });

  it('should reject missing entries array', async () => {
    const data = { version: 1 };
    const file = createMockFile(JSON.stringify(data), 'missing.json');
    const result = await parseJSONFile(file);
    expect(result.errors).toContain('JSON must contain an "entries" array');
  });

  it('should reject empty entries array', async () => {
    const data = { version: 1, entries: [] };
    const file = createMockFile(JSON.stringify(data), 'empty.json');
    const result = await parseJSONFile(file);
    expect(result.errors).toContain('No entries found in file');
  });

  it('should separate valid and invalid entries', async () => {
    const data = {
      version: 1,
      entries: [
        { type: 'income', amount: 1000, date: '2026-03-15' },
        { type: 'invalid', amount: -1, date: '' },
        { type: 'donation', amount: 200, date: '2026-03-16' },
      ],
    };
    const file = createMockFile(JSON.stringify(data), 'mixed.json');
    const result = await parseJSONFile(file);
    expect(result.validEntries).toHaveLength(2);
    expect(result.invalidEntries).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Entry 2');
  });

  it('should sanitize prototype pollution in JSON', async () => {
    const json = '{"version":1,"entries":[{"type":"income","amount":100,"date":"2026-03-15","__proto__":{"admin":true}}]}';
    const file = createMockFile(json, 'pollution.json');
    const result = await parseJSONFile(file);
    expect(result.validEntries).toHaveLength(1);
    expect(result.validEntries[0]).not.toHaveProperty('admin');
  });

  it('should reject non-object JSON (array)', async () => {
    const file = createMockFile('[1,2,3]', 'array.json');
    const result = await parseJSONFile(file);
    expect(result.errors).toContain('JSON must be an object with version and entries');
  });

  it('should reject non-object JSON (string)', async () => {
    const file = createMockFile('"just a string"', 'string.json');
    const result = await parseJSONFile(file);
    expect(result.errors).toContain('JSON must be an object with version and entries');
  });

  it('should handle file read failure gracefully', async () => {
    const file = {
      size: 100,
      text: vi.fn().mockRejectedValue(new Error('read error')),
    };
    const result = await parseJSONFile(file);
    expect(result.errors).toContain('Failed to read file');
  });
});

// ========================================================================
// parseCSVFile
// ========================================================================
describe('parseCSVFile', () => {
  it('should parse a valid CSV with English headers', async () => {
    const csv = 'type,amount,date,note\nincome,1000,2026-03-15,salary\ndonation,100,2026-03-16,charity';
    const file = createMockFile(csv, 'export.csv');
    const result = await parseCSVFile(file);
    expect(result.validEntries).toHaveLength(2);
    expect(result.validEntries[0].type).toBe('income');
    expect(result.validEntries[0].amount).toBe(1000);
    expect(result.validEntries[0].date).toBe('2026-03-15');
    expect(result.validEntries[0].note).toBe('salary');
  });

  it('should parse CSV with Hebrew headers', async () => {
    const csv = 'סוג,סכום,תאריך,הערה\nהכנסה,1000,15/03/2026,משכורת';
    const file = createMockFile(csv, 'hebrew.csv');
    const result = await parseCSVFile(file);
    expect(result.validEntries).toHaveLength(1);
    expect(result.validEntries[0].type).toBe('income');
    expect(result.validEntries[0].amount).toBe(1000);
    expect(result.validEntries[0].date).toBe('2026-03-15');
  });

  it('should handle BOM in CSV', async () => {
    const csv = '\uFEFFtype,amount,date\nincome,100,2026-03-15';
    const file = createMockFile(csv, 'bom.csv');
    const result = await parseCSVFile(file);
    expect(result.validEntries).toHaveLength(1);
  });

  it('should reject file exceeding size limit', async () => {
    const file = createMockFile('type,amount,date', 'huge.csv', FILE_SIZE_LIMIT + 1);
    const result = await parseCSVFile(file);
    expect(result.errors[0]).toContain('exceeds maximum limit');
  });

  it('should report missing required columns', async () => {
    const csv = 'name,value\ntest,100';
    const file = createMockFile(csv, 'missing.csv');
    const result = await parseCSVFile(file);
    expect(result.errors[0]).toContain('Missing required columns');
    expect(result.errors[0]).toContain('type');
    expect(result.errors[0]).toContain('amount');
    expect(result.errors[0]).toContain('date');
  });

  it('should separate valid and invalid CSV rows', async () => {
    const csv = 'type,amount,date\nincome,1000,2026-03-15\ninvalid,-1,\ndonation,200,2026-03-16';
    const file = createMockFile(csv, 'mixed.csv');
    const result = await parseCSVFile(file);
    expect(result.validEntries).toHaveLength(2);
    expect(result.invalidEntries).toHaveLength(1);
  });

  it('should report unmapped columns as warnings', async () => {
    const csv = 'type,amount,date,extra_col\nincome,100,2026-03-15,foo';
    const file = createMockFile(csv, 'extra.csv');
    const result = await parseCSVFile(file);
    expect(result.warnings.some((w) => w.includes('Unmapped columns'))).toBe(true);
  });

  it('should handle file read failure gracefully', async () => {
    const file = {
      size: 100,
      text: vi.fn().mockRejectedValue(new Error('read error')),
    };
    const result = await parseCSVFile(file);
    expect(result.errors).toContain('Failed to read file');
  });

  it('should parse CSV with semicolon delimiter', async () => {
    const csv = 'type;amount;date\nincome;1000;2026-03-15';
    const file = createMockFile(csv, 'semicolon.csv');
    const result = await parseCSVFile(file);
    expect(result.validEntries).toHaveLength(1);
  });

  it('should handle empty CSV (no data rows)', async () => {
    const csv = 'type,amount,date\n';
    const file = createMockFile(csv, 'empty.csv');
    const result = await parseCSVFile(file);
    expect(result.errors.some((e) => e.includes('No data rows'))).toBe(true);
  });

  it('should handle comma in amount with CSV quoting', async () => {
    const csv = 'type,amount,date\nincome,"1,000",2026-03-15';
    const file = createMockFile(csv, 'quoted.csv');
    const result = await parseCSVFile(file);
    expect(result.validEntries).toHaveLength(1);
    expect(result.validEntries[0].amount).toBe(1000);
  });

  it('should handle CSV with CRLF line endings', async () => {
    const csv = 'type,amount,date\r\nincome,100,2026-03-15\r\ndonation,50,2026-03-16\r\n';
    const file = createMockFile(csv, 'crlf.csv');
    const result = await parseCSVFile(file);
    expect(result.validEntries).toHaveLength(2);
  });
});

// ========================================================================
// Constants validation
// ========================================================================
describe('constants', () => {
  it('should export correct FILE_SIZE_WARNING (5MB)', () => {
    expect(FILE_SIZE_WARNING).toBe(5 * 1024 * 1024);
  });

  it('should export correct FILE_SIZE_LIMIT (10MB)', () => {
    expect(FILE_SIZE_LIMIT).toBe(10 * 1024 * 1024);
  });

  it('should export SCHEMA_VERSION as 1', () => {
    expect(SCHEMA_VERSION).toBe(1);
  });

  it('should export HEBREW_HEADER_MAP with all required mappings', () => {
    expect(HEBREW_HEADER_MAP['סוג']).toBe('type');
    expect(HEBREW_HEADER_MAP['סכום']).toBe('amount');
    expect(HEBREW_HEADER_MAP['תאריך']).toBe('date');
    expect(HEBREW_HEADER_MAP['הערה']).toBe('note');
    expect(HEBREW_HEADER_MAP['מעשר']).toBe('maaser');
  });

  it('should export HEBREW_TYPE_MAP with all required mappings', () => {
    expect(HEBREW_TYPE_MAP['הכנסה']).toBe('income');
    expect(HEBREW_TYPE_MAP['תרומה']).toBe('donation');
    expect(HEBREW_TYPE_MAP['מעשר']).toBe('maaser');
  });
});
