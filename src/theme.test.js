/**
 * Tests for createAppTheme
 *
 * Verifies that createAppTheme produces correct MUI themes for:
 * - Light mode (default and explicit)
 * - Dark mode
 * - Direction (LTR/RTL)
 * - Component overrides (card shadows, bottom nav, fab)
 * - Backward compatibility (single-argument call)
 */

import { describe, it, expect } from 'vitest';
import { createAppTheme } from './theme';

describe('createAppTheme', () => {
  describe('backward compatibility', () => {
    it('should default to light mode when mode is not provided', () => {
      const theme = createAppTheme('ltr');

      expect(theme.palette.mode).toBe('light');
      expect(theme.palette.background.default).toBe('#f5f5f5');
      expect(theme.palette.background.paper).toBe('#ffffff');
    });

    it('should produce the same result as explicit light mode', () => {
      const defaultTheme = createAppTheme('ltr');
      const lightTheme = createAppTheme('ltr', 'light');

      expect(defaultTheme.palette.mode).toBe(lightTheme.palette.mode);
      expect(defaultTheme.palette.background.default).toBe(lightTheme.palette.background.default);
      expect(defaultTheme.palette.background.paper).toBe(lightTheme.palette.background.paper);
    });
  });

  describe('light mode', () => {
    it('should set palette mode to light', () => {
      const theme = createAppTheme('ltr', 'light');

      expect(theme.palette.mode).toBe('light');
    });

    it('should use light background colors', () => {
      const theme = createAppTheme('ltr', 'light');

      expect(theme.palette.background.default).toBe('#f5f5f5');
      expect(theme.palette.background.paper).toBe('#ffffff');
    });

    it('should use light card shadow', () => {
      const theme = createAppTheme('ltr', 'light');
      const cardRoot = theme.components.MuiCard.styleOverrides.root;

      expect(cardRoot.boxShadow).toBe('0 2px 8px rgba(0,0,0,0.1)');
    });

    it('should use light bottom navigation styles', () => {
      const theme = createAppTheme('ltr', 'light');
      const navRoot = theme.components.MuiBottomNavigation.styleOverrides.root;

      expect(navRoot.backgroundColor).toBe('#ffffff');
      expect(navRoot.borderTop).toBe('1px solid #e0e0e0');
    });

    it('should use light fab shadow', () => {
      const theme = createAppTheme('ltr', 'light');
      const fabRoot = theme.components.MuiFab.styleOverrides.root;

      expect(fabRoot.boxShadow).toBe('0 4px 12px rgba(25, 118, 210, 0.3)');
    });
  });

  describe('dark mode', () => {
    it('should set palette mode to dark', () => {
      const theme = createAppTheme('ltr', 'dark');

      expect(theme.palette.mode).toBe('dark');
    });

    it('should use dark background colors', () => {
      const theme = createAppTheme('ltr', 'dark');

      expect(theme.palette.background.default).toBe('#121212');
      expect(theme.palette.background.paper).toBe('#1e1e1e');
    });

    it('should use darker card shadow for dark backgrounds', () => {
      const theme = createAppTheme('ltr', 'dark');
      const cardRoot = theme.components.MuiCard.styleOverrides.root;

      expect(cardRoot.boxShadow).toBe('0 2px 8px rgba(0,0,0,0.4)');
    });

    it('should use dark bottom navigation styles', () => {
      const theme = createAppTheme('ltr', 'dark');
      const navRoot = theme.components.MuiBottomNavigation.styleOverrides.root;

      expect(navRoot.backgroundColor).toBe('#1e1e1e');
      expect(navRoot.borderTop).toBe('1px solid rgba(255,255,255,0.12)');
    });

    it('should use brighter fab shadow for dark backgrounds', () => {
      const theme = createAppTheme('ltr', 'dark');
      const fabRoot = theme.components.MuiFab.styleOverrides.root;

      expect(fabRoot.boxShadow).toBe('0 4px 12px rgba(25, 118, 210, 0.5)');
    });
  });

  describe('shared properties', () => {
    it('should preserve primary colors in both modes', () => {
      const lightTheme = createAppTheme('ltr', 'light');
      const darkTheme = createAppTheme('ltr', 'dark');

      expect(lightTheme.palette.primary.main).toBe('#1976d2');
      expect(darkTheme.palette.primary.main).toBe('#1976d2');
    });

    it('should preserve secondary color in both modes', () => {
      const lightTheme = createAppTheme('ltr', 'light');
      const darkTheme = createAppTheme('ltr', 'dark');

      expect(lightTheme.palette.secondary.main).toBe('#9c27b0');
      expect(darkTheme.palette.secondary.main).toBe('#9c27b0');
    });

    it('should preserve success color in both modes', () => {
      const lightTheme = createAppTheme('ltr', 'light');
      const darkTheme = createAppTheme('ltr', 'dark');

      expect(lightTheme.palette.success.main).toBe('#2e7d32');
      expect(darkTheme.palette.success.main).toBe('#2e7d32');
    });

    it('should preserve shape.borderRadius in both modes', () => {
      const lightTheme = createAppTheme('ltr', 'light');
      const darkTheme = createAppTheme('ltr', 'dark');

      expect(lightTheme.shape.borderRadius).toBe(12);
      expect(darkTheme.shape.borderRadius).toBe(12);
    });

    it('should preserve button overrides in both modes', () => {
      const lightTheme = createAppTheme('ltr', 'light');
      const darkTheme = createAppTheme('ltr', 'dark');

      const lightBtn = lightTheme.components.MuiButton.styleOverrides.root;
      const darkBtn = darkTheme.components.MuiButton.styleOverrides.root;

      expect(lightBtn.textTransform).toBe('none');
      expect(darkBtn.textTransform).toBe('none');
      expect(lightBtn.fontWeight).toBe(500);
      expect(darkBtn.fontWeight).toBe(500);
      expect(lightBtn.borderRadius).toBe(8);
      expect(darkBtn.borderRadius).toBe(8);
    });

    it('should preserve text field overrides in both modes', () => {
      const lightTheme = createAppTheme('ltr', 'light');
      const darkTheme = createAppTheme('ltr', 'dark');

      const lightTf = lightTheme.components.MuiTextField.styleOverrides.root;
      const darkTf = darkTheme.components.MuiTextField.styleOverrides.root;

      expect(lightTf['& .MuiOutlinedInput-root'].borderRadius).toBe(8);
      expect(darkTf['& .MuiOutlinedInput-root'].borderRadius).toBe(8);
    });
  });

  describe('direction', () => {
    it('should set LTR direction', () => {
      const theme = createAppTheme('ltr', 'light');

      expect(theme.direction).toBe('ltr');
    });

    it('should set RTL direction', () => {
      const theme = createAppTheme('rtl', 'dark');

      expect(theme.direction).toBe('rtl');
    });

    it('should use RTL font family for RTL direction', () => {
      const theme = createAppTheme('rtl', 'light');

      expect(theme.typography.fontFamily).toContain('Assistant');
      expect(theme.typography.fontFamily).toContain('Rubik');
    });

    it('should use LTR font family for LTR direction', () => {
      const theme = createAppTheme('ltr', 'light');

      expect(theme.typography.fontFamily).toContain('Roboto');
      expect(theme.typography.fontFamily).toContain('Helvetica');
    });

    it('should use correct font family regardless of mode', () => {
      const rtlLight = createAppTheme('rtl', 'light');
      const rtlDark = createAppTheme('rtl', 'dark');

      expect(rtlLight.typography.fontFamily).toBe(rtlDark.typography.fontFamily);
    });
  });
});
