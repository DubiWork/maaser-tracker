# Issue #54: UserProfile Shows "Local only" After Migration — Grooming Report

**Date:** 2026-03-05
**Participants:** Product Manager, Technical Lead, QA Expert
**Status:** ✅ READY FOR DEVELOPMENT

---

## Executive Summary

**Business Value:** Medium — misleading sync status confuses users who have migrated data, and Issue #53 (GDPR data management) depends on a reliable status signal.
**Technical Complexity:** Low — single component, hook already exists, translations follow existing patterns.
**Strategic Alignment:** ✅ — completes the cloud migration UX loop from Issue #40.
**Recommended Priority:** P2-Medium (correct as labeled)
**Estimated Effort:** 1.5 hours

**Key Findings:**
- Issue is unusually well-specified with root cause, solution code, and test cases already documented.
- Main gap was the `PAUSED` migration state — not covered by the solution spec (minor gap, add to default/local-only case).
- Test infrastructure requires updating: existing `renderWithAuth` helper must be wrapped in `QueryClientProvider` or `useMigration` will crash tests.
- `useMigration(user?.uid)` requires the user's UID as parameter — the component already has `useAuth()`, so this is trivially available.
- Must implement #54 **before** #53 to avoid shipping GDPR controls alongside a broken status indicator.

**Next Steps:** Branch → implement → test → PR → submit.

---

## 1. Product Manager Analysis

### Business Value
Medium. The sync status indicator is part of the trust loop for cloud migration. Users who have migrated their data and see "Local only" will doubt whether their migration worked, potentially triggering support issues or re-migration attempts. Fixing it strengthens user confidence in the cloud sync feature shipped in Issue #40.

### Strategic Alignment
✅ Directly supports the Phase 1.5 goal: "Users need cloud sync to prevent data loss when changing devices." A completed migration that is not reflected in the UI is an unfinished feature.

### User Stories

**Story 1: See accurate cloud sync status**
- **As a** user who has migrated to Firestore
- **I want** the profile dropdown to show "Synced to cloud"
- **So that** I know my data is safely backed up and accessible on other devices

**Story 2: See real-time migration progress in profile**
- **As a** user whose migration is in progress
- **I want** the profile menu to reflect the in-progress state
- **So that** I don't have to open the migration dialog to check status

### Acceptance Criteria (Validated)
All 8 criteria from the issue are complete and testable. One addition recommended:
- [ ] Shows "Local only" when migration is PAUSED or CANCELLED (not just NOT_STARTED)

### PM Gaps Identified
- **Gap 1 (minor):** PAUSED and CANCELLED states not addressed in the solution spec. Both should fall through to the default "Local only" case. Document in issue.
- **Gap 2 (minor):** StorageIcon not explicitly imported in the solution — confirm it's already imported or add to import list.

### Milestone
Assign to **"Phase 1.5 - Authentication & Cloud"** — same milestone as Issue #40.

### Priority & Sequencing
P2-Medium is correct. Implement **before Issue #53** (GDPR). Shipping GDPR controls with a broken status indicator is a worse UX than the current state.

---

## 2. Technical Lead Analysis

### Technical Approach

Three-step change, all in isolation:

1. **`src/components/UserProfile.jsx`**
   - Import `useMigration` from `../hooks/useMigration`
   - Import `MigrationStatus` enum (already exported from the hook file)
   - Import 3 new MUI icons: `CloudDoneIcon`, `SyncIcon`, `ErrorOutlineIcon`
   - Confirm `StorageIcon` is already imported (it likely is, since "Local only" shows a cloud icon currently)
   - Call `useMigration(user?.uid)` — must be called **before any early return** (React hooks rule)
   - Add `getSyncStatus()` function wrapped in `useMemo` (optimization — prevents object recreation on every render)
   - Replace hardcoded "Local only" JSX with dynamic `{syncStatus.icon}` + `{syncStatus.text}`

2. **`src/contexts/LanguageProvider.jsx`**
   - Add 3 keys to Hebrew translations (lines ~128-129): `syncedToCloud`, `syncing`, `syncFailed`
   - Add 3 keys to English translations (lines ~319-320): `syncedToCloud`, `syncing`, `syncFailed`

3. **`src/components/UserProfile.test.jsx`**
   - Add `vi.mock('../hooks/useMigration')` at module level
   - Update `renderWithAuth` helper to wrap with `QueryClientProvider`
   - Add 6 new tests (one per status: COMPLETED, IN_PROGRESS, FAILED, NOT_STARTED, PAUSED, CANCELLED)
   - Update existing "should display sync status" test to mock `useMigration`

