# E2E Tests — Playwright

## Quick Start

```bash
# Run all e2e tests against staging
npm run test:e2e

# Run only regression tests
npm run test:e2e:regression

# Run only progression tests
npm run test:e2e:progression

# Run against a specific URL
BASE_URL=http://localhost:5173/maaser-tracker/ npm run test:e2e
```

## Directory Structure

```
e2e/
  regression/     # Stable tests — run on staging + production
  progression/    # Feature tests — run on staging only
  helpers/        # Shared utilities
  fixtures/       # Playwright fixtures (console error capture)
  bug-fixes.spec.js  # Legacy bug-fix tests
```

## CI Behavior

The daily regression workflow (`regression.yml`) runs:
- **Staging job:** Unit tests + regression e2e + progression e2e
- **Production job:** Unit tests + regression e2e only

All e2e steps use `continue-on-error: true` during soft-fail rollout.
Playwright HTML report uploaded as artifact on failure (7-day retention).

## Auth Mocking

Tests requiring signed-in state use `injectMockAuth(page)` from `helpers/auth.js`.
This injects a fake Firebase auth user into localStorage before page load.

For migration-dependent tests, also call `injectMockMigrationComplete(page)`.

**Note:** RT-Auth-01 (real Google OAuth) is permanently `@skip-ci`.

## Tags

| Tag | Meaning | CI |
|-----|---------|-----|
| `@regression` | Stable test | Runs on staging + prod |
| `@progression` | New feature test | Runs on staging only |
| `@skip-ci` | Can't run headless | Skipped in CI |
| `@auth-required` | Needs mock auth | Runs with auth fixture |
| `@quarantine` | Under investigation | Runs but doesn't block |

## Adding Tests

1. Regression test: add to `e2e/regression/<category>.spec.js`
2. Progression test: add to `e2e/progression/epic-<N>-<name>.spec.js`
3. Use `import { test, expect } from '../fixtures/console.fixture.js'`
4. Use helpers from `../helpers/` for navigation, data, auth, assertions
5. Every test must call `expectNoConsoleErrors(consoleMessages)` at the end

## Flake Budget

- Target: <5% flake rate over 7-day window
- 2+ failures in 7 days: tag `@quarantine`, file issue
- Fix quarantined tests within 14 days
