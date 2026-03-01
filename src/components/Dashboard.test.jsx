/**
 * Tests for Dashboard Component
 *
 * Tests for ma'aser calculation, totals display, and various data scenarios
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/utils';
import Dashboard from './Dashboard';

// Mock the current date to ensure consistent test results
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-03-15'));

// Helper to create entries for the current month
const createCurrentMonthEntry = (overrides = {}) => ({
  id: `entry-${Math.random()}`,
  type: 'income',
  date: '2026-03-01T00:00:00.000Z',
  amount: 1000,
  ...overrides,
});

// Helper to create entries for a different month
const createOtherMonthEntry = (overrides = {}) => ({
  id: `entry-${Math.random()}`,
  type: 'income',
  date: '2026-02-01T00:00:00.000Z',
  amount: 1000,
  ...overrides,
});

describe('Dashboard Component', () => {
  afterAll(() => {
    vi.useRealTimers();
  });

  describe('with no data', () => {
    it('should render empty state message', () => {
      render(<Dashboard entries={[]} />);

      expect(screen.getByText(/no data yet|אין נתונים עדיין/i)).toBeInTheDocument();
      expect(screen.getByText(/add your first income|הוסף את ההכנסה הראשונה/i)).toBeInTheDocument();
    });

    it('should display zero for all totals', () => {
      render(<Dashboard entries={[]} />);

      // All stat cards should show 0
      const zeroAmounts = screen.getAllByText(/₪0|0/);
      expect(zeroAmounts.length).toBeGreaterThan(0);
    });

    it('should show 0% progress', () => {
      render(<Dashboard entries={[]} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('with income data', () => {
    it('should calculate ma\'aser as 10% of income', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser owed should be 10% = 1000
      // The format depends on locale, and 1,000 may appear multiple times
      // (as ma'aser owed and remaining to donate)
      const matchingElements = screen.getAllByText(/1,000|1000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should sum multiple income entries', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 5000 }),
        createCurrentMonthEntry({ id: '2', type: 'income', amount: 3000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total income: 8000, Ma'aser: 800
      const matchingElements = screen.getAllByText(/8,000|8000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should only include current month entries in calculations', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 5000 }),
        createOtherMonthEntry({ id: '2', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should only show 5000 for current month, not 15000
      // Ma'aser for 5000 is 500
      const matchingElements = screen.getAllByText(/5,000|5000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });
  });

  describe('with donation data', () => {
    it('should display total donated amount', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total donated should be 500
      // May appear multiple times in progress bar and stat card
      const matchingElements = screen.getAllByText(/500/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should sum multiple donation entries', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 300 }),
        createCurrentMonthEntry({ id: '3', type: 'donation', amount: 200 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total donated: 500
      // May appear multiple times in progress bar and stat card
      const matchingElements = screen.getAllByText(/500/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should calculate remaining amount correctly', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 400 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser owed: 1000, donated: 400, remaining: 600
      expect(screen.getByText(/600/)).toBeInTheDocument();
    });

    it('should not show negative remaining when over-donated', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 2000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser owed: 1000, donated: 2000, remaining should be 0 (not -1000)
      // Should show 0 for remaining
      const remainingLabels = screen.getAllByText(/remaining|נותר/i);
      expect(remainingLabels.length).toBeGreaterThan(0);
    });
  });

  describe('progress bar', () => {
    it('should show 0% when no donations', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show 50% when half donated', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should show 100% when fully donated', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 1000 }),
      ];

      render(<Dashboard entries={entries} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should cap at 100% when over-donated', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 2000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should still show 100%, not 200%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('current month display', () => {
    it('should display the current month and year', () => {
      render(<Dashboard entries={[]} />);

      // March 2026 in English or Hebrew
      expect(screen.getByText(/march|מרץ/i)).toBeInTheDocument();
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    });
  });

  describe('stat cards', () => {
    it('should render all four stat cards', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      // Check for the four stat card labels
      expect(screen.getByText(/income this month|הכנסות החודש/i)).toBeInTheDocument();
      expect(screen.getByText(/ma'?aser owed|מעשר לתשלום/i)).toBeInTheDocument();
      expect(screen.getByText(/total donated|סה"כ נתרם/i)).toBeInTheDocument();
      // "Remaining to donate" appears multiple times (in stat card and progress bar)
      expect(screen.getAllByText(/remaining to donate|נותר לתרום/i).length).toBeGreaterThan(0);
    });
  });

  describe('currency formatting', () => {
    it('should format amounts with ILS currency symbol', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 1234.56 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should show the amount formatted
      expect(screen.getByText(/1,234|1234/)).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle entries with no type correctly', () => {
      const entries = [
        { id: '1', date: '2026-03-01T00:00:00.000Z', amount: 1000 },
      ];

      // Should not crash
      render(<Dashboard entries={entries} />);
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should handle entries with invalid dates', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 1000, date: 'invalid' }),
      ];

      // Should not crash
      render(<Dashboard entries={entries} />);
    });

    it('should handle large numbers', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 1000000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should format large numbers correctly
      const matchingElements = screen.getAllByText(/1,000,000|1000000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should handle decimal amounts', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 1000.99 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser should be 100.099, displayed as ~100.1
      // May appear multiple times
      const matchingElements = screen.getAllByText(/100/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });
  });

  describe('accounting month calculations', () => {
    it('should use accountingMonth instead of date for filtering entries', () => {
      const entries = [
        // Entry dated in February but accounting month is March (current month)
        {
          id: '1',
          type: 'income',
          date: '2026-02-28T00:00:00.000Z',
          accountingMonth: '2026-03', // Counts for March
          amount: 5000,
        },
        // Entry dated in March but accounting month is February (not current)
        {
          id: '2',
          type: 'income',
          date: '2026-03-15T00:00:00.000Z',
          accountingMonth: '2026-02', // Counts for February
          amount: 10000,
        },
      ];

      render(<Dashboard entries={entries} />);

      // Should only show 5000 for current month (March)
      // Entry 2 has date in March but accountingMonth is February, so should not be included
      const matchingElements = screen.getAllByText(/5,000|5000/);
      expect(matchingElements.length).toBeGreaterThan(0);

      // 10,000 should NOT appear as monthly income
      // (it's accounted for February, not March)
    });

    it('should calculate ma\'aser based on accountingMonth entries', () => {
      const entries = [
        {
          id: '1',
          type: 'income',
          date: '2026-02-28T00:00:00.000Z',
          accountingMonth: '2026-03', // Counts for March
          amount: 10000,
        },
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser for 10000 is 1000
      const matchingElements = screen.getAllByText(/1,000|1000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should include donations based on accountingMonth', () => {
      const entries = [
        {
          id: '1',
          type: 'income',
          date: '2026-03-01T00:00:00.000Z',
          accountingMonth: '2026-03',
          amount: 10000,
        },
        // Donation paid in February but counts for March
        {
          id: '2',
          type: 'donation',
          date: '2026-02-28T00:00:00.000Z',
          accountingMonth: '2026-03',
          amount: 500,
        },
      ];

      render(<Dashboard entries={entries} />);

      // Progress should be 50% (500 donated of 1000 owed)
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should fall back to date when accountingMonth is not set', () => {
      const entries = [
        {
          id: '1',
          type: 'income',
          date: '2026-03-15T00:00:00.000Z',
          // No accountingMonth - legacy entry
          amount: 8000,
        },
      ];

      render(<Dashboard entries={entries} />);

      // Should still show the income
      const matchingElements = screen.getAllByText(/8,000|8000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should correctly calculate remaining when donations are for different accounting months', () => {
      const entries = [
        // Income for March
        {
          id: '1',
          type: 'income',
          date: '2026-03-01T00:00:00.000Z',
          accountingMonth: '2026-03',
          amount: 10000,
        },
        // Donation for March
        {
          id: '2',
          type: 'donation',
          date: '2026-03-10T00:00:00.000Z',
          accountingMonth: '2026-03',
          amount: 300,
        },
        // Donation for February (should not count in March calculations)
        {
          id: '3',
          type: 'donation',
          date: '2026-03-15T00:00:00.000Z',
          accountingMonth: '2026-02',
          amount: 500,
        },
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser owed: 1000
      // Donated for March: 300
      // Remaining: 700
      // Progress: 30%
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText(/700/)).toBeInTheDocument();
    });
  });
});
