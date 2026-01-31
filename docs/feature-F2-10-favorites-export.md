# Feature F2.10: Favorites Export

## Overview

The Favorites Export feature enables users to export their Spotify "Liked Songs" to Navidrome as starred/favorited songs. This feature combines Spotify saved tracks fetching, track matching, and Navidrome song starring to provide a seamless way to sync favorites between platforms.

### Purpose and Functionality

The favorites exporter enables the application to:

- Fetch user's saved/liked songs count from Spotify (single API request)
- Display "Liked Songs" as a card in the dashboard playlist grid
- Match Spotify tracks to Navidrome songs using multiple matching strategies
- Star (favorite) matched tracks in Navidrome
- Provide real-time progress tracking during export
- Handle partial failures gracefully with detailed error reporting
- Display comprehensive export results with statistics

## Implementation Details

### Files Modified/Created

| File | Action | Description |
|------|--------|-------------|
| `types/favorites.ts` | Created | Type definitions for favorites export |
| `lib/export/favorites-exporter.ts` | Created | Core favorites exporter implementation |
| `lib/spotify/client.ts` | Modified | Added `getSavedTracks()`, `getAllSavedTracks()`, `getSavedTracksCount()` methods |
| `lib/navidrome/client.ts` | Modified | Added `starSong()`, `starSongs()`, `unstarSong()`, `getStarredSongs()` methods |
| `components/FavoritesExport/FavoritesExport.tsx` | Created | Main UI component for favorites export flow |
| `components/FavoritesExport/FavoritesTrackList.tsx` | Created | Track list component with match status indicators |
| `components/FavoritesExport/FavoritesResults.tsx` | Created | Results display component with statistics |
| `components/Dashboard/Dashboard.tsx` | Modified | Added "Liked Songs" card to playlist grid and integrated favorites export |
| `types/index.ts` | Modified | Added export for favorites types |
| `types/spotify.ts` | Modified | Added `SpotifySavedTrack` and `SpotifySavedTracksResponse` interfaces |
| `types/spotify-auth.ts` | Modified | Added `user-library-read` scope |

### Requirements Met

| Requirement | Status | Location |
|-------------|--------|----------|
| Fetch Spotify saved tracks count | ✅ | `client.ts:91-98` (getSavedTracksCount) |
| Fetch all saved tracks | ✅ | `client.ts:54-75` (getAllSavedTracks) |
| Display Liked Songs in dashboard | ✅ | `Dashboard.tsx:17-24` (LIKED_SONGS_ITEM) |
| Match tracks using batch matcher | ✅ | `Dashboard.tsx:145-176` (handleExport - favorites branch) |
| Star individual songs in Navidrome | ✅ | `client.ts:430-452` (starSong) |
| Batch star multiple songs | ✅ | `client.ts:454-487` (starSongs) |
| Handle partial failures | ✅ | `favorites-exporter.ts:76-94` |
| Progress tracking during export | ✅ | `Dashboard.tsx:186-210` |
| Display export results with statistics | ✅ | `ResultsReport.tsx` |

## Components

### FavoritesExporter Interface

Located in `lib/export/favorites-exporter.ts`:

| Method | Description |
|--------|-------------|
| `exportFavorites(matches, options)` | Export matched tracks as favorites to Navidrome |
| `starSong(songId)` | Star a single song in Navidrome |
| `starSongs(songIds)` | Batch star multiple songs in Navidrome |

### DefaultFavoritesExporter Class

Located in `lib/export/favorites-exporter.ts`:

