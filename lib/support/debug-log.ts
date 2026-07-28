/**
 * Lightweight logger for the four high-value failure sites. Lines are prefixed
 * with `[navispot]` so users can filter their DevTools console and paste the
 * filtered output when reporting issues.
 *
 * Levels:
 *   - info()  routine breadcrumbs (dev mode only — keeps the live demo console quiet)
 *   - warn()  anomalies (always on — useful in production for reports)
 *   - error() thrown failures (always on)
 */

const isDev = (): boolean => process.env.NODE_ENV !== 'production';

function emit(level: 'log' | 'warn' | 'error', args: unknown[], always: boolean): void {
  if (!always && !isDev()) return;
  console[level]('[navispot]', ...args);
}

export const info = (...args: unknown[]): void => emit('log', args, false);
export const warn = (...args: unknown[]): void => emit('warn', args, true);
export const error = (...args: unknown[]): void => emit('error', args, true);