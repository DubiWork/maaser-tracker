# Issue #54: UserProfile Shows "Local only" After Migration -- Test Plan

**Date:** 2026-03-05
**Author:** QA Expert Agent
**Issue:** [#54](https://github.com/DubiWork/maaser-tracker/issues/54)
**Related:** Issue #40 (Migration), Issue #38 (Authentication), Issue #53 (GDPR -- depends on #54)

---

## 1. Test Strategy Overview

### What We Are Testing

The `UserProfile` component currently hardcodes its sync status to "Local only" (`StorageIcon` + `t.syncStatusLocalOnly`). After this change, the component will dynamically derive its sync status from the `useMigration` hook, which exposes real-time migration state via React Query.

### Why This Matters

Users who have completed the IndexedDB-to-Firestore migration see a misleading "Local only" label. This erodes trust in the cloud sync feature and may cause unnecessary re-migration attempts. Fixing this closes the UX loop for the Phase 1.5 migration flow.

### Tools

| Tool | Purpose |
|------|---------|
| Vitest + jsdom | Unit and integration tests |
| @testing-library/react | Component rendering and assertions |
| @tanstack/react-query | Required provider for `useMigration` hook |
| Netlify Preview Deployment | Manual/Playwright E2E tests |
| Chrome DevTools | Console error verification, responsive testing |

### Test Levels

| Level | Scope | Count | Owner |
|-------|-------|-------|-------|
| Unit | `UserProfile` component with mocked `useMigration` | 16 new tests | Developer |
| Integration | `UserProfile` + real `useMigration` + `QueryClientProvider` | 3 tests | Developer |
| Manual (Playwright-executable) | Full app on Netlify preview | 7 scenarios (MT-01 to MT-07) | Developer + User |

### Coverage Targets

- `UserProfile.jsx`: All 6 migration status branches covered (COMPLETED, IN_PROGRESS, FAILED, NOT_STARTED, PAUSED, CANCELLED) plus `undefined`
- `LanguageProvider.jsx`: 3 new translation keys verified in both languages
- Existing 987 tests: Zero regressions

---

## 2. Unit Test Cases

All unit tests live in `src/components/UserProfile.test.jsx` under a new `describe('sync status indicator')` block.

**Mock setup (shared across all unit tests):**
```javascript
vi.mock('../hooks/useMigration', () => ({
  useMigration: vi.fn(),
  MigrationStatus: {
    IDLE: 'idle',
    CHECKING: 'checking',
    CONSENT_PENDING: 'consent-pending',
    IN_PROGRESS: 'in-progress',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
  },
}));
```

### 2.1 Status Text Tests (English)

These tests switch to English language via `LanguageProvider` override or language toggle mock to verify English strings.

| ID | Describe Block | Scenario | Mock Setup | Expected Assertion |
|----|---------------|----------|------------|-------------------|
| UT-01 | `sync status indicator` | Renders "Local only" when status is NOT_STARTED | `useMigration.mockReturnValue({ status: 'idle' })`. Render with authenticated user. Open menu. | `screen.getByText(/Local only/i)` is in the document. |
| UT-02 | `sync status indicator` | Renders "Local only" when status is PAUSED | `useMigration.mockReturnValue({ status: 'paused' })`. Render with authenticated user. Open menu. | `screen.getByText(/Local only/i)` is in the document. |
| UT-03 | `sync status indicator` | Renders "Local only" when status is CANCELLED | `useMigration.mockReturnValue({ status: 'cancelled' })`. Render with authenticated user. Open menu. | `screen.getByText(/Local only/i)` is in the document. |
| UT-04 | `sync status indicator` | Renders "Synced to cloud" when status is COMPLETED | `useMigration.mockReturnValue({ status: 'completed' })`. Render with authenticated user. Open menu. | `screen.getByText(/Synced to cloud/i)` is in the document. |
| UT-05 | `sync status indicator` | Renders "Syncing..." when status is IN_PROGRESS | `useMigration.mockReturnValue({ status: 'in-progress' })`. Render with authenticated user. Open menu. | `screen.getByText(/Syncing\.\.\./i)` is in the document. |
| UT-06 | `sync status indicator` | Renders "Sync failed" when status is FAILED | `useMigration.mockReturnValue({ status: 'failed' })`. Render with authenticated user. Open menu. | `screen.getByText(/Sync failed/i)` is in the document. |

### 2.2 Icon Tests

| ID | Describe Block | Scenario | Mock Setup | Expected Assertion |
|----|---------------|----------|------------|-------------------|
| UT-07 | `sync status indicator > icons` | Shows StorageIcon when status is NOT_STARTED | `useMigration.mockReturnValue({ status: 'idle' })`. Render with authenticated user. Open menu. | The sync status `MenuItem` contains an SVG matching `StorageIcon`'s `data-testid="StorageIcon"`. |
| UT-08 | `sync status indicator > icons` | Shows CloudDoneIcon when status is COMPLETED | `useMigration.mockReturnValue({ status: 'completed' })`. Render with authenticated user. Open menu. | The sync status `MenuItem` contains an SVG matching `data-testid="CloudDoneIcon"`. |
| UT-09 | `sync status indicator > icons` | Shows SyncIcon when status is IN_PROGRESS | `useMigration.mockReturnValue({ status: 'in-progress' })`. Render with authenticated user. Open menu. | The sync status `MenuItem` contains an SVG matching `data-testid="SyncIcon"`. |
| UT-10 | `sync status indicator > icons` | Shows ErrorOutlineIcon when status is FAILED | `useMigration.mockReturnValue({ status: 'failed' })`. Render with authenticated user. Open menu. | The sync status `MenuItem` contains an SVG matching `data-testid="ErrorOutlineIcon"`. |

**Note on icon assertions:** MUI icons render as `<svg>` elements with a `data-testid` attribute matching their component name. Use `screen.getByTestId('CloudDoneIcon')` or query the SVG within the sync status menu item. If `data-testid` is not present by default, the developer may need to add `data-testid` attributes to the icon elements in the JSX, or assert on the icon by querying the nearest container and checking for the SVG's `class` name (e.g., `MuiSvgIcon-root`). The exact assertion strategy should be confirmed during implementation.

### 2.3 Hebrew Translation Tests

These tests use the default Hebrew language (LanguageProvider defaults to `'he'`).

| ID | Describe Block | Scenario | Mock Setup | Expected Assertion |
|----|---------------|----------|------------|-------------------|
| UT-11 | `sync status indicator > Hebrew` | Hebrew: renders "מסונכרן לענן" when COMPLETED | `useMigration.mockReturnValue({ status: 'completed' })`. Render with default Hebrew language. Open menu. | `screen.getByText(/מסונכרן לענן/)` is in the document. |
| UT-12 | `sync status indicator > Hebrew` | Hebrew: renders "מסנכרן..." when IN_PROGRESS | `useMigration.mockReturnValue({ status: 'in-progress' })`. Render with default Hebrew language. Open menu. | `screen.getByText(/מסנכרן\.\.\./)` is in the document. |
| UT-13 | `sync status indicator > Hebrew` | Hebrew: renders "הסנכרון נכשל" when FAILED | `useMigration.mockReturnValue({ status: 'failed' })`. Render with default Hebrew language. Open menu. | `screen.getByText(/הסנכרון נכשל/)` is in the document. |
| UT-14 | `sync status indicator > Hebrew` | Hebrew: renders "מקומי בלבד" when NOT_STARTED | `useMigration.mockReturnValue({ status: 'idle' })`. Render with default Hebrew language. Open menu. | `screen.getByText(/מקומי בלבד/)` is in the document. |

### 2.4 Edge Case Tests

| ID | Describe Block | Scenario | Mock Setup | Expected Assertion |
|----|---------------|----------|------------|-------------------|
| UT-15 | `sync status indicator > edge cases` | Does not call useMigration when user is signed out (or passes undefined) | `useMigration.mockReturnValue({ status: 'idle' })`. Render **without** authenticated user (`renderWithAuth(<UserProfile />, null)`). | `useMigration` was called with `undefined` (since `user?.uid` is `undefined` when user is null). Component returns `null` (no render). The hook is still called (React hooks rule -- cannot skip), but with `undefined` as userId. |
| UT-16 | `sync status indicator > edge cases` | Renders without crash when migrationStatus is undefined | `useMigration.mockReturnValue({ status: undefined })`. Render with authenticated user. Open menu. | Component renders without throwing. Falls through to default case: shows "Local only" / "מקומי בלבד" with `StorageIcon`. |

---

## 3. Integration Test Cases

Integration tests verify that `UserProfile` works with the real `useMigration` hook (not mocked), connected to a `QueryClientProvider`. These tests mock only the underlying services (`migrationStatusService`, `migrationEngine`, `networkMonitor`), not the hook itself.

### 3.1 Integration Test Setup

```javascript
// Do NOT mock useMigration for integration tests.
// Instead, mock the services that useMigration depends on:
vi.mock('../services/migrationStatusService', () => ({
  checkMigrationStatus: vi.fn(),
}));
vi.mock('../services/migrationEngine', () => ({
  migrateAllEntries: vi.fn(),
  cancelMigration: vi.fn(),
  MigrationEngineErrorCodes: { /* ... */ },
}));
vi.mock('../services/networkMonitor', () => ({
  isOnline: vi.fn(() => true),
  onConnectionChange: vi.fn(() => () => {}),
  classifyError: vi.fn(() => ({ type: 'unknown', retryable: true, waitTime: 0 })),
  NetworkErrorTypes: { NETWORK: 'network', QUOTA: 'quota', AUTH: 'auth', UNKNOWN: 'unknown' },
}));
```

### 3.2 Integration Test Cases

| ID | Scenario | Service Mock Setup | Steps | Expected Result |
|----|----------|-------------------|-------|-----------------|
| IT-01 | Shows "Synced to cloud" when `checkMigrationStatus` returns `{ completed: true }` | `checkMigrationStatus.mockResolvedValue({ completed: true, completedAt: new Date() })` | 1. Render `UserProfile` inside `QueryClientProvider + LanguageProvider + AuthProvider` with authenticated user. 2. Wait for query to settle (`waitFor`). 3. Open profile menu. | Menu displays "Synced to cloud" (English) or "מסונכרן לענן" (Hebrew). `checkMigrationStatus` was called with the user's UID. |
| IT-02 | Shows "Local only" when `checkMigrationStatus` returns `{ completed: false }` | `checkMigrationStatus.mockResolvedValue({ completed: false })` | Same as IT-01. | Menu displays "Local only" / "מקומי בלבד". |
| IT-03 | Shows "Local only" when `checkMigrationStatus` rejects (network error) | `checkMigrationStatus.mockRejectedValue(new Error('Network error'))` | Same as IT-01. Wait for query error to settle. | Menu displays "Local only" (falls back to IDLE when query errors). No unhandled errors in console. |

**Important:** Integration tests should be in a separate `describe('integration: useMigration + UserProfile')` block within `UserProfile.test.jsx`, or in a dedicated file `src/components/UserProfile.integration.test.jsx`. Because these tests do NOT mock `useMigration`, they must NOT share the same file scope as unit tests that do mock it, unless Vitest's `vi.mock` hoisting is carefully managed with conditional mocking. The recommended approach is a separate describe block that uses `vi.doMock` or a separate test file.

---

## 4. Manual Test Cases (Playwright-Executable)

These tests are designed for manual execution on the Netlify preview deployment. They can also be automated with Playwright in a future iteration.

**Environment:** Netlify preview URL: `https://deploy-preview-{PR#}--maaser-tracker.netlify.app/`

### MT-01: Fresh user sees "Local only"

| Field | Value |
|-------|-------|
| **ID** | MT-01 |
| **Preconditions** | Fresh browser profile (no prior migration, no IndexedDB data). Viewport: 1280x720. |
| **Steps** | 1. Navigate to the Netlify preview URL. 2. Click "Sign In" button. 3. Complete Google sign-in flow. 4. If the migration consent dialog appears, click "Keep Local Only" to decline. 5. Click the user avatar (top-right corner) to open the profile dropdown menu. 6. Open browser DevTools > Console tab. |
| **Expected Result** | Profile menu shows "Local only" with a `StorageIcon` (database/storage icon). No console errors or warnings. |
| **Pass Criteria** | Text matches, icon matches, zero console errors. |

### MT-02: Migrated user sees "Synced to cloud"

| Field | Value |
|-------|-------|
| **ID** | MT-02 |
| **Preconditions** | User signed in. At least 1 entry exists in IndexedDB. Viewport: 1280x720. |
| **Steps** | 1. Navigate to the preview URL. 2. Sign in if not already signed in. 3. When the migration consent dialog appears, click "Sync to Cloud". 4. Wait for the migration progress bar to reach 100% and the success message to appear. 5. Dismiss the success dialog. 6. Click the user avatar to open the profile dropdown menu. 7. Open DevTools > Console tab. |
| **Expected Result** | Sync status shows "Synced to cloud" with a green cloud-done icon (`CloudDoneIcon`). No console errors. |
| **Pass Criteria** | Text is "Synced to cloud" (or Hebrew equivalent), icon is cloud-with-checkmark, zero console errors. |

### MT-03: Bilingual status display

| Field | Value |
|-------|-------|
| **ID** | MT-03 |
| **Preconditions** | User signed in. Migration completed. Language is Hebrew (default). Viewport: 1280x720. |
| **Steps** | 1. Navigate to the preview URL. 2. Click the user avatar. 3. Read the sync status text and confirm it is in Hebrew. 4. Close the menu. 5. Click the language toggle to switch to English. 6. Click the user avatar again. 7. Read the sync status text and confirm it is in English. |
| **Expected Result** | Hebrew mode: text reads "מסונכרן לענן", menu layout is RTL. English mode: text reads "Synced to cloud", menu layout is LTR. Both icons are `CloudDoneIcon`. |
| **Pass Criteria** | Correct text in both languages. Correct layout direction. No visual overlap or truncation. |

### MT-04: Mobile responsive (375px)

| Field | Value |
|-------|-------|
| **ID** | MT-04 |
| **Preconditions** | User signed in. Migration completed. Viewport: 375x812 (iPhone SE / standard mobile). |
| **Steps** | 1. Open DevTools and set viewport to 375x812. 2. Navigate to the preview URL. 3. Click the user avatar. 4. Read the sync status text. 5. Press Escape to close the menu. 6. Check the Console tab for errors. |
| **Expected Result** | Menu fits within the 375px viewport without horizontal scrolling. Status text is fully readable (not truncated or overflowing). Menu closes cleanly on Escape. No console errors. |
| **Pass Criteria** | No horizontal overflow. Text is not clipped. Menu dismisses properly. Zero console errors. |

### MT-05: In-progress status during migration

| Field | Value |
|-------|-------|
| **ID** | MT-05 |
| **Preconditions** | User signed in. Has entries in IndexedDB. Migration has NOT started yet. |
| **Steps** | 1. Navigate to the preview URL. 2. When the migration consent dialog appears, click "Sync to Cloud" to accept. 3. While the migration progress spinner/bar is visible (before 100%), immediately click the user avatar to open the profile menu. 4. Read the sync status. |
| **Expected Result** | Status shows "Syncing..." (or Hebrew: "מסנכרן...") with a `SyncIcon` (circular arrows icon) while migration is actively running. |
| **Pass Criteria** | Text is "Syncing..." during active migration. Icon is the sync spinner icon. Status updates to "Synced to cloud" after migration completes. |

### MT-06: Persistence after page reload

| Field | Value |
|-------|-------|
| **ID** | MT-06 |
| **Preconditions** | User signed in. Migration previously completed successfully. |
| **Steps** | 1. Complete the migration (or confirm it was completed in a prior session). 2. Hard-reload the page (Ctrl+Shift+R / Cmd+Shift+R). 3. Sign in again if the session expired. 4. Click the user avatar to open the profile menu. |
| **Expected Result** | After reload, the sync status still shows "Synced to cloud" with `CloudDoneIcon`. The status is persisted in Firestore (via `migrationStatusService.checkMigrationStatus`), not held only in React state. |
| **Pass Criteria** | Status survives a full page reload. Not a transient in-memory value. |

### MT-07: Signed-out user (no avatar visible)

| Field | Value |
|-------|-------|
| **ID** | MT-07 |
| **Preconditions** | User is NOT signed in. |
| **Steps** | 1. Navigate to the preview URL. 2. Do NOT sign in (dismiss the sign-in dialog if it appears, or click "Continue without signing in"). 3. Observe the top navigation bar. |
| **Expected Result** | No user avatar is visible in the top bar. The profile dropdown menu is not accessible. No JavaScript errors in the console. |
| **Pass Criteria** | Avatar button is absent. No runtime errors from `useMigration` receiving `undefined` as userId. |

---

## 5. Test Infrastructure Changes Required

### 5.1 Update `renderWithAuth` Helper

**File:** `src/components/UserProfile.test.jsx`

**Current implementation (lines 21-34):**
```javascript
function renderWithAuth(ui, user = null) {
  onAuthStateChanged.mockImplementation((callback) => {
    callback(user);
    return vi.fn();
  });

  return render(
    <LanguageProvider>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </LanguageProvider>
  );
}
```

**Updated implementation:**
```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithAuth(ui, user = null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  onAuthStateChanged.mockImplementation((callback) => {
    callback(user);
    return vi.fn();
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
```

**Why:** `useMigration` calls `useQueryClient()` internally. Without `QueryClientProvider` in the render tree, every test that renders `UserProfile` will throw: `"No QueryClient set, use QueryClientProvider to set one"`.

### 5.2 Add `useMigration` Mock

**Add at the top of `UserProfile.test.jsx` (after existing mocks):**
```javascript
vi.mock('../hooks/useMigration', () => ({
  useMigration: vi.fn(),
  MigrationStatus: {
    IDLE: 'idle',
    CHECKING: 'checking',
    CONSENT_PENDING: 'consent-pending',
    IN_PROGRESS: 'in-progress',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
  },
}));

import { useMigration, MigrationStatus } from '../hooks/useMigration';
```

### 5.3 Default Mock Return Value

**Add to the `beforeEach` block:**
```javascript
beforeEach(() => {
  vi.clearAllMocks();
  // Default: idle status (matches current "Local only" behavior)
  useMigration.mockReturnValue({
    status: MigrationStatus.IDLE,
    progress: { completed: 0, total: 0, percentage: 0 },
    errors: [],
    isInProgress: false,
    isCompleted: false,
    isPaused: false,
    isFailed: false,
    canRetry: false,
    startMigration: vi.fn(),
    cancelMigration: vi.fn(),
    retryMigration: vi.fn(),
    dismissError: vi.fn(),
    recheckStatus: vi.fn(),
  });
});
```

This ensures all existing tests continue to work with the default "Local only" behavior without modification.

### 5.4 Update Existing Test

**Test:** `"should display sync status"` (line 116 of current file)

This test currently asserts `screen.getByText(/מקומי בלבד/i)`. After the change, it will still pass because the default `useMigration` mock returns `status: 'idle'`, which maps to "Local only" / "מקומי בלבד". No change needed to this specific test, but verify during implementation.

---

## 6. Regression Impact

### 6.1 Tests That Will Break Without Infrastructure Update

| Test File | Test Name | Why It Breaks | Fix |
|-----------|-----------|---------------|-----|
| `UserProfile.test.jsx` | ALL tests (15 existing) | `useMigration` calls `useQueryClient()`, which requires `QueryClientProvider` | Update `renderWithAuth` to include `QueryClientProvider` (Section 5.1) |

### 6.2 Tests That Should NOT Break (Verify)

| Test File | Test Count | Risk | Reason |
|-----------|-----------|------|--------|
| `useMigration.test.jsx` | ~50+ tests | None | No changes to the hook itself |
| `MigrationPrompt.test.jsx` | ~30+ tests | None | No changes to MigrationPrompt component |
| `Dashboard.test.jsx` | Various | None | Does not import UserProfile |
| `History.test.jsx` | Various | None | Does not import UserProfile |
| `AddEntryForm.test.jsx` | Various | None | Does not import UserProfile |
| All other test files | 987 total | None | No shared state or imports affected |

### 6.3 Translation Key Collision Check

New translation keys to add:
- `syncedToCloud` -- Does NOT exist yet. Safe to add.
- `syncing` -- Does NOT exist yet. Safe to add.
- `syncFailed` -- Does NOT exist yet. Safe to add.

Existing keys that will NOT be changed:
- `syncStatusLocalOnly` -- Remains as the default/fallback text. No modification.
- `syncStatusSynced` -- Already exists but is not used by this feature (it is a different key). No collision.

---

## 7. Test Execution Checklist

### Pre-Implementation

- [ ] Read `src/components/UserProfile.jsx` and `UserProfile.test.jsx`
- [ ] Read `src/hooks/useMigration.js` (understand the `MigrationStatus` enum values and hook return shape)
- [ ] Verify `StorageIcon` is already imported in `UserProfile.jsx` (line 24 -- confirmed)
- [ ] Confirm the 3 new translation keys do not collide with existing keys

### Implementation

- [ ] Add 3 translation keys to Hebrew section of `LanguageProvider.jsx`
- [ ] Add 3 translation keys to English section of `LanguageProvider.jsx`
- [ ] Update `UserProfile.jsx`: import `useMigration`, `MigrationStatus`, and 3 new MUI icons
- [ ] Update `UserProfile.jsx`: call `useMigration(user?.uid)` before early return
- [ ] Update `UserProfile.jsx`: add `getSyncStatus()` with `useMemo`
- [ ] Update `UserProfile.jsx`: replace hardcoded "Local only" JSX with dynamic status

### Test Infrastructure

- [ ] Add `@tanstack/react-query` import to `UserProfile.test.jsx`
- [ ] Update `renderWithAuth` helper to include `QueryClientProvider`
- [ ] Add `vi.mock('../hooks/useMigration')` with `MigrationStatus` enum
- [ ] Add default `useMigration.mockReturnValue()` in `beforeEach`

### Unit Tests (16 tests)

- [ ] UT-01: "Local only" when NOT_STARTED
- [ ] UT-02: "Local only" when PAUSED
- [ ] UT-03: "Local only" when CANCELLED
- [ ] UT-04: "Synced to cloud" when COMPLETED
- [ ] UT-05: "Syncing..." when IN_PROGRESS
- [ ] UT-06: "Sync failed" when FAILED
- [ ] UT-07: StorageIcon when NOT_STARTED
- [ ] UT-08: CloudDoneIcon when COMPLETED
- [ ] UT-09: SyncIcon when IN_PROGRESS
- [ ] UT-10: ErrorOutlineIcon when FAILED
- [ ] UT-11: Hebrew "מסונכרן לענן" when COMPLETED
- [ ] UT-12: Hebrew "מסנכרן..." when IN_PROGRESS
- [ ] UT-13: Hebrew "הסנכרון נכשל" when FAILED
- [ ] UT-14: Hebrew "מקומי בלבד" when NOT_STARTED
- [ ] UT-15: useMigration called with undefined when user is null
- [ ] UT-16: No crash when migrationStatus is undefined

### Automated Validation

- [ ] `npm run lint` -- zero errors
- [ ] `npm test` -- all tests pass (987 existing + 16 new = 1003 minimum)
- [ ] `npm test -- --coverage` -- verify UserProfile.jsx coverage increased

### Manual Tests (on Netlify Preview)

- [ ] MT-01: Fresh user sees "Local only"
- [ ] MT-02: Migrated user sees "Synced to cloud"
- [ ] MT-03: Bilingual status display (Hebrew + English)
- [ ] MT-04: Mobile responsive at 375px
- [ ] MT-05: "Syncing..." during active migration
- [ ] MT-06: Status persists after page reload
- [ ] MT-07: No avatar when signed out

### Post-Merge Verification

- [ ] Production site (GitHub Pages) loads without errors
- [ ] Netlify production mirrors GitHub Pages behavior
- [ ] No new console warnings or errors in production

---

## 8. Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| New unit tests pass | 16/16 | `npm test` output shows all 16 new tests green |
| Existing tests pass | 987/987 (0 regressions) | `npm test` output shows total >= 1003, 0 failures |
| Lint errors | 0 | `npm run lint` exits with code 0 |
| React hooks violations | 0 | No `react-hooks/*` ESLint errors |
| Manual test scenarios | 7/7 (MT-01 through MT-07) | Documented in PR comment with pass/fail per scenario |
| Console errors on preview | 0 | DevTools Console is clean during all MT scenarios |
| Translation completeness | 6 new keys (3 Hebrew + 3 English) | Verified via UT-11 through UT-14 and UT-04 through UT-06 |
| No hardcoded strings | 0 hardcoded sync status strings in UserProfile.jsx | Code review confirms all text comes from translation keys |
| Coverage (UserProfile.jsx) | All 6 status branches covered | `npm test -- --coverage` shows branch coverage for the status switch |

### Definition of Done

1. All 16 new unit tests pass.
2. All 987 existing tests still pass (zero regressions).
3. `npm run lint` produces zero errors.
4. MT-01 through MT-07 pass on the Netlify preview deployment.
5. PR comment documents manual test results with pass/fail checklist.
6. No console errors or warnings during any test scenario.

---

**Test Plan Location:** `.github/ISSUE_54_TEST_PLAN.md`
**Companion Document:** `.github/ISSUE_54_GROOMING.md`
**Status:** Ready for implementation