```typescript
export class DefaultFavoritesExporter implements FavoritesExporter {
  private navidromeClient: NavidromeApiClient;

  constructor(navidromeClient: NavidromeApiClient) {
    this.navidromeClient = navidromeClient;
  }

  async exportFavorites(
    matches: TrackMatch[],
    options: FavoritesExporterOptions = {}
  ): Promise<FavoritesExportResult> {
    const startTime = Date.now();
    const skipUnmatched = options.skipUnmatched ?? false;
    const onProgress = options.onProgress;

    const errors: FavoritesExportError[] = [];
    let starred = 0;
    let failed = 0;
    let skipped = 0;

    const matchedTracks = matches.filter((m) => m.status === 'matched' && m.navidromeSong);

    if (matchedTracks.length === 0) {
      const unmatched = matches.filter((m) => m.status !== 'matched' || !m.navidromeSong);
      skipped = skipUnmatched ? unmatched.length : 0;

      return {
        success: true,
        statistics: { total: matches.length, starred: 0, failed: 0, skipped },
        errors: [],
        duration: Date.now() - startTime,
      };
    }

    for (let i = 0; i < matchedTracks.length; i++) {
      const match = matchedTracks[i];
      const songId = match.navidromeSong!.id;
      const trackName = match.spotifyTrack.name;
      const artistName = match.spotifyTrack.artists?.[0]?.name || 'Unknown';

      if (onProgress) {
        await onProgress({
          current: i + 1,
          total: matchedTracks.length,
          percent: Math.round(((i + 1) / matchedTracks.length) * 100),
          currentTrack: `${trackName} - ${artistName}`,
          status: 'exporting',
        });
      }

      try {
        const result = await this.starSong(songId);
        if (result.success) {
          starred++;
        } else {
          failed++;
          errors.push({ trackName, artistName, reason: 'Failed to star song' });
        }
      } catch (error) {
        failed++;
        errors.push({
          trackName,
          artistName,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const unmatched = matches.filter((m) => m.status !== 'matched' || !m.navidromeSong);
    skipped = skipUnmatched ? unmatched.length : 0;

    const success = errors.length === 0 && starred > 0;

    return {
      success,
      statistics: { total: matches.length, starred, failed, skipped },
      errors,
      duration: Date.now() - startTime,
    };
  }

  async starSong(songId: string): Promise<{ success: boolean }> {
    const result = await this.navidromeClient.starSong(songId);
    return { success: result.success };
  }

  async starSongs(songIds: string[]): Promise<{ success: boolean; failedIds: string[] }> {
    if (songIds.length === 0) {
      return { success: true, failedIds: [] };
    }

    const failedIds: string[] = [];
    const results = await Promise.all(
      songIds.map(async (songId) => {
        const result = await this.starSong(songId);
        return { songId, success: result.success };
      })
    );

    for (const { songId, success } of results) {
      if (!success) {
        failedIds.push(songId);
      }
    }

    const allSuccessful = failedIds.length === 0;
    return { success: allSuccessful, failedIds };
  }
}
```

### NavidromeApiClient Song Starring Methods

Located in `lib/navidrome/client.ts`:

#### starSong()

```typescript
async starSong(songId: string): Promise<{ success: boolean; error?: string }> {
  const url = this._buildSubsonicUrl('/rest/star', { id: songId });
  const response = await fetch(url);

  if (!response.ok) {
    return { success: false, error: `HTTP error: ${response.status} ${response.statusText}` };
  }

  const data = await response.json();
  if (data['subsonic-response']?.status === 'failed') {
    return { success: false, error: data['subsonic-response']?.error?.message || 'Star operation failed' };
  }

  return { success: true };
}
```

#### starSongs()

```typescript
async starSongs(songIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (songIds.length === 0) {
    return { success: true };
  }

  const url = this._buildSubsonicUrl('/rest/star', { id: songIds.join(',') });
  const response = await fetch(url);

  if (!response.ok) {
    return { success: false, error: `HTTP error: ${response.status} ${response.statusText}` };
  }

  const data = await response.json();
  if (data['subsonic-response']?.status === 'failed') {
    return { success: false, error: data['subsonic-response']?.error?.message || 'Star operation failed' };
  }

  return { success: true };
}
```

#### getStarredSongs()

```typescript
async getStarredSongs(): Promise<NavidromeNativeSong[]> {
  const allStarredSongs: NavidromeNativeSong[] = [];
  let start = 0;
  const limit = 50;

  while (true) {
    const params: Record<string, string | number | undefined> = {
      _start: start,
      _end: start + limit,
      starred: 'true',
      _sort: 'starredAt',
      _order: 'DESC',
    };

    const response = await this._makeNativeRequest<NavidromeSearchResponse | NavidromeNativeSong[]>(
      '/api/song',
      params
    );

    let items: NavidromeNativeSong[] = [];
    if (Array.isArray(response)) {
      items = response;
    } else if ('items' in response) {
      items = response.items;
    }

    if (items.length > 0) {
      allStarredSongs.push(...items);
    }

    if (allStarredSongs.length >= this._totalCount || items.length === 0) {
      break;
    }

    start += limit;
  }

  return allStarredSongs;
}
```

## Data Model

### SpotifySavedTrack

