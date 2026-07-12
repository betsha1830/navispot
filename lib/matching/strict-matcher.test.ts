import { describe, it, expect } from 'vitest';
import { filterStrictMatches } from '@/lib/matching/strict-matcher';
import { NavidromeNativeSong } from '@/types/navidrome';

const song1: NavidromeNativeSong = {
  id: 's1',
  title: 'Test Song',
  artist: 'Test Artist',
  album: 'Album',
  duration: 200,
};

const song2: NavidromeNativeSong = {
  id: 's2',
  title: 'Test Song',
  artist: 'Other Artist',
  album: 'Album',
  duration: 200,
};

const song3: NavidromeNativeSong = {
  id: 's3',
  title: 'Test Song',
  artist: 'Yet Another',
  album: 'Album',
  duration: 202,
};

describe('filterStrictMatches', () => {
  it('matches exact artist and title', () => {
    const result = filterStrictMatches([song1, song2], 'test artist', 'test song');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('s1');
  });

  it('matches any artist when normalizedArtist is null (artistless tracks)', () => {
    const result = filterStrictMatches([song1, song2, song3], null, 'test song');
    expect(result).toHaveLength(3);
  });

  it('returns empty for no title match', () => {
    const result = filterStrictMatches([song1], 'test artist', 'wrong title');
    expect(result).toHaveLength(0);
  });
});
