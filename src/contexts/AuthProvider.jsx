/**
 * Authentication Provider
 *
 * Manages Firebase authentication state and provides it to the application.
 * Authentication is OPTIONAL - the app works fully without signing in.
 *
 * State:
 * - user: Current user object (or null)
 * - loading: Whether auth state is being determined
 * - error: Any authentication error
 *
 * Methods:
 * - signIn: Sign in with Google
 * - signOut: Sign out current user
 * - clearError: Clear any authentication error
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import {
  signInWithGoogle,
  signOut as authSignOut,
  onAuthStateChanged,
} from '../services/auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subscribe to auth state changes on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((authUser) => {
      setUser(authUser);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Sign in with Google
  const signIn = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      // User state will be updated by onAuthStateChanged listener
      return result;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setError(null);

    try {
      await authSignOut();
      // User state will be updated by onAuthStateChanged listener
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized context value
  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: !!user,
      signIn,
      signOut,
      clearError,
    }),
    [user, loading, error, signIn, signOut, clearError]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
