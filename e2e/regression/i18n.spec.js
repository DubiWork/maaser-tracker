/**
 * Regression tests: Bilingual / Internationalization Flows (RT-i18n-01 through RT-i18n-03)
 *
 * Verifies that language toggling between Hebrew (RTL) and English (LTR)
 * works correctly, including page direction and navigation labels.
 */

import { test, expect } from '../fixtures/console.fixture.js';
import { waitForAppReady } from '../helpers/navigation.js';
import { clearIndexedDB } from '../helpers/data.js';
import { expectNoConsoleErrors, expectRTL, expectLTR } from '../helpers/assertions.js';

test.describe('Bilingual / i18n Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
    await page.reload();
    await waitForAppReady(page);
  });

  // ---------------------------------------------------------------------------
  // RT-i18n-01: Default Hebrew RTL
  // ---------------------------------------------------------------------------
  test('RT-i18n-01: default language is Hebrew with RTL direction', async ({ page, consoleMessages }) => {
    // The app defaults to Hebrew — verify RTL direction
    await expectRTL(page);

    // Verify the page language attribute is 'he'
    const lang = await page.evaluate(() => document.documentElement.lang);
    expect(lang).toBe('he');

    // Verify Hebrew text appears in the bottom navigation
    await expect(page.getByRole('button', { name: 'לוח בקרה' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'הוסף הכנסה' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'הוסף תרומה' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'היסטוריה' })).toBeVisible();

    // Verify Hebrew app title
    await expect(page.getByRole('heading', { name: 'מעקב מעשר' })).toBeVisible();

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-i18n-02: Toggle to English LTR
  // ---------------------------------------------------------------------------
  test('RT-i18n-02: toggle to English switches to LTR with English labels', async ({ page, consoleMessages }) => {
    // Start in Hebrew (default)
    await expectRTL(page);

    // Click the language toggle button (aria-label: "Switch to English" when in Hebrew)
    const toggleBtn = page.getByRole('button', { name: 'Switch to English' });
    await expect(toggleBtn).toBeVisible({ timeout: 3000 });
    await toggleBtn.click();

    // Wait for the language to switch
    await page.waitForFunction(
      () => document.documentElement.lang === 'en',
      null,
      { timeout: 5000 },
    );

    // Verify LTR direction
    await expectLTR(page);

    // Verify English text appears in the bottom navigation
    await expect(page.getByRole('button', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Income' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Donation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'History' })).toBeVisible();

    // Verify English app title
    await expect(page.getByRole('heading', { name: 'Maaser Tracker' })).toBeVisible();

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-i18n-03: Toggle back to Hebrew RTL
  // ---------------------------------------------------------------------------
  test('RT-i18n-03: toggle back to Hebrew restores RTL direction', async ({ page, consoleMessages }) => {
    // Switch to English first
    const toEnglishBtn = page.getByRole('button', { name: 'Switch to English' });
    await expect(toEnglishBtn).toBeVisible({ timeout: 3000 });
    await toEnglishBtn.click();
    await page.waitForFunction(
      () => document.documentElement.lang === 'en',
      null,
      { timeout: 5000 },
    );
    await expectLTR(page);

    // Now toggle back to Hebrew
    // When in English, the toggle button aria-label should indicate switching to Hebrew
    const toHebrewBtn = page.getByRole('button', { name: /עברית|Switch to Hebrew/ });
    await expect(toHebrewBtn).toBeVisible({ timeout: 3000 });
    await toHebrewBtn.click();

    // Wait for the language to switch back
    await page.waitForFunction(
      () => document.documentElement.lang === 'he',
      null,
      { timeout: 5000 },
    );

    // Verify RTL direction is restored
    await expectRTL(page);

    // Verify Hebrew labels are back
    await expect(page.getByRole('button', { name: 'לוח בקרה' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'מעקב מעשר' })).toBeVisible();

    expectNoConsoleErrors(consoleMessages);
  });
});
