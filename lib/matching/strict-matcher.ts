import { SpotifyTrack } from '@/types/spotify';
import { TrackMatch } from '@/types/matching';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { NavidromeNativeSong } from '@/types/navidrome';
import { convertNativeSongToNavidromeSong } from './orchestrator';

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function filterStrictMatches(
  songs: NavidromeNativeSong[],
  normalizedArtist: string,
  normalizedTitle: string
): NavidromeNativeSong[] {
  return songs.filter((song) => {
    const songArtist = normalizeString(song.artist);
    const songTitle = normalizeString(song.title);
    return songArtist === normalizedArtist && songTitle === normalizedTitle;
  });
}

export async function matchByStrict(
  client: NavidromeApiClient,
  spotifyTrack: SpotifyTrack
): Promise<TrackMatch> {
  const normalizedArtist = normalizeString(
    spotifyTrack.artists.map((a) => a.name).join(' ')
  );
  const normalizedTitle = normalizeString(spotifyTrack.name);

  if (!normalizedArtist || !normalizedTitle) {
    return {
      spotifyTrack,
      matchStrategy: 'strict',
      matchScore: 0,
      status: 'unmatched',
    };
  }

  try {
    const artist = await client.getArtistByName(
      spotifyTrack.artists.map((a) => a.name).join(' ')
    );

    if (artist) {
      const songs = await client.getAllSongsByArtist(artist.id);
      const matches = filterStrictMatches(songs, normalizedArtist, normalizedTitle);

      if (matches.length > 0) {
        return {
          spotifyTrack,
          navidromeSong: convertNativeSongToNavidromeSong(matches[0]),
          matchStrategy: 'strict',
          matchScore: 1,
          status: 'matched',
        };
      }
    }

    return {
      spotifyTrack,
      matchStrategy: 'strict',
      matchScore: 0,
      status: 'unmatched',
    };
  } catch {
    return {
      spotifyTrack,
      matchStrategy: 'strict',
      matchScore: 0,
      status: 'unmatched',
    };
  }
}
