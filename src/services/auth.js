/**
 * Authentication Service
 *
 * Provides Firebase Authentication functionality with Google Sign-In.
 * Authentication is OPTIONAL - the app works fully without signing in.
 *
 * Uses signInWithPopup as primary method (works on both desktop and mobile).
 * Falls back to signInWithRedirect only if popup is blocked.
 *
 * Functions:
 * - signInWithGoogle() - Trigger Google OAuth popup (fallback to redirect)
 * - handleRedirectResult() - Process redirect result on app startup (fallback flow)
 * - signOut() - Sign out current user
 * - getCurrentUser() - Get current authenticated user
 * - onAuthStateChanged(callback) - Listen for auth state changes
 * - isMobileBrowser() - Detect mobile browser environment
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
 * Detect if the current browser is a mobile device.
 * @returns {boolean}
 */
export function isMobileBrowser() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
}

/**
 * Error codes for authentication errors
 */
export const AUTH_ERROR_CODES = {
  POPUP_CLOSED: 'auth/popup-closed-by-user',
  POPUP_BLOCKED: 'auth/popup-blocked',
  NETWORK_ERROR: 'auth/network-request-failed',
  CANCELLED: 'auth/cancelled-popup-request',
  OPERATION_NOT_ALLOWED: 'auth/operation-not-allowed',
  UNAUTHORIZED_DOMAIN: 'auth/unauthorized-domain',
};

/**
 * Sign in with Google.
 * Always tries signInWithPopup first (works on desktop and most mobile browsers).
 * If popup is blocked, falls back to signInWithRedirect.
 * @returns {Promise<{user: Object, isNewUser: boolean}|null>} User object and new user flag,
 *   or null if redirect fallback was initiated (page will navigate away).
 * @throws {Error} If sign-in fails
 */
export async function signInWithGoogle() {
  try {
    // Always try popup first — it works on both desktop and mobile
    // when triggered from a user gesture (button click)
    const result = await signInWithPopup(auth, googleProvider);
    return extractUserResult(result);
  } catch (error) {
    // If popup was blocked (common on some mobile browsers), fall back to redirect
    if (error.code === AUTH_ERROR_CODES.POPUP_BLOCKED) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return null; // Signal: redirect in progress
      } catch (redirectError) {
        throw mapAuthError(redirectError);
      }
    }
    throw mapAuthError(error);
  }
}

/**
 * Handle the redirect result after the page reloads from a Google sign-in redirect.
 * Must be called once on app startup.
 * @returns {Promise<{user: Object, isNewUser: boolean}|null>} User data if redirect completed,
 *   or null if there was no pending redirect.
 * @throws {Error} If the redirect sign-in failed
 */
export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) {
      return null; // No pending redirect
    }
    return extractUserResult(result);
  } catch (error) {
    throw mapAuthError(error);
  }
}

/**
 * Extract a normalized user result from a Firebase auth credential result.
 * @param {Object} result - Firebase UserCredential
 * @returns {{user: Object, isNewUser: boolean}}
 */
function extractUserResult(result) {
  const user = result.user;
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
}

/**
 * Map Firebase auth errors to user-friendly errors with stable codes.
 * @param {Error} error - Firebase auth error
 * @returns {Error} Mapped error with code property
 */
function mapAuthError(error) {
  if (error.code === AUTH_ERROR_CODES.POPUP_CLOSED) {
    const cancelledError = new Error('Sign-in was cancelled');
    cancelledError.code = 'cancelled';
    return cancelledError;
  }

  if (error.code === AUTH_ERROR_CODES.POPUP_BLOCKED) {
    const blockedError = new Error('Sign-in popup was blocked. Please allow popups for this site.');
    blockedError.code = 'popup-blocked';
    return blockedError;
  }

  if (error.code === AUTH_ERROR_CODES.NETWORK_ERROR) {
    const networkError = new Error('Network error. Please check your internet connection.');
    networkError.code = 'network-error';
    return networkError;
  }

  if (error.code === AUTH_ERROR_CODES.CANCELLED) {
    const cancelledError = new Error('Sign-in was cancelled');
    cancelledError.code = 'cancelled';
    return cancelledError;
  }

  if (error.code === AUTH_ERROR_CODES.OPERATION_NOT_ALLOWED) {
    const notAllowedError = new Error('Google Sign-In is not enabled. Please contact support.');
    notAllowedError.code = 'operation-not-allowed';
    return notAllowedError;
  }

  if (error.code === AUTH_ERROR_CODES.UNAUTHORIZED_DOMAIN) {
    const domainError = new Error('This domain is not authorized for sign-in. Please contact support.');
    domainError.code = 'unauthorized-domain';
    return domainError;
  }

  // Generic error
  const genericError = new Error(error.message || 'Sign-in failed');
  genericError.code = error.code || 'unknown';
  return genericError;
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
