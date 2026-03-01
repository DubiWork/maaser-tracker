# Firebase Integration Issues - Phase 1.5

These issues must be created in GitHub and completed BEFORE public launch.

---

## Issue #30: Firebase Setup & Configuration

**Title:** Firebase Setup & Configuration for Cloud Storage

**Labels:** `enhancement`, `infrastructure`, `P0-critical`
**Assignee:** @DubiWork
**Milestone:** Phase 1.5 - Authentication & Cloud
**Story Points:** 1 SP
**Blocked by:** #7 (PWA Configuration)

### Description

Set up Firebase project and integrate Firebase SDK into the application to enable cloud storage and authentication.

### Acceptance Criteria

- [ ] Create Firebase project in Firebase Console
- [ ] Generate Firebase configuration credentials
- [ ] Install Firebase SDK packages (`firebase`, `@firebase/app`, `@firebase/auth`, `@firebase/firestore`)
- [ ] Create `src/lib/firebase.js` with Firebase initialization
- [ ] Configure Firebase for development and production environments
- [ ] Set up Firebase security rules (basic structure)
- [ ] Update environment variables in `.env` and CI/CD
- [ ] Document Firebase setup in README.md

### Technical Details

**Firebase Services Needed:**
- Authentication (Google OAuth)
- Cloud Firestore (Database)
- Hosting (optional - currently using GitHub Pages)

**Configuration File Structure:**
```javascript
// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

**Environment Variables:**
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Dependencies
- Firebase account (free tier)
- Access to Firebase Console
- Project configuration from GitHub repository settings

### Estimated Time
4-6 hours

---

## Issue #31: Firebase Authentication (Google OAuth)

**Title:** Implement Firebase Authentication with Google Sign-In

**Labels:** `enhancement`, `authentication`, `P0-critical`
**Assignee:** @DubiWork
**Milestone:** Phase 1.5 - Authentication & Cloud
**Story Points:** 2 SP
**Blocked by:** #30 (Firebase Setup)

### Description

Implement user authentication using Firebase Authentication with Google Sign-In provider. Users must authenticate before accessing their data.

### Acceptance Criteria

- [ ] Create authentication service (`src/services/auth.js`)
- [ ] Create authentication context (`src/contexts/AuthProvider.jsx`)
- [ ] Implement Google Sign-In UI component
- [ ] Add sign-out functionality
- [ ] Create protected route wrapper
- [ ] Show user profile info (name, photo) in app bar
- [ ] Handle authentication state persistence
- [ ] Handle authentication errors gracefully
- [ ] Add loading states during authentication
- [ ] Write tests for authentication flow
- [ ] Update translations for auth UI (Hebrew/English)

### Technical Details

**Authentication Flow:**
1. User opens app → sees "Sign in with Google" screen
2. Click sign-in → Google OAuth popup
3. User authorizes → redirect back to app
4. App receives user token → store in context
5. App shows dashboard with user data

**Components to Create:**
```
src/
├── services/
│   └── auth.js              # Auth service functions
├── contexts/
│   ├── AuthContext.js       # Auth context
│   └── AuthProvider.jsx     # Auth provider component
├── components/
│   ├── SignInScreen.jsx     # Landing page with Google sign-in
│   ├── UserProfile.jsx      # User profile dropdown in app bar
│   └── ProtectedRoute.jsx   # Route wrapper for authenticated pages
└── hooks/
    └── useAuth.js           # Custom hook for auth state
