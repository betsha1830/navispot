import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import type { NavidromeNativeSong } from '@/types/navidrome';

function makeSong(id: string): NavidromeNativeSong {
  return { id } as unknown as NavidromeNativeSong;
}

/**
 * Stubs fetch so that:
 *  - GET /api/playlist/:id → a minimal playlist object
 *  - GET /api/playlist/:id/tracks → one page of songs per call, honoring
 *    _start/_end pagination params
 */
function stubPaginatedTracks(playlistId: string, total: number, pageSize: number) {
  const calls: Array<{ start: number; end: number }> = [];
  const fetchStub = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input));
    if (url.pathname === `/api/playlist/${playlistId}`) {
      return Promise.resolve(new Response(JSON.stringify({ id: playlistId, name: 'p' }), { status: 200 }));
    }
    if (url.pathname === `/api/playlist/${playlistId}/tracks`) {
      const start = Number(url.searchParams.get('_start') ?? '0');
      const end = Number(url.searchParams.get('_end') ?? '0');
      calls.push({ start, end });
      const size = Math.min(pageSize, Math.max(0, total - start));
      const items = Array.from({ length: size }, (_, i) => makeSong(`song-${start + i}`));
      return Promise.resolve(new Response(JSON.stringify(items), { status: 200 }));
    }
    return Promise.resolve(new Response('[]', { status: 404 }));
  });
  return { fetchStub, calls };
}

describe('NavidromeApiClient.getPlaylist pagination', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', window.URL ?? URL);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeClient(): NavidromeApiClient {
    // Passing token + clientId makes _ensureAuthenticated a no-op, so no
    // login POST is needed.
    return new NavidromeApiClient(
      'http://navidrome.test',
      'user',
      'pass',
      'test-token',
      'test-client-id',
    );
  }

  it('fetches all tracks across multiple pages for playlists over one page', async () => {
    // 1200 songs, server returns at most 500 per request (page size = client limit).
    // The old implementation hard-capped _end at 1000 and truncated here.
    const { fetchStub, calls } = stubPaginatedTracks('pl-1', 1200, 500);
    vi.stubGlobal('fetch', fetchStub);

    const client = makeClient();
    const result = await client.getPlaylist('pl-1');

    expect(result.tracks).toHaveLength(1200);
    // 1200 songs / 500 per page = 3 requests (500, 500, 200)
    expect(calls).toHaveLength(3);
    expect(calls[0]).toEqual({ start: 0, end: 500 });
    expect(calls[1]).toEqual({ start: 500, end: 1000 });
    expect(calls[2]).toEqual({ start: 1000, end: 1500 });
    // No duplicates, ordered
    expect(result.tracks[0].id).toBe('song-0');
    expect(result.tracks[1199].id).toBe('song-1199');
  });

  it('stops after a short page without an extra request', async () => {
    const { fetchStub, calls } = stubPaginatedTracks('pl-2', 320, 500);
    vi.stubGlobal('fetch', fetchStub);

    const client = makeClient();
    const result = await client.getPlaylist('pl-2');

    expect(result.tracks).toHaveLength(320);
    expect(calls).toHaveLength(1);
  });

  it('returns empty tracks for an empty playlist with a single request', async () => {
    const { fetchStub, calls } = stubPaginatedTracks('pl-3', 0, 500);
    vi.stubGlobal('fetch', fetchStub);

    const client = makeClient();
    const result = await client.getPlaylist('pl-3');

    expect(result.tracks).toEqual([]);
    expect(calls).toHaveLength(1);
  });

  it('handles the { items } response envelope as well as bare arrays', async () => {
    // Some Navidrome endpoints return { items: [...] }; ensure the first-page
    // envelope shape works with pagination.
    const fetchStub = vi.fn((input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname === '/api/playlist/pl-4') {
        return Promise.resolve(new Response(JSON.stringify({ id: 'pl-4', name: 'p' }), { status: 200 }));
      }
      const start = Number(url.searchParams.get('_start') ?? '0');
      const size = Math.min(500, Math.max(0, 700 - start));
      const items = Array.from({ length: size }, (_, i) => makeSong(`s-${start + i}`));
      return Promise.resolve(
        new Response(JSON.stringify({ items }), { status: 200 }),
      );
    });
    vi.stubGlobal('fetch', fetchStub);

    const client = makeClient();
    const result = await client.getPlaylist('pl-4');

    expect(result.tracks).toHaveLength(700);
  });
});
