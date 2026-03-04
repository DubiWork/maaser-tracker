# Issue #40: Comprehensive Test Plan
## IndexedDB to Firestore Migration

**Document Version:** 1.0
**Created:** 2026-03-03
**Last Updated:** 2026-03-03
**Owner:** QA Expert
**Status:** Ready for Review

---

## Table of Contents

1. [Test Strategy Overview](#section-1-test-strategy-overview)
2. [Unit Test Cases (Backend Services)](#section-2-unit-test-cases-backend-services)
3. [Integration Test Cases](#section-3-integration-test-cases)
4. [E2E Test Cases (User Flows)](#section-4-e2e-test-cases-user-flows)
5. [Manual Test Cases](#section-5-manual-test-cases)
6. [Performance Test Cases](#section-6-performance-test-cases)
7. [Security & Compliance Test Cases](#section-7-security--compliance-test-cases)
8. [Browser/Device Compatibility](#section-8-browserdevice-compatibility)
9. [Test Data](#section-9-test-data)
10. [Test Execution Checklist](#section-10-test-execution-checklist)
11. [Bug Reporting Template](#section-11-bug-reporting-template)
12. [Success Criteria](#section-12-success-criteria)

---

## Section 1: Test Strategy Overview

### 1.1 Testing Approach

This test plan follows the **Test Pyramid** approach:

```
          /\
         /  \
        / E2E\          10% - Critical user journeys
       /------\
      /  INT   \        20% - Service interactions
     /----------\
    /    UNIT    \      70% - Individual functions
   /--------------\
```

**Test Distribution:**
- **70% Unit Tests:** Individual service functions, validation, error handling
- **20% Integration Tests:** Service interactions, IndexedDB-Firestore flow
- **10% E2E Tests:** Complete user journeys from sign-in to completion

### 1.2 Coverage Goals

| Layer | Metric | Target | Required |
|-------|--------|--------|----------|
| Services (`src/services/**`) | Statements | >= 80% | Yes |
| Services (`src/services/**`) | Branches | >= 75% | Yes |
| Services (`src/services/**`) | Functions | >= 80% | Yes |
| Services (`src/services/**`) | Lines | >= 80% | Yes |
| Components | Statements | >= 60% | No (Best effort) |
| Hooks | Statements | >= 70% | No (Best effort) |

### 1.3 Tools Used

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Vitest** | Unit & Integration tests | `vitest.config.js` |
| **jsdom** | DOM simulation | Test environment |
| **fake-indexeddb** | IndexedDB mocking | Auto-import in setup.js |
| **Testing Library** | Component tests | `@testing-library/react` |
| **Firebase Emulator** | Firestore testing | Local emulator suite |
| **Netlify Preview** | E2E staging | PR preview deployments |

### 1.4 Test Environments

| Environment | Purpose | URL/Config |
|-------------|---------|------------|
| **Local Development** | Development testing | `localhost:5173` |
| **CI (GitHub Actions)** | Automated tests | `.github/workflows/ci.yml` |
| **Netlify Preview** | E2E & Manual tests | `deploy-preview-<PR#>--maaser-tracker.netlify.app` |
| **Firebase Emulator** | Firestore unit tests | `localhost:8080` (Firestore) |

### 1.5 Test Data Management

- **Unit Tests:** Mocked data created inline
- **Integration Tests:** Generated test datasets (10, 100, 500 entries)
- **E2E Tests:** Pre-populated IndexedDB with test data
- **Performance Tests:** Generated datasets (100, 500, 1000, 5000 entries)

---

## Section 2: Unit Test Cases (Backend Services)

### 2.1 firestoreMigrationService.js

**File:** `src/services/firestoreMigrationService.js`
**Test File:** `src/services/firestoreMigrationService.test.js`
**Coverage Target:** >= 80%

#### 2.1.1 batchWriteEntries()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| FMS-001 | Write single valid entry | 1 income entry | `{ success: 1, failed: [] }` | - |
| FMS-002 | Write multiple valid entries | 5 entries (3 income, 2 donation) | `{ success: 5, failed: [] }` | - |
| FMS-003 | Empty array | `[]` | `{ success: 0, failed: [] }` | Boundary |
| FMS-004 | Batch boundary (500 entries) | 500 entries | `{ success: 500, failed: [] }`, 1 batch commit | Boundary |
| FMS-005 | Exceeds batch size (501 entries) | 501 entries | `{ success: 501, failed: [] }`, 2 batch commits | Boundary |
| FMS-006 | Large dataset (1000 entries) | 1000 entries | `{ success: 1000, failed: [] }`, 2 batches | Performance |
| FMS-007 | Mixed valid/invalid entries | 3 valid, 2 invalid | `{ success: 3, failed: [2 items] }` | - |
| FMS-008 | All invalid entries | 3 invalid entries | `{ success: 0, failed: [3 items] }` | - |
| FMS-009 | Not authenticated | Any entries | Throws `NOT_AUTHENTICATED` | Auth |
| FMS-010 | User ID mismatch | Different userId | Throws `USER_MISMATCH` | Auth |
| FMS-011 | Invalid userId (null) | `null` | Throws `INVALID_USER_ID` | Validation |
| FMS-012 | Invalid userId (empty) | `""` | Throws `INVALID_USER_ID` | Validation |
| FMS-013 | Network error during commit | Any entries | Throws `NETWORK_ERROR` | Error |
| FMS-014 | Quota exceeded | Any entries | Throws `QUOTA_EXCEEDED` | Error |
| FMS-015 | Entry without accountingMonth | Entry missing field | Derives from date, succeeds | Derivation |
| FMS-016 | Entry with note field | Entry with `note` | Maps to `description` | Mapping |
| FMS-017 | Entry with description field | Entry with `description` | Uses `description` | Mapping |
| FMS-018 | Entry with both note and description | Both fields | Uses `note` | Mapping |
| FMS-019 | Not an array | `"not-array"` | Throws `INVALID_ENTRY` | Validation |
| FMS-020 | Uses merge option | Any entry | `set()` called with `{ merge: true }` | - |

#### 2.1.2 getEntryCount()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| FMS-021 | Empty collection | Valid userId | `0` | Boundary |
| FMS-022 | Non-empty collection | Valid userId, 42 entries | `42` | - |
| FMS-023 | Large collection | Valid userId, 5000 entries | `5000` | Performance |
| FMS-024 | Not authenticated | Any userId | Throws `NOT_AUTHENTICATED` | Auth |
| FMS-025 | User ID mismatch | Different userId | Throws `USER_MISMATCH` | Auth |
| FMS-026 | Network error | Valid userId | Throws `NETWORK_ERROR` | Error |

#### 2.1.3 checkEntryExists()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| FMS-027 | Entry exists | Valid userId, existing entryId | `true` | - |
| FMS-028 | Entry does not exist | Valid userId, non-existing entryId | `false` | - |
| FMS-029 | Invalid entryId (null) | Valid userId, `null` | Throws `INVALID_ENTRY` | Validation |
| FMS-030 | Invalid entryId (empty) | Valid userId, `""` | Throws `INVALID_ENTRY` | Validation |
| FMS-031 | Invalid entryId (whitespace) | Valid userId, `"   "` | Throws `INVALID_ENTRY` | Validation |
| FMS-032 | Not authenticated | Any inputs | Throws `NOT_AUTHENTICATED` | Auth |
| FMS-033 | Permission denied | Valid inputs | Throws `NOT_AUTHENTICATED` | Auth |

#### 2.1.4 getEntry()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| FMS-034 | Entry exists | Valid userId, entryId | Entry object | - |
| FMS-035 | Entry does not exist | Valid userId, non-existing | `null` | - |
| FMS-036 | Timestamp conversion | Entry with Firestore Timestamps | ISO string dates | - |
| FMS-037 | No Timestamps | Entry without Timestamps | Original values | - |
| FMS-038 | Invalid entryId | Valid userId, invalid entryId | Throws `INVALID_ENTRY` | Validation |
| FMS-039 | Not authenticated | Any inputs | Throws `NOT_AUTHENTICATED` | Auth |

#### 2.1.5 deleteAllUserEntries()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| FMS-040 | Empty collection | Valid userId | `0` | Boundary |
| FMS-041 | Delete 3 entries | Valid userId, 3 entries | `3` | - |
| FMS-042 | Delete 501 entries (2 batches) | Valid userId, 501 entries | `501`, 2 batch commits | Boundary |
| FMS-043 | Not authenticated | Any userId | Throws `NOT_AUTHENTICATED` | Auth |
| FMS-044 | User ID mismatch | Different userId | Throws `USER_MISMATCH` | Auth |
| FMS-045 | Network error during delete | Valid userId | Throws `NETWORK_ERROR` | Error |

#### 2.1.6 compareTimestamps()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| FMS-046 | Local newer | Local: 2026-03-02, Firestore: 2026-03-01 | `"local"` | - |
| FMS-047 | Firestore newer | Local: 2026-03-01, Firestore: 2026-03-02 | `"firestore"` | - |
| FMS-048 | Equal timestamps | Same timestamp | `"equal"` | - |
| FMS-049 | Only local entry | Local entry, `null` Firestore | `"local"` | - |
| FMS-050 | Only Firestore entry | `null` local, Firestore entry | `"firestore"` | - |
| FMS-051 | Both null | `null`, `null` | `"equal"` | Boundary |
| FMS-052 | Firestore Timestamp object | toDate() method | Correct comparison | Type |
| FMS-053 | Firestore Date object | Date instance | Correct comparison | Type |
| FMS-054 | Firestore string date | String date | Correct comparison | Type |
| FMS-055 | Missing updatedAt (local) | No updatedAt field | Uses 0 as fallback | Missing |
| FMS-056 | Invalid local timestamp | `"invalid-date"` | `"firestore"` | Invalid |
| FMS-057 | Invalid Firestore timestamp | `"invalid-date"` | `"local"` | Invalid |

#### 2.1.7 resolveDuplicate()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| FMS-058 | Entry does not exist | Valid entry, no Firestore | `{ shouldWrite: true, reason: "does not exist" }` | - |
| FMS-059 | Local is newer | Local newer timestamp | `{ shouldWrite: true, reason: "Local entry is newer" }` | - |
| FMS-060 | Firestore is newer | Firestore newer timestamp | `{ shouldWrite: false, reason: "Firestore entry is newer" }` | - |
| FMS-061 | Equal timestamps | Same timestamp | `{ shouldWrite: false, reason: "equal" }` | - |
| FMS-062 | Invalid local entry | `null` | `{ shouldWrite: false, reason: "Invalid" }` | Validation |
| FMS-063 | Not authenticated | Any inputs | Throws `NOT_AUTHENTICATED` | Auth |

#### 2.1.8 validateEntryForFirestore()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| FMS-064 | Valid income entry | Complete income entry | `{ valid: true, errors: [] }` | - |
| FMS-065 | Valid donation entry | Complete donation entry | `{ valid: true, errors: [] }` | - |
| FMS-066 | Null entry | `null` | `{ valid: false, errors: ["Entry must be an object"] }` | Null |
| FMS-067 | Missing id | No id field | `{ valid: false, errors: ["...valid id..."] }` | Validation |
| FMS-068 | Empty id | `id: ""` or `id: "   "` | `{ valid: false, errors: ["...valid id..."] }` | Validation |
| FMS-069 | Numeric id | `id: 123` | `{ valid: false, errors: ["...valid id..."] }` | Type |
| FMS-070 | Invalid type | `type: "expense"` | `{ valid: false, errors: ["...income or donation..."] }` | Validation |
| FMS-071 | Missing type | No type field | `{ valid: false, errors: ["...income or donation..."] }` | Validation |
| FMS-072 | Missing date | No date field | `{ valid: false, errors: ["...valid date..."] }` | Validation |
| FMS-073 | Invalid date format | `date: "not-a-date"` | `{ valid: false, errors: ["...valid ISO date..."] }` | Validation |
| FMS-074 | Valid date formats | `"2026-03-01"`, `"2026-03-01T12:00:00Z"` | `{ valid: true }` | - |
| FMS-075 | Missing amount | No amount field | `{ valid: false, errors: ["...valid amount..."] }` | Validation |
| FMS-076 | Zero amount | `amount: 0` | `{ valid: false, errors: ["...positive..."] }` | Boundary |
| FMS-077 | Negative amount | `amount: -100` | `{ valid: false, errors: ["...positive..."] }` | Validation |
| FMS-078 | NaN amount | `amount: NaN` | `{ valid: false, errors: ["...valid amount..."] }` | Invalid |
| FMS-079 | String amount | `amount: "1000"` | `{ valid: false, errors: ["...valid amount..."] }` | Type |
| FMS-080 | Amount exceeds max | `amount: 1000000001` | `{ valid: false, errors: ["...exceed..."] }` | Boundary |
| FMS-081 | Max valid amount | `amount: 999999999` | `{ valid: true }` | Boundary |
| FMS-082 | Non-string note | `note: 123` | `{ valid: false, errors: ["...string..."] }` | Type |
| FMS-083 | Note exceeds max length | 501 character note | `{ valid: false, errors: ["...500 characters..."] }` | Boundary |
| FMS-084 | Max valid note | 500 character note | `{ valid: true }` | Boundary |
| FMS-085 | Empty note | `note: ""` | `{ valid: true }` | Boundary |
| FMS-086 | Invalid accountingMonth | `"2026-13"`, `"2026-00"` | `{ valid: false, errors: ["...YYYY-MM..."] }` | Validation |
| FMS-087 | Valid accountingMonth | `"2026-01"`, `"2026-12"` | `{ valid: true }` | Boundary |
| FMS-088 | Missing accountingMonth | No field | `{ valid: true }` (derived from date) | Optional |
| FMS-089 | Multiple validation errors | Multiple invalid fields | All errors collected | Multiple |

---

### 2.2 migrationStatusService.js

**File:** `src/services/migrationStatusService.js`
**Test File:** `src/services/migrationStatusService.test.js`
**Coverage Target:** >= 80%

#### 2.2.1 checkMigrationStatus()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| MSS-001 | No migration document | Valid userId | `{ completed: false, completedAt: null, ... }` | Not started |
| MSS-002 | Migration completed | Valid userId | `{ completed: true, completedAt: Date, ... }` | - |
| MSS-003 | Migration cancelled | Valid userId | `{ completed: false, cancelled: true, ... }` | - |
| MSS-004 | Timestamp conversion | Firestore Timestamp | `completedAt` as Date | Type |
| MSS-005 | Date object timestamp | Date instance | `completedAt` as Date | Type |
| MSS-006 | String timestamp | String date | `completedAt` as Date | Type |
| MSS-007 | Not authenticated | Any userId | Throws `NOT_AUTHENTICATED` | Auth |
| MSS-008 | User ID mismatch | Different userId | Throws `USER_MISMATCH` | Auth |
| MSS-009 | Invalid userId (null) | `null` | Throws `INVALID_USER_ID` | Validation |
| MSS-010 | Network error (retry) | Valid userId | Retries with backoff | Retry |
| MSS-011 | Network error (exhausted) | Valid userId, persistent error | Throws `NETWORK_ERROR` | Error |
| MSS-012 | Permission denied | Valid userId | Throws `PERMISSION_DENIED` | Auth |

#### 2.2.2 markMigrationComplete()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| MSS-013 | Mark complete successfully | Valid userId, metadata | `true` | - |
| MSS-014 | Already completed | Valid userId (completed) | Throws `ALREADY_COMPLETED` | Duplicate |
| MSS-015 | Invalid metadata (null) | `null` | Throws `INVALID_METADATA` | Validation |
| MSS-016 | Invalid metadata (not object) | `"string"` | Throws `INVALID_METADATA` | Type |
| MSS-017 | Missing entriesMigrated | `{}` | Throws `INVALID_METADATA` | Validation |
| MSS-018 | Negative entriesMigrated | `{ entriesMigrated: -1 }` | Throws `INVALID_METADATA` | Validation |
| MSS-019 | NaN entriesMigrated | `{ entriesMigrated: NaN }` | Throws `INVALID_METADATA` | Validation |
| MSS-020 | Zero entriesMigrated | `{ entriesMigrated: 0 }` | `true` (valid) | Boundary |
| MSS-021 | Not authenticated | Any inputs | Throws `NOT_AUTHENTICATED` | Auth |
| MSS-022 | Network error (retry) | Valid inputs | Retries with backoff | Retry |
| MSS-023 | Saves to history collection | Valid inputs | History document created | Audit |
| MSS-024 | History save failure | History write fails | Main operation succeeds | Graceful |

#### 2.2.3 markMigrationCancelled()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| MSS-025 | Cancel successfully | Valid userId | `true` | - |
| MSS-026 | Cancel with metadata | Valid userId, metadata | `true`, reason saved | - |
| MSS-027 | Cancel null metadata | Valid userId, `null` | `true`, default reason | Null |
| MSS-028 | Cancel undefined metadata | Valid userId, `undefined` | `true`, default reason | Undefined |
| MSS-029 | Already completed | Valid userId (completed) | Throws `ALREADY_COMPLETED` | - |
| MSS-030 | Invalid entriesProcessed | `{ entriesProcessed: -1 }` | Throws `INVALID_METADATA` | Validation |
| MSS-031 | Not authenticated | Any inputs | Throws `NOT_AUTHENTICATED` | Auth |
| MSS-032 | Network error (retry) | Valid inputs | Retries with backoff | Retry |
| MSS-033 | Saves to history collection | Valid inputs | History document created | Audit |

#### 2.2.4 getMigrationHistory()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| MSS-034 | No history | Valid userId | `[]` or current status | Empty |
| MSS-035 | History exists | Valid userId | Array of events | - |
| MSS-036 | History with completed | Completed migration | Event with `eventType: "completed"` | - |
| MSS-037 | History with cancelled | Cancelled migration | Event with `eventType: "cancelled"` | - |
| MSS-038 | Timestamp conversion | Firestore Timestamps | All converted to Date | Type |
| MSS-039 | Not authenticated | Any userId | Throws `NOT_AUTHENTICATED` | Auth |
| MSS-040 | Network error (retry) | Valid userId | Retries with backoff | Retry |

---

### 2.3 migrationEngine.js

**File:** `src/services/migrationEngine.js`
**Test File:** `src/services/migrationEngine.test.js`
**Coverage Target:** >= 80%

#### 2.3.1 migrateAllEntries()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| ME-001 | Already completed | Valid userId | Throws `ALREADY_COMPLETED` | Duplicate |
| ME-002 | Empty IndexedDB | Valid userId, no entries | `{ success: true, entriesMigrated: 0, ... }` | Empty |
| ME-003 | Small dataset (10 entries) | Valid userId, 10 entries | `{ success: true, entriesMigrated: 10, ... }` | - |
| ME-004 | Medium dataset (100 entries) | Valid userId, 100 entries | `{ success: true, entriesMigrated: 100, ... }` | - |
| ME-005 | Large dataset (500 entries) | Valid userId, 500 entries | `{ success: true, entriesMigrated: 500, ... }` | Boundary |
| ME-006 | Very large dataset (1000 entries) | Valid userId, 1000 entries | `{ success: true, entriesMigrated: 1000, ... }` | Performance |
| ME-007 | Progress callback | Valid userId, entries | `onProgress` called with (completed, total) | Callback |
| ME-008 | Batch complete callback | Valid userId, entries | `onBatchComplete` called | Callback |
| ME-009 | Callback error handling | Callback throws | Migration continues | Graceful |
| ME-010 | Cancellation before start | AbortSignal aborted | `{ cancelled: true, ... }` | Cancel |
| ME-011 | Cancellation during read | AbortSignal mid-process | `{ cancelled: true, ... }` | Cancel |
| ME-012 | Cancellation during batch | AbortSignal mid-batch | `{ cancelled: true, ... }` | Cancel |
| ME-013 | Cancellation during duplicate check | AbortSignal mid-check | `{ cancelled: true, ... }` | Cancel |
| ME-014 | Cancellation before verification | AbortSignal before verify | `{ cancelled: true, ... }` | Cancel |
| ME-015 | Network error (retry success) | Network fails then succeeds | Migration completes | Retry |
| ME-016 | Network error (retry exhausted) | Persistent network error | Partial success | Error |
| ME-017 | Auth error | Auth fails during migration | Throws `AUTH_ERROR` | Auth |
| ME-018 | Quota error | Quota exceeded | Partial success with errorCode | Error |
| ME-019 | Custom batch size | `batchSize: 100` | Uses custom size | Config |
| ME-020 | Null options | `null` | Uses defaults | Null |
| ME-021 | Undefined options | `undefined` | Uses defaults | Undefined |
| ME-022 | Marks complete on success | Successful migration | Status marked complete | - |
| ME-023 | Verification step | Successful migration | `verificationResult` in response | - |
| ME-024 | Duration tracking | Any migration | `duration` in response | Metrics |

#### 2.3.2 cancelMigration()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| ME-025 | Cancel successfully | Valid userId, processed count | Void (no error) | - |
| ME-026 | Cleanup partial data | Valid userId | Entries deleted | GDPR |
| ME-027 | Mark cancelled | Valid userId | Status marked cancelled | - |
| ME-028 | Cleanup error | Cleanup fails | Cancellation continues | Graceful |

#### 2.3.3 verifyMigration()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| ME-029 | Counts match | Expected 100, Firestore 100 | `{ verified: true, ... }` | - |
| ME-030 | Firestore has more | Expected 100, Firestore 150 | `{ verified: true, ... }` (allows variance) | - |
| ME-031 | Firestore has less | Expected 100, Firestore 80 | `{ verified: false, ... }` | Mismatch |
| ME-032 | Verification error | Firestore query fails | `{ verified: false, reason: "...error..." }` | Error |

#### 2.3.4 cleanupPartialData()

| Test ID | Scenario | Input | Expected Output | Edge Case |
|---------|----------|-------|-----------------|-----------|
| ME-033 | Cleanup successfully | Valid userId | Deleted count | - |
| ME-034 | Nothing to cleanup | Valid userId, empty | `0` | Empty |
| ME-035 | Cleanup error | Delete fails | `0` (graceful failure) | Error |

---

## Section 3: Integration Test Cases

### 3.1 IndexedDB to Firestore Flow

| Test ID | Scenario | Description | Expected Result |
|---------|----------|-------------|-----------------|
| INT-001 | Read from IndexedDB | Read all entries from IndexedDB | Entries array returned |
| INT-002 | Write to Firestore | Write entries batch to Firestore | Entries appear in Firestore |
| INT-003 | Data integrity (10 entries) | Migrate 10 entries, verify all fields | All fields match |
| INT-004 | Data integrity (100 entries) | Migrate 100 entries, verify counts | Counts match |
| INT-005 | Data integrity (500 entries) | Migrate 500 entries, verify counts | Counts match |
| INT-006 | Data integrity (1000 entries) | Migrate 1000 entries, verify counts | Counts match |
| INT-007 | Entry type preservation | Income and donation types | Types preserved |
| INT-008 | Amount precision | Decimal amounts | Precision maintained |
| INT-009 | Date preservation | Various date formats | Dates preserved |
| INT-010 | Description preservation | Notes/descriptions | Text preserved |

### 3.2 Status Tracking Integration

| Test ID | Scenario | Description | Expected Result |
|---------|----------|-------------|-----------------|
| INT-011 | Engine updates status | Migration engine marks complete | Status shows completed |
| INT-012 | Status persists | Check status after browser refresh | Status still complete |
| INT-013 | Status prevents duplicates | Second migration attempt | Throws ALREADY_COMPLETED |
| INT-014 | Cancelled status | Cancelled migration | Status shows cancelled |
| INT-015 | Can retry after cancel | Cancel then start again | Migration proceeds |
| INT-016 | History recorded | Complete migration | History shows event |

### 3.3 Error Recovery Integration

| Test ID | Scenario | Description | Expected Result |
|---------|----------|-------------|-----------------|
| INT-017 | Network error retry | Network fails then recovers | Migration completes |
| INT-018 | Partial migration cleanup | Cancel mid-migration | Partial data deleted |
| INT-019 | Auth refresh | Token expires, refresh works | Migration continues |
| INT-020 | Quota recovery | Hit quota, wait, retry | Migration completes |

---

## Section 4: E2E Test Cases (User Flows)

### 4.1 Happy Path - First Time Sign-In (User Story 1)

| Test ID | Step | Action | Expected Result | Screenshot |
|---------|------|--------|-----------------|------------|
| E2E-001 | 1 | Open app, sign in with Google | Sign-in successful | No |
| E2E-001 | 2 | Wait 3 seconds | App loads normally | No |
| E2E-001 | 3 | Observe consent dialog | Dialog appears with entry count | **Yes** |
| E2E-001 | 4 | Click "Sync to Cloud" | Migration starts | No |
| E2E-001 | 5 | Observe progress | Progress bar updates | **Yes** |
| E2E-001 | 6 | Wait for completion | Success dialog appears | **Yes** |
| E2E-001 | 7 | Click "OK" | Return to app | No |
| E2E-001 | 8 | Sign out, sign in again | No migration dialog (already done) | No |
| E2E-001 | 9 | Sign in on different device | Data accessible | No |

**Preconditions:**
- User has 50 entries in IndexedDB
- User has never signed in before
- Network connection available

**Expected Duration:** < 30 seconds for migration

### 4.2 Large Dataset Warning (User Story 2)

| Test ID | Step | Action | Expected Result | Screenshot |
|---------|------|--------|-----------------|------------|
| E2E-002 | 1 | Populate IndexedDB with 300 entries | Entries created | No |
| E2E-002 | 2 | Sign in with Google | Consent dialog appears | No |
| E2E-002 | 3 | Click "Sync to Cloud" | Warning dialog appears | **Yes** |
| E2E-002 | 4 | Observe warning text | Shows entry count, estimated time | No |
| E2E-002 | 5 | Click "Sync Now" | Migration starts | No |
| E2E-002 | 6 | Observe progress bar | Progress updates smoothly | **Yes** |
| E2E-002 | 7 | Wait for completion | Success dialog appears | No |

**Preconditions:**
- User has 300 entries in IndexedDB
- User has never signed in before

**Expected Duration:** < 60 seconds for migration

### 4.3 Cancellation Flow (User Story 3)

| Test ID | Step | Action | Expected Result | Screenshot |
|---------|------|--------|-----------------|------------|
| E2E-003 | 1 | Populate IndexedDB with 500 entries | Entries created | No |
| E2E-003 | 2 | Sign in with Google | Consent dialog appears | No |
| E2E-003 | 3 | Click "Sync to Cloud" | Migration starts | No |
| E2E-003 | 4 | Wait for 10% progress | Progress shows ~50 entries | No |
| E2E-003 | 5 | Click "Cancel" | Confirmation dialog appears | **Yes** |
| E2E-003 | 6 | Click "Yes, Cancel" | Cancellation in progress | No |
| E2E-003 | 7 | Wait for cancellation | Cancellation confirmed dialog | **Yes** |
| E2E-003 | 8 | Check Firestore | No partial data remains | No |
| E2E-003 | 9 | Check IndexedDB | All entries still present | No |
| E2E-003 | 10 | Go to Settings | "Sync to Cloud" button available | No |

**Preconditions:**
- User has 500 entries in IndexedDB
- User has never signed in before

### 4.4 Data Export & Deletion (User Story 4)

| Test ID | Step | Action | Expected Result | Screenshot |
|---------|------|--------|-----------------|------------|
| E2E-004 | 1 | Complete migration first | Migration done | No |
| E2E-004 | 2 | Go to Settings > Data & Privacy | Settings page loads | No |
| E2E-004 | 3 | Click "Export Data" | JSON file downloads | **Yes** (file content) |
| E2E-004 | 4 | Verify JSON content | All entries present | No |
| E2E-004 | 5 | Click "Delete All Cloud Data" | Warning dialog appears | **Yes** |
| E2E-004 | 6 | Click "Yes, Delete Everything" | Deletion in progress | No |
| E2E-004 | 7 | Wait for completion | Confirmation message | **Yes** |
| E2E-004 | 8 | Check Firestore | All entries deleted | No |
| E2E-004 | 9 | Check user account | Account deleted | No |

**Preconditions:**
- User has completed migration
- User has entries in Firestore

### 4.5 Edge Cases

| Test ID | Scenario | Description | Expected Result |
|---------|----------|-------------|-----------------|
| E2E-005 | Empty IndexedDB | Sign in with no local data | No migration needed, starts fresh |
| E2E-006 | Duplicate entries | Local entry exists in Firestore | Last-write-wins applied |
| E2E-007 | Network failure mid-migration | Network disconnects | Migration pauses, resumes on reconnect |
| E2E-008 | Auth expired | Token expires during migration | Prompt to re-authenticate |
| E2E-009 | Firestore quota exceeded | Hit daily quota | Clear error message, retry later option |
| E2E-010 | Invalid entry data | Corrupted IndexedDB entry | Entry skipped, others migrate |
| E2E-011 | Browser refresh during migration | User refreshes page | Migration state preserved |
| E2E-012 | Multiple tabs | Open app in multiple tabs | Only one migration runs |

---

## Section 5: Manual Test Cases

The following 10 manual test cases require human verification and cannot be fully automated.

### MTC-001: Consent Dialog Display (Hebrew RTL + English LTR)

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-001 |
| **Priority** | High |
| **Preconditions** | 1. User has 50 entries in IndexedDB |
|                   | 2. User has never signed in before |
|                   | 3. App running on Netlify preview deployment |
| **Test Steps** | 1. Open app in browser |
|                | 2. Click "Sign In" |
|                | 3. Complete Google OAuth |
|                | 4. Wait for consent dialog to appear |
|                | 5. Verify dialog content |
|                | 6. Toggle language to Hebrew |
|                | 7. Verify Hebrew RTL display |
|                | 8. Toggle language to English |
|                | 9. Verify English LTR display |
| **Expected Results** | - Dialog appears within 3 seconds after sign-in |
|                      | - Entry count displayed correctly |
|                      | - Hebrew text aligned right-to-left |
|                      | - English text aligned left-to-right |
|                      | - All buttons visible and clickable |
|                      | - Privacy policy link works |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes - Hebrew and English versions |
| **Tester Notes** | _To be filled during testing_ |

### MTC-002: Progress Bar Updates Smoothly

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-002 |
| **Priority** | High |
| **Preconditions** | 1. User has 200 entries in IndexedDB |
|                   | 2. User accepted consent dialog |
| **Test Steps** | 1. Start migration by clicking "Sync to Cloud" |
|                | 2. Observe progress bar animation |
|                | 3. Observe entry count updates |
|                | 4. Wait for completion |
| **Expected Results** | - Progress bar updates smoothly (no jumps) |
|                      | - Entry count shows "X of Y entries" |
|                      | - No UI freezing during migration |
|                      | - Estimated time updates if shown |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes - at 25%, 50%, 75%, 100% |
| **Tester Notes** | _To be filled during testing_ |

### MTC-003: Success Celebration Appears

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-003 |
| **Priority** | Medium |
| **Preconditions** | 1. User has completed migration |
| **Test Steps** | 1. Complete migration successfully |
|                | 2. Observe success dialog |
|                | 3. Verify celebration elements |
|                | 4. Click "OK" or dismiss |
| **Expected Results** | - Success dialog appears immediately |
|                      | - Shows correct entry count |
|                      | - Celebratory messaging (emoji allowed here) |
|                      | - Clear call-to-action button |
|                      | - Returns to app when dismissed |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes |
| **Tester Notes** | _To be filled during testing_ |

### MTC-004: Error Messages Are User-Friendly

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-004 |
| **Priority** | High |
| **Preconditions** | 1. User has entries in IndexedDB |
|                   | 2. Network can be disconnected |
| **Test Steps** | 1. Start migration |
|                | 2. Disconnect network during migration |
|                | 3. Observe error message |
|                | 4. Verify message tone and content |
|                | 5. Reconnect network |
|                | 6. Verify retry option |
| **Expected Results** | - Error message is non-technical |
|                      | - Message reassures data is safe |
|                      | - Clear next steps provided |
|                      | - No blame language |
|                      | - Retry button works |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes - error message |
| **Tester Notes** | Check all error message copy against ISSUE_40_ERROR_MESSAGES.md |

### MTC-005: Cancellation Works Mid-Migration

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-005 |
| **Priority** | High |
| **Preconditions** | 1. User has 500 entries in IndexedDB |
|                   | 2. Migration is in progress |
| **Test Steps** | 1. Start migration with 500 entries |
|                | 2. Wait until progress shows ~20-30% |
|                | 3. Click "Cancel" button |
|                | 4. Observe cancellation confirmation |
|                | 5. Click "Yes, Cancel" |
|                | 6. Verify cancellation completion |
|                | 7. Check Firestore for partial data |
|                | 8. Check IndexedDB for original data |
| **Expected Results** | - Cancel button responds immediately |
|                      | - Confirmation dialog appears |
|                      | - Cancellation completes within 5 seconds |
|                      | - No partial data in Firestore |
|                      | - All original data in IndexedDB |
|                      | - Can retry from Settings later |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes - cancellation confirmation |
| **Tester Notes** | _To be filled during testing_ |

### MTC-006: 90-Day Backup Notification Shows

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-006 |
| **Priority** | Medium |
| **Preconditions** | 1. User has completed migration |
|                   | 2. 90 days have passed (or simulate) |
| **Test Steps** | 1. Complete migration |
|                | 2. Simulate 90-day passage (or wait) |
|                | 3. Open app |
|                | 4. Observe backup notification |
|                | 5. Verify options available |
| **Expected Results** | - Notification appears on app launch |
|                      | - Shows "90 days old" message |
|                      | - "Delete Backup" option available |
|                      | - "Keep 30 More Days" option available |
|                      | - Clear explanation of consequences |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes |
| **Tester Notes** | May need to simulate date - check implementation |

### MTC-007: Manual Trigger in Settings Works

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-007 |
| **Priority** | Medium |
| **Preconditions** | 1. User is signed in |
|                   | 2. User has entries in IndexedDB |
|                   | 3. User previously declined migration |
| **Test Steps** | 1. Navigate to Settings |
|                | 2. Go to "Data & Sync" section |
|                | 3. Find "Sync to Cloud" button |
|                | 4. Click button |
|                | 5. Observe confirmation dialog |
|                | 6. Confirm migration |
|                | 7. Verify migration starts |
| **Expected Results** | - Button visible and enabled |
|                      | - Shows entry count in confirmation |
|                      | - Mobile data warning if not on WiFi |
|                      | - Migration proceeds after confirmation |
|                      | - Button disabled after completion |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes - settings page |
| **Tester Notes** | _To be filled during testing_ |

### MTC-008: Export to JSON Downloads File

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-008 |
| **Priority** | High (GDPR) |
| **Preconditions** | 1. User has completed migration |
|                   | 2. User has entries in Firestore |
| **Test Steps** | 1. Navigate to Settings > Data & Privacy |
|                | 2. Click "Export Data" button |
|                | 3. Observe file download |
|                | 4. Open downloaded file |
|                | 5. Verify JSON content |
| **Expected Results** | - File downloads immediately |
|                      | - Filename includes date |
|                      | - JSON is valid |
|                      | - All entries present |
|                      | - All fields preserved |
|                      | - No sensitive server data exposed |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes - downloaded file content |
| **Tester Notes** | _To be filled during testing_ |

### MTC-009: Delete All Data Removes Everything

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-009 |
| **Priority** | High (GDPR) |
| **Preconditions** | 1. User has completed migration |
|                   | 2. User has entries in Firestore |
| **Test Steps** | 1. Export data first (backup) |
|                | 2. Navigate to Settings > Data & Privacy |
|                | 3. Click "Delete All Cloud Data" |
|                | 4. Observe warning dialog |
|                | 5. Confirm deletion |
|                | 6. Verify completion message |
|                | 7. Check Firestore (via Firebase Console) |
|                | 8. Check user account status |
| **Expected Results** | - Warning dialog shows consequences |
|                      | - Requires explicit confirmation |
|                      | - All Firestore entries deleted |
|                      | - User account deleted |
|                      | - Completion confirmation shown |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | Yes - warning dialog |
| **Tester Notes** | IRREVERSIBLE - test on staging account only |

### MTC-010: Migration Works on Slow Network

| Field | Value |
|-------|-------|
| **Test Case ID** | MTC-010 |
| **Priority** | Medium |
| **Preconditions** | 1. User has 200 entries in IndexedDB |
|                   | 2. Network throttling enabled (3G) |
| **Test Steps** | 1. Open browser DevTools |
|                | 2. Enable Network throttling (Slow 3G) |
|                | 3. Start migration |
|                | 4. Observe progress |
|                | 5. Verify completion |
| **Expected Results** | - Migration completes (slower) |
|                      | - No timeout errors |
|                      | - Progress updates continue |
|                      | - User can still cancel |
|                      | - No UI freezing |
| **Actual Results** | _To be filled during testing_ |
| **Pass/Fail** | _To be filled during testing_ |
| **Screenshots Required** | No |
| **Tester Notes** | Record actual time taken for 200 entries on 3G |

---

## Section 6: Performance Test Cases

### 6.1 Performance Benchmarks

| Dataset Size | Expected Time | Max Acceptable | Target Rate | Pass/Fail |
|--------------|---------------|----------------|-------------|-----------|
| 100 entries | <= 5 seconds | 8 seconds | 20 entries/sec | Required |
| 500 entries | <= 15 seconds | 25 seconds | 33 entries/sec | Required |
| 1000 entries | <= 30 seconds | 50 seconds | 33 entries/sec | Required |
| 5000 entries | <= 3 minutes | 5 minutes | 28 entries/sec | Warning |

### 6.2 Performance Test Cases

| Test ID | Scenario | Dataset | Metrics to Track | Pass Criteria |
|---------|----------|---------|------------------|---------------|
| PERF-001 | Small dataset | 100 entries | Time, memory, network | < 5 seconds |
| PERF-002 | Medium dataset | 500 entries | Time, memory, network | < 15 seconds |
| PERF-003 | Large dataset | 1000 entries | Time, memory, network | < 30 seconds |
| PERF-004 | Very large dataset | 5000 entries | Time, memory, network | < 3 minutes |
| PERF-005 | Batch boundary | 500 entries exactly | Batch count | 1 batch |
| PERF-006 | Batch overflow | 501 entries | Batch count | 2 batches |
| PERF-007 | Memory usage (1000) | 1000 entries | Peak memory | < 100 MB |
| PERF-008 | Memory usage (5000) | 5000 entries | Peak memory | < 200 MB |
| PERF-009 | Network bandwidth | 1000 entries | Data transferred | < 5 MB |
| PERF-010 | UI responsiveness | 500 entries | Frame rate | > 30 fps |

### 6.3 Performance Metrics Collection

```javascript
// Performance test helper
async function measureMigration(userId, entries) {
  const startTime = performance.now();
  const startMemory = performance.memory?.usedJSHeapSize || 0;

  const result = await migrateAllEntries(userId, {
    onProgress: (completed, total) => {
      // Track progress timing
    }
  });

  const endTime = performance.now();
  const endMemory = performance.memory?.usedJSHeapSize || 0;

  return {
    duration: endTime - startTime,
    memoryDelta: endMemory - startMemory,
    entriesPerSecond: entries.length / ((endTime - startTime) / 1000),
    ...result
  };
}
```

---

## Section 7: Security & Compliance Test Cases

### 7.1 GDPR Compliance Tests

| Test ID | Article | Requirement | Test Description | Expected Result |
|---------|---------|-------------|------------------|-----------------|
| GDPR-001 | 6(1)(a) | Consent | Consent dialog appears before processing | Dialog shown, processing waits |
| GDPR-002 | 7(3) | Withdraw consent | User can cancel migration | Cancel button works |
| GDPR-003 | 5(1)(c) | Data minimization | Only required data migrated | No extra fields in Firestore |
| GDPR-004 | 5(1)(f) | Audit logging | Migration events recorded | History collection populated |
| GDPR-005 | 17 | Right to erasure | Delete all data works | All Firestore entries deleted |
| GDPR-006 | 20 | Data portability | Export data works | JSON download with all data |
| GDPR-007 | 7(1) | Consent record | Consent timestamp stored | Timestamp in migration doc |
| GDPR-008 | 13 | Transparency | Privacy policy linked | Link in consent dialog works |

### 7.2 Security Tests

| Test ID | Category | Test Description | Expected Result |
|---------|----------|------------------|-----------------|
| SEC-001 | Auth | Unauthenticated access denied | All operations throw NOT_AUTHENTICATED |
| SEC-002 | Auth | User ID mismatch denied | Operations throw USER_MISMATCH |
| SEC-003 | Auth | Token expiration handled | Re-authentication prompt |
| SEC-004 | Firestore Rules | Owner-only read | Non-owner cannot read entries |
| SEC-005 | Firestore Rules | Owner-only write | Non-owner cannot write entries |
| SEC-006 | Firestore Rules | Amount validation | Invalid amounts rejected |
| SEC-007 | Firestore Rules | Type validation | Invalid types rejected |
| SEC-008 | Error Messages | No sensitive data in errors | Error messages sanitized |
| SEC-009 | Logging | No PII in logs | Amounts/descriptions not logged |
| SEC-010 | Migration Lock | Concurrent migration prevented | Second device blocked |

### 7.3 Security Test Implementation

```javascript
// Firestore security rules tests
describe('Firestore Security Rules', () => {
  it('SEC-004: Denies read for non-owner', async () => {
    // Sign in as user A
    const userA = await signInAsUser('userA');
    // Create entry for user A
    await createEntry(userA.uid, testEntry);

    // Sign in as user B
    const userB = await signInAsUser('userB');

    // Attempt to read user A's entry
    await expect(
      getEntry(userA.uid, testEntry.id)
    ).rejects.toThrow('permission-denied');
  });
});
```

---

## Section 8: Browser/Device Compatibility

### 8.1 Browser Matrix

| Browser | Version | Platform | Priority | Status |
|---------|---------|----------|----------|--------|
| Chrome | Latest | Desktop | Primary | Required |
| Chrome | Latest | Android | Primary | Required |
| Safari | Latest | macOS | Secondary | Required |
| Safari | Latest | iOS | Primary | Required |
| Firefox | Latest | Desktop | Secondary | Best effort |
| Edge | Latest | Desktop | Secondary | Best effort |

### 8.2 Device Matrix

| Device Type | Screen Size | Priority | Status |
|-------------|-------------|----------|--------|
| Desktop | >= 1920px | High | Required |
| Laptop | 1366px - 1920px | High | Required |
| Tablet | 768px - 1024px | Medium | Required |
| Mobile (Large) | 414px - 428px | High | Required |
| Mobile (Small) | 375px | High | Required |

### 8.3 Compatibility Test Cases

| Test ID | Browser/Device | Test Description | Expected Result |
|---------|----------------|------------------|-----------------|
| COMPAT-001 | Chrome Desktop | Full migration flow | All features work |
| COMPAT-002 | Chrome Android | Full migration flow | All features work |
| COMPAT-003 | Safari macOS | Full migration flow | All features work |
| COMPAT-004 | Safari iOS | Full migration flow | All features work |
| COMPAT-005 | Firefox Desktop | Full migration flow | All features work |
| COMPAT-006 | Edge Desktop | Full migration flow | All features work |
| COMPAT-007 | Mobile 375px | Dialog responsiveness | Dialogs fit screen |
| COMPAT-008 | Tablet 768px | Dialog responsiveness | Dialogs centered |
| COMPAT-009 | PWA Installed iOS | Migration from PWA | Works offline-first |
| COMPAT-010 | PWA Installed Android | Migration from PWA | Works offline-first |

---

## Section 9: Test Data

### 9.1 Test Data Sets

| Dataset | Size | Purpose | Generation Method |
|---------|------|---------|-------------------|
| Small | 10 entries | Quick smoke test | `generateTestEntries(10)` |
| Medium | 100 entries | Performance baseline | `generateTestEntries(100)` |
| Large | 500 entries | Batch boundary test | `generateTestEntries(500)` |
| Very Large | 1000 entries | Performance test | `generateTestEntries(1000)` |
| Stress | 5000 entries | Stress test | `generateTestEntries(5000)` |
| Duplicates | 50 entries | Duplicate handling | 25 local + 25 Firestore overlap |
| Edge Cases | Variable | Validation testing | Special characters, boundaries |

### 9.2 Test Entry Template

```javascript
// Valid income entry
const validIncomeEntry = {
  id: 'income-uuid-12345',
  type: 'income',
  amount: 5000.00,
  date: '2026-03-01',
  accountingMonth: '2026-03',
  description: 'Monthly salary',
  createdAt: '2026-03-01T08:00:00.000Z',
  updatedAt: '2026-03-01T08:00:00.000Z'
};

// Valid donation entry
const validDonationEntry = {
  id: 'donation-uuid-67890',
  type: 'donation',
  amount: 500.00,
  date: '2026-03-05',
  accountingMonth: '2026-03',
  description: 'Charity donation',
  createdAt: '2026-03-05T10:00:00.000Z',
  updatedAt: '2026-03-05T10:00:00.000Z'
};
```

### 9.3 Test Data Generator

```javascript
/**
 * Generate test entries for migration testing
 * @param {number} count - Number of entries to generate
 * @param {Object} options - Generation options
 * @returns {Array} Array of test entries
 */
function generateTestEntries(count, options = {}) {
  const {
    startDate = '2026-01-01',
    types = ['income', 'donation'],
    minAmount = 100,
    maxAmount = 10000
  } = options;

  const entries = [];
  const start = new Date(startDate);

  for (let i = 0; i < count; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + Math.floor(i / 3));

    const type = types[i % types.length];
    const amount = minAmount + Math.random() * (maxAmount - minAmount);

    entries.push({
      id: `entry-${Date.now()}-${i}`,
      type,
      amount: Math.round(amount * 100) / 100,
      date: date.toISOString().split('T')[0],
      accountingMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      description: `Test ${type} entry #${i + 1}`,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString()
    });
  }

  return entries;
}
```

### 9.4 Edge Case Test Data

```javascript
// Edge case entries for validation testing
const edgeCaseEntries = [
  // Boundary amounts
  { ...validEntry, amount: 0.01 },           // Minimum positive
  { ...validEntry, amount: 999999999 },      // Maximum valid
  { ...validEntry, amount: 1000000001 },     // Invalid (too large)

  // Boundary descriptions
  { ...validEntry, description: '' },        // Empty
  { ...validEntry, description: 'x'.repeat(500) }, // Max length
  { ...validEntry, description: 'x'.repeat(501) }, // Invalid (too long)

  // Date boundaries
  { ...validEntry, date: '2020-01-01' },     // Old date
  { ...validEntry, date: '2030-12-31' },     // Future date
  { ...validEntry, accountingMonth: '2026-01' }, // Year start
  { ...validEntry, accountingMonth: '2026-12' }, // Year end

  // Special characters
  { ...validEntry, description: 'Hebrew: שלום' },
  { ...validEntry, description: 'Emoji: $$$' },
  { ...validEntry, description: 'Special: <>&"\'`' },

  // Invalid entries (should fail validation)
  { id: null, type: 'income', amount: 100 },
  { id: '', type: 'income', amount: 100 },
  { id: 'test', type: 'expense', amount: 100 },
  { id: 'test', type: 'income', amount: -100 },
  { id: 'test', type: 'income', amount: NaN },
  { id: 'test', type: 'income', date: 'invalid' }
];
```

---

## Section 10: Test Execution Checklist

### 10.1 Pre-Execution Checklist

- [ ] Test environment set up (local, CI, Netlify preview)
- [ ] Firebase emulator running (if needed)
- [ ] Test data generated
- [ ] Test accounts created
- [ ] Network throttling tools ready (for slow network tests)
- [ ] Screenshots tool ready

### 10.2 Unit Test Execution

- [ ] `src/services/firestoreMigrationService.test.js` - All passing
- [ ] `src/services/migrationStatusService.test.js` - All passing
- [ ] `src/services/migrationEngine.test.js` - All passing
- [ ] Coverage >= 80% for all services
- [ ] No linting errors

**Command:** `npm test -- --coverage`

### 10.3 Integration Test Execution

- [ ] INT-001 through INT-010 (Data flow tests)
- [ ] INT-011 through INT-016 (Status tracking tests)
- [ ] INT-017 through INT-020 (Error recovery tests)
- [ ] All data integrity verified

### 10.4 E2E Test Execution

- [ ] E2E-001: Happy path complete
- [ ] E2E-002: Large dataset warning
- [ ] E2E-003: Cancellation flow
- [ ] E2E-004: Data export & deletion
- [ ] E2E-005 through E2E-012: Edge cases

### 10.5 Manual Test Execution

- [ ] MTC-001: Consent dialog (Hebrew/English)
- [ ] MTC-002: Progress bar smoothness
- [ ] MTC-003: Success celebration
- [ ] MTC-004: Error messages user-friendly
- [ ] MTC-005: Cancellation mid-migration
- [ ] MTC-006: 90-day backup notification
- [ ] MTC-007: Manual trigger in Settings
- [ ] MTC-008: Export to JSON
- [ ] MTC-009: Delete all data
- [ ] MTC-010: Slow network migration

### 10.6 Performance Test Execution

- [ ] PERF-001 through PERF-004: Dataset size tests
- [ ] PERF-005 through PERF-006: Batch boundary tests
- [ ] PERF-007 through PERF-008: Memory usage tests
- [ ] PERF-009: Network bandwidth test
- [ ] PERF-010: UI responsiveness test
- [ ] All benchmarks met

### 10.7 Security Test Execution

- [ ] GDPR-001 through GDPR-008: Compliance tests
- [ ] SEC-001 through SEC-010: Security tests
- [ ] No security vulnerabilities found

### 10.8 Compatibility Test Execution

- [ ] COMPAT-001 through COMPAT-010: Browser/device tests
- [ ] All primary browsers verified
- [ ] All screen sizes tested

### 10.9 Post-Execution Checklist

- [ ] All test results documented
- [ ] Screenshots captured for UI tests
- [ ] Bugs filed for failures (see Bug Template)
- [ ] Test report generated
- [ ] Regression testing complete
- [ ] Sign-off from QA

---

## Section 11: Bug Reporting Template

When bugs are found during testing, use this template:

```markdown
## Bug Report: BUG-40-XXX

**Bug ID:** BUG-40-XXX
**Test Case:** [Test case ID that failed]
**Severity:** Critical / High / Medium / Low
**Priority:** P0 / P1 / P2 / P3
**Component:** [Migration Engine / Status Service / UI / etc.]
**Environment:** [Browser, device, OS, network conditions]

### Summary
[One-line description of the bug]

### Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots/Recordings
[Attach if applicable]

### Console Errors
```
[Paste any console errors]
```

### Additional Context
- Network conditions: [Online / Offline / Slow]
- Data size: [Number of entries]
- User state: [Authenticated / Not authenticated]

### Workaround
[If any workaround exists]

### Status
- [ ] Open
- [ ] In Progress
- [ ] Fixed
- [ ] Verified
- [ ] Closed

### Fix Verification
**Fixed in:** [PR number]
**Verified by:** [Tester name]
**Verification date:** [Date]
```

### Severity Definitions

| Severity | Definition | Example |
|----------|------------|---------|
| **Critical** | Data loss, security breach, complete feature failure | Migration loses entries |
| **High** | Major feature broken, significant user impact | Progress bar doesn't update |
| **Medium** | Feature works but with issues | Hebrew text alignment off |
| **Low** | Minor cosmetic issues | Button color slightly wrong |

### Priority Definitions

| Priority | Definition | Response Time |
|----------|------------|---------------|
| **P0** | Blocker - cannot ship | Fix immediately |
| **P1** | Critical - major impact | Fix before release |
| **P2** | Important - should fix | Fix in next sprint |
| **P3** | Nice to have | Fix when time permits |

---

## Section 12: Success Criteria

### 12.1 Acceptance Criteria

The migration feature is ready for release when:

| Criterion | Target | Status |
|-----------|--------|--------|
| Unit test pass rate | 100% | [ ] |
| Service coverage | >= 80% | [ ] |
| Integration test pass rate | 100% | [ ] |
| E2E test pass rate | 100% | [ ] |
| Manual test pass rate | 100% | [ ] |
| Performance benchmarks | All met | [ ] |
| GDPR compliance | 8/8 tests pass | [ ] |
| Security tests | 10/10 tests pass | [ ] |
| Browser compatibility | Primary browsers pass | [ ] |
| Critical bugs | 0 open | [ ] |
| High bugs | 0 open | [ ] |

### 12.2 Quality Gates

| Gate | Criteria | Required |
|------|----------|----------|
| **Gate 1: Unit Tests** | All tests pass, coverage >= 80% | Yes |
| **Gate 2: Integration** | All data flow tests pass | Yes |
| **Gate 3: E2E** | All user journeys complete | Yes |
| **Gate 4: Manual** | All 10 manual tests pass | Yes |
| **Gate 5: Performance** | All benchmarks met | Yes |
| **Gate 6: Security** | All security tests pass | Yes |
| **Gate 7: Compliance** | All GDPR tests pass | Yes |
| **Gate 8: Compatibility** | Primary browsers pass | Yes |
| **Gate 9: Bug Triage** | No Critical/High bugs | Yes |
| **Gate 10: Sign-off** | QA + PM approval | Yes |

### 12.3 Test Report Template

```markdown
# Migration Feature Test Report
## Issue #40: IndexedDB to Firestore Migration

**Report Date:** [Date]
**Tester:** [Name]
**Environment:** [Netlify Preview URL]
**Build:** [PR #]

### Summary
- **Total Tests:** [Number]
- **Passed:** [Number]
- **Failed:** [Number]
- **Blocked:** [Number]
- **Pass Rate:** [Percentage]

### Unit Tests
- **Files:** 3 service test files
- **Tests:** [Number]
- **Coverage:** [Percentage]
- **Status:** [Pass/Fail]

### Integration Tests
- **Tests:** 20
- **Passed:** [Number]
- **Failed:** [Number]
- **Status:** [Pass/Fail]

### E2E Tests
- **Tests:** 12
- **Passed:** [Number]
- **Failed:** [Number]
- **Status:** [Pass/Fail]

### Manual Tests
- **Tests:** 10
- **Passed:** [Number]
- **Failed:** [Number]
- **Status:** [Pass/Fail]

### Performance Tests
- **100 entries:** [Time] / 5 seconds - [Pass/Fail]
- **500 entries:** [Time] / 15 seconds - [Pass/Fail]
- **1000 entries:** [Time] / 30 seconds - [Pass/Fail]
- **5000 entries:** [Time] / 3 minutes - [Pass/Fail]

### Bug Summary
| Severity | Open | Fixed | Total |
|----------|------|-------|-------|
| Critical | 0 | 0 | 0 |
| High | 0 | 0 | 0 |
| Medium | 0 | 0 | 0 |
| Low | 0 | 0 | 0 |

### Quality Gates
- [x] Unit Tests Pass
- [x] Coverage >= 80%
- [x] Integration Tests Pass
- [x] E2E Tests Pass
- [x] Manual Tests Pass
- [x] Performance Benchmarks Met
- [x] Security Tests Pass
- [x] GDPR Compliance Verified
- [x] No Critical/High Bugs

### Recommendation
[ ] **APPROVED** - Ready for release
[ ] **NOT APPROVED** - Issues found (see details below)

### Issues Blocking Release
[List any issues if not approved]

### Sign-off
- **QA Lead:** [Name] - [Date]
- **PM:** [Name] - [Date]
```

---

## Appendix A: Test Environment Setup

### A.1 Local Development Setup

```bash
# Clone repository
git clone https://github.com/DubiWork/maaser-tracker.git
cd maaser-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with Firebase credentials

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Start development server
npm run dev
```

### A.2 Firebase Emulator Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Start emulators
firebase emulators:start

# Emulator URLs:
# - Firestore: localhost:8080
# - Auth: localhost:9099
```

### A.3 Netlify Preview Setup

Netlify previews are created automatically for each PR.

**Preview URL Pattern:** `https://deploy-preview-<PR#>--maaser-tracker.netlify.app/`

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **IndexedDB** | Browser's built-in database for offline storage |
| **Firestore** | Google Cloud's NoSQL database |
| **Migration** | Process of moving data from IndexedDB to Firestore |
| **Batch** | Group of operations processed together (max 500) |
| **Last-Write-Wins** | Conflict resolution: newest timestamp wins |
| **GDPR** | EU data protection regulation |
| **E2E** | End-to-End testing (full user journey) |
| **PWA** | Progressive Web App |
| **RTL** | Right-to-Left (Hebrew text direction) |
| **LTR** | Left-to-Right (English text direction) |

---

**Document End**

**Last Updated:** 2026-03-03
**Version:** 1.0
**Status:** Ready for PM Review
**Next Review:** Before implementation begins
