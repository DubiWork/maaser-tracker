/**
 * Tests for HalachicDisclaimer component
 *
 * Covers rendering, collapse toggle, both language versions,
 * and accessibility attributes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { SettingsProvider } from '../contexts/SettingsProvider';
import HalachicDisclaimer from './HalachicDisclaimer';

// Mock settingsDb (required by SettingsProvider)
vi.mock('../services/settingsDb', () => ({
  getSettings: vi.fn(() =>
    Promise.resolve({
      id: 'user-settings',
      language: 'he',
      currency: 'ILS',
      maaserPercentagePeriods: [{ percentage: 10, effectiveFrom: '2020-01-01' }],
      themeMode: 'system',
      updatedAt: null,
    })
  ),
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

function renderWithProviders(ui, { language = 'he' } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  // Set language in localStorage before rendering
  try {
    localStorage.setItem('maaser-tracker-language', language);
  } catch {
    // Ignore if localStorage unavailable
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SettingsProvider>{ui}</SettingsProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

describe('HalachicDisclaimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    try {
      localStorage.clear();
    } catch {
      // Ignore
    }
  });

  describe('rendering', () => {
    it('should render the disclaimer component', () => {
      renderWithProviders(<HalachicDisclaimer />);

      expect(screen.getByTestId('halachic-disclaimer')).toBeInTheDocument();
    });

    it('should render the disclaimer title in Hebrew by default', () => {
      renderWithProviders(<HalachicDisclaimer />);

      expect(screen.getByText('הערה חשובה')).toBeInTheDocument();
    });

    it('should render the disclaimer text in Hebrew by default', () => {
      renderWithProviders(<HalachicDisclaimer />);

      expect(
        screen.getByText(/כלי זה מיועד למעקב בלבד/)
      ).toBeInTheDocument();
    });

    it('should render the disclaimer title in English', () => {
      renderWithProviders(<HalachicDisclaimer />, { language: 'en' });

      expect(screen.getByText('Important Notice')).toBeInTheDocument();
    });

    it('should render the disclaimer text in English', () => {
      renderWithProviders(<HalachicDisclaimer />, { language: 'en' });

      expect(
        screen.getByText(/This tool is for tracking purposes only/)
      ).toBeInTheDocument();
    });

    it('should render as an info-severity alert', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const alert = screen.getByRole('region');
      expect(alert).toBeInTheDocument();
      // MUI Alert with severity="info" adds the class
      expect(alert.closest('.MuiAlert-standardInfo')).toBeInTheDocument();
    });
  });

  describe('collapse toggle', () => {
    it('should show brief text in collapsed default state', () => {
      renderWithProviders(<HalachicDisclaimer />);

      expect(
        screen.getByText(/כלי זה מיועד למעקב בלבד/)
      ).toBeVisible();
    });

    it('should render a toggle button with Read more initially (Hebrew)', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const toggleButton = screen.getByRole('button', { name: /קרא עוד/i });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should show Read more label when collapsed (Hebrew)', () => {
      renderWithProviders(<HalachicDisclaimer />);

      expect(screen.getByText('קרא עוד')).toBeInTheDocument();
    });

    it('should show Show less label after expanding (Hebrew)', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const toggleButton = screen.getByRole('button', { name: /קרא עוד/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText('הסתר')).toBeInTheDocument();
    });

    it('should reveal expanded text when toggle button is clicked', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const toggleButton = screen.getByRole('button', { name: /קרא עוד/i });
      fireEvent.click(toggleButton);

      expect(screen.getByRole('button', { name: /הסתר/i })).toBeInTheDocument();
      expect(screen.getByText(/אפליקציה זו מספקת כלי מעקב/)).toBeInTheDocument();
    });

    it('should collapse again when toggle button is clicked twice', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const toggleButton = screen.getByRole('button', { name: /קרא עוד/i });

      // Expand
      fireEvent.click(toggleButton);
      expect(screen.getByText('הסתר')).toBeInTheDocument();

      // Collapse again
      const collapseButton = screen.getByRole('button', { name: /הסתר/i });
      fireEvent.click(collapseButton);
      expect(screen.getByText('קרא עוד')).toBeInTheDocument();
    });

    it('should toggle correctly in English', () => {
      renderWithProviders(<HalachicDisclaimer />, { language: 'en' });

      // Initially collapsed with Read more button
      expect(screen.getByText('Read more')).toBeInTheDocument();

      // Expand
      const toggleButton = screen.getByRole('button', { name: /Read more/i });
      fireEvent.click(toggleButton);

      expect(screen.getByText('Show less')).toBeInTheDocument();
      expect(screen.getByText(/This application provides tracking tools/)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on the alert region', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label', 'הערה חשובה');
    });

    it('should have aria-expanded false initially and true after expand', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const toggleButton = screen.getByRole('button', { name: /קרא עוד/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggleButton);

      const expandedButton = screen.getByRole('button', { name: /הסתר/i });
      expect(expandedButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have aria-controls linking to collapsible content', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const toggleButton = screen.getByRole('button', { name: /קרא עוד/i });
      expect(toggleButton).toHaveAttribute(
        'aria-controls',
        'halachic-disclaimer-content'
      );
    });

    it('should have a matching id on the collapsible content', () => {
      renderWithProviders(<HalachicDisclaimer />);

      const content = document.getElementById('halachic-disclaimer-content');
      expect(content).toBeInTheDocument();
    });

    it('should have aria-label in English when language is English', () => {
      renderWithProviders(<HalachicDisclaimer />, { language: 'en' });

      const region = screen.getByRole('region');
      expect(region).toHaveAttribute('aria-label', 'Important Notice');
    });
  });

  describe('bilingual content', () => {
    it('should mention consulting a rabbi in brief Hebrew text', () => {
      renderWithProviders(<HalachicDisclaimer />);

      expect(screen.getByText(/יש להתייעץ עם רב מוסמך/)).toBeInTheDocument();
    });

    it('should mention consulting a rabbi in brief English text', () => {
      renderWithProviders(<HalachicDisclaimer />, { language: 'en' });

      const matches = screen.getAllByText(/consult a qualified rabbi/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('should show maaser kesafim details in expanded Hebrew text', () => {
      renderWithProviders(<HalachicDisclaimer />);

      fireEvent.click(screen.getByRole('button', { name: /קרא עוד/i }));

      expect(screen.getByText(/מעשר כספים/)).toBeInTheDocument();
    });

    it('should show maaser kesafim details in expanded English text', () => {
      renderWithProviders(<HalachicDisclaimer />, { language: 'en' });

      fireEvent.click(screen.getByRole('button', { name: /Read more/i }));

      expect(screen.getByText(/ma'aser kesafim/)).toBeInTheDocument();
    });
  });
});
