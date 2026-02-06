export interface PlaylistTableItem {
  id: string;
  name: string;
  images: { url: string }[];
  owner: { display_name: string };
  tracks: { total: number };
  snapshot_id: string;
  isLikedSongs: boolean;
  selected: boolean;
  exportStatus: 'none' | 'exported' | 'out-of-sync';
  navidromePlaylistId?: string;
  lastExportedAt?: string;
  public?: boolean | null;
  createdAt?: string;
}

export interface ExportMetadata {
  spotifyPlaylistId: string;
  navidromePlaylistId?: string;
  spotifySnapshotId: string;
  exportedAt: string;
  trackCount: number;
}

export interface TableState {
  sortColumn: 'name' | 'tracks' | 'owner';
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  filters: {
    status: 'all' | 'selected' | 'not-selected' | 'exported' | 'not-exported';
    source: 'all' | 'liked-songs' | 'playlists';
    owner: string;           // '' = all, or specific owner display_name
    visibility: 'all' | 'public' | 'private';
    dateAfter: string;       // ISO date string or '' for no filter
    dateBefore: string;      // ISO date string or '' for no filter
  };
  selectedIds: Set<string>;
}

export type ExportStatus = 'none' | 'exported' | 'out-of-sync';

export function getExportStatusBadgeColor(status: ExportStatus): string {
  switch (status) {
    case 'exported':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'out-of-sync':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getExportStatusLabel(status: ExportStatus): string {
  switch (status) {
    case 'exported':
      return 'Exported';
    case 'out-of-sync':
      return 'Out of Sync';
    default:
      return 'Not Exported';
  }
}

export interface PlaylistInfo {
  name: string;
  trackCount: number;
}
