/**
 * Integration Tests: AddIncome + NotePresetButtons
 *
 * Tests cover:
 * - NotePresetButtons renders below the notes field
 * - Tapping a preset chip fills the notes field
 * - [+] button opens PresetManagementDialog
 * - type='income' is passed to NotePresetButtons
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../test/utils';
import userEvent from '@testing-library/user-event';
import AddIncome from './AddIncome';

// Mock useSettings
vi.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    settings: {
      language: 'he',
      currency: 'ILS',
      maaserPercentagePeriods: [{ percentage: 10, effectiveFrom: '2020-01-01' }],
      themeMode: 'system',
    },
    isLoading: false,
    formatCurrency: (amount) => `₪${amount.toFixed(2)}`,
    getCurrentMaaserPercentage: () => 10,
    getMaaserPercentageForDate: () => 10,
  }),
}));

// Mock NotePresetButtons to isolate AddIncome behavior
vi.mock('./NotePresetButtons', () => ({
  default: ({ type, onSelect, selectedText, onManageClick }) => (
    <div data-testid="note-preset-buttons" data-type={type} data-selected={selectedText}>
      <button
        data-testid="preset-chip-salary"
        onClick={() => onSelect('Salary')}
      >
        Salary
      </button>
      <button
        data-testid="preset-manage-btn"
        onClick={onManageClick}
      >
        +
      </button>
    </div>
  ),
}));

// Mock PresetManagementDialog
vi.mock('./PresetManagementDialog', () => ({
  default: ({ open, onClose, type }) => (
    open ? (
      <div
        role="dialog"
        data-testid="preset-management-dialog"
        data-type={type}
      >
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-preset'),
});

describe('AddIncome + NotePresetButtons integration', () => {
  let onAdd;

  beforeEach(() => {
    onAdd = vi.fn();
    vi.clearAllMocks();
  });

  it('should render NotePresetButtons below the notes field', () => {
    render(<AddIncome onAdd={onAdd} />);

    const presetButtons = screen.getByTestId('note-preset-buttons');
    expect(presetButtons).toBeInTheDocument();
  });

  it('should pass type="income" to NotePresetButtons', () => {
    render(<AddIncome onAdd={onAdd} />);

    const presetButtons = screen.getByTestId('note-preset-buttons');
    expect(presetButtons).toHaveAttribute('data-type', 'income');
  });

  it('should fill the notes field when a preset chip is tapped', () => {
    render(<AddIncome onAdd={onAdd} />);

    const chip = screen.getByTestId('preset-chip-salary');
    fireEvent.click(chip);

    const noteField = screen.getByLabelText(/note|הערה/i);
    expect(noteField.value).toBe('Salary');
  });

  it('should pass selectedText (current note value) to NotePresetButtons', async () => {
    render(<AddIncome onAdd={onAdd} />);

    // The selectedText should initially be empty
    const presetButtons = screen.getByTestId('note-preset-buttons');
    expect(presetButtons).toHaveAttribute('data-selected', '');
  });

  it('should open PresetManagementDialog when [+] is clicked', () => {
    render(<AddIncome onAdd={onAdd} />);

    const manageBtn = screen.getByTestId('preset-manage-btn');
    fireEvent.click(manageBtn);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('preset-management-dialog')).toBeInTheDocument();
  });

  it('should pass type="income" to PresetManagementDialog', () => {
    render(<AddIncome onAdd={onAdd} />);

    const manageBtn = screen.getByTestId('preset-manage-btn');
    fireEvent.click(manageBtn);

    const dialog = screen.getByTestId('preset-management-dialog');
    expect(dialog).toHaveAttribute('data-type', 'income');
  });

  it('should close PresetManagementDialog when its onClose is called', async () => {
    const user = userEvent.setup();
    render(<AddIncome onAdd={onAdd} />);

    // Open dialog
    fireEvent.click(screen.getByTestId('preset-manage-btn'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Close dialog
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closeBtn);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should submit the preset-filled note when form is saved', async () => {
    const user = userEvent.setup();
    render(<AddIncome onAdd={onAdd} />);

    // Fill amount using fireEvent for speed
    const amountInput = screen.getByLabelText(/amount|סכום/i);
    fireEvent.change(amountInput, { target: { value: '1000' } });

    // Click preset chip
    const chip = screen.getByTestId('preset-chip-salary');
    fireEvent.click(chip);

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /save|שמור/i });
    await user.click(saveBtn);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        note: 'Salary',
        type: 'income',
      })
    );
  });

  it('should update selectedText in NotePresetButtons when note changes manually', () => {
    render(<AddIncome onAdd={onAdd} />);

    const noteField = screen.getByLabelText(/note|הערה/i);
    fireEvent.change(noteField, { target: { value: 'Custom note' } });

    const presetButtons = screen.getByTestId('note-preset-buttons');
    expect(presetButtons).toHaveAttribute('data-selected', 'Custom note');
  });
});
