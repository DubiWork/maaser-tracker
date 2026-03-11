/**
 * Authentication helpers for E2E tests.
 *
 * These utilities inject mock Firebase auth state so E2E tests can exercise
 * authenticated code-paths without going through a real OAuth flow.
 */

/**
 * Mock user object that mirrors the shape of a Firebase Auth User.
 */
export const mockUser = {
  uid: 'e2e-test-user-001',
  email: 'e2e-test@maaser-tracker.test',
  displayName: 'E2E Test User',
  photoURL: null,
  emailVerified: true,
};

/**
 * Inject a mock Firebase auth user into localStorage so the app treats
 * the session as authenticated.
 *
 * Call this BEFORE navigating to the app (or before a page.reload()).
 */
export async function injectMockAuth(page) {
  await page.evaluate((user) => {
    localStorage.setItem('firebase:authUser', JSON.stringify(user));
  }, mockUser);
}

/**
 * Set the migration status to "complete" in IndexedDB so the app does
 * not show a migration prompt during tests.
 */
export async function injectMockMigrationComplete(page) {
  await page.evaluate(async () => {
    const request = indexedDB.open('maaser-tracker-meta', 1);

    await new Promise((resolve, reject) => {
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('migration')) {
          db.createObjectStore('migration', { keyPath: 'key' });
        }
      };
      request.onsuccess = async () => {
        const db = request.result;
        const tx = db.transaction('migration', 'readwrite');
        const store = tx.objectStore('migration');
        store.put({ key: 'status', value: 'complete', completedAt: new Date().toISOString() });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

/**
 * Remove mock auth data from localStorage.
 */
export async function clearAuth(page) {
  await page.evaluate(() => {
    localStorage.removeItem('firebase:authUser');
  });
}
