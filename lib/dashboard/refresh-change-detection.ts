import type { SpotifyPlaylist } from "@/types/spotify";

export interface ChangeDetectionInput {
  sourcePlaylists: SpotifyPlaylist[];
  oldTrackCounts: Map<string, number>;
  oldSnapshots: Map<string, string>;
  oldLikedSongsCount: number;
  freshLikedSongsCount: number;
  likedSongsId: string;
}

export function getChangedPlaylistIds(input: ChangeDetectionInput): string[] {
  const {
    sourcePlaylists,
    oldTrackCounts,
    oldSnapshots,
    oldLikedSongsCount,
    freshLikedSongsCount,
    likedSongsId,
  } = input;

  const changed = sourcePlaylists
    .filter((p) => oldSnapshots.has(p.id))
    .filter(
      (p) =>
        oldTrackCounts.get(p.id) !== p.items.total ||
        oldSnapshots.get(p.id) !== p.snapshot_id,
    )
    .map((p) => p.id);

  // Liked Songs is synthetic (never an element of `playlists`), so the
  // snapshot-based path above can never see it. Detect it by its count.
  if (freshLikedSongsCount !== oldLikedSongsCount && !changed.includes(likedSongsId)) {
    changed.push(likedSongsId);
  }

  return changed;
}
