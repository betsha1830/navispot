import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpotifyClient } from '@/lib/spotify/client';
import { SpotifyToken } from '@/types';
import { SPOTIFY_STORAGE_KEY } from '@/types/auth-context';

const validToken: SpotifyToken = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  // Already expired — forces a refresh on the next fetch.
  expiresAt: Date.now() - 1000,
  tokenType: 'Bearer',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SpotifyClient refresh token lifecycle', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let client: SpotifyClient;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify({ token: validToken }));
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    client = new SpotifyClient();
    client.setToken(validToken);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('on invalid_grant: clears storage, clears the token, and emits navispot:spotify-reauth-required', async () => {
    const reauthHandler = vi.fn();
    window.addEventListener('navispot:spotify-reauth-required', reauthHandler);

    // First call is the refresh POST → 400 invalid_grant.
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({ error: 'invalid_grant' }, 400));
      }
      return Promise.resolve(jsonResponse({ items: [], total: 0 }));
    });

    await expect(client.getSavedTracksCount())
      .rejects.toThrow(/reconnect Spotify|refresh/i);

    // invalid_grant is permanent — must NOT retry the refresh endpoint.
    const refreshCalls = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/api/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);

    expect(localStorage.getItem(SPOTIFY_STORAGE_KEY)).toBeNull();
    expect(reauthHandler).toHaveBeenCalledTimes(1);
    window.removeEventListener('navispot:spotify-reauth-required', reauthHandler);
  });

  it('serializes concurrent refreshes into a single POST', async () => {
    // Refresh succeeds, returning a fresh access token.
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({
          access_token: 'new-access',
          token_type: 'Bearer',
          expires_in: 3600,
        }));
      }
      return Promise.resolve(jsonResponse({ items: [], total: 0 }));
    });

    const [a, b] = await Promise.all([
      client.refreshAccessToken(),
      client.refreshAccessToken(),
    ]);

    const refreshCalls = fetchSpy.mock.calls.filter(([u]) => String(u).includes('/api/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
    expect(a?.accessToken).toBe('new-access');
    expect(b?.accessToken).toBe('new-access');
  });

  it('keeps the existing refresh token when Spotify does not rotate it', async () => {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/auth/refresh')) {
        // No refresh_token field in response — documented behavior.
        return Promise.resolve(jsonResponse({
          access_token: 'new-access',
          token_type: 'Bearer',
          expires_in: 3600,
        }));
      }
      return Promise.resolve(jsonResponse({ items: [], total: 0 }));
    });

    const refreshed = await client.refreshAccessToken();
    expect(refreshed?.refreshToken).toBe('test-refresh-token');
  });

  it('adopts a rotated refresh token when Spotify provides one', async () => {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({
          access_token: 'new-access',
          refresh_token: 'rotated-refresh',
          token_type: 'Bearer',
          expires_in: 3600,
        }));
      }
      return Promise.resolve(jsonResponse({ items: [], total: 0 }));
    });

    const refreshed = await client.refreshAccessToken();
    expect(refreshed?.refreshToken).toBe('rotated-refresh');
  });

  it('retries transient refresh failures (502) three times before giving up', async () => {
    const calls: string[] = [];
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/auth/refresh')) {
        calls.push('refresh');
        return Promise.resolve(jsonResponse({ error: 'token_endpoint_error', status: 502 }, 502));
      }
      return Promise.resolve(jsonResponse({ items: [], total: 0 }));
    });

    const result = await client.refreshAccessToken();
    expect(result).toBeNull();
    // 3 attempts for a transient failure.
    expect(calls).toHaveLength(3);
  });

  it('persists the refreshed token to localStorage', async () => {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes('/api/auth/refresh')) {
        return Promise.resolve(jsonResponse({
          access_token: 'new-access',
          token_type: 'Bearer',
          expires_in: 3600,
        }));
      }
      return Promise.resolve(jsonResponse({ items: [], total: 0 }));
    });

    await client.refreshAccessToken();

    const stored = JSON.parse(localStorage.getItem(SPOTIFY_STORAGE_KEY)!);
    expect(stored.token.accessToken).toBe('new-access');
    expect(stored.token.expiresAt).toBeGreaterThan(Date.now());
  });
});
