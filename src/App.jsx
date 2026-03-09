import { useState, useMemo, useEffect, useCallback, useSyncExternalStore, lazy, Suspense } from 'react';
import {
  ThemeProvider,
  CssBaseline,
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AddCircle,
  VolunteerActivism,
  History as HistoryIcon,
} from '@mui/icons-material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { QueryClientProvider } from '@tanstack/react-query';

import { LanguageProvider } from './contexts/LanguageProvider';
import { useLanguage } from './contexts/useLanguage';
import { SettingsProvider } from './contexts/SettingsProvider';
import { useSettings } from './hooks/useSettings';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { createAppTheme } from './theme';
import { useResolvedTheme } from './hooks/useResolvedTheme';
import Dashboard from './components/Dashboard';
import AddIncome from './components/AddIncome';
import AddDonation from './components/AddDonation';
import History from './components/History';
import SettingsPage from './components/SettingsPage';
import SettingsButton from './components/SettingsButton';
import LanguageToggle from './components/LanguageToggle';
import SignInButton from './components/SignInButton';
import UserProfile from './components/UserProfile';
import PrivacyPolicy from './components/PrivacyPolicy';
import { IndexedDBUnavailable, MigrationError, LoadingState } from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import ConnectionStatus from './components/ConnectionStatus';
import MigrationPrompt from './components/MigrationPrompt';

import { queryClient } from './lib/queryClient';
import { useEntries, useAddEntry, useUpdateEntry, useDeleteEntry } from './hooks/useEntries';
import { isIndexedDBSupported } from './services/db';
import { migrateFromLocalStorage, createLocalStorageBackup } from './services/migration';

// Hash routing via useSyncExternalStore (no setState in useEffect)
function subscribeToHash(callback) {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
}

function getHashSnapshot() {
  return window.location.hash;
}

// Lazy load React Query DevTools only in development
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((mod) => ({
    default: mod.ReactQueryDevtools,
  }))
);

function AppContent() {
  const hash = useSyncExternalStore(subscribeToHash, getHashSnapshot);
  const { direction } = useLanguage();
  const { settings } = useSettings();
  const resolvedMode = useResolvedTheme(settings.themeMode);

  const theme = useMemo(
    () => createAppTheme(direction, resolvedMode),
    [direction, resolvedMode]
  );

  const cacheRtl = useMemo(
    () =>
      createCache({
        key: direction === 'rtl' ? 'muirtl' : 'muiltr',
        stylisPlugins: direction === 'rtl' ? [prefixer, rtlPlugin] : [prefixer],
      }),
    [direction]
  );

  useEffect(() => {
    document.dir = direction;
    document.documentElement.lang = direction === 'rtl' ? 'he' : 'en';
  }, [direction]);

  // Sync resolved theme to DOM data attribute and meta theme-color
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedMode;
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedMode === 'dark' ? '#121212' : '#1976d2'
      );
    }
  }, [resolvedMode]);

  // Render privacy policy when hash matches (no auth required)
  if (hash === '#/privacy') {
    return (
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <PrivacyPolicy />
        </ThemeProvider>
      </CacheProvider>
    );
  }

  return <MainApp theme={theme} cacheRtl={cacheRtl} />;
}

