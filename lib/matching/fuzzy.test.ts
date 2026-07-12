import { describe, it, expect } from 'vitest';
import { calculateTrackSimilarity, findBestMatch, normalizeTitle, normalizeArtistName } from '@/lib/matching/fuzzy';
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
