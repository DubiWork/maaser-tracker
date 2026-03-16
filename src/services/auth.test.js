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
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn(),
    getAdditionalUserInfo: vi.fn(),
  };
});

vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

import {
  signInWithGoogle,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
  AUTH_ERROR_CODES,
} from './auth';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

describe('auth service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth.currentUser
    auth.currentUser = null;
  });

  describe('signInWithGoogle', () => {
    it('should sign in successfully and return user data', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      const mockResult = { user: mockUser };
      signInWithPopup.mockResolvedValueOnce(mockResult);
      getAdditionalUserInfo.mockReturnValueOnce({ isNewUser: false });

      const result = await signInWithGoogle();

      expect(getAdditionalUserInfo).toHaveBeenCalledWith(mockResult);
      expect(result.user).toEqual({
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      });
      expect(result.isNewUser).toBe(false);
    });

    it('should detect new users', async () => {
      const mockUser = {
        uid: 'new-user-123',
        email: 'new@example.com',
        displayName: 'New User',
        photoURL: null,
      };

      signInWithPopup.mockResolvedValueOnce({ user: mockUser });
      getAdditionalUserInfo.mockReturnValueOnce({ isNewUser: true });

      const result = await signInWithGoogle();

      expect(result.isNewUser).toBe(true);
    });

    it('should default isNewUser to false when getAdditionalUserInfo returns null', async () => {
      const mockUser = {
        uid: 'edge-user-123',
        email: 'edge@example.com',
        displayName: 'Edge User',
        photoURL: null,
      };

      signInWithPopup.mockResolvedValueOnce({ user: mockUser });
      getAdditionalUserInfo.mockReturnValueOnce(null);

      const result = await signInWithGoogle();

      expect(result.isNewUser).toBe(false);
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
