/**
 * Network Monitoring Service for Ma'aser Tracker
 *
 * This service provides network status detection, retry logic with exponential
 * backoff, and error classification for the migration process.
 *
 * Features:
 * - Connection status detection (online/offline)
 * - Connection type detection (WiFi, cellular, offline, unknown)
 * - Bandwidth estimation (via Network Information API)
 * - Retry logic with exponential backoff
 * - Error classification (network, quota, auth, unknown)
 * - Event emitters for connection changes
 *
 * Browser Compatibility:
 * - navigator.onLine: Supported in all modern browsers
 * - Network Information API: Chrome/Edge only (navigator.connection)
 * - Graceful fallback for unsupported features
 *
 * @module networkMonitor
 */

// Constants
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 2000; // 2 seconds (spec: 2^retry seconds)
const MAX_DELAY_MS = 30000; // Cap at 30 seconds
const LARGE_DATASET_THRESHOLD = 250; // Recommend WiFi for >250 entries on cellular
const QUOTA_WAIT_TIME_MS = 3600000; // 1 hour wait for quota errors

/**
 * Error types returned by classifyError
 * @constant
 */
export const NetworkErrorTypes = {
  NETWORK: 'network',
  QUOTA: 'quota',
  AUTH: 'auth',
  UNKNOWN: 'unknown',
};

/**
 * Connection types
 * @constant
 */
export const ConnectionTypes = {
  WIFI: 'wifi',
  CELLULAR: 'cellular',
  OFFLINE: 'offline',
  UNKNOWN: 'unknown',
};

// Internal state for event listeners
const connectionListeners = new Set();
const networkQualityListeners = new Set();
let isListenerSetup = false;

/**
 * Check if currently online
 * @returns {boolean} True if online, false if offline
 */
export function isOnline() {
  if (typeof navigator === 'undefined') {
    return true; // SSR safety - assume online
  }
  // navigator.onLine can be undefined in some environments
  return navigator.onLine !== false;
}

/**
 * Get the current connection type
 * @returns {string} Connection type: 'wifi', 'cellular', 'offline', or 'unknown'
 */
export function getConnectionType() {
  // Check if offline first
  if (!isOnline()) {
    return ConnectionTypes.OFFLINE;
  }

  // Try Network Information API (Chrome/Edge only)
  if (typeof navigator !== 'undefined' && navigator.connection) {
    const connection = navigator.connection;
    const effectiveType = connection.effectiveType;
    const type = connection.type;

    // Check for WiFi
    if (type === 'wifi' || type === 'ethernet') {
      return ConnectionTypes.WIFI;
    }

    // Check for cellular
    if (type === 'cellular' || ['2g', '3g', '4g'].includes(effectiveType)) {
      return ConnectionTypes.CELLULAR;
    }

    // Has connection info but unknown type
    return ConnectionTypes.UNKNOWN;
  }

  // Network Information API not available
  return ConnectionTypes.UNKNOWN;
}

/**
 * Estimate current bandwidth in Mbps
 * Uses Network Information API when available
 * @returns {number|null} Estimated bandwidth in Mbps, or null if unavailable
 */
export function estimateBandwidth() {
  if (typeof navigator === 'undefined' || !navigator.connection) {
    return null;
  }

  const connection = navigator.connection;

  // downlink is in Mbps
  if (typeof connection.downlink === 'number') {
    return connection.downlink;
  }

  // Fallback: estimate from effectiveType
  const effectiveType = connection.effectiveType;
  const bandwidthEstimates = {
    'slow-2g': 0.05,
    '2g': 0.15,
    '3g': 1.5,
    '4g': 10,
  };

  return bandwidthEstimates[effectiveType] || null;
}

/**
 * Determine if WiFi should be recommended for migration
 * Returns true if on cellular and dataset is large
 * @param {number} entryCount - Number of entries to migrate
 * @returns {boolean} True if WiFi is recommended
 */
