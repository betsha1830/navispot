export interface NavidromePlaylist {
  id: string;
  name: string;
  comment?: string;
  songCount: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

export interface NavidromeCredentials {
  url: string;
  username: string;
  password: string;
}

export interface NavidromeApiConfig {
  baseUrl: string;
  authHeader: string;
}

export interface NavidromeNativeSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  artistId: string;
  albumId: string;
  duration: number;
  isrc?: string;
  year?: number;
  path?: string;
  trackNumber?: number;
  discNumber?: number;
  size?: number;
  suffix?: string;
  bitRate?: number;
  contentType?: string;
  createdAt?: string;
  updatedAt?: string;
  albumArtist?: string;
  albumArtistId?: string;
  genres?: string[];
  comment?: string;
  lyrics?: string;
  playCount?: number;
  playDate?: string;
  lastPlayedAt?: string;
  rating?: number;
  mediaType?: string;
}

export interface NavidromeNativeArtist {
  id: string;
  name: string;
  albumCount?: number;
  songCount?: number;
  fullText?: string;
  sortText?: string;
  coverArt?: string;
  albumGenre?: string;
  albums?: Array<{
    id: string;
    name: string;
    artist?: string;
    year?: number;
    coverArt?: string;
  }>;
  songGenres?: Array<{
    id: string;
    name: string;
    songCount: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface NavidromeNativeAlbum {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  year?: number;
  songCount?: number;
  duration?: number;
  coverArt?: string;
  genres?: string[];
  comment?: string;
  albumArtist?: string;
  albumArtistId?: string;
  createdAt?: string;
  updatedAt?: string;
  compilation?: boolean;
  maxYear?: number;
  mediaType?: string;
}

export interface SearchOptions {
  query?: string;
  artistId?: string;
  title?: string;
  albumId?: string;
  _start?: number;
  _end?: number;
  _sort?: string;
  _order?: 'ASC' | 'DESC';
}

export interface NavidromeSearchResponse {
  total: number;
  start: number;
  end: number;
  items: NavidromeNativeSong[];
}

export interface ArtistInfo {
  id: string;
  name: string;
  songCount: number;
  albumCount: number;
}

export interface NavidromeSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  isrc?: string[];
}
