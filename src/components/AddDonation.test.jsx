/**
 * Tests for AddDonation Component
 *
 * Tests for form rendering, validation, submission, and edit mode
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import userEvent from '@testing-library/user-event';
import AddDonation from './AddDonation';

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-456'),
});

describe('AddDonation Component', () => {
  let onAdd;
  let onCancel;

  beforeEach(() => {
    onAdd = vi.fn();
    onCancel = vi.fn();
    vi.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the form title', () => {
      render(<AddDonation onAdd={onAdd} />);

      expect(screen.getByText(/add donation|הוסף תרומה/i)).toBeInTheDocument();
    });

    it('should render date input', () => {
      render(<AddDonation onAdd={onAdd} />);

      expect(screen.getByLabelText(/date|תאריך/i)).toBeInTheDocument();
    });

    it('should render amount input', () => {
      render(<AddDonation onAdd={onAdd} />);

      expect(screen.getByLabelText(/amount|סכום/i)).toBeInTheDocument();
    });

    it('should render note input', () => {
      render(<AddDonation onAdd={onAdd} />);

      expect(screen.getByLabelText(/note|הערה/i)).toBeInTheDocument();
    });

    it('should render save button', () => {
      render(<AddDonation onAdd={onAdd} />);

      expect(screen.getByRole('button', { name: /save|שמור/i })).toBeInTheDocument();
    });

    it('should not render cancel button when not in edit mode', () => {
      render(<AddDonation onAdd={onAdd} />);

      expect(screen.queryByRole('button', { name: /cancel|ביטול/i })).not.toBeInTheDocument();
    });

    it('should display today\'s date by default', () => {
      render(<AddDonation onAdd={onAdd} />);

      const dateInput = screen.getByLabelText(/date|תאריך/i);
      expect(dateInput.value).not.toBe('');
    });

    it('should display currency symbol', () => {
      render(<AddDonation onAdd={onAdd} />);

      expect(screen.getByText('₪')).toBeInTheDocument();
    });

    it('should NOT display calculated ma\'aser (unlike AddIncome)', () => {
      render(<AddDonation onAdd={onAdd} />);

      // AddDonation should not show the "Calculated Ma'aser" section
      expect(screen.queryByText(/calculated ma'?aser|מעשר מחושב/i)).not.toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should show error when submitting without amount', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(screen.getByText(/please enter an amount|נא להזין סכום/i)).toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('should show error for zero amount', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

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
      render(<AddDonation onAdd={onAdd} />);

      expect(screen.getByText('0/500')).toBeInTheDocument();
    });

    it('should update note character count as user types', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      const noteInput = screen.getByLabelText(/note|הערה/i);
      await user.type(noteInput, 'Charity');

      expect(screen.getByText('7/500')).toBeInTheDocument();
    });

    it('should show error for note exceeding max length', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '100');

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
      render(<AddDonation onAdd={onAdd} />);

      const dateInput = screen.getByLabelText(/date|תאריך/i);
      const amountInput = screen.getByLabelText(/amount|סכום/i);
      const noteInput = screen.getByLabelText(/note|הערה/i);

      fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
      await user.type(amountInput, '500');
      await user.type(noteInput, 'Local charity');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'donation',
          amount: 500,
          note: 'Local charity',
        })
      );
    });

    it('should NOT include maaser field (unlike AddIncome)', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '500');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      // Donation entries should not have a maaser field
      const call = onAdd.mock.calls[0][0];
      expect(call.maaser).toBeUndefined();
    });

    it('should generate a new ID when not editing', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '500');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-uuid-456',
        })
      );
    });

    it('should trim whitespace from note', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      const noteInput = screen.getByLabelText(/note|הערה/i);

      await user.type(amountInput, '500');
      // Use fireEvent for string with spaces to speed up test
      fireEvent.change(noteInput, { target: { value: '  Donation note  ' } });

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          note: 'Donation note',
        })
      );
    });

    it('should handle decimal amounts correctly', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '123.45');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 123.45,
        })
      );
    });
  });

  describe('edit mode', () => {
    const editEntry = {
      id: 'existing-donation-id',
      type: 'donation',
      date: '2026-03-10T00:00:00.000Z',
      amount: 250,
      note: 'Previous donation',
    };

    it('should show edit title in edit mode', () => {
      render(<AddDonation onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      expect(screen.getByText(/edit|ערוך/i)).toBeInTheDocument();
    });

    it('should pre-populate form with edit entry data', () => {
      render(<AddDonation onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      const noteInput = screen.getByLabelText(/note|הערה/i);

      expect(amountInput.value).toBe('250');
      expect(noteInput.value).toBe('Previous donation');
    });

    it('should show cancel button in edit mode', () => {
      render(<AddDonation onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      expect(screen.getByRole('button', { name: /cancel|ביטול/i })).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel|ביטול/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should preserve entry ID when editing', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} editEntry={editEntry} onCancel={onCancel} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.clear(amountInput);
      await user.type(amountInput, '300');

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'existing-donation-id',
        })
      );
    });

    it('should handle entry without note', () => {
      const entryWithoutNote = {
        ...editEntry,
        note: undefined,
      };

      render(<AddDonation onAdd={onAdd} editEntry={entryWithoutNote} onCancel={onCancel} />);

      const noteInput = screen.getByLabelText(/note|הערה/i);
      expect(noteInput.value).toBe('');
    });
  });

  describe('error clearing', () => {
    it('should clear error when user starts typing amount', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      // First submit without amount to trigger error
      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(screen.getByText(/please enter an amount|נא להזין סכום/i)).toBeInTheDocument();

      // Now type in amount
      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '50');

      // Submit again - error should be cleared and new validation should run
      await user.click(submitButton);
      expect(onAdd).toHaveBeenCalled();
    });

    it('should clear note error when typing within limit', async () => {
      const user = userEvent.setup();
      render(<AddDonation onAdd={onAdd} />);

      const amountInput = screen.getByLabelText(/amount|סכום/i);
      await user.type(amountInput, '100');

      const noteInput = screen.getByLabelText(/note|הערה/i);
      // Use fireEvent for long strings to avoid timeout
      fireEvent.change(noteInput, { target: { value: 'a'.repeat(501) } });

      const submitButton = screen.getByRole('button', { name: /save|שמור/i });
      await user.click(submitButton);

      expect(screen.getByText(/note must not exceed|ההערה חייבת להיות עד/i)).toBeInTheDocument();

      // Clear and type shorter note using fireEvent
      fireEvent.change(noteInput, { target: { value: 'Short note' } });

      // Error should be cleared
      expect(screen.queryByText(/note must not exceed|ההערה חייבת להיות עד/i)).not.toBeInTheDocument();
    });
  });
});
