/**
 * Error Reporting Service
 *
 * Ring buffer that stores the last 50 errors for diagnostics.
 * Active only in production — all functions are no-ops in dev mode.
 */

const MAX_ERRORS = 50;
let errorBuffer = [];
let initialized = false;

function isDev() {
  // Vite injects import.meta.env.DEV at build time.
  // In test environments we treat it as "dev" unless explicitly overridden.
  try {
    return import.meta.env.DEV;
  } catch {
    return true;
  }
}

/**
 * Add an error to the ring buffer.
 * @param {Error|string} error - The error object or message string
 * @param {string} [source='manual'] - Where the error originated
 */
export function reportError(error, source = 'manual') {
  if (isDev()) return;

  const entry = {
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    source,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };

  errorBuffer.push(entry);

  // Ring buffer: keep only the last MAX_ERRORS entries
  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer = errorBuffer.slice(errorBuffer.length - MAX_ERRORS);
  }
}

/**
 * Return a copy of the current error buffer.
 * @returns {Array} Array of error entries
 */
export function getErrors() {
  if (isDev()) return [];
  return [...errorBuffer];
}

/**
 * Clear the error buffer.
 */
export function clearErrors() {
  if (isDev()) return;
  errorBuffer = [];
}

/**
 * Attach global error handlers (window.onerror, unhandledrejection).
 * Safe to call multiple times — only initializes once.
 */
export function initErrorReporting() {
  if (isDev()) return;
  if (initialized) return;
  initialized = true;

  window.onerror = (message, _source, _lineno, _colno, error) => {
    reportError(error || message, 'window.onerror');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportError(reason instanceof Error ? reason : String(reason), 'unhandledrejection');
  });
}

// --- Test-only helpers (not part of the public API) ---

/**
 * Reset internal state for testing.
 * Only exported for unit tests — never call in production code.
 */
export function _resetForTesting() {
  errorBuffer = [];
  initialized = false;
}

/**
 * Direct access to add an error regardless of DEV mode.
 * Only exported for unit tests — never call in production code.
 */
export function _reportErrorForTesting(error, source = 'manual') {
  const entry = {
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    source,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };

  errorBuffer.push(entry);

  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer = errorBuffer.slice(errorBuffer.length - MAX_ERRORS);
  }
}

/**
 * Get errors regardless of DEV mode.
 * Only exported for unit tests.
 */
export function _getErrorsForTesting() {
  return [...errorBuffer];
}

/**
 * Clear errors regardless of DEV mode.
 * Only exported for unit tests.
 */
export function _clearErrorsForTesting() {
  errorBuffer = [];
}

/**
 * Initialize regardless of DEV mode.
 * Only exported for unit tests.
 */
export function _initErrorReportingForTesting() {
  if (initialized) return;
  initialized = true;

  window.onerror = (message, _source, _lineno, _colno, error) => {
    _reportErrorForTesting(error || message, 'window.onerror');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    _reportErrorForTesting(reason instanceof Error ? reason : String(reason), 'unhandledrejection');
  });
}
