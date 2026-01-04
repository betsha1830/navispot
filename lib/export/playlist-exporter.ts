import { NavidromeApiClient } from '@/lib/navidrome/client';
import { TrackMatch } from '@/types/matching';

export type ExportMode = 'create' | 'append' | 'overwrite';

export interface ExportProgress {
  current: number;
  total: number;
  percent: number;
  currentTrack?: string;
  status: 'preparing' | 'exporting' | 'completed' | 'failed';
}

export type ProgressCallback = (progress: ExportProgress) => void | Promise<void>;

export interface ExportError {
  trackName: string;
  artistName: string;
  reason: string;
}

export interface ExportResult {
  success: boolean;
  playlistId?: string;
  playlistName: string;
  mode: ExportMode;
  statistics: {
    total: number;
    exported: number;
    failed: number;
    skipped: number;
  };
  errors: ExportError[];
  duration: number;
}

export interface PlaylistExporterOptions {
  mode?: ExportMode;
  existingPlaylistId?: string;
  skipUnmatched?: boolean;
  onProgress?: ProgressCallback;
}

export interface PlaylistExporter {
  exportPlaylist(
    playlistName: string,
    matches: TrackMatch[],
    options?: PlaylistExporterOptions
  ): Promise<ExportResult>;
  createPlaylist(name: string, songIds: string[]): Promise<{ id: string; success: boolean }>;
  appendToPlaylist(playlistId: string, songIds: string[]): Promise<{ success: boolean }>;
  overwritePlaylist(playlistId: string, songIds: string[]): Promise<{ success: boolean }>;
}

export class DefaultPlaylistExporter implements PlaylistExporter {
  private navidromeClient: NavidromeApiClient;

  constructor(navidromeClient: NavidromeApiClient) {
    this.navidromeClient = navidromeClient;
  }

  async exportPlaylist(
    playlistName: string,
    matches: TrackMatch[],
    options: PlaylistExporterOptions = {}
  ): Promise<ExportResult> {
    const startTime = Date.now();
    const mode = options.mode ?? 'create';
    const skipUnmatched = options.skipUnmatched ?? false;
    const onProgress = options.onProgress;

    const errors: ExportError[] = [];
    let exported = 0;
    let skipped = 0;
    const failed = 0;
    let playlistId: string | undefined;

    const matchedTracks = matches.filter((m) => m.status === 'matched' && m.navidromeSong);

    if (onProgress) {
      await onProgress({
        current: 0,
        total: matchedTracks.length,
        percent: 0,
        status: 'preparing',
      });
    }

    if (matchedTracks.length === 0) {
      return {
        success: true,
        playlistName,
        mode,
        statistics: {
          total: matches.length,
          exported: 0,
          failed: 0,
          skipped: matches.length,
        },
        errors: [],
        duration: Date.now() - startTime,
      };
    }

    try {
      switch (mode) {
        case 'create': {
          const songIds = matchedTracks.map((m) => m.navidromeSong!.id);
          const createResult = await this.createPlaylist(playlistName, songIds);
          playlistId = createResult.id;
          exported = createResult.success ? songIds.length : 0;
          break;
        }
        case 'append': {
          if (!options.existingPlaylistId) {
            throw new Error('existingPlaylistId is required for append mode');
          }
          const songIds = matchedTracks.map((m) => m.navidromeSong!.id);
          const result = await this.appendToPlaylist(options.existingPlaylistId, songIds);
          exported = result.success ? songIds.length : 0;
          playlistId = options.existingPlaylistId;
          break;
        }
        case 'overwrite': {
          if (!options.existingPlaylistId) {
            throw new Error('existingPlaylistId is required for overwrite mode');
          }
          const songIds = matchedTracks.map((m) => m.navidromeSong!.id);
          const result = await this.overwritePlaylist(options.existingPlaylistId, songIds);
          exported = result.success ? songIds.length : 0;
          playlistId = options.existingPlaylistId;
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({
        trackName: 'N/A',
        artistName: 'N/A',
        reason: `Failed to ${mode} playlist: ${errorMessage}`,
      });
    }

    const unmatched = matches.filter((m) => m.status !== 'matched' || !m.navidromeSong);
    skipped = skipUnmatched ? unmatched.length : 0;

    if (onProgress) {
      await onProgress({
        current: matchedTracks.length,
        total: matchedTracks.length,
        percent: 100,
        status: exported > 0 || skipped > 0 ? 'completed' : 'failed',
      });
    }

    const success = errors.length === 0 && exported > 0;

    return {
      success,
      playlistId,
      playlistName,
      mode,
      statistics: {
        total: matches.length,
        exported,
        failed,
        skipped,
      },
      errors,
      duration: Date.now() - startTime,
    };
  }

  async createPlaylist(name: string, songIds: string[]): Promise<{ id: string; success: boolean }> {
    const result = await this.navidromeClient.createPlaylist(name, songIds);
    return {
      id: result.id,
      success: result.success,
    };
  }

  async appendToPlaylist(playlistId: string, songIds: string[]): Promise<{ success: boolean }> {
    const result = await this.navidromeClient.updatePlaylist(playlistId, songIds);
    return {
      success: result.success,
    };
  }

  async overwritePlaylist(playlistId: string, songIds: string[]): Promise<{ success: boolean }> {
    const result = await this.navidromeClient.replacePlaylistSongs(playlistId, songIds);
    return {
      success: result.success,
    };
  }
}

export function createPlaylistExporter(navidromeClient: NavidromeApiClient): PlaylistExporter {
  return new DefaultPlaylistExporter(navidromeClient);
}

export default createPlaylistExporter;
