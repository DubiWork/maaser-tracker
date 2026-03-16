/**
 * Regression tests: Sync Status Flows (RT-Sync-01 through RT-Sync-04)
 *
 * All tests require mock authentication (@auth-required).
 * Verifies sync status display in the user profile menu under
 * different migration states and languages.
 */

import { test, expect } from '../fixtures/console.fixture.js';
import { waitForAppReady, ensureHebrew, ensureEnglish } from '../helpers/navigation.js';
import { clearIndexedDB } from '../helpers/data.js';
import { injectMockAuth, injectMockMigrationComplete } from '../helpers/auth.js';
import { expectNoConsoleErrors } from '../helpers/assertions.js';

test.describe('Sync Status Flows (@auth-required)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
    await page.reload();
    await waitForAppReady(page);
  });

  // ---------------------------------------------------------------------------
  // RT-Sync-01: Local only status (migration NOT completed)
  // ---------------------------------------------------------------------------
  test('RT-Sync-01: signed in, migration not completed shows "Local only"', async ({ page, consoleMessages }) => {
    // Inject mock auth but do NOT inject migration complete status
    await injectMockAuth(page);
    await page.reload();
    await waitForAppReady(page);
    await ensureEnglish(page);

    // Click the user avatar to open the profile menu
    const avatar = page.getByRole('button', { name: /User Profile|פרופיל משתמש/ });
    await expect(avatar).toBeVisible({ timeout: 5000 });
    await avatar.click();

    // Verify "Local only" status is displayed
    await expect(page.getByText(/Local only|מקומי בלבד/)).toBeVisible({ timeout: 3000 });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Sync-02: Synced to cloud (migration completed)
  // ---------------------------------------------------------------------------
  test('RT-Sync-02: signed in, migration completed shows "Synced to cloud"', async ({ page, consoleMessages }) => {
    // Inject mock auth AND migration complete status
    await injectMockAuth(page);
    await injectMockMigrationComplete(page);
    await page.reload();
    await waitForAppReady(page);
    await ensureEnglish(page);

    // Click the user avatar
    const avatar = page.getByRole('button', { name: /User Profile|פרופיל משתמש/ });
    await expect(avatar).toBeVisible({ timeout: 5000 });
    await avatar.click();

    // Verify "Synced to cloud" status is displayed
    await expect(page.getByText('Synced to cloud')).toBeVisible({ timeout: 3000 });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Sync-03: Hebrew language sync status
  // ---------------------------------------------------------------------------
  test('RT-Sync-03: signed in, migration completed, Hebrew shows Hebrew sync status', async ({ page, consoleMessages }) => {
    await injectMockAuth(page);
    await injectMockMigrationComplete(page);
    await page.reload();
    await waitForAppReady(page);
    await ensureHebrew(page);

    // Click the user avatar
    const avatar = page.getByRole('button', { name: /פרופיל משתמש|User Profile/ });
    await expect(avatar).toBeVisible({ timeout: 5000 });
    await avatar.click();

    // Verify Hebrew sync status text
    await expect(page.getByText('מסונכרן לענן')).toBeVisible({ timeout: 3000 });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Sync-04: Switch to English and verify English sync status
  // ---------------------------------------------------------------------------
  test('RT-Sync-04: switch to English and verify English sync status text', async ({ page, consoleMessages }) => {
    await injectMockAuth(page);
    await injectMockMigrationComplete(page);
    await page.reload();
    await waitForAppReady(page);

    // Start in Hebrew, then switch to English
    await ensureHebrew(page);
    await ensureEnglish(page);

    // Click the user avatar
    const avatar = page.getByRole('button', { name: /User Profile|פרופיל משתמש/ });
    await expect(avatar).toBeVisible({ timeout: 5000 });
    await avatar.click();

    // Verify English sync status text
    await expect(page.getByText('Synced to cloud')).toBeVisible({ timeout: 3000 });

    expectNoConsoleErrors(consoleMessages);
  });
});
