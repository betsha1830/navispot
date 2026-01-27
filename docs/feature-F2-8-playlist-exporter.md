# Feature F2.8: Playlist Exporter

## Feature Overview

The Playlist Exporter feature creates playlists in Navidrome based on matched tracks from Spotify. It supports multiple export modes (create new, append to existing, overwrite) and handles partial failures gracefully.

### Purpose and Functionality

The playlist exporter enables the application to:

- Create new playlists in Navidrome with matched tracks
- Append matched tracks to existing playlists
- Overwrite existing playlists with new matched tracks
- Handle partial failures where some tracks fail to export
- Provide detailed export results with statistics
- Support progress tracking during export operations
- Validate credentials before attempting export

## Implementation Details

### Files Modified/Created

1. **lib/export/playlist-exporter.ts** - Created new playlist exporter implementation

### Requirements Met

| Requirement | Status | Location |
|-------------|--------|----------|
| Create new playlist in Navidrome | ✅ | `playlist-exporter.ts:45-68` |
| Add matched tracks via `updatePlaylist` | ✅ | `playlist-exporter.ts:70-95` |
| Handle partial failures gracefully | ✅ | `playlist-exporter.ts:97-120` |

## Components

### PlaylistExporter Interface

Located in `lib/export/playlist-exporter.ts`:

| Method | Description |
|--------|-------------|
| `exportPlaylist(playlistName, matches, options)` | Export matched tracks to a new or existing playlist |
| `createPlaylist(name, songIds)` | Create a new playlist with song IDs |
| `appendToPlaylist(playlistId, songIds)` | Append song IDs to an existing playlist |
| `overwritePlaylist(playlistId, songIds)` | Replace playlist contents with song IDs |

### ExportMode Enum

```typescript
export type ExportMode = 'create' | 'append' | 'overwrite';
```

- **create**: Creates a new playlist with the matched tracks
- **append**: Adds matched tracks to an existing playlist
- **overwrite**: Replaces all tracks in an existing playlist with matched tracks

### ExportProgress Interface

```typescript
export interface ExportProgress {
  current: number;           // Current track being exported
  total: number;             // Total number of tracks to export
  percent: number;           // Percentage complete (0-100)
  currentTrack?: string;     // Name of track currently being exported
  status: 'preparing' | 'exporting' | 'completed' | 'failed';
}
```

### ExportResult Interface

```typescript
export interface ExportResult {
  success: boolean;
  playlistId?: string;
  playlistName: string;
  mode: ExportMode;
  statistics: {
    total: number;
    exported: number;
    failed: number;
    skipped: number;
  };
  errors: ExportError[];
  duration: number;
}

export interface ExportError {
  trackName: string;
  artistName: string;
  reason: string;
}
```

### PlaylistExporterOptions Interface

```typescript
export interface PlaylistExporterOptions {
  mode?: ExportMode;
  existingPlaylistId?: string;
  skipUnmatched?: boolean;
  onProgress?: ProgressCallback;
  cachedData?: PlaylistExportData;
  signal?: AbortSignal;
}
```

### Cancellation Support

The playlist exporter supports cancellation through the `AbortSignal` option:

```typescript
const abortController = new AbortController();

const result = await exporter.exportPlaylist(
  'My Playlist',
  matches,
  {
    mode: 'create',
    signal: abortController.signal,
    onProgress: (progress) => updateProgressUI(progress),
  }
);

// Cancel the export
abortController.abort();
```

When cancellation is triggered:
- All ongoing network requests to Navidrome are aborted
- The export operation throws an `AbortError`
- The caller can catch this error and handle the cancellation appropriately

**Key Points:**
- The `signal` parameter is optional - if not provided, cancellation is disabled
- Cancellation checks are performed before each network request
- Partial exports are not committed to Navidrome when cancelled
- Progress callbacks receive the cancellation signal and stop being called

## Usage Examples

### Basic Playlist Export

```typescript
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { createPlaylistExporter } from '@/lib/export/playlist-exporter';
import { TrackMatch } from '@/types/matching';

const navidromeClient = new NavidromeApiClient(
  'https://navidrome.example.com',
  'username',
  'password'
);

const exporter = createPlaylistExporter(navidromeClient);

const matches: TrackMatch[] = [
  // ... matched tracks from batch matcher
];

const result = await exporter.exportPlaylist('My Spotify Playlist', matches);

console.log(`Export ${result.success ? 'succeeded' : 'failed'}`);
console.log(`Exported: ${result.statistics.exported}/${result.statistics.total}`);
console.log(`Duration: ${result.duration}ms`);
```

### Export with Progress Tracking

```typescript
const result = await exporter.exportPlaylist(
  'My Playlist',
  matches,
  {
    onProgress: (progress) => {
      console.log(`Progress: ${progress.percent}%`);
      console.log(`Current track: ${progress.currentTrack}`);
    }
  }
);
```

### Append to Existing Playlist

```typescript
const result = await exporter.exportPlaylist(
  'My Playlist',
  matches,
  {
    mode: 'append',
    existingPlaylistId: 'existing-playlist-id',
    skipUnmatched: true,
  }
);
```

### Overwrite Existing Playlist

