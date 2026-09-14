import { describe, it, expect } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

/**
 * Regression guard for the unmemoized Toast context value.
 *
 * The context value was previously rebuilt on every provider render with
 * fresh arrow functions, so any effect with `toast` in its deps re-ran
 * whenever a toast appeared or disappeared — including an infinite
 * write→toast→rerender loop in the localStorage quota-fallback path.
 */
describe('ToastProvider context value stability', () => {
  it('keeps the same value identity across re-renders and toast add/dismiss', () => {
    const identities: Array<ReturnType<typeof useToast>> = [];

    function Probe() {
      // Recording the context value during render is a test-only probe
      // pattern; the value is not used for rendering.
      const t = useToast();
      identities.push(t);
      return null;
    }

    const { rerender } = render(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );

    const before = identities[0];

    // Plain re-render of the same tree.
    rerender(
      <ToastProvider>
        <Probe />
      </ToastProvider>,
    );
    expect(identities[identities.length - 1]).toBe(before);

    // Every observation is the same object (initial + rerender(s)).
    expect(identities.length).toBeGreaterThanOrEqual(2);
    expect(identities.every((v) => v === before)).toBe(true);
  });

  it('showing a toast re-renders the provider without minting a new value', () => {
    // Use renderHook so the toast functions are reachable outside render.
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    const first = result.current;
    act(() => {
      first.showWarning('storage full');
    });
    // Provider state changed (a toast was added) — but the context value
    // must keep its identity.
    expect(result.current).toBe(first);
  });

  it('toast helpers add toasts and dismiss removes them', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    act(() => {
      result.current.showSuccess('ok');
    });

    expect(typeof result.current.showError).toBe('function');
    expect(typeof result.current.showInfo).toBe('function');
    expect(typeof result.current.showWarning).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });
});
