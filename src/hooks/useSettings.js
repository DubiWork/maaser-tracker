/**
 * useSettings Hook
 *
 * Custom hook for accessing settings context.
 * Must be used within a SettingsProvider.
 *
 * Returns:
 * - settings: Current AppSettings object
 * - isLoading: Whether settings are being loaded from IndexedDB
 * - updateLanguage: Function to update language setting
 * - updateCurrency: Function to update currency setting
 * - updateThemeMode: Function to update theme mode setting
 * - updateMaaserPercentage: Function to add a new percentage period
 * - getCurrentMaaserPercentage: Function to get current percentage
 * - getMaaserPercentageForDate: Function to get percentage for a date
 * - formatCurrency: Function to format an amount with current currency
 */

import { useContext } from 'react';
import { SettingsContext } from '../contexts/SettingsContext';

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
}
