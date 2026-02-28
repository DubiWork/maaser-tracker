/**
 * Validation utilities for Ma'aser Tracker
 *
 * Centralized validation logic shared across the application
 */

export const NOTE_MAX_LENGTH = 500;

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
  if (entry.amount === undefined || typeof entry.amount !== 'number') {
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
