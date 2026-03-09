/**
 * Tests for useResolvedTheme hook
 *
 * Verifies system preference detection, explicit mode passthrough,
 * and live listener for OS theme changes via matchMedia.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResolvedTheme } from './useResolvedTheme';

describe('useResolvedTheme', () => {
  let listeners;
  let mockMatches;

  beforeEach(() => {
    listeners = [];
    mockMatches = false;

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: mockMatches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((event, cb) => {
        listeners.push(cb);
      }),
      removeEventListener: vi.fn((event, cb) => {
        listeners = listeners.filter((l) => l !== cb);
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe('explicit modes', () => {
    it('should return "light" when themeMode is "light"', () => {
      const { result } = renderHook(() => useResolvedTheme('light'));

      expect(result.current).toBe('light');
    });

    it('should return "dark" when themeMode is "dark"', () => {
      const { result } = renderHook(() => useResolvedTheme('dark'));

      expect(result.current).toBe('dark');
    });

    it('should ignore system preference when themeMode is "light"', () => {
      mockMatches = true; // System prefers dark
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useResolvedTheme('light'));

      expect(result.current).toBe('light');
    });

    it('should ignore system preference when themeMode is "dark"', () => {
      mockMatches = false; // System prefers light
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useResolvedTheme('dark'));

      expect(result.current).toBe('dark');
    });
  });

  describe('system mode', () => {
    it('should return "light" when system prefers light', () => {
      mockMatches = false;

      const { result } = renderHook(() => useResolvedTheme('system'));

      expect(result.current).toBe('light');
    });

    it('should return "dark" when system prefers dark', () => {
      mockMatches = true;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn((event, cb) => {
          listeners.push(cb);
        }),
        removeEventListener: vi.fn(),
      }));

      const { result } = renderHook(() => useResolvedTheme('system'));

      expect(result.current).toBe('dark');
    });

    it('should query the correct media query', () => {
      renderHook(() => useResolvedTheme('system'));

      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });
  });

  describe('live system preference changes', () => {
    it('should register a change listener on matchMedia', () => {
      const addEventListenerSpy = vi.fn();
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: addEventListenerSpy,
        removeEventListener: vi.fn(),
      }));

      renderHook(() => useResolvedTheme('system'));

      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should remove the listener on unmount', () => {
      const removeEventListenerSpy = vi.fn();
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
      }));

      const { unmount } = renderHook(() => useResolvedTheme('system'));
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('mode transitions', () => {
    it('should update when themeMode changes from system to dark', () => {
      const { result, rerender } = renderHook(
        ({ mode }) => useResolvedTheme(mode),
        { initialProps: { mode: 'system' } }
      );

      expect(result.current).toBe('light');

      rerender({ mode: 'dark' });

      expect(result.current).toBe('dark');
    });

    it('should update when themeMode changes from dark to light', () => {
      const { result, rerender } = renderHook(
        ({ mode }) => useResolvedTheme(mode),
        { initialProps: { mode: 'dark' } }
      );

      expect(result.current).toBe('dark');

      rerender({ mode: 'light' });

      expect(result.current).toBe('light');
    });

    it('should update when themeMode changes from light to system', () => {
      mockMatches = true;
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn((event, cb) => {
          listeners.push(cb);
        }),
        removeEventListener: vi.fn(),
      }));

      const { result, rerender } = renderHook(
        ({ mode }) => useResolvedTheme(mode),
        { initialProps: { mode: 'light' } }
      );

      expect(result.current).toBe('light');

      rerender({ mode: 'system' });

      expect(result.current).toBe('dark');
    });
  });

  describe('edge cases', () => {
    it('should treat unrecognized values as system mode', () => {
      mockMatches = false;

      const { result } = renderHook(() => useResolvedTheme('auto'));

      expect(result.current).toBe('light');
    });

    it('should treat undefined as system mode', () => {
      mockMatches = false;

      const { result } = renderHook(() => useResolvedTheme(undefined));

      expect(result.current).toBe('light');
    });
  });
});