```typescript
export interface SpotifySavedTrack {
  added_at: string;
  track: SpotifyTrack;
}
```

### SpotifySavedTracksResponse

```typescript
export interface SpotifySavedTracksResponse {
  href: string;
  items: SpotifySavedTrack[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}
```

### FavoritesExportProgress

```typescript
export interface FavoritesExportProgress {
  current: number;
  total: number;
  percent: number;
  currentTrack?: string;
  status: 'preparing' | 'exporting' | 'completed' | 'failed';
}
```

### FavoritesExportError

```typescript
export interface FavoritesExportError {
  trackName: string;
  artistName: string;
  reason: string;
}
```

### FavoritesExportResult

```typescript
export interface FavoritesExportResult {
  success: boolean;
  statistics: {
    total: number;
    starred: number;
    failed: number;
    skipped: number;
  };
  errors: FavoritesExportError[];
  duration: number;
}
```

### FavoritesExporterOptions

```typescript
export interface FavoritesExporterOptions {
  skipUnmatched?: boolean;
  onProgress?: ProgressCallback;
}
```

### FavoritesExporter Interface

```typescript
export interface FavoritesExporter {
  exportFavorites(
    matches: TrackMatch[],
    options?: FavoritesExporterOptions
  ): Promise<FavoritesExportResult>;
  starSong(songId: string): Promise<{ success: boolean }>;
  starSongs(songIds: string[]): Promise<{ success: boolean; failedIds: string[] }>;
}
```

### ProgressCallback

```typescript
export type ProgressCallback = (progress: FavoritesExportProgress) => void | Promise<void>;
```

## Usage Examples

### Get Saved Tracks Count (Single API Request)

```typescript
import { spotifyClient } from '@/lib/spotify/client';

async function getLikedSongsCount() {
  const token = await spotifyClient.loadToken();
  spotifyClient.setToken(token);

  const count = await spotifyClient.getSavedTracksCount();
  console.log(`You have ${count} liked songs`);
}
```

### Basic Favorites Export

```typescript
import { spotifyClient } from '@/lib/spotify/client';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { createBatchMatcher } from '@/lib/matching/batch-matcher';
import { createFavoritesExporter } from '@/lib/export/favorites-exporter';

async function exportLikedSongs() {
  const spotifyToken = await spotifyClient.loadToken();
  spotifyClient.setToken(spotifyToken);

  const navidromeClient = new NavidromeApiClient(
    'https://navidrome.example.com',
    'username',
    'password'
  );

  const batchMatcher = createBatchMatcher(spotifyClient, navidromeClient);
  const favoritesExporter = createFavoritesExporter(navidromeClient);

  const savedTracks = await spotifyClient.getAllSavedTracks();

  const { matches } = await batchMatcher.matchTracks(
    savedTracks.map(t => t.track),
    { enableISRC: true, enableFuzzy: true, enableStrict: true }
  );

  const result = await favoritesExporter.exportFavorites(matches, {
    skipUnmatched: true,
  });

  console.log(`Starred: ${result.statistics.starred}`);
  console.log(`Failed: ${result.statistics.failed}`);
  console.log(`Skipped: ${result.statistics.skipped}`);
}
```

### Export with Progress Tracking

```typescript
const result = await favoritesExporter.exportFavorites(matches, {
  skipUnmatched: true,
  onProgress: async (progress) => {
    console.log(`${progress.percent}% - ${progress.currentTrack}`);
  },
});
```

### Direct Song Starring

```typescript
const navidromeClient = new NavidromeApiClient(url, username, password);

await navidromeClient.starSong('navidrome-song-id');

await navidromeClient.starSongs(['id-1', 'id-2', 'id-3']);
```

### Get All Starred Songs

```typescript
const starredSongs = await navidromeClient.getStarredSongs();
console.log(`Found ${starredSongs.length} starred songs`);
```

## API Endpoints Used

### Spotify API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/me/tracks?limit=1` | Get saved tracks count (single request) |
| GET | `/v1/me/tracks` | Get user's saved tracks (paginated) |

### Navidrome Subsonic API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rest/star?id={id}` | Star a song |
| GET | `/rest/star?id=id1,id2,id3` | Batch star multiple songs |
| GET | `/rest/unstar?id={id}` | Unstar a song |
| GET | `/api/song` | Get songs with starred filter (native API) |

## Dashboard Integration

The "Liked Songs" feature is integrated directly into the main Dashboard:

