/**
 * Tests for Validation Service
 *
 * Tests for validateEntry() and isValidEntry() functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateEntry,
  isValidEntry,
  NOTE_MAX_LENGTH,
  isValidAccountingMonth,
  getAccountingMonthFromDate,
  normalizeEntryAccountingMonth,
} from './validation';

describe('Validation Service', () => {
  describe('validateEntry', () => {
    describe('valid entries', () => {
      it('should validate a valid income entry', () => {
        const entry = {
          id: 'income-1',
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate a valid donation entry', () => {
        const entry = {
          id: 'donation-1',
          type: 'donation',
          date: '2026-03-01',
          amount: 100,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate an entry with an optional note', () => {
        const entry = {
          id: 'income-1',
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
          note: 'Monthly salary',
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate an entry with empty note', () => {
        const entry = {
          id: 'income-1',
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
          note: '',
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate an entry with null note', () => {
        const entry = {
          id: 'income-1',
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
          note: null,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate an entry with note at max length', () => {
        const entry = {
          id: 'income-1',
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
          note: 'a'.repeat(NOTE_MAX_LENGTH),
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate an entry with decimal amount', () => {
        const entry = {
          id: 'income-1',
          type: 'income',
          date: '2026-03-01',
          amount: 1000.50,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('invalid entries - null/undefined', () => {
      it('should reject null entry', () => {
        const result = validateEntry(null);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must be an object');
      });

      it('should reject undefined entry', () => {
        const result = validateEntry(undefined);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must be an object');
      });

      it('should reject non-object entry (string)', () => {
        const result = validateEntry('not an object');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must be an object');
      });

      it('should reject non-object entry (number)', () => {
        const result = validateEntry(123);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must be an object');
      });

      it('should reject array entry (missing required fields)', () => {
        // Arrays are technically objects in JS, but will fail required field validation
        const result = validateEntry([]);
        expect(result.valid).toBe(false);
        // Array won't have id, type, date, or amount
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('invalid entries - missing id', () => {
      it('should reject entry without id', () => {
        const entry = {
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must have a valid id (string)');
      });

      it('should reject entry with non-string id', () => {
        const entry = {
          id: 123,
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must have a valid id (string)');
      });

      it('should reject entry with empty string id', () => {
        const entry = {
          id: '',
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must have a valid id (string)');
      });
    });

    describe('invalid entries - invalid type', () => {
      it('should reject entry without type', () => {
        const entry = {
          id: 'entry-1',
          date: '2026-03-01',
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry type must be "income" or "donation"');
      });

      it('should reject entry with invalid type', () => {
        const entry = {
          id: 'entry-1',
          type: 'expense',
          date: '2026-03-01',
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry type must be "income" or "donation"');
      });

      it('should reject entry with non-string type', () => {
        const entry = {
          id: 'entry-1',
          type: 123,
          date: '2026-03-01',
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry type must be "income" or "donation"');
      });
    });

    describe('invalid entries - invalid date', () => {
      it('should reject entry without date', () => {
        const entry = {
          id: 'entry-1',
          type: 'income',
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must have a valid date (string)');
      });

      it('should reject entry with non-string date', () => {
        const entry = {
          id: 'entry-1',
          type: 'income',
          date: new Date(),
          amount: 1000,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must have a valid date (string)');
      });
    });

    describe('invalid entries - invalid amount', () => {
      it('should reject entry without amount', () => {
        const entry = {
          id: 'entry-1',
          type: 'income',
          date: '2026-03-01',
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must have a valid amount (number)');
      });

      it('should reject entry with non-number amount', () => {
        const entry = {
          id: 'entry-1',
          type: 'income',
          date: '2026-03-01',
          amount: '1000',
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must have a valid amount (number)');
      });

      it('should reject entry with zero amount', () => {
        const entry = {
          id: 'entry-1',
          type: 'income',
          date: '2026-03-01',
          amount: 0,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry amount must be positive');
      });

      it('should reject entry with negative amount', () => {
        const entry = {
          id: 'entry-1',
          type: 'income',
          date: '2026-03-01',
          amount: -100,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry amount must be positive');
      });

      it('should reject entry with NaN amount', () => {
        // NaN should be rejected as invalid amount
        const entry = {
          id: 'entry-1',
          type: 'income',
          date: '2026-03-01',
          amount: NaN,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry must have a valid amount (number)');
      });
    });

    describe('invalid entries - invalid note', () => {
      it('should reject entry with non-string note', () => {
        const entry = {
          id: 'entry-1',
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
          note: 123,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Entry note must be a string');
      });

      it('should reject entry with note exceeding max length', () => {
        const entry = {
          id: 'entry-1',
          type: 'income',
          date: '2026-03-01',
          amount: 1000,
          note: 'a'.repeat(NOTE_MAX_LENGTH + 1),
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Entry note must not exceed ${NOTE_MAX_LENGTH} characters`);
      });
    });

    describe('multiple errors', () => {
      it('should report all validation errors', () => {
        const entry = {
          id: '',
          type: 'invalid',
          date: null,
          amount: -100,
        };

        const result = validateEntry(entry);
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });

      it('should report errors for completely empty object', () => {
        const result = validateEntry({});
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });
  });

  describe('isValidEntry', () => {
    it('should return true for valid entry', () => {
      const entry = {
        id: 'income-1',
        type: 'income',
        date: '2026-03-01',
        amount: 1000,
      };

      expect(isValidEntry(entry)).toBe(true);
    });

    it('should return false for invalid entry', () => {
      const entry = {
        id: '',
        type: 'invalid',
      };

      expect(isValidEntry(entry)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isValidEntry(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidEntry(undefined)).toBe(false);
    });
  });

  describe('NOTE_MAX_LENGTH constant', () => {
    it('should be exported and be 500', () => {
      expect(NOTE_MAX_LENGTH).toBe(500);
    });
  });

  describe('accountingMonth validation in validateEntry', () => {
    it('should accept entry with valid accountingMonth format', () => {
      const entry = {
        id: 'income-1',
        type: 'income',
        date: '2026-03-01',
        amount: 1000,
        accountingMonth: '2026-03',
      };

      const result = validateEntry(entry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept entry without accountingMonth (optional field)', () => {
      const entry = {
        id: 'income-1',
        type: 'income',
        date: '2026-03-01',
        amount: 1000,
      };

      const result = validateEntry(entry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject entry with invalid accountingMonth format (missing leading zero)', () => {
      const entry = {
        id: 'income-1',
        type: 'income',
        date: '2026-03-01',
        amount: 1000,
        accountingMonth: '2026-3',
      };

      const result = validateEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry accountingMonth must be in YYYY-MM format');
    });

    it('should reject entry with invalid accountingMonth format (invalid month)', () => {
      const entry = {
        id: 'income-1',
        type: 'income',
        date: '2026-03-01',
        amount: 1000,
        accountingMonth: '2026-13',
      };

      const result = validateEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry accountingMonth must be in YYYY-MM format');
    });

    it('should reject entry with invalid accountingMonth format (not a string)', () => {
      const entry = {
        id: 'income-1',
        type: 'income',
        date: '2026-03-01',
        amount: 1000,
        accountingMonth: 202603,
      };

      const result = validateEntry(entry);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Entry accountingMonth must be in YYYY-MM format');
    });

    it('should accept entry with accountingMonth different from date month', () => {
      const entry = {
        id: 'income-1',
        type: 'income',
        date: '2026-03-01',
        amount: 1000,
        accountingMonth: '2026-02', // February, but paid in March
      };

      const result = validateEntry(entry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('isValidAccountingMonth', () => {
  describe('valid formats', () => {
    it('should return true for valid YYYY-MM format', () => {
      expect(isValidAccountingMonth('2026-03')).toBe(true);
    });

    it('should return true for January (01)', () => {
      expect(isValidAccountingMonth('2026-01')).toBe(true);
    });

    it('should return true for December (12)', () => {
      expect(isValidAccountingMonth('2026-12')).toBe(true);
    });

    it('should return true for various years', () => {
      expect(isValidAccountingMonth('2020-06')).toBe(true);
      expect(isValidAccountingMonth('2030-12')).toBe(true);
      expect(isValidAccountingMonth('1999-01')).toBe(true);
    });
  });

  describe('invalid formats', () => {
    it('should return false for month without leading zero', () => {
      expect(isValidAccountingMonth('2026-3')).toBe(false);
    });

    it('should return false for month 00', () => {
      expect(isValidAccountingMonth('2026-00')).toBe(false);
    });

    it('should return false for month 13', () => {
      expect(isValidAccountingMonth('2026-13')).toBe(false);
    });

    it('should return false for full date format', () => {
      expect(isValidAccountingMonth('2026-03-01')).toBe(false);
    });

    it('should return false for year only', () => {
      expect(isValidAccountingMonth('2026')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isValidAccountingMonth(202603)).toBe(false);
      expect(isValidAccountingMonth(null)).toBe(false);
      expect(isValidAccountingMonth(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidAccountingMonth('')).toBe(false);
    });

    it('should return false for invalid separators', () => {
      expect(isValidAccountingMonth('2026/03')).toBe(false);
      expect(isValidAccountingMonth('2026.03')).toBe(false);
    });
  });
});

describe('getAccountingMonthFromDate', () => {
  describe('with valid dates', () => {
    it('should extract YYYY-MM from date string', () => {
      expect(getAccountingMonthFromDate('2026-03-15')).toBe('2026-03');
    });

    it('should extract YYYY-MM from ISO date string', () => {
      expect(getAccountingMonthFromDate('2026-03-15T00:00:00.000Z')).toBe('2026-03');
    });

    it('should extract YYYY-MM from Date object', () => {
      const date = new Date(2026, 2, 15); // Month is 0-indexed, so 2 = March
      expect(getAccountingMonthFromDate(date)).toBe('2026-03');
    });

    it('should pad single-digit months with leading zero', () => {
      expect(getAccountingMonthFromDate('2026-01-15')).toBe('2026-01');
      expect(getAccountingMonthFromDate('2026-09-15')).toBe('2026-09');
    });

    it('should handle December correctly', () => {
      expect(getAccountingMonthFromDate('2026-12-31')).toBe('2026-12');
    });

    it('should handle January correctly', () => {
      expect(getAccountingMonthFromDate('2026-01-01')).toBe('2026-01');
    });
  });

  describe('with invalid dates', () => {
    it('should return current month for invalid date string', () => {
      const result = getAccountingMonthFromDate('invalid-date');
      const now = new Date();
      const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      expect(result).toBe(expectedMonth);
    });

    it('should return epoch month for null (new Date(null) is valid)', () => {
      // Note: new Date(null) returns Unix epoch (Jan 1, 1970), which is valid
      const result = getAccountingMonthFromDate(null);
      expect(result).toBe('1970-01');
    });
  });
});

describe('normalizeEntryAccountingMonth', () => {
  it('should add accountingMonth from date if missing', () => {
    const entry = {
      id: 'income-1',
      type: 'income',
      date: '2026-03-15T00:00:00.000Z',
      amount: 1000,
    };

    const normalized = normalizeEntryAccountingMonth(entry);
    expect(normalized.accountingMonth).toBe('2026-03');
  });

  it('should not modify existing accountingMonth', () => {
    const entry = {
      id: 'income-1',
      type: 'income',
      date: '2026-03-15T00:00:00.000Z',
      amount: 1000,
      accountingMonth: '2026-02', // Different from date
    };

    const normalized = normalizeEntryAccountingMonth(entry);
    expect(normalized.accountingMonth).toBe('2026-02');
  });

  it('should return original entry if no date', () => {
    const entry = {
      id: 'income-1',
      type: 'income',
      amount: 1000,
    };

    const normalized = normalizeEntryAccountingMonth(entry);
    expect(normalized).toBe(entry);
    expect(normalized.accountingMonth).toBeUndefined();
  });

  it('should return null/undefined as-is', () => {
    expect(normalizeEntryAccountingMonth(null)).toBe(null);
    expect(normalizeEntryAccountingMonth(undefined)).toBe(undefined);
  });

  it('should not mutate original entry', () => {
    const entry = {
      id: 'income-1',
      type: 'income',
      date: '2026-03-15T00:00:00.000Z',
      amount: 1000,
    };

    const normalized = normalizeEntryAccountingMonth(entry);
    expect(entry.accountingMonth).toBeUndefined();
    expect(normalized).not.toBe(entry);
  });
});
