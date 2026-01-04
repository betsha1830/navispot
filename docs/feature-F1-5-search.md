# Feature F1.5: Search Functionality

## Feature Overview

The Search Functionality feature provides a TypeScript interface for searching songs in the Navidrome music server using the Subsonic API's `search3` endpoint. This functionality is essential for the track matching algorithms that will be implemented in Phase 2 of the project, enabling fuzzy and strict matching of Spotify tracks against Navidrome's music library.

### Purpose and Functionality

The search functionality serves as a foundational layer for the track matching process. It allows the application to:
- Search for songs by title, artist, or any combination of keywords
- Limit the number of results returned for performance optimization
- Support pagination through offset parameters
- Retrieve only the song data needed for matching (ignoring artist/album results from the search3 endpoint)

The `search` method abstracts away the complexities of the Subsonic API's `search3` endpoint, providing a clean and simple interface for song-only searches that returns `NavidromeSong` objects ready for use in matching algorithms.

## Sub-tasks Implemented

### search3 Endpoint Wrapper

The `search` method in the `NavidromeApiClient` class provides a comprehensive wrapper around the Subsonic `search3` endpoint. It handles:
- URL construction with proper query parameters
- Request execution with authentication
- Response parsing and error handling
- Type-safe return of `NavidromeSong` arrays

The implementation supports all parameters defined by the Subsonic API specification:
- `query` (required): The search query string
- `songCount` (optional): Maximum number of songs to return (default: 20)
- `artistCount` (optional): Maximum number of artists to return (default: 20)
- `albumCount` (optional): Maximum number of albums to return (default: 20)
- `songOffset` (optional): Offset for song results (default: 0)
- `artistOffset` (optional): Offset for artist results (default: 0)
- `albumOffset` (optional): Offset for album results (default: 0)

### Song Search Utility Function

The search method returns only song results, filtering out artist and album matches from the `search3` response. This is intentional because the matching algorithms only require song-level data for comparing Spotify tracks against Navidrome's library.

## File Structure

```
types/navidrome.ts          # Type definitions including SearchResult3
lib/navidrome/client.ts     # API client with search method implementation
```

### types/navidrome.ts

This file contains the type definitions for search functionality:

- `SearchResult3` - Interface representing the full search3 response structure including artist, album, and song arrays with all their respective fields

### lib/navidrome/client.ts

This file contains the search method implementation:

- `search` - Async method that searches for songs in Navidrome and returns matching `NavidromeSong` objects

## Usage Examples

### How to Search for Songs

```typescript
import { NavidromeApiClient } from '@/lib/navidrome/client';

const client = new NavidromeApiClient(
  'https://navidrome.example.com',
  'myusername',
  'mypassword'
);

// Basic song search
const results = await client.search('Beatles Hey Jude');

// Search with result limits
const limitedResults = await client.search('Queen Bohemian', {
  songCount: 10,
});

// Search with pagination
const pageTwo = await client.search('Pink Floyd', {
  songCount: 10,
  songOffset: 10,
});
```

### Integration with Matching Algorithms

The search functionality is designed to work seamlessly with the track matching algorithms (F2.1-F2.3):

```typescript
// Example: Using search for fuzzy matching
async function findBestMatch(spotifyTrack: SpotifyTrack): Promise<NavidromeSong | null> {
  const query = `${spotifyTrack.artists[0].name} ${spotifyTrack.name}`;
  const candidates = await client.search(query, { songCount: 5 });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Multiple candidates - use fuzzy matching algorithm
  return applyFuzzyMatching(spotifyTrack, candidates);
}
```

## API Reference

### Method: search

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

**Parameters:**
- `query` (string) - The search query string. Can include artist name, song title, album name, or any combination.
- `options` (object, optional) - Search options:
  - `songCount` (number) - Maximum number of songs to return (default: 20)
  - `artistCount` (number) - Maximum number of artists to return (default: 20)
  - `albumCount` (number) - Maximum number of albums to return (default: 20)
  - `songOffset` (number) - Offset for song results pagination
  - `artistOffset` (number) - Offset for artist results pagination
  - `albumOffset` (number) - Offset for album results pagination

**Returns:** A Promise resolving to an array of `NavidromeSong` objects matching the search query.

**Error Handling:** Throws an error if the HTTP request fails or returns a non-OK status from the server.

### Type: SearchResult3

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

Represents the full response structure from the Subsonic `search3` endpoint.

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

## Verification Results

### TypeScript Compilation

The TypeScript implementation compiles successfully with the project's TypeScript configuration. All type definitions for `SearchResult3` are correctly exported and used throughout the client implementation. The interface contracts between the types and the client implementation are fully validated by the TypeScript compiler.

### ESLint Checks

The code passes all ESLint checks with the project's configuration. This includes proper use of TypeScript types, consistent code style, and adherence to best practices for async/await usage and error handling.

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Completed

**Last Verified:** January 4, 2026

The Search Functionality feature is fully implemented and verified. All sub-tasks have been completed, the code passes static analysis checks, and the implementation is ready for use by dependent features.
