# Progression Tests

Feature-specific e2e tests that run **only on staging** during the bake period.

## Lifecycle

1. **Create**: When an epic merges to `develop` (staging), add its tests here
2. **Run**: Daily regression workflow runs these alongside regression tests on staging
3. **Graduate**: When the epic promotes to `main` (production), move tests to `e2e/regression/`
4. **Delete**: Remove the progression file after graduation

## Naming Convention

`epic-<issue-number>-<short-name>.spec.js`

Examples:
- `epic-41-import-export.spec.js`
- `epic-142-external-csv.spec.js`

## How to Graduate

When your epic's promotion PR (develop -> main) is approved:

1. Move test cases from `e2e/progression/epic-N-*.spec.js` into the appropriate `e2e/regression/<category>.spec.js` file
2. Delete the progression file
3. Update `.github/REGRESSION_TEST_PLAN.md` to include the new test cases
4. Commit as part of the promotion PR

## Template

Copy `_template.spec.js` to get started.
