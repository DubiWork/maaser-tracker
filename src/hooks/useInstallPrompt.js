/**
 * Custom Hook for PWA Install Prompt
 *
 * Manages the beforeinstallprompt event and provides install functionality
 * for PWA installation across different platforms
 */

import { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_COOLDOWN_DAYS = 7;

/**
 * Check if the user agent indicates iOS Safari
 * @returns {boolean} True if running on iOS Safari
 */
function isIOSSafari() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone === true;
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|OPiOS/.test(userAgent);

  return isIOS && isSafari && !isStandalone;
}

/**
 * Check if the app is already installed (running in standalone mode)
 * @returns {boolean} True if running as installed PWA
 */
function isAppInstalled() {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if the prompt was recently dismissed (within cooldown period)
 * @returns {boolean} True if within cooldown period
 */
function isDismissedRecently() {
  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (!dismissedAt) {
      return false;
    }

    const dismissDate = new Date(parseInt(dismissedAt, 10));
    const now = new Date();
    const daysSinceDismiss = (now - dismissDate) / (1000 * 60 * 60 * 24);

    return daysSinceDismiss < DISMISS_COOLDOWN_DAYS;
  } catch {
    return false;
  }
}

/**
 * Store the dismissal timestamp in localStorage
 */
function setDismissed() {
  try {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Hook to manage PWA install prompt
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.hasUserEngaged - Whether user has engaged (e.g., added entries)
 * @returns {Object} Install prompt state and handlers
 */
export function useInstallPrompt({ hasUserEngaged = false } = {}) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Initialize states on mount
  useEffect(() => {
    setIsIOS(isIOSSafari());
    setIsInstalled(isAppInstalled());
    setIsDismissed(isDismissedRecently());
  }, []);

  // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Save the event for later use
      setDeferredPrompt(event);
      setIsInstallable(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for appinstalled event
  useEffect(() => {
    function handleAppInstalled() {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    }

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger the install prompt
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return { outcome: 'unavailable' };
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;

      // Clear the saved prompt
      setDeferredPrompt(null);

      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false);
      }

      return choiceResult;
    } catch (error) {
      console.error('Install prompt error:', error);
      return { outcome: 'error', error };
    }
  }, [deferredPrompt]);

  // Dismiss the prompt (with cooldown)
  const dismiss = useCallback(() => {
    setDismissed();
    setIsDismissed(true);
  }, []);

  // Determine if prompt should be shown
  // Show if: (installable OR iOS) AND not installed AND not dismissed AND user has engaged
  const shouldShowPrompt =
    (isInstallable || isIOS) &&
    !isInstalled &&
    !isDismissed &&
    hasUserEngaged;

  return {
    // State
    isInstallable,
    isIOS,
    isInstalled,
    isDismissed,
    shouldShowPrompt,

    // Actions
    promptInstall,
    dismiss,
  };
}
