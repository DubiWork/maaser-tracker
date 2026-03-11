/**
 * Playwright fixture that captures console errors and warnings.
 *
 * Usage in test files:
 *
 *   import { test, expect } from '../fixtures/console.fixture.js';
 *   import { expectNoConsoleErrors } from '../helpers/assertions.js';
 *
 *   test('page loads without errors', async ({ page, consoleMessages }) => {
 *     await page.goto('/');
 *     expectNoConsoleErrors(consoleMessages);
 *   });
 */

import { test as base } from '@playwright/test';

export const test = base.extend({
  consoleMessages: async ({ page }, use) => {
    const messages = [];
    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) {
        messages.push({ type: msg.type(), text: msg.text() });
      }
    });
    await use(messages);
  },
});

export { expect } from '@playwright/test';
