import { SpotifyTrack } from './spotify';
import { NavidromeSong } from './navidrome';

export type MatchStrategy = 'isrc' | 'fuzzy' | 'strict' | 'none';
export type MatchStatus = 'matched' | 'ambiguous' | 'unmatched';

export interface TrackMatch {
  spotifyTrack: SpotifyTrack;
  navidromeSong?: NavidromeSong;
  matchScore: number;
  matchStrategy: MatchStrategy;
  status: MatchStatus;
  candidates?: NavidromeSong[];
  trackKey: string;
  entryKey?: string;
}
