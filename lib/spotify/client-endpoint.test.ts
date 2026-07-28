import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpotifyClient, SpotifyApiError } from '@/lib/spotify/client';
import { SpotifyToken } from '@/types';

const validToken: SpotifyToken = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt: Date.now() + 3600 * 1000,
  tokenType: 'Bearer',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, body: unknown = { error: { status, message: 'err' } }): Response {
  return jsonResponse(body, status);
}

describe('SpotifyClient playlist endpoint uses non-deprecated /items', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let client: SpotifyClient;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    client = new SpotifyClient();
    client.setToken(validToken);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getPlaylistTracks calls /playlists/{id}/items (not deprecated /tracks)', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      items: [],
      next: null,
      total: 0,
    }));

    await client.getPlaylistTracks('playlist-123', 100, 0);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('/playlists/playlist-123/items');
    expect(url).not.toContain('/tracks');
  });

  it('getAllPlaylistTracks paginates with /items across multiple pages', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({
        items: [{ item: { id: 't1' } }],
        next: 'next-url',
        total: 150,
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [{ item: { id: 't2' } }],
        next: null,
        total: 150,
      }));

    const tracks = await client.getAllPlaylistTracks('playlist-456');

    expect(tracks).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    for (const call of fetchSpy.mock.calls) {
      const url = call[0] as string;
      expect(url).toContain('/playlists/playlist-456/items');
      expect(url).not.toContain('/tracks');
    }
  });

  it('getPlaylistCreatedDate uses /items for both first and last page', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({
        items: [{ added_at: '2024-01-15T00:00:00Z' }],
        total: 150,
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [{ added_at: '2020-06-01T00:00:00Z' }],
        total: 150,
      }));

    await client.getPlaylistCreatedDate('playlist-789');

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    for (const call of fetchSpy.mock.calls) {
      const url = call[0] as string;
      expect(url).toContain('/playlists/playlist-789/items');
      expect(url).not.toContain('/tracks');
    }
  });
});

describe('SpotifyClient playlist error handling (regression for issue #9)', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let client: SpotifyClient;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    client = new SpotifyClient();
    client.setToken(validToken);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getAllPlaylistTracks throws SpotifyApiError(403) with raw body intact', async () => {
    const body = { error: { status: 403, message: 'Forbidden' } };
    fetchSpy.mockResolvedValue(errorResponse(403, body));

    await expect(client.getAllPlaylistTracks('forbidden-playlist'))
      .rejects.toBeInstanceOf(SpotifyApiError);

    await expect(client.getAllPlaylistTracks('forbidden-playlist'))
      .rejects.toMatchObject({ status: 403, name: 'SpotifyApiError' });

    await expect(client.getAllPlaylistTracks('forbidden-playlist'))
      .rejects.toThrow(/Spotify API error 403/);
  });

  it('getAllPlaylistTracks throws SpotifyApiError(404) when playlist is missing', async () => {
    fetchSpy.mockResolvedValue(errorResponse(404));

    await expect(client.getAllPlaylistTracks('deleted-playlist'))
      .rejects.toMatchObject({ status: 404 });

    await expect(client.getAllPlaylistTracks('deleted-playlist'))
      .rejects.toThrow(/404/);
  });

  it('getAllPlaylistTracks throws SpotifyApiError(429) on rate limit', async () => {
    fetchSpy.mockResolvedValue(errorResponse(429));

    await expect(client.getAllPlaylistTracks('rate-limited'))
      .rejects.toMatchObject({ status: 429 });
  });

  it('getAllPlaylistTracks does NOT crash with "items is undefined" on a 2xx Spotify error body', async () => {
    // Spotify has historically returned 200 with `{ error: ... }` on some endpoints
    fetchSpy.mockResolvedValue(jsonResponse({
      error: { status: 404, message: 'Not found' },
    }));

    const tracks = await client.getAllPlaylistTracks('broken-playlist');
    expect(tracks).toEqual([]);
  });

  it('getAllPlaylistTracks does NOT crash when response.items is missing', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      total: 0,
      next: null,
    }));

    const tracks = await client.getAllPlaylistTracks('malformed-playlist');
    expect(tracks).toEqual([]);
  });

  it('getAllSavedTracks does not crash when response.items is missing', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      total: 0,
      next: null,
    }));

    const tracks = await client.getAllSavedTracks();
    expect(tracks).toEqual([]);
  });

  it('getAllPlaylists does not crash when response.items is missing', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      total: 0,
      next: null,
    }));

    const playlists = await client.getAllPlaylists();
    expect(playlists).toEqual([]);
  });

  it('SpotifyApiError caps the stored body at MAX_ERROR_BODY_CHARS', async () => {
    // Simulate a misbehaving CDN returning a giant HTML error page.
    // The client retries 5xx up to 3 times, so each attempt needs a fresh
    // Response (Response bodies are single-use).
    const hugeBody = '<html>' + 'x'.repeat(20_000) + '</html>';
    fetchSpy.mockImplementation(
      () => Promise.resolve(new Response(hugeBody, {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      })),
    );

    let caught: unknown;
    try {
      await client.getAllPlaylistTracks('broken-playlist');
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(SpotifyApiError);
    const err = caught as SpotifyApiError;
    expect(err.body.length).toBe(8 * 1024);
    expect(err.bodyTruncated).toBe(true);
    expect(err.bodyOriginalSize).toBe(hugeBody.length);
    expect(err.message).toMatch(/truncated from \d+ to 8192 chars/);
  });

  it('SpotifyApiError keeps the body intact when under the cap', async () => {
    fetchSpy.mockResolvedValue(errorResponse(403, {
      error: { status: 403, message: 'Forbidden' },
    }));

    let caught: unknown;
    try {
      await client.getAllPlaylistTracks('forbidden-playlist');
    } catch (e) {
      caught = e;
    }

    const err = caught as SpotifyApiError;
    expect(err.bodyTruncated).toBe(false);
    expect(err.bodyOriginalSize).toBe(err.body.length);
    expect(err.message).not.toMatch(/truncated/);
  });

  it('getAllPlaylistTracks normalizes legacy track objects (track instead of item)', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      items: [{ track: { id: 'legacy-t1' } }],
      next: null,
      total: 1,
    }));

    const tracks = await client.getAllPlaylistTracks('legacy-playlist');
    expect(tracks).toHaveLength(1);
    expect((tracks[0] as unknown as { track?: { id: string } }).track?.id).toBe('legacy-t1');
  });

  it('getAllPlaylistTracks stops paginating cleanly on empty page', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({
        items: [{ item: { id: 't1' } }],
        next: 'next-url',
        total: 150,
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [],
        next: null,
        total: 150,
      }));

    const tracks = await client.getAllPlaylistTracks('playlist-with-empty-next');
    expect(tracks).toHaveLength(1);
  });

  it('getPlaylistCreatedDate returns undefined (instead of crashing) on a non-array response.items', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      total: 0,
      // items is missing entirely
    }));

    const result = await client.getPlaylistCreatedDate('broken-playlist');
    expect(result).toBeUndefined();
  });

  it('getPlaylistTracks throws SpotifyApiError(400) for 4xx responses', async () => {
    fetchSpy.mockResolvedValue(errorResponse(400, { error: { status: 400, message: 'Bad request' } }));

    await expect(client.getPlaylistTracks('weird-playlist'))
      .rejects.toBeInstanceOf(SpotifyApiError);

    await expect(client.getPlaylistTracks('weird-playlist'))
      .rejects.toMatchObject({ status: 400 });
  });
});