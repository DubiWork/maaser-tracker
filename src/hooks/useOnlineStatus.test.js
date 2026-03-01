/**
 * Tests for useOnlineStatus hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  let originalNavigator;
  let addEventListenerSpy;
  let removeEventListenerSpy;

  beforeEach(() => {
    // Store original navigator.onLine
    originalNavigator = Object.getOwnPropertyDescriptor(navigator, 'onLine');

    // Spy on window event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    // Restore original navigator.onLine
    if (originalNavigator) {
      Object.defineProperty(navigator, 'onLine', originalNavigator);
    } else {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });
    }
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should initialize as online when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });

    it('should initialize as offline when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should register event listeners on mount', () => {
      renderHook(() => useOnlineStatus());

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOnlineStatus());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should update isOnline to false when offline event fires', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });

    it('should update isOnline to true when online event fires', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);
    });
  });

  describe('callbacks', () => {
    it('should call onOffline callback when going offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const onOffline = vi.fn();
      renderHook(() => useOnlineStatus({ onOffline }));

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(onOffline).toHaveBeenCalledTimes(1);
    });

    it('should call onOnline callback when coming back online after being offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const onOnline = vi.fn();
      renderHook(() => useOnlineStatus({ onOnline }));

      // First go offline
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(onOnline).not.toHaveBeenCalled();

      // Then come back online
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(onOnline).toHaveBeenCalledTimes(1);
    });

    it('should not call onOnline callback on initial online event if was never offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const onOnline = vi.fn();
      renderHook(() => useOnlineStatus({ onOnline }));

      // Fire online event without ever going offline
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Should not be called because wasOffline.current is false
      expect(onOnline).not.toHaveBeenCalled();
    });

    it('should handle missing callbacks gracefully', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      // Should not throw when callbacks are not provided
      const { result } = renderHook(() => useOnlineStatus());

      expect(() => {
        act(() => {
          window.dispatchEvent(new Event('offline'));
          window.dispatchEvent(new Event('online'));
        });
      }).not.toThrow();

      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid online/offline toggles', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const onOnline = vi.fn();
      const onOffline = vi.fn();
      const { result } = renderHook(() => useOnlineStatus({ onOnline, onOffline }));

      // Rapid toggles
      act(() => {
        window.dispatchEvent(new Event('offline'));
        window.dispatchEvent(new Event('online'));
        window.dispatchEvent(new Event('offline'));
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(onOffline).toHaveBeenCalledTimes(2);
      expect(onOnline).toHaveBeenCalledTimes(2);
    });

    it('should update callbacks when they change', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const onOffline1 = vi.fn();
      const onOffline2 = vi.fn();

      const { rerender } = renderHook(
        ({ onOffline }) => useOnlineStatus({ onOffline }),
        { initialProps: { onOffline: onOffline1 } }
      );

      // Change callback
      rerender({ onOffline: onOffline2 });

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(onOffline1).not.toHaveBeenCalled();
      expect(onOffline2).toHaveBeenCalledTimes(1);
    });

    it('should work with no options provided', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useOnlineStatus());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.isOffline).toBe(true);
    });
  });
});
