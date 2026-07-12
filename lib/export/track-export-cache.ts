import { SpotifyTrack } from '@/types/spotify';
import { trackKey as getTrackKey } from '@/lib/spotify/track-identity';

export interface TrackExportStatus {
  spotifyTrackId: string;
  navidromeSongId?: string;
  status: 'matched' | 'ambiguous' | 'unmatched';
  matchStrategy: 'isrc' | 'fuzzy' | 'strict' | 'none';
  matchScore: number;
  matchedAt: string;
}

export interface PlaylistEntryData {
  entryKey: string;
  position: number;
  trackKey: string;
  spotifyTrackId?: string | null;
  spotifyUri?: string;
  navidromeSongId?: string;
  status: 'matched' | 'ambiguous' | 'unmatched';
  matchStrategy: 'isrc' | 'fuzzy' | 'strict' | 'none';
  matchScore: number;
  matchedAt: string;
}

export interface PlaylistExportData {
  spotifyPlaylistId: string;
  spotifySnapshotId: string;
  playlistName: string;
  navidromePlaylistId?: string;
  exportedAt: string;
  trackCount: number;
  tracks: Record<string, TrackExportStatus>;
  statistics: {
    total: number;
    matched: number;
    unmatched: number;
    ambiguous: number;
  };
}

export interface PlaylistExportDataV2 {
  schemaVersion: 2;
  spotifyPlaylistId: string;
  sourceRevision: string;
  playlistName: string;
  navidromePlaylistId?: string;
  exportedAt: string;
  trackCount: number;
  entries: PlaylistEntryData[];
  tracks: Record<string, TrackExportStatus>;
  statistics: {
    total: number;
    matched: number;
    unmatched: number;
    ambiguous: number;
  };
}

export interface DiffResult {
  newTracks: SpotifyTrack[];
  unchangedTracks: Array<{
    spotifyTrack: SpotifyTrack;
    cachedStatus: TrackExportStatus;
  }>;
  removedTracks: string[];
}

const STORAGE_KEY_PREFIX = 'navispot-playlist-export-';
const DEFAULT_MAX_AGE_DAYS = 90;

function getStorageKey(playlistId: string): string {
  return `${STORAGE_KEY_PREFIX}${playlistId}`;
}

function isV2(data: PlaylistExportData | PlaylistExportDataV2): data is PlaylistExportDataV2 {
  return 'schemaVersion' in data && data.schemaVersion === 2;
}

export function savePlaylistExportData(playlistId: string, data: PlaylistExportData | PlaylistExportDataV2): void {
  try {
    const key = getStorageKey(playlistId);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save playlist export data:', error);
  }
}

export function loadPlaylistExportData(playlistId: string): PlaylistExportData | PlaylistExportDataV2 | undefined {
  try {
    const key = getStorageKey(playlistId);
    const data = localStorage.getItem(key);
    if (!data) return undefined;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load playlist export data:', error);
    return undefined;
  }
}

export function loadV1PlaylistData(playlistId: string): PlaylistExportData | undefined {
  const data = loadPlaylistExportData(playlistId);
  if (!data) return undefined;
  if (isV2(data)) return undefined;
  return data;
}

export function deletePlaylistExportData(playlistId: string): void {
  try {
    const key = getStorageKey(playlistId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to delete playlist export data:', error);
  }
}

export function getAllExportData(): Map<string, PlaylistExportData | PlaylistExportDataV2> {
  const result = new Map<string, PlaylistExportData | PlaylistExportDataV2>();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const playlistId = key.slice(STORAGE_KEY_PREFIX.length);
          result.set(playlistId, parsed);
        }
      }
    }
  } catch (error) {
    console.error('Failed to get all export data:', error);
  }
  return result;
}

export function isPlaylistUpToDate(data: PlaylistExportData | PlaylistExportDataV2, currentSourceId: string): boolean {
  if (isV2(data)) {
    return data.sourceRevision === currentSourceId;
  }
  return data.spotifySnapshotId === currentSourceId;
}

export function isPlaylistUpToDateV1(data: PlaylistExportData, currentSnapshotId: string): boolean {
  return data.spotifySnapshotId === currentSnapshotId;
}

export function calculateDiff(currentTracks: SpotifyTrack[], cachedData: PlaylistExportData | PlaylistExportDataV2): DiffResult {
  const newTracks: SpotifyTrack[] = [];
  const unchangedTracks: DiffResult['unchangedTracks'] = [];
  const removedTracks: string[] = [];

  if (isV2(cachedData)) {
    const cachedTrackKeys = new Set(Object.keys(cachedData.tracks));

    currentTracks.forEach(track => {
      const tk = getTrackKey(track);
      const cachedStatus = cachedData.tracks[tk];
      if (cachedStatus) {
        unchangedTracks.push({ spotifyTrack: track, cachedStatus });
      } else {
        newTracks.push(track);
      }
    });

    const currentTrackKeys = new Set(currentTracks.map(t => getTrackKey(t)));
    cachedTrackKeys.forEach(tk => {
      if (!currentTrackKeys.has(tk)) {
        removedTracks.push(tk);
      }
    });
    return { newTracks, unchangedTracks, removedTracks };
  }

  const currentTrackIds = new Set(currentTracks.map(t => t.id).filter((id): id is string => id != null));
  const cachedTrackIds = new Set(Object.keys(cachedData.tracks));

  currentTracks.forEach(track => {
    const cachedStatus = track.id ? cachedData.tracks[track.id] : undefined;
    if (cachedStatus) {
      unchangedTracks.push({ spotifyTrack: track, cachedStatus });
    } else {
      newTracks.push(track);
    }
  });

  cachedTrackIds.forEach(trackId => {
    if (!currentTrackIds.has(trackId)) {
      removedTracks.push(trackId);
    }
  });

  return { newTracks, unchangedTracks, removedTracks };
}

export function clearExpiredCache(maxAgeDays: number = DEFAULT_MAX_AGE_DAYS): void {
  const maxAge = maxAgeDays;
  const cutoffTime = Date.now() - maxAge * 24 * 60 * 60 * 1000;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as { exportedAt: string };
            const exportedAt = new Date(parsed.exportedAt).getTime();
            if (exportedAt < cutoffTime) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Failed to clear expired cache:', error);
  }
}

export function buildV2Cache(
  spotifyPlaylistId: string,
  sourceRevision: string,
  playlistName: string,
  navidromePlaylistId: string | undefined,
  tracks: SpotifyTrack[],
  trackMatches: Record<string, TrackExportStatus>,
  statistics: { total: number; matched: number; unmatched: number; ambiguous: number },
  entryKeys: string[],
): PlaylistExportDataV2 {
  const entries: PlaylistEntryData[] = tracks.map((track, index) => {
    const tk = getTrackKey(track);
    const match = trackMatches[tk];
    return {
      entryKey: entryKeys[index] || `${index}:${tk}`,
      position: index,
      trackKey: tk,
      spotifyTrackId: track.id,
      spotifyUri: track.uri,
      navidromeSongId: match?.navidromeSongId,
      status: match?.status || 'unmatched',
      matchStrategy: match?.matchStrategy || 'none',
      matchScore: match?.matchScore || 0,
      matchedAt: match?.matchedAt || new Date().toISOString(),
    };
  });

  return {
    schemaVersion: 2,
    spotifyPlaylistId,
    sourceRevision,
    playlistName,
    navidromePlaylistId,
    exportedAt: new Date().toISOString(),
    trackCount: tracks.length,
    entries,
    tracks: trackMatches,
    statistics,
  };
}
