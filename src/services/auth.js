/**
 * Authentication Service
 *
 * Provides Firebase Authentication functionality with Google Sign-In.
 * Authentication is OPTIONAL - the app works fully without signing in.
 *
 * Functions:
 * - signInWithGoogle() - Trigger Google OAuth popup
 * - signOut() - Sign out current user
 * - getCurrentUser() - Get current authenticated user
 * - onAuthStateChanged(callback) - Listen for auth state changes
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// Google Auth Provider singleton
const googleProvider = new GoogleAuthProvider();

// Configure Google provider for better UX
googleProvider.setCustomParameters({
  prompt: 'select_account', // Always show account picker
});

/**
 * Error codes for authentication errors
 */
export const AUTH_ERROR_CODES = {
  POPUP_CLOSED: 'auth/popup-closed-by-user',
  POPUP_BLOCKED: 'auth/popup-blocked',
  NETWORK_ERROR: 'auth/network-request-failed',
  CANCELLED: 'auth/cancelled-popup-request',
};

/**
 * Sign in with Google using popup
 * @returns {Promise<{user: Object, isNewUser: boolean}>} User object and new user flag
 * @throws {Error} If sign-in fails
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if this is a new user (first sign-in)
    const isNewUser = result._tokenResponse?.isNewUser ?? false;

    return {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
      isNewUser,
    };
  } catch (error) {
    // Re-throw with more context for specific error types
    if (error.code === AUTH_ERROR_CODES.POPUP_CLOSED) {
      const cancelledError = new Error('Sign-in was cancelled');
      cancelledError.code = 'cancelled';
      throw cancelledError;
    }

    if (error.code === AUTH_ERROR_CODES.POPUP_BLOCKED) {
      const blockedError = new Error('Sign-in popup was blocked. Please allow popups for this site.');
      blockedError.code = 'popup-blocked';
      throw blockedError;
    }

    if (error.code === AUTH_ERROR_CODES.NETWORK_ERROR) {
      const networkError = new Error('Network error. Please check your internet connection.');
      networkError.code = 'network-error';
      throw networkError;
    }

    if (error.code === AUTH_ERROR_CODES.CANCELLED) {
      const cancelledError = new Error('Sign-in was cancelled');
      cancelledError.code = 'cancelled';
      throw cancelledError;
    }

    // Generic error
    const genericError = new Error(error.message || 'Sign-in failed');
    genericError.code = error.code || 'unknown';
    throw genericError;
  }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 * @throws {Error} If sign-out fails
 */
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    const signOutError = new Error(error.message || 'Sign-out failed');
    signOutError.code = error.code || 'unknown';
    throw signOutError;
  }
}

/**
 * Get the current authenticated user
 * @returns {Object|null} Current user object or null if not authenticated
 */
export function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

/**
 * Listen for authentication state changes
 * @param {function} callback - Function to call when auth state changes
 * @returns {function} Unsubscribe function
 */
export function onAuthStateChanged(callback) {
  return firebaseOnAuthStateChanged(auth, (user) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}
