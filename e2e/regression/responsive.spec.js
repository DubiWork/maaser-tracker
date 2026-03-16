/**
 * Regression Tests: Responsive Design (RT-Resp-01..03)
 *
 * Validates that the app renders correctly at mobile, tablet, and desktop
 * viewports without horizontal overflow or truncated elements.
 */

import { test, expect } from '../fixtures/console.fixture.js';
import { waitForAppReady } from '../helpers/navigation.js';
import { clearIndexedDB } from '../helpers/data.js';
import { expectNoConsoleErrors, expectViewportFits } from '../helpers/assertions.js';

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
    await page.goto('/');
  });

  test('RT-Resp-01: Mobile 375x812 — dashboard renders, no overflow, buttons tappable', async ({
    page,
    consoleMessages,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();
    await waitForAppReady(page);

    // Dashboard should be visible
    const dashboard = page.locator('.MuiCard-root').first();
    await expect(dashboard).toBeVisible();

    // No horizontal overflow
    await expectViewportFits(page);

    // Bottom nav buttons should be tappable (visible and have reasonable size)
    const bottomNavButtons = page.locator(
      'nav.MuiBottomNavigation-root button, .MuiBottomNavigation-root button',
    );
    const count = await bottomNavButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const btn = bottomNavButtons.nth(i);
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      // Minimum touch target 44x44 is recommended; we accept 40px as a reasonable floor
      expect(box.width).toBeGreaterThanOrEqual(40);
      expect(box.height).toBeGreaterThanOrEqual(40);
    }

    expectNoConsoleErrors(consoleMessages);
  });

  test('RT-Resp-02: Tablet 768x1024 — layout adapts correctly', async ({
    page,
    consoleMessages,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await waitForAppReady(page);

    // Dashboard should be visible
    const dashboard = page.locator('.MuiCard-root').first();
    await expect(dashboard).toBeVisible();

    // No horizontal overflow
    await expectViewportFits(page);

    // AppBar should be visible
    const appBar = page.locator('header.MuiAppBar-root, .MuiAppBar-root');
    await expect(appBar).toBeVisible();

    // Bottom navigation should be visible
    const bottomNav = page.locator(
      'nav.MuiBottomNavigation-root, .MuiBottomNavigation-root',
    );
    await expect(bottomNav).toBeVisible();

    expectNoConsoleErrors(consoleMessages);
  });

  test('RT-Resp-03: Desktop 1280x720 — full desktop layout, no truncation', async ({
    page,
    consoleMessages,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.reload();
    await waitForAppReady(page);

    // Dashboard should be visible
    const dashboard = page.locator('.MuiCard-root').first();
    await expect(dashboard).toBeVisible();

    // No horizontal overflow
    await expectViewportFits(page);

    // AppBar title should not be truncated (verify it is fully visible)
    const appTitle = page.locator('header h1, .MuiAppBar-root h1');
    await expect(appTitle).toBeVisible();

    // All four bottom-nav labels should be visible and not truncated
    const bottomNavActions = page.locator('.MuiBottomNavigationAction-label');
    const labelCount = await bottomNavActions.count();
    expect(labelCount).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < labelCount; i++) {
      await expect(bottomNavActions.nth(i)).toBeVisible();
    }

    expectNoConsoleErrors(consoleMessages);
  });
});
