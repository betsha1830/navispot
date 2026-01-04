export interface NavidromeSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  isrc?: string;
}

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

export interface SubsonicResponse {
  status: string;
  version: string;
  type: string;
  serverVersion: string;
  error?: {
    code: number;
    message: string;
  };
}

export interface PlaylistItem {
  name: string;
  id: string;
  owner: string;
  public: boolean;
  songCount: number;
  duration: number;
  created: string;
  changed: string;
  comment?: string;
}

export interface PlaylistsResponse {
  playlists: {
    playlistList: PlaylistItem[];
  };
}

export interface CreatePlaylistRequest {
  name: string;
  songIds: string[];
}

export interface UpdatePlaylistRequest {
  playlistId: string;
  songIdsToAdd: string[];
  songIdsToRemove?: number[];
}

export interface SearchResponse {
  searchResult3: {
    song: NavidromeSong[];
  };
}

export interface SearchResult3 {
  artist?: Array<{
    id: string;
    name: string;
    albumCount?: number;
    coverArt?: string;
    userRating?: number;
    artistImageUrl?: string;
  }>;
  album?: Array<{
    id: string;
    name: string;
    artist?: string;
    year?: number;
    coverArt?: string;
    duration?: number;
    playCount?: number;
    songCount?: number;
    artistId?: string;
  }>;
  song: NavidromeSong[];
}
