/**
 * Regression tests: Core Flows (RT-Core-01 through RT-Core-05)
 *
 * Covers the fundamental CRUD operations of the Ma'aser Tracker:
 * adding income, adding donations, viewing history, editing, and deleting entries.
 */

import { test, expect } from '../fixtures/console.fixture.js';
import { waitForAppReady, ensureHebrew } from '../helpers/navigation.js';
import { clearIndexedDB, seedEntries } from '../helpers/data.js';
import { expectNoConsoleErrors } from '../helpers/assertions.js';

test.describe('Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearIndexedDB(page);
    await page.reload();
    await waitForAppReady(page);
  });

  // ---------------------------------------------------------------------------
  // RT-Core-01: Add Income
  // ---------------------------------------------------------------------------
  test('RT-Core-01: add income entry and verify dashboard updates', async ({ page, consoleMessages }) => {
    await ensureHebrew(page);

    // Click the "Add Income" tab in the bottom navigation
    const addIncomeTab = page.getByRole('button', { name: /הוסף הכנסה|Add Income/ });
    await addIncomeTab.click();

    // Fill the amount field
    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('1000');

    // Click save
    const saveBtn = page.getByRole('button', { name: /שמור|Save/ });
    await saveBtn.click();

    // After saving, the app should redirect to Dashboard (tab 0)
    // Verify the dashboard shows the updated totals
    await expect(page.getByText('1,000')).toBeVisible({ timeout: 5000 });

    // Verify the calculated ma'aser amount (10% of 1000 = 100)
    await expect(page.getByText('100')).toBeVisible({ timeout: 5000 });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Core-02: Add Donation
  // ---------------------------------------------------------------------------
  test('RT-Core-02: add donation entry and verify dashboard obligation updates', async ({ page, consoleMessages }) => {
    // Seed an income entry first so there is an existing obligation
    await seedEntries(page, [
      {
        id: 'seed-income-01',
        type: 'income',
        date: '2026-03-01',
        amount: 1000,
        maaser: 100,
        note: 'Seeded income',
        accountingMonth: '2026-03',
      },
    ]);
    await page.reload();
    await waitForAppReady(page);
    await ensureHebrew(page);

    // Click the "Add Donation" tab
    const addDonationTab = page.getByRole('button', { name: /הוסף תרומה|Add Donation/ });
    await addDonationTab.click();

    // Fill the amount field
    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible();
    await amountInput.fill('100');

    // Click save
    const saveBtn = page.getByRole('button', { name: /שמור|Save/ });
    await saveBtn.click();

    // After saving, verify dashboard shows the donation was recorded
    await expect(page.getByText('100')).toBeVisible({ timeout: 5000 });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Core-03: View History
  // ---------------------------------------------------------------------------
  test('RT-Core-03: view history tab with entries listed', async ({ page, consoleMessages }) => {
    // Seed entries
    await seedEntries(page, [
      {
        id: 'seed-income-02',
        type: 'income',
        date: '2026-03-01',
        amount: 5000,
        maaser: 500,
        note: 'Salary',
        accountingMonth: '2026-03',
      },
      {
        id: 'seed-donation-01',
        type: 'donation',
        date: '2026-03-05',
        amount: 200,
        note: 'Charity',
        accountingMonth: '2026-03',
      },
    ]);
    await page.reload();
    await waitForAppReady(page);
    await ensureHebrew(page);

    // Navigate to History tab
    const historyTab = page.getByRole('button', { name: /היסטוריה|History/ });
    await historyTab.click();

    // Verify entries are listed with amounts
    await expect(page.getByText('5,000')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('200')).toBeVisible({ timeout: 5000 });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Core-04: Edit Entry
  // ---------------------------------------------------------------------------
  test('RT-Core-04: edit an entry in history and verify update', async ({ page, consoleMessages }) => {
    // Seed an entry
    await seedEntries(page, [
      {
        id: 'seed-income-03',
        type: 'income',
        date: '2026-03-01',
        amount: 2000,
        maaser: 200,
        note: 'Edit me',
        accountingMonth: '2026-03',
      },
    ]);
    await page.reload();
    await waitForAppReady(page);
    await ensureHebrew(page);

    // Navigate to History tab
    const historyTab = page.getByRole('button', { name: /היסטוריה|History/ });
    await historyTab.click();

    // Click the edit button on the entry
    const editBtn = page.getByRole('button', { name: /ערוך|Edit/ }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // The app should navigate to the Add Income form with the entry pre-filled
    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible({ timeout: 5000 });

    // Change the amount
    await amountInput.fill('3000');

    // Save
    const saveBtn = page.getByRole('button', { name: /שמור|Save/ });
    await saveBtn.click();

    // Verify the dashboard recalculates with the new amount
    await expect(page.getByText('3,000')).toBeVisible({ timeout: 5000 });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-Core-05: Delete Entry
  // ---------------------------------------------------------------------------
  test('RT-Core-05: delete an entry and verify removal and dashboard recalculation', async ({ page, consoleMessages }) => {
    // Seed entries
    await seedEntries(page, [
      {
        id: 'seed-income-04',
        type: 'income',
        date: '2026-03-01',
        amount: 4000,
        maaser: 400,
        note: 'Delete me',
        accountingMonth: '2026-03',
      },
      {
        id: 'seed-income-05',
        type: 'income',
        date: '2026-03-02',
        amount: 1000,
        maaser: 100,
        note: 'Keep me',
        accountingMonth: '2026-03',
      },
    ]);
    await page.reload();
    await waitForAppReady(page);
    await ensureHebrew(page);

    // Navigate to History tab
    const historyTab = page.getByRole('button', { name: /היסטוריה|History/ });
    await historyTab.click();

    // Verify the entry to be deleted is visible
    await expect(page.getByText('4,000')).toBeVisible({ timeout: 5000 });

    // Click the delete button on the first entry
    const deleteBtn = page.getByRole('button', { name: /מחק|Delete/ }).first();
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();

    // Confirm deletion in the dialog
    const confirmBtn = page.getByRole('button', { name: /כן|Yes/ });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Verify the deleted entry is removed (4,000 should no longer appear in history)
    await expect(page.getByText('4,000')).not.toBeVisible({ timeout: 5000 });

    // Navigate back to dashboard to verify recalculation
    const dashboardTab = page.getByRole('button', { name: /לוח בקרה|Dashboard/ });
    await dashboardTab.click();

    // Dashboard should show totals based only on the remaining entry (1,000)
    await expect(page.getByText('1,000')).toBeVisible({ timeout: 5000 });

    expectNoConsoleErrors(consoleMessages);
  });
});
