# Migration Implementation Guide

Technical documentation for the IndexedDB to Firestore migration system in Ma'aser Tracker.

**Document Version:** 1.0
**Last Updated:** 2026-03-04
**Owner:** Development Team
**Status:** Production Ready

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [API Documentation](#2-api-documentation)
3. [Code Examples](#3-code-examples)
4. [Testing Guide](#4-testing-guide)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
+------------------+     +------------------+     +------------------+
|   MigrationPrompt|---->|   useMigration   |---->| migrationEngine  |
|   (UI Component) |     |   (React Hook)   |     |   (Core Logic)   |
+------------------+     +------------------+     +------------------+
         |                       |                       |
         v                       v                       v
+------------------+     +------------------+     +------------------+
|MigrationError    |     |   networkMonitor |     |firestoreMigration|
|Handler (UI)      |     |   (Network Svc)  |     |Service (Firestore|
+------------------+     +------------------+     +------------------+
                                 |                       |
                                 v                       v
                         +------------------+     +------------------+
                         |   Browser APIs   |     |migrationStatus   |
                         |   (navigator)    |     |Service (Tracking)|
                         +------------------+     +------------------+
                                                         |
                                                         v
                                                 +------------------+
                                                 |     Firebase     |
                                                 |    Firestore     |
                                                 +------------------+
```

### 1.2 Data Flow Diagram

```
IndexedDB (Local)                    Firestore (Cloud)
     |                                     ^
     | 1. Read all entries                 |
     v                                     |
+--------------------+                     |
| getAllIndexedDB    |                     |
| Entries()          |                     |
+--------------------+                     |
     |                                     |
     | 2. Validate entries                 |
     v                                     |
+--------------------+                     |
| validateEntry      |                     |
| ForFirestore()     |                     |
+--------------------+                     |
     |                                     |
     | 3. Check duplicates                 |
     v                                     |
+--------------------+                     |
| compareTimestamps()|                     |
| Last-Write-Wins    |                     |
+--------------------+                     |
     |                                     |
     | 4. Batch write (500 max)            |
     v                                     |
+--------------------+                     |
| batchWriteEntries()|--------------------+
| (Atomic batches)   |
+--------------------+
     |
     | 5. Verify counts
     v
+--------------------+
| verifyMigration()  |
| Check consistency  |
+--------------------+
     |
     | 6. Mark complete
     v
+--------------------+
| markMigration      |
| Complete()         |
+--------------------+
```

### 1.3 State Machine Diagram

```
                        +-------------+
                        |  NotStarted |
                        +-------------+
                              |
                              | User signs in
                              v
                        +-------------+
                        |   Checking  |<------------+
                        +-------------+             |
                              |                     |
                              | Has local data      | Retry
                              v                     |
                        +-------------+             |
                        |   Consent   |             |
                        |   Pending   |             |
                        +-------------+             |
                         /          \               |
                Accept /            \ Decline       |
                      v              v              |
               +-------------+  +-------------+    |
               | InProgress  |  |  Declined   |    |
               +-------------+  +-------------+    |
                 |    |   \                        |
        Success  |    |    \ Network Error        |
                 v    |     v                      |
          +------+    |  +-------------+           |
          |Completed| |  |   Paused    |-----------+
          +------+    |  +-------------+
                      |         |
               Cancel |         | User cancels
                      v         v
               +-------------+
               |  Cancelled  |
               +-------------+
```

### 1.4 Service Responsibilities

| Service | Responsibility | Dependencies |
|---------|---------------|--------------|
| `firestoreMigrationService` | Firestore CRUD operations, validation, duplicate handling | Firebase SDK |
| `migrationStatusService` | Track migration state, prevent re-migration | Firebase SDK |
| `migrationEngine` | Orchestrate migration, batch processing, error recovery | All services |
| `networkMonitor` | Connection detection, retry logic, backoff | Browser APIs |

---

## 2. API Documentation

### 2.1 firestoreMigrationService

Location: `src/services/firestoreMigrationService.js`

#### `batchWriteEntries(userId, entries)`

Writes entries to Firestore in batches of 500 (Firestore limit).

**Parameters:**
- `userId` (string): User ID from Firebase Auth (must match authenticated user)
- `entries` (Array): Array of entry objects to write

**Returns:** `Promise<{ success: number, failed: Array<{ id: string, error: string }> }>`

**Throws:**
- `migration/not-authenticated` - User not signed in
- `migration/user-mismatch` - userId doesn't match authenticated user
- `migration/network-error` - Network failure
- `migration/quota-exceeded` - Firestore quota exceeded

**Example:**
```javascript
import { batchWriteEntries } from './services/firestoreMigrationService';

const result = await batchWriteEntries('user123', entries);
console.log(`Wrote ${result.success} entries`);
console.log(`Failed: ${result.failed.length} entries`);
```

#### `getEntryCount(userId)`

Gets the total count of entries in Firestore for a user.

**Parameters:**
- `userId` (string): User ID (must match authenticated user)

**Returns:** `Promise<number>` - Total entry count

**Example:**
```javascript
const count = await getEntryCount('user123');
console.log(`User has ${count} entries in Firestore`);
```

#### `checkEntryExists(userId, entryId)`

Checks if a specific entry exists in Firestore.

**Parameters:**
- `userId` (string): User ID
- `entryId` (string): Entry ID to check

**Returns:** `Promise<boolean>` - True if entry exists

#### `deleteAllUserEntries(userId)`

Deletes all entries for a user (GDPR Article 17 compliance).

**Parameters:**
- `userId` (string): User ID

**Returns:** `Promise<number>` - Number of deleted entries

#### `compareTimestamps(localEntry, firestoreEntry)`

Compares timestamps for duplicate detection (last-write-wins strategy).

**Parameters:**
- `localEntry` (Object): Entry from IndexedDB
- `firestoreEntry` (Object): Entry from Firestore

**Returns:** `'local' | 'firestore' | 'equal'` - Which entry is newer

#### `validateEntryForFirestore(entry)`

Validates an entry before writing to Firestore.

**Parameters:**
- `entry` (Object): Entry to validate

**Returns:** `{ valid: boolean, errors: string[] }` - Validation result

**Validation Rules:**
- `id` - Required, non-empty string
- `type` - Required, must be 'income' or 'donation'
- `date` - Required, valid ISO date string
- `amount` - Required, positive number, max 1 billion
- `note/description` - Optional, max 500 characters
- `accountingMonth` - Optional, must be YYYY-MM format

---

### 2.2 migrationStatusService

Location: `src/services/migrationStatusService.js`

#### `checkMigrationStatus(userId)`

Checks if migration has already been completed.

**Parameters:**
- `userId` (string): User ID

**Returns:**
```typescript
Promise<{
  completed: boolean;
  completedAt: Date | null;
  version: string | null;
  entriesMigrated: number | null;
  cancelled: boolean;
  cancelledAt: Date | null;
  cancelReason: string | null;
}>
```

**Example:**
```javascript
import { checkMigrationStatus } from './services/migrationStatusService';

const status = await checkMigrationStatus('user123');
if (status.completed) {
  console.log(`Migration completed at ${status.completedAt}`);
  console.log(`Migrated ${status.entriesMigrated} entries`);
}
```

#### `markMigrationComplete(userId, metadata)`

Marks migration as successfully completed.

**Parameters:**
- `userId` (string): User ID
- `metadata` (Object):
  - `entriesMigrated` (number): Count of migrated entries (required)
  - `device` (string): Device info (optional)
  - `source` (string): Source system (default: 'indexeddb')

**Returns:** `Promise<boolean>` - True if marked successfully

**Throws:**
- `migration-status/already-completed` - Migration already done

**Example:**
```javascript
await markMigrationComplete('user123', {
  entriesMigrated: 150,
  device: navigator.userAgent,
});
```

#### `markMigrationCancelled(userId, metadata)`

Marks migration as cancelled by user (GDPR Article 7.3).

**Parameters:**
- `userId` (string): User ID
- `metadata` (Object):
  - `entriesProcessed` (number): Entries processed before cancel
  - `reason` (string): Cancellation reason

**Returns:** `Promise<boolean>` - True if marked successfully

---

### 2.3 migrationEngine

Location: `src/services/migrationEngine.js`

#### `migrateAllEntries(userId, options)`

Main migration function that orchestrates the complete migration process.

**Parameters:**
- `userId` (string): User ID from Firebase Auth
- `options` (Object):
  - `onProgress` (Function): Progress callback `(completed, total) => void`
  - `onBatchComplete` (Function): Batch callback `(batchNumber, entriesInBatch) => void`
  - `signal` (AbortSignal): For cancellation support
  - `batchSize` (number): Batch size (default: 500)

**Returns:**
```typescript
Promise<{
  success: boolean;
  entriesMigrated: number;
  entriesFailed: number;
  entriesSkipped: number;
  failedEntries: Array<{ id: string, error: string }>;
  duration: number;        // Milliseconds
  cancelled: boolean;
  verificationResult?: {
    verified: boolean;
    firestoreCount: number;
    expectedCount: number;
  };
}>
```

**Example:**
```javascript
import { migrateAllEntries } from './services/migrationEngine';

const abortController = new AbortController();

const result = await migrateAllEntries('user123', {
  onProgress: (completed, total) => {
    console.log(`Progress: ${completed}/${total} (${Math.round(completed/total*100)}%)`);
  },
  onBatchComplete: (batchNumber, count) => {
    console.log(`Batch ${batchNumber} complete (${count} entries)`);
  },
  signal: abortController.signal,
});

if (result.success) {
  console.log(`Migration complete! ${result.entriesMigrated} entries migrated`);
} else if (result.cancelled) {
  console.log('Migration was cancelled by user');
} else {
  console.log(`Migration failed: ${result.entriesFailed} entries failed`);
}
```

#### `cancelMigration(userId, entriesProcessed, reason)`

Cancels migration and cleans up partial data.

**Parameters:**
- `userId` (string): User ID
- `entriesProcessed` (number): Entries processed before cancel
- `reason` (string): Cancellation reason

**Example:**
```javascript
await cancelMigration('user123', 50, 'User clicked cancel button');
```

#### `verifyMigration(userId, expectedCount)`

Verifies migration integrity by comparing entry counts.

**Parameters:**
- `userId` (string): User ID
- `expectedCount` (number): Expected entries in Firestore

**Returns:**
```typescript
{
  verified: boolean;
  firestoreCount: number;
  expectedCount: number;
  reason: string;
}
```

---

### 2.4 networkMonitor

Location: `src/services/networkMonitor.js`

#### `isOnline()`

Checks if the browser is currently online.

**Returns:** `boolean`

#### `getConnectionType()`

Gets the current connection type.

**Returns:** `'wifi' | 'cellular' | 'offline' | 'unknown'`

#### `shouldRecommendWiFi(entryCount)`

Determines if WiFi should be recommended based on entry count and connection type.

**Parameters:**
- `entryCount` (number): Number of entries to migrate

**Returns:** `boolean` - True if WiFi is recommended

**Threshold:** Recommends WiFi for >250 entries on cellular

#### `retryWithBackoff(operation, options)`

Retries an operation with exponential backoff.

**Parameters:**
- `operation` (Function): Async function to retry
- `options` (Object):
  - `maxRetries` (number): Maximum retries (default: 3)
  - `baseDelay` (number): Base delay in ms (default: 2000)
  - `signal` (AbortSignal): For cancellation
  - `onRetry` (Function): Callback before each retry
  - `checkNetwork` (boolean): Check network status (default: true)

**Example:**
```javascript
import { retryWithBackoff } from './services/networkMonitor';

const result = await retryWithBackoff(
  () => fetch('/api/data'),
  {
    maxRetries: 3,
    baseDelay: 2000, // 2s, 4s, 8s delays
    onRetry: (attempt, error, delay) => {
      console.log(`Retry ${attempt + 1} in ${delay}ms`);
    },
  }
);
```

#### `onConnectionChange(callback)`

Registers a callback for online/offline changes.

**Parameters:**
- `callback` (Function): `(isOnline: boolean) => void`

**Returns:** `Function` - Unsubscribe function

**Example:**
```javascript
const unsubscribe = onConnectionChange((online) => {
  console.log(online ? 'Back online!' : 'Gone offline');
});

// Later: unsubscribe();
```

#### `classifyError(error)`

Classifies an error for retry decisions.

**Returns:**
```typescript
{
  type: 'network' | 'quota' | 'auth' | 'unknown';
  retryable: boolean;
  waitTime: number;  // ms, e.g., 3600000 for quota
}
```

---

### 2.5 useMigration Hook

Location: `src/hooks/useMigration.js`

React hook for managing migration state in components.

**Parameters:**
- `userId` (string): User ID from Firebase Auth

**Returns:**
```typescript
{
  // State
  status: 'idle' | 'checking' | 'consent-pending' | 'in-progress' | 'paused' | 'completed' | 'cancelled' | 'failed';
  progress: { completed: number; total: number; percentage: number };
  currentBatch: number;
  errors: Array<{ code: string; message: string; messageKey: string; timestamp: Date }>;
  canRetry: boolean;

  // Actions
  startMigration: () => Promise<void>;
  cancelMigration: () => Promise<void>;
  retryMigration: () => Promise<void>;
  dismissError: () => void;
  recheckStatus: () => Promise<void>;

  // Helpers
  isInProgress: boolean;
  isCompleted: boolean;
  isPaused: boolean;
  isFailed: boolean;
}
```

**Example:**
```javascript
import { useMigration, MigrationStatus } from '../hooks/useMigration';

function MigrationComponent() {
  const { user } = useAuth();
  const {
    status,
    progress,
    startMigration,
    cancelMigration,
    isInProgress,
    isCompleted,
  } = useMigration(user?.uid);

  return (
    <div>
      <p>Status: {status}</p>
      {isInProgress && (
        <div>
          <progress value={progress.percentage} max={100} />
          <p>{progress.completed} / {progress.total} entries</p>
          <button onClick={cancelMigration}>Cancel</button>
        </div>
      )}
      {status === MigrationStatus.IDLE && (
        <button onClick={startMigration}>Start Migration</button>
      )}
      {isCompleted && <p>Migration complete!</p>}
    </div>
  );
}
```

---

## 3. Code Examples

### 3.1 Integrating MigrationPrompt Component

The `MigrationPrompt` component handles the complete migration UX.

```jsx
import { MigrationPrompt } from './components/MigrationPrompt';
import { AuthProvider } from './contexts/AuthProvider';

function App() {
  return (
    <AuthProvider>
      {/* MigrationPrompt shows automatically after sign-in */}
      <MigrationPrompt />

      {/* Rest of your app */}
      <Dashboard />
    </AuthProvider>
  );
}
```

**Props:**
- None required - uses `useAuth` and `useMigration` internally

**Behavior:**
1. Hidden by default
2. Checks migration status 3 seconds after sign-in
3. Shows consent dialog if user has local data
4. Shows progress during migration
5. Shows success/error states

### 3.2 Using useMigration Hook

Custom integration with migration logic:

```jsx
import { useMigration, MigrationStatus } from '../hooks/useMigration';
import { useAuth } from '../hooks/useAuth';

function SettingsPage() {
  const { user } = useAuth();
  const {
    status,
    progress,
    startMigration,
    retryMigration,
    canRetry,
    errors,
  } = useMigration(user?.uid);

  const handleManualSync = async () => {
    if (status === MigrationStatus.IDLE) {
      await startMigration();
    } else if (canRetry) {
      await retryMigration();
    }
  };

  return (
    <div>
      <h2>Data Sync</h2>

      {status === MigrationStatus.COMPLETED && (
        <p>Your data is synced to the cloud.</p>
      )}

      {status === MigrationStatus.IDLE && (
        <button onClick={handleManualSync}>
          Sync to Cloud
        </button>
      )}

      {status === MigrationStatus.IN_PROGRESS && (
        <div>
          <p>Syncing: {progress.percentage}%</p>
          <progress value={progress.percentage} max={100} />
        </div>
      )}

      {errors.length > 0 && (
        <div>
          <p>Error: {errors[0].message}</p>
          {canRetry && (
            <button onClick={retryMigration}>Try Again</button>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3.3 Handling Migration Errors

Using `MigrationErrorHandler` component:

```jsx
import { MigrationErrorHandler } from './components/MigrationErrorHandler';

function MigrationContainer() {
  const { errors, retryMigration, dismissError, canRetry } = useMigration(userId);

  if (errors.length > 0) {
    return (
      <MigrationErrorHandler
        open={true}
        error={errors[0]}
        onRetry={canRetry ? retryMigration : undefined}
        onClose={dismissError}
        partialSuccess={partialSuccessData}
      />
    );
  }

  return <MigrationProgress />;
}
```

### 3.4 Testing Migration Locally

Using Firebase Emulator for local testing:

```bash
# Start Firebase Emulator
firebase emulators:start --only firestore,auth

# Set environment variable
VITE_USE_FIREBASE_EMULATOR=true npm run dev
```

In your `.env.local`:
```bash
VITE_USE_FIREBASE_EMULATOR=true
```

---

## 4. Testing Guide

### 4.1 Unit Test Patterns

Testing services with Vitest:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { migrateAllEntries } from '../services/migrationEngine';

// Mock dependencies
vi.mock('../services/db', () => ({
  getAllEntries: vi.fn(),
}));

vi.mock('../services/firestoreMigrationService', () => ({
  batchWriteEntries: vi.fn(),
  getEntryCount: vi.fn(),
  checkEntryExists: vi.fn(),
  getEntry: vi.fn(),
  deleteAllUserEntries: vi.fn(),
  compareTimestamps: vi.fn(),
  getBatchSize: vi.fn(() => 500),
}));

describe('migrationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should migrate entries successfully', async () => {
    // Setup
    const mockEntries = [
      { id: '1', type: 'income', amount: 100, date: '2026-01-01' },
    ];
    getAllEntries.mockResolvedValue(mockEntries);
    batchWriteEntries.mockResolvedValue({ success: 1, failed: [] });
    checkMigrationStatus.mockResolvedValue({ completed: false });
    getEntryCount.mockResolvedValue(1);

    // Execute
    const result = await migrateAllEntries('user123');

    // Assert
    expect(result.success).toBe(true);
    expect(result.entriesMigrated).toBe(1);
  });
});
```

### 4.2 Integration Test Patterns

Testing service interactions:

```javascript
describe('Migration Integration', () => {
  it('should handle network error and retry', async () => {
    const networkError = new Error('Network error');
    networkError.code = 'migration/network-error';

    batchWriteEntries
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce({ success: 1, failed: [] });

    const onRetry = vi.fn();
    const result = await retryWithBackoff(
      () => batchWriteEntries('user123', entries),
      { maxRetries: 3, onRetry }
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(1);
  });
});
```

### 4.3 E2E Test Scenarios

Using Cypress or Playwright:

```javascript
describe('Migration E2E', () => {
  beforeEach(() => {
    // Seed IndexedDB with test data
    cy.window().then((win) => {
      return win.indexedDB.databases().then(() => {
        // Add test entries to IndexedDB
      });
    });
  });

  it('should complete migration flow', () => {
    // Sign in
    cy.get('[data-testid="sign-in-button"]').click();

    // Wait for consent dialog
    cy.get('[data-testid="migration-consent-dialog"]').should('be.visible');

    // Accept migration
    cy.get('[data-testid="accept-migration"]').click();

    // Wait for progress
    cy.get('[data-testid="migration-progress"]').should('be.visible');

    // Wait for completion
    cy.get('[data-testid="migration-success"]', { timeout: 30000 }).should('be.visible');

    // Verify data in Firestore
    cy.task('verifyFirestoreData', { userId: 'test-user' });
  });
});
```

### 4.4 Firebase Emulator Setup

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Start emulators:
```bash
firebase emulators:start --only firestore,auth
```

3. Configure environment:
```javascript
// src/lib/firebase.js
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}
```

### 4.5 Performance Testing

Benchmark test patterns:

```javascript
describe('Performance Benchmarks', () => {
  const benchmarks = [
    { entries: 100, maxTime: 5000 },
    { entries: 500, maxTime: 15000 },
    { entries: 1000, maxTime: 30000 },
  ];

  benchmarks.forEach(({ entries, maxTime }) => {
    it(`should migrate ${entries} entries within ${maxTime}ms`, async () => {
      const mockEntries = generateTestEntries(entries);
      getAllEntries.mockResolvedValue(mockEntries);

      const startTime = Date.now();
      await migrateAllEntries('user123');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(maxTime);
    });
  });
});
```

---

## 5. Troubleshooting

### Common Development Issues

#### Firebase not initialized
```
Error: Firebase: No Firebase App '[DEFAULT]' has been created
```
**Solution:** Ensure `.env.local` has all Firebase variables and app restarts after changes.

#### Tests fail with Firestore mock issues
```
Error: Cannot read property 'collection' of undefined
```
**Solution:** Mock Firebase before importing services:
```javascript
vi.mock('../lib/firebase', () => ({
  db: {},
  isAuthenticated: vi.fn(() => true),
  getCurrentUserId: vi.fn(() => 'test-user'),
}));
```

#### Migration stuck at 0%
**Cause:** IndexedDB read failed or returned empty
**Debug:**
```javascript
const entries = await getAllEntries();
console.log('Entries to migrate:', entries.length);
```

#### Network error during migration
**Cause:** Lost connection or Firestore unavailable
**Solution:** Migration auto-pauses and can be retried when online

### Debug Logging

Enable debug logging in development:
```javascript
if (import.meta.env.DEV) {
  console.log('Migration Engine: Debug info...');
}
```

All services log to console in development mode.

---

## Appendix: Error Codes Reference

| Code | Description | Retryable |
|------|-------------|-----------|
| `migration/network-error` | Network connection lost | Yes |
| `migration/quota-exceeded` | Firestore quota hit | No (wait 1 hour) |
| `migration/not-authenticated` | User not signed in | No |
| `migration/user-mismatch` | User ID doesn't match | No |
| `migration/invalid-entry` | Entry validation failed | No |
| `migration-engine/cancelled` | User cancelled migration | N/A |
| `migration-engine/already-completed` | Already migrated | N/A |

---

**Related Documentation:**
- [Migration Rollout Plan](MIGRATION_ROLLOUT.md)
- [Migration Troubleshooting](MIGRATION_TROUBLESHOOTING.md)
- [Migration FAQ](MIGRATION_FAQ.md)
- [Performance Benchmarks](PERFORMANCE_BENCHMARKS.md)