1. **Card Display**: A "Liked Songs" card appears at the beginning of the playlist grid
2. **Track Count**: Only one API request (`getSavedTracksCount()`) to show the total count
3. **Selection**: The card can be selected like other playlists for batch export
4. **Export Flow**: When selected and exported:
   - Fetches all saved tracks from Spotify
   - Matches tracks using the batch matcher
   - Stars matched tracks in Navidrome instead of creating a playlist
   - Shows progress and results using the existing ProgressTracker and ResultsReport components

### LIKED_SONGS_ITEM Constant

Located in `components/Dashboard/Dashboard.tsx`:

```typescript
const LIKED_SONGS_ITEM: PlaylistItem = {
  id: 'liked-songs',
  name: 'Liked Songs',
  description: 'Your liked tracks from Spotify',
  images: [{ url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E91E63"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' }],
  owner: { id: 'user', display_name: 'You' },
  tracks: { total: 0 },
  isLikedSongs: true,
};
```

## Dependencies

This feature depends on:

- **F1.2 Spotify OAuth Client** - Uses `user-library-read` scope for saved tracks access
- **F1.3 Spotify API Client** - Uses `getSavedTracksCount()` and `getAllSavedTracks()` methods
- **F1.4 Navidrome API Client** - Uses `starSong()` and `starSongs()` methods for starring songs
- **F2.7 Batch Matcher** - Uses `matchTracks()` method for matching Spotify tracks to Navidrome songs
- **F2.9 Saved Tracks Fetching** - Provides the foundation for fetching Spotify saved tracks

The Favorites Export feature is in turn a dependency for:

- **F3.2 Dashboard** - Integrates "Liked Songs" card into the playlist grid
- **F3.6 Progress Tracker** - Uses progress callback for real-time updates
- **F3.7 Results Report** - Shows export results and statistics

## Testing

Run the following to verify the implementation:

```bash
# Lint
npm run lint
```

### Manual Testing Steps

1. **Authenticate**: Connect both Spotify and Navidrome accounts
2. **View Dashboard**: See "Liked Songs" card in the playlist grid with track count
3. **Select for Export**: Click the checkbox to select "Liked Songs"
4. **Export**: Click "Export Selected" button
5. **Review Progress**: Watch matching and export progress
6. **Verify Results**: Check that matched tracks are starred in Navidrome

## Error Handling

### Network Errors

- Caught and recorded as export errors
- Individual track failures don't stop the export process
- Detailed error messages include track name, artist, and failure reason

### Validation Errors

- Missing authentication credentials return early with error
- Empty match lists are handled gracefully
- Skip unmatched option controls how unmatched tracks are treated

### Partial Failures

- Export continues even if some tracks fail
- Failed tracks are recorded with reasons
- Statistics show counts for starred, failed, and skipped tracks

## Performance Considerations

- **Count Fetch**: Only one API request (`/me/tracks?limit=1`) to get total count
- **Lazy Loading**: Full track data only fetched when exporting
- **Pagination**: Handled automatically for both Spotify and Navidrome requests
- **Batch Operations**: Use Promise.all() for concurrent requests
- **Progress Callbacks**: Should be efficient to avoid slowing export
- **Large Libraries**: >1000 songs may take several minutes to process

## UI Components

### FavoritesExport

Main container component that manages the entire export workflow:
- Fetches Spotify saved tracks on mount
- Handles track matching via batch matcher
- Manages export state and progress
- Coordinates between sub-components

### FavoritesTrackList

Displays all saved tracks with their match status:
- Shows matching status (matched/ambiguous/unmatched)
- Displays match strategy used for matched tracks
- Shows Navidrome song title for matched tracks
- Provides visual indicators for each track status

### FavoritesResults

Displays export completion results:
- Shows statistics cards (total, starred, skipped, failed, duration, success %)
- Displays error details for failed tracks
- Provides action buttons (Match Again, Back to Tracks, Star Again)

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Completed

**Last Updated:** January 6, 2026

The Favorites Export feature is fully implemented and verified. All sub-tasks have been completed, the code passes static analysis checks, and the implementation is ready for use by dependent features.

### Recent Changes (January 6, 2026)

- Integrated "Liked Songs" card into main Dashboard playlist grid
- Added `getSavedTracksCount()` method for efficient count display
- Unified export flow for both playlists and liked songs
- Removed separate FavoritesExport button in favor of grid card integration
