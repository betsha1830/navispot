import { SpotifyPlaylistsResponse, SpotifyTracksResponse, SpotifyUser, SpotifyToken, SpotifyPlaylist, SpotifyPlaylistTrack, SpotifySavedTracksResponse, SpotifySavedTrack, SpotifyPlaylistEntry } from '@/types';
import { isTokenExpired } from './token-storage';
import { SPOTIFY_STORAGE_KEY } from '@/types/auth-context';
import { spotifyRateLimiter, backgroundRateLimiter } from './rate-limiter';
import { normalizeEntries } from './track-identity';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export class SpotifyClient {
  private token: SpotifyToken | null = null;

  setToken(token: SpotifyToken): void {
    this.token = token;
  }

  getToken(): SpotifyToken | null {
    return this.token;
  }

  async getCurrentUser(signal?: AbortSignal): Promise<SpotifyUser> {
    await spotifyRateLimiter.acquire();
    const response = await this.fetch('/me', signal);
    return response.json();
  }

  async getPlaylists(limit: number = 50, offset: number = 0, signal?: AbortSignal, bypassCache: boolean = false): Promise<SpotifyPlaylistsResponse> {
    await spotifyRateLimiter.acquire();
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (bypassCache) {
      params.append('_t', Date.now().toString());
    }
    const response = await this.fetch(`/me/playlists?${params.toString()}`, signal, {}, bypassCache);
    return response.json();
  }

  async getPlaylistTracks(playlistId: string, limit: number = 100, offset: number = 0, signal?: AbortSignal): Promise<SpotifyTracksResponse> {
    await spotifyRateLimiter.acquire();
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const response = await this.fetch(`/playlists/${playlistId}/tracks?${params.toString()}`, signal);
    return response.json();
  }

  async getAllPlaylistTracks(playlistId: string, signal?: AbortSignal): Promise<SpotifyPlaylistTrack[]> {
    const allTracks: SpotifyPlaylistTrack[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.getPlaylistTracks(playlistId, limit, offset, signal);
      allTracks.push(...response.items);

      if (!response.next) break;
      offset += limit;
    }

    return allTracks;
  }

  async getAllPlaylistEntries(playlistId: string, snapshotId: string, signal?: AbortSignal): Promise<SpotifyPlaylistEntry[]> {
    const playlistTracks = await this.getAllPlaylistTracks(playlistId, signal);
    const tracks = playlistTracks
      .filter((item) => item.track != null)
      .map((item) => item.track!);
    return normalizeEntries(tracks, snapshotId);
  }

  async getSavedTracks(limit: number = 50, offset: number = 0, signal?: AbortSignal, bypassCache: boolean = false): Promise<SpotifySavedTracksResponse> {
    await spotifyRateLimiter.acquire();
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (bypassCache) {
      params.append('_t', Date.now().toString());
    }
    const response = await this.fetch(`/me/tracks?${params.toString()}`, signal, {}, bypassCache);
    return response.json();
  }

  async getAllSavedTracks(signal?: AbortSignal): Promise<SpotifySavedTrack[]> {
    const allTracks: SpotifySavedTrack[] = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const response = await this.getSavedTracks(limit, offset, signal);
      allTracks.push(...response.items);

      if (!response.next) break;
      offset += limit;
    }

    return allTracks;
  }

  async getSavedTracksCount(signal?: AbortSignal, bypassCache: boolean = false): Promise<number> {
    await spotifyRateLimiter.acquire();
    const url = bypassCache ? `/me/tracks?limit=1&_t=${Date.now()}` : '/me/tracks?limit=1';
    const response = await this.fetch(url, signal, {}, bypassCache);
    const data: SpotifySavedTracksResponse = await response.json();
    return data.total;
  }

  async getAllPlaylists(signal?: AbortSignal, bypassCache: boolean = false): Promise<SpotifyPlaylist[]> {
    const allPlaylists: SpotifyPlaylist[] = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const response = await this.getPlaylists(limit, offset, signal, bypassCache);
      allPlaylists.push(...response.items);

      if (!response.next) break;
      offset += limit;
    }

    return allPlaylists;
  }

  /**
   * Fetches the earliest `added_at` date from a playlist's tracks.
   * Spotify returns tracks newest-first, so the earliest date is on the last
   * page.  We fetch only the final page (and, for very small playlists, the
   * first page when total ≤ 100) — a fixed 1-2 requests instead of paginating
   * through every page.
   */
  async getPlaylistCreatedDate(playlistId: string, signal?: AbortSignal): Promise<string | undefined> {
    await backgroundRateLimiter.acquire();
    const fields = 'items(added_at),total';
    const limit = 100;

    // Fetch first page to get the total and the first page's dates
    const firstResponse = await this.fetch(
      `/playlists/${playlistId}/tracks?fields=${fields}&limit=${limit}&offset=0`,
      signal,
    );
    const firstData = await firstResponse.json();
    const total: number = firstData.total || 0;

    let earliest: string | undefined;
    for (const item of firstData.items || []) {
      if (item.added_at) {
        if (!earliest || item.added_at < earliest) {
          earliest = item.added_at;
        }
      }
    }

    // If everything fits in one page, we're done
    if (total <= limit) return earliest;

    // Jump to the last page (newest-first → oldest tracks are at the end).
    // Skip if the offset lands on the page we already fetched.
    const lastOffset = total - limit;
    if (lastOffset <= 0) return earliest;
    await backgroundRateLimiter.acquire();
    const lastResponse = await this.fetch(
      `/playlists/${playlistId}/tracks?fields=${fields}&limit=${limit}&offset=${lastOffset}`,
      signal,
    );
    const lastData = await lastResponse.json();

    for (const item of lastData.items || []) {
      if (item.added_at) {
        if (!earliest || item.added_at < earliest) {
          earliest = item.added_at;
        }
      }
    }

    return earliest;
  }

  /**
   * Fetches the created date (earliest added_at) for multiple playlists.
   * Processes playlists sequentially to respect rate limits.
   * Returns a Map of playlistId → earliest ISO date string.
   */
  async getPlaylistCreatedDates(
    playlistIds: string[],
    signal?: AbortSignal,
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();

    for (let i = 0; i < playlistIds.length; i++) {
      if (signal?.aborted) break;

      try {
        const createdDate = await this.getPlaylistCreatedDate(playlistIds[i], signal);
        if (createdDate) {
          result.set(playlistIds[i], createdDate);
        }
      } catch {
        // Skip playlists that fail (e.g., deleted or access revoked)
      }

      onProgress?.(i + 1, playlistIds.length);
    }

    return result;
  }

  async refreshAccessToken(): Promise<SpotifyToken | null> {
    if (!this.token?.refreshToken) return null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: this.token.refreshToken }),
        });

        if (!response.ok) {
          if (response.status === 400) return null;
          throw new Error(`Refresh failed: ${response.status}`);
        }

        const data = await response.json();
        const newToken: SpotifyToken = {
          accessToken: data.access_token,
          refreshToken: this.token.refreshToken,
          expiresAt: Date.now() + data.expires_in * 1000,
          tokenType: data.token_type,
          scope: data.scope,
        };

        this.setToken(newToken);
        
        const stored = localStorage.getItem(SPOTIFY_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.token = newToken;
          localStorage.setItem(SPOTIFY_STORAGE_KEY, JSON.stringify(parsed));
        }
        
        return newToken;
      } catch {
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    return null;
  }

  private async fetch(endpoint: string, signal?: AbortSignal, options: RequestInit = {}, bypassCache: boolean = false): Promise<Response> {
    if (!this.token) {
      this.token = this.loadTokenFromStorage();
    }

    if (!this.token) {
      throw new Error('No access token available');
    }

    if (isTokenExpired(this.token)) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        throw new Error('Token expired and refresh failed');
      }
    }

    const fetchOptions: RequestInit = {
      ...options,
      signal,
      headers: {
        Authorization: `Bearer ${this.token.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (bypassCache) {
      fetchOptions.cache = 'no-store';
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, fetchOptions);

      if (response.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          return this.fetch(endpoint, signal, options, bypassCache);
        }
        throw new Error('Token expired and refresh failed');
      }

      if (response.status >= 500 && response.status < 600) {
        lastError = new Error(`Spotify API error: ${response.status}`);
        if (attempt < 2) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw lastError;
      }

      return response;
    }

    throw lastError || new Error('Spotify API request failed');
  }

  clearToken(): void {
    this.token = null;
  }

  private loadTokenFromStorage(): SpotifyToken | null {
    const stored = localStorage.getItem(SPOTIFY_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return parsed.token || null;
  }
}

export const spotifyClient = new SpotifyClient();
