# Issue #38: Firebase Authentication - Implementation Plan

## Overview
Implement Firebase Authentication with Google Sign-In provider to enable secure user authentication and multi-device data access.

## Implementation Tasks

### 1. Create Authentication Service
**File:** `src/services/auth.js`
- `signInWithGoogle()` - Trigger Google OAuth popup
- `signOut()` - Sign out current user
- `getCurrentUser()` - Get current authenticated user
- `onAuthStateChanged(callback)` - Listen for auth state changes
- Error handling for all operations

### 2. Create Authentication Context
**Files:**
- `src/contexts/AuthContext.js` - Context definition
- `src/contexts/AuthProvider.jsx` - Provider component
- `src/hooks/useAuth.js` - Custom hook for consuming auth context

**State:**
- `user` - Current user object (or null)
- `loading` - Authentication loading state
- `error` - Authentication error state

### 3. Create Sign-In Screen Component
**File:** `src/components/SignInScreen.jsx`
- App logo/name
- Tagline: "Track your ma'aser (tithe) donations"
- Large "Sign in with Google" button (MUI Button with Google icon)
- Brief explanation of app purpose
- Privacy note: "Your data is private and encrypted"
- Loading state during sign-in
- Error display if sign-in fails
- Hebrew/English bilingual support

### 4. Create User Profile Component
**File:** `src/components/UserProfile.jsx`
- User avatar (circular, from Google profile photo)
- User display name
- MUI Menu with dropdown:
  - Profile/Settings (future - disabled for now)
  - Sign Out button
- Integrate with app bar

### 5. Create Protected Route Component
**File:** `src/components/ProtectedRoute.jsx`
- Wrapper component for authenticated routes
- Redirect to SignInScreen if not authenticated
- Show loading state while checking auth
- Pass through to children if authenticated

### 6. Update App.jsx
- Wrap app with AuthProvider
- Add routing logic:
  - If not authenticated → show SignInScreen
  - If authenticated → show main app (Dashboard, etc.)
- Add UserProfile to app bar when authenticated
- Handle auth loading state

### 7. Update Firestore Security Rules
**File:** `firestore.rules`
- Users can only read/write their own data
- Rule: `match /users/{userId}/{document=**}`
- Require: `request.auth.uid == userId`

### 8. Update Translations
**File:** `src/contexts/LanguageProvider.jsx`
Add Hebrew/English translations:
- Sign in with Google
- Sign out
- Welcome message
- Privacy notice
- Loading messages
- Error messages

### 9. Write Comprehensive Tests
**Files:**
- `src/services/auth.test.js` - Auth service tests
- `src/contexts/AuthProvider.test.jsx` - Provider tests
- `src/hooks/useAuth.test.js` - Hook tests
- `src/components/SignInScreen.test.jsx` - Sign-in UI tests
- `src/components/UserProfile.test.jsx` - Profile tests
- `src/components/ProtectedRoute.test.jsx` - Route protection tests

**Test Coverage:**
- Sign-in flow (success, cancellation, error)
- Sign-out flow
- Auth state persistence
- Protected route behavior
- Error handling (network errors, popup blocked)
- Loading states

## Testing Strategy
- Mock Firebase Auth SDK functions
- Test all user flows (sign-in, sign-out, persistence)
- Test protected routes redirect correctly
- Test error handling (network errors, popup blocked)
- Test bilingual support (Hebrew/English)

## Dependencies
- ✅ Issue #34 (Firebase Setup) - COMPLETED
- Firebase Auth SDK (already installed)
- Material-UI components (already available)

## Estimate
8-10 hours / 2 story points
