/**
 * Regression Tests: Privacy Policy (RT-Privacy-01..03)
 *
 * Validates that the privacy policy page renders via hash routing, displays
 * all required sections, supports bilingual toggling, and navigates back
 * correctly.
 */

import { test, expect } from '../fixtures/console.fixture.js';
import { waitForAppReady, ensureEnglish } from '../helpers/navigation.js';
import { clearIndexedDB } from '../helpers/data.js';
import { injectMockAuth } from '../helpers/auth.js';
import { expectNoConsoleErrors, expectRTL, expectLTR } from '../helpers/assertions.js';

/** The 9 privacy policy section titles in English */
const ENGLISH_SECTION_TITLES = [
  'Introduction',
  'Data We Collect',
  'How We Store Your Data',
  'How We Use Your Data',
  'Your Rights (GDPR)',
  'Data Security',
  "Children's Privacy",
  'Changes to This Policy',
  'Contact',
];

test.describe('Privacy Policy', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
    await injectMockAuth(page);
    await page.goto('/');
    await waitForAppReady(page);
    await ensureEnglish(page);
  });

  test('RT-Privacy-01: Navigate to privacy page, verify hash, sections, back button', async ({
    page,
    consoleMessages,
  }) => {
    // Click user avatar to open profile menu
    const avatarBtn = page.getByRole('button', { name: /User Profile|פרופיל משתמש/ });
    await avatarBtn.click();

    // Click "Privacy Policy" menu item
    const privacyMenuItem = page.getByText(/Privacy Policy|מדיניות פרטיות/);
    await expect(privacyMenuItem).toBeVisible();
    await privacyMenuItem.click();

    // Verify hash changes to #/privacy
    await page.waitForFunction(() => window.location.hash === '#/privacy', null, {
      timeout: 5000,
    });

    // Verify the privacy policy page renders with the title
    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();

    // Verify "last updated" date is shown
    await expect(page.getByText(/Last updated|עודכן לאחרונה/)).toBeVisible();

    // Verify all 9 sections are present
    for (const title of ENGLISH_SECTION_TITLES) {
      await expect(
        page.getByRole('heading', { name: title, level: 2 }),
      ).toBeVisible();
    }

    // Verify back button is visible (top and bottom)
    const backButtons = page.getByRole('button', { name: /Back|חזרה/ });
    const backCount = await backButtons.count();
    expect(backCount).toBeGreaterThanOrEqual(2);

    expectNoConsoleErrors(consoleMessages);
  });

  test('RT-Privacy-02: Hebrew RTL rendering, then toggle to English LTR', async ({
    page,
    consoleMessages,
  }) => {
    // Navigate to privacy page
    await page.goto('/#/privacy');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Switch to Hebrew first
    const hebrewToggle = page.getByRole('button', { name: /עברית/ });
    if (await hebrewToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await hebrewToggle.click();
    }

    // Verify RTL direction
    await expectRTL(page);

    // Verify Hebrew title is rendered
    await expect(page.getByRole('heading', { name: 'מדיניות פרטיות', level: 1 })).toBeVisible();

    // Verify a Hebrew section title
    await expect(page.getByRole('heading', { name: 'מבוא', level: 2 })).toBeVisible();

    // Toggle language to English using the button on the privacy page
    const englishToggle = page.getByRole('button', { name: /English/ });
    await expect(englishToggle).toBeVisible();
    await englishToggle.click();

    // Verify LTR direction
    await expectLTR(page);

    // Verify English title is rendered
    await expect(page.getByRole('heading', { name: 'Privacy Policy', level: 1 })).toBeVisible();

    expectNoConsoleErrors(consoleMessages);
  });

  test('RT-Privacy-03: Back button returns to main view, direct hash navigation works', async ({
    page,
    consoleMessages,
  }) => {
    // Navigate to privacy page
    await page.goto('/#/privacy');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Verify privacy page loaded
    await expect(page.getByRole('heading', { name: /Privacy Policy|מדיניות פרטיות/, level: 1 })).toBeVisible();

    // Click back button (the top one)
    const backBtn = page.getByRole('button', { name: /Back to app|Back|חזרה/ }).first();
    await backBtn.click();

    // Verify hash is cleared and we are back to the main app
    await page.waitForFunction(
      () => window.location.hash === '' || window.location.hash === '#',
      null,
      { timeout: 5000 },
    );

    // Verify the main app view is visible (bottom navigation)
    await page.waitForSelector(
      'nav.MuiBottomNavigation-root, .MuiBottomNavigation-root',
      { state: 'visible', timeout: 10000 },
    );

    // Navigate to #/privacy via URL directly
    await page.goto('/#/privacy');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Verify privacy page loads via direct hash navigation
    await expect(page.getByRole('heading', { name: /Privacy Policy|מדיניות פרטיות/, level: 1 })).toBeVisible({
      timeout: 10000,
    });

    expectNoConsoleErrors(consoleMessages);
  });
});
