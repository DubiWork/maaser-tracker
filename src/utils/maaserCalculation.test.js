import { describe, it, expect } from 'vitest';
import {
  calculateMaaserForEntries,
  getMaaserPercentageForDate,
  getCurrentMaaserPercentage,
  validatePercentagePeriod,
  addPercentagePeriod,
} from './maaserCalculation';

// --- Test data helpers ---

function makeIncome(amount, date) {
  return { id: `inc-${Date.now()}-${Math.random()}`, type: 'income', amount, date, description: '', note: '' };
}

const PERIODS_SINGLE = [{ percentage: 10, effectiveFrom: '2025-01-01' }];

const PERIODS_MULTI = [
  { percentage: 10, effectiveFrom: '2024-01-01' },
  { percentage: 15, effectiveFrom: '2025-01-01' },
  { percentage: 20, effectiveFrom: '2025-07-01' },
];

// Unsorted to verify internal sorting
const PERIODS_UNSORTED = [
  { percentage: 20, effectiveFrom: '2025-07-01' },
  { percentage: 10, effectiveFrom: '2024-01-01' },
  { percentage: 15, effectiveFrom: '2025-01-01' },
];

// --- getMaaserPercentageForDate ---

describe('getMaaserPercentageForDate', () => {
  it('returns 10 as fallback when periods array is empty', () => {
    expect(getMaaserPercentageForDate('2025-06-15', [])).toBe(10);
  });

  it('returns 10 as fallback when periods is null', () => {
    expect(getMaaserPercentageForDate('2025-06-15', null)).toBe(10);
  });

  it('returns 10 as fallback when periods is undefined', () => {
    expect(getMaaserPercentageForDate('2025-06-15', undefined)).toBe(10);
  });

  it('returns the percentage for a date after a single period', () => {
    expect(getMaaserPercentageForDate('2025-06-15', PERIODS_SINGLE)).toBe(10);
  });

  it('returns default when date is before all periods', () => {
    expect(getMaaserPercentageForDate('2023-12-31', PERIODS_SINGLE)).toBe(10);
  });

  it('returns the correct period when date matches effectiveFrom exactly', () => {
    expect(getMaaserPercentageForDate('2025-01-01', PERIODS_MULTI)).toBe(15);
  });

  it('returns the correct period for dates between periods', () => {
    expect(getMaaserPercentageForDate('2025-03-15', PERIODS_MULTI)).toBe(15);
  });

  it('returns the last period for dates after all periods', () => {
    expect(getMaaserPercentageForDate('2026-01-01', PERIODS_MULTI)).toBe(20);
  });

  it('returns default for dates before all periods in multi-period array', () => {
    expect(getMaaserPercentageForDate('2023-06-01', PERIODS_MULTI)).toBe(10);
  });

  it('handles unsorted periods correctly by sorting internally', () => {
    expect(getMaaserPercentageForDate('2025-03-15', PERIODS_UNSORTED)).toBe(15);
    expect(getMaaserPercentageForDate('2025-08-01', PERIODS_UNSORTED)).toBe(20);
  });

  it('returns the first period rate for a date on its effectiveFrom', () => {
    expect(getMaaserPercentageForDate('2024-01-01', PERIODS_MULTI)).toBe(10);
  });

  it('returns correct rate for a date one day before a new period starts', () => {
    expect(getMaaserPercentageForDate('2024-12-31', PERIODS_MULTI)).toBe(10);
    expect(getMaaserPercentageForDate('2025-06-30', PERIODS_MULTI)).toBe(15);
  });
});

// --- getCurrentMaaserPercentage ---

describe('getCurrentMaaserPercentage', () => {
  it('returns 10 as fallback when periods is empty', () => {
    expect(getCurrentMaaserPercentage([])).toBe(10);
  });

  it('returns 10 as fallback when periods is null', () => {
    expect(getCurrentMaaserPercentage(null)).toBe(10);
  });

  it('returns 10 as fallback when periods is undefined', () => {
    expect(getCurrentMaaserPercentage(undefined)).toBe(10);
  });

  it('returns the single period percentage', () => {
    expect(getCurrentMaaserPercentage(PERIODS_SINGLE)).toBe(10);
  });

  it('returns the most recent period percentage (sorted by effectiveFrom)', () => {
    expect(getCurrentMaaserPercentage(PERIODS_MULTI)).toBe(20);
  });

  it('handles unsorted periods and returns latest by effectiveFrom', () => {
    expect(getCurrentMaaserPercentage(PERIODS_UNSORTED)).toBe(20);
  });

  it('returns correct value for future-dated periods', () => {
    const periods = [
      { percentage: 10, effectiveFrom: '2024-01-01' },
      { percentage: 25, effectiveFrom: '2030-01-01' },
    ];
    expect(getCurrentMaaserPercentage(periods)).toBe(25);
  });
});

