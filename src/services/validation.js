/**
 * Validation utilities for Ma'aser Tracker
 *
 * Centralized validation logic shared across the application
 */

export const NOTE_MAX_LENGTH = 500;

/**
 * Validate accounting month format (YYYY-MM)
 * @param {string} accountingMonth - Accounting month string
 * @returns {boolean} True if valid format
 */
export function isValidAccountingMonth(accountingMonth) {
  if (typeof accountingMonth !== 'string') return false;
  const pattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  return pattern.test(accountingMonth);
}

/**
 * Extract accounting month from a date string or Date object
 * @param {string|Date} date - Date to extract month from
 * @returns {string} Accounting month in YYYY-MM format
 */
export function getAccountingMonthFromDate(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    // Invalid date, return current month as fallback
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Validate an entry object has required fields and correct types
 * @param {Object} entry - Entry to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result with any errors
 */
export function validateEntry(entry) {
  const errors = [];

  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Entry must be an object'] };
  }

  // Required: id (string)
  if (!entry.id || typeof entry.id !== 'string') {
    errors.push('Entry must have a valid id (string)');
  }

  // Required: type ('income' or 'donation')
  if (!entry.type || !['income', 'donation'].includes(entry.type)) {
    errors.push('Entry type must be "income" or "donation"');
  }

  // Required: date (string in ISO format)
  if (!entry.date || typeof entry.date !== 'string') {
    errors.push('Entry must have a valid date (string)');
  }

  // Required: amount (positive number)
  if (entry.amount === undefined || typeof entry.amount !== 'number' || isNaN(entry.amount)) {
    errors.push('Entry must have a valid amount (number)');
  } else if (entry.amount <= 0) {
    errors.push('Entry amount must be positive');
  }

  // Optional: note (string with max length)
  if (entry.note !== undefined && entry.note !== null) {
    if (typeof entry.note !== 'string') {
      errors.push('Entry note must be a string');
    } else if (entry.note.length > NOTE_MAX_LENGTH) {
      errors.push(`Entry note must not exceed ${NOTE_MAX_LENGTH} characters`);
    }
  }

  // Optional: accountingMonth (string in YYYY-MM format)
  // If not provided, it will be derived from date during storage
  if (entry.accountingMonth !== undefined && entry.accountingMonth !== null) {
    if (!isValidAccountingMonth(entry.accountingMonth)) {
      errors.push('Entry accountingMonth must be in YYYY-MM format');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if an entry is valid (simple boolean check)
 * @param {Object} entry - Entry to validate
 * @returns {boolean} True if entry is valid
 */
export function isValidEntry(entry) {
  return validateEntry(entry).valid;
}

/**
 * Ensure entry has accountingMonth field, deriving from date if missing
 * @param {Object} entry - Entry to normalize
 * @returns {Object} Entry with accountingMonth field
 */
export function normalizeEntryAccountingMonth(entry) {
  if (!entry || typeof entry !== 'object') return entry;

  if (!entry.accountingMonth && entry.date) {
    return {
      ...entry,
      accountingMonth: getAccountingMonthFromDate(entry.date),
    };
  }
  return entry;
}
