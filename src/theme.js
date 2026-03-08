import { createTheme } from '@mui/material/styles';

export function createAppTheme(direction, mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    direction,
    palette: {
      mode,
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#9c27b0',
      },
      success: {
        main: '#2e7d32',
      },
      background: isDark
        ? { default: '#121212', paper: '#1e1e1e' }
        : { default: '#f5f5f5', paper: '#ffffff' },
    },
    typography: {
      fontFamily: direction === 'rtl'
        ? '"Assistant", "Rubik", "Arial", sans-serif'
        : '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 600,
      },
      h6: {
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: isDark
              ? '0 2px 8px rgba(0,0,0,0.4)'
              : '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
            borderTop: isDark
              ? '1px solid rgba(255,255,255,0.12)'
              : '1px solid #e0e0e0',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
            },
          },
        },
      },
      MuiFab: {
        styleOverrides: {
          root: {
            boxShadow: isDark
              ? '0 4px 12px rgba(25, 118, 210, 0.5)'
              : '0 4px 12px rgba(25, 118, 210, 0.3)',
          },
        },
      },
    },
  });
}
