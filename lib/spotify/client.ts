import { SpotifyPlaylistsResponse, SpotifyTracksResponse, SpotifyUser, SpotifyToken, SpotifyPlaylist, SpotifyPlaylistTrack, SpotifySavedTracksResponse, SpotifySavedTrack } from '@/types';
import { encryptToken, decryptToken, isTokenExpired } from './token-storage';
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

  async getPlaylists(limit: number = 50, offset: number = 0, signal?: AbortSignal): Promise<SpotifyPlaylistsResponse> {
    await spotifyRateLimiter.acquire();
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const response = await this.fetch(`/me/playlists?${params.toString()}`, signal);
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

  async getSavedTracks(limit: number = 50, offset: number = 0, signal?: AbortSignal): Promise<SpotifySavedTracksResponse> {
    await spotifyRateLimiter.acquire();
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    const response = await this.fetch(`/me/tracks?${params.toString()}`, signal);
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

  async getSavedTracksCount(signal?: AbortSignal): Promise<number> {
    await spotifyRateLimiter.acquire();
    const response = await this.fetch('/me/tracks?limit=1', signal);
    const data: SpotifySavedTracksResponse = await response.json();
    return data.total;
  }

  async getAllPlaylists(signal?: AbortSignal): Promise<SpotifyPlaylist[]> {
    const allPlaylists: SpotifyPlaylist[] = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const response = await this.getPlaylists(limit, offset, signal);
      allPlaylists.push(...response.items);

      if (!response.next) break;
      offset += limit;
    }

    return allPlaylists;
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
      await this.persistToken(newToken);
      return newToken;
    } catch {
      return null;
    }
  }

  private async fetch(endpoint: string, signal?: AbortSignal, options: RequestInit = {}): Promise<Response> {
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
        return this.fetch(endpoint, signal, options);
      }
    }

    return response;
  }

  async persistToken(token: SpotifyToken): Promise<void> {
    const encrypted = await encryptToken(token);
    localStorage.setItem('spotify_token', encrypted);
  }

  async loadToken(): Promise<SpotifyToken | null> {
    const encrypted = localStorage.getItem('spotify_token');
    if (!encrypted) return null;

    const token = await decryptToken(encrypted);
    if (token && isTokenExpired(token)) {
      const refreshed = await this.refreshAccessToken();
      return refreshed;
    }

    this.token = token;
    return token;
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('spotify_token');
  }
}

export const spotifyClient = new SpotifyClient();
