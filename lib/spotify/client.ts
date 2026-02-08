import { SpotifyPlaylistsResponse, SpotifyTracksResponse, SpotifyUser, SpotifyToken, SpotifyPlaylist, SpotifyPlaylistTrack, SpotifySavedTracksResponse, SpotifySavedTrack } from '@/types';
import { isTokenExpired } from './token-storage';
import { SPOTIFY_STORAGE_KEY } from '@/types/auth-context';
import { spotifyRateLimiter } from './rate-limiter';

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
   * Uses the Spotify fields filter to minimize payload — only fetches added_at.
   * Returns the earliest date as an ISO string, or undefined if no tracks.
   */
  async getPlaylistCreatedDate(playlistId: string, signal?: AbortSignal): Promise<string | undefined> {
    await spotifyRateLimiter.acquire();
    const fields = 'items(added_at),total,next';
    let earliest: string | undefined;
    let offset = 0;
    const limit = 100;

    // Fetch all pages to find the true earliest added_at
    while (true) {
      const params = new URLSearchParams({
        fields,
        limit: limit.toString(),
        offset: offset.toString(),
      });
      const response = await this.fetch(`/playlists/${playlistId}/tracks?${params.toString()}`, signal);
      const data = await response.json();

      for (const item of data.items || []) {
        if (item.added_at) {
          if (!earliest || item.added_at < earliest) {
            earliest = item.added_at;
          }
        }
      }

      if (!data.next) break;
      offset += limit;
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

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.token.refreshToken }),
      });

      if (!response.ok) return null;

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
      return null;
    }
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

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      ...options,
      signal,
      headers: {
        Authorization: `Bearer ${this.token.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.fetch(endpoint, signal, options, bypassCache);
      }
    }

    return response;
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