```typescript
const result = await exporter.exportPlaylist(
  'My Playlist',
  matches,
  {
    mode: 'overwrite',
    existingPlaylistId: 'existing-playlist-id',
  }
);
```

### Direct Playlist Creation

```typescript
const result = await exporter.createPlaylist(
  'New Playlist Name',
  ['song-id-1', 'song-id-2', 'song-id-3']
);

if (result.success) {
  console.log(`Created playlist with ID: ${result.playlistId}`);
}
```

### Direct Playlist Update

```typescript
// Append tracks
await exporter.appendToPlaylist('playlist-id', ['new-song-id']);

// Overwrite playlist
await exporter.overwritePlaylist('playlist-id', ['song-1', 'song-2']);
```

### Error Handling

```typescript
try {
  const result = await exporter.exportPlaylist('Playlist', matches);

  if (!result.success) {
    console.log('Partial failure occurred');
    for (const error of result.errors) {
      console.log(`Failed to export "${error.trackName}" by ${error.artistName}: ${error.reason}`);
    }
  }

  // Access failed tracks
  console.log(`Failed tracks: ${result.statistics.failed}`);
  console.log(`Skipped tracks: ${result.statistics.skipped}`);
} catch (error) {
  console.error('Export failed completely:', error);
}
```

### Using with Batch Matcher Results

```typescript
import { createBatchMatcher } from '@/lib/matching/batch-matcher';
import { createPlaylistExporter } from '@/lib/export/playlist-exporter';

const batchMatcher = createBatchMatcher(spotifyClient, navidromeClient);
const exporter = createPlaylistExporter(navidromeClient);

// Match playlist
const matchResult = await batchMatcher.matchPlaylist('spotify-playlist-id');

// Export matched tracks
const exportResult = await exporter.exportPlaylist(
  matchResult.playlistName,
  matchResult.matches,
  {
    mode: 'create',
    skipUnmatched: true,
    onProgress: (progress) => updateProgressUI(progress),
  }
);

console.log(`Exported ${exportResult.statistics.exported} tracks`);
```

## Export Modes

### Create New Playlist

```typescript
{
  mode: 'create',
  // No existingPlaylistId needed
}
```

This mode:
1. Creates a new playlist with the specified name
2. Adds all matched tracks to the new playlist
3. Returns the new playlist ID

### Append to Existing Playlist

```typescript
{
  mode: 'append',
  existingPlaylistId: 'playlist-id-to-append-to',
}
```

This mode:
1. Validates the existing playlist exists
2. Adds matched tracks to the playlist using `updatePlaylist`
3. Preserves existing tracks in the playlist

### Overwrite Existing Playlist

```typescript
{
  mode: 'overwrite',
  existingPlaylistId: 'playlist-id-to-overwrite',
}
```

This mode:
1. Validates the existing playlist exists
2. Removes all existing tracks from the playlist
3. Adds all matched tracks to the playlist
4. Results in a playlist containing only the newly matched tracks

## Handling Partial Failures

The exporter handles partial failures gracefully:

1. **Skipped Unmatched Tracks**: If `skipUnmatched` is true, tracks without Navidrome matches are skipped without causing failure

2. **Failed Export Attempts**: If a track fails to export (e.g., song not found, permission denied):
   - The error is recorded in the `errors` array
   - Export continues with remaining tracks
   - The overall result indicates partial success

3. **Validation Errors**: If required parameters are missing:
   - The operation fails immediately
   - A descriptive error is returned

## Progress Tracking

Progress callbacks are called at key points during export:

```typescript
onProgress({
  current: 0,
  total: 100,
  percent: 0,
  status: 'preparing',
});

onProgress({
  current: 50,
  total: 100,
  percent: 50,
  currentTrack: 'Track Name',
  status: 'exporting',
});

onProgress({
  current: 100,
  total: 100,
  percent: 100,
  status: 'completed',
});
```

## Dependencies

This feature depends on:

- **F1.4 (Navidrome API Client)** - Uses `createPlaylist` and `updatePlaylist` methods
- **F2.7 (Batch Matcher)** - Uses match results containing matched/unmatched tracks

The Playlist Exporter is in turn a dependency for:

- **F3.5 (Export Preview)** - Shows export options and preview before actual export
- **F3.6 (Progress Tracker)** - Uses progress callback for real-time updates
- **F3.7 (Results Report)** - Shows export results and statistics

## Performance Considerations

- Creating playlists with many tracks (>1000) may require chunking
- Progress callbacks should be efficient to avoid slowing export
- Network timeouts should be handled with retries
- Rate limiting from Navidrome server should be respected
- Cancellation support via AbortSignal allows immediate termination of long-running exports
- Network requests are properly aborted when export is cancelled, preventing resource waste

## Error Handling

- **Network Errors**: Caught and recorded as export errors
- **Invalid Playlist ID**: Returns error for append/overwrite modes
- **Missing Navidrome Songs**: Recorded as skipped or failed based on options
- **Authentication Errors**: Propagated as exceptions

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Completed

**Last Verified:** January 4, 2026

The Playlist Exporter feature is fully implemented and verified. All sub-tasks have been completed, the code passes static analysis checks, and the implementation is ready for use by dependent features.
