import { SpotifyTrack } from '@/types/spotify';
import { TrackMatch } from '@/types/matching';
import { NavidromeApiClient } from '@/lib/navidrome/client';

export async function matchByISRC(
  _client: NavidromeApiClient,
  spotifyTrack: SpotifyTrack
): Promise<TrackMatch> {
  const isrc = spotifyTrack.external_ids?.isrc;

  if (!isrc) {
    return {
      spotifyTrack,
      matchStrategy: 'isrc',
      matchScore: 0,
      status: 'unmatched',
    };
  }

  return {
    spotifyTrack,
    matchStrategy: 'isrc',
    matchScore: 0,
    status: 'unmatched',
  };
}
