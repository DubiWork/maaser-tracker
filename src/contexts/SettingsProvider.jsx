/**
 * Settings Provider
 *
 * Manages app-wide settings state, persists to IndexedDB,
 * and syncs language/theme to localStorage for fast initial render.
 *
 * Context value shape:
 * - settings: Current AppSettings object
 * - isLoading: True while loading from IndexedDB
 * - updateLanguage(lang): Update language in IndexedDB + localStorage + LanguageProvider
 * - updateCurrency(code): Update currency in IndexedDB
 * - updateThemeMode(mode): Update theme in IndexedDB + localStorage
 * - updateMaaserPercentage(newPct, effectiveDate): Append period, save to IndexedDB
 * - getCurrentMaaserPercentage(): Current percentage from periods
 * - getMaaserPercentageForDate(date): Percentage for a specific date
 * - formatCurrency(amount): Format amount using current currency setting
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SettingsContext } from './SettingsContext';
import { useLanguage } from './useLanguage';
import {
  getSettings,
  updateSettings,
  DEFAULT_SETTINGS,
} from '../services/settingsDb';
import {
  getCurrentMaaserPercentage as calcCurrentPercentage,
  getMaaserPercentageForDate as calcPercentageForDate,
  addPercentagePeriod,
} from '../utils/maaserCalculation';

const LANGUAGE_STORAGE_KEY = 'maaser-tracker-language';
const THEME_STORAGE_KEY = 'maaser-tracker-theme';

/**
 * Currency locale mapping for Intl.NumberFormat
 */
const CURRENCY_LOCALES = {
  ILS: 'he-IL',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

export function SettingsProvider({ children }) {
  const { setLanguage } = useLanguage();
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS }));
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const stored = await getSettings();
        if (!cancelled) {
          setSettings(stored);
          setIsLoading(false);

          // Sync language to LanguageProvider on load
          if (stored.language) {
            setLanguage(stored.language);
          }
        }
      } catch (error) {
        if (!cancelled) {
          // On error, keep defaults and stop loading
          setIsLoading(false);
          if (import.meta.env.DEV) {
            console.error('SettingsProvider: Failed to load settings', error);
          }
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update language setting
  const updateLanguage = useCallback(async (lang) => {
    // Update localStorage for fast read on next launch
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // localStorage unavailable
    }

    // Update LanguageProvider
    setLanguage(lang);

    // Optimistic local state update
    setSettings((prev) => ({ ...prev, language: lang }));

    // Persist to IndexedDB
    const updated = await updateSettings({ language: lang });
    setSettings(updated);
    return updated;
  }, [setLanguage]);

  // Update currency setting
  const updateCurrency = useCallback(async (code) => {
    // Optimistic local state update
    setSettings((prev) => ({ ...prev, currency: code }));

    // Persist to IndexedDB
    const updated = await updateSettings({ currency: code });
    setSettings(updated);
    return updated;
  }, []);

  // Update theme mode setting
  const updateThemeMode = useCallback(async (mode) => {
    // Update localStorage for fast read on next launch
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // localStorage unavailable
    }

    // Optimistic local state update
    setSettings((prev) => ({ ...prev, themeMode: mode }));

    // Persist to IndexedDB
    const updated = await updateSettings({ themeMode: mode });
    setSettings(updated);
    return updated;
  }, []);

  // Update ma'aser percentage (appends a new period)
  const updateMaaserPercentage = useCallback(async (newPct, effectiveDate) => {
    // Use the utility to create a new sorted periods array
    const newPeriods = addPercentagePeriod(
      settings.maaserPercentagePeriods,
      newPct,
      effectiveDate
    );

    // Optimistic local state update
    setSettings((prev) => ({ ...prev, maaserPercentagePeriods: newPeriods }));

    // Persist to IndexedDB
    const updated = await updateSettings({ maaserPercentagePeriods: newPeriods });
    setSettings(updated);
    return updated;
  }, [settings.maaserPercentagePeriods]);

  // Derived helper: get current ma'aser percentage
  const getCurrentMaaserPercentage = useCallback(() => {
    return calcCurrentPercentage(settings.maaserPercentagePeriods);
  }, [settings.maaserPercentagePeriods]);

  // Derived helper: get ma'aser percentage for a specific date
  const getMaaserPercentageForDate = useCallback((date) => {
    return calcPercentageForDate(date, settings.maaserPercentagePeriods);
  }, [settings.maaserPercentagePeriods]);

  // Format currency using Intl.NumberFormat
  const formatCurrency = useCallback((amount) => {
    const locale = CURRENCY_LOCALES[settings.currency] || 'en-US';
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: settings.currency,
      }).format(amount);
    } catch {
      // Fallback if Intl is unavailable or currency code invalid
      return `${settings.currency} ${Number(amount).toFixed(2)}`;
    }
  }, [settings.currency]);

  // Memoized context value
  const value = useMemo(
    () => ({
      settings,
      isLoading,
      updateLanguage,
      updateCurrency,
      updateThemeMode,
      updateMaaserPercentage,
      getCurrentMaaserPercentage,
      getMaaserPercentageForDate,
      formatCurrency,
    }),
    [
      settings,
      isLoading,
      updateLanguage,
      updateCurrency,
      updateThemeMode,
      updateMaaserPercentage,
      getCurrentMaaserPercentage,
      getMaaserPercentageForDate,
      formatCurrency,
    ]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
