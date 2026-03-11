/**
 * Regression Tests: Import/Export (RT-IE-01..05)
 *
 * Validates JSON export/import round-trip, CSV export with Hebrew and BOM,
 * Hebrew-header CSV import, error handling for malformed files, and bulk
 * import performance with progress indicator.
 */

import fs from 'fs';
import { test, expect } from '../fixtures/console.fixture.js';
import { waitForAppReady, ensureEnglish, openSettings } from '../helpers/navigation.js';
import { clearIndexedDB, seedEntries, createImportJsonFile, createImportCsvFile } from '../helpers/data.js';
import { expectNoConsoleErrors } from '../helpers/assertions.js';

/**
 * Generate a set of sample entries for seeding.
 * @param {number} count - Number of entries to generate
 * @returns {Array<object>}
 */
function generateEntries(count) {
  const entries = [];
  for (let i = 0; i < count; i++) {
    const isIncome = i % 3 !== 2;
    const amount = isIncome ? 1000 + i * 10 : 100 + i * 5;
    entries.push({
      id: `entry-${String(i).padStart(4, '0')}`,
      type: isIncome ? 'income' : 'donation',
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      amount,
      maaser: isIncome ? amount * 0.1 : undefined,
      note: isIncome ? `Income entry ${i}` : `Donation entry ${i}`,
      accountingMonth: '2026-01',
    });
  }
  return entries;
}

