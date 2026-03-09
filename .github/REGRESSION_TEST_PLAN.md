# Ma'aser Tracker -- Regression Test Plan

**Purpose:** Playwright-executable regression suite run against Netlify preview and production after every PR merge.

**Production URL:** `https://dubiwork.github.io/maaser-tracker/`
**Preview URL pattern:** `https://deploy-preview-{PR#}--maaser-tracker.netlify.app/`

---

## Execution Instructions

For each test case below:
1. Navigate to the specified URL
2. Follow the steps exactly as written
3. Verify the expected result
4. Check DevTools Console for errors (level: warning or higher)
5. Mark ✅ PASS or ❌ FAIL

**Viewport defaults:** 1280×720 unless stated otherwise.

---

## Core Flows

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-Core-01 | User signed in (any account). Hebrew language (default). | 1. Navigate to app. 2. Click "הוסף הכנסה" (Add Income). 3. Enter amount "1000". 4. Click save. 5. Return to dashboard. | New income entry appears. Dashboard total increases. Ma'aser amount (100) shown correctly. No console errors. |
| RT-Core-02 | User signed in. At least one income entry exists. | 1. Navigate to app. 2. Click "הוסף תרומה" (Add Donation). 3. Enter amount "100". 4. Click save. 5. Return to dashboard. | New donation entry appears. Dashboard remaining obligation updates. No console errors. |
| RT-Core-03 | User signed in. At least one entry exists. | 1. Navigate to app. 2. Open History tab. 3. Verify entries are listed with date, amount, type. | Entries display correctly with income/donation icons. Amounts formatted correctly. No console errors. |
| RT-Core-04 | User signed in. Entry exists in history. | 1. Open History. 2. Click edit on an entry. 3. Change the amount. 4. Save. | Entry updates with new amount. Dashboard recalculates. No console errors. |
| RT-Core-05 | User signed in. Entry exists in history. | 1. Open History. 2. Click delete on an entry. 3. Confirm deletion. | Entry removed. Dashboard recalculates. No console errors. |

---

## Authentication Flows

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-Auth-01 | User signed out. | 1. Navigate to app. 2. Click "כניסה" (Sign In). 3. Complete Google sign-in flow. | User signed in. Avatar appears in top bar. No console errors. |
| RT-Auth-02 | User signed in. | 1. Click user avatar. 2. Click "יציאה" (Sign Out). | User signed out. Avatar disappears. App still accessible (offline mode). No console errors. |
| RT-Auth-03 | User signed out. | 1. Navigate to app. 2. Do NOT sign in. 3. Add an income entry. | Entry saved to local IndexedDB. Dashboard shows entry. No auth required. No console errors. |

---

## Sync Status Flows (Added: Issue #54)

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-Sync-01 | User signed in. Migration NOT completed. 1280×720. | 1. Sign in. 2. Dismiss or decline migration dialog. 3. Click user avatar. | Profile menu shows "Local only" with StorageIcon. No console errors. |
| RT-Sync-02 | User signed in. Migration previously completed. 1280×720. | 1. Sign in (as user who already migrated). 2. Click user avatar. | Profile menu shows "Synced to cloud" with CloudDoneIcon. No console errors. |
| RT-Sync-03 | User signed in. Migration completed. Language = Hebrew. | 1. Sign in. 2. Click avatar. 3. Read sync status. | Status shows "מסונכרן לענן" in Hebrew. RTL layout correct. No console errors. |
| RT-Sync-04 | User signed in. Migration completed. Language = Hebrew. | 1. Click language toggle (switch to English). 2. Click avatar. 3. Read sync status. | Status shows "Synced to cloud" in English. LTR layout correct. No console errors. |

---

