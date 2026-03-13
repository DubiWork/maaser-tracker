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
  isMobileBrowser,
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

// Helper to set userAgent for mobile detection tests
function setUserAgent(value) {
  Object.defineProperty(navigator, 'userAgent', {
    value,
    writable: true,
    configurable: true,
  });
}

describe('auth service', () => {
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth.currentUser
    auth.currentUser = null;
    // Reset userAgent to desktop
    setUserAgent(originalUserAgent);
  });

  describe('isMobileBrowser', () => {
    it('should return false for desktop browsers', () => {
      setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      expect(isMobileBrowser()).toBe(false);
    });

    it('should return true for Android', () => {
      setUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile');
      expect(isMobileBrowser()).toBe(true);
    });

    it('should return true for iPhone', () => {
      setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
      expect(isMobileBrowser()).toBe(true);
    });

    it('should return true for iPad', () => {
      setUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
      expect(isMobileBrowser()).toBe(true);
    });

    it('should return true for Opera Mini', () => {
      setUserAgent('Opera/9.80 (J2ME/MIDP; Opera Mini/5.0) Presto/2.8.119');
      expect(isMobileBrowser()).toBe(true);
    });
  });

  describe('signInWithGoogle', () => {
    describe('desktop (popup flow)', () => {
      beforeEach(() => {
        setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      });

      it('should sign in successfully and return user data', async () => {
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
        expect(signInWithPopup).toHaveBeenCalled();
        expect(signInWithRedirect).not.toHaveBeenCalled();
      });

      it('should detect new users', async () => {
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
        const error = new Error('Popup closed');
        error.code = AUTH_ERROR_CODES.POPUP_CLOSED;
        signInWithPopup.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Sign-in was cancelled',
          code: 'cancelled',
        });
      });

      it('should handle popup blocked error', async () => {
        const error = new Error('Popup blocked');
        error.code = AUTH_ERROR_CODES.POPUP_BLOCKED;
        signInWithPopup.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Sign-in popup was blocked. Please allow popups for this site.',
          code: 'popup-blocked',
        });
      });

      it('should handle network error', async () => {
        const error = new Error('Network error');
        error.code = AUTH_ERROR_CODES.NETWORK_ERROR;
        signInWithPopup.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Network error. Please check your internet connection.',
          code: 'network-error',
        });
      });

      it('should handle cancelled popup request', async () => {
        const error = new Error('Cancelled');
        error.code = AUTH_ERROR_CODES.CANCELLED;
        signInWithPopup.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Sign-in was cancelled',
          code: 'cancelled',
        });
      });

      it('should handle operation-not-allowed error', async () => {
        const error = new Error('Operation not allowed');
        error.code = AUTH_ERROR_CODES.OPERATION_NOT_ALLOWED;
        signInWithPopup.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Google Sign-In is not enabled. Please contact support.',
          code: 'operation-not-allowed',
        });
      });

      it('should handle unauthorized-domain error', async () => {
        const error = new Error('Unauthorized domain');
        error.code = AUTH_ERROR_CODES.UNAUTHORIZED_DOMAIN;
        signInWithPopup.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'This domain is not authorized for sign-in. Please contact support.',
          code: 'unauthorized-domain',
        });
      });

      it('should handle generic errors', async () => {
        const error = new Error('Something went wrong');
        error.code = 'auth/unknown-error';
        signInWithPopup.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Something went wrong',
          code: 'auth/unknown-error',
        });
      });

      it('should handle errors without message', async () => {
        const error = new Error();
        error.code = 'auth/error';
        signInWithPopup.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Sign-in failed',
          code: 'auth/error',
        });
      });
    });

    describe('mobile (redirect flow)', () => {
      beforeEach(() => {
        setUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Mobile');
      });

      it('should use signInWithRedirect on mobile and return null', async () => {
        signInWithRedirect.mockResolvedValueOnce(undefined);

        const result = await signInWithGoogle();

        expect(result).toBeNull();
        expect(signInWithRedirect).toHaveBeenCalled();
        expect(signInWithPopup).not.toHaveBeenCalled();
      });

      it('should handle redirect errors', async () => {
        const error = new Error('Network error');
        error.code = AUTH_ERROR_CODES.NETWORK_ERROR;
        signInWithRedirect.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Network error. Please check your internet connection.',
          code: 'network-error',
        });
      });

      it('should handle operation-not-allowed on redirect', async () => {
        const error = new Error('Not allowed');
        error.code = AUTH_ERROR_CODES.OPERATION_NOT_ALLOWED;
        signInWithRedirect.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'Google Sign-In is not enabled. Please contact support.',
          code: 'operation-not-allowed',
        });
      });

      it('should handle unauthorized-domain on redirect', async () => {
        const error = new Error('Unauthorized');
        error.code = AUTH_ERROR_CODES.UNAUTHORIZED_DOMAIN;
        signInWithRedirect.mockRejectedValueOnce(error);

        await expect(signInWithGoogle()).rejects.toMatchObject({
          message: 'This domain is not authorized for sign-in. Please contact support.',
          code: 'unauthorized-domain',
        });
      });
    });
  });

  describe('handleRedirectResult', () => {
    it('should return null when there is no pending redirect', async () => {
      getRedirectResult.mockResolvedValueOnce(null);

      const result = await handleRedirectResult();

      expect(result).toBeNull();
      expect(getRedirectResult).toHaveBeenCalled();
    });

    it('should return user data when redirect completed', async () => {
      const mockUser = {
        uid: 'redirect-uid-123',
        email: 'redirect@example.com',
        displayName: 'Redirect User',
        photoURL: 'https://example.com/redirect.jpg',
      };

      getRedirectResult.mockResolvedValueOnce({
        user: mockUser,
        _tokenResponse: { isNewUser: true },
      });

      const result = await handleRedirectResult();

      expect(result).toEqual({
        user: {
          uid: 'redirect-uid-123',
          email: 'redirect@example.com',
          displayName: 'Redirect User',
          photoURL: 'https://example.com/redirect.jpg',
        },
        isNewUser: true,
      });
    });

    it('should throw mapped error when redirect failed', async () => {
      const error = new Error('Network failure');
      error.code = AUTH_ERROR_CODES.NETWORK_ERROR;
      getRedirectResult.mockRejectedValueOnce(error);

      await expect(handleRedirectResult()).rejects.toMatchObject({
        message: 'Network error. Please check your internet connection.',
        code: 'network-error',
      });
    });

    it('should throw mapped error for unauthorized domain', async () => {
      const error = new Error('Unauthorized domain');
      error.code = AUTH_ERROR_CODES.UNAUTHORIZED_DOMAIN;
      getRedirectResult.mockRejectedValueOnce(error);

      await expect(handleRedirectResult()).rejects.toMatchObject({
        message: 'This domain is not authorized for sign-in. Please contact support.',
        code: 'unauthorized-domain',
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
      expect(AUTH_ERROR_CODES.OPERATION_NOT_ALLOWED).toBe('auth/operation-not-allowed');
      expect(AUTH_ERROR_CODES.UNAUTHORIZED_DOMAIN).toBe('auth/unauthorized-domain');
    });
  });
});
