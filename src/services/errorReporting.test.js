import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  reportError,
  getErrors,
  clearErrors,
  initErrorReporting,
  _resetForTesting,
  _reportErrorForTesting,
  _getErrorsForTesting,
  _clearErrorsForTesting,
  _initErrorReportingForTesting,
} from './errorReporting';

describe('errorReporting service', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    // Clean up any global handlers
    window.onerror = null;
    _resetForTesting();
  });

  describe('in dev mode (default in tests)', () => {
    it('reportError is a no-op', () => {
      reportError(new Error('test'));
      // getErrors also returns [] in dev mode, so use the test helper
      const errors = _getErrorsForTesting();
      expect(errors).toHaveLength(0);
    });

    it('getErrors returns empty array', () => {
      expect(getErrors()).toEqual([]);
    });

    it('clearErrors is a no-op', () => {
      // Should not throw
      clearErrors();
    });

    it('initErrorReporting is a no-op', () => {
      initErrorReporting();
      // window.onerror should not be set
      expect(window.onerror).toBeNull();
    });
  });

  describe('ring buffer (via test helpers)', () => {
    it('stores errors correctly', () => {
      _reportErrorForTesting(new Error('error 1'));
      _reportErrorForTesting(new Error('error 2'));

      const errors = _getErrorsForTesting();
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe('error 1');
      expect(errors[1].message).toBe('error 2');
    });

    it('stores error entry with correct shape', () => {
      _reportErrorForTesting(new Error('shaped error'), 'test-source');

      const errors = _getErrorsForTesting();
      expect(errors).toHaveLength(1);

      const entry = errors[0];
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('message', 'shaped error');
      expect(entry).toHaveProperty('stack');
      expect(entry.stack).toBeDefined();
      expect(entry).toHaveProperty('source', 'test-source');
      expect(entry).toHaveProperty('userAgent');
    });

    it('handles string errors', () => {
      _reportErrorForTesting('string error message');

      const errors = _getErrorsForTesting();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('string error message');
      expect(errors[0].stack).toBeUndefined();
    });

    it('uses default source "manual"', () => {
      _reportErrorForTesting('test');

      const errors = _getErrorsForTesting();
      expect(errors[0].source).toBe('manual');
    });

    it('caps buffer at 50 entries', () => {
      for (let i = 0; i < 60; i++) {
        _reportErrorForTesting(new Error(`error ${i}`));
      }

      const errors = _getErrorsForTesting();
      expect(errors).toHaveLength(50);
      // Should keep the most recent errors (10-59)
      expect(errors[0].message).toBe('error 10');
      expect(errors[49].message).toBe('error 59');
    });

    it('maintains ring buffer correctly at boundary', () => {
      // Fill to exactly 50
      for (let i = 0; i < 50; i++) {
        _reportErrorForTesting(new Error(`error ${i}`));
      }

      const errors = _getErrorsForTesting();
      expect(errors).toHaveLength(50);
      expect(errors[0].message).toBe('error 0');
      expect(errors[49].message).toBe('error 49');
    });

    it('clearErrors works', () => {
      _reportErrorForTesting(new Error('to be cleared'));
      expect(_getErrorsForTesting()).toHaveLength(1);

      _clearErrorsForTesting();
      expect(_getErrorsForTesting()).toHaveLength(0);
    });

    it('getErrors returns a copy (not a reference)', () => {
      _reportErrorForTesting(new Error('test'));

      const errors1 = _getErrorsForTesting();
      const errors2 = _getErrorsForTesting();
      expect(errors1).not.toBe(errors2);
      expect(errors1).toEqual(errors2);
    });
  });

  describe('initErrorReporting (via test helper)', () => {
    it('attaches window.onerror handler', () => {
      expect(window.onerror).toBeNull();

      _initErrorReportingForTesting();

      expect(window.onerror).toBeInstanceOf(Function);
    });

    it('window.onerror reports errors to buffer', () => {
      _initErrorReportingForTesting();

      const error = new Error('global error');
      window.onerror('Error message', 'script.js', 10, 5, error);

      const errors = _getErrorsForTesting();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('global error');
      expect(errors[0].source).toBe('window.onerror');
    });

    it('window.onerror handles missing error object', () => {
      _initErrorReportingForTesting();

      window.onerror('Script error.', '', 0, 0, null);

      const errors = _getErrorsForTesting();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Script error.');
      expect(errors[0].source).toBe('window.onerror');
    });

    it('attaches unhandledrejection handler', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');

      _resetForTesting();
      _initErrorReportingForTesting();

      const calls = addEventSpy.mock.calls.filter(
        ([event]) => event === 'unhandledrejection'
      );
      expect(calls.length).toBeGreaterThanOrEqual(1);

      addEventSpy.mockRestore();
    });

    it('unhandledrejection handler reports errors', () => {
      _initErrorReportingForTesting();

      // Clear buffer right before dispatch to isolate from accumulated handlers
      _clearErrorsForTesting();

      const error = new Error('unhandled promise');
      const event = new Event('unhandledrejection');
      event.reason = error;
      window.dispatchEvent(event);

      const errors = _getErrorsForTesting();
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const lastError = errors[errors.length - 1];
      expect(lastError.message).toBe('unhandled promise');
      expect(lastError.source).toBe('unhandledrejection');
    });

    it('unhandledrejection handler handles string reasons', () => {
      _initErrorReportingForTesting();

      // Clear buffer right before dispatch to isolate from accumulated handlers
      _clearErrorsForTesting();

      const event = new Event('unhandledrejection');
      event.reason = 'some string reason';
      window.dispatchEvent(event);

      const errors = _getErrorsForTesting();
      expect(errors.length).toBeGreaterThanOrEqual(1);
      const lastError = errors[errors.length - 1];
      expect(lastError.message).toBe('some string reason');
    });

    it('only initializes once (idempotent)', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');

      _initErrorReportingForTesting();
      _initErrorReportingForTesting();

      const calls = addEventSpy.mock.calls.filter(
        ([event]) => event === 'unhandledrejection'
      );
      expect(calls).toHaveLength(1);

      addEventSpy.mockRestore();
    });
  });

  describe('_resetForTesting', () => {
    it('clears buffer and resets initialized flag', () => {
      _reportErrorForTesting(new Error('test'));
      _initErrorReportingForTesting();

      _resetForTesting();

      expect(_getErrorsForTesting()).toHaveLength(0);

      // Should be able to initialize again after reset
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      _initErrorReportingForTesting();
      const calls = addEventSpy.mock.calls.filter(
        ([event]) => event === 'unhandledrejection'
      );
      expect(calls.length).toBeGreaterThanOrEqual(1);
      addEventSpy.mockRestore();
    });
  });

  describe('timestamp format', () => {
    it('stores ISO 8601 timestamps', () => {
      _reportErrorForTesting(new Error('test'));

      const errors = _getErrorsForTesting();
      const timestamp = errors[0].timestamp;
      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });
});
