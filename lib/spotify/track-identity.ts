import { SpotifyTrack, SpotifyPlaylistEntry } from '@/types/spotify';

export function trackKey(track: SpotifyTrack): string {
  if (track.uri) return track.uri;
  if (track.id) return `spotify:track:${track.id}`;
  const artistNames = track.artists
    .map((a) => a.name)
    .sort()
    .join(',');
  const fingerprint = [
    track.name,
    artistNames,
    track.album.name,
    track.duration_ms.toString(),
  ].join('|');
  return `local:${fingerprint}`;
}

export function entryKey(
  position: number,
  track: SpotifyTrack,
  snapshotId?: string,
): string {
  return `${position}:${trackKey(track)}` + (snapshotId ? `@${snapshotId}` : '');
}

export function sourceRevision(
  entries: SpotifyPlaylistEntry[],
  snapshotId?: string,
): string {
  if (snapshotId) return snapshotId;
  const ordered = entries.map((e) => e.entryKey).join(',');
  return ordered;
}

export function normalizeEntries(
  tracks: SpotifyTrack[],
  snapshotId?: string,
): SpotifyPlaylistEntry[] {
  return tracks.map((track, index) => ({
    track,
    trackKey: trackKey(track),
    entryKey: entryKey(index, track, snapshotId),
    position: index,
  }));
}

export function playlistEntryFromTrack(
  track: SpotifyTrack,
  position: number,
  snapshotId?: string,
): SpotifyPlaylistEntry {
  return {
    track,
    trackKey: trackKey(track),
    entryKey: entryKey(position, track, snapshotId),
    position,
  };
}