```

**Auth Service Functions:**
```javascript
// src/services/auth.js
export const signInWithGoogle = () => { ... }
export const signOut = () => { ... }
export const getCurrentUser = () => { ... }
export const onAuthStateChanged = (callback) => { ... }
```

**Security Rules (Firestore):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### UI/UX Requirements

**Sign-In Screen:**
- App logo/name
- Tagline: "Track your ma'aser (tithe) donations"
- Large "Sign in with Google" button
- Brief explanation of what the app does
- Privacy note: "Your data is private and encrypted"

**User Profile (App Bar):**
- User photo (circular avatar)
- User name
- Dropdown menu:
  - Profile/Settings (future)
  - Sign Out

### Testing

- [ ] Test sign-in flow (success)
- [ ] Test sign-in cancellation
- [ ] Test sign-out
- [ ] Test authentication persistence (refresh page)
- [ ] Test protected routes redirect to sign-in
- [ ] Test error handling (network errors, popup blocked)

### Estimated Time
8-10 hours

---

## Issue #32: Firestore Data Model & Migration

**Title:** Design Firestore Data Model and Implement Data Migration

**Labels:** `enhancement`, `database`, `P0-critical`
**Assignee:** @DubiWork
**Milestone:** Phase 1.5 - Authentication & Cloud
**Story Points:** 3 SP
**Blocked by:** #31 (Firebase Authentication)

### Description

Design the Firestore data model for storing user entries (income/donations) and implement migration from IndexedDB to Firestore.

### Acceptance Criteria

- [ ] Design Firestore data model (document structure)
- [ ] Create Firestore service layer (`src/services/firestore.js`)
- [ ] Implement CRUD operations for Firestore
- [ ] Create migration service to sync IndexedDB → Firestore
- [ ] Handle migration on first sign-in
- [ ] Add migration progress indicator
- [ ] Test with large datasets (1000+ entries)
- [ ] Update React Query hooks to use Firestore
- [ ] Write tests for Firestore operations
- [ ] Write tests for migration logic

### Firestore Data Model

**Collection Structure:**
```
users/{userId}/entries/{entryId}
```

**Document Schema:**
```javascript
{
  id: string,           // unique entry ID (keep same as IndexedDB)
  type: string,         // "income" | "donation"
  amount: number,       // amount in shekels
  date: timestamp,      // Firestore timestamp
  note: string,         // optional note (max 500 chars)
  maaser: number,       // calculated ma'aser (for income only)
  createdAt: timestamp, // when entry was created
  updatedAt: timestamp, // when entry was last updated
  synced: boolean       // sync status (for offline handling)
}
```

**Indexes:**
- `type` + `date` (for filtering by type and sorting)
- `date` (for date range queries)

### Migration Strategy

**Phase 1: Initial Migration (First Sign-In)**
1. User signs in for the first time
2. Check if IndexedDB has data
3. If yes:
   - Show migration dialog: "Migrating your local data to cloud..."
   - Read all entries from IndexedDB
   - Upload to Firestore (batch writes for performance)
   - Verify upload success
   - Mark migration as complete
4. If no: Start fresh

**Phase 2: Keep IndexedDB for Offline**
- IndexedDB remains as local cache
- Firestore is source of truth
- Sync logic handles offline/online transitions

### Firestore Service Functions

```javascript
// src/services/firestore.js

export const addEntryToFirestore = async (userId, entry) => { ... }
export const updateEntryInFirestore = async (userId, entryId, updates) => { ... }
export const deleteEntryFromFirestore = async (userId, entryId) => { ... }
export const getEntriesFromFirestore = async (userId) => { ... }
export const getEntriesByTypeFromFirestore = async (userId, type) => { ... }

// Migration functions
export const migrateIndexedDBToFirestore = async (userId) => { ... }
export const isMigrationComplete = async (userId) => { ... }
```

### React Query Integration

Update hooks to use Firestore:
```javascript
// src/hooks/useEntries.js
export function useEntries() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['entries', user?.uid],
    queryFn: () => getEntriesFromFirestore(user.uid),
    enabled: !!user,
  });
}
```

### Error Handling

- Handle Firestore quota limits
- Handle network errors
- Show user-friendly error messages
- Retry failed operations
- Backup data if migration fails

### Testing

- [ ] Test CRUD operations
- [ ] Test migration with 0 entries
- [ ] Test migration with 1 entry
- [ ] Test migration with 100+ entries
- [ ] Test migration failure scenarios
- [ ] Test concurrent writes (multiple devices)
- [ ] Test offline behavior (covered in #33)

### Estimated Time
12-15 hours

---

## Issue #33: Offline-First Sync Logic

**Title:** Implement Offline-First Sync Between IndexedDB and Firestore

**Labels:** `enhancement`, `sync`, `P0-critical`
**Assignee:** @DubiWork
**Milestone:** Phase 1.5 - Authentication & Cloud
**Story Points:** 3 SP
**Blocked by:** #32 (Firestore Data Model)

### Description

Implement robust offline-first synchronization logic so users can use the app offline and changes sync automatically when back online.

### Acceptance Criteria

- [ ] Implement bidirectional sync (IndexedDB ↔ Firestore)
- [ ] Handle offline operations (queue mutations)
- [ ] Implement conflict resolution (last-write-wins)
- [ ] Add sync status indicator in UI
- [ ] Handle network state changes (online/offline)
- [ ] Implement background sync when app regains connectivity
- [ ] Test offline mode thoroughly
- [ ] Test rapid online/offline switching
- [ ] Write tests for sync logic
- [ ] Add sync retry logic for failed operations

### Sync Strategy

**Offline-First Principle:**
1. All writes go to IndexedDB first (instant UI update)
2. Queue write operation for Firestore sync
3. When online, sync to Firestore
4. On success, mark operation as synced
5. On failure, retry with exponential backoff

**Data Flow:**
```
User Action (Add/Edit/Delete)
    ↓
Write to IndexedDB (immediate)
    ↓
Update UI (optimistic update)
    ↓
Queue Firestore Operation
    ↓
[If Online] → Sync to Firestore
    ↓
[If Offline] → Wait for connectivity
    ↓
Retry on failure
```

### Components to Create/Update

```
src/
├── services/
│   └── sync.js              # Sync service
├── contexts/
│   └── SyncProvider.jsx     # Sync context for status
├── components/
│   └── SyncIndicator.jsx    # Shows sync status in UI
└── hooks/
    └── useSync.js           # Custom hook for sync operations
