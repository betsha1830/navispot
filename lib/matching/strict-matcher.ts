import { SpotifyTrack } from '@/types/spotify';
import { TrackMatch } from '@/types/matching';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { NavidromeNativeSong } from '@/types/navidrome';
import { convertNativeSongToNavidromeSong } from './orchestrator';
import { trackKey as getTrackKey } from '@/lib/spotify/track-identity';
import { normalizeTitle as normalizeTitleFuzzy, normalizeArtistName as normalizeArtistNameFuzzy, hasVersionMismatch } from './fuzzy';

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '');
}

export function filterStrictMatches(
  songs: NavidromeNativeSong[],
  normalizedArtist: string | null,
  normalizedTitle: string,
  rawSpotifyTitle?: string
): NavidromeNativeSong[] {
  return songs.filter((song) => {
    const songTitle = normalizeTitleFuzzy(song.title);
    if (songTitle !== normalizedTitle) return false;
    if (normalizedArtist !== null) {
      const songArtist = normalizeArtistNameFuzzy(song.artist);
      if (songArtist !== normalizedArtist) return false;
    }
    if (rawSpotifyTitle && hasVersionMismatch(rawSpotifyTitle, song.title)) return false;
    return true;
  });
}

export async function matchByStrict(
  client: NavidromeApiClient,
  spotifyTrack: SpotifyTrack,
  candidates?: NavidromeNativeSong[],
  signal?: AbortSignal
): Promise<TrackMatch> {
  const tk = getTrackKey(spotifyTrack);
  const hasArtist = spotifyTrack.artists && spotifyTrack.artists.length > 0 && spotifyTrack.artists.some(a => a.name.trim().length > 0);
  const normalizedArtist = hasArtist
    ? normalizeArtistNameFuzzy(spotifyTrack.artists.map((a) => a.name).join(' '))
    : null;
  const normalizedTitle = normalizeTitleFuzzy(spotifyTrack.name);

  if (!normalizedTitle) {
    return {
      spotifyTrack,
      matchStrategy: 'strict',
      matchScore: 0,
      status: 'unmatched',
      trackKey: tk,
    };
  }

  try {
    const songs = candidates || await client.searchByTitle(spotifyTrack.name, 100, signal);
    const matches = filterStrictMatches(songs, normalizedArtist, normalizedTitle, spotifyTrack.name);

    if (matches.length === 0) {
      return {
        spotifyTrack,
        matchStrategy: 'strict',
        matchScore: 0,
        status: 'unmatched',
        trackKey: tk,
      };
    }

    if (matches.length > 1 && normalizedArtist === null) {
      const spotifyDurationSec = spotifyTrack.duration_ms / 1000;
      const durationMatches = matches.filter(
        (s) => Math.abs(s.duration - spotifyDurationSec) < 2
      );
      if (durationMatches.length === 1) {
        return {
          spotifyTrack,
          navidromeSong: convertNativeSongToNavidromeSong(durationMatches[0]),
          matchStrategy: 'strict',
          matchScore: 1,
          status: 'matched',
          trackKey: tk,
        };
      }
      return {
        spotifyTrack,
        matchStrategy: 'strict',
        matchScore: 0,
        status: 'ambiguous',
        candidates: matches.map(convertNativeSongToNavidromeSong),
        trackKey: tk,
      };
    }

    const firstMatch = matches[0];
    const allSame = matches.every(
      (m) => m.title === firstMatch.title && m.artist === firstMatch.artist
    );

    if (!allSame) {
      return {
        spotifyTrack,
        matchStrategy: 'strict',
        matchScore: 0,
        status: 'ambiguous',
        candidates: matches.map(convertNativeSongToNavidromeSong),
        trackKey: tk,
      };
    }

    return {
      spotifyTrack,
      navidromeSong: convertNativeSongToNavidromeSong(firstMatch),
      matchStrategy: 'strict',
      matchScore: 1,
      status: 'matched',
      trackKey: tk,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    return {
      spotifyTrack,
      matchStrategy: 'strict',
      matchScore: 0,
      status: 'unmatched',
      trackKey: tk,
    };
  }
}
