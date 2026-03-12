# Ma'aser Tracker

**Track your ma'aser (tithes) simply and privately.**

Ma'aser Tracker helps you record income and donations, calculates your 10% obligation automatically, and shows exactly where you stand -- all without creating an account or sharing your data with anyone.

<div dir="rtl">
<em>
  .      --
</em>
</div>

<br>

[**Try it now**](https://dubiwork.github.io/maaser-tracker/) -- free, no sign-up required.

## Features

- **Track income and donations** -- Add entries with dates, amounts, and notes. See your ma'aser balance update instantly.
- **Works without internet** -- Everything runs in the browser. Use it on Shabbat prep, on the go, or anywhere.
- **Your data stays private** -- Financial data is stored on your device. Nothing is sent to a server unless you choose to sync.
- **Install on any device** -- Add it to your home screen on iPhone, Android, or desktop. It works like a native app.
- **Hebrew and English** -- Full interface in both languages, with proper right-to-left support for Hebrew.
- **Import and export your data** -- Bring in data from a CSV or export everything for your records.

## Quick Start

1. **Open the app** at [dubiwork.github.io/maaser-tracker](https://dubiwork.github.io/maaser-tracker/)
2. **Add your income and donations** using the simple entry form
3. **See your ma'aser balance** calculated automatically on the dashboard

No account needed. No installation needed. Just open and start tracking.

## Privacy

Your financial information is sensitive. Ma'aser Tracker is built with that in mind:

- **No account required** -- use the app without signing up
- **Data stays on your device** -- stored locally in your browser
- **No ads, no tracking** -- zero third-party analytics or advertising
- **Open source** -- the code is public, so anyone can verify how it works
- **Optional cloud sync** -- if you want multi-device access, you choose when to enable it

---

## For Developers

[![CI](https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/DubiWork/maaser-tracker/actions/workflows/ci.yml)
[![Deploy](https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/DubiWork/maaser-tracker/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/DubiWork/maaser-tracker/issues)

### Tech Stack

- **Framework:** React 19 + Vite 7
- **UI:** Material-UI (MUI) v6
- **Data:** IndexedDB (local, via `idb`) + Firebase Firestore (cloud)
- **Auth:** Firebase Authentication (Google OAuth)
- **State:** React Query (TanStack Query)
- **i18n:** Custom context-based (Hebrew RTL / English LTR)
- **PWA:** Vite PWA Plugin with Workbox
- **Testing:** Vitest + jsdom (2100+ unit tests), Playwright (41 e2e regression tests)

### Setup

```bash
git clone https://github.com/DubiWork/maaser-tracker.git
cd maaser-tracker
npm install

# Configure Firebase (optional -- app works offline without it)
cp .env.example .env.local
# Edit .env.local with your Firebase credentials (see docs/FIREBASE_SETUP.md)

npm run dev
# App runs at http://localhost:5173/maaser-tracker/
```

### Testing

```bash
npm test                    # Run all unit tests
npm test -- --coverage      # Run with coverage report
npm run lint                # ESLint
npx playwright test         # E2e regression suite
```

**Coverage requirements:** Services layer >= 80% statements, >= 75% branches, >= 80% functions, >= 80% lines.

### Project Structure

```
src/
  components/       React components (Dashboard, AddEntryForm, History, etc.)
  services/         Data layer (IndexedDB CRUD, migration engine)
  hooks/            React Query hooks (useEntries, useInstallPrompt, useMigration)
  contexts/         Language context (i18n)
  translations/     English and Hebrew translation files
  lib/              Firebase init, React Query client
e2e/
  regression/       Playwright regression specs (10 spec files, 41 tests)
  progression/      Feature progression specs
  helpers/          Shared test utilities
```

### Architecture

- **Offline-first:** IndexedDB for local storage, optional Firestore sync
- **Migration engine:** Batch processing with GDPR-compliant consent, duplicate resolution, retry with exponential backoff
- **Dual deployment:** GitHub Pages (production) + Netlify (preview per PR)
- **CI/CD:** GitHub Actions -- lint, test, coverage check on every PR; auto-deploy on merge to main

### Contributing

1. Pick an issue from the [project board](https://github.com/users/DubiWork/projects/4)
2. Create a branch: `feature/<issue-number>-description`
3. Write tests for your changes
4. Submit a pull request referencing the issue

### Documentation

- [Firebase Setup Guide](docs/FIREBASE_SETUP.md)
- [Migration FAQ](docs/MIGRATION_FAQ.md)
- [Migration Implementation](docs/MIGRATION_IMPLEMENTATION.md)
- [Performance Benchmarks](docs/PERFORMANCE_BENCHMARKS.md)
- [Deployment Monitoring](docs/DEPLOYMENT_MONITORING.md)

### License

MIT

---

**Built for the Jewish community.**
