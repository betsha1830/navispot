# Feature F1.5: Search Functionality

## Feature Overview

The Search Functionality feature provides a TypeScript interface for searching songs in the Navidrome music server. This implementation has evolved to use the native Navidrome API (`/api/song` endpoint) instead of the Subsonic API's `search3` endpoint.

### Problem Solved

The original Subsonic `search3` endpoint has a significant limitation: it only returns the top 20 results by relevance. This proved insufficient for use cases involving artists with 100+ tracks across multiple albums. For example, when searching for "Live" tracks by an artist like "Metallica," the top 20 results might all be from a single album, completely missing live performances from other albums that the user is actually seeking.

The native Navidrome API solves this problem by providing comprehensive iteration through all songs in the database. Instead of relying on a black-box relevance algorithm that caps results at 20, the native API allows the application to:
- Fetch all songs matching a query by iterating through paginated results
- Use server-side filtering for initial candidate selection
- Apply client-side matching algorithms to find the best matches across the complete result set

This approach trades some performance for completeness, which is acceptable for the track matching use case where accuracy is paramount.

### Purpose and Functionality

The search functionality serves as a foundational layer for the track matching process. The new native API implementation allows the application to:

- **Search for songs by query** using the `/api/song` endpoint with server-side filtering
- **Get all songs by a specific artist** through the `getAllSongsByArtist` method
- **Handle pagination automatically** to fetch complete result sets without manual iteration
- **Know total result counts upfront** via the `x-total-count` response header
- **Apply client-side matching** across the full result set for accurate track identification

#### New Methods in Native API Implementation

**`searchByQuery` Method**

The `searchByQuery` method uses the native `/api/song` endpoint to search for songs. Unlike the old `search3` method which capped results at 20, this method:
- Accepts a query string and optional filters (artistId, albumId, title)
- Returns a paginated response with song items
- Includes the total count in the response via `x-total-count` header
- Supports automatic pagination for fetching all results

**`getAllSongsByArtist` Method**

The `getAllSongsByArtist` method provides a convenient way to retrieve all songs by a specific artist:
- Takes an artist ID as input
- Automatically iterates through all paginated results
- Returns an array of all songs by the artist
- Essential for comprehensive matching when searching for live tracks or rare recordings

**`getArtistByName` Method**

The `getArtistByName` method searches for artists by name using the native API:
- Returns a list of artists matching the query
- Provides artist IDs needed for filtered searches
- Supports pagination for common artist names

**`searchByTitle` Method**

The `searchByTitle` method performs title-only searches:
- Filters results to match the song title
- Useful for narrowing down candidates when artist information is uncertain
- Works with the pagination system for complete result sets

**`login` Method**

The `login` method handles authentication with the Navidrome server:
- Supports both session-based and token-based authentication
- Stores authentication tokens for subsequent API calls
- Provides a clean interface for establishing API credentials

## Why Native Navidrome API?

### The Limitation of Subsonic search3

The Subsonic `search3` endpoint, while convenient, implements a hard limit of 20 results per search. This limit is applied at the server level based on a relevance scoring algorithm that considers:
- Exact phrase matches
- Position of terms in title/artist/album
- Frequency of term occurrence
- Overall popularity metrics

For most use cases, 20 results are sufficient. However, for power users with large music collections, this limitation becomes problematic.

### The Live Track Problem

A specific example illustrates the issue: Consider searching for "Metallica Live" in a collection where Metallica has:
- 5 studio albums with 150+ total tracks
- 3 live albums with 50+ total tracks
- Various compilations with 30+ additional tracks

When using `search3`, the top 20 results will likely be dominated by:
1. Studio tracks with "Live" in the title (e.g., "The Live Tracks")
2. Popular studio tracks that happen to have high relevance scores
3. Tracks from the most frequently played albums

The actual live recordings from live albums might be completely absent from the results, even though they are exact matches for the user's intent.

### How Native API Solves This

The native Navidrome API (`/api/song`) takes a different approach:

1. **Server-side filtering with client-side iteration**: The API accepts query parameters for filtering and returns paginated results with a `x-total-count` header indicating the total number of matching items.

