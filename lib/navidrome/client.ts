import {
  NavidromePlaylist,
  NavidromeSong,
  SearchResult3,
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

  constructor(url: string, username: string, password: string) {
    this.baseUrl = url.replace(/\/$/, '');
    this.authHeader = generateAuthHeader(username, password);
    this.username = username;
    this.password = password;
  }

  async ping(): Promise<{
    success: boolean;
    serverVersion?: string;
    error?: string;
  }> {
    try {
      const url = this._buildUrl('/rest/ping', {
        u: this.username,
        p: this.password,
        v: '1.16.1',
        c: 'navispot-plist',
      });
      const response = await this._makeRequest<Record<string, unknown>>(url);
      
      const responseData = (response as Record<string, unknown>)['subsonic-response'] || response;
      
      if ((responseData as { status?: string }).status === 'ok') {
        return { success: true, serverVersion: (responseData as { serverVersion?: string }).serverVersion };
      }
      
      return { success: false, error: 'Ping failed' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private _getAuthParams(): Record<string, string> {
    return {
      u: this.username,
      p: this.password,
      v: '1.16.1',
      c: 'navispot-plist',
    };
  }

  async getPlaylists(): Promise<NavidromePlaylist[]> {
    const url = this._buildUrl('/rest/getPlaylists', this._getAuthParams());
    const response = await this._makeRequest<{
      playlists: { playlist: NavidromePlaylist[] };
    }>(url);

    if (!response.playlists?.playlist) {
      return [];
    }

    return response.playlists.playlist.map(this._mapPlaylist);
  }

  async getPlaylist(playlistId: string): Promise<{
    playlist: NavidromePlaylist;
    tracks: NavidromeSong[];
  }> {
    const url = this._buildUrl('/rest/getPlaylist', { ...this._getAuthParams(), id: playlistId });
    const response = await this._makeRequest<{
      playlist: NavidromePlaylist;
      playlistEntry: NavidromeSong[];
    }>(url);

    return {
      playlist: this._mapPlaylist(response.playlist),
      tracks: response.playlistEntry || [],
    };
  }

  async createPlaylist(name: string, songIds: string[]): Promise<{
    id: string;
    success: boolean;
  }> {
    const params: Record<string, string | string[]> = { ...this._getAuthParams(), name };
    if (songIds.length > 0) {
      params.songId = songIds;
    }

    const url = this._buildUrl('/rest/createPlaylist', params);
    const response = await this._makeRequest<{
      status: string;
      playlistId?: string;
    }>(url);

    return {
      id: response.playlistId || '',
      success: response.status === 'ok',
    };
  }

  async updatePlaylist(
    playlistId: string,
    songIdsToAdd: string[],
    songIdsToRemove?: number[]
  ): Promise<{ success: boolean }> {
    const params: Record<string, string | string[]> = { ...this._getAuthParams(), id: playlistId };
    
    if (songIdsToAdd.length > 0) {
      params.songIdToAdd = songIdsToAdd;
    }
    
    if (songIdsToRemove && songIdsToRemove.length > 0) {
      params.songIdToRemove = songIdsToRemove.map(String);
    }

    const url = this._buildUrl('/rest/updatePlaylist', params);
    const response = await this._makeRequest<{ status: string }>(url);

    return { success: response.status === 'ok' };
  }

  async replacePlaylistSongs(playlistId: string, newSongIds: string[]): Promise<{ success: boolean }> {
    const playlistData = await this.getPlaylist(playlistId);
    const entryIdsToRemove = playlistData.tracks.map((_, index) => index + 1);

    const params: Record<string, string | string[]> = { ...this._getAuthParams(), id: playlistId };
    
    if (newSongIds.length > 0) {
      params.songIdToAdd = newSongIds;
    }
    
    if (entryIdsToRemove.length > 0) {
      params.songIdToRemove = entryIdsToRemove.map(String);
    }

    const url = this._buildUrl('/rest/updatePlaylist', params);
    const response = await this._makeRequest<{ status: string }>(url);

    return { success: response.status === 'ok' };
  }

  async search(query: string, options?: {
    songCount?: number;
    artistCount?: number;
    albumCount?: number;
    songOffset?: number;
    artistOffset?: number;
    albumOffset?: number;
  }): Promise<NavidromeSong[]> {
    const normalizedQuery = normalizeSearchQuery(query);
    
    const params: Record<string, string | string[]> = { ...this._getAuthParams(), query: normalizedQuery };

    if (options?.songCount !== undefined) {
      params.songCount = String(options.songCount);
    }
    if (options?.artistCount !== undefined) {
      params.artistCount = String(options.artistCount);
    }
    if (options?.albumCount !== undefined) {
      params.albumCount = String(options.albumCount);
    }
    if (options?.songOffset !== undefined) {
      params.songOffset = String(options.songOffset);
    }
    if (options?.artistOffset !== undefined) {
      params.artistOffset = String(options.artistOffset);
    }
    if (options?.albumOffset !== undefined) {
      params.albumOffset = String(options.albumOffset);
    }

    const url = this._buildUrl('/rest/search3', params);
    const response = await this._makeRequest<{
      'subsonic-response': { searchResult3: SearchResult3 };
    }>(url);

    return response['subsonic-response']?.searchResult3?.song || [];
  }

  private _buildUrl(
    endpoint: string,
    params: Record<string, string | string[] | undefined>
  ): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.set(key, value);
      }
    });

    searchParams.set('f', 'json');

    const queryString = searchParams.toString();
    return queryString
      ? `${this.baseUrl}${endpoint}?${queryString}`
      : `${this.baseUrl}${endpoint}`;
  }

  private async _makeRequest<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
