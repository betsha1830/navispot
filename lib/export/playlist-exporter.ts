import { NavidromeApiClient, parseExportMetadata } from '@/lib/navidrome/client';
import { TrackMatch } from '@/types/matching';
import {
  PlaylistExportData,
  PlaylistExportDataV2,
  TrackExportStatus,
  savePlaylistExportData,
} from './track-export-cache';
import { trackKey as getTrackKey } from '@/lib/spotify/track-identity';

export type ExportMode = 'create' | 'append' | 'overwrite' | 'update';

interface PlaylistExportDataLocal {
  spotifyPlaylistId: string;
  spotifySnapshotId: string;
  playlistName: string;
  navidromePlaylistId?: string;
  exportedAt: string;
  trackCount: number;
  tracks: Record<string, TrackExportStatus>;
  statistics: {
    total: number;
    matched: number;
    unmatched: number;
    ambiguous: number;
  };
}

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
  cachedData?: PlaylistExportDataLocal | PlaylistExportData | PlaylistExportDataV2;
  signal?: AbortSignal;
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
    const { signal } = options;

    const errors: ExportError[] = [];
    let exported = 0;
    const failed = 0;
    let skipped = 0;
    let playlistId: string | undefined;

    const checkAbort = () => {
      if (signal?.aborted) {
        throw new DOMException('Export was cancelled', 'AbortError');
      }
    };

    const matchedTracks = matches.filter((m) => m.status === 'matched' && m.navidromeSong);
    const unmatchedCount = matches.filter((m) => m.status !== 'matched' || !m.navidromeSong).length;

    skipped = skipUnmatched ? unmatchedCount : 0;

    if (onProgress) {
      checkAbort();
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
      checkAbort();
      const songIds: string[] = [];
      for (const m of matchedTracks) {
        const id = m.navidromeSong!.id;
        if (id) songIds.push(id);
      }

      if (songIds.length === 0) {
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

      switch (mode) {
        case 'create': {
          checkAbort();
          const createResult = await this.createPlaylist(playlistName, songIds, signal);
          if (!createResult.success || !createResult.id) {
            errors.push({
              trackName: 'N/A',
              artistName: 'N/A',
              reason: `Failed to create playlist`,
            });
            break;
          }
          playlistId = createResult.id;
          exported = songIds.length;
          break;
        }
        case 'append': {
          if (!options.existingPlaylistId) {
            throw new Error('existingPlaylistId is required for append mode');
          }
          checkAbort();
          const result = await this.navidromeClient.updatePlaylist(options.existingPlaylistId, songIds, undefined, signal);
          if (!result.success) {
            errors.push({
              trackName: 'N/A',
              artistName: 'N/A',
              reason: `Failed to append: ${result.error || 'Unknown error'}`,
            });
            break;
          }
          exported = songIds.length;
          playlistId = options.existingPlaylistId;
          break;
        }
        case 'overwrite': {
          if (!options.existingPlaylistId) {
            throw new Error('existingPlaylistId is required for overwrite mode');
          }
          checkAbort();
          const result = await this.navidromeClient.replacePlaylistSongs(options.existingPlaylistId, songIds, signal);
          if (!result.success) {
            errors.push({
              trackName: 'N/A',
              artistName: 'N/A',
              reason: `Failed to overwrite: ${result.error || 'Unknown error'}`,
            });
            break;
          }
          exported = songIds.length;
          playlistId = options.existingPlaylistId;
          break;
        }
        case 'update': {
          if (!options.existingPlaylistId) {
            throw new Error('existingPlaylistId is required for update mode');
          }
          checkAbort();

          const existingTracks = await this.navidromeClient.getPlaylist(options.existingPlaylistId, signal);
          const existingSongIds = existingTracks.tracks.map(t => t.mediaFileId || t.id);

          // Set playlistId up-front so partial failures don't leave the caller
          // without the id to reference when surfacing errors.
          playlistId = options.existingPlaylistId;

          if (arraysEqual(existingSongIds, songIds)) {
            exported = songIds.length;
            break;
          }

          const appendTail = isOrderedPrefixAppend(existingSongIds, songIds);

          if (appendTail) {
            const addResult = await this.navidromeClient.updatePlaylist(
              options.existingPlaylistId, appendTail, undefined, signal
            );
            if (!addResult.success) {
              errors.push({
                trackName: 'N/A',
                artistName: 'N/A',
                reason: `Failed to add new tracks: ${addResult.error || 'Unknown error'}`,
              });
              break;
            }
            exported = songIds.length;
            break;
          }

          // Reorder, gap, or count decrease — replace the full list so the final
          // sequence exactly matches songIds.
          const replaceResult = await this.navidromeClient.replacePlaylistSongs(
            options.existingPlaylistId, songIds, signal
          );
          if (!replaceResult.success) {
            errors.push({
              trackName: 'N/A',
              artistName: 'N/A',
              reason: `Failed to replace playlist: ${replaceResult.error || 'Unknown error'}`,
            });
            break;
          }
          exported = songIds.length;
          break;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      errors.push({
        trackName: 'N/A',
        artistName: 'N/A',
        reason: `Failed to ${mode} playlist: ${errorMessage}`,
      });
    }

    if (onProgress) {
      checkAbort();
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

  async createPlaylist(name: string, songIds: string[], signal?: AbortSignal): Promise<{ id: string; success: boolean }> {
    const result = await this.navidromeClient.createPlaylist(name, songIds, signal);
    return {
      id: result.id,
      success: result.success,
    };
  }

  async appendToPlaylist(playlistId: string, songIds: string[], signal?: AbortSignal): Promise<{ success: boolean }> {
    const result = await this.navidromeClient.updatePlaylist(playlistId, songIds, undefined, signal);
    return {
      success: result.success,
    };
  }

  async overwritePlaylist(playlistId: string, songIds: string[], signal?: AbortSignal): Promise<{ success: boolean }> {
    const result = await this.navidromeClient.replacePlaylistSongs(playlistId, songIds, signal);
    return {
      success: result.success,
    };
  }
}

export function createPlaylistExporter(navidromeClient: NavidromeApiClient): PlaylistExporter {
  return new DefaultPlaylistExporter(navidromeClient);
}

export default createPlaylistExporter;

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function isOrderedPrefixAppend(existing: string[], desired: string[]): string[] | null {
  if (desired.length <= existing.length) return null;
  for (let i = 0; i < existing.length; i++) {
    if (existing[i] !== desired[i]) return null;
  }
  return desired.slice(existing.length);
}
