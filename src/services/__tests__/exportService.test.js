/**
 * Export Service Tests
 *
 * Unit tests for JSON/CSV export, filename generation, download trigger,
 * field stripping, and CSV formula injection prevention.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportToJSON,
  exportToCSV,
  downloadFile,
  generateFilename,
} from '../exportService';

// --- Test fixtures ---

function makeEntry(overrides = {}) {
  return {
    id: 'entry-1',
    type: 'income',
    date: '2026-03-01',
    amount: 5000,
    note: 'Salary',
    accountingMonth: '2026-03',
    ...overrides,
  };
}

function makeEntryWithInternalFields(overrides = {}) {
  return {
    ...makeEntry(),
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T11:00:00.000Z',
    userId: 'user-123',
    ...overrides,
  };
}

// --- generateFilename ---

describe('generateFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate JSON filename with current date', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    expect(generateFilename('json')).toBe('maaser-tracker-2026-03-15.json');
  });

  it('should generate CSV filename with current date', () => {
    vi.setSystemTime(new Date('2026-03-15'));
    expect(generateFilename('csv')).toBe('maaser-tracker-2026-03-15.csv');
  });

  it('should pad single-digit month and day', () => {
    vi.setSystemTime(new Date('2026-01-05'));
    expect(generateFilename('json')).toBe('maaser-tracker-2026-01-05.json');
  });

  it('should handle end of year dates', () => {
    vi.setSystemTime(new Date('2026-12-31'));
    expect(generateFilename('csv')).toBe('maaser-tracker-2026-12-31.csv');
  });
});

// --- exportToJSON ---

describe('exportToJSON', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should produce valid JSON with schema v1 envelope', () => {
    const entries = [makeEntry()];
    const result = exportToJSON(entries);
    const parsed = JSON.parse(result);

    expect(parsed.version).toBe(1);
    expect(parsed.exportDate).toBe('2026-03-15T12:00:00.000Z');
    expect(parsed.entryCount).toBe(1);
    expect(parsed.entries).toHaveLength(1);
  });

  it('should include all user-facing entry fields', () => {
    const entries = [makeEntry()];
    const parsed = JSON.parse(exportToJSON(entries));
    const entry = parsed.entries[0];

    expect(entry.id).toBe('entry-1');
    expect(entry.type).toBe('income');
    expect(entry.date).toBe('2026-03-01');
    expect(entry.amount).toBe(5000);
    expect(entry.note).toBe('Salary');
    expect(entry.accountingMonth).toBe('2026-03');
  });

  it('should strip createdAt from exported entries', () => {
    const entries = [makeEntryWithInternalFields()];
    const parsed = JSON.parse(exportToJSON(entries));
    expect(parsed.entries[0]).not.toHaveProperty('createdAt');
  });

  it('should strip updatedAt from exported entries', () => {
    const entries = [makeEntryWithInternalFields()];
    const parsed = JSON.parse(exportToJSON(entries));
    expect(parsed.entries[0]).not.toHaveProperty('updatedAt');
  });

  it('should strip userId from exported entries', () => {
    const entries = [makeEntryWithInternalFields()];
    const parsed = JSON.parse(exportToJSON(entries));
    expect(parsed.entries[0]).not.toHaveProperty('userId');
  });

  it('should handle multiple entries', () => {
    const entries = [
      makeEntry({ id: 'entry-1', amount: 5000 }),
      makeEntry({ id: 'entry-2', type: 'donation', amount: 500 }),
      makeEntry({ id: 'entry-3', amount: 3000 }),
    ];
    const parsed = JSON.parse(exportToJSON(entries));

    expect(parsed.entryCount).toBe(3);
    expect(parsed.entries).toHaveLength(3);
    expect(parsed.entries[1].type).toBe('donation');
  });

  it('should produce pretty-printed JSON (2-space indentation)', () => {
    const entries = [makeEntry()];
    const result = exportToJSON(entries);
    // Pretty-printed JSON contains newlines
    expect(result).toContain('\n');
    expect(result).toContain('  ');
  });

  it('should throw if entries is empty array', () => {
    expect(() => exportToJSON([])).toThrow('No entries to export');
  });

  it('should throw if entries is not an array', () => {
    expect(() => exportToJSON(null)).toThrow('No entries to export');
    expect(() => exportToJSON(undefined)).toThrow('No entries to export');
    expect(() => exportToJSON('string')).toThrow('No entries to export');
    expect(() => exportToJSON(42)).toThrow('No entries to export');
  });

  it('should not mutate original entries', () => {
    const original = makeEntryWithInternalFields();
    const entries = [original];
    exportToJSON(entries);

    expect(original).toHaveProperty('createdAt');
    expect(original).toHaveProperty('updatedAt');
    expect(original).toHaveProperty('userId');
  });

  it('should handle entries without optional fields', () => {
    const entry = { id: 'e1', type: 'income', date: '2026-01-01', amount: 100 };
    const parsed = JSON.parse(exportToJSON([entry]));

    expect(parsed.entries[0].id).toBe('e1');
    expect(parsed.entries[0]).not.toHaveProperty('note');
  });

  it('should normalize ISO datetime to YYYY-MM-DD (#131)', () => {
    const entries = [makeEntry({ date: '2026-03-01T00:00:00.000Z' })];
    const parsed = JSON.parse(exportToJSON(entries));
    expect(parsed.entries[0].date).toBe('2026-03-01');
  });

  it('should keep YYYY-MM-DD dates unchanged (#131)', () => {
    const entries = [makeEntry({ date: '2026-06-15' })];
    const parsed = JSON.parse(exportToJSON(entries));
    expect(parsed.entries[0].date).toBe('2026-06-15');
  });

  it('should not mutate original entry date during normalization (#131)', () => {
    const original = makeEntry({ date: '2026-03-01T00:00:00.000Z' });
    const entries = [original];
    exportToJSON(entries);
    expect(original.date).toBe('2026-03-01T00:00:00.000Z');
  });

  it('should include maaser field in JSON export (#132)', () => {
    const entries = [makeEntry({ maaser: 500 })];
    const parsed = JSON.parse(exportToJSON(entries));
    expect(parsed.entries[0].maaser).toBe(500);
  });
});

// --- exportToCSV ---

describe('exportToCSV', () => {
  it('should produce CSV with UTF-8 BOM prefix', async () => {
    const entries = [makeEntry()];
    const result = await exportToCSV(entries);
    expect(result.charCodeAt(0)).toBe(0xFEFF);
  });

  it('should include English column headers', async () => {
    const entries = [makeEntry()];
    const result = await exportToCSV(entries);
    const firstLine = result.replace('\uFEFF', '').split('\n')[0];
    expect(firstLine).toContain('id');
    expect(firstLine).toContain('type');
    expect(firstLine).toContain('date');
    expect(firstLine).toContain('amount');
    expect(firstLine).toContain('maaser');
    expect(firstLine).toContain('note');
    expect(firstLine).toContain('accountingMonth');
  });

  it('should include maaser column with correct values (#132)', async () => {
    const entries = [makeEntry({ maaser: 500 })];
    const result = await exportToCSV(entries);
    expect(result).toContain('maaser');
    expect(result).toContain('500');
  });

  it('should handle entries without maaser field in CSV (#132)', async () => {
    const entries = [makeEntry({ type: 'donation' })];
    const result = await exportToCSV(entries);
    // Header should still be present even if entry has no maaser value
    const firstLine = result.replace('\uFEFF', '').split('\n')[0];
    expect(firstLine).toContain('maaser');
  });

  it('should include entry data in CSV output', async () => {
    const entries = [makeEntry({ id: 'test-id', amount: 1234 })];
    const result = await exportToCSV(entries);
    expect(result).toContain('test-id');
    expect(result).toContain('1234');
  });

  it('should handle multiple entries', async () => {
    const entries = [
      makeEntry({ id: 'e1' }),
      makeEntry({ id: 'e2', type: 'donation' }),
    ];
    const result = await exportToCSV(entries);
    expect(result).toContain('e1');
    expect(result).toContain('e2');
  });

  it('should strip internal fields from CSV export', async () => {
    const entries = [makeEntryWithInternalFields()];
    const result = await exportToCSV(entries);
    expect(result).not.toContain('createdAt');
    expect(result).not.toContain('updatedAt');
    expect(result).not.toContain('userId');
  });

  it('should sanitize cells starting with = to prevent formula injection', async () => {
    const entries = [makeEntry({ note: '=SUM(A1:A10)' })];
    const result = await exportToCSV(entries);
    expect(result).toContain("'=SUM(A1:A10)");
  });

  it('should sanitize cells starting with + to prevent formula injection', async () => {
    const entries = [makeEntry({ note: '+cmd|calc' })];
    const result = await exportToCSV(entries);
    expect(result).toContain("'+cmd|calc");
  });

  it('should sanitize cells starting with - to prevent formula injection', async () => {
    const entries = [makeEntry({ note: '-1+1' })];
    const result = await exportToCSV(entries);
    expect(result).toContain("'-1+1");
  });

  it('should sanitize cells starting with @ to prevent formula injection', async () => {
    const entries = [makeEntry({ note: '@SUM(A1)' })];
    const result = await exportToCSV(entries);
    expect(result).toContain("'@SUM(A1)");
  });

  it('should not sanitize normal text values', async () => {
    const entries = [makeEntry({ note: 'Normal salary payment' })];
    const result = await exportToCSV(entries);
    expect(result).toContain('Normal salary payment');
    // Should not have a leading quote
    expect(result).not.toContain("'Normal salary payment");
  });

  it('should throw if entries is empty array', async () => {
    await expect(exportToCSV([])).rejects.toThrow('No entries to export');
  });

  it('should throw if entries is not an array', async () => {
    await expect(exportToCSV(null)).rejects.toThrow('No entries to export');
    await expect(exportToCSV(undefined)).rejects.toThrow('No entries to export');
  });

  it('should load PapaParse via dynamic import', async () => {
    // PapaParse is loaded dynamically — the test succeeds only if the import works
    const entries = [makeEntry()];
    const result = await exportToCSV(entries);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle entries with Hebrew text', async () => {
    const entries = [makeEntry({ note: 'משכורת חודשית' })];
    const result = await exportToCSV(entries);
    expect(result).toContain('משכורת חודשית');
  });

  it('should normalize ISO datetime to YYYY-MM-DD in CSV (#131)', async () => {
    const entries = [makeEntry({ date: '2026-03-01T00:00:00.000Z' })];
    const result = await exportToCSV(entries);
    // Should contain the normalized date, not the full ISO string
    expect(result).toContain('2026-03-01');
    expect(result).not.toContain('T00:00:00');
  });

  it('should keep YYYY-MM-DD dates unchanged in CSV (#131)', async () => {
    const entries = [makeEntry({ date: '2026-06-15' })];
    const result = await exportToCSV(entries);
    expect(result).toContain('2026-06-15');
  });
});

// --- downloadFile ---

describe('downloadFile', () => {
  let createObjectURLMock;
  let revokeObjectURLMock;
  let appendChildSpy;
  let removeChildSpy;
  let clickSpy;

  beforeEach(() => {
    createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    clickSpy = vi.fn();
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          style: {},
          click: clickSpy,
        };
      }
      return document.createElement(tag);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a Blob with the correct content and MIME type', () => {
    downloadFile('test content', 'test.json', 'application/json');
    expect(createObjectURLMock).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('should set anchor download attribute to filename', () => {
    let capturedAnchor;
    document.createElement.mockImplementation((tag) => {
      if (tag === 'a') {
        capturedAnchor = { href: '', download: '', style: {}, click: clickSpy };
        return capturedAnchor;
      }
    });

    downloadFile('data', 'myfile.csv', 'text/csv');
    expect(capturedAnchor.download).toBe('myfile.csv');
  });

  it('should click the anchor to trigger download', () => {
    downloadFile('data', 'test.json', 'application/json');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should revoke the Blob URL after download', () => {
    downloadFile('data', 'test.json', 'application/json');
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should append and remove the anchor from the DOM', () => {
    downloadFile('data', 'test.json', 'application/json');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
  });

  it('should return downloaded: true and iosSafari: false for normal browsers', () => {
    const result = downloadFile('data', 'test.json', 'application/json');
    expect(result).toEqual({ downloaded: true, iosSafari: false });
  });

  it('should detect iOS Safari and open in new tab instead', () => {
    vi.useFakeTimers();
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    // Simulate iOS Safari user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      configurable: true,
    });

    const result = downloadFile('data', 'test.json', 'application/json');

    expect(openSpy).toHaveBeenCalledWith('blob:mock-url', '_blank');
    expect(result).toEqual({ downloaded: true, iosSafari: true });
    // On iOS Safari, click should NOT be called (opens in new tab instead)
    expect(clickSpy).not.toHaveBeenCalled();

    vi.useRealTimers();
    openSpy.mockRestore();
  });
});
