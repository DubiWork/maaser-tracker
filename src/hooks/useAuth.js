/**
 * useAuth Hook
 *
 * Custom hook for accessing authentication context.
 * Must be used within an AuthProvider.
 *
 * Returns:
 * - user: Current user object (or null)
 * - loading: Whether auth state is being determined
 * - error: Any authentication error
 * - isAuthenticated: Boolean indicating if user is signed in
 * - signIn: Function to sign in with Google
 * - signOut: Function to sign out
 * - clearError: Function to clear authentication error
 */

import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
