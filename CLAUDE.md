# Ma'aser Tracker - Project Instructions for Claude Code

## Project Overview

**Ma'aser Tracker** is a Progressive Web App (PWA) for tracking Jewish charitable giving (ma'aser - 10% of income). Users can track income, donations, and see their ma'aser obligations in real-time.

- **Repository:** https://github.com/DubiWork/maaser-tracker
- **Live Site:** https://dubiwork.github.io/maaser-tracker/
- **Language:** Bilingual (Hebrew RTL / English LTR)
- **Status:** Beta - Firebase integration in progress before public launch

---

## Tech Stack

### Frontend
- **Framework:** React 19.2.0 + Vite 7.3.1
- **UI Library:** Material-UI (MUI) v6+
- **State Management:** React Context + React Query (@tanstack/react-query)
- **Styling:** Material-UI theming + CSS

### Data Layer
- **Local Storage:** IndexedDB (via `idb@8.0.3`) - offline-first capability
- **Cloud Storage:** Firebase Firestore (in progress - Issue #35+)
- **Authentication:** Firebase Authentication (planned - Issue #35)
- **Data Access:** React Query for caching/mutations

### PWA Features
- **Service Worker:** Workbox via Vite PWA plugin
- **Install Prompt:** Custom InstallPrompt component (iOS/Android support)
- **Offline Support:** Service worker + IndexedDB
- **Icons:** Full PWA icon set (192x192, 512x512, maskable, Apple, favicon)

### Testing & Quality
- **Test Framework:** Vitest
- **Test Environment:** jsdom
- **Coverage Requirements:**
  - Services: ≥80% statements, ≥75% branches, ≥80% functions, ≥80% lines
  - Other files: Best effort
- **Linting:** ESLint with React rules

### DevOps & CI/CD
- **CI:** GitHub Actions (test + lint on every PR)
- **CD:** GitHub Actions (deploy to GitHub Pages after CI passes)
- **Deployment:** GitHub Pages at `/maaser-tracker/`
- **Base URL:** `/maaser-tracker/` (configured in Vite)

---

## Project Structure

```
src/
├── components/          # React components
│   ├── AddEntryForm.jsx    # Income/donation entry form
│   ├── Dashboard.jsx        # Main dashboard with totals
│   ├── History.jsx          # Entry history with edit/delete
│   ├── InstallPrompt.jsx   # PWA install prompt (iOS/Android)
│   └── LanguageToggle.jsx   # Hebrew/English switcher
├── services/
│   └── db.js            # IndexedDB service layer (CRUD operations)
├── lib/
│   ├── firebase.js      # Firebase initialization (Issue #34)
│   └── queryClient.js   # React Query client config
├── hooks/
│   ├── useEntries.js    # React Query hooks for entries
│   └── useInstallPrompt.js  # PWA install prompt hook
├── contexts/
│   └── LanguageContext.jsx  # i18n context
├── translations/
│   ├── en.js            # English translations
│   └── he.js            # Hebrew translations
├── App.jsx              # Main app component
└── main.jsx             # Entry point

.github/
├── workflows/
│   ├── ci.yml           # Test + Lint workflow
│   └── deploy.yml       # GitHub Pages deployment
└── FIREBASE_ISSUES.md   # Firebase integration spec

docs/
└── FIREBASE_SETUP.md    # Firebase setup guide

tests/
└── setup.js             # Vitest setup

Configuration Files:
- vite.config.js         # Vite + PWA plugin config
- vitest.config.js       # Test configuration
- eslint.config.js       # Linting rules
- firebase.json          # Firebase project config
- firestore.rules        # Firestore security rules
- .env.example           # Environment variables template
```

---

## Development Workflow

### Starting Work on an Issue

**ALWAYS use the skill-based workflow:**

```bash
# 1. Start the issue (creates branch, draft PR, planning)
/start-issue <issue-number>

# 2. Plan with appropriate agent
- Use architect-planner for architecture decisions
- Use solution-designer for feature breakdown

# 3. Implement with specialized agent
- Use implementer for general implementation
- Use react-specialist for React components
- Use backend-developer for services/data layer

# 4. Review automatically runs:
- syntax-convention-reviewer
- security-style-reviewer
- (architect-reviewer for significant changes)

# 5. Test automatically runs:
- qa-tester agent
- All tests must pass

# 6. Pre-push validation
/pre-push

# 7. Submit PR
/submit-pr <issue-number>

# 8. Complete issue (after merge)
/complete-issue <issue-number>
```

### Branch Naming
```
feature/<issue-number>-<short-description>
```

### Commit Messages
Always reference issue number:
```
#<issue> Brief description of change

Detailed explanation if needed.
```

### PR Requirements
- Title: `#<issue> Brief description`
- Body: Must include `Closes #<issue>`
- Metadata: Labels (type + category + priority), assignee, milestone
- Status: Keep as DRAFT until CI passes
- CI: All tests must pass before marking ready

---

## Testing Guidelines

### Running Tests Locally
```bash
npm test                    # Run all tests
npm test -- <file>          # Run specific test file
npm test -- --coverage      # Run with coverage report
npm run lint                # Run linter
```

### Test Requirements
- **All new code must have tests**
- Services require ≥80% coverage (enforced)
- Tests must pass before committing
- Use Vitest + jsdom environment
- Mock Firebase/external dependencies

### Test Patterns
```javascript
// Component tests
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Service tests
import { describe, it, expect, beforeEach } from 'vitest';
import { openDB } from 'idb';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' }))
}));
```

---

## Environment Variables

### Required for Development

Create `.env.local` from `.env.example`:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Optional: Enable Firebase Emulators
VITE_USE_FIREBASE_EMULATOR=true

# Build Configuration (set by Vite/CI)
BASE_URL=/maaser-tracker/
```

### Required for CI/CD

GitHub Secrets (Settings > Secrets and variables > Actions):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**CRITICAL:** When adding dependencies that need env vars, update BOTH:
- `.github/workflows/ci.yml` (for tests)
- `.github/workflows/deploy.yml` (for builds)

---

## Architecture Decisions

### Data Layer Architecture

**Current Implementation (Phase 1):**
- IndexedDB for local storage (offline-first)
- React Query for data access and caching
- Optimistic updates with rollback on error

**In Progress (Phase 1.5 - Issues #34-38):**
- Firebase Firestore for cloud storage
- Firebase Authentication (Google OAuth)
- Offline-first with background sync
- Migration path: LocalStorage → IndexedDB → Firestore

**Why Firebase:**
- No backend to build/maintain
- Free tier covers initial launch (50K reads/day, 20K writes/day)
- Real-time sync across devices
- Offline support built-in
- Scales to millions of users

### Security Architecture

**Firestore Security Rules:**
```javascript
// Default deny all access
match /{document=**} {
  allow read, write: if false;
}

// User-specific data access
match /users/{userId}/entries/{entryId} {
  allow read, write: if request.auth != null
                     && request.auth.uid == userId;
}
```

**Key Principles:**
- Default deny all
- Require authentication
- Enforce user-specific access (request.auth.uid == userId)
- No anonymous access
- API keys are public (security enforced by rules, not keys)

---

## Current Project Status

### Completed (Phase 1)
- ✅ Issue #2: IndexedDB Migration (PR #27)
- ✅ Issue #4: Testing Infrastructure (PR #30)
- ✅ Issue #5: CI/CD Setup (PR #31)
- ✅ Issue #3: React Query Integration (PR #32)
- ✅ Issue #7: PWA Configuration (Commit 9457f3d)
- ✅ Issue #34: Firebase Setup & Configuration (PR #35 - in review)

### In Progress (Phase 1.5 - Authentication & Cloud)
- 🚧 Issue #34: Firebase Setup (PR #35 - waiting for CI/merge)

### Next Steps (Phase 1.5)
1. Issue #35: Firebase Authentication (Google OAuth) [2 SP]
2. Issue #36: Firestore Data Model & Migration [3 SP]
3. Issue #37: Offline-First Sync Logic [3 SP]
4. Issue #38: User Profile & Settings [1 SP]

**CRITICAL:** Phase 1.5 MUST be completed before public launch. Users need cloud sync to prevent data loss when changing devices.

---

## Common Issues & Solutions

### Issue: Tests fail with "Cannot find module 'firebase/app'"
**Solution:** Make sure Firebase env vars are set in test environment:
- Locally: Create `.env.local` with Firebase config
- CI: Check that ci.yml has Firebase env vars in test steps

### Issue: Build fails with "BASE_URL is not defined"
**Solution:** Vite needs `BASE_URL` for GitHub Pages deployment:
- Local dev: Not needed (defaults to `/`)
- Production: Set in deploy.yml workflow

### Issue: IndexedDB not working in tests
**Solution:** Tests use fake-indexeddb for mocking:
- Import is in tests/setup.js
- No real database operations in tests

### Issue: Service worker not updating
**Solution:** Hard refresh (Ctrl+Shift+R) or:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister())
})
```

---

## Git Workflow Rules

### CRITICAL Rules
- ✅ **ALWAYS use specialized agents** - Never code directly
- ✅ **ALWAYS run tests** before committing
- ✅ **ALWAYS wait for CI to pass** before marking PR ready
- ✅ **ALWAYS use skills** (`/start-issue`, `/submit-pr`, `/complete-issue`)
- ❌ **NEVER skip hooks** (`--no-verify`, `--no-gpg-sign`)
- ❌ **NEVER force push** without explicit user request
- ❌ **NEVER commit with failing tests**
- ❌ **NEVER mark PR ready if CI is failing**

### Safe Git Operations
- ✅ `git add <specific-files>` (prefer over `git add .`)
- ✅ `git commit -m "..."`
- ✅ `git push origin <branch>`
- ✅ Create NEW commits (not `--amend`)

### Risky Operations (Require Confirmation)
- ⚠️ `git push --force`
- ⚠️ `git reset --hard`
- ⚠️ Deleting branches
- ⚠️ Any operation visible to others

---

## Language & Communication

### When to Use Hebrew vs English
- **Terminal/CLI:** Use English (doesn't support RTL for Hebrew)
- **VS Code / RTL-supporting environments:** Can use Hebrew
- **Code comments:** English only
- **User-facing text:** Both Hebrew and English (via translations)
- **Documentation:** English (this file, README, etc.)

### Communication Style
- Concise and direct
- Explain the "why" behind solutions
- Ask questions one at a time
- Mix technical terms naturally (when appropriate for context)

---

## Key Dependencies

### Production Dependencies
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "@mui/material": "^6.5.0",
  "@tanstack/react-query": "^5.90.21",
  "firebase": "^12.10.0",
  "idb": "^8.0.3"
}
```

### Development Dependencies
```json
{
  "vite": "^7.3.1",
  "vitest": "^4.0.18",
  "@testing-library/react": "^16.3.0",
  "eslint": "^9.22.0",
  "vite-plugin-pwa": "^0.21.4"
}
```

---

## Deployment

### GitHub Pages Deployment
- **Trigger:** After CI workflow succeeds on main branch
- **Build:** `npm run build` with `BASE_URL=/maaser-tracker/`
- **Deploy:** Artifacts uploaded to GitHub Pages
- **URL:** https://dubiwork.github.io/maaser-tracker/

### Manual Deployment
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Firebase Setup (For New Contributors)

See full guide in: `docs/FIREBASE_SETUP.md`

**Quick Start:**
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication (Google Sign-In)
3. Enable Cloud Firestore
4. Copy credentials to `.env.local`
5. Deploy security rules: `firebase deploy --only firestore:rules`
6. Add secrets to GitHub repository settings

---

## Project Milestones

### Phase 1: Core Functionality ✅ (Completed)
- Basic income/donation tracking
- IndexedDB storage
- PWA configuration
- Testing infrastructure
- CI/CD pipeline

### Phase 1.5: Authentication & Cloud 🚧 (In Progress)
- Firebase setup ✅
- User authentication (Google OAuth)
- Cloud Firestore integration
- Offline-first sync
- User profiles

### Phase 2: Advanced Features (Planned)
- Multiple currency support
- Export to PDF/CSV
- Advanced reporting
- Goal tracking

### Phase 3: Mobile Apps (Future)
- iOS app (React Native or native)
- Android app (React Native or native)
- App Store deployment

---

## Contact & Support

- **Repository:** https://github.com/DubiWork/maaser-tracker
- **Issues:** https://github.com/DubiWork/maaser-tracker/issues
- **Owner:** @DubiWork

---

## Notes for Claude Code

### Agent Workflow Priority
1. **Planning:** architect-planner, solution-designer
2. **Implementation:** implementer, react-specialist, backend-developer
3. **Review:** syntax-convention-reviewer → security-style-reviewer → architect-reviewer
4. **Testing:** qa-tester, test-runner

### Memory Management
- Update project memory after every major milestone
- Document mistakes in "Mistakes & Lessons Learned"
- Keep MEMORY.md concise (under 200 lines)
- Move detailed notes to separate files

### Quality Gates
- All tests must pass ✅
- No linter warnings ✅
- Security review approved ✅
- CI workflow green ✅
- Code coverage meets thresholds ✅

---

**Last Updated:** 2026-03-01
**Current Phase:** 1.5 (Authentication & Cloud)
**Next Issue:** #35 (Firebase Authentication)