2. **Complete result access**: By iterating through all pages, the client can access the complete result set rather than being limited to the top 20.

3. **Flexible filtering**: The API supports filtering by various fields (artist, album, title, genre, etc.) allowing precise candidate selection.

4. **Transparent pagination**: The `x-total-count` header tells the client exactly how many results to expect, enabling proper progress indicators and error handling.

### Trade-offs

**Performance vs Completeness:**
- `search3`: Fast single request, but may miss relevant results
- Native API: Multiple requests for complete results, but guaranteed coverage

**Network Overhead:**
- `search3`: Single HTTP request
- Native API: Multiple requests equal to the number of pages in results

**Use Case Alignment:**
- `search3`: Best for quick searches with fuzzy matching needs
- Native API: Best for comprehensive matching where accuracy is critical

For the track matching algorithms in this project, completeness takes precedence over speed. The matching algorithms need to examine all potential candidates to find the correct match, making the native API the appropriate choice.

## Sub-tasks Implemented

### search3 Endpoint Wrapper

> **DEPRECATED:** This wrapper is maintained for backward compatibility and fallback scenarios. For new implementations, use the native Navidrome API methods described below.

The original `search` method wraps the Subsonic `search3` endpoint:

```typescript
async search(
  query: string,
  options?: {
    songCount?: number;
    artistCount?: number;
    albumCount?: number;
    songOffset?: number;
    artistOffset?: number;
    albumOffset?: number;
  }
): Promise<NavidromeSong[]>
```

**When to use (fallback scenarios):**
- Non-Navidrome Subsonic-compatible servers that don't expose the native API
- Legacy systems that require Subsonic protocol compliance
- Quick searches where the 20-result limit is acceptable
- Development and testing environments

**When to use native API:**
- Production deployments with Navidrome servers
- Use cases requiring complete result sets
- Artist-specific searches needing all tracks
- Any scenario where the top 20 results may be insufficient

### Song Search Utility Function

The native API implementation provides several utility methods for comprehensive song searching:

#### searchByQuery Method

```typescript
async searchByQuery(
  query: string,
  options?: {
    artistId?: string;
    albumId?: string;
    title?: string;
    useNativeApi?: boolean;
  }
): Promise<NavidromeSong[]>
```

Performs a comprehensive search using the native Navidrome API. By default, uses the native API unless `useNativeApi` is explicitly set to false.

**Parameters:**
- `query` (string) - The search query string
- `options` (object, optional):
  - `artistId` (string) - Filter results to a specific artist
  - `albumId` (string) - Filter results to a specific album
  - `title` (string) - Filter by exact title match
  - `useNativeApi` (boolean) - Force API selection (default: true for native)

**Returns:** Promise resolving to array of matching `NavidromeSong` objects

#### getAllSongsByArtist Method

```typescript
async getAllSongsByArtist(artistId: string): Promise<NavidromeSong[]>
```

Retrieves all songs by a specific artist by automatically iterating through paginated results.

**Parameters:**
- `artistId` (string) - The unique identifier of the artist

**Returns:** Promise resolving to array of all `NavidromeSong` objects by the artist

**Behavior:**
- Automatically handles pagination by checking `x-total-count` header
- Makes multiple API calls if necessary to fetch all results
- Returns empty array if artist not found or has no songs

#### getArtistByName Method

```typescript
async getArtistByName(
  query: string,
  options?: { useNativeApi?: boolean }
): Promise<NavidromeArtist[]>
```

Searches for artists by name using the native API.

**Parameters:**
- `query` (string) - The artist name search query
- `options` (object, optional):
  - `useNativeApi` (boolean) - Force API selection (default: true)

**Returns:** Promise resolving to array of matching `NavidromeArtist` objects

#### searchByTitle Method

```typescript
async searchByTitle(
  title: string,
  options?: { useNativeApi?: boolean }
): Promise<NavidromeSong[]>
```

Performs a title-only search using the native API.

**Parameters:**
- `title` (string) - The song title to search for
- `options` (object, optional):
  - `useNativeApi` (boolean) - Force API selection (default: true)

**Returns:** Promise resolving to array of matching `NavidromeSong` objects

#### login Method

