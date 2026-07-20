import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpotifyClient } from '@/lib/spotify/client';
import { SpotifyToken } from '@/types';

const validToken: SpotifyToken = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresAt: Date.now() + 3600 * 1000,
  tokenType: 'Bearer',
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('SpotifyClient playlist endpoint (regression for #21)', () => {
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

  it('getPlaylistTracks calls /playlists/{id}/tracks (not /items)', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({
      items: [],
      next: null,
      total: 0,
    }));

    await client.getPlaylistTracks('playlist-123', 100, 0);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain('/playlists/playlist-123/tracks');
    expect(url).not.toContain('/items');
  });

  it('getAllPlaylistTracks paginates with /tracks across multiple pages', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({
        items: [{ track: { id: 't1' } }],
        next: 'next-url',
        total: 150,
      }))
      .mockResolvedValueOnce(jsonResponse({
        items: [{ track: { id: 't2' } }],
        next: null,
        total: 150,
      }));

    const tracks = await client.getAllPlaylistTracks('playlist-456');

    expect(tracks).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    for (const call of fetchSpy.mock.calls) {
      const url = call[0] as string;
      expect(url).toContain('/playlists/playlist-456/tracks');
      expect(url).not.toContain('/items');
    }
  });

  it('getPlaylistCreatedDate uses /tracks for both first and last page', async () => {
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
      expect(url).toContain('/playlists/playlist-789/tracks');
      expect(url).not.toContain('/items');
    }
  });
});