// --- calculateMaaserForEntries ---

describe('calculateMaaserForEntries', () => {
  it('returns 0 for empty entries array', () => {
    expect(calculateMaaserForEntries([], PERIODS_SINGLE)).toBe(0);
  });

  it('returns 0 for null entries', () => {
    expect(calculateMaaserForEntries(null, PERIODS_SINGLE)).toBe(0);
  });

  it('returns 0 for undefined entries', () => {
    expect(calculateMaaserForEntries(undefined, PERIODS_SINGLE)).toBe(0);
  });

  it('calculates 10% for a single entry with default period', () => {
    const entries = [makeIncome(1000, '2025-06-15')];
    expect(calculateMaaserForEntries(entries, PERIODS_SINGLE)).toBe(100);
  });

  it('calculates correctly for multiple entries in the same period', () => {
    const entries = [
      makeIncome(1000, '2025-02-01'),
      makeIncome(2000, '2025-03-01'),
      makeIncome(500, '2025-04-01'),
    ];
    // All in 15% period: (1000 + 2000 + 500) * 0.15 = 525
    expect(calculateMaaserForEntries(entries, PERIODS_MULTI)).toBe(525);
  });

  it('calculates correctly when entries span multiple percentage periods', () => {
    const entries = [
      makeIncome(1000, '2024-06-01'), // 10% period -> 100
      makeIncome(2000, '2025-03-01'), // 15% period -> 300
      makeIncome(3000, '2025-09-01'), // 20% period -> 600
    ];
    expect(calculateMaaserForEntries(entries, PERIODS_MULTI)).toBe(1000);
  });

  it('falls back to 10% when no period covers an entry date', () => {
    const entries = [makeIncome(1000, '2023-06-15')];
    // Date is before all periods -> fallback 10% -> 100
    expect(calculateMaaserForEntries(entries, PERIODS_MULTI)).toBe(100);
  });

  it('falls back to 10% when periods array is empty', () => {
    const entries = [makeIncome(5000, '2025-06-15')];
    expect(calculateMaaserForEntries(entries, [])).toBe(500);
  });

  it('handles entries exactly on period boundary dates', () => {
    const entries = [
      makeIncome(1000, '2025-01-01'), // Exactly on 15% boundary -> 150
      makeIncome(1000, '2025-07-01'), // Exactly on 20% boundary -> 200
    ];
    expect(calculateMaaserForEntries(entries, PERIODS_MULTI)).toBe(350);
  });

  it('handles entries before any period effectiveFrom', () => {
    const entries = [
      makeIncome(1000, '2020-01-01'),
      makeIncome(2000, '2023-12-31'),
    ];
    // Both before first period (2024-01-01) -> fallback 10%
    expect(calculateMaaserForEntries(entries, PERIODS_MULTI)).toBe(300);
  });

  it('handles decimal amounts correctly', () => {
    const entries = [makeIncome(1000.50, '2025-03-15')];
    // 1000.50 * 0.15 = 150.075 in math, but IEEE 754 represents this
    // as slightly under 150.075, so Math.round(total * 100) / 100 = 150.07
    expect(calculateMaaserForEntries(entries, PERIODS_MULTI)).toBe(150.07);
  });

  it('handles unsorted periods correctly', () => {
    const entries = [
      makeIncome(1000, '2025-03-15'), // 15% -> 150
      makeIncome(1000, '2025-08-01'), // 20% -> 200
    ];
    expect(calculateMaaserForEntries(entries, PERIODS_UNSORTED)).toBe(350);
  });

  it('handles a single period covering all entries', () => {
    const periods = [{ percentage: 12.5, effectiveFrom: '2020-01-01' }];
    const entries = [
      makeIncome(800, '2024-01-01'),
      makeIncome(1200, '2025-06-01'),
    ];
    // (800 + 1200) * 0.125 = 250
    expect(calculateMaaserForEntries(entries, periods)).toBe(250);
  });

  it('handles future-dated periods that do not yet apply', () => {
    const periods = [
      { percentage: 10, effectiveFrom: '2024-01-01' },
      { percentage: 50, effectiveFrom: '2030-01-01' },
    ];
    const entries = [makeIncome(1000, '2025-06-15')];
    // Only the 10% period applies -> 100
    expect(calculateMaaserForEntries(entries, periods)).toBe(100);
  });
});

// --- validatePercentagePeriod ---

