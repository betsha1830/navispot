import {
  NavidromePlaylist,
  NavidromeNativeSong,
  NavidromeNativeArtist,
  SearchOptions,
  NavidromeSearchResponse,
} from '../../types/navidrome';

export function generateAuthHeader(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

export function normalizeSearchQuery(query: string): string {
  return query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[''`´']/g, '')  // Remove various apostrophe characters
    .replace(/[^a-z0-9\s]/g, ' ')  // Replace special chars with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export class NavidromeApiClient {
  private baseUrl: string;
  private authHeader: string;
  private username: string;
  private password: string;
  private _ndToken: string;
  private _ndClientId: string;
  private _totalCount: number;

  constructor(url: string, username: string, password: string, ndToken?: string, ndClientId?: string) {
    this.baseUrl = url.replace(/\/$/, '');
    this.authHeader = generateAuthHeader(username, password);
    this.username = username;
    this.password = password;
    this._ndToken = ndToken ?? '';
    this._ndClientId = ndClientId ?? '';
    this._totalCount = 0;
  }

  async login(username: string, password: string): Promise<{
    success: boolean;
    token?: string;
    clientId?: string;
    isAdmin?: boolean;
    error?: string;
  }> {
    try {
      const url = `${this.baseUrl}/auth/login`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        return { success: false, error: `HTTP error: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      
      this._ndToken = data.token;
      this._ndClientId = data.id || '';
      
      return {
        success: true,
        token: data.token,
        clientId: data.id,
        isAdmin: data.isAdmin,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async _ensureAuthenticated(): Promise<void> {
    const hasToken = this._ndToken != null && this._ndToken.length > 0;
    const hasClientId = this._ndClientId != null && this._ndClientId.length > 0;
    if (hasToken && hasClientId) {
      return;
    }
    const result = await this.login(this.username, this.password);
    if (!result.success) {
      throw new Error(`Authentication failed: ${result.error}`);
    }
  }

  private _buildNativeUrl(endpoint: string, params: Record<string, string | number | undefined> = {}): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      searchParams.set(key, String(value));
    });

    const queryString = searchParams.toString();
    return queryString
      ? `${this.baseUrl}${endpoint}?${queryString}`
      : `${this.baseUrl}${endpoint}`;
  }

  private async _makeNativeRequest<T>(endpoint: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    await this._ensureAuthenticated();
    
    const url = this._buildNativeUrl(endpoint, params);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-nd-authorization': `Bearer ${this._ndToken}`,
      'x-nd-client-unique-id': `${this._ndClientId}`,
    };

    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    const totalCount = response.headers.get('x-total-count');
    if (totalCount) {
      this._totalCount = parseInt(totalCount, 10);
    }

    return response.json();
  }

  async ping(): Promise<{
    success: boolean;
    serverVersion?: string;
    error?: string;
  }> {
    try {
      await this._ensureAuthenticated();
      if (this._ndToken && this._ndClientId) {
        return { success: true, serverVersion: 'Navidrome (native API)' };
      }
      return { success: false, error: 'No token available' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPlaylists(): Promise<NavidromePlaylist[]> {
    const allPlaylists: NavidromePlaylist[] = [];
    let start = 0;
    const limit = 50;

    while (true) {
      const params: Record<string, string | number | undefined> = {
        _start: start,
        _end: start + limit,
        _sort: 'name',
        _order: 'ASC',
      };

      const response = await this._makeNativeRequest<{
        items: NavidromePlaylist[];
      }>('/api/playlist', params);

      if (response.items && response.items.length > 0) {
        allPlaylists.push(...response.items.map(this._mapPlaylist));
      }

      if (allPlaylists.length >= this._totalCount || !response.items || response.items.length === 0) {
        break;
      }

      start += limit;
    }

    return allPlaylists;
  }

  async getPlaylist(playlistId: string): Promise<{
    playlist: NavidromePlaylist;
    tracks: NavidromeNativeSong[];
  }> {
    const playlistResponse = await this._makeNativeRequest<NavidromePlaylist>(`/api/playlist/${playlistId}`);
    const playlist = this._mapPlaylist(playlistResponse);

    const tracksResponse = await this._makeNativeRequest<{
      items: NavidromeNativeSong[];
    }>(`/api/playlist/${playlistId}/tracks`, { _start: 0, _end: 1000 });

    return {
      playlist,
      tracks: tracksResponse.items || [],
    };
  }

  async createPlaylist(name: string, songIds: string[]): Promise<{
    id: string;
    success: boolean;
  }> {
    try {
      const createResponse = await fetch(`${this.baseUrl}/api/playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nd-authorization': `Bearer ${this._ndToken}`,
          'x-nd-client-unique-id': `${this._ndClientId}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!createResponse.ok) {
        return { success: false, id: '' };
      }

      const createData = await createResponse.json() as { id: string };
      const playlistId = createData.id;

      if (songIds.length > 0) {
        await fetch(`${this.baseUrl}/api/playlist/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-nd-authorization': `Bearer ${this._ndToken}`,
            'x-nd-client-unique-id': `${this._ndClientId}`,
          },
          body: JSON.stringify({ ids: songIds }),
        });
      }

      return { success: true, id: playlistId };
    } catch {
      return { success: false, id: '' };
    }
  }

  async updatePlaylist(
    playlistId: string,
    songIdsToAdd: string[],
    songIdsToRemove?: number[]
  ): Promise<{ success: boolean }> {
    try {
      if (songIdsToAdd.length > 0) {
        await fetch(`${this.baseUrl}/api/playlist/${playlistId}/tracks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-nd-authorization': `Bearer ${this._ndToken}`,
            'x-nd-client-unique-id': `${this._ndClientId}`,
          },
          body: JSON.stringify({ ids: songIdsToAdd }),
        });
      }

      if (songIdsToRemove && songIdsToRemove.length > 0) {
        const removeParams = songIdsToRemove.map((id) => `id=${id + 1}`).join('&');
        await fetch(`${this.baseUrl}/api/playlist/${playlistId}/tracks?${removeParams}`, {
          method: 'DELETE',
          headers: {
            'x-nd-authorization': `Bearer ${this._ndToken}`,
            'x-nd-client-unique-id': `${this._ndClientId}`,
          },
        });
      }

      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async replacePlaylistSongs(playlistId: string, newSongIds: string[]): Promise<{ success: boolean }> {
    try {
      const playlistData = await this.getPlaylist(playlistId);
      const entryIdsToRemove = playlistData.tracks.map((_, index) => index);

      await this.updatePlaylist(playlistId, newSongIds, entryIdsToRemove);
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  async searchByQuery(query: string, options?: SearchOptions): Promise<NavidromeNativeSong[]> {
    const allSongs: NavidromeNativeSong[] = [];
    let start = options?._start || 0;
    const end = options?._end || 50;
    const limit = end - start;

    while (true) {
      const params: Record<string, string | number | undefined> = {
        _start: start,
        _end: start + limit,
      };

      if (options?.artistId) {
        params.artist_id = options.artistId;
      }
      if (options?.title) {
        params.title = options.title;
      }
      if (options?.albumId) {
        params.album_id = options.albumId;
      }
      if (options?._sort) {
        params._sort = options._sort;
      }
      if (options?._order) {
        params._order = options._order;
      }

      const response = await this._makeNativeRequest<NavidromeSearchResponse>('/api/song', params);
      
      if (response.items && response.items.length > 0) {
        allSongs.push(...response.items);
      }

      if (allSongs.length >= this._totalCount || !response.items || response.items.length === 0) {
        break;
      }

      start += limit;
    }

    return allSongs;
  }

  async getAllSongsByArtist(artistId: string): Promise<NavidromeNativeSong[]> {
    return this.searchByQuery('', { artistId });
  }

  async searchByTitle(title: string, limit?: number): Promise<NavidromeNativeSong[]> {
    const end = limit || 50;
    return this.searchByQuery('', { title, _start: 0, _end: end });
  }

  async getArtistByName(artistName: string): Promise<NavidromeNativeArtist | null> {
    try {
      const params: Record<string, string | number | undefined> = {
        name: artistName,
        _start: 0,
        _end: 1,
      };

      const response = await this._makeNativeRequest<{
        items: NavidromeNativeArtist[];
      }>('/api/artist', params);

      if (response.items && response.items.length > 0) {
        return response.items[0];
      }

      return null;
    } catch {
      return null;
    }
  }

  async getArtist(artistId: string): Promise<NavidromeNativeArtist> {
    const response = await this._makeNativeRequest<NavidromeNativeArtist>(`/api/artist/${artistId}`);
    return response;
  }

  async getSong(songId: string): Promise<NavidromeNativeSong> {
    const response = await this._makeNativeRequest<NavidromeNativeSong>(`/api/song/${songId}`);
    return response;
  }

  getToken(): string {
    return this._ndToken;
  }

  getClientId(): string {
    return this._ndClientId;
  }

  private _mapPlaylist(item: NavidromePlaylist): NavidromePlaylist {
    return {
      id: item.id,
      name: item.name,
      comment: item.comment,
      songCount: item.songCount,
      duration: item.duration,
      createdAt: item.createdAt || '',
      updatedAt: item.updatedAt || '',
    };
  }
}

export default NavidromeApiClient;
