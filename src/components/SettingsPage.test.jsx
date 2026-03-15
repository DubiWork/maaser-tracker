/**
 * Tests for SettingsPage and SettingsButton components
 *
 * Covers all four sections (General, Ma'aser Calculation, Appearance, About),
 * navigation, auto-save pattern, confirmation dialog, percentage history,
 * bilingual support, and accessibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { SettingsProvider } from '../contexts/SettingsProvider';
import SettingsPage from './SettingsPage';
import SettingsButton from './SettingsButton';

// Mock IndexedDB settings service
vi.mock('../services/settingsDb', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  resetSettings: vi.fn(),
  DEFAULT_SETTINGS: {
    id: 'user-settings',
    language: 'he',
    currency: 'ILS',
    maaserPercentagePeriods: [{ percentage: 10, effectiveFrom: '2020-01-01' }],
    themeMode: 'system',
    updatedAt: null,
  },
  SUPPORTED_CURRENCIES: ['ILS', 'USD', 'EUR', 'GBP'],
  SUPPORTED_THEME_MODES: ['light', 'dark', 'system'],
  SUPPORTED_LANGUAGES: ['he', 'en'],
  validateSettings: vi.fn(() => ({ valid: true, errors: [] })),
}));

import { getSettings, updateSettings, DEFAULT_SETTINGS } from '../services/settingsDb';

// Helper to render with required providers
// Pass customSettings to override the default settings mock
function renderWithProviders(ui, { customSettings } = {}) {
  // Only set the mock if not already customized for this test
  if (customSettings) {
    getSettings.mockResolvedValue({ ...customSettings });
  } else if (!getSettings.mock.results.length || getSettings.mock.results[getSettings.mock.results.length - 1]?.type !== 'return') {
    getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
  }

  updateSettings.mockImplementation(async (partial) => ({
    ...DEFAULT_SETTINGS,
    ...partial,
    updatedAt: new Date().toISOString(),
  }));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SettingsProvider>
          {ui}
        </SettingsProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

// Helper: wait for settings to load (loading spinner disappears)
async function waitForSettingsLoad() {
  await waitFor(() => {
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
}

describe('SettingsButton', () => {
  it('should render a settings gear icon button', () => {
    renderWithProviders(<SettingsButton onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: /הגדרות/i });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    renderWithProviders(<SettingsButton onClick={handleClick} />);

    const button = screen.getByRole('button', { name: /הגדרות/i });
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should have proper aria-label', () => {
    renderWithProviders(<SettingsButton onClick={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'הגדרות');
  });
});

describe('SettingsPage', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    updateSettings.mockImplementation(async (partial) => ({
      ...DEFAULT_SETTINGS,
      ...partial,
      updatedAt: new Date().toISOString(),
    }));
  });

  describe('header and navigation', () => {
    it('should render the settings title', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // Hebrew default
      expect(screen.getByRole('heading', { name: /הגדרות/i })).toBeInTheDocument();
    });

    it('should render a back button', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const backButton = screen.getByRole('button', { name: /חזרה/i });
      expect(backButton).toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const backButton = screen.getByRole('button', { name: /חזרה/i });
      fireEvent.click(backButton);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should show loading spinner while settings are loading', () => {
      // Make getSettings never resolve
      getSettings.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<SettingsPage onBack={onBack} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('General section', () => {
    it('should render General section heading', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByRole('heading', { name: /כללי/i })).toBeInTheDocument();
    });

    it('should render language selector with current value', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // The select should have language label
      expect(screen.getByLabelText(/שפה/i)).toBeInTheDocument();
    });

    it('should render currency selector with current value', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByLabelText(/מטבע/i)).toBeInTheDocument();
    });

    it('should call updateLanguage when language is changed', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // Open language select
      const languageSelect = screen.getByLabelText(/שפה/i);
      fireEvent.mouseDown(languageSelect);

      // Select English
      const englishOption = screen.getByRole('option', { name: /אנגלית/i });
      fireEvent.click(englishOption);

      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalled();
      });
    });

    it('should call updateCurrency when currency is changed', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // Open currency select
      const currencySelect = screen.getByLabelText(/מטבע/i);
      fireEvent.mouseDown(currencySelect);

      // Select USD
      const usdOption = screen.getByRole('option', { name: /דולר אמריקאי/i });
      fireEvent.click(usdOption);

      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalled();
      });
    });

    it('should show currency symbol preview in options', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // Open currency select
      const currencySelect = screen.getByLabelText(/מטבע/i);
      fireEvent.mouseDown(currencySelect);

      // Check symbols are present in options
      const listbox = screen.getByRole('listbox');
      expect(within(listbox).getByText(/\(\$\)/)).toBeInTheDocument();
    });
  });

  describe('Ma\'aser Calculation section', () => {
    it('should render Ma\'aser Calculation section heading', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByRole('heading', { name: /חישוב מעשר/i })).toBeInTheDocument();
    });

    it('should display current percentage prominently', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText(/אחוז נוכחי/i)).toBeInTheDocument();
    });

    it('should render percentage slider', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByRole('slider')).toBeInTheDocument();
    });

    it('should render numeric percentage input field', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      expect(input).toBeInTheDocument();
    });

    it('should render effective date picker', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const dateInput = screen.getByLabelText(/בתוקף מתאריך/i);
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    it('should render update button', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByRole('button', { name: /עדכן אחוז/i })).toBeInTheDocument();
    });

    it('should show validation error for out-of-range percentage', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '150' } });

      expect(screen.getByText(/האחוז חייב להיות בין 1 ל-100/i)).toBeInTheDocument();
    });

    it('should show validation error for zero percentage', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '0' } });

      expect(screen.getByText(/האחוז חייב להיות בין 1 ל-100/i)).toBeInTheDocument();
    });

    it('should clear error when valid percentage entered', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });

      // Enter invalid value
      fireEvent.change(input, { target: { value: '150' } });
      expect(screen.getByText(/האחוז חייב להיות בין 1 ל-100/i)).toBeInTheDocument();

      // Enter valid value
      fireEvent.change(input, { target: { value: '15' } });
      expect(screen.queryByText(/האחוז חייב להיות בין 1 ל-100/i)).not.toBeInTheDocument();
    });

    it('should open confirmation dialog when Update is clicked', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // Change the percentage to something different from current
      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '15' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      fireEvent.click(updateButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/שינוי אחוז מעשר/i)).toBeInTheDocument();
    });

    it('should close confirmation dialog on cancel', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '15' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      fireEvent.click(updateButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /ביטול/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should save percentage on confirm', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '15' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      fireEvent.click(updateButton);

      // Click confirm in dialog
      const confirmButton = screen.getByRole('button', { name: /אישור/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalled();
      });
    });

    it('should display percentage history in accordion', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByText(/היסטוריית אחוזים/i)).toBeInTheDocument();
    });

    it('should show percentage periods when accordion is expanded', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // Click to expand accordion
      const accordionHeader = screen.getByText(/היסטוריית אחוזים/i);
      fireEvent.click(accordionHeader);

      // Should show the default period label (10% from a formatted date)
      await waitFor(() => {
        expect(screen.getByText(/10% החל מ/i)).toBeInTheDocument();
      });
    });

    it('should disable update button when percentage equals current', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // Set to the same as current (10)
      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '10' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      expect(updateButton).toBeDisabled();
    });

    it('should disable update button when percentage has error', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '999' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      expect(updateButton).toBeDisabled();
    });

    it('should handle empty percentage input gracefully', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      expect(updateButton).toBeDisabled();
    });

    it('should not open dialog when clicking update with validation error', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '150' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      fireEvent.click(updateButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should show confirmation message with percentage and date', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '20' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      fireEvent.click(updateButton);

      // Dialog should mention 20%
      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/20%/)).toBeInTheDocument();
    });

    it('should sort percentage history in reverse chronological order', async () => {
      const customSettings = {
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: [
          { percentage: 10, effectiveFrom: '2020-01-01' },
          { percentage: 15, effectiveFrom: '2023-06-01' },
          { percentage: 12, effectiveFrom: '2021-03-15' },
        ],
      };

      renderWithProviders(<SettingsPage onBack={onBack} />, { customSettings });
      await waitForSettingsLoad();

      // Expand accordion
      const accordionHeader = screen.getByText(/היסטוריית אחוזים/i);
      fireEvent.click(accordionHeader);

      await waitFor(() => {
        // All three periods should be visible
        expect(screen.getByText(/15% החל מ/i)).toBeInTheDocument();
        expect(screen.getByText(/12% החל מ/i)).toBeInTheDocument();
        expect(screen.getByText(/10% החל מ/i)).toBeInTheDocument();
      });

      // Get all period texts to verify order
      const periodTexts = screen.getAllByText(/% החל מ/i);
      // First should be 2023 (15%), last should be 2020 (10%)
      expect(periodTexts[0]).toHaveTextContent('15%');
      expect(periodTexts[1]).toHaveTextContent('12%');
      expect(periodTexts[2]).toHaveTextContent('10%');
    });
  });

  describe('Appearance section', () => {
    it('should render Appearance section heading', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByRole('heading', { name: /מראה/i })).toBeInTheDocument();
    });

    it('should render theme toggle buttons', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByRole('button', { name: /בהיר/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /כהה/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ברירת מחדל של המערכת/i })).toBeInTheDocument();
    });

    it('should have system theme selected by default', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const systemButton = screen.getByRole('button', { name: /ברירת מחדל של המערכת/i });
      expect(systemButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should call updateThemeMode when theme is changed', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const darkButton = screen.getByRole('button', { name: /כהה/i });
      fireEvent.click(darkButton);

      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalled();
      });
    });

    it('should not deselect current theme when clicking the same button', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const systemButton = screen.getByRole('button', { name: /ברירת מחדל של המערכת/i });
      fireEvent.click(systemButton);

      // Should still be pressed (no null mode)
      expect(systemButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('About section', () => {
    it('should render About section heading', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByRole('heading', { name: /אודות/i })).toBeInTheDocument();
    });

    it('should display app name', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // Hebrew app name
      expect(screen.getByText(/מעקב מעשר/i)).toBeInTheDocument();
    });

    it('should display version number', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByText(/1\.2\.0/)).toBeInTheDocument();
    });

    it('should have a privacy policy link', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const privacyLink = screen.getByRole('button', { name: /מדיניות פרטיות/i });
      expect(privacyLink).toBeInTheDocument();
    });

    it('should navigate to privacy policy on click', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const privacyLink = screen.getByRole('button', { name: /מדיניות פרטיות/i });
      fireEvent.click(privacyLink);

      expect(window.location.hash).toBe('#/privacy');

      // Clean up hash
      window.location.hash = '';
    });

    it('should have a GitHub source code link', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const githubLink = screen.getByRole('link', { name: /קוד מקור/i });
      expect(githubLink).toBeInTheDocument();
      expect(githubLink).toHaveAttribute('href', 'https://github.com/DubiWork/maaser-tracker');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // h1: Settings title
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent(/הגדרות/i);

      // h2: Section headings
      const h2s = screen.getAllByRole('heading', { level: 2 });
      expect(h2s.length).toBe(4);
    });

    it('should have aria-label on back button', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const backButton = screen.getByRole('button', { name: /חזרה/i });
      expect(backButton).toHaveAttribute('aria-label', 'חזרה');
    });

    it('should have aria-label on slider', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-label', 'אחוז חדש');
    });

    it('should have aria-label on theme toggle group', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const group = screen.getByRole('group', { name: /ערכת נושא/i });
      expect(group).toBeInTheDocument();
    });

    it('should have aria-label on current percentage display', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const percentageDisplay = screen.getByLabelText(/אחוז נוכחי: 10%/i);
      expect(percentageDisplay).toBeInTheDocument();
    });

    it('should have labeled form controls', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByLabelText(/שפה/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/מטבע/i)).toBeInTheDocument();
    });

    it('should have labeled confirmation dialog', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '20' } });

      const updateButton = screen.getByRole('button', { name: /עדכן אחוז/i });
      fireEvent.click(updateButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-percentage-dialog-title');
    });
  });

  describe('all sections rendered', () => {
    it('should render all four section headings', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      expect(screen.getByRole('heading', { name: /כללי/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /חישוב מעשר/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /מראה/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /אודות/i })).toBeInTheDocument();
    });
  });

  describe('responsive and no hardcoded strings', () => {
    it('should not contain hardcoded English user-facing strings in Hebrew mode', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      // All visible text should be in Hebrew (default language)
      // Check that section headings are Hebrew
      expect(screen.getByRole('heading', { name: 'כללי' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'חישוב מעשר' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'מראה' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'אודות' })).toBeInTheDocument();
    });
  });

  describe('percentage history with no periods', () => {
    it('should not render accordion when no periods exist', async () => {
      const customSettings = {
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: [],
      };

      renderWithProviders(<SettingsPage onBack={onBack} />, { customSettings });
      await waitForSettingsLoad();

      expect(screen.queryByText(/היסטוריית אחוזים/i)).not.toBeInTheDocument();
    });
  });

  describe('slider and input sync', () => {
    it('should update slider value when input changes', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const input = screen.getByRole('spinbutton', { name: /אחוז חדש/i });
      fireEvent.change(input, { target: { value: '25' } });

      // Slider should now have value 25
      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '25');
    });
  });

  describe('date picker', () => {
    it('should default effective date to today', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const dateInput = screen.getByLabelText(/בתוקף מתאריך/i);
      const today = new Date();
      const expectedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(dateInput).toHaveValue(expectedDate);
    });

    it('should allow changing the effective date', async () => {
      renderWithProviders(<SettingsPage onBack={onBack} />);
      await waitForSettingsLoad();

      const dateInput = screen.getByLabelText(/בתוקף מתאריך/i);
      fireEvent.change(dateInput, { target: { value: '2025-06-15' } });

      expect(dateInput).toHaveValue('2025-06-15');
    });
  });
});