```

### Sync Service Functions

```javascript
// src/services/sync.js

export const syncEntry = async (userId, operation, entry) => { ... }
export const processSyncQueue = async (userId) => { ... }
export const getUnsyncedEntries = async () => { ... }
export const markAsSynced = async (entryId) => { ... }
export const onConnectivityChange = (callback) => { ... }
```

### Conflict Resolution

**Strategy: Last-Write-Wins**
- Each entry has `updatedAt` timestamp
- On sync conflict, keep entry with latest `updatedAt`
- User always sees the most recent version
- Simple, predictable behavior

**Alternative (Future):** Operational transformation for complex conflicts

### Sync Status Indicator

**UI States:**
- ✅ **Synced:** Green checkmark icon
- 🔄 **Syncing:** Animated spinner
- ⏸️ **Offline:** Yellow warning icon + "X items pending sync"
- ❌ **Sync Error:** Red error icon + "Retry" button

**Placement:** Top-right corner of app bar (subtle)

### React Query Integration

```javascript
// Update mutations to queue sync operations
export function useAddEntry() {
  const { user } = useAuth();
  const { queueSync } = useSync();

  return useMutation({
    mutationFn: async (entry) => {
      // Write to IndexedDB first
      await addEntry(entry);

      // Queue sync to Firestore
      queueSync(user.uid, 'add', entry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['entries']);
    },
  });
}
```

### Testing

- [ ] Test offline add/edit/delete
- [ ] Test sync when coming back online
- [ ] Test conflict resolution
- [ ] Test rapid offline/online switching
- [ ] Test sync queue persistence
- [ ] Test background sync
- [ ] Test sync retry logic
- [ ] Test with poor network conditions (throttling)

### Estimated Time
12-15 hours

---

## Issue #34: User Profile & Settings

**Title:** Implement User Profile and Settings Screen

**Labels:** `enhancement`, `frontend`, `P1-high`
**Assignee:** @DubiWork
**Milestone:** Phase 1.5 - Authentication & Cloud
**Story Points:** 1 SP
**Blocked by:** #31 (Firebase Authentication)

### Description

Create a user profile and settings screen where users can view their profile info, manage preferences, and access account actions.

### Acceptance Criteria

- [ ] Create Settings/Profile screen
- [ ] Show user information (name, email, photo)
- [ ] Display account statistics (total entries, total donated, etc.)
- [ ] Add language preference toggle
- [ ] Add theme preference (light/dark - future)
- [ ] Add sign-out button
- [ ] Add export data option (downloads JSON backup)
- [ ] Add delete account option (with confirmation)
- [ ] Update navigation to include Settings
- [ ] Write tests for Settings component

### UI Layout

**Settings Screen Sections:**

1. **User Profile**
   - Avatar (large, circular)
   - Display name
   - Email address
   - "Signed in with Google" badge

2. **Account Statistics**
   - Total entries: X
   - Total income: ₪X
   - Total donations: ₪X
   - Ma'aser owed: ₪X

3. **Preferences**
   - Language: Hebrew / English toggle
   - Theme: Light / Dark / Auto (future)

4. **Data Management**
   - Export Data (JSON download)
   - Import Data (upload JSON - future)

5. **Account Actions**
   - Sign Out (button)
   - Delete Account (danger button with confirmation)

### Export Data Format

```json
{
  "exportDate": "2026-03-01T10:00:00Z",
  "user": {
    "uid": "user-id",
    "email": "user@example.com"
  },
  "entries": [
    {
      "id": "entry-1",
      "type": "income",
      "amount": 1000,
      "date": "2026-03-01",
      "note": "Salary",
      "maaser": 100
    }
  ]
}
```

### Delete Account Flow

1. User clicks "Delete Account"
2. Show confirmation dialog:
   - "Are you sure you want to delete your account?"
   - "This will permanently delete all your data."
   - "This action cannot be undone."
3. User must type "DELETE" to confirm
4. On confirm:
   - Delete all user data from Firestore
   - Delete Firebase Auth account
   - Sign out
   - Redirect to sign-in screen

### Navigation

Add Settings icon to app bar (gear icon):
- Click opens Settings screen (full page)
- Or use bottom navigation (5th tab)

### Testing

- [ ] Test settings screen rendering
- [ ] Test export data functionality
- [ ] Test language toggle
- [ ] Test sign-out
- [ ] Test delete account flow
- [ ] Test statistics calculation

### Estimated Time
4-6 hours

---

## Summary

**Total Story Points:** 10 SP
**Total Estimated Time:** 40-52 hours
**Priority:** P0-Critical (blocks public launch)

**Implementation Order:**
1. Issue #30 → #31 → #32 → #33 → #34
2. Must complete all before announcing to users
3. Current deployment is BETA ONLY (add warning banner)
