/**
 * Tests for Network Monitoring Service
 *
 * These tests verify all network monitoring operations including:
 * - Connection status detection (online/offline)
 * - Connection type detection (WiFi, cellular, offline, unknown)
 * - Bandwidth estimation
 * - Retry logic with exponential backoff
 * - Error classification (network, quota, auth, unknown)
 * - Event listeners (connection change, network quality change)
 * - WiFi recommendation logic
 * - Edge cases and browser compatibility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  isOnline,
  getConnectionType,
  estimateBandwidth,
  shouldRecommendWiFi,
  retryWithBackoff,
  classifyError,
  onConnectionChange,
  onNetworkQualityChange,
  getLargeDatasetThreshold,
  getQuotaWaitTime,
  NetworkErrorTypes,
  ConnectionTypes,
  _clearListeners,
} from './networkMonitor';

// Helper to mock navigator.onLine
function mockNavigatorOnline(value) {
  Object.defineProperty(navigator, 'onLine', {
    value: value,
    writable: true,
    configurable: true,
  });
}

// Helper to mock navigator.connection
function mockNavigatorConnection(connectionObj) {
  Object.defineProperty(navigator, 'connection', {
    value: connectionObj,
    writable: true,
    configurable: true,
  });
}

// Helper to clear navigator.connection
function clearNavigatorConnection() {
  Object.defineProperty(navigator, 'connection', {
    value: undefined,
    writable: true,
    configurable: true,
  });
}

describe('Network Monitor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset listeners
    _clearListeners();
    // Default to online
    mockNavigatorOnline(true);
    clearNavigatorConnection();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
    _clearListeners();
  });

  describe('NetworkErrorTypes', () => {
    it('should export correct error types', () => {
      expect(NetworkErrorTypes.NETWORK).toBe('network');
      expect(NetworkErrorTypes.QUOTA).toBe('quota');
      expect(NetworkErrorTypes.AUTH).toBe('auth');
      expect(NetworkErrorTypes.UNKNOWN).toBe('unknown');
    });
  });

  describe('ConnectionTypes', () => {
    it('should export correct connection types', () => {
      expect(ConnectionTypes.WIFI).toBe('wifi');
      expect(ConnectionTypes.CELLULAR).toBe('cellular');
      expect(ConnectionTypes.OFFLINE).toBe('offline');
      expect(ConnectionTypes.UNKNOWN).toBe('unknown');
    });
  });

  describe('isOnline', () => {
    it('should return true when navigator.onLine is true', () => {
      mockNavigatorOnline(true);
      expect(isOnline()).toBe(true);
    });

    it('should return false when navigator.onLine is false', () => {
      mockNavigatorOnline(false);
      expect(isOnline()).toBe(false);
    });

    it('should return true when navigator.onLine is undefined', () => {
      mockNavigatorOnline(undefined);
      expect(isOnline()).toBe(true);
    });

    it('should return true when navigator.onLine is null', () => {
      mockNavigatorOnline(null);
      expect(isOnline()).toBe(true);
    });
  });

  describe('getConnectionType', () => {
    it('should return offline when not online', () => {
      mockNavigatorOnline(false);
      expect(getConnectionType()).toBe(ConnectionTypes.OFFLINE);
    });

    it('should return unknown when Network Information API is not available', () => {
      mockNavigatorOnline(true);
      clearNavigatorConnection();
      expect(getConnectionType()).toBe(ConnectionTypes.UNKNOWN);
    });

    it('should return wifi when connection type is wifi', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'wifi', effectiveType: '4g' });
      expect(getConnectionType()).toBe(ConnectionTypes.WIFI);
    });

    it('should return wifi when connection type is ethernet', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'ethernet', effectiveType: '4g' });
      expect(getConnectionType()).toBe(ConnectionTypes.WIFI);
    });

    it('should return cellular when connection type is cellular', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'cellular', effectiveType: '4g' });
      expect(getConnectionType()).toBe(ConnectionTypes.CELLULAR);
    });

    it('should return cellular when effective type is 2g', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'unknown', effectiveType: '2g' });
      expect(getConnectionType()).toBe(ConnectionTypes.CELLULAR);
    });

    it('should return cellular when effective type is 3g', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'unknown', effectiveType: '3g' });
      expect(getConnectionType()).toBe(ConnectionTypes.CELLULAR);
    });

    it('should return cellular when effective type is 4g', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'unknown', effectiveType: '4g' });
      expect(getConnectionType()).toBe(ConnectionTypes.CELLULAR);
    });

    it('should return unknown for unrecognized connection type', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'bluetooth', effectiveType: 'unknown' });
      expect(getConnectionType()).toBe(ConnectionTypes.UNKNOWN);
    });
  });

  describe('estimateBandwidth', () => {
    it('should return null when Network Information API is not available', () => {
      clearNavigatorConnection();
      expect(estimateBandwidth()).toBeNull();
    });

    it('should return downlink value when available', () => {
      mockNavigatorConnection({ downlink: 10.5 });
      expect(estimateBandwidth()).toBe(10.5);
    });

    it('should return estimate for slow-2g', () => {
      mockNavigatorConnection({ effectiveType: 'slow-2g' });
      expect(estimateBandwidth()).toBe(0.05);
    });

    it('should return estimate for 2g', () => {
      mockNavigatorConnection({ effectiveType: '2g' });
      expect(estimateBandwidth()).toBe(0.15);
    });

    it('should return estimate for 3g', () => {
      mockNavigatorConnection({ effectiveType: '3g' });
      expect(estimateBandwidth()).toBe(1.5);
    });

    it('should return estimate for 4g', () => {
      mockNavigatorConnection({ effectiveType: '4g' });
      expect(estimateBandwidth()).toBe(10);
    });

    it('should return null for unknown effective type', () => {
      mockNavigatorConnection({ effectiveType: '5g' });
      expect(estimateBandwidth()).toBeNull();
    });

    it('should prefer downlink over effectiveType estimate', () => {
      mockNavigatorConnection({ downlink: 25, effectiveType: '3g' });
      expect(estimateBandwidth()).toBe(25);
    });
  });

  describe('shouldRecommendWiFi', () => {
    it('should return false for invalid entry count (negative)', () => {
      expect(shouldRecommendWiFi(-1)).toBe(false);
    });

    it('should return false for invalid entry count (string)', () => {
      expect(shouldRecommendWiFi('100')).toBe(false);
    });

    it('should return false for invalid entry count (null)', () => {
      expect(shouldRecommendWiFi(null)).toBe(false);
    });

    it('should return false for invalid entry count (undefined)', () => {
      expect(shouldRecommendWiFi(undefined)).toBe(false);
    });

    it('should return false on WiFi regardless of entry count', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'wifi' });
      expect(shouldRecommendWiFi(1000)).toBe(false);
    });

    it('should return false on cellular with small dataset (< threshold)', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'cellular' });
      expect(shouldRecommendWiFi(100)).toBe(false);
    });

    it('should return true on cellular with large dataset (> threshold)', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'cellular' });
      expect(shouldRecommendWiFi(300)).toBe(true);
    });

    it('should return false on cellular at exact threshold', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'cellular' });
      expect(shouldRecommendWiFi(250)).toBe(false);
    });

    it('should return true on cellular just above threshold', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'cellular' });
      expect(shouldRecommendWiFi(251)).toBe(true);
    });

    it('should return true on low bandwidth with large dataset', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'unknown', downlink: 0.5 });
      expect(shouldRecommendWiFi(300)).toBe(true);
    });

    it('should return false on low bandwidth with small dataset', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'unknown', downlink: 0.5 });
      expect(shouldRecommendWiFi(100)).toBe(false);
    });

    it('should return false when offline', () => {
      mockNavigatorOnline(false);
      expect(shouldRecommendWiFi(1000)).toBe(false);
    });
  });

  describe('classifyError', () => {
    it('should return unknown with retryable for null error', () => {
      const result = classifyError(null);
      expect(result.type).toBe(NetworkErrorTypes.UNKNOWN);
      expect(result.retryable).toBe(true);
      expect(result.waitTime).toBe(0);
    });

    it('should return unknown with retryable for undefined error', () => {
      const result = classifyError(undefined);
      expect(result.type).toBe(NetworkErrorTypes.UNKNOWN);
      expect(result.retryable).toBe(true);
    });

    describe('Network errors (retryable)', () => {
      it('should classify error with code containing "network"', () => {
        const error = new Error('Failed');
        error.code = 'network-error';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
        expect(result.waitTime).toBe(0);
      });

      it('should classify error with code "unavailable"', () => {
        const error = new Error('Service unavailable');
        error.code = 'unavailable';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
      });

      it('should classify error with code "ECONNREFUSED"', () => {
        const error = new Error('Connection refused');
        error.code = 'ECONNREFUSED';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
      });

      it('should classify error with code "ETIMEDOUT"', () => {
        const error = new Error('Timed out');
        error.code = 'ETIMEDOUT';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
      });

      it('should classify error with message containing "network"', () => {
        const error = new Error('Network request failed');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
      });

      it('should classify error with message containing "offline"', () => {
        const error = new Error('You appear to be offline');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
      });

      it('should classify error with message containing "connection"', () => {
        const error = new Error('Lost connection to server');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
      });

      it('should classify error with message containing "timeout"', () => {
        const error = new Error('Request timeout');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
      });

      it('should classify error with message "failed to fetch"', () => {
        const error = new Error('Failed to fetch');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.NETWORK);
        expect(result.retryable).toBe(true);
      });
    });

    describe('Quota errors (not retryable, wait 1 hour)', () => {
      it('should classify error with code containing "quota"', () => {
        const error = new Error('Quota exceeded');
        error.code = 'quota-exceeded';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.QUOTA);
        expect(result.retryable).toBe(false);
        expect(result.waitTime).toBe(3600000); // 1 hour
      });

      it('should classify error with code "resource-exhausted"', () => {
        const error = new Error('Resource exhausted');
        error.code = 'resource-exhausted';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.QUOTA);
        expect(result.retryable).toBe(false);
        expect(result.waitTime).toBe(3600000);
      });

      it('should classify error with message containing "quota"', () => {
        const error = new Error('Daily quota has been exceeded');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.QUOTA);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with message containing "rate limit"', () => {
        const error = new Error('Rate limit exceeded');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.QUOTA);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with message containing "too many requests"', () => {
        const error = new Error('Too many requests');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.QUOTA);
        expect(result.retryable).toBe(false);
      });
    });

    describe('Auth errors (not retryable, need re-auth)', () => {
      it('should classify error with code containing "auth"', () => {
        const error = new Error('Not authenticated');
        error.code = 'auth/invalid-credential';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
        expect(result.waitTime).toBe(0);
      });

      it('should classify error with code containing "permission"', () => {
        const error = new Error('Permission denied');
        error.code = 'permission-denied';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with code "unauthenticated"', () => {
        const error = new Error('Unauthenticated');
        error.code = 'unauthenticated';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with code "unauthorized"', () => {
        const error = new Error('Unauthorized');
        error.code = 'unauthorized';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with message containing "auth"', () => {
        const error = new Error('Authentication required');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with message containing "permission"', () => {
        const error = new Error('You do not have permission');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with message containing "unauthorized"', () => {
        const error = new Error('Unauthorized access');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with message containing "forbidden"', () => {
        const error = new Error('Access forbidden');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
      });

      it('should classify error with message "not authenticated"', () => {
        const error = new Error('User is not authenticated');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.AUTH);
        expect(result.retryable).toBe(false);
      });
    });

    describe('Unknown errors (retryable once)', () => {
      it('should classify unrecognized error as unknown with retryable', () => {
        const error = new Error('Something went wrong');
        error.code = 'weird-error';
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.UNKNOWN);
        expect(result.retryable).toBe(true);
        expect(result.waitTime).toBe(0);
      });

      it('should classify error with no code as unknown', () => {
        const error = new Error('Generic error');
        const result = classifyError(error);
        expect(result.type).toBe(NetworkErrorTypes.UNKNOWN);
        expect(result.retryable).toBe(true);
      });
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt without retry', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error and succeed on second attempt', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const operation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      const resultPromise = retryWithBackoff(operation, { baseDelay: 100 });

      // Fast forward through the backoff delay
      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times before succeeding', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const operation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      const resultPromise = retryWithBackoff(operation, { maxRetries: 3, baseDelay: 100 });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries are exhausted', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const operation = vi.fn().mockRejectedValue(networkError);

      let caughtError;
      const resultPromise = retryWithBackoff(operation, { maxRetries: 2, baseDelay: 100 })
        .catch(err => { caughtError = err; });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeDefined();
      expect(caughtError.code).toBe('MAX_RETRIES_EXCEEDED');

      // Initial + 2 retries = 3 calls
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors (auth)', async () => {
      const authError = new Error('Not authenticated');
      authError.code = 'unauthenticated';

      const operation = vi.fn().mockRejectedValue(authError);

      await expect(retryWithBackoff(operation)).rejects.toMatchObject({
        code: 'unauthenticated',
      });

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should not retry on quota errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.code = 'quota-exceeded';

      const operation = vi.fn().mockRejectedValue(quotaError);

      await expect(retryWithBackoff(operation)).rejects.toMatchObject({
        code: 'quota-exceeded',
      });

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback before each retry', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const onRetry = vi.fn();
      const operation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      const resultPromise = retryWithBackoff(operation, {
        maxRetries: 3,
        baseDelay: 100,
        onRetry,
      });

      await vi.runAllTimersAsync();

      await resultPromise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(0, networkError, expect.any(Number));
    });

    it('should continue even if onRetry callback throws', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const onRetry = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const operation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      const resultPromise = retryWithBackoff(operation, {
        maxRetries: 3,
        baseDelay: 100,
        onRetry,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe('success');
    });

    it('should throw on cancellation via AbortSignal', async () => {
      const controller = new AbortController();
      controller.abort();

      const operation = vi.fn().mockResolvedValue('success');

      await expect(retryWithBackoff(operation, { signal: controller.signal }))
        .rejects.toMatchObject({
          code: 'CANCELLED',
        });

      expect(operation).not.toHaveBeenCalled();
    });

    it('should respect custom maxRetries option', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const operation = vi.fn().mockRejectedValue(networkError);

      let caughtError;
      const resultPromise = retryWithBackoff(operation, { maxRetries: 5, baseDelay: 100 })
        .catch(err => { caughtError = err; });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeDefined();
      expect(caughtError.code).toBe('MAX_RETRIES_EXCEEDED');

      // Initial + 5 retries = 6 calls
      expect(operation).toHaveBeenCalledTimes(6);
    });

    it('should use exponential backoff delays (2^attempt * baseDelay)', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const operation = vi.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce('success');

      // Don't use real timers, track setTimeout calls
      const timeoutSpy = vi.spyOn(global, 'setTimeout');

      const resultPromise = retryWithBackoff(operation, { maxRetries: 3, baseDelay: 1000 });

      await vi.runAllTimersAsync();
      await resultPromise;

      // Check that delays are exponential
      // First retry: 2^0 * 1000 = 1000ms
      // Second retry: 2^1 * 1000 = 2000ms
      // Third retry: 2^2 * 1000 = 4000ms
      const timeoutCalls = timeoutSpy.mock.calls.map(call => call[1]);
      expect(timeoutCalls).toContain(1000);
      expect(timeoutCalls).toContain(2000);
      expect(timeoutCalls).toContain(4000);

      timeoutSpy.mockRestore();
    });

    it('should include original error in exhausted error', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const operation = vi.fn().mockRejectedValue(networkError);

      let caughtError;
      const resultPromise = retryWithBackoff(operation, { maxRetries: 1, baseDelay: 100 })
        .catch(err => { caughtError = err; });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeDefined();
      expect(caughtError.originalError).toBe(networkError);
    });

    it('should default to 3 max retries', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const operation = vi.fn().mockRejectedValue(networkError);

      let caughtError;
      const resultPromise = retryWithBackoff(operation, { baseDelay: 100 })
        .catch(err => { caughtError = err; });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeDefined();

      // Default: initial + 3 retries = 4 calls
      expect(operation).toHaveBeenCalledTimes(4);
    });
  });

  describe('onConnectionChange', () => {
    it('should register callback and return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = onConnectionChange(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should throw if callback is not a function', () => {
      expect(() => onConnectionChange(null)).toThrow('onConnectionChange requires a callback function');
      expect(() => onConnectionChange('not a function')).toThrow();
      expect(() => onConnectionChange(123)).toThrow();
    });

    it('should call callback when going offline', () => {
      const callback = vi.fn();
      onConnectionChange(callback);

      // Simulate offline event
      window.dispatchEvent(new Event('offline'));

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should call callback when going online', () => {
      const callback = vi.fn();
      onConnectionChange(callback);

      // Simulate online event
      window.dispatchEvent(new Event('online'));

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should unsubscribe callback when unsubscribe is called', () => {
      const callback = vi.fn();
      const unsubscribe = onConnectionChange(callback);

      // Unsubscribe
      unsubscribe();

      // Simulate events - callback should not be called
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      onConnectionChange(callback1);
      onConnectionChange(callback2);

      window.dispatchEvent(new Event('offline'));

      expect(callback1).toHaveBeenCalledWith(false);
      expect(callback2).toHaveBeenCalledWith(false);
    });

    it('should not fail if callback throws', () => {
      const badCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      const goodCallback = vi.fn();

      onConnectionChange(badCallback);
      onConnectionChange(goodCallback);

      // Should not throw
      expect(() => {
        window.dispatchEvent(new Event('offline'));
      }).not.toThrow();

      // Good callback should still be called
      expect(goodCallback).toHaveBeenCalledWith(false);
    });
  });

  describe('onNetworkQualityChange', () => {
    it('should register callback and return unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = onNetworkQualityChange(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should throw if callback is not a function', () => {
      expect(() => onNetworkQualityChange(null)).toThrow('onNetworkQualityChange requires a callback function');
      expect(() => onNetworkQualityChange('not a function')).toThrow();
    });

    it('should unsubscribe callback when unsubscribe is called', () => {
      const callback = vi.fn();
      const unsubscribe = onNetworkQualityChange(callback);

      unsubscribe();

      // Callback should not be in the listeners anymore
      // We can't easily test this without exposing internal state
      // But we can verify unsubscribe doesn't throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('getLargeDatasetThreshold', () => {
    it('should return 250', () => {
      expect(getLargeDatasetThreshold()).toBe(250);
    });
  });

  describe('getQuotaWaitTime', () => {
    it('should return 1 hour in milliseconds', () => {
      expect(getQuotaWaitTime()).toBe(3600000);
    });
  });

  describe('_clearListeners (internal)', () => {
    it('should clear all registered listeners', () => {
      const connectionCallback = vi.fn();
      const qualityCallback = vi.fn();

      onConnectionChange(connectionCallback);
      onNetworkQualityChange(qualityCallback);

      _clearListeners();

      // After clearing, events should not trigger callbacks
      window.dispatchEvent(new Event('offline'));

      expect(connectionCallback).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle rapid online/offline transitions', () => {
      const callback = vi.fn();
      onConnectionChange(callback);

      // Rapid transitions
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('offline'));
      window.dispatchEvent(new Event('online'));

      expect(callback).toHaveBeenCalledTimes(4);
    });

    it('should handle error with empty message', () => {
      const error = new Error('');
      error.code = 'network-error';

      const result = classifyError(error);
      expect(result.type).toBe(NetworkErrorTypes.NETWORK);
    });

    it('should handle error with undefined message', () => {
      const error = { code: 'network-error' };

      const result = classifyError(error);
      expect(result.type).toBe(NetworkErrorTypes.NETWORK);
    });

    it('should handle zero maxRetries', async () => {
      const networkError = new Error('Network failed');
      networkError.code = 'network-error';

      const operation = vi.fn().mockRejectedValue(networkError);

      let caughtError;
      const resultPromise = retryWithBackoff(operation, { maxRetries: 0, baseDelay: 100 })
        .catch(err => { caughtError = err; });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeDefined();

      // With maxRetries=0, should only try once (initial attempt)
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle very large entry counts for WiFi recommendation', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'cellular' });
      expect(shouldRecommendWiFi(1000000)).toBe(true);
    });

    it('should handle zero entry count for WiFi recommendation', () => {
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'cellular' });
      expect(shouldRecommendWiFi(0)).toBe(false);
    });

    it('should handle NaN bandwidth gracefully', () => {
      mockNavigatorConnection({ downlink: NaN });
      expect(estimateBandwidth()).toBeNaN();
    });

    it('should handle zero bandwidth', () => {
      mockNavigatorConnection({ downlink: 0 });
      expect(estimateBandwidth()).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should work in a migration-like scenario with retry', async () => {
      // Simulate migration operation that fails twice then succeeds
      let attempt = 0;
      const migrationOperation = vi.fn().mockImplementation(async () => {
        attempt++;
        if (attempt < 3) {
          const error = new Error('Network unavailable');
          error.code = 'unavailable';
          throw error;
        }
        return { migrated: 100, failed: 0 };
      });

      const onRetry = vi.fn();

      const resultPromise = retryWithBackoff(migrationOperation, {
        maxRetries: 3,
        baseDelay: 100,
        onRetry,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toEqual({ migrated: 100, failed: 0 });
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('should check network before recommending migration', () => {
      // Simulate checking if migration should proceed
      mockNavigatorOnline(true);
      mockNavigatorConnection({ type: 'cellular', downlink: 1 });

      const entryCount = 500;
      const shouldWarnUser = shouldRecommendWiFi(entryCount);

      expect(shouldWarnUser).toBe(true);

      // User decides to proceed anyway
      const connectionType = getConnectionType();
      expect(connectionType).toBe(ConnectionTypes.CELLULAR);
    });

    it('should handle offline detection during migration', async () => {
      // Operation that fails because user is offline
      mockNavigatorOnline(false);

      const operation = vi.fn().mockImplementation(async () => {
        if (!isOnline()) {
          const error = new Error('You appear to be offline');
          throw error;
        }
        return 'success';
      });

      let caughtError;
      const resultPromise = retryWithBackoff(operation, { maxRetries: 2, baseDelay: 100 })
        .catch(err => { caughtError = err; });

      await vi.runAllTimersAsync();
      await resultPromise;

      expect(caughtError).toBeDefined();
      expect(caughtError.code).toBe('MAX_RETRIES_EXCEEDED');
    });
  });

  describe('Case sensitivity', () => {
    it('should handle uppercase error messages', () => {
      const error = new Error('NETWORK ERROR');
      const result = classifyError(error);
      expect(result.type).toBe(NetworkErrorTypes.NETWORK);
    });

    it('should handle mixed case error messages', () => {
      const error = new Error('Auth Required');
      const result = classifyError(error);
      expect(result.type).toBe(NetworkErrorTypes.AUTH);
    });
  });
});
