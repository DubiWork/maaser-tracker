/**
 * Ma'aser Calculation Utility
 *
 * Pure utility functions for period-based ma'aser (tithe) calculation.
 * Supports variable percentage rates that change over time via "percentage periods".
 *
 * Data types:
 * - PercentagePeriod: { percentage: number, effectiveFrom: string (YYYY-MM-DD) }
 * - Income entry: { id, type: 'income', amount: number, date: string, ... }
 */

const DEFAULT_PERCENTAGE = 10;
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Sort periods by effectiveFrom ascending (earliest first).
 * Returns a new array (does not mutate input).
 * @param {Array} periods - Array of PercentagePeriod objects
 * @returns {Array} Sorted copy of periods
 */
function sortPeriods(periods) {
  return [...periods].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
}

/**
 * Get the applicable ma'aser percentage for a specific date.
 *
 * Finds the latest period whose effectiveFrom <= the given date.
 * Returns the default 10% if no period covers the date.
 *
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {Array} periods - Array of PercentagePeriod objects
 * @returns {number} The applicable percentage
 */
export function getMaaserPercentageForDate(date, periods) {
  if (!periods || periods.length === 0) {
    return DEFAULT_PERCENTAGE;
  }

  const sorted = sortPeriods(periods);
  let applicable = null;

  for (const period of sorted) {
    if (period.effectiveFrom <= date) {
      applicable = period;
    } else {
      break;
    }
  }

  return applicable ? applicable.percentage : DEFAULT_PERCENTAGE;
}

/**
 * Get the current (most recent) ma'aser percentage.
 *
 * Returns the percentage from the period with the latest effectiveFrom date.
 * Returns the default 10% if no periods exist.
 *
 * @param {Array} periods - Array of PercentagePeriod objects
 * @returns {number} The current percentage
 */
export function getCurrentMaaserPercentage(periods) {
  if (!periods || periods.length === 0) {
    return DEFAULT_PERCENTAGE;
  }

  const sorted = sortPeriods(periods);
  return sorted[sorted.length - 1].percentage;
}

/**
 * Calculate the total ma'aser obligation for a set of income entries.
 *
 * For each income entry, finds the applicable percentage period and
 * multiplies entry.amount * (applicablePeriod.percentage / 100).
 * Falls back to 10% when no period covers an entry's date.
 *
 * @param {Array} incomeEntries - Array of income entry objects
 * @param {Array} periods - Array of PercentagePeriod objects
 * @returns {number} Total ma'aser obligation (sum of per-entry obligations)
 */
export function calculateMaaserForEntries(incomeEntries, periods) {
  if (!incomeEntries || incomeEntries.length === 0) {
    return 0;
  }

  let total = 0;

  for (const entry of incomeEntries) {
    const percentage = getMaaserPercentageForDate(entry.date, periods);
    total += entry.amount * (percentage / 100);
  }

  // Round to 2 decimal places to avoid floating-point drift
  return Math.round(total * 100) / 100;
}

/**
 * Validate a percentage period object.
 *
 * Rules:
 * - percentage must be a number between 1 and 100 (inclusive)
 * - percentage can be integer or float with max 2 decimal places
 * - effectiveFrom must be a valid YYYY-MM-DD date string
 *
 * @param {Object} period - PercentagePeriod object to validate
 * @returns {{ valid: boolean, errors: string[] }} Validation result
 */
export function validatePercentagePeriod(period) {
  const errors = [];

  if (!period || typeof period !== 'object') {
    return { valid: false, errors: ['Period must be an object'] };
  }

  // Validate percentage
  if (typeof period.percentage !== 'number' || isNaN(period.percentage)) {
    errors.push('percentage must be a number');
  } else {
    if (period.percentage < 1) {
      errors.push('percentage must be at least 1');
    }
    if (period.percentage > 100) {
      errors.push('percentage must not exceed 100');
    }
    // Check decimal places: multiply by 100, check if integer
    const scaled = period.percentage * 100;
    if (Math.round(scaled) !== scaled) {
      errors.push('percentage must have at most 2 decimal places');
    }
  }

  // Validate effectiveFrom
  if (typeof period.effectiveFrom !== 'string') {
    errors.push('effectiveFrom must be a string');
  } else if (!DATE_PATTERN.test(period.effectiveFrom)) {
    errors.push('effectiveFrom must be a valid date in YYYY-MM-DD format');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Add a new percentage period to an existing periods array.
 *
 * Creates a new period object and returns a new sorted array.
 * Does not modify the input array (immutable operation).
 * Throws an error if the new period fails validation.
 *
 * @param {Array} existingPeriods - Current array of PercentagePeriod objects
 * @param {number} newPercentage - The percentage for the new period
 * @param {string} effectiveDate - The effective date (YYYY-MM-DD) for the new period
 * @returns {Array} New sorted array including the added period
 * @throws {Error} If the new period fails validation
 */
export function addPercentagePeriod(existingPeriods, newPercentage, effectiveDate) {
  const newPeriod = { percentage: newPercentage, effectiveFrom: effectiveDate };
  const validation = validatePercentagePeriod(newPeriod);

  if (!validation.valid) {
    throw new Error(`Invalid period: ${validation.errors.join(', ')}`);
  }

  const periods = existingPeriods ? [...existingPeriods] : [];
  periods.push(newPeriod);

  return sortPeriods(periods);
}
