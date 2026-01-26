# Feature F2.7: Batch Matcher

## Feature Overview

The Batch Matcher feature processes all tracks in a Spotify playlist against Navidrome using the matching orchestrator. It provides progress tracking during matching and comprehensive statistics about match results.

### Purpose and Functionality

The batch matcher enables the application to:

- Process all tracks in a Spotify playlist for matching against Navidrome songs
- Track progress during the matching process with a callback mechanism
- Collect comprehensive statistics about match results (matched, ambiguous, unmatched)
- Support configurable matching options (ISRC, fuzzy, strict strategies)
- Support concurrent matching for improved performance
- Return complete results including track data, match results, and timing information

## Implementation Details

### Files Modified/Created

1. **lib/spotify/client.ts** - Added `export` keyword to `SpotifyClient` class
2. **lib/matching/batch-matcher.ts** - Created new batch matcher implementation

### Requirements Met

| Requirement | Status | Location |
|-------------|--------|----------|
| Process all tracks in playlist | ✅ | `batch-matcher.ts:62-90` |
| Show progress during matching | ✅ | `batch-matcher.ts:14` (ProgressCallback) |
| Collect match results with statistics | ✅ | `batch-matcher.ts:25-38` (BatchMatchResult) |

## Components

### BatchMatcher Interface

Located in `lib/matching/batch-matcher.ts`:

| Method | Description |
|--------|-------------|
| `matchPlaylist(playlistId, options, onProgress)` | Fetch playlist tracks and match them against Navidrome |
| `matchTracks(tracks, options, onProgress)` | Match an array of Spotify tracks against Navidrome |

### Progress Tracking

The batch matcher supports progress tracking via a callback mechanism with real-time statistics:

```typescript
interface BatchMatcherProgress {
  current: number;          // Current track number being processed
  total: number;            // Total number of tracks
  currentTrack?: SpotifyTrack;  // Track currently being processed
  percent: number;          // Percentage complete (0-100)
  matched?: number;         // Count of successfully matched tracks so far
  unmatched?: number;       // Count of unmatched tracks so far
}

type ProgressCallback = (progress: BatchMatcherProgress) => void | Promise<void>;
```

The `matched` and `unmatched` fields are calculated incrementally during processing and provide live statistics for UI updates. Tracks with status `'matched'` or `'ambiguous'` are counted as matched, while tracks with status `'unmatched'` are counted as unmatched.

### Options

```typescript
interface BatchMatcherOptions {
  enableISRC?: boolean;           // Enable ISRC matching (default: true)
  enableFuzzy?: boolean;          // Enable fuzzy matching (default: true)
  enableStrict?: boolean;         // Enable strict matching (default: true)
  fuzzyThreshold?: number;        // Minimum similarity score (default: 0.8)
  maxFuzzyCandidates?: number;    // Max candidates for fuzzy search (default: 20)
  concurrency?: number;           // Number of concurrent matches (default: 1)
}
```

### Result Structure

```typescript
interface BatchMatchResult {
  playlistId: string;           // ID of the Spotify playlist
  playlistName: string;         // Name of the playlist
  tracks: SpotifyPlaylistTrack[];  // All tracks from the playlist
  matches: TrackMatch[];        // Match results for each track
  statistics: {                 // Match statistics
    total: number;
    matched: number;
    ambiguous: number;
    unmatched: number;
    byStrategy: Record<MatchStrategy, number>;
  };
  duration: number;             // Time taken to process (ms)
}
```

## Usage Examples

### Basic Playlist Matching

```typescript
import { spotifyClient } from '@/lib/spotify/client';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { createBatchMatcher } from '@/lib/matching/batch-matcher';

const navidromeClient = new NavidromeApiClient(
  'https://navidrome.example.com',
  'username',
  'password'
);

const batchMatcher = createBatchMatcher(spotifyClient, navidromeClient);

const result = await batchMatcher.matchPlaylist('37i9dQZF1DXcBWIGoYBM5M');

console.log(`Processed ${result.statistics.total} tracks`);
console.log(`Matched: ${result.statistics.matched}`);
console.log(`Ambiguous: ${result.statistics.ambiguous}`);
console.log(`Unmatched: ${result.statistics.unmatched}`);
console.log(`Duration: ${result.duration}ms`);
```

### Matching with Progress Tracking

