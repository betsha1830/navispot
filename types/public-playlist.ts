import type { SpotifyTrack } from './spotify';

export interface ImportedPlaylist {
  id: string;
  name: string;
  owner: string;
  trackCount: number;
  imageUrl?: string;
  tracks: SpotifyTrack[];
  importedAt: string;
}

export interface PublicPlaylistResponse {
  playlist: ImportedPlaylist;
}

export type PublicPlaylistError =
  | { code: 'invalid_url'; message: string }
  | { code: 'private_or_missing'; message: string }
  | { code: 'spotify_error'; message: string; status: number }
  | { code: 'internal_error'; message: string };
