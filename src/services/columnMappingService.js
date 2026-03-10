/**
 * Column Mapping Service for External CSV Import
 *
 * Auto-detects column headers from external spreadsheets (e.g., personal
 * ma'aser tracking sheets) and transforms rows into Ma'aser Tracker entries.
 *
 * Features:
 * - Hebrew/English header dictionary with confidence scoring
 * - Currency symbol stripping and amount parsing
 * - Multi-format date parsing (MM/YYYY, DD/MM/YYYY, YYYY-MM-DD, M/D/YYYY)
 * - Row splitting: one CSV row may produce both income and donation entries
 */

// --- Header Dictionaries ---

/**
 * Hebrew header dictionary.
 * Keys are exact Hebrew header text; values are internal field names.
 */
const HEBREW_HEADERS = {
  'תאריך': 'date',
  'הכנסה': 'income',
  'מעשר': 'maaser',
  'הופרש': 'donation',
  'נשאר להפריש מחודש קודם': 'ignore',
};

/**
 * English header dictionary.
 * Keys are lowercase English aliases; values are internal field names.
 */
const ENGLISH_HEADERS = {
  'date': 'date',
  'month': 'date',
  'period': 'date',
  'income': 'income',
  'earnings': 'income',
  'salary': 'income',
  'maaser': 'maaser',
  'tithe': 'maaser',
  '10%': 'maaser',
  'donation': 'donation',
  'donated': 'donation',
  'given': 'donation',
  'contribution': 'donation',
};

/**
 * Partial-match keywords for medium-confidence detection.
 * Each entry: [substring, fieldName].
 */
const PARTIAL_KEYWORDS = [
  ['date', 'date'],
  ['month', 'date'],
  ['period', 'date'],
  ['תאריך', 'date'],
  ['income', 'income'],
  ['earn', 'income'],
  ['salary', 'income'],
  ['הכנסה', 'income'],
  ['maaser', 'maaser'],
  ['tithe', 'maaser'],
  ['מעשר', 'maaser'],
  ['donat', 'donation'],
  ['given', 'donation'],
  ['contribut', 'donation'],
  ['הופרש', 'donation'],
];

// --- Currency Parsing ---

/**
 * Currency symbols to strip from amount strings.
 */
const CURRENCY_SYMBOLS = /[₪$€£]/g;

/**
 * Parse a currency amount string into a number.
 * Strips currency symbols and thousand separators.
 *
 * @param {*} value - Raw amount value (string or number)
 * @returns {number|null} Parsed number, or null if unparseable
 */
export function parseCurrencyAmount(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed === '') return null;

  // Strip currency symbols
  let cleaned = trimmed.replace(CURRENCY_SYMBOLS, '');

  // Remove thousand separators (commas before digits)
  cleaned = cleaned.replace(/,/g, '');

  // Trim again after stripping
  cleaned = cleaned.trim();

  if (cleaned === '') return null;

  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;

  return num;
}

// --- Date Parsing ---

/**
 * Parse a date string from various formats into a standardized result.
 *
 * Supported formats:
 * - MM/YYYY       → first of month
 * - DD/MM/YYYY    → exact date
 * - YYYY-MM-DD    → ISO format (pass through)
 * - M/D/YYYY      → US format
 *
 * @param {string} value - Date string to parse
 * @returns {{ date: string, accountingMonth: string }|null} Parsed date or null
 */
export function parseExternalDate(value) {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (trimmed === '') return null;

  // Try YYYY-MM-DD (ISO format)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (isValidDate(year, month, day)) {
      return {
        date: `${year}-${month}-${day}`,
        accountingMonth: `${year}-${month}`,
      };
    }
  }

  // Try MM/YYYY (month-only format — primary for ma'aser sheets)
  const mmYYYYMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYYYYMatch) {
    const [, rawMonth, year] = mmYYYYMatch;
    const month = rawMonth.padStart(2, '0');
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12) {
      return {
        date: `${year}-${month}-01`,
        accountingMonth: `${year}-${month}`,
      };
    }
  }

  // Try DD/MM/YYYY (Israeli format)
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, rawDay, rawMonth, year] = ddmmyyyyMatch;
    const day = rawDay.padStart(2, '0');
    const month = rawMonth.padStart(2, '0');
    if (isValidDate(year, month, day)) {
      return {
        date: `${year}-${month}-${day}`,
        accountingMonth: `${year}-${month}`,
      };
    }

    // Try as M/D/YYYY (US format) if DD/MM failed
    const usDay = rawMonth.padStart(2, '0');
    const usMonth = rawDay.padStart(2, '0');
    if (isValidDate(year, usMonth, usDay)) {
      return {
        date: `${year}-${usMonth}-${usDay}`,
        accountingMonth: `${year}-${usMonth}`,
      };
    }
  }

  return null;
}

/**
 * Validate that year/month/day form a real date.
 * @param {string} year
 * @param {string} month
 * @param {string} day
 * @returns {boolean}
 */
function isValidDate(year, month, day) {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const testDate = new Date(y, m - 1, d);
  return (
    testDate.getFullYear() === y &&
    testDate.getMonth() === m - 1 &&
    testDate.getDate() === d
  );
}

// --- Header Detection ---

/**
 * Detect column mappings from CSV headers.
 *
 * Tries three strategies in order:
 * 1. Exact match against Hebrew/English dictionaries → confidence: 'high'
 * 2. Partial/includes match against keyword list → confidence: 'medium'
 * 3. Position-based fallback → confidence: 'low'
 *
 * @param {string[]} headers - Array of header strings from CSV first row
 * @returns {{
 *   mappings: Record<string, number>,
 *   confidence: Record<string, 'high'|'medium'|'low'>,
 *   unmapped: number[]
 * }}
 */
