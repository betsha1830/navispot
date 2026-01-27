import { TrackMatch } from '@/types/matching';

export interface FavoritesExportProgress {
  current: number;
  total: number;
  percent: number;
  currentTrack?: string;
  status: 'preparing' | 'exporting' | 'completed' | 'failed';
}

export type ProgressCallback = (progress: FavoritesExportProgress) => void | Promise<void>;

export interface FavoritesExportError {
  trackName: string;
  artistName: string;
  reason: string;
}

export interface FavoritesExportResult {
  success: boolean;
  statistics: {
    total: number;
    starred: number;
    failed: number;
    skipped: number;
  };
  errors: FavoritesExportError[];
  duration: number;
}

export interface FavoritesExporterOptions {
  skipUnmatched?: boolean;
  onProgress?: ProgressCallback;
  signal?: AbortSignal;
}

export interface FavoritesExporter {
  exportFavorites(
    matches: TrackMatch[],
    options?: FavoritesExporterOptions
  ): Promise<FavoritesExportResult>;
  starSong(songId: string, signal?: AbortSignal): Promise<{ success: boolean }>;
  starSongs(songIds: string[], signal?: AbortSignal): Promise<{ success: boolean; failedIds: string[] }>;
}
