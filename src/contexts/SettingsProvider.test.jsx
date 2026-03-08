/**
 * Tests for SettingsProvider component
 *
 * Covers: loading from IndexedDB, default settings, mutators (language,
 * currency, theme, ma'aser percentage), derived helpers, localStorage sync,
 * LanguageProvider integration, formatCurrency, and useSettings hook guard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { SettingsProvider } from './SettingsProvider';
import { LanguageProvider } from './LanguageProvider';
import { useSettings } from '../hooks/useSettings';
import { useLanguage } from './useLanguage';

// Mock the settingsDb service
vi.mock('../services/settingsDb', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  DEFAULT_SETTINGS: {
    id: 'user-settings',
    language: 'he',
    currency: 'ILS',
    maaserPercentagePeriods: [{ percentage: 10, effectiveFrom: '2020-01-01' }],
    themeMode: 'system',
    updatedAt: null,
  },
}));

import { getSettings, updateSettings, DEFAULT_SETTINGS } from '../services/settingsDb';

// Helper: render with both LanguageProvider and SettingsProvider
function renderWithProviders(ui) {
  return render(
    <LanguageProvider>
      <SettingsProvider>
        {ui}
      </SettingsProvider>
    </LanguageProvider>
  );
}

// Test consumer that displays settings state
function TestConsumer() {
  const {
    settings,
    isLoading,
    getCurrentMaaserPercentage,
    getMaaserPercentageForDate,
    formatCurrency,
  } = useSettings();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="language">{settings.language}</div>
      <div data-testid="currency">{settings.currency}</div>
      <div data-testid="themeMode">{settings.themeMode}</div>
      <div data-testid="periods">{JSON.stringify(settings.maaserPercentagePeriods)}</div>
      <div data-testid="currentPct">{getCurrentMaaserPercentage()}</div>
      <div data-testid="datePct">{getMaaserPercentageForDate('2025-06-15')}</div>
      <div data-testid="formatted">{formatCurrency(1000)}</div>
    </div>
  );
}

// Test consumer for language sync verification
function LanguageSyncConsumer() {
  const { settings, isLoading } = useSettings();
  const { language } = useLanguage();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="settings-language">{settings.language}</div>
      <div data-testid="context-language">{language}</div>
    </div>
  );
}

// Test consumer for mutators
function MutatorConsumer() {
  const {
    settings,
    isLoading,
    updateLanguage,
    updateCurrency,
    updateThemeMode,
    updateMaaserPercentage,
  } = useSettings();

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="language">{settings.language}</div>
      <div data-testid="currency">{settings.currency}</div>
      <div data-testid="themeMode">{settings.themeMode}</div>
      <div data-testid="periods">{JSON.stringify(settings.maaserPercentagePeriods)}</div>
      <button data-testid="btn-lang" onClick={() => updateLanguage('en')}>Lang</button>
      <button data-testid="btn-currency" onClick={() => updateCurrency('USD')}>Currency</button>
      <button data-testid="btn-theme" onClick={() => updateThemeMode('dark')}>Theme</button>
      <button data-testid="btn-pct" onClick={() => updateMaaserPercentage(15, '2026-06-01')}>Pct</button>
    </div>
  );
}

describe('SettingsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default mock: return default settings
    getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    updateSettings.mockImplementation(async (partial) => ({
      ...DEFAULT_SETTINGS,
      ...partial,
      updatedAt: new Date().toISOString(),
    }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('rendering', () => {
    it('should render children', async () => {
      renderWithProviders(<div data-testid="child">Child</div>);

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should show loading state initially', async () => {
      // Make getSettings hang to observe loading state
      let resolveSettings;
      getSettings.mockReturnValue(new Promise((resolve) => {
        resolveSettings = resolve;
      }));

      renderWithProviders(<TestConsumer />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Resolve to clean up
      await act(async () => {
        resolveSettings({ ...DEFAULT_SETTINGS });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });

    it('should stop loading after settings are fetched', async () => {
      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('loading from IndexedDB', () => {
    it('should use default settings when no stored settings exist', async () => {
      getSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('language')).toHaveTextContent('he');
        expect(screen.getByTestId('currency')).toHaveTextContent('ILS');
        expect(screen.getByTestId('themeMode')).toHaveTextContent('system');
      });
    });

    it('should use stored settings when they exist', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        language: 'en',
        currency: 'USD',
        themeMode: 'dark',
      });

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('language')).toHaveTextContent('en');
        expect(screen.getByTestId('currency')).toHaveTextContent('USD');
        expect(screen.getByTestId('themeMode')).toHaveTextContent('dark');
      });
    });

    it('should call getSettings on mount', async () => {
      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        expect(getSettings).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle getSettings failure gracefully', async () => {
      getSettings.mockRejectedValue(new Error('DB error'));

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        // Should still render with defaults and not crash
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('language')).toHaveTextContent('he');
      });
    });
  });

  describe('language sync on load', () => {
    it('should sync loaded language to LanguageProvider', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        language: 'en',
      });

      renderWithProviders(<LanguageSyncConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('settings-language')).toHaveTextContent('en');
        expect(screen.getByTestId('context-language')).toHaveTextContent('en');
      });
    });

    it('should sync Hebrew language to LanguageProvider', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        language: 'he',
      });

      renderWithProviders(<LanguageSyncConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('settings-language')).toHaveTextContent('he');
        expect(screen.getByTestId('context-language')).toHaveTextContent('he');
      });
    });
  });

  describe('updateLanguage', () => {
    it('should update settings language', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        language: 'en',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('language')).toHaveTextContent('he');
      });

      await act(async () => {
        screen.getByTestId('btn-lang').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('language')).toHaveTextContent('en');
      });
    });

    it('should persist language to IndexedDB', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        language: 'en',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-lang').click();
      });

      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalledWith({ language: 'en' });
      });
    });

    it('should sync language to localStorage', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        language: 'en',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-lang').click();
      });

      expect(localStorage.getItem('maaser-tracker-language')).toBe('en');
    });

    it('should sync language to LanguageProvider', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        language: 'en',
        updatedAt: new Date().toISOString(),
      });

      function LangAndMutator() {
        const { updateLanguage, isLoading } = useSettings();
        const { language } = useLanguage();

        if (isLoading) return <div data-testid="loading">Loading</div>;

        return (
          <div>
            <div data-testid="ctx-lang">{language}</div>
            <button data-testid="btn" onClick={() => updateLanguage('en')}>Go</button>
          </div>
        );
      }

      renderWithProviders(<LangAndMutator />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('ctx-lang')).toHaveTextContent('en');
      });
    });
  });

  describe('updateCurrency', () => {
    it('should update settings currency', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('currency')).toHaveTextContent('ILS');
      });

      await act(async () => {
        screen.getByTestId('btn-currency').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('currency')).toHaveTextContent('USD');
      });
    });

    it('should persist currency to IndexedDB', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-currency').click();
      });

      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalledWith({ currency: 'USD' });
      });
    });

    it('should NOT sync currency to localStorage', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-currency').click();
      });

      // Currency should NOT be in localStorage (only IndexedDB)
      expect(localStorage.getItem('maaser-tracker-currency')).toBeNull();
    });
  });

  describe('updateThemeMode', () => {
    it('should update settings themeMode', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        themeMode: 'dark',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('themeMode')).toHaveTextContent('system');
      });

      await act(async () => {
        screen.getByTestId('btn-theme').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('themeMode')).toHaveTextContent('dark');
      });
    });

    it('should persist themeMode to IndexedDB', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        themeMode: 'dark',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-theme').click();
      });

      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalledWith({ themeMode: 'dark' });
      });
    });

    it('should sync themeMode to localStorage', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        themeMode: 'dark',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-theme').click();
      });

      expect(localStorage.getItem('maaser-tracker-theme')).toBe('dark');
    });
  });

  describe('updateMaaserPercentage', () => {
    it('should append a new period to maaserPercentagePeriods', async () => {
      const expectedPeriods = [
        { percentage: 10, effectiveFrom: '2020-01-01' },
        { percentage: 15, effectiveFrom: '2026-06-01' },
      ];

      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: expectedPeriods,
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-pct').click();
      });

      await waitFor(() => {
        const periods = JSON.parse(screen.getByTestId('periods').textContent);
        expect(periods).toHaveLength(2);
        expect(periods[1].percentage).toBe(15);
        expect(periods[1].effectiveFrom).toBe('2026-06-01');
      });
    });

    it('should persist updated periods to IndexedDB', async () => {
      const expectedPeriods = [
        { percentage: 10, effectiveFrom: '2020-01-01' },
        { percentage: 15, effectiveFrom: '2026-06-01' },
      ];

      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: expectedPeriods,
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-pct').click();
      });

      await waitFor(() => {
        expect(updateSettings).toHaveBeenCalledWith({
          maaserPercentagePeriods: expectedPeriods,
        });
      });
    });

    it('should not mutate existing periods', async () => {
      const originalPeriods = [{ percentage: 10, effectiveFrom: '2020-01-01' }];
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: originalPeriods,
      });

      const expectedPeriods = [
        { percentage: 10, effectiveFrom: '2020-01-01' },
        { percentage: 15, effectiveFrom: '2026-06-01' },
      ];

      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: expectedPeriods,
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-pct').click();
      });

      // Original array should not be mutated
      expect(originalPeriods).toHaveLength(1);
    });
  });

  describe('derived helpers', () => {
    it('should return current ma\'aser percentage', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: [
          { percentage: 10, effectiveFrom: '2020-01-01' },
          { percentage: 20, effectiveFrom: '2025-01-01' },
        ],
      });

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('currentPct')).toHaveTextContent('20');
      });
    });

    it('should return default percentage when no periods exist', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: [],
      });

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        expect(screen.getByTestId('currentPct')).toHaveTextContent('10');
      });
    });

    it('should return correct percentage for a given date', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: [
          { percentage: 10, effectiveFrom: '2020-01-01' },
          { percentage: 20, effectiveFrom: '2026-01-01' },
        ],
      });

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        // 2025-06-15 is before 2026-01-01, so should get 10%
        expect(screen.getByTestId('datePct')).toHaveTextContent('10');
      });
    });
  });

  describe('formatCurrency', () => {
    it('should format amount with default currency (ILS)', async () => {
      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        const formatted = screen.getByTestId('formatted').textContent;
        // Should contain the number 1,000 in some format
        expect(formatted).toMatch(/1[,.]000/);
      });
    });

    it('should format amount with USD currency', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        currency: 'USD',
      });

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        const formatted = screen.getByTestId('formatted').textContent;
        expect(formatted).toMatch(/\$|USD/);
      });
    });

    it('should format amount with EUR currency', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        currency: 'EUR',
      });

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        const formatted = screen.getByTestId('formatted').textContent;
        // Should contain euro sign or EUR text
        expect(formatted).toMatch(/\u20AC|EUR/);
      });
    });

    it('should format amount with GBP currency', async () => {
      getSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        currency: 'GBP',
      });

      renderWithProviders(<TestConsumer />);

      await waitFor(() => {
        const formatted = screen.getByTestId('formatted').textContent;
        expect(formatted).toMatch(/\u00A3|GBP/);
      });
    });
  });

  describe('useSettings hook', () => {
    it('should throw when used outside SettingsProvider', () => {
      // Suppress React error boundary console output
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      function BadConsumer() {
        useSettings();
        return null;
      }

      expect(() => render(<BadConsumer />)).toThrow(
        'useSettings must be used within a SettingsProvider'
      );

      spy.mockRestore();
    });

    it('should not throw when used inside SettingsProvider', async () => {
      function GoodConsumer() {
        const ctx = useSettings();
        return <div data-testid="ok">{ctx ? 'yes' : 'no'}</div>;
      }

      renderWithProviders(<GoodConsumer />);

      expect(screen.getByTestId('ok')).toHaveTextContent('yes');
    });
  });

  describe('localStorage sync strategy', () => {
    it('should sync language to localStorage on update', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        language: 'en',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-lang').click();
      });

      expect(localStorage.getItem('maaser-tracker-language')).toBe('en');
    });

    it('should sync theme to localStorage on update', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        themeMode: 'dark',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-theme').click();
      });

      expect(localStorage.getItem('maaser-tracker-theme')).toBe('dark');
    });

    it('should NOT sync currency to localStorage', async () => {
      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-currency').click();
      });

      // No currency key in localStorage
      expect(localStorage.getItem('maaser-tracker-currency')).toBeNull();
    });

    it('should NOT sync maaserPercentage to localStorage', async () => {
      const expectedPeriods = [
        { percentage: 10, effectiveFrom: '2020-01-01' },
        { percentage: 15, effectiveFrom: '2026-06-01' },
      ];

      updateSettings.mockResolvedValue({
        ...DEFAULT_SETTINGS,
        maaserPercentagePeriods: expectedPeriods,
        updatedAt: new Date().toISOString(),
      });

      renderWithProviders(<MutatorConsumer />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });

      await act(async () => {
        screen.getByTestId('btn-pct').click();
      });

      expect(localStorage.getItem('maaser-tracker-percentage')).toBeNull();
    });
  });

  describe('context value shape', () => {
    it('should expose all expected properties', async () => {
      function ShapeConsumer() {
        const ctx = useSettings();
        const keys = Object.keys(ctx).sort().join(',');
        return <div data-testid="keys">{keys}</div>;
      }

      renderWithProviders(<ShapeConsumer />);

      await waitFor(() => {
        const keys = screen.getByTestId('keys').textContent.split(',');
        expect(keys).toContain('settings');
        expect(keys).toContain('isLoading');
        expect(keys).toContain('updateLanguage');
        expect(keys).toContain('updateCurrency');
        expect(keys).toContain('updateThemeMode');
        expect(keys).toContain('updateMaaserPercentage');
        expect(keys).toContain('getCurrentMaaserPercentage');
        expect(keys).toContain('getMaaserPercentageForDate');
        expect(keys).toContain('formatCurrency');
      });
    });
  });
});
