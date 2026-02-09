# Feature: Null Track Handling

**Status:** ✅ Merged via [PR #3](https://github.com/betsha1830/navispot/pull/3)  
**Author:** [FaKiieZ](https://github.com/FaKiieZ)  
**Date:** February 7, 2026

---

## Problem Statement

When exporting large Spotify playlists (1500+ tracks), the export process would fail or crash due to:

1. **Null tracks** - Spotify API occasionally returns `null` entries in playlist track lists
2. **Empty track names** - Some tracks have missing or empty `name` fields
3. **Unmatched track errors** - Individual track matching errors would halt the entire export

These edge cases were discovered when attempting to export [this playlist](https://open.spotify.com/playlist/4pRYn3s8IG17HzC4sMed4D) containing over 1500 songs.

---

## Solution

Implemented defensive programming techniques to gracefully handle invalid track data:

### 1. Null Track Filtering (Dashboard.tsx)

Added `.filter((t) => t != null)` before processing track arrays:

```typescript
// Filter out null tracks from playlist tracks
const songs: Song[] = tracks.filter((t) => t != null).map((track) => ({
  spotifyTrackId: track.id,
  title: track.name,
  // ...
}))

// Filter out null tracks from saved/liked songs
tracks = savedTracks.map((t) => t.track).filter((t) => t != null)

// Filter out null tracks from regular playlists
tracks = (await spotifyClient.getAllPlaylistTracks(item.id, signal))
  .map((t) => t.track)
  .filter((t) => t != null)
```

**Locations:**
- `components/Dashboard/Dashboard.tsx:537` - Playlist tracks display
- `components/Dashboard/Dashboard.tsx:870` - Saved/liked songs
- `components/Dashboard/Dashboard.tsx:873` - Regular playlist tracks

### 2. Empty Track Name Validation (orchestrator.ts)

Added validation in `matchTrack()` function to return "unmatched" status for invalid tracks:

```typescript
if (!spotifyTrack || !spotifyTrack.name) {
  console.warn("Invalid Spotify track encountered:", {
    track: spotifyTrack,
    hasName: spotifyTrack?.name ? true : false,
    id: spotifyTrack?.id,
    artists: spotifyTrack?.artists,
  });
  return {
    spotifyTrack: spotifyTrack || ({} as SpotifyTrack),
    navidromeSong: undefined,
    matchStrategy: "none",
    matchScore: 0,
    status: "unmatched",
  };
}
```

**Location:** `lib/matching/orchestrator.ts:57-72`

### 3. Error Recovery in Batch Matching (orchestrator.ts)

Wrapped individual track matching in try-catch to prevent export failures:

```typescript
try {
  const match = await matchTrack(client, track, options, signal);
  results.push(match);
} catch (error) {
  console.error("Error matching track:", {
    track,
    error: error instanceof Error ? error.message : String(error),
  });
  results.push({
    spotifyTrack: track,
    navidromeSong: undefined,
    matchStrategy: "none",
    matchScore: 0,
    status: "unmatched",
  });
}
```

**Location:** `lib/matching/orchestrator.ts:190-207`

---

## Files Modified

| File | Changes |
|------|---------|
| `components/Dashboard/Dashboard.tsx` | Added `.filter((t) => t != null)` in 3 locations |
| `lib/matching/orchestrator.ts` | Added validation and error handling (+37 lines) |

---

## Testing

### Manual Testing

1. **Large Playlist Export**
   - Export playlist with 1500+ tracks
   - Verify export completes without crashing
   - Check console for warning messages

2. **Console Monitoring**
   - Look for: `"Invalid Spotify track encountered:"`
   - Look for: `"Error matching track:"`
   - These indicate the fixes are working

### Expected Behavior

- ✅ Export continues even when null tracks are encountered
- ✅ Tracks with empty names are marked as "unmatched"
- ✅ Individual track errors don't halt the export process
- ✅ Console warnings provide debugging information
- ✅ Export statistics remain accurate

---

## Impact

- **Before:** Export would crash or fail on large playlists with invalid track data
- **After:** Export completes successfully, skipping problematic tracks

---

## Technical Notes

- Uses loose equality check (`!= null`) to catch both `null` and `undefined`
- Invalid tracks are marked as "unmatched" and appear in the export report
- Console warnings help identify patterns in Spotify's invalid data
- No breaking changes to existing functionality