### Sub-Tasks

| # | Sub-Task | Effort | Notes |
|---|----------|--------|-------|
| 1 | Add translation keys (en + he) | 10 min | LanguageProvider.jsx |
| 2 | Update UserProfile.jsx | 20 min | Imports, hook call, getSyncStatus, JSX |
| 3 | Update tests | 40 min | Mock setup + 6 new tests |
| 4 | Lint + test run | 10 min | `npm run lint` + `npm test` |

**Total: ~1.5 hours**

### Key Technical Gotchas

1. **Hook call order:** `useMigration(user?.uid)` must be called unconditionally before any early return in the component. If `user` is null, pass `undefined` — the hook handles this gracefully.

2. **Test infrastructure:** `useMigration` uses React Query internally. Any test that renders `UserProfile` without `QueryClientProvider` will crash after this change. The `renderWithAuth` test helper must be updated to include `QueryClientProvider`.

3. **PAUSED/CANCELLED states:** The `MigrationStatus` enum has 7 values, not 4. The switch statement default case handles PAUSED and CANCELLED correctly by falling through to "Local only".

4. **useMemo optimization:** Wrap `getSyncStatus()` result in `useMemo` with `[migrationStatus, t]` as dependencies to avoid recreating the status object on every render.

### Architecture Considerations
No architectural changes. This is a pure UI read — no writes, no side effects, no new hooks. The `MigrationContext` is already available throughout the app via `MigrationPrompt` in `App.jsx`.

### Timeline
Best: 1h | Expected: 1.5h | Worst: 2h (if test infrastructure requires more refactoring)

---

## 3. QA Expert Analysis

### Test Strategy

**Unit Tests (new — 16 tests):**
```
UserProfile with useMigration:
- Renders "Local only" when status is NOT_STARTED
- Renders "Local only" when status is PAUSED
- Renders "Local only" when status is CANCELLED
- Renders "Synced to cloud" when status is COMPLETED
- Renders "Syncing..." when status is IN_PROGRESS
- Renders "Sync failed" when status is FAILED
- Shows StorageIcon when status is local
- Shows CloudDoneIcon when status is COMPLETED
- Shows SyncIcon when status is IN_PROGRESS
- Shows ErrorOutlineIcon when status is FAILED
- Hebrew: "מסונכרן לענן" when COMPLETED
- Hebrew: "מסנכרן..." when IN_PROGRESS
- Hebrew: "הסנכרון נכשל" when FAILED
- Hebrew: "מקומי בלבד" when NOT_STARTED
- Does not call useMigration when user is signed out
- Renders without crash when migrationStatus is undefined
```

**Existing Tests Requiring Update (1 test):**
- `"should display sync status"` (UserProfile.test.jsx line 116-124): Currently asserts hardcoded "מקומי בלבד". After change, must add `useMigration` mock returning `{ status: 'idle' }`.

**Test Infrastructure Change Required:**
```javascript
// Update renderWithAuth helper to include QueryClientProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithAuth(ui, user = null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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

### Playwright Manual Test Cases

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|-----------------|
| MT-01 | Fresh browser profile (no prior migration). Viewport 1280x720. | 1. Navigate to `https://deploy-preview-{PR#}--maaser-tracker.netlify.app/`. 2. Click "Sign In" button. 3. Complete Google sign-in flow. 4. If migration consent dialog appears, decline/dismiss. 5. Click user avatar (top-right) to open profile menu. 6. Open DevTools Console tab. | Profile menu shows "Local only" with storage icon. No console errors. |
| MT-02 | User signed in. Has ≥1 entry in IndexedDB. Viewport 1280x720. | 1. Navigate to preview URL. 2. Sign in if not already. 3. If migration consent dialog appears, click "Sync to Cloud". 4. Wait for migration progress bar to reach 100%. 5. Click user avatar. 6. Check Console. | Sync status shows "Synced to cloud" with cloud-done icon. No console errors. |
| MT-03 | User signed in. Migration completed. Language = Hebrew (default). Viewport 1280x720. | 1. Navigate to preview URL. 2. Click user avatar. 3. Read sync status text. 4. Click language toggle to switch to English. 5. Click user avatar again. 6. Read sync status text. | Hebrew: "מסונכרן לענן" (RTL layout). English: "Synced to cloud" (LTR layout). Both correct. |
| MT-04 | User signed in. Migration completed. Viewport 375x812 (mobile). | 1. Resize to 375px width. 2. Navigate to preview URL. 3. Click user avatar. 4. Read sync status. 5. Press Escape to close. 6. Check Console. | Menu fits in 375px viewport. Status text readable (not truncated). No console errors. |
| MT-05 | User signed in with entries. Migration NOT started. | 1. Navigate to preview URL. 2. Accept migration consent dialog to START migration. 3. Immediately (while spinner is visible) click user avatar. 4. Read sync status. | Status shows "Syncing..." with sync spinner icon while migration is in progress. |
| MT-06 | User signed in. Migration previously completed. Page reload. | 1. Complete migration. 2. Reload page (F5). 3. Sign in again if required. 4. Click user avatar. | After reload, still shows "Synced to cloud" (status is persisted, not in-memory only). |
| MT-07 | User signed out. | 1. Navigate to preview URL. 2. Do NOT sign in. 3. Observe the top bar. | No user avatar visible. Profile menu not accessible. No errors. |

