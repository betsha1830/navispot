import { SpotifyClient } from '@/lib/spotify/client';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { SpotifyPlaylistTrack, SpotifyTrack } from '@/types/spotify';
import { TrackMatch, MatchStrategy } from '@/types/matching';
import { matchTracks, getMatchStatistics, MatchingOrchestratorOptions as OrchestratorOptions, defaultMatchingOptions } from './orchestrator';

export interface BatchMatcherProgress {
  current: number;
  total: number;
  currentTrack?: SpotifyTrack;
  percent: number;
}

export type ProgressCallback = (progress: BatchMatcherProgress) => void | Promise<void>;

export interface BatchMatcherOptions {
  enableISRC?: boolean;
  enableFuzzy?: boolean;
  enableStrict?: boolean;
  fuzzyThreshold?: number;
  maxSearchResults?: number;
  concurrency?: number;
}

export interface BatchMatchResult {
  playlistId: string;
  playlistName: string;
  tracks: SpotifyPlaylistTrack[];
  matches: TrackMatch[];
  statistics: {
    total: number;
    matched: number;
    ambiguous: number;
    unmatched: number;
    byStrategy: Record<MatchStrategy, number>;
  };
  duration: number;
}

export interface BatchMatcher {
  matchPlaylist(
    playlistId: string,
    options?: BatchMatcherOptions,
    onProgress?: ProgressCallback
  ): Promise<BatchMatchResult>;
  matchTracks(
    tracks: SpotifyTrack[],
    options?: BatchMatcherOptions,
    onProgress?: ProgressCallback
  ): Promise<{ matches: TrackMatch[]; statistics: BatchMatchResult['statistics'] }>;
}

export class DefaultBatchMatcher implements BatchMatcher {
  private spotifyClient: SpotifyClient;
  private navidromeClient: NavidromeApiClient;

  constructor(spotifyClient: SpotifyClient, navidromeClient: NavidromeApiClient) {
    this.spotifyClient = spotifyClient;
    this.navidromeClient = navidromeClient;
  }

  async matchPlaylist(
    playlistId: string,
    options: BatchMatcherOptions = {},
    onProgress?: ProgressCallback
  ): Promise<BatchMatchResult> {
    const startTime = Date.now();

    await this.spotifyClient.loadToken();

    const tracks = await this.spotifyClient.getAllPlaylistTracks(playlistId);
    const playlistName = 'Playlist';

    const result = await this.matchTracks(
      tracks.map((t: SpotifyPlaylistTrack) => t.track),
      options,
      onProgress
    );

    const duration = Date.now() - startTime;

    return {
      playlistId,
      playlistName,
      tracks,
      matches: result.matches,
      statistics: result.statistics,
      duration,
    };
  }

  async matchTracks(
    tracks: SpotifyTrack[],
    options: BatchMatcherOptions = {},
    onProgress?: ProgressCallback
  ): Promise<{ matches: TrackMatch[]; statistics: BatchMatchResult['statistics'] }> {
    const orchestratorOptions: Partial<OrchestratorOptions> = {
      enableISRC: options.enableISRC ?? defaultMatchingOptions.enableISRC,
      enableFuzzy: options.enableFuzzy ?? defaultMatchingOptions.enableFuzzy,
      enableStrict: options.enableStrict ?? defaultMatchingOptions.enableStrict,
      fuzzyThreshold: options.fuzzyThreshold ?? defaultMatchingOptions.fuzzyThreshold,
      maxSearchResults: options.maxSearchResults ?? defaultMatchingOptions.maxSearchResults,
    };

    const matches: TrackMatch[] = [];
    const total = tracks.length;
    const concurrency = options.concurrency ?? 1;

    if (concurrency <= 1) {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const match = await matchTracks(this.navidromeClient, [track], orchestratorOptions);
        matches.push(match[0]);

        if (onProgress) {
          await onProgress({
            current: i + 1,
            total,
            currentTrack: track,
            percent: Math.round(((i + 1) / total) * 100),
          });
        }
      }
    } else {
      const chunks: SpotifyTrack[][] = [];
      for (let i = 0; i < tracks.length; i += concurrency) {
        chunks.push(tracks.slice(i, i + concurrency));
      }

      let processed = 0;
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(async (track) => {
            const result = await matchTracks(this.navidromeClient, [track], orchestratorOptions);
            return result[0];
          })
        );
        matches.push(...chunkResults);
        processed += chunk.length;

        if (onProgress) {
          await onProgress({
            current: processed,
            total,
            percent: Math.round((processed / total) * 100),
          });
        }
      }
    }

    const statistics = getMatchStatistics(matches) as BatchMatchResult['statistics'];

    return { matches, statistics };
  }
}

export function createBatchMatcher(
  spotifyClient: SpotifyClient,
  navidromeClient: NavidromeApiClient
): BatchMatcher {
  return new DefaultBatchMatcher(spotifyClient, navidromeClient);
}
