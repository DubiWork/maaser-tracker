# Contributing to Ma'aser Tracker

Thank you for considering contributing to Ma'aser Tracker! This project helps Jewish individuals and families track their charitable giving (ma'aser), and every contribution makes a difference.

For a full overview of the project, see the [README](README.md).

The project has **2100+ automated tests** and a robust CI pipeline, so you can contribute with confidence knowing that regressions will be caught automatically.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Tech Stack](#tech-stack)
- [How to Contribute](#how-to-contribute)
- [Bilingual Requirement](#bilingual-requirement)
- [Code Style](#code-style)
- [Reporting Issues](#reporting-issues)
- [Code of Conduct](#code-of-conduct)

---

## Getting Started

### Prerequisites

- **Node.js 18+** and **npm**
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

```bash
# Clone the repository
git clone https://github.com/DubiWork/maaser-tracker.git
cd maaser-tracker

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173/maaser-tracker/`.

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run the linter
npm run lint

# Run end-to-end tests (requires Playwright browsers installed)
npx playwright install --with-deps
npm run test:e2e
```

All tests must pass and the linter must be clean before you submit a pull request.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19, Vite 7 |
| UI Library | Material-UI (MUI) 7 |
| Local Storage | IndexedDB via `idb` |
| Cloud Sync | Firebase (Firestore + Auth) |
| Unit Testing | Vitest + Testing Library |
| E2E Testing | Playwright |
| CI/CD | GitHub Actions |
| Deployment | GitHub Pages + Netlify |

---

## How to Contribute

### 1. Find an issue

Browse the [issue tracker](https://github.com/DubiWork/maaser-tracker/issues) and look for issues labeled **`good first issue`**. These are specifically chosen to be approachable for newcomers.

### 2. Fork and branch

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Create a feature branch from `main`:

```bash
git checkout -b feature/<issue-number>-<short-description>
```

**Branch naming convention:** `feature/<issue-number>-<short-description>`

Examples:
- `feature/42-add-date-filter`
- `feature/99-fix-rtl-alignment`

### 3. Make your changes

- Write your code following the existing patterns in the codebase.
- Add or update tests for any new functionality.
- Make sure translations are provided for user-facing text (see [Bilingual Requirement](#bilingual-requirement)).

### 4. Validate locally

Before committing, run both the tests and the linter:

```bash
npm test
npm run lint
```

Both must pass with zero errors.

### 5. Commit and push

Reference the issue number in your commit message:

```bash
git commit -m "#42 Add date range filter to history view"
```

Push your branch to your fork:

```bash
git push origin feature/42-add-date-filter
```

### 6. Open a Pull Request

- Open a PR against the `main` branch of this repository.
- Use a descriptive title: `#42 Add date range filter to history view`
- Include **`Closes #42`** in the PR description to auto-link the issue.
- Fill in what changed and how to test it.

The CI pipeline will run automatically. A maintainer will review your PR once all checks pass.

---

## Bilingual Requirement

Ma'aser Tracker supports **Hebrew (RTL)** and **English (LTR)**. All user-facing text must be provided in both languages.

### Where translations live

Translations are defined in `src/contexts/LanguageProvider.jsx` inside the `translations` object. Each key has an `en` and `he` value.

### How to add a new string

1. Add your English and Hebrew strings to the `translations` object in `LanguageProvider.jsx`.
2. Use the translation in your component via the `useLanguage` hook:

```jsx
import { useLanguage } from '../contexts/useLanguage';

function MyComponent() {
  const { t } = useLanguage();
  return <p>{t.myNewString}</p>;
}
```

### Testing both directions

Always verify your changes in both language modes:

- **English (LTR)** -- the default
- **Hebrew (RTL)** -- use the language toggle in the app header

RTL layout can reveal alignment, padding, and icon-direction issues that are invisible in LTR mode.

---

## Code Style

- **Follow existing patterns** -- look at similar files in the codebase before writing new code.
- **ESLint enforces style** -- run `npm run lint` to catch issues. The project uses React-specific ESLint rules.
- **Tests are required** for new features and bug fixes.
- **Service-layer code** (files under `src/services/`) must maintain **80%+ coverage** for statements, functions, and lines, and 75%+ for branches.
- **Functional components and hooks** -- no class components.
- **Naming conventions:**
  - `camelCase` for variables and functions
  - `PascalCase` for React components
  - `UPPER_SNAKE_CASE` for constants

---

## Reporting Issues

Use the [GitHub issue tracker](https://github.com/DubiWork/maaser-tracker/issues) to report bugs or request features.

When reporting a bug, please include:

1. **What you expected to happen**
2. **What actually happened**
3. **Steps to reproduce** the issue
4. **Browser and OS** (e.g., Chrome 131 on Windows 11)
5. **Screenshots** -- especially helpful for UI issues

---

## Code of Conduct

Be kind, be respectful. We are building something for our community.

We expect all contributors to:

- Treat others with courtesy and respect.
- Provide constructive feedback.
- Focus on what is best for the project and its users.
- Welcome newcomers and help them get started.

---

Thank you for helping make Ma'aser Tracker better!
