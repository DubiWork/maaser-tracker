/**
 * Tests for Authentication Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase Auth module before imports
// Use a class for GoogleAuthProvider since it needs to be constructed with `new`
vi.mock('firebase/auth', () => {
  const MockGoogleAuthProvider = class {
    constructor() {
      this.setCustomParameters = vi.fn();
    }
  };

  return {
    GoogleAuthProvider: MockGoogleAuthProvider,
    signInWithPopup: vi.fn(),
    signInWithRedirect: vi.fn(),
    getRedirectResult: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
  };
});

vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

import {
  signInWithGoogle,
  handleRedirectResult,
  isMobileOrPWA,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
  AUTH_ERROR_CODES,
} from './auth';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth.currentUser
    auth.currentUser = null;
  });

  describe('isMobileOrPWA', () => {
    const originalUserAgent = navigator.userAgent;
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
        configurable: true,
      });
      window.matchMedia = originalMatchMedia;
      window.navigator.standalone = undefined;
    });

    it('should return false on a desktop user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));
      expect(isMobileOrPWA()).toBe(false);
    });

    it('should return true for an Android user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));
      expect(isMobileOrPWA()).toBe(true);
    });

    it('should return true for an iPhone user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));
      expect(isMobileOrPWA()).toBe(true);
    });

    it('should return true when display-mode is standalone (PWA)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: true }));
      expect(isMobileOrPWA()).toBe(true);
    });

    it('should return true when window.navigator.standalone is true (iOS PWA)', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true,
        configurable: true,
      });
      expect(isMobileOrPWA()).toBe(true);
    });
  });

  describe('handleRedirectResult', () => {
    it('should call getRedirectResult on initialization', async () => {
      getRedirectResult.mockResolvedValueOnce(null);

      await handleRedirectResult();

      expect(getRedirectResult).toHaveBeenCalledWith(auth);
    });

    it('should not throw when getRedirectResult returns a result', async () => {
      getRedirectResult.mockResolvedValueOnce({ user: { uid: 'redirect-user' } });

      await expect(handleRedirectResult()).resolves.toBeUndefined();
    });

    it('should log error but not throw when getRedirectResult rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      getRedirectResult.mockRejectedValueOnce(new Error('Redirect failed'));

      await expect(handleRedirectResult()).resolves.toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('signInWithGoogle', () => {
    it('should use signInWithRedirect on mobile and return null', async () => {
      // Mock isMobileOrPWA by faking a mobile UA
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 12; Pixel 6)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));
      signInWithRedirect.mockResolvedValueOnce(undefined);

      const result = await signInWithGoogle();

      expect(signInWithRedirect).toHaveBeenCalled();
      expect(signInWithPopup).not.toHaveBeenCalled();
      expect(result).toBeNull();

      // Restore desktop UA for subsequent tests
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));
    });

    it('should sign in successfully via popup on desktop and return user data', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));

      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      signInWithPopup.mockResolvedValueOnce({
        user: mockUser,
        _tokenResponse: { isNewUser: false },
      });

      const result = await signInWithGoogle();

      expect(result.user).toEqual({
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      });
      expect(result.isNewUser).toBe(false);
    });

    it('should detect new users', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));

      const mockUser = {
        uid: 'new-user-123',
        email: 'new@example.com',
        displayName: 'New User',
        photoURL: null,
      };

      signInWithPopup.mockResolvedValueOnce({
        user: mockUser,
        _tokenResponse: { isNewUser: true },
      });

      const result = await signInWithGoogle();

      expect(result.isNewUser).toBe(true);
    });

    it('should handle popup closed by user', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));

      const error = new Error('Popup closed');
      error.code = AUTH_ERROR_CODES.POPUP_CLOSED;
      signInWithPopup.mockRejectedValueOnce(error);

      await expect(signInWithGoogle()).rejects.toMatchObject({
        message: 'Sign-in was cancelled',
        code: 'cancelled',
      });
    });

    it('should handle popup blocked error', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));

      const error = new Error('Popup blocked');
      error.code = AUTH_ERROR_CODES.POPUP_BLOCKED;
      signInWithPopup.mockRejectedValueOnce(error);

      await expect(signInWithGoogle()).rejects.toMatchObject({
        message: 'Sign-in popup was blocked. Please allow popups for this site.',
        code: 'popup-blocked',
      });
    });

    it('should handle network error', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));

      const error = new Error('Network error');
      error.code = AUTH_ERROR_CODES.NETWORK_ERROR;
      signInWithPopup.mockRejectedValueOnce(error);

      await expect(signInWithGoogle()).rejects.toMatchObject({
        message: 'Network error. Please check your internet connection.',
        code: 'network-error',
      });
    });

    it('should handle cancelled popup request', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));

      const error = new Error('Cancelled');
      error.code = AUTH_ERROR_CODES.CANCELLED;
      signInWithPopup.mockRejectedValueOnce(error);

      await expect(signInWithGoogle()).rejects.toMatchObject({
        message: 'Sign-in was cancelled',
        code: 'cancelled',
      });
    });

    it('should handle generic errors', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));

      const error = new Error('Something went wrong');
      error.code = 'auth/unknown-error';
      signInWithPopup.mockRejectedValueOnce(error);

      await expect(signInWithGoogle()).rejects.toMatchObject({
        message: 'Something went wrong',
        code: 'auth/unknown-error',
      });
    });

    it('should handle errors without message', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });
      window.matchMedia = vi.fn(() => ({ matches: false }));

      const error = new Error();
      error.code = 'auth/error';
      signInWithPopup.mockRejectedValueOnce(error);

      await expect(signInWithGoogle()).rejects.toMatchObject({
        message: 'Sign-in failed',
        code: 'auth/error',
      });
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      firebaseSignOut.mockResolvedValueOnce();

      await expect(signOut()).resolves.toBeUndefined();
      expect(firebaseSignOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const error = new Error('Sign out failed');
      error.code = 'auth/sign-out-error';
      firebaseSignOut.mockRejectedValueOnce(error);

      await expect(signOut()).rejects.toMatchObject({
        message: 'Sign out failed',
        code: 'auth/sign-out-error',
      });
    });

    it('should handle sign out errors without message', async () => {
      const error = new Error();
      error.code = 'auth/error';
      firebaseSignOut.mockRejectedValueOnce(error);

      await expect(signOut()).rejects.toMatchObject({
        message: 'Sign-out failed',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user is signed in', () => {
      auth.currentUser = null;

      const result = getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return user data when signed in', () => {
      auth.currentUser = {
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Current User',
        photoURL: 'https://example.com/avatar.jpg',
      };

      const result = getCurrentUser();

      expect(result).toEqual({
        uid: 'user-123',
        email: 'user@example.com',
        displayName: 'Current User',
        photoURL: 'https://example.com/avatar.jpg',
      });
    });
  });

  describe('onAuthStateChanged', () => {
    it('should subscribe to auth state changes', () => {
      const callback = vi.fn();
      firebaseOnAuthStateChanged.mockReturnValue(vi.fn());

      onAuthStateChanged(callback);

      expect(firebaseOnAuthStateChanged).toHaveBeenCalled();
    });

    it('should call callback with user data when user signs in', () => {
      let authCallback;
      firebaseOnAuthStateChanged.mockImplementation((authInstance, cb) => {
        authCallback = cb;
        return vi.fn();
      });

      const callback = vi.fn();
      onAuthStateChanged(callback);

      // Simulate user sign in
      authCallback({
        uid: 'signed-in-user',
        email: 'signed@example.com',
        displayName: 'Signed User',
        photoURL: 'https://example.com/photo.jpg',
      });

      expect(callback).toHaveBeenCalledWith({
        uid: 'signed-in-user',
        email: 'signed@example.com',
        displayName: 'Signed User',
        photoURL: 'https://example.com/photo.jpg',
      });
    });

    it('should call callback with null when user signs out', () => {
      let authCallback;
      firebaseOnAuthStateChanged.mockImplementation((authInstance, cb) => {
        authCallback = cb;
        return vi.fn();
      });

      const callback = vi.fn();
      onAuthStateChanged(callback);

      // Simulate user sign out
      authCallback(null);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('should return unsubscribe function', () => {
      const unsubscribe = vi.fn();
      firebaseOnAuthStateChanged.mockReturnValue(unsubscribe);

      const result = onAuthStateChanged(vi.fn());

      expect(result).toBe(unsubscribe);
    });
  });

  describe('AUTH_ERROR_CODES', () => {
    it('should export correct error codes', () => {
      expect(AUTH_ERROR_CODES.POPUP_CLOSED).toBe('auth/popup-closed-by-user');
      expect(AUTH_ERROR_CODES.POPUP_BLOCKED).toBe('auth/popup-blocked');
      expect(AUTH_ERROR_CODES.NETWORK_ERROR).toBe('auth/network-request-failed');
      expect(AUTH_ERROR_CODES.CANCELLED).toBe('auth/cancelled-popup-request');
    });
  });
});

