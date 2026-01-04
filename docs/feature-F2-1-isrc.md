# Feature F2.1: Track Matching - ISRC

## Feature Overview

The ISRC (International Standard Recording Code) Matching feature provides a high-precision method for matching Spotify tracks to Navidrome songs using their ISRC codes. ISRC is the international identification system for sound recordings and music video recordings, making it the most accurate method for track matching when available.

### Purpose and Functionality

The ISRC matching feature enables the application to:
- Extract ISRC codes from Spotify track metadata
- Search Navidrome's library using title-based queries
- Check if returned songs have matching ISRC codes
- Use duration matching as a fallback (delta < 2 seconds)
- Return precise match results with full song details
- Handle cases where ISRC codes are missing or not found

ISRC matching is the highest priority strategy in the matching chain because it provides the most reliable identification of recordings across different platforms and releases.

### Navidrome API Limitation

**Important:** Navidrome's Subsonic API does not accept ISRC codes as search queries. The `search3` endpoint only works with text-based queries (artist name, track title, etc.).

This means ISRC matching cannot be done as a standalone search. Instead, the implementation searches by title and checks ISRC matches on the returned results.

## Sub-tasks Implemented

### Extract ISRC from Spotify Track

The matching function extracts the ISRC code from the Spotify track's `external_ids` field. The Spotify API provides ISRC codes as part of the track metadata when available:

```typescript
const isrc = spotifyTrack.external_ids?.isrc;
```

The implementation handles cases where:
- The `external_ids` field is undefined
- The `isrc` property is missing from `external_ids`
- The ISRC code is present but the song doesn't exist in Navidrome

### Check ISRC on Search Results

Since Navidrome doesn't support ISRC search, the implementation:
1. Performs a text-based search by title (and optionally first artist)
2. Checks if any returned songs have matching ISRC codes
3. Falls back to duration-based matching (delta < 2 seconds) if ISRC doesn't match

```typescript
const isrcMatch = candidates.find((song) => song.isrc?.[0] === isrc);
const durationMatch = candidates.find((song) => {
  const navidromeDuration = song.duration;
  const spotifyDurationSec = spotifyTrack.duration_ms / 1000;
  const delta = Math.abs(navidromeDuration - spotifyDurationSec);
  return delta < 2;
});

if (isrcMatch || durationMatch) {
  // Match found via ISRC or duration
}
```

### Return Match or Null

The matching function returns a `TrackMatch` object with:
- `status`: 'matched' if a song is found, 'unmatched' otherwise
- `matchStrategy`: 'isrc' for ISRC/duration matches, 'fuzzy' or 'strict' for other matches
- `matchScore`: 1.0 for ISRC/duration matches, 0.0 for no matches
- `navidromeSong`: The matched song details (if found)
- `spotifyTrack`: Reference to the original Spotify track

## File Structure

```
types/matching.ts            # Type definitions for track matching
types/navidrome.ts           # Navidrome types including isrc field
lib/matching/orchestrator.ts # ISRC matching integrated in orchestrator
```

### types/matching.ts

This file contains the type definitions for track matching:

- `MatchStrategy` - Union type for matching strategies ('isrc' | 'fuzzy' | 'strict' | 'none')
- `MatchStatus` - Union type for match status ('matched' | 'ambiguous' | 'unmatched')
- `TrackMatch` - Interface representing a complete match result with all metadata

### lib/matching/orchestrator.ts

This file contains the multi-step ISRC matching implementation:

- `normalizeTitleForSearch()` - Strips parentheses and special characters from title
- `matchTrack()` - Orchestrates the matching chain with ISRC checks

## Usage Examples

### ISRC Matching Flow

```typescript
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { matchTrack } from '@/lib/matching/orchestrator';

const client = new NavidromeApiClient(
  'https://navidrome.example.com',
  'myusername',
  'mypassword'
);

const spotifyTrack = {
  id: '4cOdK2wGLETKBW3PvgPWqT',
  name: 'Never Gonna Give You Up',
  artists: [{ id: '1', name: 'Rick Astley' }],
  album: { id: 'a1', name: 'Whenever You Need Somebody', release_date: '1987-11-15' },
  duration_ms: 213000,
  external_ids: { isrc: 'GB-KAN-87-00001' },
  external_urls: { spotify: 'https://open.spotify.com/track/...' }
};

const result = await matchTrack(client, spotifyTrack);

console.log(result.status); // 'matched' or 'unmatched'
console.log(result.matchStrategy); // 'isrc', 'fuzzy', 'strict', or 'none'
console.log(result.matchScore); // 1.0 or 0.0
if (result.navidromeSong) {
  console.log(result.navidromeSong.title);
  console.log(result.navidromeSong.artist);
}
```

### Handling Missing ISRC

