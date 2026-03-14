/**
 * Tests for hash-based routing of the PrivacyPolicy page.
 *
 * In App.jsx, AppContent uses useSyncExternalStore to listen
 * for hash changes. When hash === '#/privacy', PrivacyPolicy
 * is rendered instead of the main app content.
 *
 * These tests verify that routing logic at the integration level.
 * We mock heavy dependencies (Firebase, services) to isolate routing behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// Mock Firebase and heavy dependencies before importing App
vi.mock('../lib/firebase', () => ({
  db: {},
  auth: { currentUser: null },
  isAuthenticated: vi.fn(() => false),
  getCurrentUserId: vi.fn(() => null),
}));

vi.mock('../services/auth', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((callback) => {
    callback(null);
    return vi.fn();
  }),
  handleRedirectResult: vi.fn().mockResolvedValue(null),
}));

vi.mock('../services/db', () => ({
  isIndexedDBSupported: vi.fn(() => true),
  getAllEntries: vi.fn(() => Promise.resolve([])),
  addEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
}));

vi.mock('../services/migration', () => ({
  migrateFromLocalStorage: vi.fn(() =>
    Promise.resolve({ success: true, entriesMigrated: 0 })
  ),
  createLocalStorageBackup: vi.fn(),
}));

vi.mock('../services/firestoreMigrationService', () => ({
  getMigrationStatus: vi.fn(() => Promise.resolve(null)),
  migrateToFirestore: vi.fn(),
  deleteAllUserEntries: vi.fn(),
}));

vi.mock('../services/gdprDataService', () => ({
  exportUserData: vi.fn(),
  deleteAllCloudData: vi.fn(),
}));

vi.mock('../hooks/useMigration', () => ({
  useMigration: vi.fn(() => ({ status: 'idle' })),
  migrationQueryKeys: { status: (uid) => ['migration', 'status', uid] },
}));

vi.mock('../hooks/useEntries', () => ({
  useEntries: vi.fn(() => ({ data: [], isLoading: false })),
  useAddEntry: vi.fn(() => ({ mutate: vi.fn() })),
  useUpdateEntry: vi.fn(() => ({ mutate: vi.fn() })),
  useDeleteEntry: vi.fn(() => ({ mutate: vi.fn() })),
  useClearEntriesCache: vi.fn(() => vi.fn()),
}));

vi.mock('../services/networkMonitor', () => ({
  getNetworkMonitor: vi.fn(() => ({
    isOnline: () => true,
    subscribe: vi.fn(() => vi.fn()),
  })),
}));

// Must import App after all mocks are set up
import App from '../App';

describe('Privacy Policy hash routing', () => {
  let originalHash;

  beforeEach(() => {
    originalHash = window.location.hash;
  });

  afterEach(() => {
    window.location.hash = originalHash;
  });

  it('should render PrivacyPolicy when hash is #/privacy', async () => {
    window.location.hash = '#/privacy';

    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('מדיניות פרטיות')).toBeInTheDocument();
  });

  it('should render normal app content when hash is empty', async () => {
    window.location.hash = '';

    await act(async () => {
      render(<App />);
    });

    // The main app renders the app name in the AppBar
    expect(screen.getByText('מעקב מעשר')).toBeInTheDocument();
    // And should NOT render the privacy policy title
    expect(screen.queryByText('מדיניות פרטיות')).not.toBeInTheDocument();
  });

  it('should re-render when hash changes from empty to #/privacy', async () => {
    window.location.hash = '';

    await act(async () => {
      render(<App />);
    });

    // Initially shows main app
    expect(screen.getByText('מעקב מעשר')).toBeInTheDocument();
    expect(screen.queryByText('מדיניות פרטיות')).not.toBeInTheDocument();

    // Simulate hash change
    await act(async () => {
      window.location.hash = '#/privacy';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    // Now should show privacy policy
    expect(screen.getByText('מדיניות פרטיות')).toBeInTheDocument();
  });

  it('should re-render when hash changes from #/privacy to empty', async () => {
    window.location.hash = '#/privacy';

    await act(async () => {
      render(<App />);
    });

    // Initially shows privacy policy
    expect(screen.getByText('מדיניות פרטיות')).toBeInTheDocument();

    // Simulate hash change back to empty
    await act(async () => {
      window.location.hash = '';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    // Now should show main app
    expect(screen.getByText('מעקב מעשר')).toBeInTheDocument();
    expect(screen.queryByText('מדיניות פרטיות')).not.toBeInTheDocument();
  });

  it('should not render PrivacyPolicy for unrelated hash values', async () => {
    window.location.hash = '#/settings';

    await act(async () => {
      render(<App />);
    });

    // Should render the main app, not privacy policy
    expect(screen.getByText('מעקב מעשר')).toBeInTheDocument();
    expect(screen.queryByText('מדיניות פרטיות')).not.toBeInTheDocument();
  });
});
