/**
 * Custom Hook for Online/Offline Status Detection
 *
 * Monitors browser online/offline events and provides current connection status
 * with callbacks for status changes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to track online/offline status
 *
 * @param {Object} options - Configuration options
 * @param {function} options.onOnline - Callback when connection is restored
 * @param {function} options.onOffline - Callback when connection is lost
 * @returns {Object} Online status state
 */
export function useOnlineStatus({ onOnline, onOffline } = {}) {
  // SSR safety: default to true if window is not available
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return true;
    }
    return navigator.onLine;
  });

  // Track if we've been online before (for showing "back online" message)
  const wasOffline = useRef(false);

  // Memoized event handlers
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (wasOffline.current && onOnline) {
      onOnline();
    }
    wasOffline.current = false;
  }, [onOnline]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    wasOffline.current = true;
    if (onOffline) {
      onOffline();
    }
  }, [onOffline]);

  useEffect(() => {
    // SSR safety
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return {
    isOnline,
    isOffline: !isOnline,
  };
}
