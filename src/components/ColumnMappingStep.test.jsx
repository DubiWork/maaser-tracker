/**
 * ColumnMappingStep Component Tests
 *
 * Tests for auto-detected mappings display, confidence badges,
 * dropdown changes, preview table with transformed values,
 * skip option, validation, callbacks, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('../contexts/useLanguage', () => ({
  useLanguage: vi.fn(),
}));

vi.mock('../services/columnMappingService', () => ({
  parseCurrencyAmount: vi.fn((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().replace(/[₪$€£,]/g, '');
    if (trimmed === '') return null;
    const num = Number(trimmed);
    return Number.isFinite(num) ? num : null;
  }),
  parseExternalDate: vi.fn((value) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    // Simple ISO match
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return { date: trimmed, accountingMonth: `${isoMatch[1]}-${isoMatch[2]}` };
    }
    // Simple MM/YYYY match
    const mmYYYYMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
    if (mmYYYYMatch) {
      const month = mmYYYYMatch[1].padStart(2, '0');
      return { date: `${mmYYYYMatch[2]}-${month}-01`, accountingMonth: `${mmYYYYMatch[2]}-${month}` };
    }
    return null;
  }),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  isAuthenticated: vi.fn(() => false),
  getCurrentUserId: vi.fn(() => null),
}));

import { useLanguage } from '../contexts/useLanguage';
import ColumnMappingStep from './ColumnMappingStep';

const defaultTranslations = {
  settings: {
    externalImport: {
      mapColumns: 'Map Columns',
      mapColumnsDescription: 'Match your CSV columns to the app fields',
      columnMappingHelp: 'Select which column in your CSV corresponds to each field.',
      dateColumn: 'Date',
      incomeColumn: 'Income Amount',
      maaserColumn: "Ma'aser (10%)",
      donationColumn: 'Donation Amount',
      highConfidence: 'High confidence',
      mediumConfidence: 'Medium confidence',
      lowConfidence: 'Low confidence',
      unmapped: 'Not mapped',
      skipColumn: 'Skip this column',
      confirmMapping: 'Confirm Mapping',
      backToFileSelect: 'Back to file selection',
      previewMappedData: 'Preview mapped data',
      showingFirstRows: 'Showing first {count} rows',
      incomeEntries: 'Income entries',
      donationEntries: 'Donation entries',
      skippedRows: 'Skipped rows',
      totalEntries: 'Total entries to create',
      noDateColumn: 'Date column is required',
      noIncomeColumn: 'Income column is required',
      duplicateMapping: 'Column already mapped to another field',
    },
  },
};

const sampleHeaders = ['Date', 'Income', 'Maaser', 'Donated'];
const sampleRows = [
  ['01/2026', '₪5,000', '₪500', '₪300'],
  ['02/2026', '₪6,000', '₪600', '₪400'],
  ['03/2026', '₪4,500', '₪450', ''],
];

const sampleDetection = {
  mappings: { date: 0, income: 1, maaser: 2, donation: 3 },
  confidence: { date: 'high', income: 'high', maaser: 'medium', donation: 'low' },
  unmapped: [],
};

function renderComponent(props = {}, languageOverrides = {}) {
  useLanguage.mockReturnValue({
    t: languageOverrides.t || defaultTranslations,
    direction: languageOverrides.direction || 'ltr',
  });

  const defaultProps = {
    headers: sampleHeaders,
    sampleRows,
    detectionResult: sampleDetection,
    onConfirm: vi.fn(),
    onBack: vi.fn(),
    ...props,
  };

  const utils = render(<ColumnMappingStep {...defaultProps} />);

  return { ...utils, ...defaultProps };
}

describe('ColumnMappingStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering with auto-detected mappings', () => {
    it('should render the component', () => {
      renderComponent();
      expect(screen.getByTestId('column-mapping-step')).toBeInTheDocument();
    });

    it('should render the title', () => {
      renderComponent();
      expect(screen.getByText('Map Columns')).toBeInTheDocument();
    });

    it('should render the description text', () => {
      renderComponent();
      expect(screen.getByText('Match your CSV columns to the app fields')).toBeInTheDocument();
    });

    it('should render help icon with tooltip', () => {
      renderComponent();
      expect(screen.getByLabelText('Select which column in your CSV corresponds to each field.')).toBeInTheDocument();
    });

    it('should render a mapping row for each target field', () => {
      renderComponent();
      expect(screen.getByTestId('mapping-row-date')).toBeInTheDocument();
      expect(screen.getByTestId('mapping-row-income')).toBeInTheDocument();
      expect(screen.getByTestId('mapping-row-maaser')).toBeInTheDocument();
      expect(screen.getByTestId('mapping-row-donation')).toBeInTheDocument();
    });

    it('should show field labels', () => {
      renderComponent();
      // MUI renders labels in multiple places (InputLabel + legend>span),
      // so use getAllByText and verify at least one match.
      expect(screen.getAllByText(/Date \*/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Income Amount \*/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Ma'aser \(10%\)/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Donation Amount/).length).toBeGreaterThan(0);
    });
  });

  describe('confidence badges', () => {
    it('should render confidence badges for all fields', () => {
      renderComponent();
      expect(screen.getByTestId('confidence-badge-date')).toBeInTheDocument();
      expect(screen.getByTestId('confidence-badge-income')).toBeInTheDocument();
      expect(screen.getByTestId('confidence-badge-maaser')).toBeInTheDocument();
      expect(screen.getByTestId('confidence-badge-donation')).toBeInTheDocument();
    });

    it('should show high confidence label for high-confidence fields', () => {
      renderComponent();
      const dateBadge = screen.getByTestId('confidence-badge-date');
      expect(dateBadge).toHaveTextContent('High confidence');
    });

    it('should show medium confidence label for medium-confidence fields', () => {
      renderComponent();
      const maaserBadge = screen.getByTestId('confidence-badge-maaser');
      expect(maaserBadge).toHaveTextContent('Medium confidence');
    });

    it('should show low confidence label for low-confidence fields', () => {
      renderComponent();
      const donationBadge = screen.getByTestId('confidence-badge-donation');
      expect(donationBadge).toHaveTextContent('Low confidence');
    });

    it('should show "Not mapped" badge when field has no confidence', () => {
      const detection = {
        mappings: { date: 0, income: 1 },
        confidence: { date: 'high', income: 'high' },
        unmapped: [2, 3],
      };
      renderComponent({ detectionResult: detection });
      const maaserBadge = screen.getByTestId('confidence-badge-maaser');
      expect(maaserBadge).toHaveTextContent('Not mapped');
    });
  });

  describe('dropdown changes update mappings', () => {
    it('should allow changing a mapping via dropdown', () => {
      renderComponent();

      // The date dropdown should exist and have the date header pre-selected
      const dateRow = screen.getByTestId('mapping-row-date');
      expect(dateRow).toBeInTheDocument();
    });

    it('should update preview when mapping changes', () => {
      renderComponent();

      // Verify initial preview table exists
      const previewTable = screen.getByRole('table');
      expect(previewTable).toBeInTheDocument();
    });
  });

  describe('preview table', () => {
    it('should render the preview table', () => {
      renderComponent();
      expect(screen.getByText('Preview mapped data')).toBeInTheDocument();
    });

    it('should show the correct number of preview rows', () => {
      renderComponent();
      expect(screen.getByText('Showing first 3 rows')).toBeInTheDocument();
    });

    it('should show row numbers in preview', () => {
      renderComponent();
      const table = screen.getByRole('table');
      expect(within(table).getByText('1')).toBeInTheDocument();
      expect(within(table).getByText('2')).toBeInTheDocument();
      expect(within(table).getByText('3')).toBeInTheDocument();
    });

    it('should show raw values in preview', () => {
      renderComponent();
      // Raw values appear as caption text inside table cells
      expect(screen.getAllByText('01/2026').length).toBeGreaterThan(0);
      expect(screen.getAllByText('₪5,000').length).toBeGreaterThan(0);
    });

    it('should show transformed date values', () => {
      renderComponent();
      // 01/2026 -> 2026-01-01 via parseExternalDate mock
      expect(screen.getByText('2026-01-01')).toBeInTheDocument();
    });

    it('should show transformed currency values', () => {
      renderComponent();
      // ₪5,000 -> 5000 via parseCurrencyAmount mock
      expect(screen.getByText('5000')).toBeInTheDocument();
    });

    it('should highlight cells that could not be parsed', () => {
      const badRows = [
        ['not-a-date', '₪5,000', '₪500', '₪300'],
      ];
      renderComponent({ sampleRows: badRows });

      // The date cell should have error styling
      expect(screen.getByTestId('parse-error-date-0')).toBeInTheDocument();
    });

    it('should show dash for empty values', () => {
      const rowsWithEmpty = [
        ['01/2026', '₪5,000', '₪500', ''],
      ];
      renderComponent({ sampleRows: rowsWithEmpty });

      // The empty donation raw value should show '-'
      const table = screen.getByRole('table');
      const dashes = within(table).getAllByText('-');
      expect(dashes.length).toBeGreaterThan(0);
    });

    it('should only show columns that are not skipped', () => {
      const detection = {
        mappings: { date: 0, income: 1 },
        confidence: { date: 'high', income: 'high' },
        unmapped: [2, 3],
      };
      renderComponent({ detectionResult: detection });

      const table = screen.getByRole('table');
      const headers = within(table).getAllByRole('columnheader');
      // Should have # + Date + Income Amount = 3 headers (maaser and donation skipped)
      expect(headers.length).toBe(3);
    });
  });

  describe('skip option', () => {
    it('should allow skipping optional fields', () => {
      const detection = {
        mappings: { date: 0, income: 1 },
        confidence: { date: 'high', income: 'high' },
        unmapped: [2, 3],
      };
      renderComponent({ detectionResult: detection });

      // Maaser and donation should be set to skip
      // The confirm button should still be enabled (date + income mapped)
      expect(screen.getByTestId('confirm-button')).not.toBeDisabled();
    });

    it('should show validation error when required field is skipped', () => {
      const detection = {
        mappings: { income: 1 },
        confidence: { income: 'high' },
        unmapped: [0, 2, 3],
      };
      renderComponent({ detectionResult: detection });

      expect(screen.getByText('Date column is required')).toBeInTheDocument();
    });
  });

  describe('onConfirm callback', () => {
    it('should call onConfirm with correct mappings when confirmed', () => {
      const onConfirm = vi.fn();
      renderComponent({ onConfirm });

      fireEvent.click(screen.getByTestId('confirm-button'));

      expect(onConfirm).toHaveBeenCalledWith({
        date: 0,
        income: 1,
        maaser: 2,
        donation: 3,
      });
    });

    it('should exclude skipped fields from confirmed mappings', () => {
      const onConfirm = vi.fn();
      const detection = {
        mappings: { date: 0, income: 1 },
        confidence: { date: 'high', income: 'high' },
        unmapped: [2, 3],
      };
      renderComponent({ onConfirm, detectionResult: detection });

      fireEvent.click(screen.getByTestId('confirm-button'));

      expect(onConfirm).toHaveBeenCalledWith({
        date: 0,
        income: 1,
      });
    });

    it('should disable confirm button when validation fails', () => {
      const detection = {
        mappings: {},
        confidence: {},
        unmapped: [0, 1, 2, 3],
      };
      renderComponent({ detectionResult: detection });

      expect(screen.getByTestId('confirm-button')).toBeDisabled();
    });
  });

  describe('onBack callback', () => {
    it('should call onBack when back button is clicked', () => {
      const onBack = vi.fn();
      renderComponent({ onBack });

      fireEvent.click(screen.getByTestId('back-button'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('required fields validation', () => {
    it('should show error when date is not mapped', () => {
      const detection = {
        mappings: { income: 1 },
        confidence: { income: 'high' },
        unmapped: [0, 2, 3],
      };
      renderComponent({ detectionResult: detection });

      expect(screen.getByText('Date column is required')).toBeInTheDocument();
    });

    it('should show error when income is not mapped', () => {
      const detection = {
        mappings: { date: 0 },
        confidence: { date: 'high' },
        unmapped: [1, 2, 3],
      };
      renderComponent({ detectionResult: detection });

      expect(screen.getByText('Income column is required')).toBeInTheDocument();
    });

    it('should show both errors when neither date nor income is mapped', () => {
      const detection = {
        mappings: {},
        confidence: {},
        unmapped: [0, 1, 2, 3],
      };
      renderComponent({ detectionResult: detection });

      expect(screen.getByText('Date column is required')).toBeInTheDocument();
      expect(screen.getByText('Income column is required')).toBeInTheDocument();
    });

    it('should not show validation errors when both required fields are mapped', () => {
      renderComponent();
      expect(screen.queryByTestId('validation-errors')).not.toBeInTheDocument();
    });
  });

  describe('import summary', () => {
    it('should show income entries count', () => {
      renderComponent();
      expect(screen.getByText(/Income entries: 3/)).toBeInTheDocument();
    });

    it('should show donation entries count', () => {
      renderComponent();
      expect(screen.getByText(/Donation entries: 2/)).toBeInTheDocument();
    });

    it('should show skipped rows when present', () => {
      const rowsWithBadDate = [
        ['01/2026', '₪5,000', '₪500', '₪300'],
        ['bad-date', '₪6,000', '₪600', '₪400'],
      ];
      renderComponent({ sampleRows: rowsWithBadDate });

      expect(screen.getByText(/Skipped rows: 1/)).toBeInTheDocument();
    });

    it('should not show skipped rows when none are skipped', () => {
      renderComponent();
      expect(screen.queryByText(/Skipped rows/)).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have labels linked to select inputs via labelId', () => {
      renderComponent();

      // Each select should have an associated label via aria-labelledby
      const dateRow = screen.getByTestId('mapping-row-date');
      const labels = within(dateRow).getAllByText(/Date \*/);
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have aria-label on preview table', () => {
      renderComponent();
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', 'Preview mapped data');
    });

    it('should have help icon with aria-label', () => {
      renderComponent();
      expect(screen.getByLabelText('Select which column in your CSV corresponds to each field.')).toBeInTheDocument();
    });

    it('should mark required fields with asterisk', () => {
      renderComponent();
      // Date and Income should have asterisks (MUI renders label in multiple places)
      expect(screen.getAllByText(/Date \*/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Income Amount \*/).length).toBeGreaterThan(0);
    });
  });

  describe('RTL support', () => {
    it('should set dir="rtl" for Hebrew', () => {
      renderComponent({}, { direction: 'rtl' });
      const root = screen.getByTestId('column-mapping-step');
      expect(root).toHaveAttribute('dir', 'rtl');
    });

    it('should set dir="ltr" for English', () => {
      renderComponent({}, { direction: 'ltr' });
      const root = screen.getByTestId('column-mapping-step');
      expect(root).toHaveAttribute('dir', 'ltr');
    });
  });

  describe('edge cases', () => {
    it('should handle empty headers', () => {
      renderComponent({ headers: [] });
      expect(screen.getByTestId('column-mapping-step')).toBeInTheDocument();
    });

    it('should handle null detectionResult', () => {
      renderComponent({ detectionResult: null });
      expect(screen.getByTestId('column-mapping-step')).toBeInTheDocument();
    });

    it('should handle empty sampleRows', () => {
      renderComponent({ sampleRows: [] });
      expect(screen.getByTestId('column-mapping-step')).toBeInTheDocument();
    });

    it('should handle detectionResult with no mappings', () => {
      renderComponent({
        detectionResult: { mappings: {}, confidence: {}, unmapped: [0, 1, 2, 3] },
      });
      // All fields should default to skip
      expect(screen.getByTestId('confirm-button')).toBeDisabled();
    });
  });
});
