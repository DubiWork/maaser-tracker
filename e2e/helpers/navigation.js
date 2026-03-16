/**
 * Navigation helpers for E2E tests.
 *
 * Extracted from e2e/bug-fixes.spec.js so every test suite can reuse them.
 */

import { expect } from '@playwright/test';

/**
 * Wait for the app to be fully loaded (bottom nav visible + network idle).
 */
export async function waitForAppReady(page) {
  await page.waitForSelector(
    'nav.MuiBottomNavigation-root, .MuiBottomNavigation-root',
    { state: 'visible', timeout: 15000 },
  );
  // Allow any in-flight fetches to settle
  await page.waitForLoadState('networkidle').catch(() => {
    // networkidle may not fire in all situations — swallow the timeout
  });
}

/**
 * Switch the app to English if it is currently in Hebrew.
 */
export async function ensureEnglish(page) {
  await waitForAppReady(page);

  const lang = await page.evaluate(() => document.documentElement.lang);
  if (lang === 'en') return;

  const toggleBtn = page.getByRole('button', { name: 'Switch to English' });
  if (await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await toggleBtn.click();
    await page.waitForFunction(
      () => document.documentElement.lang === 'en',
      null,
      { timeout: 5000 },
    );
  }
}

/**
 * Switch the app to Hebrew if it is currently in English.
 */
export async function ensureHebrew(page) {
  await waitForAppReady(page);

  const lang = await page.evaluate(() => document.documentElement.lang);
  if (lang === 'he') return;

  const toggleBtn = page.getByRole('button', { name: /עברית|Switch to Hebrew/ });
  if (await toggleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await toggleBtn.click();
    await page.waitForFunction(
      () => document.documentElement.lang === 'he',
      null,
      { timeout: 5000 },
    );
  }
}

/**
 * Navigate to the Settings page by clicking the gear icon in the AppBar.
 */
export async function openSettings(page) {
  const settingsBtn = page.getByRole('button', { name: /Settings|הגדרות/ });
  await settingsBtn.click();
  await expect(
    page.getByRole('heading', { name: /Settings|הגדרות/ }),
  ).toBeVisible();
}

/**
 * Navigate to a bottom-nav tab by its English label.
 */
export async function navigateToTab(page, label) {
  const tab = page.getByRole('button', { name: label });
  await tab.click();
}
