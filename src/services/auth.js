/**
 * Authentication Service
 *
 * Provides Firebase Authentication functionality with Google Sign-In.
 * Authentication is OPTIONAL - the app works fully without signing in.
 *
 * Functions:
 * - signInWithGoogle() - Trigger Google OAuth (popup on desktop, redirect on mobile/PWA)
 * - handleRedirectResult() - Process redirect result on page load (mobile auth)
 * - signOut() - Sign out current user
 * - getCurrentUser() - Get current authenticated user
 * - onAuthStateChanged(callback) - Listen for auth state changes
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
 * Detect mobile browsers and PWA standalone mode.
 * On mobile or when running as an installed PWA, popups are unreliable —
 * signInWithRedirect is the correct approach.
 * @returns {boolean}
 */
export function isMobileOrPWA() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  return isMobile || isStandalone;
}

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
 * Handle redirect result on page load.
 * Must be called during app initialization to complete mobile sign-in flows.
 * The onAuthStateChanged listener will fire automatically if sign-in succeeds.
 * @returns {Promise<void>}
 */
export async function handleRedirectResult() {
  try {
    await getRedirectResult(auth);
    // onAuthStateChanged handles the resulting user state
  } catch (error) {
    console.error('Redirect sign-in error:', error);
  }
}

/**
 * Sign in with Google.
 * - Desktop: uses signInWithPopup
 * - Mobile / PWA standalone: uses signInWithRedirect (returns null; result handled on next load)
 * @returns {Promise<{user: Object, isNewUser: boolean}|null>} User data on desktop, null on mobile redirect
 * @throws {Error} If sign-in fails
 */
export async function signInWithGoogle() {
  if (isMobileOrPWA()) {
    await signInWithRedirect(auth, googleProvider);
    // Page will redirect — result is handled by handleRedirectResult on next load
    return null;
  }

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
