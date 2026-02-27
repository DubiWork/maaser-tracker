#!/usr/bin/env python3
"""
Script to create GitHub labels, milestones, and issues for the Ma'aser Tracker project.
"""

import json
import subprocess
import sys

OWNER = "DubiWork"
REPO = "maaser-tracker"

# Labels to create
LABELS = [
    {"name": "epic", "color": "7057ff", "description": "Epic-level issue"},
    {"name": "story", "color": "0e8a16", "description": "User story"},
    {"name": "task", "color": "1d76db", "description": "Technical task"},
    {"name": "bug", "color": "d73a4a", "description": "Bug fix"},
    {"name": "P0-critical", "color": "b60205", "description": "Critical priority"},
    {"name": "P1-high", "color": "d93f0b", "description": "High priority"},
    {"name": "P2-medium", "color": "fbca04", "description": "Medium priority"},
    {"name": "P3-low", "color": "c2e0c6", "description": "Low priority"},
    {"name": "frontend", "color": "bfdadc", "description": "Frontend work"},
    {"name": "backend", "color": "fef2c0", "description": "Backend/data work"},
    {"name": "testing", "color": "d4c5f9", "description": "Testing work"},
    {"name": "infrastructure", "color": "f9d0c4", "description": "CI/CD, DevOps"},
    {"name": "pwa", "color": "5319e7", "description": "PWA related"},
    {"name": "i18n", "color": "bfd4f2", "description": "Internationalization"},
]

# Milestones to create
MILESTONES = [
    {"title": "v0.2.0 - Foundation", "description": "Foundation and Infrastructure + PWA", "due_on": None},
    {"title": "v0.3.0 - Core Features", "description": "Core Feature Enhancements + Settings", "due_on": None},
    {"title": "v0.4.0 - Cloud & Analytics", "description": "Cloud Sync + Analytics and Reporting", "due_on": None},
    {"title": "v1.0.0 - Production Release", "description": "Polish and Production Release", "due_on": None},
]

