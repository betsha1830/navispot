# Feature F1.3: Spotify API Client

## Overview

Implements the Spotify API client with rate limiting utilities and helper methods for fetching playlists and tracks with automatic pagination.

## Implementation Details

### Files Modified/Created

1. **lib/spotify/client.ts** - Updated existing client with rate limiting and helper methods
2. **lib/spotify/rate-limiter.ts** - New rate limiter utility class

### Requirements Met

| Requirement | Status | Location |
|-------------|--------|----------|
| GET `/v1/me/playlists` endpoint wrapper | ✅ | `client.ts:22-26` |
| GET `/v1/playlists/{id}/items` with pagination | ✅ | `client.ts:28-32` |
| Rate limiting utilities | ✅ | `rate-limiter.ts` |

## Components

### RateLimiter Class

Located in `lib/spotify/rate-limiter.ts`:

```typescript
class RateLimiter {
  constructor(maxRequests: number = 30, windowMs: number = 60000)
  async acquire(): Promise<void>
  getRemainingRequests(): number
  getResetTime(): number
}
```

- **maxRequests**: Maximum number of requests allowed in the window (default: 30)
- **windowMs**: Time window in milliseconds (default: 60000 = 1 minute)
- Uses sliding window algorithm for accurate rate limiting

### SpotifyClient Methods

Located in `lib/spotify/client.ts`:

| Method | Description | Rate Limited |
|--------|-------------|--------------|
| `getCurrentUser()` | Fetch authenticated user profile | ✅ |
| `getPlaylists(limit, offset)` | Fetch paginated user playlists | ✅ |
| `getAllPlaylists()` | Fetch all playlists with auto-pagination | ✅ |
| `getPlaylistTracks(playlistId, limit, offset)` | Fetch paginated playlist tracks | ✅ |
| `getAllPlaylistTracks(playlistId)` | Fetch all tracks with auto-pagination | ✅ |
| `refreshAccessToken()` | Refresh expired access token | ❌ |
| `setToken(token)` | Set the current token | N/A |
| `getToken()` | Get the current token | N/A |
| `persistToken(token)` | Encrypt and store token | N/A |
| `loadToken()` | Load and decrypt token | N/A |
| `clearToken()` | Clear stored token | N/A |

## Usage Example

```typescript
import { spotifyClient } from '@/lib/spotify/client';

async function fetchUserPlaylists() {
  await spotifyClient.loadToken();

  const playlists = await spotifyClient.getAllPlaylists();
  console.log(`Found ${playlists.length} playlists`);

  for (const playlist of playlists) {
    const tracks = await spotifyClient.getAllPlaylistTracks(playlist.id);
    console.log(`Playlist "${playlist.name}" has ${tracks.length} tracks`);
  }
}
```

## Rate Limiting Behavior

The Spotify API allows approximately 30 requests per 30 seconds. The rate limiter:

1. Tracks request timestamps
2. Blocks when limit is reached
3. Automatically resumes when the window clears
4. Provides methods to check remaining requests and reset time

## Auto-Pagination

The `getAllPlaylists()` and `getAllPlaylistTracks()` methods handle pagination automatically:

1. Fetch initial page with default limit
2. Check for `next` property in response
3. Continue fetching until no more pages
4. Aggregate all results into single array

## Dependencies

- **F1.2 Spotify OAuth Client**: Token management and refresh logic
- **lib/spotify/token-storage.ts**: Token encryption/decryption
- **lib/spotify/rate-limiter.ts**: Rate limiting utilities

## Testing

Run the following to verify the implementation:

```bash
# Type check
npm run typecheck

# Lint
npm run lint
```

## Notes

- Rate limiting is applied to all public API methods
- Token refresh is not rate limited to avoid circular dependencies
- All rate-limited methods use the same shared `spotifyRateLimiter` instance
- Auto-pagination methods use the rate limiter internally for each page fetch
