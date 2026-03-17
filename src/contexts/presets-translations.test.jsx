/**
 * Tests: Preset Translations
 *
 * Verifies that the `presets` translation namespace is present
 * in both `he` and `en` locales inside LanguageProvider.
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageProvider';
import { useLanguage } from '../contexts/useLanguage';

function makeWrapper(lang) {
  // Override localStorage so LanguageProvider picks up the target language
  localStorage.setItem('maaser-tracker-language', lang);

  return function Wrapper({ children }) {
    return <LanguageProvider>{children}</LanguageProvider>;
  };
}

describe('Preset translations', () => {
  describe('English (en)', () => {
    it('should have presets namespace in en translations', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets).toBeDefined();
    });

    it('should have managePresetsTitle in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.managePresetsTitle).toBe('Manage Presets');
    });

    it('should have addPresetPlaceholder in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.addPresetPlaceholder).toBeDefined();
    });

    it('should have resetDefaults in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.resetDefaults).toBeDefined();
    });

    it('should have confirmDeleteMessage in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.confirmDeleteMessage).toBeDefined();
    });

    it('should have confirmResetMessage in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.confirmResetMessage).toBeDefined();
    });

    it('should have emptyState in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.emptyState).toBeDefined();
    });

    it('should have defaultBadge in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.defaultBadge).toBeDefined();
    });

    it('should have cancelButton in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.cancelButton).toBeDefined();
    });

    it('should have confirmButton in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.confirmButton).toBeDefined();
    });

    it('should have closeButton in en', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('en') });
      expect(result.current.t.presets.closeButton).toBeDefined();
    });
  });

  describe('Hebrew (he)', () => {
    it('should have presets namespace in he translations', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('he') });
      expect(result.current.t.presets).toBeDefined();
    });

    it('should have managePresetsTitle in he', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('he') });
      expect(result.current.t.presets.managePresetsTitle).toBe('ניהול תבניות');
    });

    it('should have resetDefaults in he', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('he') });
      expect(result.current.t.presets.resetDefaults).toBeDefined();
    });

    it('should have confirmDeleteMessage in he', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('he') });
      expect(result.current.t.presets.confirmDeleteMessage).toBeDefined();
    });

    it('should have emptyState in he', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('he') });
      expect(result.current.t.presets.emptyState).toBeDefined();
    });

    it('should have cancelButton in he', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('he') });
      expect(result.current.t.presets.cancelButton).toBeDefined();
    });

    it('should have confirmButton in he', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('he') });
      expect(result.current.t.presets.confirmButton).toBeDefined();
    });

    it('should have closeButton in he', () => {
      const { result } = renderHook(() => useLanguage(), { wrapper: makeWrapper('he') });
      expect(result.current.t.presets.closeButton).toBeDefined();
    });
  });
});
