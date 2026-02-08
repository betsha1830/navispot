export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string; release_date: string };
  duration_ms: number;
  external_ids: { isrc?: string };
  external_urls: { spotify: string };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  owner: { id: string; display_name: string };
  tracks: { total: number };
  snapshot_id: string;
  public: boolean | null;
}

export interface SpotifyPlaylistTrack {
  track: SpotifyTrack;
  added_at: string;
  added_by: {
    id: string;
    display_name: string;
  };
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
