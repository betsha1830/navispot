import { describe, it, expect } from "vitest";
import { getChangedPlaylistIds } from "./refresh-change-detection";
import type { SpotifyPlaylist } from "@/types/spotify";

const LIKED = "liked-songs";

function playlist(id: string, total: number, snapshotId: string): SpotifyPlaylist {
  return {
    id,
    name: id,
    description: "",
    images: [],
    owner: { id: "owner", display_name: "owner" },
    items: { total },
    snapshot_id: snapshotId,
    public: false,
  };
}

describe("getChangedPlaylistIds", () => {
  it("includes playlists whose track count changed", () => {
    expect(
      getChangedPlaylistIds({
        sourcePlaylists: [playlist("a", 12, "s1")],
        oldTrackCounts: new Map([["a", 10]]),
        oldSnapshots: new Map([["a", "s1"]]),
        oldLikedSongsCount: 1000,
        freshLikedSongsCount: 1000,
        likedSongsId: LIKED,
      }),
    ).toEqual(["a"]);
  });

  it("includes playlists whose snapshot changed even with unchanged count", () => {
    expect(
      getChangedPlaylistIds({
        sourcePlaylists: [playlist("a", 10, "s2")],
        oldTrackCounts: new Map([["a", 10]]),
        oldSnapshots: new Map([["a", "s1"]]),
        oldLikedSongsCount: 1000,
        freshLikedSongsCount: 1000,
        likedSongsId: LIKED,
      }),
    ).toEqual(["a"]);
  });

  it("excludes playlists absent from the old snapshot map (newly created)", () => {
    expect(
      getChangedPlaylistIds({
        sourcePlaylists: [playlist("new", 5, "s1")],
        oldTrackCounts: new Map(),
        oldSnapshots: new Map(),
        oldLikedSongsCount: 0,
        freshLikedSongsCount: 0,
        likedSongsId: LIKED,
      }),
    ).toEqual([]);
  });

  it("returns [] when nothing changed", () => {
    expect(
      getChangedPlaylistIds({
        sourcePlaylists: [playlist("a", 10, "s1")],
        oldTrackCounts: new Map([["a", 10]]),
        oldSnapshots: new Map([["a", "s1"]]),
        oldLikedSongsCount: 1000,
        freshLikedSongsCount: 1000,
        likedSongsId: LIKED,
      }),
    ).toEqual([]);
  });

  it("includes liked-songs when the liked count changed", () => {
    expect(
      getChangedPlaylistIds({
        sourcePlaylists: [],
        oldTrackCounts: new Map(),
        oldSnapshots: new Map(),
        oldLikedSongsCount: 1000,
        freshLikedSongsCount: 1001,
        likedSongsId: LIKED,
      }),
    ).toEqual([LIKED]);
  });

  it("does not include liked-songs when the liked count is unchanged", () => {
    expect(
      getChangedPlaylistIds({
        sourcePlaylists: [],
        oldTrackCounts: new Map(),
        oldSnapshots: new Map(),
        oldLikedSongsCount: 1000,
        freshLikedSongsCount: 1000,
        likedSongsId: LIKED,
      }),
    ).toEqual([]);
  });
});