export function shouldRecommendWiFi(entryCount) {
  if (typeof entryCount !== 'number' || entryCount < 0) {
    return false;
  }

  const connectionType = getConnectionType();

  // Recommend WiFi if on cellular with large dataset
  if (connectionType === ConnectionTypes.CELLULAR && entryCount > LARGE_DATASET_THRESHOLD) {
    return true;
  }

  // Also recommend if bandwidth is very low (< 1 Mbps) with large dataset
  const bandwidth = estimateBandwidth();
  if (bandwidth !== null && bandwidth < 1 && entryCount > LARGE_DATASET_THRESHOLD) {
    return true;
  }

  return false;
}

/**
 * Calculate exponential backoff delay
 * @param {number} attempt - Current attempt number (0-based)
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
function calculateBackoffDelay(attempt, baseDelay) {
  // 2^attempt * baseDelay (e.g., 2s, 4s, 8s for baseDelay=2000)
  const delay = Math.pow(2, attempt) * baseDelay;
  return Math.min(delay, MAX_DELAY_MS);
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Classify an error to determine retry behavior
 * @param {Error} error - The error to classify
 * @returns {{ type: string, retryable: boolean, waitTime: number }} Classification result
 */
export function classifyError(error) {
  if (!error) {
    return {
      type: NetworkErrorTypes.UNKNOWN,
      retryable: true, // Retry once for safety
      waitTime: 0,
    };
  }

  const code = error.code || '';
  const message = (error.message || '').toLowerCase();

  // Network errors - retryable
  if (
    code.includes('network') ||
    code === 'unavailable' ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('connection') ||
    message.includes('timeout') ||
    message.includes('failed to fetch')
  ) {
    return {
      type: NetworkErrorTypes.NETWORK,
      retryable: true,
      waitTime: 0,
    };
  }

  // Quota errors - not retryable, wait 1 hour
  if (
    code.includes('quota') ||
    code === 'resource-exhausted' ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    return {
      type: NetworkErrorTypes.QUOTA,
      retryable: false,
      waitTime: QUOTA_WAIT_TIME_MS,
    };
  }

  // Auth errors - not retryable, need re-auth
  if (
    code.includes('auth') ||
    code.includes('permission') ||
    code === 'unauthenticated' ||
    code === 'unauthorized' ||
    message.includes('auth') ||
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('not authenticated')
  ) {
    return {
      type: NetworkErrorTypes.AUTH,
      retryable: false,
      waitTime: 0,
    };
  }

  // Unknown errors - retry once
  return {
    type: NetworkErrorTypes.UNKNOWN,
    retryable: true,
    waitTime: 0,
  };
}

