import { describe, it, expect } from 'vitest';
import { trackKey, entryKey, normalizeEntries } from '@/lib/spotify/track-identity';
import { SpotifyTrack } from '@/types/spotify';

const baseTrack: SpotifyTrack = {
  id: 'abc123',
  name: 'Test Song',
  uri: 'spotify:track:abc123',
  artists: [{ id: 'art1', name: 'Test Artist' }],
  album: { id: 'alb1', name: 'Test Album' },
  duration_ms: 200000,
  external_ids: {},
};

const localTrack: SpotifyTrack = {
  id: null,
  name: 'Live Mashup',
  uri: undefined,
  is_local: true,
  artists: [{ id: null, name: 'Local Band' }],
  album: { id: null, name: 'Live Album' },
  duration_ms: 180000,
  external_ids: {},
};

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

describe('trackKey', () => {
  it('uses uri when available', () => {
    expect(trackKey(baseTrack)).toBe('spotify:track:abc123');
  });

  it('constructs spotify:track:<id> when uri is missing', () => {
    const t = { ...baseTrack, uri: undefined };
    expect(trackKey(t)).toBe('spotify:track:abc123');
  });

  it('generates fingerprint for local tracks without id or uri', () => {
    const key = trackKey(localTrack);
    expect(key).toMatch(/^local:/);
    expect(key).toContain('Live Mashup');
    expect(key).toContain('Local Band');
  });

  it('generates consistent keys for identical tracks', () => {
    const a = trackKey(localTrack);
    const b = trackKey({ ...localTrack });
    expect(a).toBe(b);
  });

  it('generates different keys for different tracks', () => {
    const a = trackKey(localTrack);
    const b = trackKey({ ...localTrack, name: 'Different Song' });
    expect(a).not.toBe(b);
  });

  it('handles empty artist tracks', () => {
    const key = trackKey(emptyArtistTrack);
    expect(key).toMatch(/^local:/);
    expect(key).not.toContain('undefined');
  });
});

describe('entryKey', () => {
  it('includes position, trackKey, and optional snapshot', () => {
    const key = entryKey(0, baseTrack, 'snap1');
    expect(key).toBe('0:spotify:track:abc123@snap1');
  });

  it('omits snapshot suffix when not provided', () => {
    const key = entryKey(0, baseTrack);
    expect(key).toBe('0:spotify:track:abc123');
  });

  it('different positions produce different keys', () => {
    expect(entryKey(0, baseTrack)).not.toBe(entryKey(1, baseTrack));
  });
});

describe('normalizeEntries', () => {
  it('creates ordered entries with correct positions', () => {
    const entries = normalizeEntries([baseTrack, localTrack]);
    expect(entries).toHaveLength(2);
    expect(entries[0].position).toBe(0);
    expect(entries[1].position).toBe(1);
    expect(entries[0].trackKey).toBe('spotify:track:abc123');
    expect(entries[1].trackKey).toMatch(/^local:/);
  });

  it('entryKeys differ for duplicates', () => {
    const entries = normalizeEntries([baseTrack, { ...baseTrack }]);
    expect(entries[0].entryKey).not.toBe(entries[1].entryKey);
    expect(entries[0].trackKey).toBe(entries[1].trackKey);
  });
});
