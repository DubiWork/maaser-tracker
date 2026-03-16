/**
 * Reusable assertion helpers for E2E tests.
 */

import { expect } from '@playwright/test';

/**
 * Assert that no console errors or warnings were captured.
 *
 * @param {Array<{type: string, text: string}>} consoleMessages — collected by
 *   the console fixture.
 */
export function expectNoConsoleErrors(consoleMessages) {
  const problems = consoleMessages.filter(
    (msg) => msg.type === 'error' || msg.type === 'warning',
  );
  if (problems.length > 0) {
    const summary = problems.map((p) => `[${p.type}] ${p.text}`).join('\n');
    throw new Error(`Unexpected console messages:\n${summary}`);
  }
}

/**
 * Assert that the page uses RTL direction (Hebrew).
 */
export async function expectRTL(page) {
  const dir = await page.evaluate(() => document.documentElement.dir);
  expect(dir).toBe('rtl');
}

/**
 * Assert that the page uses LTR direction (English).
 */
export async function expectLTR(page) {
  const dir = await page.evaluate(() => document.documentElement.dir);
  expect(dir).toBe('ltr');
}

/**
 * Assert that the page content fits within the viewport (no horizontal
 * overflow / scrollbar).
 */
export async function expectViewportFits(page) {
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(overflow).toBe(false);
}