export function detectColumns(headers) {
  if (!Array.isArray(headers) || headers.length === 0) {
    return { mappings: {}, confidence: {}, unmapped: [] };
  }

  const mappings = {};
  const confidence = {};
  const mapped = new Set();

  // Pass 1: Exact matches (high confidence)
  for (let i = 0; i < headers.length; i++) {
    const header = (headers[i] || '').trim();
    const lower = header.toLowerCase();

    // Try Hebrew exact match
    const hebrewField = HEBREW_HEADERS[header];
    if (hebrewField && hebrewField !== 'ignore' && !mappings[hebrewField]) {
      mappings[hebrewField] = i;
      confidence[hebrewField] = 'high';
      mapped.add(i);
      continue;
    }

    // Mark ignore columns as mapped (so they don't get position-fallback)
    if (hebrewField === 'ignore') {
      mapped.add(i);
      continue;
    }

    // Try English exact match
    const englishField = ENGLISH_HEADERS[lower];
    if (englishField && !mappings[englishField]) {
      mappings[englishField] = i;
      confidence[englishField] = 'high';
      mapped.add(i);
    }
  }

  // Pass 2: Partial matches (medium confidence)
  for (let i = 0; i < headers.length; i++) {
    if (mapped.has(i)) continue;

    const header = (headers[i] || '').trim().toLowerCase();
    for (const [keyword, field] of PARTIAL_KEYWORDS) {
      if (header.includes(keyword) && !mappings[field]) {
        mappings[field] = i;
        confidence[field] = 'medium';
        mapped.add(i);
        break;
      }
    }
  }

  // Pass 3: Position-based fallback (low confidence)
  const requiredFields = ['date', 'income', 'maaser', 'donation'];
  const missingFields = requiredFields.filter((f) => !(f in mappings));

  if (missingFields.length > 0) {
    let missingIdx = 0;
    for (let i = 0; i < headers.length && missingIdx < missingFields.length; i++) {
      if (mapped.has(i)) continue;

      const field = missingFields[missingIdx];
      mappings[field] = i;
      confidence[field] = 'low';
      mapped.add(i);
      missingIdx++;
    }
  }

  // Collect unmapped column indices
  const unmapped = [];
  for (let i = 0; i < headers.length; i++) {
    if (!mapped.has(i)) {
      unmapped.push(i);
    }
  }

  return { mappings, confidence, unmapped };
}

// --- Row Transformation ---

/**
 * Transform parsed CSV rows into Ma'aser Tracker entries.
 *
 * Each CSV row can produce up to 2 entries:
 * - An income entry (if income amount > 0)
 * - A donation entry (if donation/הופרש amount > 0)
 *
 * @param {string[][]} rows - 2D array of cell values (no header row)
 * @param {Record<string, number>} mappings - Column index mappings from detectColumns
 * @returns {{
 *   entries: Object[],
 *   skippedRows: { row: number, reason: string }[],
 *   stats: { totalRows: number, incomeEntries: number, donationEntries: number, skipped: number }
 * }}
 */
export function transformRows(rows, mappings) {
  if (!Array.isArray(rows) || !mappings) {
    return {
      entries: [],
      skippedRows: [],
      stats: { totalRows: 0, incomeEntries: 0, donationEntries: 0, skipped: 0 },
    };
  }

  const entries = [];
  const skippedRows = [];
  let incomeEntries = 0;
  let donationEntries = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) {
      skippedRows.push({ row: i + 1, reason: 'Invalid row format' });
      continue;
    }

    // Check if row is entirely empty
    const allEmpty = row.every((cell) => {
      const val = (cell || '').toString().trim();
      return val === '';
    });
    if (allEmpty) {
      skippedRows.push({ row: i + 1, reason: 'Empty row' });
      continue;
    }

    // Parse date
    const dateRaw = mappings.date !== undefined ? row[mappings.date] : undefined;
    const dateResult = parseExternalDate(dateRaw);
    if (!dateResult) {
      skippedRows.push({ row: i + 1, reason: 'Invalid or missing date' });
      continue;
    }

    // Parse income amount
    const incomeRaw = mappings.income !== undefined ? row[mappings.income] : undefined;
    const incomeAmount = parseCurrencyAmount(incomeRaw);

    if (incomeAmount === null || incomeAmount === 0 || isNaN(incomeAmount)) {
      skippedRows.push({ row: i + 1, reason: 'Income amount is empty, zero, or invalid' });
      continue;
    }

    // Parse maaser amount (optional — informational)
    const maaserRaw = mappings.maaser !== undefined ? row[mappings.maaser] : undefined;
    const maaserAmount = parseCurrencyAmount(maaserRaw);

    // Create income entry
    const incomeEntry = {
      id: crypto.randomUUID(),
      type: 'income',
      date: dateResult.date,
      amount: incomeAmount,
      maaser: maaserAmount !== null && maaserAmount > 0 ? maaserAmount : undefined,
      accountingMonth: dateResult.accountingMonth,
      note: '',
    };
    entries.push(incomeEntry);
    incomeEntries++;

    // Parse donation amount (optional — creates separate entry if > 0)
    const donationRaw = mappings.donation !== undefined ? row[mappings.donation] : undefined;
    const donationAmount = parseCurrencyAmount(donationRaw);

    if (donationAmount !== null && donationAmount > 0) {
      const donationEntry = {
        id: crypto.randomUUID(),
        type: 'donation',
        date: dateResult.date,
        amount: donationAmount,
        accountingMonth: dateResult.accountingMonth,
        note: '',
      };
      entries.push(donationEntry);
      donationEntries++;
    }
  }

  return {
    entries,
    skippedRows,
    stats: {
      totalRows: rows.length,
      incomeEntries,
      donationEntries,
      skipped: skippedRows.length,
    },
  };
}
