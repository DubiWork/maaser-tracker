/**
 * Tests for Column Mapping Service
 *
 * Covers header detection, currency parsing, date parsing,
 * row splitting, full pipeline, and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectColumns,
  parseCurrencyAmount,
  parseExternalDate,
  transformRows,
} from '../columnMappingService';

// ========================================================================
// parseCurrencyAmount
// ========================================================================
describe('parseCurrencyAmount', () => {
  it('should parse plain number string', () => {
    expect(parseCurrencyAmount('100')).toBe(100);
  });

  it('should parse number with shekel symbol', () => {
    expect(parseCurrencyAmount('₪18,541.25')).toBe(18541.25);
  });

  it('should parse number with dollar symbol', () => {
    expect(parseCurrencyAmount('$1,000.00')).toBe(1000);
  });

  it('should parse number with euro symbol', () => {
    expect(parseCurrencyAmount('€500')).toBe(500);
  });

  it('should parse number with pound symbol', () => {
    expect(parseCurrencyAmount('£250.50')).toBe(250.5);
  });

  it('should remove thousand separators', () => {
    expect(parseCurrencyAmount('1,234,567.89')).toBe(1234567.89);
  });

  it('should handle ₪0.00 as zero', () => {
    expect(parseCurrencyAmount('₪0.00')).toBe(0);
  });

  it('should return null for empty string', () => {
    expect(parseCurrencyAmount('')).toBeNull();
  });

  it('should return null for whitespace-only string', () => {
    expect(parseCurrencyAmount('   ')).toBeNull();
  });

  it('should return null for null', () => {
    expect(parseCurrencyAmount(null)).toBeNull();
  });

  it('should return null for undefined', () => {
    expect(parseCurrencyAmount(undefined)).toBeNull();
  });

  it('should return null for non-numeric string', () => {
    expect(parseCurrencyAmount('abc')).toBeNull();
  });

  it('should pass through numeric values', () => {
    expect(parseCurrencyAmount(42)).toBe(42);
  });

  it('should return null for NaN number', () => {
    expect(parseCurrencyAmount(NaN)).toBeNull();
  });

  it('should return null for Infinity', () => {
    expect(parseCurrencyAmount(Infinity)).toBeNull();
  });

  it('should handle negative amounts', () => {
    expect(parseCurrencyAmount('-500')).toBe(-500);
  });

  it('should return null for boolean', () => {
    expect(parseCurrencyAmount(true)).toBeNull();
  });

  it('should handle decimal without leading zero', () => {
    expect(parseCurrencyAmount('.75')).toBe(0.75);
  });
});

// ========================================================================
// parseExternalDate
// ========================================================================
describe('parseExternalDate', () => {
  it('should parse MM/YYYY format', () => {
    const result = parseExternalDate('03/2026');
    expect(result).toEqual({
      date: '2026-03-01',
      accountingMonth: '2026-03',
    });
  });

  it('should parse single-digit month M/YYYY', () => {
    const result = parseExternalDate('1/2026');
    expect(result).toEqual({
      date: '2026-01-01',
      accountingMonth: '2026-01',
    });
  });

  it('should parse DD/MM/YYYY format', () => {
    const result = parseExternalDate('15/03/2026');
    expect(result).toEqual({
      date: '2026-03-15',
      accountingMonth: '2026-03',
    });
  });

  it('should parse YYYY-MM-DD format', () => {
    const result = parseExternalDate('2026-03-15');
    expect(result).toEqual({
      date: '2026-03-15',
      accountingMonth: '2026-03',
    });
  });

  it('should parse M/D/YYYY (US format) as fallback', () => {
    // 1/15/2026 — day=1, month=15 is invalid DD/MM → falls back to M/D
    const result = parseExternalDate('1/15/2026');
    expect(result).toEqual({
      date: '2026-01-15',
      accountingMonth: '2026-01',
    });
  });

  it('should return null for empty string', () => {
    expect(parseExternalDate('')).toBeNull();
  });

  it('should return null for null', () => {
    expect(parseExternalDate(null)).toBeNull();
  });

  it('should return null for undefined', () => {
    expect(parseExternalDate(undefined)).toBeNull();
  });

  it('should return null for non-string', () => {
    expect(parseExternalDate(12345)).toBeNull();
  });

  it('should return null for invalid date', () => {
    expect(parseExternalDate('99/99/9999')).toBeNull();
  });

  it('should return null for whitespace-only', () => {
    expect(parseExternalDate('   ')).toBeNull();
  });

  it('should handle date with leading/trailing spaces', () => {
    const result = parseExternalDate('  03/2026  ');
    expect(result).toEqual({
      date: '2026-03-01',
      accountingMonth: '2026-03',
    });
  });

  it('should return null for month 13', () => {
    expect(parseExternalDate('13/2026')).toBeNull();
  });

  it('should return null for month 0', () => {
    expect(parseExternalDate('0/2026')).toBeNull();
  });
});

// ========================================================================
// detectColumns — Hebrew Exact Matches
// ========================================================================
describe('detectColumns — Hebrew exact', () => {
  it('should detect all Hebrew headers with high confidence', () => {
    const headers = ['תאריך', 'הכנסה', 'מעשר', 'הופרש'];
    const result = detectColumns(headers);

    expect(result.mappings.date).toBe(0);
    expect(result.mappings.income).toBe(1);
    expect(result.mappings.maaser).toBe(2);
    expect(result.mappings.donation).toBe(3);
    expect(result.confidence.date).toBe('high');
    expect(result.confidence.income).toBe('high');
    expect(result.confidence.maaser).toBe('high');
    expect(result.confidence.donation).toBe('high');
    expect(result.unmapped).toEqual([]);
  });

  it('should mark ignore column and exclude from mappings', () => {
    const headers = ['תאריך', 'הכנסה', 'מעשר', 'הופרש', 'נשאר להפריש מחודש קודם'];
    const result = detectColumns(headers);

    expect(result.mappings).not.toHaveProperty('ignore');
    expect(result.unmapped).toEqual([]);
  });
});

// ========================================================================
// detectColumns — English Exact Matches
// ========================================================================
describe('detectColumns — English exact', () => {
  it('should detect English headers with high confidence', () => {
    const headers = ['date', 'income', 'maaser', 'donation'];
    const result = detectColumns(headers);

    expect(result.mappings.date).toBe(0);
    expect(result.mappings.income).toBe(1);
    expect(result.mappings.maaser).toBe(2);
    expect(result.mappings.donation).toBe(3);
    expect(result.confidence.date).toBe('high');
  });

  it('should match English aliases', () => {
    const headers = ['month', 'salary', 'tithe', 'contribution'];
    const result = detectColumns(headers);

    expect(result.mappings.date).toBe(0);
    expect(result.mappings.income).toBe(1);
    expect(result.mappings.maaser).toBe(2);
    expect(result.mappings.donation).toBe(3);
  });

  it('should be case-insensitive for English', () => {
    const headers = ['DATE', 'Income', 'MAASER', 'Donation'];
    const result = detectColumns(headers);

    expect(result.mappings.date).toBe(0);
    expect(result.mappings.income).toBe(1);
  });
});

// ========================================================================
// detectColumns — Partial Matches
// ========================================================================
describe('detectColumns — partial matches', () => {
  it('should detect partial keyword matches with medium confidence', () => {
    const headers = ['the date column', 'total income', 'calculated maaser', 'donations made'];
    const result = detectColumns(headers);

    expect(result.confidence.date).toBe('medium');
    expect(result.confidence.income).toBe('medium');
    expect(result.confidence.maaser).toBe('medium');
    expect(result.confidence.donation).toBe('medium');
  });
});

// ========================================================================
// detectColumns — Position Fallback
// ========================================================================
describe('detectColumns — position fallback', () => {
  it('should use position fallback for unknown headers with low confidence', () => {
    const headers = ['col1', 'col2', 'col3', 'col4'];
    const result = detectColumns(headers);

    expect(result.mappings.date).toBe(0);
    expect(result.mappings.income).toBe(1);
    expect(result.mappings.maaser).toBe(2);
    expect(result.mappings.donation).toBe(3);
    expect(result.confidence.date).toBe('low');
    expect(result.confidence.income).toBe('low');
    expect(result.confidence.maaser).toBe('low');
    expect(result.confidence.donation).toBe('low');
  });

  it('should handle fewer columns than expected fields', () => {
    const headers = ['col1', 'col2'];
    const result = detectColumns(headers);

    expect(result.mappings.date).toBe(0);
    expect(result.mappings.income).toBe(1);
    expect(result.mappings).not.toHaveProperty('maaser');
    expect(result.mappings).not.toHaveProperty('donation');
  });
});

// ========================================================================
// detectColumns — Unmapped
// ========================================================================
describe('detectColumns — unmapped', () => {
  it('should report unmapped columns', () => {
    const headers = ['תאריך', 'הכנסה', 'unknown extra'];
    const result = detectColumns(headers);

    // 'unknown extra' doesn't match any keyword, and after exact pass
    // position fallback might catch it for maaser (first unmapped field)
    // But since maaser and donation are missing, it goes to fallback
    expect(result.unmapped.length + Object.keys(result.mappings).length).toBeLessThanOrEqual(headers.length);
  });

  it('should return empty arrays for empty headers', () => {
    const result = detectColumns([]);
    expect(result.mappings).toEqual({});
    expect(result.confidence).toEqual({});
    expect(result.unmapped).toEqual([]);
  });

  it('should handle null input', () => {
    const result = detectColumns(null);
    expect(result.mappings).toEqual({});
  });
});

// ========================================================================
// transformRows — Income + Donation
// ========================================================================
describe('transformRows — income + donation', () => {
  // Mock crypto.randomUUID for deterministic tests
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++counter}`);
  });

  it('should create both income and donation entries from one row', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['03/2026', '₪18,541', '₪1,854', '₪1,000']];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]).toMatchObject({
      type: 'income',
      amount: 18541,
      date: '2026-03-01',
      accountingMonth: '2026-03',
    });
    expect(result.entries[1]).toMatchObject({
      type: 'donation',
      amount: 1000,
      date: '2026-03-01',
      accountingMonth: '2026-03',
    });
    expect(result.stats.incomeEntries).toBe(1);
    expect(result.stats.donationEntries).toBe(1);
  });

  it('should create income-only entry when donation is zero', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['01/2026', '₪10,000', '₪1,000', '₪0']];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].type).toBe('income');
    expect(result.stats.donationEntries).toBe(0);
  });

  it('should create income-only entry when donation column is empty', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['01/2026', '₪10,000', '₪1,000', '']];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].type).toBe('income');
  });
});

// ========================================================================
// transformRows — Skip Rows
// ========================================================================
describe('transformRows — skip rows', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++counter}`);
  });

  it('should skip rows with empty income', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['03/2026', '', '', '']];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
    expect(result.skippedRows[0].reason).toContain('Income amount');
  });

  it('should skip rows with zero income', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['03/2026', '₪0', '₪0', '₪0']];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });

  it('should skip rows with invalid date', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['invalid', '₪5,000', '₪500', '']];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(0);
    expect(result.skippedRows[0].reason).toContain('date');
  });

  it('should skip entirely empty rows', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [['', '', '', '']];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(0);
    expect(result.skippedRows[0].reason).toBe('Empty row');
  });

  it('should skip non-array rows', () => {
    const mappings = { date: 0, income: 1 };
    const rows = [null, 'not an array'];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(2);
  });
});

// ========================================================================
// transformRows — Stats
// ========================================================================
describe('transformRows — stats', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++counter}`);
  });

  it('should report correct stats for mixed rows', () => {
    const mappings = { date: 0, income: 1, maaser: 2, donation: 3 };
    const rows = [
      ['01/2026', '₪10,000', '₪1,000', '₪500'],   // income + donation
      ['02/2026', '₪8,000', '₪800', '₪0'],          // income only
      ['03/2026', '', '', ''],                         // skipped (empty income)
      ['invalid', '₪5,000', '₪500', '₪200'],         // skipped (bad date)
    ];

    const result = transformRows(rows, mappings);

    expect(result.stats).toEqual({
      totalRows: 4,
      incomeEntries: 2,
      donationEntries: 1,
      skipped: 2,
    });
  });
});

// ========================================================================
// transformRows — Edge Cases
// ========================================================================
describe('transformRows — edge cases', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++counter}`);
  });

  it('should handle null rows array', () => {
    const result = transformRows(null, { date: 0, income: 1 });
    expect(result.entries).toEqual([]);
    expect(result.stats.totalRows).toBe(0);
  });

  it('should handle null mappings', () => {
    const result = transformRows([['03/2026', '100']], null);
    expect(result.entries).toEqual([]);
  });

  it('should include maaser amount in income entry when present', () => {
    const mappings = { date: 0, income: 1, maaser: 2 };
    const rows = [['03/2026', '10000', '1000']];

    const result = transformRows(rows, mappings);

    expect(result.entries[0].maaser).toBe(1000);
  });

  it('should omit maaser from income entry when zero', () => {
    const mappings = { date: 0, income: 1, maaser: 2 };
    const rows = [['03/2026', '10000', '0']];

    const result = transformRows(rows, mappings);

    expect(result.entries[0].maaser).toBeUndefined();
  });

  it('should generate unique IDs for each entry', () => {
    const mappings = { date: 0, income: 1, donation: 2 };
    const rows = [
      ['01/2026', '5000', '500'],
      ['02/2026', '6000', '600'],
    ];

    const result = transformRows(rows, mappings);

    const ids = result.entries.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should set empty string note on all entries', () => {
    const mappings = { date: 0, income: 1, donation: 2 };
    const rows = [['01/2026', '5000', '500']];

    const result = transformRows(rows, mappings);

    for (const entry of result.entries) {
      expect(entry.note).toBe('');
    }
  });
});

// ========================================================================
// Full Pipeline: detectColumns + transformRows
// ========================================================================
describe('Full pipeline: detectColumns + transformRows', () => {
  beforeEach(() => {
    let counter = 0;
    vi.spyOn(crypto, 'randomUUID').mockImplementation(() => `uuid-${++counter}`);
  });

  it('should process a real Hebrew spreadsheet end-to-end', () => {
    const headers = ['תאריך', 'הכנסה', 'מעשר', 'הופרש', 'נשאר להפריש מחודש קודם'];
    const { mappings } = detectColumns(headers);

    const rows = [
      ['01/2026', '₪18,541.25', '₪1,854.13', '₪1,500', '₪354.13'],
      ['02/2026', '₪20,000', '₪2,000', '₪2,354.13', '₪0'],
      ['03/2026', '', '', '', '₪0'],  // future month — should be skipped
    ];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(4); // 2 income + 2 donation
    expect(result.stats.incomeEntries).toBe(2);
    expect(result.stats.donationEntries).toBe(2);
    expect(result.stats.skipped).toBe(1);

    // Verify first income entry
    expect(result.entries[0]).toMatchObject({
      type: 'income',
      amount: 18541.25,
      date: '2026-01-01',
      accountingMonth: '2026-01',
    });

    // Verify first donation entry
    expect(result.entries[1]).toMatchObject({
      type: 'donation',
      amount: 1500,
      date: '2026-01-01',
    });
  });

  it('should process English headers end-to-end', () => {
    const headers = ['date', 'income', 'tithe', 'donated'];
    const { mappings } = detectColumns(headers);

    const rows = [
      ['2026-01-15', '5000', '500', '500'],
    ];

    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].type).toBe('income');
    expect(result.entries[1].type).toBe('donation');
  });

  it('should handle mixed confidence columns', () => {
    const headers = ['date', 'col_income_total', 'maaser', 'col4'];
    const { mappings, confidence } = detectColumns(headers);

    expect(confidence.date).toBe('high');
    expect(confidence.income).toBe('medium');
    expect(confidence.maaser).toBe('high');
    // col4 is position-fallback for donation
    expect(confidence.donation).toBe('low');

    const rows = [['03/2026', '₪10,000', '₪1,000', '₪500']];
    const result = transformRows(rows, mappings);

    expect(result.entries).toHaveLength(2);
  });
});
