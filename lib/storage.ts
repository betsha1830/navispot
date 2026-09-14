export function getJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[storage] failed to set ${key}:`, err);
  }
}

/**
 * Like setJSON, but when localStorage is full and the value is an array of
 * objects with a sortable `timestampField`, it drops the OLDEST entries
 * from the value itself until it fits. Returns the number of entries
 * dropped (0 when saved intact), or -1 when nothing could be saved
 * (non-array value, or even a single entry doesn't fit). Callers use the
 * return value to warn the user that data was trimmed.
 */
export function setJSONWithQuotaFallback<T>(
  key: string,
  value: T,
  options: {
    timestampField: string;
    minLength?: number;
  },
): number {
  if (typeof window === 'undefined') return 0;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return 0;
  } catch {
    // quota exceeded — try trimming below
  }

  if (!Array.isArray(value) || value.length === 0) return -1;
  const minLength = options.minLength ?? 0;
  if (value.length <= minLength) return -1;

  // Oldest first, so the newest entries survive.
  const sorted = [...(value as Array<Record<string, unknown>>)].sort(
    (a, b) =>
      new Date(String(a[options.timestampField] ?? 0)).getTime() -
      new Date(String(b[options.timestampField] ?? 0)).getTime(),
  );

  while (sorted.length > minLength) {
    sorted.shift();
    try {
      window.localStorage.setItem(key, JSON.stringify(sorted));
      return (value as unknown[]).length - sorted.length;
    } catch {
      // still full — drop another entry
    }
  }

  return -1;
}

export function remove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.error(`[storage] failed to remove ${key}:`, err);
  }
}
