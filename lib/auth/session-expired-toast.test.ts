import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('sonner', () => ({
  toast: { warning: vi.fn() },
}));

import { toast } from 'sonner';
import { notifySpotifySessionExpired, SESSION_EXPIRED_MESSAGE } from './session-expired-toast';

interface WarningOptions {
  id?: string;
  duration?: number;
  action?: { label: string; onClick: unknown };
}

function warningCalls(): [string, WarningOptions][] {
  return vi.mocked(toast.warning).mock.calls as unknown as [string, WarningOptions][];
}

describe('notifySpotifySessionExpired', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a persistent warning toast with a stable dedupe id', () => {
    notifySpotifySessionExpired();

    const calls = warningCalls();
    expect(calls).toHaveLength(1);
    const [message, options] = calls[0];
    expect(message).toBe(SESSION_EXPIRED_MESSAGE);
    expect(message).toContain('session has expired');
    expect(options.id).toBe('spotify-session-expired');
    expect(options.duration).toBe(Infinity);
  });

  it('offers a Reconnect action wired to a click handler', () => {
    notifySpotifySessionExpired();

    const [, options] = warningCalls()[0];
    expect(options.action?.label).toBe('Reconnect');
    expect(typeof options.action?.onClick).toBe('function');
  });

  it('reuses the same id on repeated failures so toasts stack as one', () => {
    notifySpotifySessionExpired();
    notifySpotifySessionExpired();

    const calls = warningCalls();
    expect(calls).toHaveLength(2);
    expect(calls[0][1].id).toBe(calls[1][1].id);
    expect(calls[0][1].id).toBe('spotify-session-expired');
  });
});