describe('validatePercentagePeriod', () => {
  it('validates a correct period', () => {
    const result = validatePercentagePeriod({ percentage: 10, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('validates a period with decimal percentage (2 decimal places)', () => {
    const result = validatePercentagePeriod({ percentage: 12.55, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(true);
  });

  it('validates a period with 1 decimal place', () => {
    const result = validatePercentagePeriod({ percentage: 10.5, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(true);
  });

  it('validates a period with integer percentage', () => {
    const result = validatePercentagePeriod({ percentage: 20, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(true);
  });

  it('rejects null input', () => {
    const result = validatePercentagePeriod(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Period must be an object');
  });

  it('rejects undefined input', () => {
    const result = validatePercentagePeriod(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects non-object input', () => {
    const result = validatePercentagePeriod('not an object');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Period must be an object');
  });

  it('rejects missing percentage', () => {
    const result = validatePercentagePeriod({ effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('percentage'))).toBe(true);
  });

  it('rejects non-number percentage', () => {
    const result = validatePercentagePeriod({ percentage: '10', effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('percentage must be a number');
  });

  it('rejects NaN percentage', () => {
    const result = validatePercentagePeriod({ percentage: NaN, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('percentage must be a number');
  });

  it('rejects percentage less than 1', () => {
    const result = validatePercentagePeriod({ percentage: 0, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('percentage must be at least 1');
  });

  it('rejects percentage of 0.5 (less than 1)', () => {
    const result = validatePercentagePeriod({ percentage: 0.5, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('percentage must be at least 1');
  });

  it('rejects negative percentage', () => {
    const result = validatePercentagePeriod({ percentage: -5, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('percentage must be at least 1');
  });

  it('rejects percentage greater than 100', () => {
    const result = validatePercentagePeriod({ percentage: 101, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('percentage must not exceed 100');
  });

  it('accepts percentage exactly 1', () => {
    const result = validatePercentagePeriod({ percentage: 1, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(true);
  });

  it('accepts percentage exactly 100', () => {
    const result = validatePercentagePeriod({ percentage: 100, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(true);
  });

  it('rejects percentage with more than 2 decimal places', () => {
    const result = validatePercentagePeriod({ percentage: 10.555, effectiveFrom: '2025-01-01' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('percentage must have at most 2 decimal places');
  });

  it('rejects missing effectiveFrom', () => {
    const result = validatePercentagePeriod({ percentage: 10 });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('effectiveFrom'))).toBe(true);
  });

  it('rejects non-string effectiveFrom', () => {
    const result = validatePercentagePeriod({ percentage: 10, effectiveFrom: 20250101 });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('effectiveFrom must be a string');
  });

  it('rejects invalid date format (DD-MM-YYYY)', () => {
    const result = validatePercentagePeriod({ percentage: 10, effectiveFrom: '01-01-2025' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('effectiveFrom must be a valid date in YYYY-MM-DD format');
  });

  it('rejects invalid date format (YYYY/MM/DD)', () => {
    const result = validatePercentagePeriod({ percentage: 10, effectiveFrom: '2025/01/01' });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid date format (partial date)', () => {
    const result = validatePercentagePeriod({ percentage: 10, effectiveFrom: '2025-01' });
    expect(result.valid).toBe(false);
  });

  it('rejects empty string effectiveFrom', () => {
    const result = validatePercentagePeriod({ percentage: 10, effectiveFrom: '' });
    expect(result.valid).toBe(false);
  });

  it('rejects date with invalid month', () => {
    const result = validatePercentagePeriod({ percentage: 10, effectiveFrom: '2025-13-01' });
    expect(result.valid).toBe(false);
  });

  it('rejects date with invalid day', () => {
    const result = validatePercentagePeriod({ percentage: 10, effectiveFrom: '2025-01-32' });
    expect(result.valid).toBe(false);
  });

  it('collects multiple errors at once', () => {
    const result = validatePercentagePeriod({ percentage: 200, effectiveFrom: 'not-a-date' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// --- addPercentagePeriod ---

describe('addPercentagePeriod', () => {
  it('adds a period to an empty array', () => {
    const result = addPercentagePeriod([], 15, '2025-06-01');
    expect(result).toEqual([{ percentage: 15, effectiveFrom: '2025-06-01' }]);
  });

  it('adds a period and returns sorted array', () => {
    const existing = [
      { percentage: 10, effectiveFrom: '2024-01-01' },
      { percentage: 20, effectiveFrom: '2025-07-01' },
    ];
    const result = addPercentagePeriod(existing, 15, '2025-01-01');
    expect(result).toEqual([
      { percentage: 10, effectiveFrom: '2024-01-01' },
      { percentage: 15, effectiveFrom: '2025-01-01' },
      { percentage: 20, effectiveFrom: '2025-07-01' },
    ]);
  });

  it('does not mutate the input array (immutability)', () => {
    const existing = [{ percentage: 10, effectiveFrom: '2024-01-01' }];
    const originalLength = existing.length;
    addPercentagePeriod(existing, 20, '2025-01-01');
    expect(existing.length).toBe(originalLength);
    expect(existing).toEqual([{ percentage: 10, effectiveFrom: '2024-01-01' }]);
  });

  it('handles null existingPeriods', () => {
    const result = addPercentagePeriod(null, 10, '2025-01-01');
    expect(result).toEqual([{ percentage: 10, effectiveFrom: '2025-01-01' }]);
  });

  it('handles undefined existingPeriods', () => {
    const result = addPercentagePeriod(undefined, 10, '2025-01-01');
    expect(result).toEqual([{ percentage: 10, effectiveFrom: '2025-01-01' }]);
  });

  it('throws for invalid percentage (too low)', () => {
    expect(() => addPercentagePeriod([], 0, '2025-01-01')).toThrow('Invalid period');
  });

  it('throws for invalid percentage (too high)', () => {
    expect(() => addPercentagePeriod([], 101, '2025-01-01')).toThrow('Invalid period');
  });

  it('throws for invalid date format', () => {
    expect(() => addPercentagePeriod([], 10, 'not-a-date')).toThrow('Invalid period');
  });

  it('throws for percentage with too many decimal places', () => {
    expect(() => addPercentagePeriod([], 10.555, '2025-01-01')).toThrow('Invalid period');
  });

  it('adds a period with decimal percentage', () => {
    const result = addPercentagePeriod([], 12.5, '2025-01-01');
    expect(result).toEqual([{ percentage: 12.5, effectiveFrom: '2025-01-01' }]);
  });

  it('maintains sort order when adding period at the beginning', () => {
    const existing = [{ percentage: 20, effectiveFrom: '2025-01-01' }];
    const result = addPercentagePeriod(existing, 10, '2024-01-01');
    expect(result[0].effectiveFrom).toBe('2024-01-01');
    expect(result[1].effectiveFrom).toBe('2025-01-01');
  });

  it('maintains sort order when adding period at the end', () => {
    const existing = [{ percentage: 10, effectiveFrom: '2024-01-01' }];
    const result = addPercentagePeriod(existing, 20, '2026-01-01');
    expect(result[0].effectiveFrom).toBe('2024-01-01');
    expect(result[1].effectiveFrom).toBe('2026-01-01');
  });

  it('allows adding a period with the same effectiveFrom as existing', () => {
    const existing = [{ percentage: 10, effectiveFrom: '2025-01-01' }];
    const result = addPercentagePeriod(existing, 15, '2025-01-01');
    expect(result.length).toBe(2);
  });
});

// --- Integration-style tests ---

describe('integration: multi-period calculation scenarios', () => {
  it('scenario: gradual increase from 10% to 20% over a year', () => {
    const periods = [
      { percentage: 10, effectiveFrom: '2025-01-01' },
      { percentage: 15, effectiveFrom: '2025-07-01' },
      { percentage: 20, effectiveFrom: '2026-01-01' },
    ];

    const entries = [
      makeIncome(5000, '2025-02-15'), // 10% -> 500
      makeIncome(5000, '2025-04-15'), // 10% -> 500
      makeIncome(5000, '2025-08-15'), // 15% -> 750
      makeIncome(5000, '2025-10-15'), // 15% -> 750
      makeIncome(5000, '2026-02-15'), // 20% -> 1000
    ];

    expect(calculateMaaserForEntries(entries, periods)).toBe(3500);
  });

  it('scenario: all entries before any period defined', () => {
    const periods = [{ percentage: 20, effectiveFrom: '2026-01-01' }];
    const entries = [
      makeIncome(1000, '2025-01-01'),
      makeIncome(2000, '2025-06-01'),
    ];
    // All entries before the only period -> fallback 10%
    expect(calculateMaaserForEntries(entries, periods)).toBe(300);
  });

  it('scenario: mixed with addPercentagePeriod then calculate', () => {
    let periods = [{ percentage: 10, effectiveFrom: '2024-01-01' }];
    periods = addPercentagePeriod(periods, 20, '2025-06-01');

    const entries = [
      makeIncome(1000, '2024-06-15'), // 10% -> 100
      makeIncome(1000, '2025-08-15'), // 20% -> 200
    ];

    expect(calculateMaaserForEntries(entries, periods)).toBe(300);
  });

  it('scenario: validate and reject bad period before adding', () => {
    const validation = validatePercentagePeriod({ percentage: 150, effectiveFrom: '2025-01-01' });
    expect(validation.valid).toBe(false);

    const validResult = validatePercentagePeriod({ percentage: 10, effectiveFrom: '2025-01-01' });
    expect(validResult.valid).toBe(true);
  });
});