function MainApp({ theme, cacheRtl }) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState(0);
  const [editEntry, setEditEntry] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [migrationState, setMigrationState] = useState('pending'); // 'pending' | 'migrating' | 'done' | 'error'
  const [migrationError, setMigrationError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Check IndexedDB support
  const indexedDBSupported = useMemo(() => isIndexedDBSupported(), []);

  // Snackbar helper
  const showError = useCallback((message) => {
    setSnackbar({ open: true, message, severity: 'error' });
  }, []);

  const showSuccess = useCallback((message) => {
    setSnackbar({ open: true, message, severity: 'success' });
  }, []);

  // React Query hooks
  const { data: entries = [], isLoading } = useEntries();
  const addEntryMutation = useAddEntry();
  const updateEntryMutation = useUpdateEntry();
  const deleteEntryMutation = useDeleteEntry();

  // Run migration on mount
  useEffect(() => {
    if (!indexedDBSupported) {
      return;
    }

    async function runMigration() {
      setMigrationState('migrating');
      try {
        const result = await migrateFromLocalStorage();
        if (result.success) {
          setMigrationState('done');
          if (result.entriesMigrated > 0) {
            showSuccess(`${result.entriesMigrated} entries migrated successfully`);
          }
        } else {
          setMigrationState('error');
          setMigrationError(result.errors?.[0]?.reason || 'Migration failed');
        }
      } catch (err) {
        setMigrationState('error');
        setMigrationError(err.message);
      }
    }

    runMigration();
  }, [indexedDBSupported, showSuccess]);

  const handleAddEntry = useCallback((entry) => {
    const existingEntry = entries.find((e) => e.id === entry.id);
    if (existingEntry) {
      updateEntryMutation.mutate(entry, {
        onSuccess: () => {
          setEditEntry(null);
          setCurrentTab(0);
        },
        onError: (error) => {
          showError(error?.message || 'Failed to update entry');
        },
      });
    } else {
      addEntryMutation.mutate(entry, {
        onSuccess: () => {
          setEditEntry(null);
          setCurrentTab(0);
        },
        onError: (error) => {
          showError(error?.message || 'Failed to add entry');
        },
      });
    }
  }, [entries, updateEntryMutation, addEntryMutation, showError]);

  const handleEditEntry = useCallback((entry) => {
    setEditEntry(entry);
    setCurrentTab(entry.type === 'income' ? 1 : 2);
  }, []);

  const handleDeleteEntry = useCallback((id) => {
    deleteEntryMutation.mutate(id, {
      onError: (error) => {
        showError(error?.message || 'Failed to delete entry');
      },
    });
  }, [deleteEntryMutation, showError]);

  const handleCancelEdit = useCallback(() => {
    setEditEntry(null);
    setCurrentTab(3);
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const handleRetryMigration = useCallback(async () => {
    setMigrationState('migrating');
    setMigrationError(null);
    try {
      const result = await migrateFromLocalStorage();
      if (result.success) {
        setMigrationState('done');
      } else {
        setMigrationState('error');
        setMigrationError(result.errors?.[0]?.reason || 'Migration failed');
      }
    } catch (err) {
      setMigrationState('error');
      setMigrationError(err.message);
    }
  }, []);

  const handleDownloadBackup = useCallback(() => {
    const backup = createLocalStorageBackup();
    if (backup) {
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maaser-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, []);

  // Handle connection status changes
  const handleBackOnline = useCallback(() => {
    showSuccess(t.backOnline || 'Back online');
  }, [showSuccess, t.backOnline]);

  // Settings navigation
  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
    setEditEntry(null);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false);
    setCurrentTab(0);
  }, []);

  // Show IndexedDB unavailable screen
  if (!indexedDBSupported) {
    return <IndexedDBUnavailable t={t} />;
  }

  // Show migration error screen
  if (migrationState === 'error') {
    return (
      <MigrationError
        t={t}
        error={migrationError}
        onRetry={handleRetryMigration}
        onBackup={handleDownloadBackup}
      />
    );
  }

  // Show loading while migrating or loading entries
  if (migrationState === 'migrating') {
    return <LoadingState t={t} />;
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (showSettings) {
      return <SettingsPage onBack={handleCloseSettings} />;
    }

    switch (currentTab) {
      case 0:
        return <Dashboard entries={entries} />;
      case 1:
        return (
          <AddIncome
            onAdd={handleAddEntry}
            editEntry={editEntry?.type === 'income' ? editEntry : null}
            onCancel={handleCancelEdit}
          />
        );
      case 2:
        return (
          <AddDonation
            onAdd={handleAddEntry}
            editEntry={editEntry?.type === 'donation' ? editEntry : null}
            onCancel={handleCancelEdit}
          />
        );
      case 3:
        return (
          <History
            entries={entries}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntry}
          />
        );
      default:
        return <Dashboard entries={entries} />;
    }
  };

  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            bgcolor: 'background.default',
          }}
        >
          <AppBar position="static" elevation={0}>
            <Toolbar>
              <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
                {t.appName}
              </Typography>
              <SettingsButton onClick={handleOpenSettings} />
              {/* Auth UI: Show SignInButton or UserProfile */}
              {isAuthenticated ? <UserProfile /> : <SignInButton />}
              <LanguageToggle />
            </Toolbar>
          </AppBar>

          {/* Offline Status Indicator */}
          <ConnectionStatus onOnline={handleBackOnline} />

          {/* Migration Prompt - auto-triggers when authenticated user has local data */}
          {isAuthenticated && (
            <MigrationPrompt
              autoTrigger={true}
              onComplete={() => {
                // Refresh entries after migration
                queryClient.invalidateQueries({ queryKey: ['entries'] });
                showSuccess(t.migrationComplete || 'Data synced to cloud successfully!');
              }}
              onCancel={() => {
                // Show info message when user cancels migration
                showSuccess(t.migrationCancelled || 'Migration cancelled. Data remains local.');
              }}
            />
          )}

          <Container
            maxWidth="sm"
            sx={{
              flexGrow: 1,
              py: 2,
              pb: 10,
            }}
          >
            {renderContent()}
          </Container>

          <Paper
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
            }}
            elevation={3}
          >
            <BottomNavigation
              value={showSettings ? -1 : currentTab}
              onChange={(_, newValue) => {
                setEditEntry(null);
                setShowSettings(false);
                setCurrentTab(newValue);
              }}
              showLabels
            >
              <BottomNavigationAction
                label={t.dashboard}
                icon={<DashboardIcon />}
              />
              <BottomNavigationAction
                label={t.addIncome}
                icon={<AddCircle />}
              />
              <BottomNavigationAction
                label={t.addDonation}
                icon={<VolunteerActivism />}
              />
              <BottomNavigationAction
                label={t.history}
                icon={<HistoryIcon />}
              />
            </BottomNavigation>
          </Paper>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ mb: 8 }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* PWA Install Prompt - shows after user engagement */}
        {/* Wrapped in conditional to prevent crashes if browser APIs are unavailable */}
        {typeof window !== 'undefined' && <InstallPrompt hasUserEngaged={entries.length > 0} />}
      </ThemeProvider>
    </CacheProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SettingsProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </SettingsProvider>
      </LanguageProvider>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
