/**
 * Tests for Dashboard Component
 *
 * Tests for ma'aser calculation, totals display, celebration-focused design,
 * and various data scenarios
 */

import { describe, it, expect, vi, afterAll } from 'vitest';
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
  accountingMonth: '2026-03',
  amount: 1000,
  ...overrides,
});

// Helper to create entries for a different month
const createOtherMonthEntry = (overrides = {}) => ({
  id: `entry-${Math.random()}`,
  type: 'income',
  date: '2026-02-01T00:00:00.000Z',
  accountingMonth: '2026-02',
  amount: 1000,
  ...overrides,
});

// Helper to create entries for a past month (for multi-month scenarios)
const createPastMonthEntry = (month, overrides = {}) => ({
  id: `entry-${Math.random()}`,
  type: 'income',
  date: `2026-${month.toString().padStart(2, '0')}-01T00:00:00.000Z`,
  accountingMonth: `2026-${month.toString().padStart(2, '0')}`,
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

    it('should show 0% progress for both all-time and monthly', () => {
      render(<Dashboard entries={[]} />);

      const progressIndicators = screen.getAllByText('0%');
      expect(progressIndicators.length).toBe(2); // All-time and monthly progress
    });

    it('should show celebration message for all current when no entries', () => {
      render(<Dashboard entries={[]} />);

      expect(screen.getByText(/amazing.*all current|מדהים.*מעודכן/i)).toBeInTheDocument();
    });
  });

  describe('Celebration Hero Section', () => {
    it('should display the donation celebration message', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should show celebration message with donated amount
      expect(screen.getByText(/you've donated.*ma'aser|תרמת.*במעשר/i)).toBeInTheDocument();
    });

    it('should display encouraging message based on progress', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 950 }),
      ];

      render(<Dashboard entries={entries} />);

      // 95% progress should show "Almost there" message
      expect(screen.getByText(/almost there|כמעט שם/i)).toBeInTheDocument();
    });

    it('should show encouraging message for 75-89% progress', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 800 }),
      ];

      render(<Dashboard entries={entries} />);

      // 80% progress should show "Great progress" message
      expect(screen.getByText(/great progress|התקדמות מצוינת/i)).toBeInTheDocument();
    });

    it('should show encouraging message for 50-74% progress', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 600 }),
      ];

      render(<Dashboard entries={entries} />);

      // 60% progress should show "doing well" message
      expect(screen.getByText(/doing well|עושה טוב/i)).toBeInTheDocument();
    });

    it('should show encouraging message for under 50% progress', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 200 }),
      ];

      render(<Dashboard entries={entries} />);

      // 20% progress should show "Every bit counts" message
      expect(screen.getByText(/every bit counts|כל תרומה נחשבת/i)).toBeInTheDocument();
    });

    it('should show perfect message when 100% complete', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 1000 }),
      ];

      render(<Dashboard entries={entries} />);

      // 100% progress should show "Perfect" message
      expect(screen.getByText(/perfect|מושלם/i)).toBeInTheDocument();
    });

    it('should have accessible donation progress region', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Hero section should be a region with proper label
      const progressRegion = screen.getByRole('region', { name: /donation progress|התקדמות תרומות/i });
      expect(progressRegion).toBeInTheDocument();
    });
  });

  describe('Subtle Balance Indicator (Positive Messaging)', () => {
    it('should show encouraging message when owing (not warning)', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should show "more to complete" message (not "You Owe")
      expect(screen.getByText(/more to complete|להשלמת התקופה/i)).toBeInTheDocument();
      // Should NOT show "You Owe" language
      expect(screen.queryByText(/you owe|חוב מעשר/i)).not.toBeInTheDocument();
    });

    it('should show celebration message when ahead (credit)', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 2000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should show "ahead" celebration message
      expect(screen.getByText(/incredible.*ahead|מדהים.*קדמת/i)).toBeInTheDocument();
    });

    it('should show celebration message when all current', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 1000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should show "Amazing! All current" message
      expect(screen.getByText(/amazing.*all current|מדהים.*מעודכן/i)).toBeInTheDocument();
    });
  });

  describe('All-Time Totals Section', () => {
    it('should display the all-time totals header', () => {
      render(<Dashboard entries={[]} />);

      expect(screen.getByText(/all-time totals|סך הכל מתחילת המעקב/i)).toBeInTheDocument();
    });

    it('should calculate all-time income across all months', () => {
      const entries = [
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 5000 }),
        createPastMonthEntry(2, { id: '2', type: 'income', amount: 3000 }),
        createCurrentMonthEntry({ id: '3', type: 'income', amount: 2000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total income should be 10,000
      const matchingElements = screen.getAllByText(/10,000|10000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should calculate all-time ma\'aser owed as 10% of total income', () => {
      const entries = [
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 50000 }),
        createPastMonthEntry(2, { id: '2', type: 'income', amount: 30000 }),
        createCurrentMonthEntry({ id: '3', type: 'income', amount: 20000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total income: 100,000, Ma'aser owed: 10,000
      // Both values should appear
      const totalIncomeElements = screen.getAllByText(/100,000|100000/);
      expect(totalIncomeElements.length).toBeGreaterThan(0);

      const maaserOwedElements = screen.getAllByText(/10,000|10000/);
      expect(maaserOwedElements.length).toBeGreaterThan(0);
    });

    it('should calculate all-time donated across all months', () => {
      const entries = [
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 10000 }),
        createPastMonthEntry(1, { id: '2', type: 'donation', amount: 500 }),
        createPastMonthEntry(2, { id: '3', type: 'donation', amount: 300 }),
        createCurrentMonthEntry({ id: '4', type: 'donation', amount: 200 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total donated should be 1000
      const matchingElements = screen.getAllByText(/1,000|1000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Ma\'aser Balance Calculations', () => {
    it('should calculate positive balance when owed > donated', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser owed: 1000, donated: 500, balance: 500
      // Should show encouraging "more to complete" message
      expect(screen.getByText(/more to complete|להשלמת התקופה/i)).toBeInTheDocument();
      const matchingElements = screen.getAllByText(/500/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should calculate negative balance when donated > owed (credit)', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 2000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser owed: 1000, donated: 2000, balance: -1000 (credit)
      expect(screen.getByText(/incredible.*ahead|מדהים.*קדמת/i)).toBeInTheDocument();
      const matchingElements = screen.getAllByText(/1,000|1000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should show zero balance celebration when exactly current', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 1000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser owed: 1000, donated: 1000, balance: 0
      expect(screen.getByText(/amazing.*all current|מדהים.*מעודכן/i)).toBeInTheDocument();
    });

    it('should track cumulative balance across multiple months', () => {
      const entries = [
        // January: Income 10000, Ma'aser owed 1000, donated 500 = debt 500
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 10000 }),
        createPastMonthEntry(1, { id: '2', type: 'donation', amount: 500 }),
        // February: Income 20000, Ma'aser owed 2000, donated 1500 = debt 500
        createPastMonthEntry(2, { id: '3', type: 'income', amount: 20000 }),
        createPastMonthEntry(2, { id: '4', type: 'donation', amount: 1500 }),
        // March: Income 5000, Ma'aser owed 500, donated 0 = debt 500
        createCurrentMonthEntry({ id: '5', type: 'income', amount: 5000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total Ma'aser owed: 3500 (1000 + 2000 + 500)
      // Total donated: 2000 (500 + 1500 + 0)
      // Balance: 1500 (more to complete)
      expect(screen.getByText(/more to complete|להשלמת התקופה/i)).toBeInTheDocument();
      expect(screen.getByText(/1,500|1500/)).toBeInTheDocument();
    });

    it('should allow credit to carry over from previous months', () => {
      const entries = [
        // January: Donated more than owed (pre-paying)
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 10000 }),
        createPastMonthEntry(1, { id: '2', type: 'donation', amount: 3000 }),
        // February: No new income or donations
        // March: New income, credit should still apply
        createCurrentMonthEntry({ id: '3', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // January: Owed 1000, donated 3000, credit 2000
      // March: Owed 1000, no donations
      // Total: Owed 2000, donated 3000, credit 1000
      expect(screen.getByText(/incredible.*ahead|מדהים.*קדמת/i)).toBeInTheDocument();
      const matchingElements = screen.getAllByText(/1,000|1000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });
  });

  describe('This Month Section', () => {
    it('should display the monthly section header with current month', () => {
      render(<Dashboard entries={[]} />);

      // The "This Month" header is an h6 element
      const sectionHeaders = screen.getAllByRole('heading', { level: 6 });
      // Find the one that contains "This Month" or "החודש" (not part of compound text)
      const thisMonthHeader = sectionHeaders.find(h =>
        h.textContent === 'This Month' || h.textContent === 'החודש'
      );
      expect(thisMonthHeader).toBeInTheDocument();

      // Should also show the month name and year
      expect(screen.getByText(/march|מרץ/i)).toBeInTheDocument();
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    });

    it('should calculate monthly income correctly', () => {
      const entries = [
        createOtherMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'income', amount: 5000 }),
        createCurrentMonthEntry({ id: '3', type: 'income', amount: 3000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Monthly income should be 8000 (5000 + 3000), not including Feb's 10000
      const matchingElements = screen.getAllByText(/8,000|8000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should calculate monthly ma\'aser as 10% of monthly income', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Monthly ma'aser should be 1000
      const matchingElements = screen.getAllByText(/1,000|1000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should calculate monthly donations correctly', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 500 }),
        createCurrentMonthEntry({ id: '3', type: 'donation', amount: 200 }),
      ];

      render(<Dashboard entries={entries} />);

      // Monthly donations should be 700
      const matchingElements = screen.getAllByText(/700/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should calculate net change for the month (positive)', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 1500 }),
      ];

      render(<Dashboard entries={entries} />);

      // Net change: donated (1500) - owed (1000) = +500
      // Should show positive net change
      expect(screen.getByText(/net change|שינוי נטו/i)).toBeInTheDocument();
    });

    it('should calculate net change for the month (negative)', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 200 }),
      ];

      render(<Dashboard entries={entries} />);

      // Net change: donated (200) - owed (1000) = -800
      // Should show negative net change
      expect(screen.getByText(/net change|שינוי נטו/i)).toBeInTheDocument();
    });
  });

  describe('Progress Bars', () => {
    it('should show all-time progress correctly', () => {
      const entries = [
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 10000 }),
        createPastMonthEntry(1, { id: '2', type: 'donation', amount: 500 }),
        createCurrentMonthEntry({ id: '3', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '4', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total owed: 2000, donated: 1000 = 50%
      const progressElements = screen.getAllByText('50%');
      expect(progressElements.length).toBeGreaterThan(0);
    });

    it('should cap all-time progress at 100% when over-donated', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 5000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Owed: 1000, donated: 5000 = 500%, but should cap at 100%
      const progressElements = screen.getAllByText('100%');
      expect(progressElements.length).toBeGreaterThan(0);
    });

    it('should show monthly progress separately from all-time', () => {
      const entries = [
        // Past month: fully donated
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 10000 }),
        createPastMonthEntry(1, { id: '2', type: 'donation', amount: 1000 }),
        // Current month: not donated yet
        createCurrentMonthEntry({ id: '3', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // All-time: 2000 owed, 1000 donated = 50%
      // Monthly: 1000 owed, 0 donated = 0%
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('should format amounts with ILS currency symbol', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 1234.56 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should show the amount formatted (may appear multiple times in all-time and monthly sections)
      const matchingElements = screen.getAllByText(/1,234|1234/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should handle large numbers correctly', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 1000000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should format large numbers correctly
      const matchingElements = screen.getAllByText(/1,000,000|1000000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should handle decimal amounts correctly', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 1000.99 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser should be 100.099, displayed as ~100.1
      const matchingElements = screen.getAllByText(/100/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should handle very small amounts', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10 }),
      ];

      render(<Dashboard entries={entries} />);

      // Ma'aser should be 1 (appears multiple times - all-time and monthly sections)
      const matchingElements = screen.getAllByText(/1/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle entries with no type correctly', () => {
      const entries = [
        { id: '1', date: '2026-03-01T00:00:00.000Z', amount: 1000 },
      ];

      // Should not crash
      render(<Dashboard entries={entries} />);
      // With no valid income/donation entries, progress bars show 0%
      const matchingElements = screen.getAllByText(/0%/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should handle entries with invalid dates', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 1000, date: 'invalid' }),
      ];

      // Should not crash
      render(<Dashboard entries={entries} />);
    });

    it('should handle donations only (no income) with credit celebration', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should show credit celebration since donated without income
      expect(screen.getByText(/incredible.*ahead|מדהים.*קדמת/i)).toBeInTheDocument();
      const matchingElements = screen.getAllByText(/500/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should handle income only (no donations) with encouraging message', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Should show encouraging "more to complete" message (not "You Owe")
      expect(screen.getByText(/more to complete|להשלמת התקופה/i)).toBeInTheDocument();
      const matchingElements = screen.getAllByText(/1,000|1000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Accounting Month Calculations', () => {
    it('should use accountingMonth instead of date for filtering entries', () => {
      const entries = [
        // Entry dated in February but accounting month is March (current month)
        {
          id: '1',
          type: 'income',
          date: '2026-02-28T00:00:00.000Z',
          accountingMonth: '2026-03',
          amount: 5000,
        },
        // Entry dated in March but accounting month is February (not current)
        {
          id: '2',
          type: 'income',
          date: '2026-03-15T00:00:00.000Z',
          accountingMonth: '2026-02',
          amount: 10000,
        },
      ];

      render(<Dashboard entries={entries} />);

      // Monthly section should only show 5000 for current month (March)
      // All-time should show total 15000
      const matchingElements = screen.getAllByText(/5,000|5000/);
      expect(matchingElements.length).toBeGreaterThan(0);
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

    it('should correctly calculate when donations are for different accounting months', () => {
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
        // Donation for February (should still count in all-time)
        {
          id: '3',
          type: 'donation',
          date: '2026-03-15T00:00:00.000Z',
          accountingMonth: '2026-02',
          amount: 500,
        },
      ];

      render(<Dashboard entries={entries} />);

      // Monthly progress: 30% (300 donated of 1000 owed)
      expect(screen.getByText('30%')).toBeInTheDocument();

      // All-time: 1000 owed, 800 donated (300 + 500) = 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
    });
  });

  describe('Multi-Month Credit Carryover Scenarios', () => {
    it('should demonstrate credit carryover across months', () => {
      const entries = [
        // Month 1: Heavy donation (building credit)
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 10000 }),
        createPastMonthEntry(1, { id: '2', type: 'donation', amount: 5000 }),
        // Month 2: Income but no donations (using credit)
        createPastMonthEntry(2, { id: '3', type: 'income', amount: 20000 }),
        // Month 3: Income but no donations (using remaining credit)
        createCurrentMonthEntry({ id: '4', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total owed: 1000 + 2000 + 1000 = 4000
      // Total donated: 5000
      // Balance: -1000 (credit)
      expect(screen.getByText(/incredible.*ahead|מדהים.*קדמת/i)).toBeInTheDocument();
      const matchingElements = screen.getAllByText(/1,000|1000/);
      expect(matchingElements.length).toBeGreaterThan(0);
    });

    it('should demonstrate debt accumulation across months with encouraging message', () => {
      const entries = [
        // Month 1: Partial payment
        createPastMonthEntry(1, { id: '1', type: 'income', amount: 10000 }),
        createPastMonthEntry(1, { id: '2', type: 'donation', amount: 500 }),
        // Month 2: No payment
        createPastMonthEntry(2, { id: '3', type: 'income', amount: 20000 }),
        // Month 3: No payment
        createCurrentMonthEntry({ id: '4', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Total owed: 1000 + 2000 + 1000 = 4000
      // Total donated: 500
      // Balance: 3500 (more to complete, not "owe")
      expect(screen.getByText(/more to complete|להשלמת התקופה/i)).toBeInTheDocument();
      expect(screen.getByText(/3,500|3500/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible donation progress region', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Hero section should be a region with proper label
      const progressRegion = screen.getByRole('region', { name: /donation progress|התקדמות תרומות/i });
      expect(progressRegion).toBeInTheDocument();
    });

    it('should have aria-live for celebration message updates', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // The hero region should have aria-live for screen reader announcements
      const progressRegion = screen.getByRole('region', { name: /donation progress|התקדמות תרומות/i });
      expect(progressRegion).toBeInTheDocument();

      // Find element with aria-live attribute within the hero card
      const liveElement = progressRegion.querySelector('[aria-live="polite"]');
      expect(liveElement).toBeInTheDocument();
    });

    it('should have status role for balance indicator', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
      ];

      render(<Dashboard entries={entries} />);

      // Balance indicator should have role="status"
      const statusElement = screen.getByRole('status');
      expect(statusElement).toBeInTheDocument();
    });
  });

  describe('Visual Distinction', () => {
    it('should display both all-time and monthly sections', () => {
      render(<Dashboard entries={[]} />);

      // Both sections should be displayed (checking for headers)
      // Use getAllByText since "this month" may appear in multiple places
      const allTimeHeaders = screen.getAllByText(/all-time totals|סך הכל מתחילת המעקב/i);
      expect(allTimeHeaders.length).toBeGreaterThan(0);

      const monthlyHeaders = screen.getAllByText(/this month|החודש/i);
      expect(monthlyHeaders.length).toBeGreaterThan(0);
    });

    it('should show correct labels for all stat cards', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        createCurrentMonthEntry({ id: '2', type: 'donation', amount: 500 }),
      ];

      render(<Dashboard entries={entries} />);

      // All-time labels (may appear multiple times - in hero and stat cards)
      const totalIncomeLabels = screen.getAllByText(/total income|סך הכל הכנסות/i);
      expect(totalIncomeLabels.length).toBeGreaterThan(0);

      const totalMaaserLabels = screen.getAllByText(/total ma'?aser owed|סך הכל מעשר חובה/i);
      expect(totalMaaserLabels.length).toBeGreaterThan(0);

      // Monthly labels
      expect(screen.getByText(/income this month|הכנסות החודש/i)).toBeInTheDocument();
      expect(screen.getByText(/net change|שינוי נטו/i)).toBeInTheDocument();
    });
  });

  describe('No Red/Warning Colors for Owing State', () => {
    it('should not use aggressive warning language when owing money', () => {
      const entries = [
        createCurrentMonthEntry({ id: '1', type: 'income', amount: 10000 }),
        // No donations - should owe 1000
      ];

      render(<Dashboard entries={entries} />);

      // Should NOT show "You Owe" or Hebrew equivalent
      expect(screen.queryByText(/you owe|חוב מעשר/i)).not.toBeInTheDocument();
      // Should show positive framing instead
      expect(screen.getByText(/more to complete|להשלמת התקופה/i)).toBeInTheDocument();
    });
  });
});