```typescript
const result = await batchMatcher.matchPlaylist(
  '37i9dQZF1DXcBWIGoYBM5M',
  {
    enableISRC: true,
    enableFuzzy: true,
    enableStrict: true,
    fuzzyThreshold: 0.8,
    concurrency: 3,  // Process 3 tracks concurrently
  },
  (progress) => {
    console.log(`Progress: ${progress.percent}%`);
    console.log(`Processing: ${progress.currentTrack?.name}`);
  }
);
```

### Direct Track Matching

```typescript
import { SpotifyTrack } from '@/types/spotify';

const tracks: SpotifyTrack[] = [
  {
    id: 'track1',
    name: 'Song Title',
    artists: [{ id: 'a1', name: 'Artist Name' }],
    album: { id: 'al1', name: 'Album Name', release_date: '2024-01-01' },
    duration_ms: 180000,
    external_ids: { isrc: 'US-S1Z-24-00001' },
    external_urls: { spotify: 'https://open.spotify.com/track/...' }
  },
  // ... more tracks
];

const result = await batchMatcher.matchTracks(
  tracks,
  { fuzzyThreshold: 0.85 },
  (progress) => {
    updateProgressBar(progress.percent);
  }
);

console.log(`Matched: ${result.statistics.matched}/${result.statistics.total}`);
```

### Accessing Match Results

```typescript
const result = await batchMatcher.matchPlaylist('37i9dQZF1DXcBWIGoYBM5M');

// Access matched tracks
const matched = result.matches.filter(m => m.status === 'matched');
for (const match of matched) {
  console.log(`${match.spotifyTrack.name} -> ${match.navidromeSong?.title} (${match.matchStrategy})`);
}

// Access ambiguous tracks (need manual review)
const ambiguous = result.matches.filter(m => m.status === 'ambiguous');
for (const match of ambiguous) {
  console.log(`${match.spotifyTrack.name} - ${match.candidates?.length} candidates`);
}

// Access unmatched tracks
const unmatched = result.matches.filter(m => m.status === 'unmatched');
console.log(`Unmatched tracks: ${unmatched.length}`);
```

### Statistics by Strategy

```typescript
const stats = result.statistics.byStrategy;
console.log('Matches by strategy:');
console.log(`  ISRC: ${stats.isrc}`);
console.log(`  Fuzzy: ${stats.fuzzy}`);
console.log(`  Strict: ${stats.strict}`);
console.log(`  None: ${stats.none}`);
```

## Concurrency Control

The batch matcher supports concurrent matching for improved performance on large playlists:

```typescript
// Sequential matching (default)
await batchMatcher.matchPlaylist(playlistId, { concurrency: 1 });

// Concurrent matching (3 tracks at a time)
await batchMatcher.matchPlaylist(playlistId, { concurrency: 3 });

// Maximum concurrency
await batchMatcher.matchPlaylist(playlistId, { concurrency: 10 });
```

**Note:** Higher concurrency may trigger rate limiting from the Navidrome server. Use with caution.

## Dependencies

This feature depends on:

- **F1.3 (Spotify API Client)** - Uses `getAllPlaylistTracks` method
- **F2.4 (Matching Orchestrator)** - Uses `matchTracks` and `getMatchStatistics` functions
- **F2.6 (Track Fetcher)** - Provides track fetching via Spotify client

The Batch Matcher is in turn a dependency for:

- **F3.3 (Playlist Detail View)** - Displays match results and statistics
- **F3.5 (Export Preview)** - Shows matched/unmatched counts before export
- **F3.6 (Progress Tracker)** - Uses progress callback for real-time updates

## Performance Considerations

- Sequential processing (concurrency=1) is the safest for avoiding rate limits
- Concurrent processing improves speed but may trigger rate limiting
- Progress callbacks add minimal overhead but should be efficient
- Large playlists (100+ tracks) benefit from concurrency settings
- Fuzzy matching with high candidate counts is the slowest operation

## Error Handling

- Network errors during track fetching are propagated to the caller
- Matching errors for individual tracks result in 'unmatched' status
- Progress callback errors are caught and logged but don't stop processing
- Partial results are returned even if some tracks fail to match

## Verification Results

### TypeScript Compilation

The TypeScript implementation compiles successfully with the project's TypeScript configuration. All type definitions are correctly exported and match the expected data structures.

### ESLint Checks

The code passes all ESLint checks with the project's configuration. This includes proper use of TypeScript types, consistent code style, and adherence to best practices for async/await usage.

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Completed

**Last Verified:** January 4, 2026

The Batch Matcher feature is fully implemented and verified. All sub-tasks have been completed, the code passes static analysis checks, and the implementation is ready for use by dependent features.