/**
 * Retry an operation with exponential backoff
 *
 * @param {Function} operation - Async function to retry
 * @param {Object} [options={}] - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseDelay=2000] - Base delay in ms (actual delay = 2^attempt * baseDelay)
 * @param {AbortSignal} [options.signal] - AbortSignal for cancellation
 * @param {Function} [options.onRetry] - Callback before each retry: (attempt, error, delay) => void
 * @param {boolean} [options.checkNetwork=true] - Check network status before retry
 * @returns {Promise<any>} Result of the operation
 * @throws {Error} If all retries are exhausted or error is not retryable
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3, onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 */
export async function retryWithBackoff(operation, options = {}) {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    baseDelay = DEFAULT_BASE_DELAY_MS,
    signal,
    onRetry,
    checkNetwork = true,
  } = options;

  let lastError = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    // Check for cancellation
    if (signal?.aborted) {
      const abortError = new Error('Operation cancelled');
      abortError.code = 'CANCELLED';
      throw abortError;
    }

    // Check network status before retry (not on first attempt)
    if (checkNetwork && attempt > 0 && !isOnline()) {
      // Wait for online status before retrying
      if (import.meta.env.DEV) {
        console.log('Network Monitor: Waiting for network connection before retry...');
      }
      // Don't wait indefinitely, just check once
    }

    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Classify the error
      const classification = classifyError(error);

      if (import.meta.env.DEV) {
        console.log(`Network Monitor: Attempt ${attempt + 1} failed:`, {
          type: classification.type,
          retryable: classification.retryable,
          message: error.message,
        });
      }

      // If not retryable, throw immediately
      if (!classification.retryable) {
        throw error;
      }

      // If this was the last retry, throw
      if (attempt >= maxRetries) {
        break;
      }

      // Calculate delay
      const delay = calculateBackoffDelay(attempt, baseDelay);

      // Call onRetry callback if provided
      if (typeof onRetry === 'function') {
        try {
          onRetry(attempt, error, delay);
        } catch (callbackError) {
          if (import.meta.env.DEV) {
            console.warn('Network Monitor: onRetry callback error:', callbackError);
          }
        }
      }

      // Wait before retry
      if (import.meta.env.DEV) {
        console.log(`Network Monitor: Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
      }

      await sleep(delay);
      attempt++;
    }
  }

  // All retries exhausted
  const exhaustedError = new Error(`Operation failed after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`);
  exhaustedError.code = 'MAX_RETRIES_EXCEEDED';
  exhaustedError.originalError = lastError;
  throw exhaustedError;
}

/**
 * Setup internal event listeners for connection changes
 * Called automatically when first listener is registered
 */
function setupEventListeners() {
  if (isListenerSetup || typeof window === 'undefined') {
    return;
  }

  const handleOnline = () => {
    connectionListeners.forEach(callback => {
      try {
        callback(true);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Network Monitor: Connection listener error:', error);
        }
      }
    });
  };

  const handleOffline = () => {
    connectionListeners.forEach(callback => {
      try {
        callback(false);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Network Monitor: Connection listener error:', error);
        }
      }
    });
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Setup Network Information API change listener if available
  if (typeof navigator !== 'undefined' && navigator.connection) {
    const handleConnectionChange = () => {
      const newType = getConnectionType();
      networkQualityListeners.forEach(callback => {
        try {
          callback(newType);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('Network Monitor: Network quality listener error:', error);
          }
        }
      });
    };

    navigator.connection.addEventListener('change', handleConnectionChange);
  }

  isListenerSetup = true;
}

/**
 * Register a callback for connection status changes (online/offline)
 * @param {Function} callback - Callback function: (isOnline: boolean) => void
 * @returns {Function} Unsubscribe function
 *
 * @example
 * const unsubscribe = onConnectionChange((isOnline) => {
 *   console.log(isOnline ? 'Back online!' : 'Gone offline');
 * });
 * // Later: unsubscribe();
 */
export function onConnectionChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('onConnectionChange requires a callback function');
  }

  setupEventListeners();
  connectionListeners.add(callback);

  // Return unsubscribe function
  return () => {
    connectionListeners.delete(callback);
  };
}

/**
 * Register a callback for network quality/type changes
 * @param {Function} callback - Callback function: (connectionType: string) => void
 * @returns {Function} Unsubscribe function
 *
 * @example
 * const unsubscribe = onNetworkQualityChange((type) => {
 *   console.log(`Connection type changed to: ${type}`);
 * });
 * // Later: unsubscribe();
 */
export function onNetworkQualityChange(callback) {
  if (typeof callback !== 'function') {
    throw new Error('onNetworkQualityChange requires a callback function');
  }

  setupEventListeners();
  networkQualityListeners.add(callback);

  // Return unsubscribe function
  return () => {
    networkQualityListeners.delete(callback);
  };
}

/**
 * Get the large dataset threshold for WiFi recommendation
 * @returns {number} Entry count threshold
 */
export function getLargeDatasetThreshold() {
  return LARGE_DATASET_THRESHOLD;
}

/**
 * Get the quota wait time in milliseconds
 * @returns {number} Wait time in ms (1 hour)
 */
export function getQuotaWaitTime() {
  return QUOTA_WAIT_TIME_MS;
}

/**
 * Clear all registered listeners (for testing)
 * @internal
 */
export function _clearListeners() {
  connectionListeners.clear();
  networkQualityListeners.clear();
}
