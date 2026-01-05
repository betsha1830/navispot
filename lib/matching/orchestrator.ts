import { SpotifyTrack } from '@/types/spotify';
import { NavidromeSong, NavidromeNativeSong } from '@/types/navidrome';
import { TrackMatch, MatchStrategy, MatchStatus } from '@/types/matching';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { matchByStrict } from './strict-matcher';
import { findBestMatch } from './fuzzy';

export interface MatchingOrchestratorOptions {
  enableISRC: boolean;
  enableFuzzy: boolean;
  enableStrict: boolean;
  fuzzyThreshold: number;
  maxSearchResults: number;
}

export const defaultMatchingOptions: MatchingOrchestratorOptions = {
  enableISRC: true,
  enableFuzzy: true,
  enableStrict: true,
  fuzzyThreshold: 0.8,
  maxSearchResults: 500,
};

export interface MatchingStrategyResult {
  strategy: MatchStrategy;
  matched: boolean;
  ambiguous: boolean;
  navidromeSong?: NavidromeSong;
  candidates?: NavidromeSong[];
  score: number;
}

export interface OrchestratedMatchResult {
  spotifyTrack: SpotifyTrack;
  strategyResults: MatchingStrategyResult[];
  finalMatch: MatchingStrategyResult;
  overallStatus: MatchStatus;
}

export function convertNativeSongToNavidromeSong(nativeSong: NavidromeNativeSong): NavidromeSong {
  return {
    id: nativeSong.id,
    title: nativeSong.title,
    artist: nativeSong.artist,
    album: nativeSong.album,
    duration: nativeSong.duration,
    isrc: nativeSong.isrc ? [nativeSong.isrc] : undefined,
  };
}

export async function matchTrack(
  client: NavidromeApiClient,
  spotifyTrack: SpotifyTrack,
  options: Partial<MatchingOrchestratorOptions> = {}
): Promise<TrackMatch> {
  const opts: MatchingOrchestratorOptions = { ...defaultMatchingOptions, ...options };
  const strategyResults: MatchingStrategyResult[] = [];

  const firstArtist = spotifyTrack.artists[0]?.name || '';

  let candidates: NavidromeSong[] = [];
  let nativeCandidates: NavidromeNativeSong[] = [];

  const artist = await client.getArtistByName(firstArtist);
  if (artist) {
    nativeCandidates = await client.getAllSongsByArtist(artist.id);
    candidates = nativeCandidates.map(convertNativeSongToNavidromeSong);
  }

  const spotifyDurationSec = spotifyTrack.duration_ms / 1000;

  if (opts.enableISRC && spotifyTrack.external_ids?.isrc) {
    const isrc = spotifyTrack.external_ids.isrc;
    const isrcMatch = candidates.find((song) => song.isrc?.[0] === isrc);

    if (isrcMatch) {
      return {
        spotifyTrack,
        navidromeSong: isrcMatch,
        matchStrategy: 'isrc',
        matchScore: 1,
        status: 'matched',
      };
    }

    const durationMatch = candidates.find((song) => {
      const navidromeDuration = song.duration;
      const delta = Math.abs(navidromeDuration - spotifyDurationSec);
      return delta < 2;
    });

    if (durationMatch) {
      return {
        spotifyTrack,
        navidromeSong: durationMatch,
        matchStrategy: 'isrc',
        matchScore: 1,
        status: 'matched',
      };
    }
  }

  if (opts.enableFuzzy) {
    const fuzzyResult = findBestMatch(spotifyTrack, candidates, opts.fuzzyThreshold);
    const matchResult: MatchingStrategyResult = {
      strategy: 'fuzzy',
      matched: fuzzyResult.bestMatch !== undefined,
      ambiguous: fuzzyResult.hasAmbiguous,
      navidromeSong: fuzzyResult.bestMatch?.song,
      candidates: fuzzyResult.matches.map((m) => m.song),
      score: fuzzyResult.bestMatch?.score ?? 0,
    };
    strategyResults.push(matchResult);

    if (fuzzyResult.bestMatch && !fuzzyResult.hasAmbiguous) {
      return {
        spotifyTrack,
        navidromeSong: fuzzyResult.bestMatch.song,
        matchStrategy: 'fuzzy',
        matchScore: fuzzyResult.bestMatch.score,
        status: 'matched',
        candidates: fuzzyResult.matches.map((m) => m.song),
      };
    }
  }

  if (opts.enableStrict) {
    const strictResult = await matchByStrict(client, spotifyTrack);
    strategyResults.push({
      strategy: 'strict',
      matched: strictResult.status === 'matched',
      ambiguous: false,
      navidromeSong: strictResult.navidromeSong,
      score: strictResult.matchScore,
    });

    if (strictResult.status === 'matched') {
      return {
        spotifyTrack,
        navidromeSong: strictResult.navidromeSong,
        matchStrategy: 'strict',
        matchScore: 1,
        status: 'matched',
      };
    }
  }

  const hasAmbiguous = strategyResults.some((r) => r.ambiguous);
  const bestResult = strategyResults.reduce(
    (best, current) => (current.score > best.score ? current : best),
    { score: -1 } as MatchingStrategyResult
  );

  return {
    spotifyTrack,
    navidromeSong: bestResult.navidromeSong,
    matchStrategy: bestResult.strategy,
    matchScore: bestResult.score > 0 ? bestResult.score : 0,
    status: hasAmbiguous ? 'ambiguous' : 'unmatched',
    candidates: bestResult.candidates,
  };
}

export async function matchTracks(
  client: NavidromeApiClient,
  spotifyTracks: SpotifyTrack[],
  options: Partial<MatchingOrchestratorOptions> = {}
): Promise<TrackMatch[]> {
  const results: TrackMatch[] = [];

  for (const track of spotifyTracks) {
    const match = await matchTrack(client, track, options);
    results.push(match);
  }

  return results;
}

export function getMatchStatistics(matches: TrackMatch[]): {
  total: number;
  matched: number;
  ambiguous: number;
  unmatched: number;
  byStrategy: Record<MatchStrategy, number>;
} {
  const stats = {
    total: matches.length,
    matched: 0,
    ambiguous: 0,
    unmatched: 0,
    byStrategy: {
      isrc: 0,
      fuzzy: 0,
      strict: 0,
      none: 0,
    } as Record<MatchStrategy, number>,
  };

  for (const match of matches) {
    if (match.status === 'matched') {
      stats.matched++;
      stats.byStrategy[match.matchStrategy]++;
    } else if (match.status === 'ambiguous') {
      stats.ambiguous++;
    } else {
      stats.unmatched++;
    }
  }

  return stats;
}

export function getAmbiguousMatches(matches: TrackMatch[]): TrackMatch[] {
  return matches.filter((m) => m.status === 'ambiguous');
}

export function getUnmatchedTracks(matches: TrackMatch[]): SpotifyTrack[] {
  return matches
    .filter((m) => m.status === 'unmatched' || m.status === 'ambiguous')
    .map((m) => m.spotifyTrack);
}

export function getMatchedTracks(matches: TrackMatch[]): Array<{
  spotifyTrack: SpotifyTrack;
  navidromeSong: NavidromeSong;
  strategy: MatchStrategy;
}> {
  return matches
    .filter((m) => m.status === 'matched' && m.navidromeSong)
    .map((m) => ({
      spotifyTrack: m.spotifyTrack,
      navidromeSong: m.navidromeSong!,
      strategy: m.matchStrategy,
    }));
}
