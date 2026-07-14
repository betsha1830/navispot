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
  mediaFileId?: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  duration: number;
  year?: number;
  date?: string;
  path?: string;
  trackNumber?: number;
  discNumber?: number;
  size?: number;
  suffix?: string;
  bitRate?: number;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  genre?: string;
  genres?: Array<{ id: string; name: string }>;
  orderTitle?: string;
  orderAlbumName?: string;
  orderArtistName?: string;
  compilation?: boolean;
  lyrics?: string;
  isrc?: string[];
  tags?: {
    isrc?: string[];
    genre?: string[];
    copyright?: string[];
    disctotal?: string[];
    tracktotal?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
  starred?: boolean;
  starredAt?: string;
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
