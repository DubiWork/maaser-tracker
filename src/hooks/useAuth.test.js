/**
 * Tests for useAuth Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthProvider';
import { useAuth } from './useAuth';

// Mock the auth service
vi.mock('../services/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  handleRedirectResult: vi.fn().mockResolvedValue(null),
}));

import {
  signInWithGoogle,
  signOut,
  onAuthStateChanged,
} from '../services/auth';

// Helper to render hook with AuthProvider
function renderUseAuth() {
  return renderHook(() => useAuth(), {
    wrapper: AuthProvider,
  });
}

describe('useAuth', () => {
  let authStateCallback;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup onAuthStateChanged mock to capture callback
    onAuthStateChanged.mockImplementation((callback) => {
      authStateCallback = callback;
      // Simulate initial state (no user)
      callback(null);
      return vi.fn(); // Return unsubscribe function
    });
  });

  describe('initial state', () => {
    it('should initialize with no user', async () => {
      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should subscribe to auth state changes on mount', () => {
      renderUseAuth();

      expect(onAuthStateChanged).toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('should call signInWithGoogle and update state', async () => {
      const mockUser = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
      };

      signInWithGoogle.mockResolvedValueOnce({
        user: mockUser,
        isNewUser: false,
      });

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger sign in
      await act(async () => {
        await result.current.signIn();
      });

      expect(signInWithGoogle).toHaveBeenCalled();
    });

    it('should set error on sign in failure', async () => {
      const error = new Error('Sign in failed');
      error.code = 'test-error';
      signInWithGoogle.mockRejectedValueOnce(error);

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger sign in
      await act(async () => {
        try {
          await result.current.signIn();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('signOut', () => {
    it('should call signOut service', async () => {
      signOut.mockResolvedValueOnce();

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger sign out
      await act(async () => {
        await result.current.signOut();
      });

      expect(signOut).toHaveBeenCalled();
    });

    it('should set error on sign out failure', async () => {
      const error = new Error('Sign out failed');
      signOut.mockRejectedValueOnce(error);

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Trigger sign out
      await act(async () => {
        try {
          await result.current.signOut();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(error);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      const error = new Error('Test error');
      signInWithGoogle.mockRejectedValueOnce(error);

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Create an error
      await act(async () => {
        try {
          await result.current.signIn();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).not.toBeNull();

      // Clear the error
      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('auth state changes', () => {
    it('should update user when auth state changes to signed in', async () => {
      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Simulate user sign in via auth state change
      act(() => {
        authStateCallback({
          uid: 'new-user',
          email: 'new@example.com',
          displayName: 'New User',
          photoURL: 'https://example.com/photo.jpg',
        });
      });

      expect(result.current.user).toEqual({
        uid: 'new-user',
        email: 'new@example.com',
        displayName: 'New User',
        photoURL: 'https://example.com/photo.jpg',
      });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should update user when auth state changes to signed out', async () => {
      // Start with a signed-in user
      onAuthStateChanged.mockImplementation((callback) => {
        authStateCallback = callback;
        callback({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'User',
          photoURL: null,
        });
        return vi.fn();
      });

      const { result } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Simulate sign out
      act(() => {
        authStateCallback(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('context value stability', () => {
    it('should provide stable function references', async () => {
      const { result, rerender } = renderUseAuth();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const signIn1 = result.current.signIn;
      const signOut1 = result.current.signOut;
      const clearError1 = result.current.clearError;

      rerender();

      expect(result.current.signIn).toBe(signIn1);
      expect(result.current.signOut).toBe(signOut1);
      expect(result.current.clearError).toBe(clearError1);
    });
  });
});
