/**
 * Tests: initializeDefaultPresets called on App mount
 *
 * Tests that the hook/effect that initializes presets is called.
 * We test this via the MainApp's internal useEffect by mocking the service.
 *
 * Strategy: render just the component that contains the useEffect
 * (MainApp via App) with all heavy dependencies mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mock everything that App imports ─────────────────────────────────────────

// Mock presetService BEFORE importing App
vi.mock('./services/presetService', () => ({
  initializeDefaultPresets: vi.fn().mockResolvedValue(undefined),
}));

// Mock firebase.js so it doesn't throw
vi.mock('./lib/firebase', () => ({
  auth: {},
  db: {},
}));

// Mock firebase/app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

// Mock firebase/auth — include all functions used
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb(null); // unauthenticated
    return () => {};
  }),
  GoogleAuthProvider: vi.fn(function () {}),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

// Mock IndexedDB services
vi.mock('./services/db', () => ({
  isIndexedDBSupported: vi.fn(() => true),
  getAllEntries: vi.fn().mockResolvedValue([]),
  addEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  initDB: vi.fn().mockResolvedValue({}),
}));

vi.mock('./services/migration', () => ({
  migrateFromLocalStorage: vi.fn().mockResolvedValue({ success: true, entriesMigrated: 0 }),
  createLocalStorageBackup: vi.fn().mockReturnValue(null),
}));

vi.mock('./hooks/useEntries', () => ({
  useEntries: vi.fn().mockReturnValue({ data: [], isLoading: false }),
  useAddEntry: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useUpdateEntry: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useDeleteEntry: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('./hooks/useSettings', () => ({
  useSettings: vi.fn().mockReturnValue({
    settings: { language: 'en', currency: 'ILS', themeMode: 'system', maaserPercentagePeriods: [{ percentage: 10, effectiveFrom: '2020-01-01' }] },
    isLoading: false,
    getCurrentMaaserPercentage: () => 10,
    formatCurrency: (v) => `₪${v}`,
  }),
}));

vi.mock('./contexts/SettingsProvider', () => ({
  SettingsProvider: ({ children }) => children,
}));

vi.mock('./contexts/AuthProvider', () => ({
  AuthProvider: ({ children }) => children,
}));

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

vi.mock('./contexts/LanguageProvider', () => ({
  LanguageProvider: ({ children }) => children,
}));

vi.mock('./contexts/useLanguage', () => ({
  useLanguage: () => ({
    t: {
      appName: 'Test',
      dashboard: 'Dashboard',
      addIncome: 'Add Income',
      addDonation: 'Add Donation',
      history: 'History',
      backOnline: 'Back online',
      migrationComplete: 'Done',
      migrationCancelled: 'Cancelled',
    },
    direction: 'ltr',
  }),
}));

vi.mock('./theme', () => ({
  createAppTheme: vi.fn(() => ({})),
}));

// Mock all MUI theming to avoid theme.typography errors
vi.mock('@mui/material', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ThemeProvider: ({ children }) => children,
    CssBaseline: () => null,
  };
});

vi.mock('./hooks/useResolvedTheme', () => ({
  useResolvedTheme: vi.fn(() => 'light'),
}));

// Mock MUI-heavy components to avoid rendering complexity
vi.mock('./components/Dashboard', () => ({ default: () => <div>Dashboard</div> }));
vi.mock('./components/AddIncome', () => ({ default: () => <div>AddIncome</div> }));
vi.mock('./components/AddDonation', () => ({ default: () => <div>AddDonation</div> }));
vi.mock('./components/History', () => ({ default: () => <div>History</div> }));
vi.mock('./components/SettingsPage', () => ({ default: () => <div>Settings</div> }));
vi.mock('./components/SettingsButton', () => ({ default: () => <div>SettingsButton</div> }));
vi.mock('./components/LanguageToggle', () => ({ default: () => <div>LanguageToggle</div> }));
vi.mock('./components/SignInButton', () => ({ default: () => <div>SignIn</div> }));
vi.mock('./components/UserProfile', () => ({ default: () => <div>UserProfile</div> }));
vi.mock('./components/PrivacyPolicy', () => ({ default: () => <div>Privacy</div> }));
vi.mock('./components/ErrorBoundary', () => ({
  IndexedDBUnavailable: () => <div>Error</div>,
  MigrationError: () => <div>MigError</div>,
  LoadingState: () => <div>Loading</div>,
}));
vi.mock('./components/InstallPrompt', () => ({ default: () => null }));
vi.mock('./components/ConnectionStatus', () => ({ default: () => null }));
vi.mock('./components/MigrationPrompt', () => ({ default: () => null }));

vi.mock('./lib/queryClient', () => ({
  queryClient: new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
}));

vi.mock('@emotion/react', () => ({
  CacheProvider: ({ children }) => children,
}));
vi.mock('@emotion/cache', () => ({ default: vi.fn(() => ({})) }));
vi.mock('stylis-plugin-rtl', () => ({ default: vi.fn() }));
vi.mock('stylis', () => ({ prefixer: vi.fn() }));

// ─── Import under test ────────────────────────────────────────────────────────
import App from './App';
import { initializeDefaultPresets } from './services/presetService';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('App — initializeDefaultPresets on mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call initializeDefaultPresets when the app mounts', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(initializeDefaultPresets).toHaveBeenCalledTimes(1);
  });

  it('should call initializeDefaultPresets only once', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(initializeDefaultPresets).toHaveBeenCalledTimes(1);
  });
});