## PWA Flows

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-PWA-01 | Chrome on desktop. Not installed as PWA. | 1. Navigate to app. 2. Wait 5 seconds. | Install prompt appears (or install button visible in top bar). No console errors. |
| RT-PWA-02 | Any browser. Network connected. | 1. Navigate to app. 2. Verify no offline banner. 3. Use DevTools to go offline. 4. Wait 2 seconds. | Offline indicator/banner appears. No crash. Data still visible from cache. |
| RT-PWA-03 | Browser offline (from RT-PWA-02). | 1. Re-enable network in DevTools. 2. Wait 2 seconds. | Offline banner disappears. App continues functioning. No console errors. |

---

## Bilingual / Internationalization Flows

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-i18n-01 | Default language (Hebrew). 1280×720. | 1. Navigate to app. 2. Verify page direction. 3. Read main navigation labels. | Page renders RTL. Hebrew text in navigation, buttons, and labels. No console errors. |
| RT-i18n-02 | Hebrew language (default). | 1. Click language toggle button. | App switches to English. All labels render in English. LTR layout. No console errors. |
| RT-i18n-03 | English language (after toggle). | 1. Click language toggle button again. | App switches back to Hebrew. RTL layout restored. No console errors. |

---

## Responsive Design Flows

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-Resp-01 | Any authenticated state. | 1. Resize browser to 375×812 (mobile). 2. Navigate to app. 3. View dashboard. | Dashboard renders correctly at 375px. No horizontal overflow. Buttons tappable. No console errors. |
| RT-Resp-02 | Any authenticated state. | 1. Resize browser to 768×1024 (tablet). 2. Navigate to app. 3. View dashboard. | Dashboard renders correctly at 768px. Layout adapts. No console errors. |
| RT-Resp-03 | Any authenticated state. | 1. Resize browser to 1280×720 (desktop). 2. Navigate to app. | Full desktop layout visible. No truncated elements. No console errors. |

---

## Accounting Month Flows

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-Month-01 | User signed in. | 1. Click Add Income. 2. Verify accounting month field is present and defaults to current month. | Accounting month picker visible. Defaults to current YYYY-MM. No console errors. |
| RT-Month-02 | User signed in. | 1. Click Add Income. 2. Change accounting month to prior month. 3. Save. 4. View History. | Entry shows both payment date and (different) accounting month. No console errors. |

---

## GDPR Data Management Flows (Added: Issue #53)

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-GDPR-01 | User signed in. Migration completed (cloud sync active). | 1. Click user avatar. 2. Verify "Export my data" menu item is visible. 3. Click "Export my data". 4. Wait for export dialog to appear. 5. Confirm export completes. | DataManagement dialog opens with export action. Export progress indicator shown. JSON file downloads containing user entries with exportedAt timestamp and schemaVersion. Success confirmation displayed. No console errors. |
| RT-GDPR-02 | User signed in. Migration completed (cloud sync active). | 1. Click user avatar. 2. Click "Delete cloud data". 3. Verify warning dialog appears with checkbox. 4. Check "I understand" checkbox. 5. Click "Delete cloud data" button. | DataManagement dialog opens with delete confirmation. Warning alert and irreversibility notice displayed. Checkbox must be checked before delete button enables. Progress indicator shown during deletion. Success message confirms cloud data deleted and local data unchanged. No console errors. |
| RT-GDPR-03 | User signed in. Migration NOT completed (local only). | 1. Click user avatar. 2. Inspect profile menu items. | "Export my data" and "Delete cloud data" menu items are NOT visible. Only sync status ("Local only"), sign out, and privacy policy links shown. No console errors. |

---