# Epics and Stories
ISSUES = [
    # Epic 1
    {
        "title": "Epic 1: Foundation and Infrastructure",
        "body": """## Description
Establish the technical foundation for a production-ready application including proper data persistence, testing infrastructure, and CI/CD.

## Goals
- Migrate from LocalStorage to IndexedDB for robust data persistence
- Set up React Query for data management
- Establish comprehensive testing infrastructure
- Configure CI/CD pipeline with GitHub Actions

## Success Criteria
- [ ] All data stored in IndexedDB with migration from LocalStorage
- [ ] React Query integrated for data operations
- [ ] >80% test coverage on critical paths
- [ ] Automated CI/CD pipeline operational

## Stories
- #2 - IndexedDB Migration
- #3 - React Query Integration
- #4 - Testing Infrastructure
- #5 - CI/CD Setup
""",
        "labels": ["epic", "P0-critical", "backend", "infrastructure"],
        "milestone": "v0.2.0 - Foundation",
    },

    # Story 1.1
    {
        "title": "Migrate from LocalStorage to IndexedDB",
        "body": """## Description
Replace LocalStorage with IndexedDB for more robust data persistence that can handle larger datasets and structured queries.

## Business Value
Enables offline-first functionality, better performance with large datasets, and foundation for future features like search and filtering.

## Acceptance Criteria
- [ ] All existing data types (income, donation) are stored in IndexedDB
- [ ] Data is automatically migrated from LocalStorage on first load
- [ ] Application works offline after initial load
- [ ] Storage quota warnings are handled gracefully
- [ ] No data loss during migration

## Sub-tasks
1. Create IndexedDB service layer [4h]
   - File: `src/services/db.js`
   - Define database schema version 1
   - Create `entries` object store with indexes for `date`, `type`, `amount`
   - Implement CRUD operations: `addEntry`, `updateEntry`, `deleteEntry`, `getAllEntries`, `getEntriesByDateRange`

2. Implement migration utility [2h]
   - File: `src/services/migration.js`
   - Detect existing LocalStorage data
   - Migrate to IndexedDB with validation
   - Clear LocalStorage after successful migration

3. Create custom React hooks for data access [3h]
   - File: `src/hooks/useEntries.js`
   - `useEntries()` - fetch all entries
   - `useAddEntry()` - mutation hook
   - `useUpdateEntry()` - mutation hook
   - `useDeleteEntry()` - mutation hook

4. Update App.jsx to use new data layer [2h]
   - Remove LocalStorage functions
   - Replace with React Query hooks
   - Add QueryClientProvider wrapper

5. Add error boundaries for data layer failures [1h]
   - File: `src/components/ErrorBoundary.jsx`
   - Graceful degradation if IndexedDB unavailable

## Dependencies
None

## Estimate
12 hours / 3 story points
""",
        "labels": ["story", "P0-critical", "backend"],
        "milestone": "v0.2.0 - Foundation",
    },

    # Story 1.2
    {
        "title": "Integrate React Query",
        "body": """## Description
Set up React Query for data fetching, caching, and synchronization with IndexedDB.

## Business Value
Provides consistent data fetching patterns, automatic caching, and prepares for cloud sync integration.

## Acceptance Criteria
- [ ] QueryClient configured with sensible defaults
- [ ] All data operations use React Query hooks
- [ ] Optimistic updates for better UX
- [ ] Query invalidation works correctly
- [ ] DevTools available in development

## Sub-tasks
1. Configure QueryClient [1h]
   - File: `src/lib/queryClient.js`
   - Set default staleTime, cacheTime
   - Configure retry logic

2. Create query keys factory [1h]
   - File: `src/lib/queryKeys.js`
   - Consistent key structure

3. Add React Query DevTools [0.5h]
   - Conditional loading in development

## Dependencies
Requires: #2 (IndexedDB Migration)

## Estimate
2.5 hours / 1 story point
""",
        "labels": ["story", "P0-critical", "backend"],
        "milestone": "v0.2.0 - Foundation",
    },

    # Story 1.3
    {
        "title": "Set Up Testing Infrastructure",
        "body": """## Description
Establish testing framework and create initial test suite for critical functionality.

## Business Value
Ensures reliability, catches regressions, and enables confident refactoring.

## Acceptance Criteria
- [ ] Vitest configured for unit testing
- [ ] React Testing Library configured for component tests
- [ ] At least 80% coverage on data service layer
- [ ] CI runs tests on every push
- [ ] Test utilities for common scenarios

## Sub-tasks
1. Configure Vitest and React Testing Library [2h]
   - Add dev dependencies
   - Create `vitest.config.js`
   - Add test scripts to package.json

2. Create test utilities and mocks [2h]
   - File: `src/test/utils.jsx`
   - File: `src/test/mocks/db.js`

3. Write unit tests for data service [3h]
   - Test IndexedDB CRUD operations
   - Test migration logic

4. Write component tests for critical paths [4h]
   - Dashboard calculations
   - Form validation

## Dependencies
Requires: #2 (IndexedDB Migration)

## Estimate
11 hours / 3 story points
""",
        "labels": ["story", "P0-critical", "testing"],
        "milestone": "v0.2.0 - Foundation",
    },

    # Story 1.4
    {
        "title": "Configure GitHub Actions CI/CD",
        "body": """## Description
Set up automated testing and deployment pipeline.

## Business Value
Ensures code quality, automates deployment, and enables team collaboration.

## Acceptance Criteria
- [ ] Tests run on every PR
- [ ] Lint checks run on every PR
- [ ] Build succeeds before merge
- [ ] Auto-deploy to GitHub Pages on main branch merge
- [ ] Branch protection rules configured

## Sub-tasks
1. Create CI workflow [2h]
   - File: `.github/workflows/ci.yml`
   - Run lint, type check, tests

2. Create CD workflow [2h]
   - File: `.github/workflows/deploy.yml`
   - Build for production
   - Deploy to GitHub Pages

3. Configure branch protection [0.5h]
   - Require PR reviews
   - Require status checks

## Dependencies
Requires: #4 (Testing Infrastructure)

## Estimate
4.5 hours / 1 story point
""",
        "labels": ["story", "P0-critical", "infrastructure"],
        "milestone": "v0.2.0 - Foundation",
    },

    # Epic 2
    {
        "title": "Epic 2: PWA and Offline Functionality",
        "body": """## Description
Complete PWA implementation for installable, offline-capable application.

## Goals
- Make app installable on all platforms
- Enable full offline functionality
- Add sync status indicators
- Proper service worker caching

## Success Criteria
- [ ] App installable on iOS, Android, desktop
- [ ] Works fully offline after first load
- [ ] Users see connection status
- [ ] Auto-updates when new version available

## Stories
- #6 - Complete PWA Configuration
- #7 - Offline Status Indicator
""",
        "labels": ["epic", "P0-critical", "pwa"],
        "milestone": "v0.2.0 - Foundation",
    },

    # Story 2.1
    {
        "title": "Complete PWA Configuration",
        "body": """## Description
Finalize PWA manifest and service worker for app installation and offline use.

## Business Value
Users can install the app on their devices and use it without internet connection.

## Acceptance Criteria
- [ ] App is installable on iOS, Android, and desktop
- [ ] Proper icons for all platforms (192px, 512px, maskable)
- [ ] Splash screen configured
- [ ] Works offline after first load
- [ ] Updates automatically when new version available

## Sub-tasks
1. Create proper PWA icons [2h]
   - Generate PNG icons: 192x192, 512x512
   - Create maskable icons for Android

2. Update PWA manifest [1h]
   - File: `vite.config.js` VitePWA configuration
   - Add all icon variations

3. Configure service worker caching strategy [2h]
   - Cache static assets
   - NetworkFirst for API calls

4. Add PWA install prompt [2h]
   - File: `src/components/InstallPrompt.jsx`
   - Detect installability

5. Test PWA on multiple platforms [2h]
   - iOS Safari, Android Chrome, Desktop

## Dependencies
Requires: #2 (IndexedDB Migration)

## Estimate
9 hours / 2 story points
""",
        "labels": ["story", "P0-critical", "pwa"],
        "milestone": "v0.2.0 - Foundation",
    },

    # Story 2.2
    {
        "title": "Add Offline Status Indicator",
        "body": """## Description
Show users their online/offline status and sync state.

## Business Value
Users understand when data will sync and can trust the app to work offline.

## Acceptance Criteria
- [ ] Visual indicator when offline
- [ ] Indicator when data is syncing
- [ ] Toast notification on connection change
- [ ] Graceful handling of failed operations

## Sub-tasks
1. Create online status hook [1h]
   - File: `src/hooks/useOnlineStatus.js`
   - Track navigator.onLine

2. Create status indicator component [2h]
   - File: `src/components/ConnectionStatus.jsx`
   - Subtle banner when offline

3. Add toast notifications [2h]
   - Notify on connection loss/recovery

## Dependencies
Requires: #6 (PWA Configuration)

## Estimate
5 hours / 1 story point
""",
        "labels": ["story", "P0-critical", "pwa", "frontend"],
        "milestone": "v0.2.0 - Foundation",
    },

    # Epic 3
    {
        "title": "Epic 3: Core Feature Enhancements",
        "body": """## Description
Enhance existing features and add commonly requested functionality.

## Goals
- Date range filtering for historical data
- Donation categories for organization
- Recurring income support
- Multi-currency support

## Success Criteria
- [ ] Users can view data for custom date ranges
- [ ] Donations categorized by recipient type
- [ ] Automatic recurring income entries
- [ ] Support for multiple currencies

## Stories
- #8 - Date Range Filtering
- #9 - Donation Categories
- #10 - Recurring Income Support
- #11 - Multi-Currency Support
""",
        "labels": ["epic", "P1-high", "frontend", "backend"],
        "milestone": "v0.3.0 - Core Features",
    },

    # Story 3.1
    {
        "title": "Add Date Range Filtering",
        "body": """## Description
Allow users to view entries and statistics for custom date ranges, not just current month.

## Business Value
Users can review historical data and track year-to-date obligations.

## Acceptance Criteria
- [ ] Date range picker on Dashboard and History
- [ ] Preset options: This month, Last month, This year, Custom
- [ ] Statistics recalculate for selected range
- [ ] Selection persists during session
- [ ] Hebrew/English date formats supported

## Sub-tasks
1. Create DateRangePicker component [3h]
   - File: `src/components/DateRangePicker.jsx`
   - MUI DatePicker integration
   - Bilingual date formatting

2. Update Dashboard for date filtering [2h]
   - Accept dateRange prop
   - Recalculate stats

3. Update History for date filtering [2h]
   - Filter entries by range

4. Create date range context [1h]
   - File: `src/contexts/DateRangeContext.jsx`
   - Share selected range

## Dependencies
Requires: #2 (IndexedDB Migration)

## Estimate
8 hours / 2 story points
""",
        "labels": ["story", "P1-high", "frontend"],
        "milestone": "v0.3.0 - Core Features",
    },

    # Story 3.2
    {
        "title": "Add Categories for Donations",
        "body": """## Description
Allow users to categorize donations by recipient type (synagogue, charity, individual, etc.).

## Business Value
Users can track where their tzedakah goes and report for tax purposes.

## Acceptance Criteria
- [ ] Predefined categories in Hebrew/English
- [ ] Optional custom categories
- [ ] Category selection in donation form
- [ ] Category visible in History
- [ ] Filter/group by category in reports

## Sub-tasks
1. Define category data structure [1h]
   - Predefined categories with translations

2. Update IndexedDB schema [2h]
   - Add category field
   - Migration for existing entries

3. Update AddDonation form [2h]
   - Category dropdown with icons

4. Update History display [1h]
   - Show category chip

5. Add category breakdown to Dashboard [2h]
   - Pie chart or list

## Dependencies
Requires: #2 (IndexedDB Migration)

## Estimate
8 hours / 2 story points
""",
        "labels": ["story", "P1-high", "frontend", "backend"],
        "milestone": "v0.3.0 - Core Features",
    },

    # Story 3.3
    {
        "title": "Add Recurring Income Support",
        "body": """## Description
Allow users to set up recurring income entries that automatically create entries.

## Business Value
Reduces manual entry for salaried users, ensures consistent tracking.

## Acceptance Criteria
- [ ] Define recurring income (monthly, bi-weekly, weekly)
- [ ] Auto-generate entries on schedule
- [ ] Edit/delete recurring templates
- [ ] Visual indicator for auto-generated entries
- [ ] Option to skip specific occurrences

## Sub-tasks
1. Design recurring entry schema [2h]
   - Separate `recurringTemplates` store

2. Create RecurringIncomeForm component [3h]
   - File: `src/components/RecurringIncome.jsx`
   - Frequency selector

3. Implement entry generation logic [3h]
   - File: `src/services/recurring.js`
   - Check on app load

4. Add recurring section to Dashboard [2h]
   - Show active recurring entries

## Dependencies
Requires: #2, #8

## Estimate
10 hours / 3 story points
""",
        "labels": ["story", "P1-high", "frontend", "backend"],
        "milestone": "v0.3.0 - Core Features",
    },

    # Story 3.4
    {
        "title": "Multi-Currency Support",
        "body": """## Description
Allow users to enter income and donations in multiple currencies.

## Business Value
Users with international income can track accurately without manual conversion.

## Acceptance Criteria
- [ ] Currency selector in forms (ILS default)
- [ ] Common currencies: USD, EUR, GBP, ILS
- [ ] Manual exchange rate entry
- [ ] All calculations in base currency (ILS)
- [ ] Display original + converted amounts

## Sub-tasks
1. Update entry schema for currency [1h]
   - Add `currency` and `originalAmount` fields

2. Create currency selector component [2h]
   - File: `src/components/CurrencyInput.jsx`

3. Update forms with currency support [2h]
   - AddIncome/AddDonation

4. Update Dashboard calculations [2h]
   - Convert all to base currency

5. Add settings for default currency [1h]
   - User preference

## Dependencies
Requires: #2

## Estimate
8 hours / 2 story points
""",
        "labels": ["story", "P1-high", "frontend", "backend", "i18n"],
        "milestone": "v0.3.0 - Core Features",
    },

    # Epic 4
    {
        "title": "Epic 4: User Preferences and Settings",
        "body": """## Description
Add settings screen and user preferences persistence.

## Goals
- Comprehensive settings page
- Theme customization (light/dark)
- Configurable ma'aser percentage
- Data export/import capabilities

## Success Criteria
- [ ] Settings page accessible from app bar
- [ ] All preferences persist across sessions
- [ ] Users can backup/restore data
- [ ] Dark mode support

## Stories
- #12 - Create Settings Screen
- #13 - Data Export/Import
""",
        "labels": ["epic", "P1-high", "frontend"],
        "milestone": "v0.3.0 - Core Features",
    },

    # Story 4.1
    {
        "title": "Create Settings Screen",
        "body": """## Description
Add a settings page for user preferences.

## Business Value
Users can customize the app to their needs without changing code.

## Acceptance Criteria
- [ ] Accessible from app bar menu
- [ ] Language selection
- [ ] Default currency
- [ ] Ma'aser percentage (10% default, allow custom)
- [ ] Theme selection (light/dark/auto)
- [ ] Settings persist across sessions

## Sub-tasks
1. Create Settings component [3h]
   - File: `src/components/Settings.jsx`
   - Form with all preferences

2. Create settings context and hook [2h]
   - File: `src/contexts/SettingsContext.jsx`
   - Load from DB on mount

3. Add settings navigation [1h]
   - Settings icon in app bar

4. Implement dark mode [2h]
   - MUI theme switcher

5. Make ma'aser percentage configurable [2h]
   - Update calculations

## Dependencies
Requires: #2

## Estimate
10 hours / 3 story points
""",
        "labels": ["story", "P1-high", "frontend"],
        "milestone": "v0.3.0 - Core Features",
    },

    # Story 4.2
    {
        "title": "Add Data Export/Import",
        "body": """## Description
Allow users to export and import their data for backup and transfer.

## Business Value
Users can backup data, transfer to new device, and use data in spreadsheets.

## Acceptance Criteria
- [ ] Export to JSON file
- [ ] Export to CSV file
- [ ] Import from JSON
- [ ] Merge or replace options
- [ ] Validation on import

## Sub-tasks
1. Create export utilities [2h]
   - File: `src/services/export.js`
   - Export to JSON/CSV

2. Create import utilities [3h]
   - File: `src/services/import.js`
   - Parse and validate

3. Add export/import UI in Settings [2h]
   - Buttons and file picker

## Dependencies
Requires: #12

## Estimate
7 hours / 2 story points
""",
        "labels": ["story", "P1-high", "backend"],
        "milestone": "v0.3.0 - Core Features",
    },

    # Epic 5
    {
        "title": "Epic 5: Cloud Sync with Google",
        "body": """## Description
Optional Google authentication and cloud backup/sync.

## Goals
- Google OAuth integration
- Automatic sync to Google Sheets
- Multi-device support
- Cloud backup

## Success Criteria
- [ ] Users can sign in with Google
- [ ] Data syncs to Google Sheets
- [ ] Works across multiple devices
- [ ] Offline-first with eventual sync

## Stories
- #14 - Implement Google OAuth
- #15 - Google Sheets Sync
""",
        "labels": ["epic", "P2-medium", "backend"],
        "milestone": "v0.4.0 - Cloud & Analytics",
    },

    # Story 5.1
    {
        "title": "Implement Google OAuth",
        "body": """## Description
Add Google sign-in for cloud features.

## Business Value
Users can sync data across devices and have cloud backup.

## Acceptance Criteria
- [ ] Google sign-in button in settings
- [ ] OAuth flow completes successfully
- [ ] User profile displayed when signed in
- [ ] Sign out functionality
- [ ] Token refresh handling
- [ ] Works without sign-in (offline-first)

## Sub-tasks
1. Configure Google OAuth client [2h]
   - Create Google Cloud project
   - Generate client ID

2. Implement OAuth flow [3h]
   - File: `src/services/auth.js`
   - Using @react-oauth/google

3. Create AuthContext [2h]
   - File: `src/contexts/AuthContext.jsx`

4. Add sign-in UI [2h]
   - Settings integration

## Dependencies
Requires: #12

## Estimate
9 hours / 2 story points
""",
        "labels": ["story", "P2-medium", "backend"],
        "milestone": "v0.4.0 - Cloud & Analytics",
    },

    # Story 5.2
    {
        "title": "Google Sheets Sync",
        "body": """## Description
Sync data to Google Sheets for backup and advanced analysis.

## Business Value
Users get automatic cloud backup and can analyze data in familiar spreadsheet interface.

## Acceptance Criteria
- [ ] Create dedicated spreadsheet on first sync
- [ ] Bi-directional sync
- [ ] Conflict resolution (last-write-wins)
- [ ] Manual sync trigger
- [ ] Sync status indicator

## Sub-tasks
1. Implement Google Sheets API integration [4h]
   - File: `src/services/sheets.js`

2. Create sync engine [4h]
   - File: `src/services/sync.js`
   - Track changes

3. Add sync UI [2h]
   - Sync button, status

4. Handle offline sync [2h]
   - Queue changes

## Dependencies
Requires: #14

## Estimate
12 hours / 3 story points
""",
        "labels": ["story", "P2-medium", "backend"],
        "milestone": "v0.4.0 - Cloud & Analytics",
    },

    # Epic 6
    {
        "title": "Epic 6: Analytics and Reporting",
        "body": """## Description
Add comprehensive reporting and analytics features.

## Goals
- Monthly/yearly summary reports
- Tax-ready documentation
- Charts and visualizations
- PDF export

## Success Criteria
- [ ] Generate monthly/yearly reports
- [ ] Tax reports with proper formatting
- [ ] Print-friendly layouts
- [ ] Hebrew/English reports

## Stories
- #16 - Monthly/Yearly Reports
- #17 - Tax Report Generation
""",
        "labels": ["epic", "P2-medium", "frontend"],
        "milestone": "v0.4.0 - Cloud & Analytics",
    },

    # Story 6.1
    {
        "title": "Monthly/Yearly Reports",
        "body": """## Description
Generate summary reports for different time periods.

## Business Value
Users can review giving patterns and prepare for tax reporting.

## Acceptance Criteria
- [ ] Monthly summary view
- [ ] Yearly summary view
- [ ] Print-friendly format
- [ ] PDF export option
- [ ] Hebrew/English reports

## Sub-tasks
1. Create ReportView component [4h]
   - File: `src/components/Reports.jsx`

2. Add charts [3h]
   - Income vs donation over time

3. Implement PDF export [3h]
   - Install jsPDF

4. Add reports navigation [1h]

## Dependencies
Requires: #8

## Estimate
11 hours / 3 story points
""",
        "labels": ["story", "P2-medium", "frontend"],
        "milestone": "v0.4.0 - Cloud & Analytics",
    },

    # Story 6.2
    {
        "title": "Tax Report Generation",
        "body": """## Description
Generate reports suitable for tax deduction documentation.

## Business Value
Users can easily provide documentation for charitable donation tax deductions.

## Acceptance Criteria
- [ ] Summary by recipient/category
- [ ] Totals by tax year
- [ ] Print-ready format
- [ ] Include donation dates and amounts
- [ ] Option to include notes

## Sub-tasks
1. Create TaxReport component [4h]
   - File: `src/components/TaxReport.jsx`

2. Add tax-specific formatting [2h]
   - Formal document layout

3. PDF generation [2h]
   - Receipt numbers

## Dependencies
Requires: #16, #9

## Estimate
8 hours / 2 story points
""",
        "labels": ["story", "P2-medium", "frontend"],
        "milestone": "v0.4.0 - Cloud & Analytics",
    },

    # Epic 7
    {
        "title": "Epic 7: Polish and UX Improvements",
        "body": """## Description
UI/UX refinements and accessibility improvements.

## Goals
- WCAG 2.1 AA compliance
- Smooth animations
- Mobile haptic feedback
- Professional polish

## Success Criteria
- [ ] Passes accessibility audit
- [ ] Smooth transitions throughout
- [ ] Mobile-optimized experience

## Stories
- #18 - Improve Accessibility
- #19 - Add Animations and Transitions
- #20 - Haptic Feedback (Mobile)
""",
        "labels": ["epic", "P3-low", "frontend"],
        "milestone": "v1.0.0 - Production Release",
    },

    # Story 7.1
    {
        "title": "Improve Accessibility",
        "body": """## Description
Ensure app meets WCAG 2.1 AA standards.

## Acceptance Criteria
- [ ] All interactive elements keyboard accessible
- [ ] Proper ARIA labels
- [ ] Color contrast compliance
- [ ] Screen reader compatible
- [ ] Focus management

## Sub-tasks
1. Audit current accessibility [2h]
2. Fix contrast issues [2h]
3. Add ARIA labels [2h]
4. Test with screen reader [2h]

## Estimate
8 hours / 2 story points
""",
        "labels": ["story", "P3-low", "frontend"],
        "milestone": "v1.0.0 - Production Release",
    },

    # Story 7.2
    {
        "title": "Add Animations and Transitions",
        "body": """## Description
Subtle animations to improve perceived performance and UX.

## Acceptance Criteria
- [ ] Page transitions
- [ ] Card hover effects
- [ ] Loading skeletons
- [ ] Success/error animations

## Sub-tasks
1. Add MUI transitions [2h]
2. Create loading skeletons [2h]
3. Add micro-interactions [2h]

## Estimate
6 hours / 1 story point
""",
        "labels": ["story", "P3-low", "frontend"],
        "milestone": "v1.0.0 - Production Release",
    },

    # Story 7.3
    {
        "title": "Haptic Feedback (Mobile)",
        "body": """## Description
Add vibration feedback for actions on mobile.

## Acceptance Criteria
- [ ] Vibrate on entry save
- [ ] Vibrate on delete
- [ ] Optional in settings

## Estimate
2 hours / 0.5 story points
""",
        "labels": ["story", "P3-low", "frontend"],
        "milestone": "v1.0.0 - Production Release",
    },
]


