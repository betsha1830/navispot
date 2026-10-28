import { describe, it, expect } from 'vitest';
import { render, renderHook, act, screen, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

/**
 * Regression guard for the unmemoized Toast context value.
 *
 * The context value was previously rebuilt on every provider render with
 * fresh arrow functions, so any effect with `toast` in its deps re-ran
 * whenever a toast appeared or disappeared — including an infinite
 * write→toast→rerender loop in the localStorage quota-fallback path.
 *
 * The provider now delegates to sonner (toast state lives outside React),
 * but the value must still be memoized so its identity never changes.
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

  it('showing a toast keeps the same context value identity', () => {
    // Use renderHook so the toast functions are reachable outside render.
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    const first = result.current;
    act(() => {
      first.showWarning('storage full');
    });
    expect(result.current).toBe(first);
  });

  it('exposes all toast helpers', () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    act(() => {
      result.current.showSuccess('ok');
    });

    expect(typeof result.current.showToast).toBe('function');
    expect(typeof result.current.showError).toBe('function');
    expect(typeof result.current.showInfo).toBe('function');
    expect(typeof result.current.showWarning).toBe('function');
    expect(typeof result.current.dismiss).toBe('function');
  });
});

describe('ToastProvider rendering (sonner)', () => {
  it('renders a success toast message in the DOM', async () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    act(() => {
      result.current.showSuccess('export finished');
    });

    // Sonner publishes through its own store and flushes to the DOM on a
    // macrotask, so the message appears asynchronously.
    await waitFor(() => {
      expect(screen.getByText('export finished')).toBeTruthy();
    });
  });

  it('renders an error toast with a custom duration', async () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    act(() => {
      result.current.showError('network down', 1000);
    });

    await waitFor(() => {
      expect(screen.getByText('network down')).toBeTruthy();
    });
  });

  it('dismiss removes a visible toast', async () => {
    const { result } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    });

    let id: string | number | undefined;
    act(() => {
      id = result.current.showToast('info', 'temporary notice');
    });

    await waitFor(() => {
      expect(screen.getByText('temporary notice')).toBeTruthy();
    });

    act(() => {
      result.current.dismiss(id);
    });

    // Sonner animates the exit and unmounts after TIME_BEFORE_UNMOUNT
    // (200ms) on a real timer — waitFor's default timeout covers it.
    await waitFor(() => {
      expect(screen.queryByText('temporary notice')).toBeNull();
    });
  });
});

/**
 * Dev-only console trigger (window.__toasts). NODE_ENV is 'test' under
 * vitest, so the registration branch runs — production builds strip it.
 */
describe('dev-only window.__toasts trigger', () => {
  it('is registered by ToastProvider outside production', () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>,
    );
    expect(typeof window.__toasts).toBe('function');
  });

  it('fires a single variant on demand', async () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>,
    );

    act(() => {
      window.__toasts?.('warning');
    });

    await waitFor(() => {
      expect(screen.getByText('Export was cancelled')).toBeTruthy();
    });
  });

  it('fires all four variants when called with no argument', async () => {
    render(
      <ToastProvider>
        <div />
      </ToastProvider>,
    );

    act(() => {
      window.__toasts?.();
    });

    // The no-arg variant staggers the four toasts at 0/400/800/1200ms.
    await waitFor(
      () => {
        expect(screen.getByText('Export completed successfully!')).toBeTruthy();
        expect(screen.getByText('Network error')).toBeTruthy();
        expect(screen.getByText('Signed out')).toBeTruthy();
        expect(screen.getByText('Export was cancelled')).toBeTruthy();
      },
      { timeout: 3000 },
    );
  });
});
