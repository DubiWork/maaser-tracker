/**
 * Tests for useInstallPrompt hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInstallPrompt } from './useInstallPrompt';

describe('useInstallPrompt', () => {
  let _originalNavigator;
  let _originalMatchMedia;
  let localStorageMock;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {
      store: {},
      getItem: vi.fn((key) => localStorageMock.store[key] || null),
      setItem: vi.fn((key, value) => {
        localStorageMock.store[key] = value;
      }),
      clear: vi.fn(() => {
        localStorageMock.store = {};
      }),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

    // Save original matchMedia
    _originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = _originalMatchMedia;
    vi.restoreAllMocks();
  });

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstallable).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isDismissed).toBe(false);
    expect(result.current.shouldShowPrompt).toBe(false);
  });

  it('should not show prompt when user has not engaged', () => {
    const { result } = renderHook(() => useInstallPrompt({ hasUserEngaged: false }));

    expect(result.current.shouldShowPrompt).toBe(false);
  });

  it('should set isInstallable when beforeinstallprompt event fires', () => {
    const { result } = renderHook(() => useInstallPrompt({ hasUserEngaged: true }));

    act(() => {
      const event = new Event('beforeinstallprompt');
      event.preventDefault = vi.fn();
      event.prompt = vi.fn();
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    expect(result.current.isInstallable).toBe(true);
  });

  it('should show prompt when installable and user has engaged', async () => {
    const { result } = renderHook(() => useInstallPrompt({ hasUserEngaged: true }));

    await act(async () => {
      const event = new Event('beforeinstallprompt');
      event.preventDefault = vi.fn();
      event.prompt = vi.fn();
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    expect(result.current.shouldShowPrompt).toBe(true);
  });

  it('should dismiss prompt and store in localStorage', async () => {
    const { result } = renderHook(() => useInstallPrompt({ hasUserEngaged: true }));

    await act(async () => {
      const event = new Event('beforeinstallprompt');
      event.preventDefault = vi.fn();
      event.prompt = vi.fn();
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isDismissed).toBe(true);
    expect(result.current.shouldShowPrompt).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('pwa-install-dismissed', expect.any(String));
  });

  it('should not show prompt when dismissed recently', async () => {
    // Set dismissal time to 1 day ago (within 7-day cooldown)
    const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000;
    localStorageMock.store['pwa-install-dismissed'] = oneDayAgo.toString();

    const { result } = renderHook(() => useInstallPrompt({ hasUserEngaged: true }));

    await act(async () => {
      const event = new Event('beforeinstallprompt');
      event.preventDefault = vi.fn();
      event.prompt = vi.fn();
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    expect(result.current.shouldShowPrompt).toBe(false);
  });

  it('should show prompt after cooldown period expires', async () => {
    // Set dismissal time to 8 days ago (past 7-day cooldown)
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    localStorageMock.store['pwa-install-dismissed'] = eightDaysAgo.toString();

    const { result } = renderHook(() => useInstallPrompt({ hasUserEngaged: true }));

    await act(async () => {
      const event = new Event('beforeinstallprompt');
      event.preventDefault = vi.fn();
      event.prompt = vi.fn();
      event.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(event);
    });

    expect(result.current.shouldShowPrompt).toBe(true);
  });

  it('should set isInstalled when appinstalled event fires', () => {
    const { result } = renderHook(() => useInstallPrompt());

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.isInstalled).toBe(true);
    expect(result.current.shouldShowPrompt).toBe(false);
  });

  it('should detect standalone mode as installed', () => {
    window.matchMedia = vi.fn((query) => ({
      matches: query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useInstallPrompt());

    expect(result.current.isInstalled).toBe(true);
  });

  it('should return unavailable when promptInstall called without deferred prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt());

    let outcome;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(outcome).toEqual({ outcome: 'unavailable' });
  });

  it('should call prompt when promptInstall is invoked with deferred prompt', async () => {
    const mockPrompt = vi.fn();
    const mockUserChoice = Promise.resolve({ outcome: 'accepted' });

    const { result } = renderHook(() => useInstallPrompt({ hasUserEngaged: true }));

    await act(async () => {
      const event = new Event('beforeinstallprompt');
      event.preventDefault = vi.fn();
      event.prompt = mockPrompt;
      event.userChoice = mockUserChoice;
      window.dispatchEvent(event);
    });

    let outcome;
    await act(async () => {
      outcome = await result.current.promptInstall();
    });

    expect(mockPrompt).toHaveBeenCalled();
    expect(outcome).toEqual({ outcome: 'accepted' });
    expect(result.current.isInstallable).toBe(false);
  });
});
