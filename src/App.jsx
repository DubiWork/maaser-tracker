import { useState, useMemo, useEffect } from 'react';
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

import { LanguageProvider } from './contexts/LanguageProvider';
import { useLanguage } from './contexts/useLanguage';
import { createAppTheme } from './theme';
import Dashboard from './components/Dashboard';
import AddIncome from './components/AddIncome';
import AddDonation from './components/AddDonation';
import History from './components/History';
import LanguageToggle from './components/LanguageToggle';

const STORAGE_KEY = 'maaser-tracker-entries';

function loadEntries() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function AppContent() {
  const { t, direction } = useLanguage();
  const [currentTab, setCurrentTab] = useState(0);
  const [entries, setEntries] = useState(loadEntries);
  const [editEntry, setEditEntry] = useState(null);

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

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  const handleAddEntry = (entry) => {
    setEntries((prev) => {
      const existingIndex = prev.findIndex((e) => e.id === entry.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = entry;
        return updated;
      }
      return [...prev, entry];
    });
    setEditEntry(null);
    setCurrentTab(0);
  };

  const handleEditEntry = (entry) => {
    setEditEntry(entry);
    setCurrentTab(entry.type === 'income' ? 1 : 2);
  };

  const handleDeleteEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCancelEdit = () => {
    setEditEntry(null);
    setCurrentTab(3);
  };

  const renderContent = () => {
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
      </ThemeProvider>
    </CacheProvider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
