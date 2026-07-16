import { describe, it, expect } from 'vitest';
import { calculateTrackSimilarity, findBestMatch, normalizeTitle, normalizeArtistName, calculateBestArtistSimilarity, calculateAlbumSimilarity, normalizeString, hasVersionMismatch, extractVersionMarkers } from '@/lib/matching/fuzzy';
import { SpotifyTrack } from '@/types/spotify';
import { NavidromeSong } from '@/types/navidrome';

const emptyArtistTrack: SpotifyTrack = {
  id: null,
  name: 'Rivers in the Deset',
  uri: undefined,
  is_local: true,
  artists: [],
  album: { id: null, name: 'Some Album' },
  duration_ms: 210000,
  external_ids: {},
};

const normalTrack: SpotifyTrack = {
  id: 'sp1',
  name: 'Rivers in the Desert',
  uri: 'spotify:track:sp1',
  artists: [{ id: 'a1', name: 'Lyn' }],
  album: { id: 'al1', name: 'Persona 5 OST' },
  duration_ms: 210000,
  external_ids: { isrc: 'JP123' },
};

const candidate: NavidromeSong = {
  id: 'nd1',
  title: 'Rivers in the Desert',
  artist: 'Lyn',
  album: 'Persona 5 OST',
  duration: 210,
  isrc: ['JP123'],
};

const closeCandidate: NavidromeSong = {
  id: 'nd2',
  title: 'Rivers in the Desert (Instrumental)',
  artist: 'Lyn',
  album: 'Persona 5 OST',
  duration: 212,
};

describe('calculateTrackSimilarity', () => {
  it('scores perfectly for identical track', () => {
    const score = calculateTrackSimilarity(normalTrack, candidate);
    expect(score).toBeGreaterThan(0.9);
  });

  it('scores acceptably for artistless local track with matching title/duration', () => {
    const localCandidate: NavidromeSong = {
      id: 'nd3',
      title: 'Rivers in the Deset',
      artist: 'Some Artist',
      album: 'Some Album',
      duration: 210,
    };
    const score = calculateTrackSimilarity(emptyArtistTrack, localCandidate);
    expect(score).toBeGreaterThan(0.8);
  });

  it('scores lower for mismatched duration', () => {
    const badCandidate: NavidromeSong = {
      id: 'nd4',
      title: 'Rivers in the Deset',
      artist: 'Some Artist',
      album: 'Some Album',
      duration: 400,
    };
    const score = calculateTrackSimilarity(emptyArtistTrack, badCandidate);
    expect(score).toBeLessThan(0.9);
  });

  it('does not penalize missing album', () => {
    const trackWithoutAlbum: SpotifyTrack = {
      ...emptyArtistTrack,
      album: { id: null, name: '' },
    };
    const c: NavidromeSong = {
      id: 'nd5',
      title: 'Rivers in the Deset',
      artist: '',
      album: '',
      duration: 210,
    };
    const score = calculateTrackSimilarity(trackWithoutAlbum, c);
    expect(score).toBeGreaterThan(0);
  });
});

describe('findBestMatch', () => {
  it('returns best match above threshold', () => {
    const result = findBestMatch(normalTrack, [candidate, closeCandidate], 0.7);
    expect(result.bestMatch).toBeDefined();
    expect(result.bestMatch!.song.id).toBe('nd1');
  });

  it('returns empty for no matches above threshold', () => {
    const badCandidates: NavidromeSong[] = [{
      id: 'x',
      title: 'Completely Different',
      artist: 'Some Artist',
      album: 'Some Album',
      duration: 300,
    }];
    const result = findBestMatch(normalTrack, badCandidates, 0.9);
    expect(result.bestMatch).toBeUndefined();
    expect(result.matches).toHaveLength(0);
  });

  it('detects ambiguity between close candidates with different artists', () => {
    const c1: NavidromeSong = { id: 'a', title: 'Almost Same', artist: 'Artist One', album: 'Album', duration: 200 };
    const c2: NavidromeSong = { id: 'b', title: 'Almost Same', artist: 'Artist Two', album: 'Album', duration: 200 };
    const t: SpotifyTrack = {
      id: 't1',
      name: 'Almost Same',
      artists: [{ id: 'ar', name: 'Artist' }],
      album: { id: 'al', name: 'Album' },
      duration_ms: 200000,
      external_ids: {},
    };
    const result = findBestMatch(t, [c1, c2], 0.5);
    expect(result.bestMatch).toBeDefined();
  });

  it('does not flag duplicates as ambiguous', () => {
    const c1: NavidromeSong = { id: 'a', title: 'Same Title', artist: 'Same Artist', album: 'Album', duration: 200 };
    const c2: NavidromeSong = { id: 'b', title: 'Same Title', artist: 'Same Artist', album: 'Album', duration: 200 };
    const t: SpotifyTrack = {
      id: 't1',
      name: 'Same Title',
      artists: [{ id: 'ar', name: 'Same Artist' }],
      album: { id: 'al', name: 'Album' },
      duration_ms: 200000,
      external_ids: {},
    };
    const result = findBestMatch(t, [c1, c2], 0.5);
    expect(result.hasAmbiguous).toBe(false);
  });
});

