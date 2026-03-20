# Feature F2.5: Playlist Fetching

## Overview

Implements functionality to fetch all user playlists from Spotify, including pagination handling and total track calculation per playlist.

## Implementation Details

### Files Modified/Created

This feature was implemented as part of **F1.3 Spotify API Client** in `lib/spotify/client.ts`.

### Requirements Met

| Requirement | Status | Location |
|-------------|--------|----------|
| Fetch all user playlists from Spotify | ✅ | `client.ts:54-68` (getAllPlaylists) |
| Calculate total tracks per playlist | ✅ | `types/spotify.ts:17` (items.total) |
| Handle pagination for large playlists | ✅ | `client.ts:54-68` (while loop with offset) |

## Components

### getAllPlaylists() Method

Located in `lib/spotify/client.ts`:

```typescript
async getAllPlaylists(): Promise<SpotifyPlaylist[]> {
  const allPlaylists: SpotifyPlaylist[] = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const response = await this.getPlaylists(limit, offset);
    allPlaylists.push(...response.items);

    if (!response.next) break;
    offset += limit;
  }

  return allPlaylists;
}
```

### Supporting Methods

| Method | Description |
|--------|-------------|
| `getPlaylists(limit, offset)` | Fetches a single page of playlists |
| `getAllPlaylistTracks(playlistId)` | Fetches all tracks for a specific playlist |

## Data Model

### SpotifyPlaylist

```typescript
interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  owner: { id: string; display_name: string };
  items: { total: number };  // Total tracks count
  snapshot_id: string;
}
```

## Usage Example

```typescript
import { spotifyClient } from '@/lib/spotify/client';

async function fetchAllPlaylists() {
  await spotifyClient.loadToken();

  const playlists = await spotifyClient.getAllPlaylists();

  playlists.forEach(playlist => {
    console.log(`"${playlist.name}" - ${playlist.items.total} tracks`);
  });

  return playlists;
}
```

## Pagination Behavior

1. **Initial Fetch**: Gets first 50 playlists (default limit)
2. **Check Next**: Checks for `next` property in response
3. **Continue**: Fetches next page if `next` exists
4. **Aggregate**: Collects all items into single array
5. **Return**: Returns complete list of all playlists

## Track Count Calculation

The total tracks per playlist is provided by Spotify's API:

- Accessed via `playlist.items.total`
- Includes all tracks in the playlist
- Does not require additional API calls
- Real-time count from Spotify's database

## Dependencies

- **F1.3 Spotify API Client**: Base client with pagination support
- **lib/spotify/rate-limiter.ts**: Rate limiting to avoid API throttling

## Testing

Run the following to verify the implementation:

```bash
# Type check
npm run typecheck

# Lint
npm run lint
```

## Notes

- Pagination is handled automatically without manual intervention
- Rate limiting is applied to each page fetch
- All playlists are returned in a single array
- Track counts are accurate as of the time of fetch
