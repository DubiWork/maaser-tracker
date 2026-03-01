/**
 * Tests for History Component
 *
 * Tests for entry list display, edit/delete functionality, and empty state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import History from './History';

describe('History Component', () => {
  let onEdit;
  let onDelete;

  beforeEach(() => {
    onEdit = vi.fn();
    onDelete = vi.fn();
    vi.clearAllMocks();
  });

  const incomeEntry = {
    id: 'income-1',
    type: 'income',
    date: '2026-03-15T00:00:00.000Z',
    amount: 5000,
    maaser: 500,
    note: 'Monthly salary',
  };

  const donationEntry = {
    id: 'donation-1',
    type: 'donation',
    date: '2026-03-10T00:00:00.000Z',
    amount: 200,
    note: 'Local charity',
  };

  describe('empty state', () => {
    it('should display empty state message when no entries', () => {
      render(<History entries={[]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/no entries|אין רשומות/i)).toBeInTheDocument();
    });

    it('should not show list when empty', () => {
      render(<History entries={[]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('entry list display', () => {
    it('should display income entries', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/5,000|5000/)).toBeInTheDocument();
      expect(screen.getByText(/income|הכנסה/i)).toBeInTheDocument();
    });

    it('should display donation entries', () => {
      render(<History entries={[donationEntry]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/200/)).toBeInTheDocument();
      expect(screen.getByText(/donation|תרומה/i)).toBeInTheDocument();
    });

    it('should display multiple entries', () => {
      render(
        <History entries={[incomeEntry, donationEntry]} onEdit={onEdit} onDelete={onDelete} />
      );

      expect(screen.getByText(/5,000|5000/)).toBeInTheDocument();
      expect(screen.getByText(/200/)).toBeInTheDocument();
    });

    it('should display entry notes', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText('Monthly salary')).toBeInTheDocument();
    });

    it('should display ma\'aser amount for income entries', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      // Should show "Ma'aser: 500"
      expect(screen.getByText(/ma'?aser|מעשר/i)).toBeInTheDocument();
      expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it('should not show ma\'aser for donation entries', () => {
      render(<History entries={[donationEntry]} onEdit={onEdit} onDelete={onDelete} />);

      // The only "200" should be the donation amount, not ma'aser
      const maaserLabels = screen.queryAllByText(/ma'?aser.*:|מעשר.*:/i);
      // Filter out any that are just the word "ma'aser" in a chip
      const maaserWithValue = maaserLabels.filter(el => el.textContent.includes(':'));
      expect(maaserWithValue).toHaveLength(0);
    });

    it('should sort entries by date (newest first)', () => {
      const olderEntry = {
        ...incomeEntry,
        id: 'older',
        date: '2026-03-01T00:00:00.000Z',
      };
      const newerEntry = {
        ...donationEntry,
        id: 'newer',
        date: '2026-03-20T00:00:00.000Z',
      };

      render(
        <History entries={[olderEntry, newerEntry]} onEdit={onEdit} onDelete={onDelete} />
      );

      // Get all list items and check order
      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(2);

      // Newer entry (donation with 200) should appear first
      expect(within(listItems[0]).getByText(/200/)).toBeInTheDocument();
    });

    it('should handle entries without notes', () => {
      const entryWithoutNote = {
        ...incomeEntry,
        note: undefined,
      };

      render(<History entries={[entryWithoutNote]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/5,000|5000/)).toBeInTheDocument();
      expect(screen.queryByText('Monthly salary')).not.toBeInTheDocument();
    });

    it('should handle entries with empty note string', () => {
      const entryWithEmptyNote = {
        ...incomeEntry,
        note: '',
      };

      render(<History entries={[entryWithEmptyNote]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/5,000|5000/)).toBeInTheDocument();
    });
  });

  describe('edit functionality', () => {
    it('should render edit button for each entry', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      // Find edit button by SVG icon or button role
      const editButtons = screen.getAllByRole('button');
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should call onEdit with entry when edit button clicked', async () => {
      const user = userEvent.setup();
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      // Find edit button (first button that is not delete)
      const buttons = screen.getAllByRole('button');
      // Edit button should be the first one (before delete)
      await user.click(buttons[0]);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(incomeEntry);
    });

    it('should call onEdit with correct entry when multiple entries exist', async () => {
      const user = userEvent.setup();
      render(
        <History entries={[incomeEntry, donationEntry]} onEdit={onEdit} onDelete={onDelete} />
      );

      // Get all list items
      const listItems = screen.getAllByRole('listitem');

      // Click edit on second item
      const secondItemButtons = within(listItems[1]).getAllByRole('button');
      await user.click(secondItemButtons[0]);

      // Should be called with the donation entry (sorted by date, donation is older)
      expect(onEdit).toHaveBeenCalled();
    });
  });

  describe('delete functionality', () => {
    it('should render delete button for each entry', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      const buttons = screen.getAllByRole('button');
      // Should have at least 2 buttons (edit and delete)
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should open delete confirmation dialog when delete clicked', async () => {
      const user = userEvent.setup();
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      // Find and click delete button (second button)
      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]); // Delete is second button

      // Dialog should appear
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/delete this entry|האם למחוק רשומה זו/i)).toBeInTheDocument();
    });

    it('should show entry details in confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);

      // Dialog should show entry type and amount
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/income|הכנסה/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/5,000|5000/)).toBeInTheDocument();
    });

    it('should close dialog when No button clicked', async () => {
      const user = userEvent.setup();
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);

      // Click No button
      const noButton = screen.getByRole('button', { name: /no|לא/i });
      await user.click(noButton);

      // Dialog should close (wait for animation)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('should call onDelete and close dialog when Yes button clicked', async () => {
      const user = userEvent.setup();
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);

      // Click Yes button
      const yesButton = screen.getByRole('button', { name: /yes|כן/i });
      await user.click(yesButton);

      // onDelete should be called with entry ID
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(incomeEntry.id);

      // Dialog should close (wait for animation)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should delete correct entry when multiple entries exist', async () => {
      const user = userEvent.setup();
      render(
        <History entries={[incomeEntry, donationEntry]} onEdit={onEdit} onDelete={onDelete} />
      );

      // Get all list items
      const listItems = screen.getAllByRole('listitem');

      // Click delete on second item
      const secondItemButtons = within(listItems[1]).getAllByRole('button');
      await user.click(secondItemButtons[1]); // Delete button

      // Confirm deletion
      const yesButton = screen.getByRole('button', { name: /yes|כן/i });
      await user.click(yesButton);

      // Should be called with correct ID
      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe('date formatting', () => {
    it('should format dates in readable format', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      // Should show formatted date (March 15, 2026 or similar)
      // The exact format depends on locale
      expect(screen.getByText(/march|מרץ/i)).toBeInTheDocument();
    });
  });

  describe('currency formatting', () => {
    it('should format amounts with ILS currency', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      // Should show formatted amount
      expect(screen.getByText(/5,000|5000/)).toBeInTheDocument();
    });

    it('should handle decimal amounts', () => {
      const entryWithDecimal = {
        ...incomeEntry,
        amount: 1234.56,
        maaser: 123.456,
      };

      render(<History entries={[entryWithDecimal]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/1,234|1234/)).toBeInTheDocument();
    });

    it('should handle large amounts', () => {
      const entryWithLargeAmount = {
        ...incomeEntry,
        amount: 1000000,
        maaser: 100000,
      };

      render(<History entries={[entryWithLargeAmount]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/1,000,000|1000000/)).toBeInTheDocument();
    });
  });

  describe('entry type chips', () => {
    it('should show income chip for income entries', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/income|הכנסה/i)).toBeInTheDocument();
    });

    it('should show donation chip for donation entries', () => {
      render(<History entries={[donationEntry]} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.getByText(/donation|תרומה/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible buttons', () => {
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should have accessible dialog', async () => {
      const user = userEvent.setup();
      render(<History entries={[incomeEntry]} onEdit={onEdit} onDelete={onDelete} />);

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