describe('normalizeTitle', () => {
  it('removes featured artist annotations', () => {
    expect(normalizeTitle('Song (feat. Artist)')).toBe('song');
  });
});

describe('normalizeArtistName', () => {
  it('normalizes collaboration indicators', () => {
    const name = normalizeArtistName('Artist Ft. Guest');
    expect(name).not.toContain('ft.');
  });
});

describe('calculateBestArtistSimilarity', () => {
  it('returns 1.0 when any individual artist matches exactly', () => {
    const score = calculateBestArtistSimilarity(['Kendrick Lamar', 'SZA'], 'Kendrick Lamar');
    expect(score).toBe(1.0);
  });

  it('scores higher than joined-string comparison for multi-artist tracks', () => {
    const bestScore = calculateBestArtistSimilarity(['Kendrick Lamar', 'SZA'], 'Kendrick Lamar');
    const joinedScore = calculateBestArtistSimilarity(['Kendrick Lamar SZA'], 'Kendrick Lamar');
    expect(bestScore).toBeGreaterThan(joinedScore);
  });

  it('returns 0 when no artists overlap', () => {
    const score = calculateBestArtistSimilarity(['Drake', 'Future'], 'Kendrick Lamar');
    expect(score).toBeLessThan(0.5);
  });
});

describe('per-artist matching in calculateTrackSimilarity', () => {
  it('matches multi-artist Spotify track against single-artist Navidrome song', () => {
    const multiArtistTrack: SpotifyTrack = {
      id: 'sp2',
      name: 'All The Stars',
      uri: 'spotify:track:sp2',
      artists: [{ id: 'a1', name: 'Kendrick Lamar' }, { id: 'a2', name: 'SZA' }],
      album: { id: 'al1', name: 'Black Panther' },
      duration_ms: 200000,
      external_ids: {},
    };
    const navidromeSong: NavidromeSong = {
      id: 'nd1',
      title: 'All The Stars',
      artist: 'Kendrick Lamar',
      album: 'Black Panther',
      duration: 200,
    };
    const score = calculateTrackSimilarity(multiArtistTrack, navidromeSong);
    expect(score).toBeGreaterThan(0.9);
  });
});

