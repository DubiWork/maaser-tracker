/**
 * Tests for NotePresetButtons Component
 *
 * Tests cover:
 * - Renders preset chips for the given type
 * - Calls onSelect when a chip is tapped
 * - Shows selected state when selectedText matches a preset
 * - Shows [+] button at the end
 * - Loading state shows skeleton chips
 * - Empty state shows only [+] button
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import NotePresetButtons from './NotePresetButtons';

// Mock usePresets hook
vi.mock('../hooks/usePresets', () => ({
  usePresets: vi.fn(),
}));

import { usePresets } from '../hooks/usePresets';

const mockIncomePresets = [
  { id: 1, text: 'Salary', type: 'income', isDefault: true, order: 0, createdAt: 1000 },
  { id: 2, text: 'Bonus', type: 'income', isDefault: true, order: 1, createdAt: 1001 },
  { id: 3, text: 'Freelance', type: 'income', isDefault: true, order: 2, createdAt: 1002 },
];

const mockDonationPresets = [
  { id: 4, text: 'Charity Dinner', type: 'donation', isDefault: true, order: 0, createdAt: 1003 },
  { id: 5, text: 'Synagogue', type: 'donation', isDefault: true, order: 1, createdAt: 1004 },
];

describe('NotePresetButtons', () => {
  let onSelect;
  let onManageClick;

  beforeEach(() => {
    onSelect = vi.fn();
    onManageClick = vi.fn();
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show skeleton chips while presets are loading', () => {
      usePresets.mockReturnValue({ data: undefined, isLoading: true });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} />
      );

      // Skeletons should be present (MUI Skeleton renders with role="progressbar" or data-testid)
      const skeletons = document.querySelectorAll('[data-testid="preset-skeleton"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not call onSelect during loading', () => {
      usePresets.mockReturnValue({ data: undefined, isLoading: true });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} />
      );

      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('rendering presets', () => {
    it('should render income preset chips', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} />
      );

      expect(screen.getByText('Salary')).toBeInTheDocument();
      expect(screen.getByText('Bonus')).toBeInTheDocument();
      expect(screen.getByText('Freelance')).toBeInTheDocument();
    });

    it('should render donation preset chips', () => {
      usePresets.mockReturnValue({ data: mockDonationPresets, isLoading: false });

      render(
        <NotePresetButtons type="donation" onSelect={onSelect} />
      );

      expect(screen.getByText('Charity Dinner')).toBeInTheDocument();
      expect(screen.getByText('Synagogue')).toBeInTheDocument();
    });

    it('should pass correct type to usePresets', () => {
      usePresets.mockReturnValue({ data: mockDonationPresets, isLoading: false });

      render(
        <NotePresetButtons type="donation" onSelect={onSelect} />
      );

      expect(usePresets).toHaveBeenCalledWith('donation');
    });
  });

  describe('preset selection', () => {
    it('should call onSelect with preset text when chip is clicked', async () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} />
      );

      fireEvent.click(screen.getByText('Salary'));

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith('Salary');
    });

    it('should call onSelect with correct text for each preset', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} />
      );

      fireEvent.click(screen.getByText('Bonus'));

      expect(onSelect).toHaveBeenCalledWith('Bonus');
    });
  });

  describe('selected state', () => {
    it('should show chip as selected (filled variant) when selectedText matches', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} selectedText="Salary" />
      );

      // preset id=1 is "Salary" in mockIncomePresets
      const salaryChip = screen.getByTestId('preset-chip-1');
      expect(salaryChip).toHaveAttribute('data-selected', 'true');
    });

    it('should not mark other chips as selected when one is selected', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} selectedText="Salary" />
      );

      // preset id=2 is "Bonus"
      const bonusChip = screen.getByTestId('preset-chip-2');
      expect(bonusChip).not.toHaveAttribute('data-selected', 'true');
    });

    it('should not select any chip when selectedText is empty', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} selectedText="" />
      );

      const chips = document.querySelectorAll('[data-selected="true"]');
      expect(chips.length).toBe(0);
    });

    it('should not select any chip when selectedText does not match any preset', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} selectedText="Consulting" />
      );

      const chips = document.querySelectorAll('[data-selected="true"]');
      expect(chips.length).toBe(0);
    });
  });

  describe('manage button', () => {
    it('should render the [+] manage button when presets exist', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} onManageClick={onManageClick} />
      );

      const addButton = screen.getByRole('button', { name: /add preset|manage presets|\+/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should call onManageClick when [+] button is clicked', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} onManageClick={onManageClick} />
      );

      const addButton = screen.getByRole('button', { name: /add preset|manage presets|\+/i });
      fireEvent.click(addButton);

      expect(onManageClick).toHaveBeenCalledTimes(1);
    });

    it('should render [+] button even when no presets exist (empty state)', () => {
      usePresets.mockReturnValue({ data: [], isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} onManageClick={onManageClick} />
      );

      const addButton = screen.getByRole('button', { name: /add preset|manage presets|\+/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should render [+] button when onManageClick is not provided', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} />
      );

      const addButton = screen.getByRole('button', { name: /add preset|manage presets|\+/i });
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show only [+] button when no presets exist', () => {
      usePresets.mockReturnValue({ data: [], isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} onManageClick={onManageClick} />
      );

      // No preset chips should be rendered
      expect(screen.queryByText('Salary')).not.toBeInTheDocument();

      // But manage button should be there
      const addButton = screen.getByRole('button', { name: /add preset|manage presets|\+/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should show only [+] button when presets data is undefined', () => {
      usePresets.mockReturnValue({ data: undefined, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} onManageClick={onManageClick} />
      );

      // No preset chips
      expect(screen.queryByText('Salary')).not.toBeInTheDocument();

      // Manage button present
      const addButton = screen.getByRole('button', { name: /add preset|manage presets|\+/i });
      expect(addButton).toBeInTheDocument();
    });
  });

  describe('scrollable container', () => {
    it('should render a horizontally scrollable container', () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      render(
        <NotePresetButtons type="income" onSelect={onSelect} />
      );

      const container = document.querySelector('[data-testid="preset-buttons-scroll"]');
      expect(container).toBeInTheDocument();
    });
  });

  describe('RTL support', () => {
    it('should render without crashing in RTL context', async () => {
      usePresets.mockReturnValue({ data: mockIncomePresets, isLoading: false });

      // The test/utils render provides LanguageProvider which defaults to Hebrew (RTL)
      render(
        <NotePresetButtons type="income" onSelect={onSelect} />
      );

      await waitFor(() => {
        expect(screen.getByText('Salary')).toBeInTheDocument();
      });
    });
  });
});
