/**
 * Tests for AuthProvider component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from '../hooks/useAuth';

// Mock the auth service
vi.mock('../services/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  handleRedirectResult: vi.fn().mockResolvedValue(null),
}));

import { onAuthStateChanged } from '../services/auth';

// Test component that consumes auth context
function TestConsumer() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div data-testid="loading">Loading...</div>;
  }

  return (
    <div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="user">{user ? user.email : 'no user'}</div>
    </div>
  );
}

describe('AuthProvider', () => {
  let authStateCallback;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup onAuthStateChanged mock
    onAuthStateChanged.mockImplementation((callback) => {
      authStateCallback = callback;
      // Don't call callback immediately - let loading state be tested
      return vi.fn();
    });
  });

  describe('rendering', () => {
    it('should render children', () => {
      // Call auth callback to finish loading
      onAuthStateChanged.mockImplementation((callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthProvider>
          <div data-testid="child">Child Content</div>
        </AuthProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should show loading state initially', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Simulate auth state resolved - wrap in act()
      await act(async () => {
        authStateCallback(null);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('authentication state', () => {
    it('should provide unauthenticated state when no user', async () => {
      onAuthStateChanged.mockImplementation((callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
      });
    });

    it('should provide authenticated state when user exists', async () => {
      onAuthStateChanged.mockImplementation((callback) => {
        callback({
          uid: 'test-uid',
          email: 'test@example.com',
          displayName: 'Test User',
          photoURL: null,
        });
        return vi.fn();
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      });
    });
  });

  describe('subscription', () => {
    it('should subscribe to auth state on mount', () => {
      onAuthStateChanged.mockImplementation((callback) => {
        callback(null);
        return vi.fn();
      });

      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );

      expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe from auth state on unmount', () => {
      const unsubscribe = vi.fn();
      onAuthStateChanged.mockImplementation((callback) => {
        callback(null);
        return unsubscribe;
      });

      const { unmount } = render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );

      unmount();

      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('state updates', () => {
    it('should update state when auth changes from signed out to signed in', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Initially no user - wrap in act()
      await act(async () => {
        authStateCallback(null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });

      // User signs in - wrap in act()
      await act(async () => {
        authStateCallback({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'User',
          photoURL: null,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user')).toHaveTextContent('user@example.com');
      });
    });

    it('should update state when auth changes from signed in to signed out', async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Initially signed in - wrap in act()
      await act(async () => {
        authStateCallback({
          uid: 'user-123',
          email: 'user@example.com',
          displayName: 'User',
          photoURL: null,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // User signs out - wrap in act()
      await act(async () => {
        authStateCallback(null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('no user');
      });
    });
  });
});
