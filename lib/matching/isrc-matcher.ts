import { SpotifyTrack } from '@/types/spotify';
import { TrackMatch } from '@/types/matching';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { trackKey as getTrackKey } from '@/lib/spotify/track-identity';

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
      trackKey: getTrackKey(spotifyTrack),
    };
  }

  return {
    spotifyTrack,
    matchStrategy: 'isrc',
    matchScore: 0,
    status: 'unmatched',
    trackKey: getTrackKey(spotifyTrack),
  };
}
