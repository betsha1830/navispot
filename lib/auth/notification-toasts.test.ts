import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), dismiss: vi.fn() },
}));

import { toast } from 'sonner';
import {
  messageForOAuthError,
  consumeOAuthErrorFromUrl,
  notifyOAuthError,
  syncFetchErrorToast,
} from './notification-toasts';

describe('messageForOAuthError', () => {
  it('maps known codes to friendly explanations', () => {
    expect(messageForOAuthError('token_exchange_failed')).toBe(
      "Spotify rejected the login. If it keeps failing, check that the redirect URI in your Spotify app settings matches this server exactly.",
    );
    expect(messageForOAuthError('access_denied')).toContain(
      'declined the Spotify permission',
    );
  });

  it('falls back to a generic message for unknown codes', () => {
    expect(messageForOAuthError('weird_new_code')).toBe(
      'Spotify login failed (weird_new_code). Please try connecting again.',
    );
  });
});

describe('consumeOAuthErrorFromUrl', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('returns the error code and strips it from the URL so a refresh stays quiet', () => {
    window.history.replaceState(null, '', '/?error=access_denied&auth=1');

    expect(consumeOAuthErrorFromUrl()).toBe('access_denied');
    expect(window.location.search).toBe('?auth=1');
    expect(window.location.pathname).toBe('/');
  });

  it('returns null and leaves the URL alone when there is no error param', () => {
    window.history.replaceState(null, '', '/?auth=1');

    expect(consumeOAuthErrorFromUrl()).toBeNull();
    expect(window.location.search).toBe('?auth=1');
  });
});

describe('notifyOAuthError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fires a persistent error toast with a stable dedupe id', () => {
    notifyOAuthError('token_exchange_failed');

    expect(toast.error).toHaveBeenCalledTimes(1);
    const [message, options] = (toast.error as ReturnType<typeof vi.fn>).mock
      .calls[0] as unknown as [
      string,
      { id?: string; duration?: number },
    ];
    expect(message).toContain('redirect URI');
    expect(options.id).toBe('spotify-oauth-error');
    expect(options.duration).toBe(Infinity);
  });
});

describe('syncFetchErrorToast', () => {
  const retry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a persistent error toast with a Retry action when a message is present', () => {
    syncFetchErrorToast('Failed to fetch playlists', retry);

    expect(toast.error).toHaveBeenCalledTimes(1);
    const [message, options] = (toast.error as ReturnType<typeof vi.fn>).mock
      .calls[0] as unknown as [
      string,
      { id?: string; duration?: number; action?: { label: string; onClick: () => void } },
    ];
    expect(message).toBe('Failed to fetch playlists');
    expect(options.id).toBe('fetch-error');
    expect(options.duration).toBe(Infinity);
    expect(options.action?.label).toBe('Retry');
    options.action?.onClick();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('dismisses the toast when the message clears', () => {
    syncFetchErrorToast(null, retry);

    expect(toast.dismiss).toHaveBeenCalledWith('fetch-error');
    expect(toast.error).not.toHaveBeenCalled();
  });
});