## Privacy Policy Flows (Added: Issue #56)

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-Privacy-01 | User signed in. Any language. | 1. Click user avatar. 2. Verify "Privacy Policy" menu item is visible (always shown, regardless of auth or migration status). 3. Click "Privacy Policy". | Hash changes to `#/privacy`. Privacy Policy page renders with title, last updated date, and all 9 sections (Introduction, Data We Collect, How We Store, How We Use, Your Rights, Data Security, Children, Changes, Contact). Back button visible at top and bottom. No console errors. |
| RT-Privacy-02 | Privacy Policy page open. Hebrew language (default). | 1. Verify page renders in RTL direction. 2. Read section titles and content. 3. Click language toggle button on privacy page. 4. Verify page switches to English LTR. | Hebrew RTL layout correct with all section titles in Hebrew. After toggle, English LTR layout correct with all section titles in English. Language toggle button on privacy page functional. No console errors. |
| RT-Privacy-03 | Privacy Policy page open. Any language. | 1. Click "Back" button at top of page. 2. Verify app returns to main view. 3. Navigate to `#/privacy` via URL bar directly. 4. Verify privacy page loads. | Back button clears hash and returns to main app view. Direct hash navigation to `#/privacy` renders the privacy page correctly. Hash routing works bidirectionally. No console errors. |

---

## Import/Export Flows (Added: Issue #117)

| ID | Preconditions | Steps | Expected Result |
|----|--------------|-------|----------------|
| RT-IE-01 | User signed in. At least 5 entries exist (mix of income and donation). | 1. Navigate to Settings or Import/Export page. 2. Click "Export JSON". 3. Verify JSON file downloads. 4. Clear all entries (or use Replace mode). 5. Click "Import". 6. Select the exported JSON file. 7. Choose "Replace All" mode. 8. Confirm import. 9. Return to Dashboard. | JSON file downloads with correct filename (maaser-tracker-YYYY-MM-DD.json). Import succeeds with all entries restored. Dashboard totals match pre-export values. No console errors. |
| RT-IE-02 | User signed in. At least 3 entries with Hebrew notes exist. | 1. Click "Export CSV". 2. Open exported CSV file in Excel or Google Sheets. 3. Verify column headers are present (id, type, date, amount, note, accountingMonth). 4. Verify Hebrew text displays correctly. 5. Verify amounts are numeric (not text). | CSV file opens correctly in spreadsheet application. Hebrew text renders properly (not garbled). Amounts are recognized as numbers. BOM prefix ensures correct encoding. No formula injection (cells starting with =, +, -, @ are prefixed with '). |
| RT-IE-03 | User signed in. Excel or text editor available. | 1. Create a CSV file with Hebrew headers: סוג,סכום,תאריך,הערה. 2. Add rows: הכנסה,5000,15/03/2026,משכורת and תרומה,500,16/03/2026,צדקה. 3. Save as UTF-8 CSV. 4. Import the file in the app. 5. Check History page. | Both entries imported correctly. Hebrew type values mapped (הכנסה→income, תרומה→donation). Dates parsed correctly (DD/MM/YYYY format). Hebrew notes preserved. No console errors. |
| RT-IE-04 | User signed in. | 1. Attempt to import a malformed JSON file (e.g., `{ broken }}`). 2. Attempt to import a JSON with wrong schema version. 3. Attempt to import a CSV missing required columns. | Each attempt shows a clear, user-friendly error message. No data is modified in the database. App remains functional after each failed import. No console errors or crashes. |
| RT-IE-05 | User signed in. At least 100 entries exist (or import a large file). | 1. Export all entries as JSON. 2. Import the file using "Replace All" mode. 3. Observe progress indicator during import. 4. Verify completion. | Progress bar/indicator is visible during import. Import completes successfully within 30 seconds. All entries present after import. Dashboard recalculates correctly. No console errors. |

---

## Total Test Cases: 38

| Category | Count |
|----------|-------|
| Core Flows | 5 |
| Authentication | 3 |
| Sync Status (Issue #54) | 4 |
| PWA | 3 |
| Bilingual/i18n | 3 |
| Responsive | 3 |
| Accounting Month | 2 |
| GDPR Data Management (Issue #53) | 3 |
| Privacy Policy (Issue #56) | 3 |
| Import/Export (Issue #117) | 5 |
| **Total** | **38** |

---

**Last Updated:** 2026-03-09
**Updated By:** Integration testing -- Issue #117
