/**
 * Tests for AddIncome Component
 *
 * Tests for form rendering, validation, submission, and edit mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import AddIncome from './AddIncome';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-123'),
});

describe('AddIncome Component', () => {
  let onAdd;
  let onCancel;

  beforeEach(() => {
    onAdd = vi.fn();
    onCancel = vi.fn();
    vi.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the form title', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.getByText(/add income|הוסף הכנסה/i)).toBeInTheDocument();
    });

    it('should render date input', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.getByLabelText(/date|תאריך/i)).toBeInTheDocument();
    });

    it('should render amount input', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.getByLabelText(/amount|סכום/i)).toBeInTheDocument();
    });

    it('should render note input', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.getByLabelText(/note|הערה/i)).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.getByRole('button', { name: /save|שמור/i })).toBeInTheDocument();
    });

    it('should not render cancel button when not in edit mode', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.queryByRole('button', { name: /cancel|ביטול/i })).not.toBeInTheDocument();
    });

    it('should display today\'s date by default', () => {
      render(<AddIncome onAdd={onAdd} />);

      const dateInput = screen.getByLabelText(/date|תאריך/i);
      expect(dateInput.value).not.toBe('');
    });

    it('should display currency symbol', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.getByText('₪')).toBeInTheDocument();
    });
  });

  describe('calculated ma\'aser display', () => {
    it('should show 0 ma\'aser when no amount entered', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.getByText('₪0.00')).toBeInTheDocument();
    });

    it('should calculate 10% ma\'aser when amount entered', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '1000');

      // Ma'aser should be 100
      expect(screen.getByText('₪100.00')).toBeInTheDocument();
    });

    it('should update ma\'aser calculation in real-time', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);

      await user.type(amountInput, '500');
      expect(screen.getByText('₪50.00')).toBeInTheDocument();

      await user.clear(amountInput);
      await user.type(amountInput, '2000');
      expect(screen.getByText('₪200.00')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should show error when submitting without amount', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(screen.getByText(/please enter an amount|נא להזין סכום/i)).toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('should show error for zero amount', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '0');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(screen.getByText(/invalid amount|סכום לא תקין/i)).toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });

    // Note: Testing negative values is not possible because HTML number inputs
    // with min="0" prevent negative values from being entered. The zero test above
    // verifies the same validation path (parsedAmount <= 0).

    it('should show note character count', () => {
      render(<AddIncome onAdd={onAdd} />);

      expect(screen.getByText('0/500')).toBeInTheDocument();
    });

    it('should update note character count as user types', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const noteInput = screen.getByLabelText(/note|הערה/i);
      await user.type(noteInput, 'Test note');

      expect(screen.getByText('9/500')).toBeInTheDocument();
    });

    it('should show error for note exceeding max length', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '1000');

      const noteInput = screen.getByLabelText(/note|הערה/i);
      // Use fireEvent for long strings to avoid timeout
      fireEvent.change(noteInput, { target: { value: 'a'.repeat(501) } });

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(screen.getByText(/note must not exceed|ההערה חייבת להיות עד/i)).toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('form submission', () => {
    it('should call onAdd with correct data when form is valid', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const dateInput = screen.getByLabelText(/date|תאריך/i);
      const amountInput = screen.getByLabelText(/amount|סכום/i);
      const noteInput = screen.getByLabelText(/note|הערה/i);

      fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
      await user.type(amountInput, '1000');
      await user.type(noteInput, 'Monthly salary');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          amount: 1000,
          note: 'Monthly salary',
          maaser: 100,
        })
      );
    });

    it('should generate a new ID when not editing', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '1000');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-123',
        })
      );
    });

    it('should trim whitespace from note', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      const noteInput = screen.getByLabelText(/note|הערה/i);

      await user.type(amountInput, '1000');
      // Use fireEvent for string with spaces to speed up test
      fireEvent.change(noteInput, { target: { value: '  Test note with spaces  ' } });

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          note: 'Test note with spaces',
        })
      );
    });

    it('should handle decimal amounts correctly', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '1234.56');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1234.56,
          maaser: 123.456,
        })
      );
    });
  });

  describe('edit mode', () => {
    const editEntry = {
      id: 'existing-entry-id',
      type: 'income',
      date: '2026-03-10T00:00:00.000Z',
      amount: 5000,
      note: 'Existing note',
      maaser: 500,
    };

    it('should show edit title in edit mode', () => {
      render(<AddIncome onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      expect(screen.getByText(/edit|ערוך/i)).toBeInTheDocument();
    });

    it('should pre-populate form with edit entry data', () => {
      render(<AddIncome onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      const noteInput = screen.getByLabelText(/note|הערה/i);

      expect(amountInput.value).toBe('5000');
      expect(noteInput.value).toBe('Existing note');
    });

    it('should show cancel button in edit mode', () => {
      render(<AddIncome onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /cancel|ביטול/i })).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel|ביטול/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should preserve entry ID when editing', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.clear(amountInput);
      await user.type(amountInput, '6000');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-entry-id',
        })
      );
    });

    it('should calculate ma\'aser from pre-populated amount', () => {
      render(<AddIncome onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      // Ma'aser for 5000 is 500
      expect(screen.getByText('₪500.00')).toBeInTheDocument();
    });
  });

  describe('error clearing', () => {
    it('should clear error when user starts typing amount', async () => {
      const user = userEvent.setup();
      render(<AddIncome onAdd={onAdd} />);

      // First submit without amount to trigger error
      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(screen.getByText(/please enter an amount|נא להזין סכום/i)).toBeInTheDocument();

      // Now type in amount
      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '100');

      // Submit again - error should be cleared and new validation should run
      await user.click(submitButton);
      expect(onAdd).toHaveBeenCalled();
    });
  });
});