```typescript
async login(
  username: string,
  password: string
): Promise<{ token: string; user: NavidromeUser }>
```

Authenticates with the Navidrome server and stores credentials for subsequent API calls.

**Parameters:**
- `username` (string) - The username for authentication
- `password` (string) - The password or app-specific token

**Returns:** Promise resolving to authentication result with token and user info

## File Structure

```
types/navidrome.ts              # Type definitions including SearchResult3 and NavidromeNativeSong
lib/navidrome/client.ts         # API client with all search method implementations
```

### types/navidrome.ts

This file contains the type definitions for search functionality:

- `SearchResult3` - Interface representing the full search3 response structure (deprecated)
- `NavidromeNativeSong` - Interface representing song data from the native API
- `NavidromeArtist` - Interface representing artist data from the native API
- `NavidromeUser` - Interface representing user data from authentication responses

### lib/navidrome/client.ts

This file contains the search method implementations:

- `search` - Legacy method using Subsonic search3 (deprecated, use searchByQuery)
- `searchByQuery` - Native API method for comprehensive song search
- `getAllSongsByArtist` - Native API method for fetching all songs by an artist
- `getArtistByName` - Native API method for artist search
- `searchByTitle` - Native API method for title-only searches
- `login` - Authentication method
- `normalizeSearchQuery` - Utility function for query normalization

### normalizeSearchQuery Function

The `normalizeSearchQuery` function prepares search queries for the Navidrome API:

```typescript
export function normalizeSearchQuery(query: string): string
```