describe('album similarity cap removed', () => {
  it('returns raw token ratio without 0.8 multiplier', () => {
    const score = calculateAlbumSimilarity('Same Album', 'Same Album');
    expect(score).toBe(1.0);
  });

  it('returns proportional ratio for partial matches', () => {
    const score = calculateAlbumSimilarity('Greatest Hits Vol 1', 'Greatest Hits');
    expect(score).toBeGreaterThan(0.5);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

describe('article prefix stripping in normalizeString', () => {
  it('strips leading "the"', () => {
    expect(normalizeString('The Weeknd')).toBe('weeknd');
  });

  it('strips leading "a"', () => {
    expect(normalizeString('A Tribe Called Quest')).toBe('tribe called quest');
  });

  it('strips leading "an"', () => {
    expect(normalizeString('An Animal')).toBe('animal');
  });

  it('does not strip articles in the middle of a string', () => {
    expect(normalizeString('Getting the Thing')).toBe('getting the thing');
  });

  it('does not strip articles at the end of a string', () => {
    expect(normalizeString('Meet The')).toBe('meet the');
  });
});

describe('artist gate', () => {
  it('rejects wrong-artist match with same title', () => {
    const spotifyTrack: SpotifyTrack = {
      id: 'sp1',
      name: 'Stay Another Night',
      uri: 'spotify:track:sp1',
      artists: [{ id: 'a1', name: 'Chris Ayer' }],
      album: { id: 'al1', name: 'Some Album' },
      duration_ms: 200000,
      external_ids: {},
    };
    const wrongCandidate: NavidromeSong = {
      id: 'nd1',
      title: 'Stay Another Night',
      artist: 'Cheat Codes',
      album: 'Some Album',
      duration: 200,
    };
    const score = calculateTrackSimilarity(spotifyTrack, wrongCandidate);
    expect(score).toBeLessThan(0.8);
  });

  it('still matches correct artist with same title', () => {
    const spotifyTrack: SpotifyTrack = {
      id: 'sp1',
      name: 'Stay Another Night',
      uri: 'spotify:track:sp1',
      artists: [{ id: 'a1', name: 'Chris Ayer' }],
      album: { id: 'al1', name: 'Some Album' },
      duration_ms: 200000,
      external_ids: {},
    };
    const correctCandidate: NavidromeSong = {
      id: 'nd1',
      title: 'Stay Another Night',
      artist: 'Chris Ayer',
      album: 'Some Album',
      duration: 200,
    };
    const score = calculateTrackSimilarity(spotifyTrack, correctCandidate);
    expect(score).toBeGreaterThan(0.8);
  });
});

describe('version mismatch penalty', () => {
  it('rejects remix matching original', () => {
    const spotifyTrack: SpotifyTrack = {
      id: 'sp2',
      name: 'Love Me Like That',
      uri: 'spotify:track:sp2',
      artists: [{ id: 'a1', name: 'State of Sound' }],
      album: { id: 'al1', name: 'Some Album' },
      duration_ms: 200000,
      external_ids: {},
    };
    const remixCandidate: NavidromeSong = {
      id: 'nd2',
      title: 'Love Me Like That (Landis Remix)',
      artist: 'State of Sound',
      album: 'Some Album',
      duration: 200,
    };
    const score = calculateTrackSimilarity(spotifyTrack, remixCandidate);
    expect(score).toBeLessThan(0.8);
  });

  it('rejects acoustic matching original', () => {
    const spotifyTrack: SpotifyTrack = {
      id: 'sp3',
      name: 'Some Song',
      uri: 'spotify:track:sp3',
      artists: [{ id: 'a1', name: 'Some Artist' }],
      album: { id: 'al1', name: 'Some Album' },
      duration_ms: 200000,
      external_ids: {},
    };
    const acousticCandidate: NavidromeSong = {
      id: 'nd3',
      title: 'Some Song (Acoustic)',
      artist: 'Some Artist',
      album: 'Some Album',
      duration: 200,
    };
    const score = calculateTrackSimilarity(spotifyTrack, acousticCandidate);
    expect(score).toBeLessThan(0.8);
  });

  it('rejects live matching original', () => {
    const spotifyTrack: SpotifyTrack = {
      id: 'sp4',
      name: 'Some Song',
      uri: 'spotify:track:sp4',
      artists: [{ id: 'a1', name: 'Some Artist' }],
      album: { id: 'al1', name: 'Some Album' },
      duration_ms: 200000,
      external_ids: {},
    };
    const liveCandidate: NavidromeSong = {
      id: 'nd4',
      title: 'Some Song (Live)',
      artist: 'Some Artist',
      album: 'Some Album',
      duration: 200,
    };
    const score = calculateTrackSimilarity(spotifyTrack, liveCandidate);
    expect(score).toBeLessThan(0.8);
  });

  it('still matches when both have the same version marker', () => {
    const spotifyTrack: SpotifyTrack = {
      id: 'sp5',
      name: 'Some Song (Remix)',
      uri: 'spotify:track:sp5',
      artists: [{ id: 'a1', name: 'Some Artist' }],
      album: { id: 'al1', name: 'Some Album' },
      duration_ms: 200000,
      external_ids: {},
    };
    const remixCandidate: NavidromeSong = {
      id: 'nd5',
      title: 'Some Song (Remix)',
      artist: 'Some Artist',
      album: 'Some Album',
      duration: 200,
    };
    const score = calculateTrackSimilarity(spotifyTrack, remixCandidate);
    expect(score).toBeGreaterThan(0.8);
  });
});

describe('hasVersionMismatch', () => {
  it('detects mismatch when one has remix and other does not', () => {
    expect(hasVersionMismatch('Song', 'Song (Remix)')).toBe(true);
    expect(hasVersionMismatch('Song (Remix)', 'Song')).toBe(true);
  });

  it('detects no mismatch when both lack version markers', () => {
    expect(hasVersionMismatch('Song', 'Song')).toBe(false);
  });

  it('detects no mismatch when both have same version marker', () => {
    expect(hasVersionMismatch('Song (Remix)', 'Song (Remix)')).toBe(false);
  });

  it('detects mismatch when versions differ (remix vs live)', () => {
    expect(hasVersionMismatch('Song (Remix)', 'Song (Live)')).toBe(true);
  });

  it('does not false-positive on titles without version markers in parentheses', () => {
    expect(hasVersionMismatch('Live Your Life', 'Live Your Life')).toBe(false);
  });

  it('detects mismatch when markers partially overlap (Extended Mix vs Radio Edit Mix)', () => {
    expect(hasVersionMismatch('Song (Extended Mix)', 'Song (Radio Edit Mix)')).toBe(true);
    expect(hasVersionMismatch('Song (Extended Mix)', 'Song (Extended Mix) (Radio Edit Mix)')).toBe(true);
  });
});
