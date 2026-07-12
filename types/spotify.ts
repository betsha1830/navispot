export interface SpotifyTrack {
  id: string | null;
  name: string;
  uri?: string;
  is_local?: boolean;
  artists: { id: string | null; name: string }[];
  album: { id: string | null; name: string; release_date?: string };
  duration_ms: number;
  external_ids: { isrc?: string };
  external_urls?: { spotify: string };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  owner: { id: string; display_name: string };
  items: { total: number };
  snapshot_id: string;
  public: boolean | null;
}

export interface SpotifyPlaylistTrack {
  track: SpotifyTrack | null;
  added_at: string;
  added_by?: {
    id: string;
    display_name: string;
  };
}

export interface SpotifyPlaylistEntry {
  track: SpotifyTrack;
  trackKey: string;
  entryKey: string;
  position: number;
}

export interface SpotifyPlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  next?: string;
  previous?: string;
  offset: number;
  limit: number;
}

export interface SpotifyTracksResponse {
  items: SpotifyPlaylistTrack[];
  total: number;
  next?: string;
  offset: number;
  limit: number;
}

export interface SpotifySavedTrack {
  added_at: string;
  track: SpotifyTrack;
}

export interface SpotifySavedTracksResponse {
  href: string;
  items: SpotifySavedTrack[];
  limit: number;
  next?: string;
  previous?: string;
  offset: number;
  total: number;
}
