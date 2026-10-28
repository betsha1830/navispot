import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getJSON, setJSON, setJSONWithQuotaFallback } from './storage';

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('setJSON stores and getJSON round-trips values', () => {
    setJSON('k', { a: 1 });
    expect(getJSON('k', null)).toEqual({ a: 1 });
  });

  it('getJSON returns fallback for missing keys', () => {
    expect(getJSON('missing', 'fb')).toBe('fb');
  });
});

describe('setJSONWithQuotaFallback', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes normally when storage is not full (returns 0, value intact)', () => {
    const value = [
      { id: 'a', importedAt: '2024-01-01T00:00:00Z' },
      { id: 'b', importedAt: '2024-02-01T00:00:00Z' },
    ];

    const dropped = setJSONWithQuotaFallback('imports', value, {
      timestampField: 'importedAt',
    });

    expect(dropped).toBe(0);
    const stored = getJSON<{ id: string }[]>('imports', []);
    expect(stored.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('drops oldest entries from the value until it fits and reports the count', () => {
    const value = [1, 2, 3, 4].map((n) => ({
      id: `pl-${n}`,
      importedAt: `2024-0${n}-01T00:00:00Z`,
    }));

    // Simulate a quota that only accepts a write once the array has ≤2 entries.
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key: string, val: string) {
        let length = Infinity;
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) length = parsed.length;
        } catch {
          /* not an array */
        }
        if (length > 2) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        Object.defineProperty(this, key, {
          value: val,
          configurable: true,
          writable: true,
          enumerable: true,
        });
      });

    const dropped = setJSONWithQuotaFallback('imports', value, {
      timestampField: 'importedAt',
    });

    setItemSpy.mockRestore();

    // pl-1 and pl-2 (oldest) dropped; pl-3/pl-4 survive.
    expect(dropped).toBe(2);
    const stored = getJSON<{ id: string }[]>('imports', []);
    expect(stored.map((e) => e.id)).toEqual(['pl-3', 'pl-4']);
  });

  it('returns -1 when nothing can make the value fit', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

    const dropped = setJSONWithQuotaFallback(
      'imports',
      [{ id: 'only', importedAt: '2024-01-01T00:00:00Z' }],
      { timestampField: 'importedAt' },
    );

    setItemSpy.mockRestore();
    expect(dropped).toBe(-1);
  });

  it('returns -1 for non-array values that hit the quota', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

    const dropped = setJSONWithQuotaFallback('prefs', { layout: 'grid' }, {
      timestampField: 'importedAt',
    });

    setItemSpy.mockRestore();
    expect(dropped).toBe(-1);
  });

  it('respects minLength: never trims below the floor even if it would fit', () => {
    const value = [1, 2, 3, 4].map((n) => ({
      id: `pl-${n}`,
      importedAt: `2024-0${n}-01T00:00:00Z`,
    }));

    // Only arrays of length ≤ 2 fit.
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(function (this: Storage, key: string, val: string) {
        let length = Infinity;
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) length = parsed.length;
        } catch {
          /* ignore */
        }
        if (length > 2) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        Object.defineProperty(this, key, {
          value: val,
          configurable: true,
          writable: true,
          enumerable: true,
        });
      });

    // minLength 3 > fitting length 2 → should give up (-1) rather than
    // silently trim below the floor.
    const dropped = setJSONWithQuotaFallback('imports', value, {
      timestampField: 'importedAt',
      minLength: 3,
    });

    setItemSpy.mockRestore();
    expect(dropped).toBe(-1);
  });
});
