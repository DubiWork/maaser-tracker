/**
 * Regression tests: Authentication Flows (RT-Auth-01 through RT-Auth-05)
 *
 * Covers sign-in (skipped in CI), sign-out, unauthenticated local usage,
 * and smoke tests for CSP and service worker compatibility with Firebase Auth.
 */

import { test, expect } from '../fixtures/console.fixture.js';
import { waitForAppReady, ensureHebrew } from '../helpers/navigation.js';
import { clearIndexedDB } from '../helpers/data.js';
import { injectMockAuth, clearAuth } from '../helpers/auth.js';
import { expectNoConsoleErrors } from '../helpers/assertions.js';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
    await clearAuth(page);
    await page.reload();
    await waitForAppReady(page);
  });

  // ---------------------------------------------------------------------------
  // RT-Auth-01: Google Sign-In
  // @skip-ci -- requires real Google OAuth popup which cannot run in headless CI
  // ---------------------------------------------------------------------------
  test.skip('RT-Auth-01: sign in with Google OAuth', async ({ page, consoleMessages }) => {
    // This test requires a real Google OAuth popup and cannot run in
    // headless CI environments. It is intentionally skipped.
    //
    // Manual test steps:
    // 1. Navigate to app
    // 2. Click "Sign In" button
    // 3. Complete Google sign-in flow in the popup
    // 4. Verify avatar appears in the top bar
    // 5. No console errors

    await ensureHebrew(page);

    const signInBtn = page.getByRole('button', { name: /התחבר|Sign In/ });
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    // Would require real OAuth popup interaction here
    // Verify avatar appears after sign-in
    // await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Auth-02: Sign Out
  // ---------------------------------------------------------------------------
  test('RT-Auth-02: sign out via avatar menu', async ({ page, consoleMessages }) => {
    // Inject mock auth so the app treats the session as authenticated
    await injectMockAuth(page);
    await page.reload();
    await waitForAppReady(page);
    await ensureHebrew(page);

    // Click the user avatar to open the profile menu
    const avatar = page.getByRole('button', { name: /פרופיל משתמש|User Profile/ });
    await expect(avatar).toBeVisible({ timeout: 5000 });
    await avatar.click();

    // Click sign out
    const signOutBtn = page.getByRole('menuitem', { name: /התנתק|Sign Out/ });
    await expect(signOutBtn).toBeVisible({ timeout: 3000 });
    await signOutBtn.click();

    // Verify the avatar disappears and the Sign In button reappears
    await expect(page.getByRole('button', { name: /התחבר|Sign In/ })).toBeVisible({ timeout: 5000 });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Auth-03: Unauthenticated Usage
  // ---------------------------------------------------------------------------
  test('RT-Auth-03: add income without signing in, verify local IndexedDB storage', async ({ page, consoleMessages }) => {
    await ensureHebrew(page);

    // Verify there is no avatar (user is not signed in)
    await expect(page.getByRole('button', { name: /התחבר|Sign In/ })).toBeVisible();

    // Click the "Add Income" tab
    const addIncomeTab = page.getByRole('button', { name: /הוסף הכנסה|Add Income/ });
    await addIncomeTab.click();

    // Fill the amount field
    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('2500');

    // Click save
    const saveBtn = page.getByRole('button', { name: /שמור|Save/ });
    await saveBtn.click();

    // Verify the dashboard shows the entry
    await expect(page.getByText('2,500')).toBeVisible({ timeout: 5000 });

    // Verify data was saved to IndexedDB
    const entryCount = await page.evaluate(async () => {
      const request = indexedDB.open('maaser-tracker', 1);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction('entries', 'readonly');
          const store = tx.objectStore('entries');
          const countReq = store.count();
          countReq.onsuccess = () => resolve(countReq.result);
          countReq.onerror = () => reject(countReq.error);
        };
        request.onerror = () => reject(request.error);
      });
    });
    expect(entryCount).toBeGreaterThanOrEqual(1);

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Auth-04: CSP allows Google Auth script loading
  // Regression guard for incident #202 — CSP blocked apis.google.com
  // ---------------------------------------------------------------------------
  test('RT-Auth-04: CSP does not block Google Auth script', async ({ page }) => {
    // Collect CSP violation errors
    const cspErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForAppReady(page);

    // Check that the CSP meta tag includes apis.google.com in script-src
    const cspContent = await page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.getAttribute('content') : null;
    });

    expect(cspContent).not.toBeNull();
    expect(cspContent).toContain('https://apis.google.com');

    // Verify no CSP errors related to Google APIs were logged
    const googleCspErrors = cspErrors.filter((e) => e.includes('apis.google.com'));
    expect(googleCspErrors).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // RT-Auth-05: Service worker does not intercept Firebase auth handler
  // Regression guard for incident #202 — SW served index.html for /__/auth/handler
  // ---------------------------------------------------------------------------
  test('RT-Auth-05: /__/auth/handler is not intercepted by service worker', async ({ page }) => {
    // First visit the app to register the service worker
    await page.goto('/');
    await waitForAppReady(page);

    // Now navigate to the Firebase reserved auth handler path
    const response = await page.goto('/__/auth/handler');

    // The auth handler page should NOT contain the app's root element.
    // If the service worker intercepts it, it serves index.html with <div id="root">.
    const hasAppRoot = await page.evaluate(() => {
      const root = document.getElementById('root');
      return root !== null && root.children.length > 0;
    });

    expect(hasAppRoot).toBe(false);
  });
});
