# Issue #38: Firebase Authentication - Implementation Plan

## Overview
Implement **optional** Firebase Authentication with Google Sign-In to enable cloud sync and multi-device access.

**KEY DESIGN DECISION:** Authentication is **OPTIONAL**, not required. Users can:
- ✅ Use app immediately without signing in (offline-only)
- ✅ Add entries to local IndexedDB without account
- ✅ Sign in later when ready for cloud sync
- ✅ Stay local-only if they prefer (privacy option)

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

### 3. Create Sign-In Button Component (Optional UI)
**File:** `src/components/SignInButton.jsx`
- Simple button shown in app bar when NOT signed in
- Text: "Sign In" / "התחבר"
- On click → show SignInDialog (modal)
- Unobtrusive, doesn't block app usage

### 4. Create Sign-In Dialog Component
**File:** `src/components/SignInDialog.jsx`
- MUI Dialog (modal, not full-screen)
- **Clear benefit-focused messaging:**
  - Heading: "Sign in to unlock cloud features"
  - Benefits list with icons:
    - ✓ Access from any device (phone, tablet, PC)
    - ✓ Automatic cloud backup (never lose data)
    - ✓ Multi-device sync (data everywhere)
  - Current status: "📱 Currently using: Local storage only"
  - Privacy note: "🔒 Your data is private and encrypted"
- Large "Sign in with Google" button
- "Continue without signing in" link (closes dialog)
- Loading state during sign-in
- Error display if sign-in fails
- Hebrew/English bilingual support

**Why benefits-focused:**
- Users need to understand value proposition
- Makes trade-off clear (local vs cloud)
- Respects user choice
- Not tech-focused, user-focused

### 5. Create User Profile Component
**File:** `src/components/UserProfile.jsx`
- User avatar (circular, from Google profile photo)
- User display name
- MUI Menu with dropdown:
  - Sync Status: "✓ Synced" / "Local only"
  - Profile/Settings (future - disabled for now)
  - Sign Out button
- Integrate with app bar
- **Only shown when user is signed in**

### 6. Remove Protected Route Component
**REMOVED:** No ProtectedRoute needed - app works without auth!

Users can access all features immediately. Signing in only enables cloud sync.

### 7. Update App.jsx
- Wrap app with AuthProvider
- Add conditional UI in app bar:
  - If NOT signed in → show SignInButton
  - If signed in → show UserProfile
- **NO routing changes** - app works immediately
- Optional: Show one-time Snackbar promoting cloud sync
  - "Sign in to sync your data across devices"
  - Dismissible, remembered in localStorage
  - Only shown once per user

### 8. Update Firestore Security Rules
**File:** `firestore.rules`
- Users can only read/write their own data (when signed in)
- Rule: `match /users/{userId}/{document=**}`
- Require: `request.auth.uid == userId`
- **No rules for unauthenticated users** - they use IndexedDB only

### 9. Update Translations
**File:** `src/contexts/LanguageProvider.jsx`
Add Hebrew/English translations:
- Sign in / Sign out
- "Sign in to sync across devices"
- "Continue without signing in"
- Cloud sync benefits
- Privacy notice
- Loading messages
- Error messages
- Sync status indicators

### 10. Write Comprehensive Tests
**Files:**
- `src/services/auth.test.js` - Auth service tests
- `src/contexts/AuthProvider.test.jsx` - Provider tests
- `src/hooks/useAuth.test.js` - Hook tests
- `src/components/SignInButton.test.jsx` - Sign-in button tests
- `src/components/SignInDialog.test.jsx` - Sign-in dialog tests
- `src/components/UserProfile.test.jsx` - Profile tests

**Test Coverage:**
- Sign-in flow (success, cancellation, error)
- Sign-out flow
- Auth state persistence
- App works without authentication
- Sign-in is optional, not required
- Error handling (network errors, popup blocked)
- Loading states

## User Flows

### Flow 1: Offline-Only User (No Sign-In)
1. Open app → Dashboard shows immediately (no auth required)
2. Add income/donations → Saved to IndexedDB
3. App works perfectly offline
4. Never signs in → Data stays local forever
5. ✅ **Full functionality without account**

### Flow 2: Sign-In for Cloud Sync
1. Open app → Dashboard shows immediately
2. Add some entries → Saved to IndexedDB locally
3. Sees "Sign In" button in app bar (optional)
4. Clicks "Sign In" → SignInDialog opens
5. Signs in with Google → Success
6. Local IndexedDB data migrated to Firestore (Issue #39)
7. New entries sync automatically
8. ✅ **Multi-device access enabled**

### Flow 3: Dismisses Sign-In Prompt
1. Open app → Dashboard
2. Sees one-time Snackbar: "Sign in to sync across devices"
3. Clicks dismiss → Snackbar goes away
4. Uses app normally (local-only)
5. Can sign in later via button in app bar
6. ✅ **User choice respected**

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