```typescript
const trackWithoutIsrc = {
  id: 'abc123',
  name: 'Unknown Track',
  artists: [{ id: '1', name: 'Unknown Artist' }],
  album: { id: 'a1', name: 'Unknown Album', release_date: '2020-01-01' },
  duration_ms: 180000,
  external_ids: {}, // No external_ids or isrc
  external_urls: { spotify: 'https://open.spotify.com/track/...' }
};

const result = await matchTrack(client, trackWithoutIsrc);
console.log(result.status); // 'unmatched' or 'fuzzy'/'strict' if title matches
console.log(result.matchScore); // 1.0 or 0.0
console.log(result.navidromeSong); // undefined if no match
```

## API Reference

### Function: matchTrack

```typescript
async function matchTrack(
  client: NavidromeApiClient,
  spotifyTrack: SpotifyTrack,
  options?: Partial<MatchingOrchestratorOptions>
): Promise<TrackMatch>
```

**Parameters:**
- `client` (NavidromeApiClient) - An authenticated Navidrome API client instance
- `spotifyTrack` (SpotifyTrack) - A Spotify track object containing the track metadata
- `options` (MatchingOrchestratorOptions, optional) - Custom matching options

**Returns:** A Promise resolving to a `TrackMatch` object with the following structure:

```typescript
interface TrackMatch {
  spotifyTrack: SpotifyTrack;
  navidromeSong?: NavidromeSong;
  matchScore: number;
  matchStrategy: 'isrc' | 'fuzzy' | 'strict' | 'none';
  status: 'matched' | 'ambiguous' | 'unmatched';
  candidates?: NavidromeSong[];
}
```

**Behavior:**
- Performs multi-step search (title only → title + first artist → title + all artists)
- Checks ISRC match on first two search results
- Falls back to duration matching (delta < 2s) on second search if ISRC not found
- If ISRC/duration match found, returns with `status: 'matched'` and `matchStrategy: 'isrc'`
- Falls back to fuzzy matching if no ISRC/duration match
- Falls back to strict matching if fuzzy fails
- Returns `status: 'unmatched'` if no strategies succeed

### Function: normalizeTitleForSearch

```typescript
function normalizeTitleForSearch(title: string): string
```

**Parameters:**
- `title` (string) - The track title to normalize

**Returns:** A normalized title string with:
- Parentheses and their contents removed
- Square brackets and their contents removed
- All text converted to lowercase
- Special characters removed
- Multiple spaces collapsed to single space

## Integration with Matching Chain

ISRC matching is the highest priority strategy in the matching chain (F2.4 Matching Orchestrator). The multi-step search process:

```
Step 1: Search by title only (normalized)
        ↓
        Check ISRC match → ISRC match found? → Return matched
        ↓ No
Step 2: Search by title (normalized) + first artist
        ↓
        Check ISRC match OR duration match (delta < 2s)
        → Match found? → Return matched
        ↓ No
Step 3: Search by title + all artists
        ↓
        Fuzzy matching with similarity threshold
        → Match found? → Return matched
        ↓ No
Step 4: Strict matching (exact artist + title)
        → Match found? → Return matched
        ↓ No
Return unmatched
```

## Matching Strategy Priority

1. **ISRC (highest priority)**
   - Most accurate method when ISRC codes are available
   - Checks ISRC match on title-only search results
   - Falls back to duration matching (delta < 2s) on title + first artist search
   - Returns immediately if match found

2. **Fuzzy Matching**
   - Handles minor variations in artist/title names
   - Uses Levenshtein distance-based similarity scoring
   - Configurable similarity threshold (default: 0.8)

3. **Strict Matching**
   - Fallback for remaining unmatched tracks
   - Exact match on normalized artist + title

## Dependencies

This feature depends on **F1.4 (Navidrome API Client)** for:
- The `search` method for fetching candidate songs
- Type definitions for `SearchResult3` and `NavidromeSong`
- Error handling patterns

The ISRC matching is in turn a dependency for:
- **F2.4 Matching Orchestrator** - Uses ISRC matching as the first strategy in the chain
- **F2.7 Batch Matcher** - Uses ISRC matching when processing playlist tracks

## Verification Results

### TypeScript Compilation

The TypeScript implementation compiles successfully with the project's TypeScript configuration. All type definitions are correctly exported and used throughout the implementation.

### ESLint Checks

The code passes all ESLint checks with the project's configuration. This includes proper use of TypeScript types, consistent code style, and adherence to best practices for async/await usage and error handling.

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Completed

**Last Updated:** January 4, 2026

**Update Notes (January 4, 2026):**
- Fixed ISRC matching bug where Navidrome API doesn't accept ISRC as search query
- Changed from separate ISRC search to checking ISRC on title-based search results
- Added multi-step search approach (title only → title + first artist → title + all artists)
- Added duration-based fallback matching (delta < 2 seconds) for second search step
- Removed `searchByISRC` method from NavidromeApiClient
- Updated matching orchestrator to integrate ISRC checks directly in search flow
