# Ma'aser Tracker - Project Plan

## Overview

Progressive Web App for tracking Jewish charitable giving (ma'aser - 10% of income). Built with React, Material-UI, and IndexedDB.

**Repository:** https://github.com/DubiWork/maaser-tracker

## Project Structure

### 7 Epics, 26 Issues Total

| Epic | Issues | Priority | Status |
|------|--------|----------|--------|
| [#1 Foundation and Infrastructure](https://github.com/DubiWork/maaser-tracker/issues/1) | #2-#5 | P0-Critical | 📋 Planning |
| [#6 PWA and Offline Functionality](https://github.com/DubiWork/maaser-tracker/issues/6) | #7-#8 | P0-Critical | 📋 Planning |
| [#9 Core Feature Enhancements](https://github.com/DubiWork/maaser-tracker/issues/9) | #10-#13 | P1-High | 📋 Planning |
| [#14 User Preferences and Settings](https://github.com/DubiWork/maaser-tracker/issues/14) | #15-#16 | P1-High | 📋 Planning |
| [#17 Cloud Sync with Google](https://github.com/DubiWork/maaser-tracker/issues/17) | #18-#19 | P2-Medium | 📋 Planning |
| [#20 Analytics and Reporting](https://github.com/DubiWork/maaser-tracker/issues/20) | #21-#22 | P2-Medium | 📋 Planning |
| [#23 Polish and UX Improvements](https://github.com/DubiWork/maaser-tracker/issues/23) | #24-#26 | P3-Low | 📋 Planning |

## Development Workflow

### Branch Naming Convention
```
feature/<issue-number>-<short-description>
fix/<issue-number>-<short-description>
```

**Examples:**
- `feature/2-indexeddb-migration`
- `feature/10-date-range-filtering`
- `fix/2-migration-data-loss`

### Workflow Steps

1. **Pick an Issue**
   - Start with P0-Critical issues (#2-#5, #7-#8)
   - Check dependencies before starting

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/2-indexeddb-migration
   ```

3. **Develop**
   - Follow sub-tasks in issue description
   - Commit frequently with clear messages
   - Reference issue number in commits: `git commit -m "#2 Add IndexedDB service layer"`

4. **Test**
   - Run tests: `npm test`
   - Run linting: `npm run lint`
   - Test manually in browser

5. **Create Pull Request**
   - Push branch: `git push origin feature/2-indexeddb-migration`
   - Create PR with title: `#2 Migrate from LocalStorage to IndexedDB`
   - Link to issue: "Closes #2"
   - Request review if needed

6. **Merge**
   - After CI passes and review approved
   - Merge to main
   - Delete feature branch

## Priority Order (Recommended)

### Phase 1: Foundation (Weeks 1-4)
**Goal:** Solid technical foundation

1. ✅ #2 - Migrate from LocalStorage to IndexedDB [3 SP]
2. ✅ #3 - Integrate React Query [1 SP]
3. ✅ #4 - Set Up Testing Infrastructure [3 SP]
4. ✅ #5 - Configure GitHub Actions CI/CD [1 SP]
5. ✅ #7 - Complete PWA Configuration [2 SP]
6. ✅ #8 - Add Offline Status Indicator [1 SP]

**Total:** 11 story points (~44 hours)

### Phase 2: Core Features (Weeks 5-8)
**Goal:** Feature-complete local app

7. ✅ #10 - Add Date Range Filtering [2 SP]
8. ✅ #11 - Add Categories for Donations [2 SP]
9. ✅ #13 - Multi-Currency Support [2 SP]
10. ✅ #15 - Create Settings Screen [3 SP]
11. ✅ #16 - Add Data Export/Import [2 SP]
12. ✅ #12 - Add Recurring Income Support [3 SP]

**Total:** 14 story points (~56 hours)

### Phase 3: Cloud & Analytics (Weeks 9-12)
**Goal:** Cloud sync and reporting

13. ✅ #18 - Implement Google OAuth [2 SP]
14. ✅ #19 - Google Sheets Sync [3 SP]
15. ✅ #21 - Monthly/Yearly Reports [3 SP]
16. ✅ #22 - Tax Report Generation [2 SP]

**Total:** 10 story points (~40 hours)

### Phase 4: Polish (Weeks 13-14)
**Goal:** Production-ready v1.0

17. ✅ #24 - Improve Accessibility [2 SP]
18. ✅ #25 - Add Animations and Transitions [1 SP]
19. ✅ #26 - Haptic Feedback (Mobile) [0.5 SP]

**Total:** 3.5 story points (~14 hours)

## Dependency Graph

```
#2 (IndexedDB) ─┬─> #3 (React Query)
                ├─> #4 (Testing) ─> #5 (CI/CD)
                ├─> #7 (PWA) ─> #8 (Offline Indicator)
                ├─> #10 (Date Range) ─> #12 (Recurring Income)
                │                    ─> #21 (Reports) ─> #22 (Tax Reports)
                ├─> #11 (Categories) ─────────────────> #22 (Tax Reports)
                ├─> #13 (Multi-Currency)
                └─> #15 (Settings) ─┬─> #16 (Export/Import)
                                     ├─> #18 (OAuth) ─> #19 (Sheets Sync)
                                     └─> #26 (Haptics)

#24 (Accessibility) ─> No dependencies
#25 (Animations) ─> No dependencies
```

## Tech Stack

### Core
- **Framework:** React 18 + Vite
- **UI Library:** Material-UI (MUI) v5
- **Styling:** Emotion (built into MUI)
- **Language:** JavaScript (can migrate to TypeScript later)

### Data & State
- **Local Storage:** IndexedDB via `idb` library
- **Data Fetching:** React Query (TanStack Query)
- **State Management:** React Context + Hooks

### PWA
- **Service Worker:** Vite PWA Plugin
- **Offline:** Workbox (via Vite PWA)

### Cloud (Optional)
- **Auth:** Google OAuth (`@react-oauth/google`)
- **Sync:** Google Sheets API

### Testing
- **Test Runner:** Vitest
- **Component Testing:** React Testing Library
- **E2E Testing:** (Future: Playwright)

### Dev Tools
- **Linting:** ESLint
- **Formatting:** Prettier (optional)
- **CI/CD:** GitHub Actions

## Current Status

✅ **Completed:**
- Initial React + Vite scaffold
- Material-UI integration
- Hebrew/English bilingual support (RTL/LTR)
- Basic income/donation tracking
- Dashboard with ma'aser calculations
- History view with edit/delete
- LocalStorage persistence (temporary)

🚧 **In Progress:**
- None (ready to start Phase 1)

📋 **Next Up:**
- Issue #2: Migrate from LocalStorage to IndexedDB

## Milestones

- **v0.2.0 - Foundation** (Target: Week 4)
  - IndexedDB migration complete
  - React Query integrated
  - Tests and CI/CD operational
  - PWA installable

- **v0.3.0 - Core Features** (Target: Week 8)
  - Date filtering
  - Categories
  - Multi-currency
  - Settings screen
  - Data export/import

- **v0.4.0 - Cloud & Analytics** (Target: Week 12)
  - Google OAuth
  - Sheets sync
  - Reports

- **v1.0.0 - Production Release** (Target: Week 14)
  - Accessibility compliant
  - Polished UX
  - Full documentation

## Contributing

### Getting Started
```bash
# Clone the repository
git clone https://github.com/DubiWork/maaser-tracker.git
cd maaser-tracker

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint
```

### Making Changes
1. Pick an issue from GitHub
2. Create feature branch: `feature/<issue-number>-<description>`
3. Make changes following sub-tasks
4. Write/update tests
5. Commit with issue reference: `#2 Add feature`
6. Push and create PR
7. Wait for CI to pass
8. Merge to main

## Resources

- **Repository:** https://github.com/DubiWork/maaser-tracker
- **Issues:** https://github.com/DubiWork/maaser-tracker/issues
- **Documentation:** (Future: GitHub Wiki)

---

**Last Updated:** 2026-02-27
**Version:** 1.0
