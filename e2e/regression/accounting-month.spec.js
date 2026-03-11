/**
 * Regression Tests: Accounting Month (RT-Month-01..02)
 *
 * Validates that the accounting month field is present on the Add Income form,
 * defaults to the current YYYY-MM, and can be changed independently of the
 * payment date.
 */

import { test, expect } from '../fixtures/console.fixture.js';
import { waitForAppReady, ensureEnglish } from '../helpers/navigation.js';
import { clearIndexedDB } from '../helpers/data.js';
import { expectNoConsoleErrors } from '../helpers/assertions.js';

test.describe('Accounting Month', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
    await page.goto('/');
    await waitForAppReady(page);
    await ensureEnglish(page);
  });

  test('RT-Month-01: Accounting month field present and defaults to current YYYY-MM', async ({
    page,
    consoleMessages,
  }) => {
    // Navigate to Add Income tab
    const addIncomeTab = page.getByRole('button', { name: 'Add Income' });
    await addIncomeTab.click();

    // Verify the accounting month input is visible
    const accountingMonthInput = page.locator('input[type="month"]');
    await expect(accountingMonthInput).toBeVisible();

    // Verify it defaults to current YYYY-MM
    const now = new Date();
    const expectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    await expect(accountingMonthInput).toHaveValue(expectedMonth);

    // Verify the label is present
    await expect(page.getByText('Accounting Month')).toBeVisible();

    expectNoConsoleErrors(consoleMessages);
  });

  test('RT-Month-02: Change accounting month to prior month, verify in History', async ({
    page,
    consoleMessages,
  }) => {
    // Navigate to Add Income tab
    const addIncomeTab = page.getByRole('button', { name: 'Add Income' });
    await addIncomeTab.click();

    // Calculate prior month value (YYYY-MM)
    const now = new Date();
    const priorDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const priorMonth = `${priorDate.getFullYear()}-${String(priorDate.getMonth() + 1).padStart(2, '0')}`;

    // Change accounting month to prior month
    const accountingMonthInput = page.locator('input[type="month"]');
    await accountingMonthInput.fill(priorMonth);

    // Enter an amount
    const amountInput = page.locator('input[type="number"]');
    await amountInput.fill('5000');

    // Save the entry
    const saveBtn = page.getByRole('button', { name: /Save|שמור/ });
    await saveBtn.click();

    // Wait for redirect to dashboard
    await expect(page.getByText(/Dashboard|לוח בקרה/)).toBeVisible({ timeout: 5000 });

    // Navigate to History tab
    const historyTab = page.getByRole('button', { name: 'History' });
    await historyTab.click();

    // Verify the entry is shown with amount
    await expect(page.getByText('5,000')).toBeVisible({ timeout: 5000 });

    // Verify the accounting month is displayed (prior month name)
    const priorMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const priorMonthName = priorMonthNames[priorDate.getMonth()];
    await expect(page.getByText(new RegExp(priorMonthName))).toBeVisible();

    // Verify the "Paid on" text is shown since accounting month differs from payment date
    await expect(page.getByText(/Paid on/)).toBeVisible();

    expectNoConsoleErrors(consoleMessages);
  });
});
