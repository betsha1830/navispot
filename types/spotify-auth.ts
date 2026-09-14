export interface SpotifyToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
  scope?: string;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: { url: string }[];
  country?: string;
  product?: string;
}

export const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
];
