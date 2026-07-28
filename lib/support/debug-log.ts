/**
 * Lightweight verbose logger for debugging. Gated by:
 *   1. NODE_ENV !== 'production', OR
 *   2. localStorage flag `navispot.debug` === 'true'
 *
 * Use `log()` / `warn()` / `error()` instead of console.* directly so we can
 * ship to production without noise. Lines are prefixed with `[navispot]`
 * so users can filter their DevTools console.
 */

const STORAGE_KEY = 'navispot.debug';

function isEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function emit(level: 'log' | 'warn' | 'error', args: unknown[]): void {
  if (!isEnabled()) return;
  console[level]('[navispot]', ...args);
}

export const log = (...args: unknown[]): void => emit('log', args);
export const warn = (...args: unknown[]): void => emit('warn', args);
export const error = (...args: unknown[]): void => emit('error', args);

export function enableDebug(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    /* ignore */
  }
}

export function disableDebug(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isDebugEnabled(): boolean {
  return isEnabled();
}