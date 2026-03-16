import { defineConfig } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  timeout: isCI ? 45000 : 30000,
  expect: { timeout: 10000 },

  /* Retry once on CI to reduce flakiness */
  retries: isCI ? 1 : 0,

  /* Reporters: JSON for CI consumption, HTML for local debugging */
  reporter: [
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { open: 'never' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://maaser-tracker-335aa-staging.web.app',
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'regression',
      testDir: './e2e/regression',
      use: { browserName: 'chromium' },
    },
    {
      name: 'progression',
      testDir: './e2e/progression',
      use: { browserName: 'chromium' },
    },
    {
      name: 'bug-fixes',
      testDir: './e2e',
      testMatch: 'bug-fixes.spec.js',
      use: { browserName: 'chromium' },
    },
  ],
});
