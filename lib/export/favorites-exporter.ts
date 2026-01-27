import { NavidromeApiClient } from '@/lib/navidrome/client';
import { TrackMatch } from '@/types/matching';
import {
  FavoritesExportProgress,
  FavoritesExportError,
  FavoritesExportResult,
  FavoritesExporterOptions,
  FavoritesExporter,
} from '@/types/favorites';

export class DefaultFavoritesExporter implements FavoritesExporter {
  private navidromeClient: NavidromeApiClient;

  constructor(navidromeClient: NavidromeApiClient) {
    this.navidromeClient = navidromeClient;
  }

  async exportFavorites(
    matches: TrackMatch[],
    options: FavoritesExporterOptions = {}
  ): Promise<FavoritesExportResult> {
    const startTime = Date.now();
    const skipUnmatched = options.skipUnmatched ?? false;
    const onProgress = options.onProgress;
    const { signal } = options;

    const errors: FavoritesExportError[] = [];
    let starred = 0;
    let failed = 0;
    let skipped = 0;

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
      const unmatched = matches.filter((m) => m.status !== 'matched' || !m.navidromeSong);
      skipped = skipUnmatched ? unmatched.length : 0;

      return {
        success: true,
        statistics: {
          total: matches.length,
          starred: 0,
          failed: 0,
          skipped,
        },
        errors: [],
        duration: Date.now() - startTime,
      };
    }

    for (let i = 0; i < matchedTracks.length; i++) {
      checkAbort();
      const match = matchedTracks[i];
      const songId = match.navidromeSong!.id;
      const trackName = match.spotifyTrack.name;
      const artistName = match.spotifyTrack.artists?.[0]?.name || 'Unknown';

      if (onProgress) {
        checkAbort();
        await onProgress({
          current: i + 1,
          total: matchedTracks.length,
          percent: Math.round(((i + 1) / matchedTracks.length) * 100),
          currentTrack: `${trackName} - ${artistName}`,
          status: 'exporting',
        });
      }

      try {
        const result = await this.starSong(songId, signal);
        if (result.success) {
          starred++;
        } else {
          failed++;
          errors.push({
            trackName,
            artistName,
            reason: 'Failed to star song',
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        failed++;
        errors.push({
          trackName,
          artistName,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const unmatched = matches.filter((m) => m.status !== 'matched' || !m.navidromeSong);
    skipped = skipUnmatched ? unmatched.length : 0;

    if (onProgress) {
      checkAbort();
      await onProgress({
        current: matchedTracks.length,
        total: matchedTracks.length,
        percent: 100,
        status: starred > 0 || skipped > 0 ? 'completed' : 'failed',
      });
    }

    const success = errors.length === 0 && starred > 0;

    return {
      success,
      statistics: {
        total: matches.length,
        starred,
        failed,
        skipped,
      },
      errors,
      duration: Date.now() - startTime,
    };
  }

  async starSong(songId: string, signal?: AbortSignal): Promise<{ success: boolean }> {
    const result = await this.navidromeClient.starSong(songId, signal);
    return {
      success: result.success,
    };
  }

  async starSongs(songIds: string[], signal?: AbortSignal): Promise<{ success: boolean; failedIds: string[] }> {
    if (songIds.length === 0) {
      return { success: true, failedIds: [] };
    }

    const failedIds: string[] = [];

    const results = await Promise.all(
      songIds.map(async (songId) => {
        const result = await this.starSong(songId, signal);
        return { songId, success: result.success };
      })
    );

    for (const { songId, success } of results) {
      if (!success) {
        failedIds.push(songId);
      }
    }

    const allSuccessful = failedIds.length === 0;

    return {
      success: allSuccessful,
      failedIds,
    };
  }
}

export function createFavoritesExporter(navidromeClient: NavidromeApiClient): FavoritesExporter {
  return new DefaultFavoritesExporter(navidromeClient);
}

export default createFavoritesExporter;
