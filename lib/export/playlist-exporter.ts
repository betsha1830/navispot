import { NavidromeApiClient, parseExportMetadata } from '@/lib/navidrome/client';
import { TrackMatch } from '@/types/matching';

export type ExportMode = 'create' | 'append' | 'overwrite' | 'update';

interface PlaylistExportData {
  spotifyPlaylistId: string;
  spotifySnapshotId: string;
  playlistName: string;
  navidromePlaylistId?: string;
  exportedAt: string;
  trackCount: number;
  tracks: Record<string, {
    spotifyTrackId: string;
    navidromeSongId?: string;
    status: 'matched' | 'ambiguous' | 'unmatched';
    matchStrategy: string;
    matchScore: number;
    matchedAt: string;
  }>;
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
  cachedData?: PlaylistExportData;
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
    let skipped = 0;
    const failed = 0;
    let playlistId: string | undefined;

    const checkAbort = () => {
      if (signal?.aborted) {
        throw new DOMException('Export was cancelled', 'AbortError');
      }
    };

    const matchedTracks = matches.filter((m) => m.status === 'matched' && m.navidromeSong);

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
      switch (mode) {
        case 'create': {
          const songIds = matchedTracks.map((m) => m.navidromeSong!.id);
          const createResult = await this.createPlaylist(playlistName, songIds, signal);
          playlistId = createResult.id;
          exported = createResult.success ? songIds.length : 0;
          break;
        }
        case 'append': {
          if (!options.existingPlaylistId) {
            throw new Error('existingPlaylistId is required for append mode');
          }
          const songIds = matchedTracks.map((m) => m.navidromeSong!.id);
          const result = await this.appendToPlaylist(options.existingPlaylistId, songIds, signal);
          exported = result.success ? songIds.length : 0;
          playlistId = options.existingPlaylistId;
          break;
        }
        case 'overwrite': {
          if (!options.existingPlaylistId) {
            throw new Error('existingPlaylistId is required for overwrite mode');
          }
          const songIds = matchedTracks.map((m) => m.navidromeSong!.id);
          const result = await this.overwritePlaylist(options.existingPlaylistId, songIds, signal);
          exported = result.success ? songIds.length : 0;
          playlistId = options.existingPlaylistId;
          break;
        }
        case 'update': {
          if (!options.existingPlaylistId || !options.cachedData) {
            throw new Error('existingPlaylistId and cachedData are required for update mode');
          }

          const currentSpotifyTrackIds = new Set(matches.map(m => m.spotifyTrack.id));
          const cachedTrackIds = new Set(Object.keys(options.cachedData.tracks));

          const newTrackIds = new Set<string>();
          const newMatches: TrackMatch[] = [];

          matches.forEach(match => {
            checkAbort();
            const cachedStatus = options.cachedData?.tracks[match.spotifyTrack.id];
            if (match.status === 'matched' && match.navidromeSong && !cachedStatus) {
              newTrackIds.add(match.navidromeSong.id);
              newMatches.push(match);
            }
          });

          const removedSpotifyTrackIds: string[] = [];
          cachedTrackIds.forEach(trackId => {
            checkAbort();
            if (!currentSpotifyTrackIds.has(trackId)) {
              removedSpotifyTrackIds.push(trackId);
            }
          });

          if (newMatches.length > 0) {
            checkAbort();
            const newSongIds = newMatches.map(m => m.navidromeSong!.id);
            await this.navidromeClient.updatePlaylist(options.existingPlaylistId, newSongIds, undefined, signal);
          }

          if (removedSpotifyTrackIds.length > 0) {
            try {
              checkAbort();
              const currentPlaylist = await this.navidromeClient.getPlaylist(options.existingPlaylistId, signal);
              const trackToEntryId = new Map<string, number>();
              currentPlaylist.tracks.forEach((navSong, index) => {
                const cachedTrack = options.cachedData ? Object.values(options.cachedData.tracks).find(
                  t => t.navidromeSongId === navSong.id
                ) : undefined;
                if (cachedTrack) {
                  trackToEntryId.set(cachedTrack.spotifyTrackId, index);
                }
              });

              const entryIdsToRemove: number[] = [];
              removedSpotifyTrackIds.forEach(trackId => {
                checkAbort();
                const entryId = trackToEntryId.get(trackId);
                if (entryId !== undefined) {
                  entryIdsToRemove.push(entryId);
                }
              });

              if (entryIdsToRemove.length > 0) {
                await this.navidromeClient.updatePlaylist(options.existingPlaylistId, [], entryIdsToRemove, signal);
              }
            } catch (error) {
              console.warn('Failed to remove tracks from Navidrome playlist:', error);
            }
          }

          if (newMatches.length > 0 || removedSpotifyTrackIds.length > 0) {
            try {
              checkAbort();
              const metadata = {
                spotifyPlaylistId: options.cachedData.spotifyPlaylistId,
                navidromePlaylistId: options.existingPlaylistId,
                spotifySnapshotId: options.cachedData.spotifySnapshotId,
                exportedAt: new Date().toISOString(),
                trackCount: matches.length,
              };
              await this.navidromeClient.updatePlaylistComment(options.existingPlaylistId, metadata, signal);
            } catch (error) {
              console.warn('Failed to update playlist comment:', error);
            }
          }

          exported = newMatches.length;
          playlistId = options.existingPlaylistId;
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

    const unmatched = matches.filter((m) => m.status !== 'matched' || !m.navidromeSong);
    skipped = skipUnmatched ? unmatched.length : 0;

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