### Edge Cases
- `migrationStatus` is undefined → default "Local only" (handled by switch default)
- User signs out mid-migration → status resets, next sign-in shows correct state
- Status changes while profile menu is open → menu updates reactively via `useMigration` hook's subscription

### Success Metrics
- All 16 new unit tests pass
- All existing 987 tests continue to pass (no regressions)
- MT-01 through MT-07 pass manually on Netlify preview
- `npm run lint` → zero errors

### Testing Effort Estimate
~2 hours total (includes unit tests + test infrastructure + manual Playwright tests)

---

## 4. Gaps Analysis

### ✅ Resolved During Grooming
- **PAUSED/CANCELLED states** — both fall to default "Local only" case
- **StorageIcon import** — needs to be verified; if not already imported, add it
- **useMigration parameter** — confirmed: `useMigration(user?.uid)`, pass `undefined` when signed out
- **Test infrastructure** — `renderWithAuth` must be updated to include `QueryClientProvider`

### ⚠️ Still Outstanding
None — issue is ready for development.

---

## 5. Implementation Plan

### Single Sprint (1 Session)

| Order | Task | File | Time |
|-------|------|------|------|
| 1 | Add translation keys | `src/contexts/LanguageProvider.jsx` | 10 min |
| 2 | Update UserProfile.jsx | `src/components/UserProfile.jsx` | 20 min |
| 3 | Update test infrastructure + add tests | `src/components/UserProfile.test.jsx` | 40 min |
| 4 | Lint + test run | terminal | 10 min |

**Critical path:** All sequential. No parallel work needed.

---

## 6. Metadata Recommendations

- **Labels:** bug, P2-medium, UI, migration (already correct)
- **Milestone:** Phase 1.5 - Authentication & Cloud
- **Assignee:** @DubiWork
- **Estimate:** 1.5 hours / 1 story point

---

## 7. Security & Compliance

✅ No special security or compliance requirements.
- Read-only hook consumption (no writes)
- No new data access patterns
- No PII displayed beyond what's already shown in UserProfile

---

## 8. Open Questions

✅ No open questions — all requirements are clear.

---

## 9. Rollback Plan

### Trigger
Execute this plan ONLY when: production Playwright tests fail after merging PR for Issue #54.

### Part 1 — Git Revert
- Expected commit message pattern: `#54 Dynamic sync status in UserProfile`
- Action: `git revert <merge-commit-sha> --no-edit && git push origin main`

### Part 2 — Manual Cleanup Steps

| # | Step | Command/Action | Risk | Human Required? |
|---|------|---------------|------|----------------|
| 1 | No Firestore changes | N/A | None | No |
| 2 | No security rule changes | N/A | None | No |
| 3 | No localStorage/IndexedDB changes | N/A | None | No |

**Manual cleanup required: None — git revert is sufficient.**
This issue touches only UI code and translations. No data is written. Reverting the commit fully restores the previous state.

### Rollback Verification
After rollback, these regression tests must pass:
- RT-Auth-01 (sign in flow)
- RT-Core-01 (add income)
- MT-07 (profile menu not accessible when signed out — indirectly validates UserProfile renders)

---

## 10. Next Steps

### Before Development Starts
1. [x] Grooming report reviewed
2. [x] Acceptance criteria finalized (add PAUSED/CANCELLED to default case)
3. [x] Test plan with Playwright test table added
4. [x] Rollback plan created
5. [x] Metadata: assign milestone "Phase 1.5 - Authentication & Cloud"
6. [ ] Issue marked "ready-for-dev"
7. [ ] Run `/start-issue 54`

---

**Report Generated:** 2026-03-05
**Report Location:** `.github/ISSUE_54_GROOMING.md`
**Status:** ✅ READY FOR DEVELOPMENT

---
*Groomed via `/groom-issue` skill | Ma'aser Tracker Project*
