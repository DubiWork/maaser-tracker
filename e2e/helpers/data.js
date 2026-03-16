/**
 * Data helpers for E2E tests.
 *
 * Utilities for clearing / seeding IndexedDB and creating import file buffers.
 */

import path from 'path';
import fs from 'fs';

/**
 * Clear all IndexedDB databases for the current origin.
 */
export async function clearIndexedDB(page) {
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      indexedDB.deleteDatabase(db.name);
    }
  });
}

/**
 * Seed entries directly into IndexedDB via page.evaluate.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array<object>} entries — array of entry objects with at minimum
 *   { id, type, date, amount } fields.
 */
export async function seedEntries(page, entries) {
  await page.evaluate(async (data) => {
    // Open (or create) the maaser-tracker database used by the app
    const request = indexedDB.open('maaser-tracker', 1);

    await new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('entries')) {
          db.createObjectStore('entries', { keyPath: 'id' });
        }
      };
      request.onsuccess = async () => {
        const db = request.result;
        const tx = db.transaction('entries', 'readwrite');
        const store = tx.objectStore('entries');
        for (const entry of data) {
          store.put(entry);
        }
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  }, entries);
}

/**
 * Create a JSON import file on disk and return its absolute path.
 *
 * The file follows the app's import envelope format:
 *   { version, exportDate, entryCount, entries }
 *
 * @param {Array<object>} entries
 * @returns {string} absolute path to the created file
 */
export function createImportJsonFile(entries) {
  const envelope = {
    version: 1,
    exportDate: new Date().toISOString(),
    entryCount: entries.length,
    entries,
  };
  const tmpDir = path.join(process.cwd(), 'e2e', '.tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, `test-import-${Date.now()}.json`);
  fs.writeFileSync(filePath, JSON.stringify(envelope, null, 2));
  return filePath;
}

/**
 * Create a CSV import file on disk and return its absolute path.
 *
 * @param {Array<string[]>} rows — first element is the header row, rest are
 *   data rows.  Each element is an array of cell values.
 * @returns {string} absolute path to the created file
 */
export function createImportCsvFile(rows) {
  const csvContent = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const tmpDir = path.join(process.cwd(), 'e2e', '.tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, `test-import-${Date.now()}.csv`);
  fs.writeFileSync(filePath, csvContent);
  return filePath;
}
