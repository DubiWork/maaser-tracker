/**
 * useResolvedTheme Hook
 *
 * Resolves the effective theme mode ('light' | 'dark') from the user's
 * themeMode setting ('light' | 'dark' | 'system').
 *
 * When themeMode is 'system', listens to the OS prefers-color-scheme
 * media query and updates reactively when the user toggles their OS theme.
 *
 * @param {string} themeMode - 'light' | 'dark' | 'system'
 * @returns {string} 'light' | 'dark'
 */

import { useSyncExternalStore } from 'react';

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

function getSystemPreference() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia(DARK_MEDIA_QUERY).matches ? 'dark' : 'light';
}

function subscribeToMediaQuery(callback) {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  const mql = window.matchMedia(DARK_MEDIA_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getServerSnapshot() {
  return 'light';
}

export function useResolvedTheme(themeMode) {
  const systemPreference = useSyncExternalStore(
    subscribeToMediaQuery,
    getSystemPreference,
    getServerSnapshot
  );

  if (themeMode === 'light' || themeMode === 'dark') {
    return themeMode;
  }

  // 'system' or any unrecognized value falls back to system preference
  return systemPreference;
}