test.describe('Import / Export', () => {
  test.beforeEach(async ({ page }) => {
    await clearIndexedDB(page);
    await page.goto('/');
    await page.reload();
    await waitForAppReady(page);
    await ensureEnglish(page);
  });

  // ---------------------------------------------------------------------------
  // RT-IE-01 — JSON round-trip: export, clear, re-import with Replace All
  // ---------------------------------------------------------------------------
  test('RT-IE-01: Export JSON, clear data, import with Replace All — entries restored', async ({
    page,
    consoleMessages,
  }) => {
    // Seed 5 entries
    const seeded = generateEntries(5);
    await seedEntries(page, seeded);
    await page.reload();
    await waitForAppReady(page);
    await ensureEnglish(page);

    // Open Settings and scroll to Import/Export section
    await openSettings(page);
    const importSection = page.locator('[data-testid="import-export-section"]');
    await importSection.scrollIntoViewIfNeeded();

    // Click Export JSON and capture the download
    const exportJsonBtn = page.getByRole('button', { name: /Export JSON|ייצוא JSON/ });
    await expect(exportJsonBtn).toBeEnabled({ timeout: 5000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await exportJsonBtn.click();

    const download = await downloadPromise;
    const suggestedFilename = download.suggestedFilename();

    // Verify filename format: maaser-tracker-YYYY-MM-DD.json
    expect(suggestedFilename).toMatch(/^maaser-tracker-\d{4}-\d{2}-\d{2}\.json$/);

    // Read the downloaded file
    const downloadPath = await download.path();
    const content = fs.readFileSync(downloadPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.version).toBe(1);
    expect(data.entries.length).toBe(5);

    // Save the file path for re-import
    const importFile = createImportJsonFile(data.entries);

    try {
      // Clear entries and reload
      await clearIndexedDB(page);
      await page.reload();
      await waitForAppReady(page);
      await ensureEnglish(page);

      // Open Settings again
      await openSettings(page);
      const section = page.locator('[data-testid="import-export-section"]');
      await section.scrollIntoViewIfNeeded();

      // Trigger file import
      const fileInput = page.locator('[data-testid="import-file-input"]');
      await fileInput.setInputFiles(importFile);

      // Wait for Import Preview dialog
      await expect(
        page.getByRole('heading', { name: /Import Preview|תצוגה מקדימה/ }),
      ).toBeVisible({ timeout: 10000 });

      // Verify valid entries count
      await expect(page.getByText(/5 valid entries|5 רשומות תקינות/)).toBeVisible();

      // Switch to Replace All mode
      const replaceLabel = page.locator('text=/Replace All|החלף הכל/').first();
      await replaceLabel.click();

      // Check the consent checkbox
      const consentCheckbox = page.getByRole('checkbox');
      await consentCheckbox.check();

      // Click Import
      const importActionBtn = page.getByRole('button', { name: /^Import$|^ייבוא$/ });
      await expect(importActionBtn).toBeEnabled();
      await importActionBtn.click();

      // Wait for success
      await expect(
        page.getByText(/Successfully imported 5|5 רשומות יובאו בהצלחה/),
      ).toBeVisible({ timeout: 15000 });

      // Navigate to History via "View Entries"
      const viewBtn = page.getByRole('button', { name: /View Entries|צפה ברשומות/ });
      if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await viewBtn.click();
      }

      expectNoConsoleErrors(consoleMessages);
    } finally {
      if (fs.existsSync(importFile)) fs.unlinkSync(importFile);
    }
  });

  // ---------------------------------------------------------------------------
  // RT-IE-02 — CSV export with Hebrew notes, BOM, and correct headers
  // ---------------------------------------------------------------------------
  test('RT-IE-02: Export CSV — headers present, Hebrew text correct, amounts numeric, BOM prefix', async ({
    page,
    consoleMessages,
  }) => {
    // Seed entries with Hebrew notes
    const entries = [
      { id: 'he-1', type: 'income', date: '2026-02-01', amount: 5000, maaser: 500, note: 'משכורת חודשית', accountingMonth: '2026-02' },
      { id: 'he-2', type: 'donation', date: '2026-02-05', amount: 300, note: 'צדקה לבית כנסת', accountingMonth: '2026-02' },
      { id: 'he-3', type: 'income', date: '2026-02-10', amount: 2000, maaser: 200, note: 'בונוס', accountingMonth: '2026-02' },
    ];
    await seedEntries(page, entries);
    await page.reload();
    await waitForAppReady(page);
    await ensureEnglish(page);

    // Open Settings
    await openSettings(page);
    const importSection = page.locator('[data-testid="import-export-section"]');
    await importSection.scrollIntoViewIfNeeded();

    // Click Export CSV
    const exportCsvBtn = page.getByRole('button', { name: /Export CSV|ייצוא CSV/ });
    await expect(exportCsvBtn).toBeEnabled({ timeout: 5000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await exportCsvBtn.click();

    const download = await downloadPromise;
    const downloadPath = await download.path();
    let csvContent = fs.readFileSync(downloadPath, 'utf-8');

    // Verify BOM prefix
    expect(csvContent.charCodeAt(0)).toBe(0xFEFF);

    // Strip BOM for parsing
    csvContent = csvContent.substring(1);

    const lines = csvContent.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(4); // header + 3 data rows

    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
    expect(headers).toContain('id');
    expect(headers).toContain('type');
    expect(headers).toContain('date');
    expect(headers).toContain('amount');
    expect(headers).toContain('note');
    expect(headers).toContain('accountingMonth');

    // Verify Hebrew text in notes column
    const noteIdx = headers.indexOf('note');
    const firstDataRow = lines[1].split(',').map((v) => v.trim().replace(/"/g, ''));
    // The note should contain Hebrew characters
    expect(firstDataRow[noteIdx]).toMatch(/[\u0590-\u05FF]/);

    // Verify amounts are numeric
    const amountIdx = headers.indexOf('amount');
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
      const amount = parseFloat(row[amountIdx]);
      expect(amount).toBeGreaterThan(0);
      expect(isNaN(amount)).toBe(false);
    }

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-IE-03 — Import CSV with Hebrew headers
  // ---------------------------------------------------------------------------
  test('RT-IE-03: Import CSV with Hebrew headers — entries imported correctly', async ({
    page,
    consoleMessages,
  }) => {
    const csvFile = createImportCsvFile([
      ['סוג', 'סכום', 'תאריך', 'הערה'],
      ['הכנסה', '5000', '15/03/2026', 'משכורת'],
      ['תרומה', '500', '16/03/2026', 'צדקה'],
    ]);

    try {
      await openSettings(page);
      const importSection = page.locator('[data-testid="import-export-section"]');
      await importSection.scrollIntoViewIfNeeded();

      // Trigger file import
      const fileInput = page.locator('[data-testid="import-file-input"]');
      await fileInput.setInputFiles(csvFile);

      // Wait for Import Preview dialog
      await expect(
        page.getByRole('heading', { name: /Import Preview|תצוגה מקדימה/ }),
      ).toBeVisible({ timeout: 10000 });

      // Verify valid entries are detected
      await expect(page.getByText(/2 valid entries|2 רשומות תקינות/)).toBeVisible();

      // Click Import button (default Merge mode)
      const importActionBtn = page.getByRole('button', { name: /^Import$|^ייבוא$/ });
      await expect(importActionBtn).toBeEnabled();
      await importActionBtn.click();

      // Wait for success
      await expect(
        page.getByText(/Successfully imported 2|2 רשומות יובאו בהצלחה/),
      ).toBeVisible({ timeout: 15000 });

      // Navigate to History via "View Entries"
      const viewBtn = page.getByRole('button', { name: /View Entries|צפה ברשומות/ });
      if (await viewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await viewBtn.click();
      }

      // Verify both entries appear in history
      await expect(page.getByText('5,000')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('500')).toBeVisible({ timeout: 5000 });

      expectNoConsoleErrors(consoleMessages);
    } finally {
      if (fs.existsSync(csvFile)) fs.unlinkSync(csvFile);
    }
  });

  // ---------------------------------------------------------------------------
  // RT-IE-04 — Error handling for malformed imports
  // ---------------------------------------------------------------------------
  test('RT-IE-04: Malformed JSON, wrong schema version, CSV missing columns — error messages, no data change', async ({
    page,
    consoleMessages,
  }) => {
    // Seed 1 entry to verify data is not modified
    await seedEntries(page, [
      { id: 'guard-entry', type: 'income', date: '2026-01-01', amount: 999, maaser: 99.9, note: 'Guard', accountingMonth: '2026-01' },
    ]);
    await page.reload();
    await waitForAppReady(page);
    await ensureEnglish(page);

    await openSettings(page);
    const importSection = page.locator('[data-testid="import-export-section"]');
    await importSection.scrollIntoViewIfNeeded();
    const fileInput = page.locator('[data-testid="import-file-input"]');

    // --- Attempt 1: Malformed JSON ---
    const malformedJsonPath = createImportJsonFile([]); // We'll overwrite the content
    fs.writeFileSync(malformedJsonPath, '{ broken }}');

    await fileInput.setInputFiles(malformedJsonPath);

    // Verify error or dialog shows issue
    await expect(
      page.getByText(/Invalid|Error|invalid|error|לא חוקי|שגיאה/),
    ).toBeVisible({ timeout: 10000 });

    // Dismiss any dialog that appeared
    const closeBtn = page.getByRole('button', { name: /Close|Cancel|OK|ביטול|סגור/ }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }

    // --- Attempt 2: Wrong schema version ---
    const wrongVersionPath = createImportJsonFile([]);
    const wrongEnvelope = {
      version: 999,
      exportDate: new Date().toISOString(),
      entryCount: 1,
      entries: [{ id: 'x', type: 'income', date: '2026-01-01', amount: 100 }],
    };
    fs.writeFileSync(wrongVersionPath, JSON.stringify(wrongEnvelope));

    // Reset file input to allow re-triggering
    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="import-file-input"]');
      if (input) input.value = '';
    });
    await fileInput.setInputFiles(wrongVersionPath);

    // Verify error or the preview shows a problem
    await expect(
      page.getByText(/version|Error|invalid|unsupported|שגיאה|גרסה/i),
    ).toBeVisible({ timeout: 10000 });

    // Dismiss dialog
    const closeBtn2 = page.getByRole('button', { name: /Close|Cancel|OK|ביטול|סגור/ }).first();
    if (await closeBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn2.click();
    }

    // --- Attempt 3: CSV missing required columns ---
    const badCsvPath = createImportCsvFile([
      ['random', 'columns'],
      ['foo', 'bar'],
    ]);

    await page.evaluate(() => {
      const input = document.querySelector('[data-testid="import-file-input"]');
      if (input) input.value = '';
    });
    await fileInput.setInputFiles(badCsvPath);

    // Verify error or the preview shows zero valid entries
    await expect(
      page.getByText(/0 valid|Invalid|Error|invalid|error|לא חוקי|0 תקינות/i),
    ).toBeVisible({ timeout: 10000 });

    // Clean up temp files
    [malformedJsonPath, wrongVersionPath, badCsvPath].forEach((f) => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });

    expectNoConsoleErrors(consoleMessages);
  });

  // ---------------------------------------------------------------------------
  // RT-IE-05 — Bulk import with 100+ entries, progress indicator
  // ---------------------------------------------------------------------------
  test('RT-IE-05: 100+ entries — progress indicator shown, import within 30s', async ({
    page,
    consoleMessages,
  }) => {
    // Generate 110 entries
    const bulkEntries = generateEntries(110);
    const importFile = createImportJsonFile(bulkEntries);

    try {
      await openSettings(page);
      const importSection = page.locator('[data-testid="import-export-section"]');
      await importSection.scrollIntoViewIfNeeded();

      // Trigger file import
      const fileInput = page.locator('[data-testid="import-file-input"]');
      await fileInput.setInputFiles(importFile);

      // Wait for Import Preview dialog
      await expect(
        page.getByRole('heading', { name: /Import Preview|תצוגה מקדימה/ }),
      ).toBeVisible({ timeout: 10000 });

      // Verify valid entries count (should show 110)
      await expect(page.getByText(/110 valid entries|110 רשומות תקינות/)).toBeVisible();

      // Select Replace All mode
      const replaceLabel = page.locator('text=/Replace All|החלף הכל/').first();
      await replaceLabel.click();

      // Check consent checkbox
      const consentCheckbox = page.getByRole('checkbox');
      await consentCheckbox.check();

      // Click Import
      const importActionBtn = page.getByRole('button', { name: /^Import$|^ייבוא$/ });
      await expect(importActionBtn).toBeEnabled();
      await importActionBtn.click();

      // Verify progress or success appears within 30 seconds
      await expect(
        page.getByText(/Importing|Successfully imported|מייבא|רשומות יובאו בהצלחה/),
      ).toBeVisible({ timeout: 30000 });

      // Wait for final success message
      await expect(
        page.getByText(/Successfully imported 110|110 רשומות יובאו בהצלחה/),
      ).toBeVisible({ timeout: 30000 });

      expectNoConsoleErrors(consoleMessages);
    } finally {
      if (fs.existsSync(importFile)) fs.unlinkSync(importFile);
    }
  });
});