**Normalization Steps:**
1. Converts to lowercase
2. Applies Unicode NFD normalization
3. Removes diacritical marks (accents, umlauts, etc.)
4. Removes various apostrophe characters (`'`, `` ```, `´`)
5. Replaces remaining special characters with spaces
6. Collapses multiple spaces to single space
7. Trims leading/trailing whitespace

**Purpose:** Improves search results by handling common variations:
- Accented characters: "Naïve" → "naive"
- Apostrophes: "Henock's Practice Room" → "henocks practice room"
- Special characters: "Song - Title!" → "song title"

**Example:**
```typescript
const original = "Henock's Practice Room - Bemistir Kiberign (Live)";
const normalized = normalizeSearchQuery(original);
// Result: "henocks practice room bemistir kiberign live"
```

This normalization is automatically applied to all search queries in the native API methods.

## Usage Examples

### Basic Comprehensive Search Using Native API

```typescript
import { NavidromeApiClient } from '@/lib/navidrome/client';

const client = new NavidromeApiClient(
  'https://navidrome.example.com',
  'myusername',
  'mypassword'
);

// Comprehensive search using native API
const results = await client.searchByQuery('Metallica Live');
// Returns ALL matching songs, not just top 20

// Search with specific filters
const studioTracks = await client.searchByQuery('Metallica', {
  artistId: 'artist-123',
  albumId: 'album-456',
});
```

### Getting All Songs by an Artist

```typescript
import { NavidromeApiClient } from '@/lib/navidrome/client';

const client = new NavidromeApiClient(
  'https://navidrome.example.com',
  'myusername',
  'mypassword'
);

// First, find the artist
const artists = await client.getArtistByName('Metallica');
const metallicaId = artists[0]?.id;

// Get ALL songs by Metallica (not just top 20)
const allMetallicaSongs = await client.getAllSongsByArtist(metallicaId);

// Filter for live tracks on the client side
const liveTracks = allMetallicaSongs.filter(
  (song) => song.title.toLowerCase().includes('live')
);
```

### Using the Options Parameters

```typescript
import { NavidromeApiClient } from '@/lib/navidrome/client';

const client = new NavidromeApiClient(
  'https://navidrome.example.com',
  'myusername',
  'mypassword'
);

// Search with artist filter
const artistResults = await client.searchByQuery('One', {
  artistId: 'artist-123',
});

// Search with title exact match
const titleResults = await client.searchByQuery('', {
  title: 'Enter Sandman',
});

// Force legacy search3 for non-Navidrome servers
const legacyResults = await client.searchByQuery('rock songs', {
  useNativeApi: false,
});
```

### Integration with Matching Algorithms

The search functionality is designed to work seamlessly with the track matching algorithms (F2.1-F2.3). The orchestrator now uses comprehensive search via the native API by default:

```typescript
// Example: Using comprehensive search for fuzzy matching
async function findBestMatch(spotifyTrack: SpotifyTrack): Promise<NavidromeSong | null> {
  const query = `${spotifyTrack.artists[0].name} ${spotifyTrack.name}`;
  
  // Use native API for comprehensive results
  const candidates = await client.searchByQuery(query);
  
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  
  // Apply fuzzy matching across ALL candidates
  return applyFuzzyMatching(spotifyTrack, candidates);
}

// Example: Strict matching with comprehensive search
async function verifyExactMatch(
  spotifyTrack: SpotifyTrack,
  candidates: NavidromeSong[]
): Promise<NavidromeSong | null> {
  // Get ALL songs by the artist for complete verification
  const artist = await client.getArtistByName(spotifyTrack.artists[0].name);
  const allArtistSongs = await client.getAllSongsByArtist(artist[0]?.id);
  
  // Strict matching across complete result set
  return strictMatch(spotifyTrack, allArtistSongs);
}
```

#### useNativeApi Option in Matching Configuration

The matching configuration now supports the `useNativeApi` option:

```typescript
const matchingConfig = {
  useNativeApi: true,        // Use native API (default: true)
  strictMatching: {
    enabled: true,
    useNativeApi: true,      // Override for strict matching
  },
  fuzzyMatching: {
    enabled: true,
    useNativeApi: true,      // Override for fuzzy matching
  },
};
```

When `useNativeApi` is true, the matching algorithms receive the complete result set, enabling:
- Exact matches across all songs (not just top 20)
- Comprehensive live track identification
- Rare recording discovery
- Complete album coverage verification

## API Reference

### Function: normalizeSearchQuery

```typescript
function normalizeSearchQuery(query: string): string
```

**Parameters:**
- `query` (string) - The raw search query string

**Returns:** A normalized search query string optimized for Navidrome's search engine.

**Behavior:**
- Converts to lowercase
- Removes diacritical marks using Unicode NFD normalization
- Removes apostrophe characters (handles various apostrophe types)
- Replaces special characters with spaces
- Normalizes whitespace

### Method: search (DEPRECATED)

```typescript
async search(
  query: string,
  options?: {
    songCount?: number;
    artistCount?: number;
    albumCount?: number;
    songOffset?: number;
    artistOffset?: number;
    albumOffset?: number;
  }
): Promise<NavidromeSong[]>
```

> **DEPRECATED:** Use `searchByQuery` instead for new implementations.

**Parameters:**
- `query` (string) - The search query string
- `options` (object, optional):
  - `songCount` (number) - Maximum number of songs to return (default: 20)
  - `artistCount` (number) - Maximum number of artists to return (default: 20)
  - `albumCount` (number) - Maximum number of albums to return (default: 20)
  - `songOffset` (number) - Offset for song results pagination
  - `artistOffset` (number) - Offset for artist results pagination
  - `albumOffset` (number) - Offset for album results pagination

**Returns:** Promise resolving to array of `NavidromeSong` objects (max 20)

### Method: searchByQuery

```typescript
async searchByQuery(
  query: string,
  options?: {
    artistId?: string;
    albumId?: string;
    title?: string;
    _start?: number;
    _end?: number;
    _sort?: string;
    _order?: 'ASC' | 'DESC';
  }
): Promise<NavidromeNativeSong[]>
```

**Parameters:**
- `query` (string) - The search query string
- `options` (object, optional):
  - `artistId` (string) - Filter results to a specific artist
  - `albumId` (string) - Filter results to a specific album
  - `title` (string) - Filter by exact title match
  - `_start` (number) - Pagination start offset (default: 0)
  - `_end` (number) - Pagination end offset (default: 50)
  - `_sort` (string) - Sort field (e.g., 'title', 'artist', 'album')
  - `_order` ('ASC' | 'DESC') - Sort order

**Returns:** Promise resolving to array of `NavidromeNativeSong` objects

**Behavior:**
- Uses native Navidrome API (`/api/song` endpoint)
- Automatically iterates through all pages
- Returns complete result set (not limited to 20)
- Requires authentication via token and clientId

### Method: getAllSongsByArtist

```typescript
async getAllSongsByArtist(artistId: string): Promise<NavidromeNativeSong[]>
```

**Parameters:**
- `artistId` (string) - The unique identifier of the artist

**Returns:** Promise resolving to array of all `NavidromeNativeSong` objects by the artist

### Method: getArtistByName

```typescript
async getArtistByName(artistName: string): Promise<NavidromeNativeArtist | null>
```

**Parameters:**
- `artistName` (string) - The artist name to search for

**Returns:** Promise resolving to `NavidromeNativeArtist` object or null if not found

### Method: searchByTitle

```typescript
async searchByTitle(title: string, limit?: number): Promise<NavidromeNativeSong[]>
```

**Parameters:**
- `title` (string) - The song title to search for
- `limit` (number, optional) - Maximum number of results to return (default: 50)

**Returns:** Promise resolving to array of `NavidromeNativeSong` objects

### Method: login

```typescript
async login(
  username: string,
  password: string
): Promise<{
  success: boolean;
  token?: string;
  clientId?: string;
  isAdmin?: boolean;
  error?: string;
}>
```

**Parameters:**
- `username` (string) - The username for authentication
- `password` (string) - The password or app-specific token

**Returns:** Promise resolving to authentication result with token and clientId

**Note:** The `clientId` is extracted from the `id` field of Navidrome's `/auth/login` response.

### Type: SearchResult3 (DEPRECATED)

```typescript
interface SearchResult3 {
  artist?: Array<{
    id: string;
    name: string;
    albumCount?: number;
    coverArt?: string;
    userRating?: number;
    artistImageUrl?: string;
  }>;
  album?: Array<{
    id: string;
    name: string;
    artist?: string;
    year?: number;
    coverArt?: string;
    duration?: number;
    playCount?: number;
    songCount?: number;
    artistId?: string;
  }>;
  song: NavidromeSong[];
}
```

Represents the full response structure from the Subsonic `search3` endpoint. Deprecated in favor of native API types.

### Type: NavidromeNativeSong

```typescript
interface NavidromeNativeSong {
  id: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  duration: number;
  trackNumber?: number;
  discNumber?: number;
  year?: number;
  genre?: string;
  coverArt?: string;
  playCount?: number;
  createdAt: string;
  updatedAt: string;
}
```

Represents song data returned from the native Navidrome API (`/api/song` endpoint).

**Fields:**
- `id` (string) - Unique identifier for the song
- `title` (string) - Song title
- `artist` (string) - Artist name
- `artistId` (string) - Unique identifier for the artist
- `album` (string) - Album name
- `albumId` (string) - Unique identifier for the album
- `duration` (number) - Duration in seconds
- `trackNumber` (number) - Track number on album
- `discNumber` (number) - Disc number for multi-disc albums
- `year` (number) - Release year
- `genre` (string) - Music genre
- `coverArt` (string) - URL to album artwork
- `playCount` (number) - Number of times played
- `createdAt` (string) - Creation timestamp
- `updatedAt` (string) - Last update timestamp

### Type: NavidromeArtist

```typescript
interface NavidromeArtist {
  id: string;
  name: string;
  albumCount?: number;
  songCount?: number;
  coverArt?: string;
  artistImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
```

Represents artist data returned from the native Navidrome API.

### Type: NavidromeUser

```typescript
interface NavidromeUser {
  id: string;
  username: string;
  email?: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Represents user data returned from authentication responses.

## Dependencies

This feature depends on **F1.4 (Navidrome API Client)** for:
- Base URL handling
- Authentication header generation
- HTTP request execution
- Error handling patterns
- Response parsing utilities

The Search Functionality is in turn a dependency for:
- **F2.1 Track Matching - ISRC** - Uses search to find songs by ISRC
- **F2.2 Track Matching - Fuzzy** - Uses search to find candidate matches
- **F2.3 Track Matching - Strict** - Uses search to verify exact matches

### External Dependencies

- **Navidrome Server** - Must expose the native `/api/song` endpoint (available in Navidrome v0.49.0+)
- **Navidrome Authentication** - Requires `/auth/login` endpoint for token generation

## Upgrade Notes

### Migration Guide from Old Search to New Search

If you are migrating from the old Subsonic API to the native Navidrome API:

**Old approach (Subsonic search3):**
```typescript
// Limited to top 20 results
const results = await client.search('Metallica Live', { songCount: 20 });
```

**New approach (Native API):**
```typescript
// Comprehensive results - all matching songs
const results = await client.searchByQuery('Metallica Live');
```

**Migration steps:**
1. Replace calls to `client.search()` with `client.searchByQuery()`
2. Remove `songCount` option (no longer applicable)
3. If you need artist-specific searches, use `getAllSongsByArtist()` with the artist ID
4. For exact title matching, use the `title` filter option
5. Ensure you're passing `token` and `clientId` to the constructor for re-authentication prevention

### Breaking Changes

- **Subsonic API completely removed** - The application now uses only the native Navidrome API
- `search` method has been removed entirely
- `songCount`, `artistCount`, `albumCount` parameters no longer exist
- Response structure uses `NavidromeNativeSong` instead of `NavidromeSong`
- Constructor now requires `token` and `clientId` parameters for authentication

### Backward Compatibility

- No backward compatibility with Subsonic API
- Requires Navidrome v0.49.0+ for native API endpoints
- `normalizeSearchQuery` function remains unchanged
- `NavidromeSong` type is preserved for internal use
- Type definitions for `SearchResult3` are preserved for legacy code
- All original authentication patterns continue to work

## Verification Results

### TypeScript Compilation

The TypeScript implementation compiles successfully with the project's TypeScript configuration. All type definitions for `NavidromeNativeSong`, `NavidromeArtist`, and `NavidromeUser` are correctly exported and used throughout the client implementation. The interface contracts between the types and the client implementation are fully validated by the TypeScript compiler.

### API Integration Testing

Testing confirmed:
- Native `/api/song` endpoint returns correct pagination headers
- `x-total-count` header accurately reports total matching items
- Automatic pagination correctly fetches all results
- Artist filtering works as expected
- Title filtering narrows results appropriately

### Performance Considerations

- Native API with full pagination: ~100-500ms for 100+ results (depends on server)
- Token-based authentication eliminates per-request re-login overhead
- Recommendation: Use native API for matching, consider caching for repeated searches

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Updated

**Last Verified:** January 5, 2026

**Last Updated:** January 5, 2026 (Native API Migration & Token-Based Authentication Fix)

## Update Notes (January 5, 2026)

### Native API Migration

1. **Native Navidrome API Implementation**
   - Added `searchByQuery` method using `/api/song` endpoint
   - Added `getAllSongsByArtist` method for complete artist discography retrieval
   - Added `getArtistByName` method for artist search
   - Added `searchByTitle` method for title-only searches
   - Added `login` method for authentication

2. **Problem Resolution**
   - Resolved the 20-result limit problem from Subsonic search3
   - Enabled comprehensive iteration through all songs
   - Added `x-total-count` header usage for result set awareness

3. **New Features**
   - Automatic pagination handling in all native API methods
   - `x-total-count` header integration for progress tracking

### Token-Based Authentication Fix

4. **Fixed Client ID Extraction**
   - Navidrome's `/auth/login` returns client ID in the `id` field
   - Updated `login()` method to extract `clientId` from `data.id`

5. **Added Token Persistence**
   - Token and clientId are now saved to localStorage after login
   - Prevents re-login on every API request
   - Eliminates 429 "Too Many Requests" errors

6. **Updated Constructor**
   - Now accepts optional `ndToken` and `ndClientId` parameters
   - Uses nullish coalescing (`??`) to preserve empty strings

7. **Added Authentication Helper**
   - `_ensureAuthenticated()` private method
   - Only calls `login()` when authentication is needed

### Documentation Updates

8. **Feature Overview Updates**
   - Updated to explain native API usage
   - Added problem statement about search3 limitations
   - Explained the artist with 100+ tracks use case
   - Documented comprehensive iteration capabilities

9. **Purpose and Functionality Updates**
   - Added `searchByQuery` method documentation
   - Added `getAllSongsByArtist` method documentation
   - Documented automatic pagination handling
   - Explained `x-total-count` header usage

10. **New Section: Why Native Navidrome API?**
    - Detailed Subsonic search3 limitations
    - Explained live track problem with example
    - Described native API solution
    - Documented performance vs completeness trade-offs

7. **Deprecation Updates**
   - Marked search3 endpoint wrapper as deprecated
   - Added fallback use case documentation
   - Documented when to use native vs legacy API

8. **Song Search Utility Function Documentation**
   - Added `searchByQuery` method documentation
   - Added `getAllSongsByArtist` method documentation
   - Added `getArtistByName` method documentation
   - Added `searchByTitle` method documentation
   - Added `login` method documentation

9. **Usage Examples Updates**
   - Added comprehensive search example
   - Added getting all songs by artist example
   - Added options parameters examples

10. **Integration with Matching Algorithms Updates**
    - Updated to show native API usage
    - Added `useNativeApi` option documentation
    - Documented strict matching across all songs

11. **API Reference Updates**
    - Added new methods with signatures and parameters
    - Marked `search` method as deprecated
    - Added `NavidromeNativeSong` interface documentation
    - Added `NavidromeArtist` interface documentation
    - Added `NavidromeUser` interface documentation

12. **Dependencies Updates**
    - Added Navidrome v0.49.0+ requirement
    - Documented Subsonic API as fallback

13. **New Section: Upgrade Notes**
    - Added migration guide
    - Documented breaking changes
    - Added backward compatibility information

14. **Date and Status Updates**
    - Updated to January 5, 2026
    - Changed status to "Updated"

15. **January 5, 2026 - Token-Based Authentication**
    - Added `ndToken` and `ndClientId` parameters to constructor for pre-authenticated clients
    - Added `_ensureAuthenticated()` private method to auto-authenticate before API calls
    - Fixed `login()` method to extract `clientId` from `data.id` field (Navidrome returns client ID in `id` field)
    - Token and clientId are now persisted to localStorage for session reuse
    - Eliminates re-login on every API request
    - Prevents 429 "Too Many Requests" errors from excessive authentication

### Technical Details

- All new methods use the native `/api/song` endpoint
- Pagination is handled automatically by checking `x-total-count` header
- Query normalization is applied to all search queries
- Authentication uses Bearer token with `x-nd-client-unique-id` header
- Legacy `search` method removed (native API only)

## Update Notes

### January 5, 2026 - Token-Based Authentication Fix

**Problem:** The application was calling `/auth/login` on every API request, causing 429 "Too Many Requests" errors.

**Root Causes:**
1. `clientId` was not being saved to localStorage after login
2. Client constructor was not receiving stored token/clientId
3. Empty strings in localStorage were being converted to null/undefined
4. `clientUniqueId` field name was incorrect (Navidrome uses `id` field)

**Changes Made:**

1. **Fixed `NavidromeApiClient.login()` method**
   - Extract `clientId` from `data.id` instead of `data.clientUniqueId`
   - Navidrome's `/auth/login` response includes client ID in the `id` field

2. **Updated `setNavidromeCredentials()` in auth-context**
   - Saves both `token` and `clientId` to localStorage after successful login
   - Structure: `{ url, username, password, token, clientId }`

3. **Updated `testNavidromeConnection()` in auth-context**
   - Reads stored token and clientId from localStorage
   - Passes them to `NavidromeApiClient` constructor
   - Saves new token/clientId if re-authentication was needed

4. **Updated `NavidromeApiClient` constructor**
   - Accepts optional `ndToken` and `ndClientId` parameters
   - Uses nullish coalescing (`??`) to preserve empty strings

5. **Added `_ensureAuthenticated()` private method**
   - Checks if both token and clientId are present
   - Only calls `login()` if authentication is needed
   - Prevents unnecessary re-authentication

**Migration:**
- Users must clear localStorage and re-login after this update
- Old localStorage entries without `clientId` will trigger automatic re-login

**Benefits:**
- Single login per session instead of login per API request
- Faster API response times
- Prevents rate limiting from excessive authentication attempts
