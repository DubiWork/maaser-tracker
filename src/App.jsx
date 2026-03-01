import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
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
import { createAppTheme } from './theme';
import Dashboard from './components/Dashboard';
import AddIncome from './components/AddIncome';
import AddDonation from './components/AddDonation';
import History from './components/History';
import LanguageToggle from './components/LanguageToggle';
import { IndexedDBUnavailable, MigrationError, LoadingState } from './components/ErrorBoundary';

import { queryClient } from './lib/queryClient';
import { useEntries, useAddEntry, useUpdateEntry, useDeleteEntry } from './hooks/useEntries';
import { isIndexedDBSupported } from './services/db';
import { migrateFromLocalStorage, createLocalStorageBackup } from './services/migration';

// Lazy load React Query DevTools only in development
const ReactQueryDevtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((mod) => ({
    default: mod.ReactQueryDevtools,
  }))
);

function AppContent() {
  const { t, direction } = useLanguage();
  const [currentTab, setCurrentTab] = useState(0);
  const [editEntry, setEditEntry] = useState(null);
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

  const theme = useMemo(() => createAppTheme(direction), [direction]);

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
              <LanguageToggle />
            </Toolbar>
          </AppBar>

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
              value={currentTab}
              onChange={(_, newValue) => {
                setEditEntry(null);
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
      </ThemeProvider>
    </CacheProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
}