def run_gh_command(args):
    """Run a gh CLI command and return the output."""
    try:
        result = subprocess.run(
            ["gh"] + args,
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        print(f"Error running gh command: {e.stderr}", file=sys.stderr)
        return None


def create_labels():
    """Create all labels in the repository."""
    print("Creating labels...")
    for label in LABELS:
        result = run_gh_command([
            "label", "create",
            label["name"],
            "--color", label["color"],
            "--description", label["description"],
            "--repo", f"{OWNER}/{REPO}",
            "--force"
        ])
        if result is not None:
            print(f"  ✓ Created label: {label['name']}")


def create_milestones():
    """Create all milestones in the repository."""
    print("\nCreating milestones...")
    milestone_numbers = {}
    for milestone in MILESTONES:
        result = run_gh_command([
            "api",
            f"/repos/{OWNER}/{REPO}/milestones",
            "-f", f"title={milestone['title']}",
            "-f", f"description={milestone['description']}",
            "-f", "state=open"
        ])
        if result:
            data = json.loads(result)
            milestone_numbers[milestone['title']] = data['number']
            print(f"  ✓ Created milestone: {milestone['title']} (#{data['number']})")

    return milestone_numbers


def create_issues(milestone_numbers):
    """Create all issues in the repository."""
    print("\nCreating issues...")
    issue_numbers = {}

    for i, issue in enumerate(ISSUES, 1):
        # Get milestone number if specified
        milestone_arg = []
        if "milestone" in issue and issue["milestone"] in milestone_numbers:
            milestone_arg = ["--milestone", str(milestone_numbers[issue["milestone"]])]

        # Build labels argument
        labels = ",".join(issue["labels"])

        # Create the issue
        args = [
            "issue", "create",
            "--title", issue["title"],
            "--body", issue["body"],
            "--label", labels,
            "--repo", f"{OWNER}/{REPO}"
        ] + milestone_arg

        result = run_gh_command(args)
        if result:
            # Extract issue number from URL
            issue_number = result.split('/')[-1]
            issue_numbers[issue["title"]] = issue_number
            print(f"  ✓ Created issue #{issue_number}: {issue['title']}")

    return issue_numbers


def main():
    """Main execution function."""
    print(f"Setting up GitHub issues for {OWNER}/{REPO}\n")

    # Create labels
    create_labels()

    # Create milestones
    milestone_numbers = create_milestones()

    # Create issues
    issue_numbers = create_issues(milestone_numbers)

    print(f"\n✅ Setup complete!")
    print(f"   Created {len(LABELS)} labels")
    print(f"   Created {len(MILESTONES)} milestones")
    print(f"   Created {len(issue_numbers)} issues")
    print(f"\nView at: https://github.com/{OWNER}/{REPO}/issues")


if __name__ == "__main__":
    main()
