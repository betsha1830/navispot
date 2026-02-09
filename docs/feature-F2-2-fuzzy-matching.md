# Feature F2.2: Track Matching - Fuzzy

## Feature Overview

The Fuzzy Matching feature provides a configurable algorithm for matching Spotify tracks to Navidrome songs using Levenshtein distance-based similarity scoring. This approach handles minor variations in artist names, titles, and formatting differences between the two music libraries.

### Purpose and Functionality

The fuzzy matching algorithm serves as a flexible fallback when ISRC matching fails or isn't available. It enables the application to:

- Match tracks with slight name variations (e.g., "The Beatles" vs "Beatles")
- Handle punctuation and special character differences
- Account for typos and minor transcription errors
- Provide configurable similarity thresholds for matching quality
- Detect ambiguous matches with multiple close candidates

The implementation uses a weighted combination of artist and title similarity, with title matching given higher weight (60%) compared to artist matching (40%).

## Sub-tasks Implemented

### String Normalization

The `normalizeString` function prepares strings for comparison by:

- Converting to lowercase
- Removing diacritical marks (accents, umlauts, etc.) using Unicode NFD normalization
- Removing all special characters and punctuation
- Collapsing multiple whitespace characters to single spaces
- Trimming leading and trailing whitespace

Example:
```typescript
normalizeString("The Beatles - Hey Jude!") // returns "the beatles hey jude"
```

### Levenshtein Distance Calculation

The `levenshteinDistance` function implements the classic edit distance algorithm that counts the minimum number of single-character edits (insertions, deletions, or substitutions) required to change one string into another.

The implementation uses dynamic programming with O(m×n) time complexity and O(min(m,n)) space optimization.

### Similarity Scoring (0-1)

The `calculateSimilarity` function converts Levenshtein distance to a normalized similarity score:

- Returns 1.0 for identical strings
- Returns 1.0 for both empty strings
- Calculates similarity as: `1 - (distance / maxLength)`
- Score ranges from 0.0 (completely different) to 1.0 (identical)

### Track-Level Matching

The `calculateTrackSimilarity` function combines artist, title, duration, and album similarities:

- Calculates separate similarity scores for artist, title, duration, and album
- Applies 25% weight to artist similarity
- Applies 35% weight to title similarity
- Applies 25% weight to duration similarity
- Applies 15% weight to album similarity
- Returns combined score from 0.0 to 1.0

#### Duration Similarity

The `calculateDurationSimilarity` function compares track durations to improve matching accuracy:

- **Less than 3 seconds difference**: High similarity boost (0.9-1.0)
- **3 or more seconds difference**: Penalty applied based on difference magnitude
- Maximum penalty is capped at 1 minute difference

This helps distinguish between different versions of the same song (radio edit vs album version) and reject clearly different tracks.

#### Album Name Normalization

The `normalizeAlbumName` function strips common soundtrack-related words:

- Removes words like "original", "soundtrack", "score", "OST", "complete", "vol", "volume", "disc"
- Helps match albums across different naming conventions

The `calculateAlbumSimilarity` function then compares the normalized album names.

#### Exact Title Match Boost

For tracks where the title is an exact match (similarity = 1.0), the algorithm applies a special boost to handle cases where artist names differ significantly. This is particularly useful for:

- **Classical music**: Composer names may differ from performer names
- **Video game soundtracks**: Artist may be listed as "Halo" instead of "Martin O'Donnell, Michael Salvatori"
- **Soundtrack albums**: Various artist naming conventions

The boosted scoring logic:

```
if titleSimilarity === 1.0:
    if artistSimilarity >= 0.3:
        score = max(artistSimilarity × 0.2 + titleSimilarity × 0.4 + durationSimilarity × 0.3 + albumSimilarity × 0.1, 0.85)
    else:
        score = max(artistSimilarity × 0.15 + titleSimilarity × 0.45 + durationSimilarity × 0.3 + albumSimilarity × 0.1, 0.75)
else:
    score = artistSimilarity × 0.25 + titleSimilarity × 0.35 + durationSimilarity × 0.25 + albumSimilarity × 0.15
```

This ensures that tracks with exact title matches are more likely to be matched even when artist names differ substantially, while still requiring some minimum artist similarity for a confident match.

#### Additional Boosts

- **Duration boost**: If duration similarity >= 0.9 (within 3 seconds), adds +0.1 to the base score
- **Album boost**: If album similarity >= 0.8 AND (title >= 0.6 OR artist >= 0.4), adds +0.05 to the base score

### Configurable Threshold Matching

The `findBestMatch` function implements the core matching logic:

- Scores all candidate Navidrome songs against a Spotify track
- Filters results by configurable threshold (default: 0.8)
- Sorts matches by score in descending order
- Detects ambiguous matches (multiple close candidates within 0.05 of best score)
- Returns the best match along with all qualifying matches and ambiguity status

## File Structure

```
lib/matching/
└── fuzzy.ts    # Fuzzy matching implementation and exports
```

### lib/matching/fuzzy.ts

This file contains all fuzzy matching functionality:

- `FuzzyMatchOptions` - Interface for matching configuration options
- `FuzzyMatchResult` - Interface for individual match results with score
- `FuzzyMatchCandidateResult` - Interface for matching operation results
- `normalizeString()` - String normalization utility
- `levenshteinDistance()` - Edit distance calculation
- `calculateSimilarity()` - Normalized similarity scoring (0-1)
- `calculateDurationSimilarity()` - Duration-based similarity with 3-second threshold
- `normalizeAlbumName()` - Album name normalization for soundtrack common words
- `calculateAlbumSimilarity()` - Album name similarity after normalization
- `normalizeTitle()` - Title normalization removing live recording indicators
- `calculateTitleSimilarity()` - Title similarity with live indicator normalization
- `calculateTrackSimilarity()` - Track-level similarity combining artist, title, duration, and album
- `findBestMatch()` - Main matching function with threshold filtering

## Usage Examples

### Basic Fuzzy Matching

```typescript
import { findBestMatch } from '@/lib/matching/fuzzy';
import { SpotifyTrack } from '@/types/spotify';
import { NavidromeSong } from '@/types/navidrome';

const spotifyTrack: SpotifyTrack = {
  id: 'abc123',
  name: 'Hey Jude',
  artists: [{ id: '1', name: 'The Beatles' }],
  album: { id: 'alb1', name: 'Single', release_date: '1968' },
  duration_ms: 431000,
  external_ids: {},
  external_urls: { spotify: 'https://open.spotify.com/track/abc123' }
};

const candidates: NavidromeSong[] = [
  { id: 's1', title: 'Hey Jude', artist: 'The Beatles', album: '1', duration: 431000 },
  { id: 's2', title: 'Hey Jude - Live', artist: 'Beatles', album: 'Live', duration: 450000 },
  { id: 's3', title: 'Help!', artist: 'The Beatles', album: 'Help!', duration: 243000 }
];

const result = findBestMatch(spotifyTrack, candidates);

console.log(result.bestMatch?.score); // 1.0 (exact match)
console.log(result.hasAmbiguous); // false
```

### Custom Threshold

```typescript
const result = findBestMatch(spotifyTrack, candidates, {
  threshold: 0.7 // Lower threshold for more matches
});
```

### Manual Score Calculation

```typescript
import { calculateSimilarity, calculateTrackSimilarity } from '@/lib/matching/fuzzy';

const similarity = calculateSimilarity('The Beatles', 'beatles');
// Returns: 0.857... (high similarity despite article difference)

const trackSimilarity = calculateTrackSimilarity(spotifyTrack, navidromeSong);
// Returns: 0.88 (combining artist and title similarity)
```

## API Reference

### Function: normalizeString

```typescript
function normalizeString(str: string): string
```

**Parameters:**
- `str` (string) - The input string to normalize

**Returns:** A normalized lowercase string with diacritics removed, special characters stripped, and whitespace collapsed.

### Function: levenshteinDistance

```typescript
function levenshteinDistance(a: string, b: string): number
```

**Parameters:**
- `a` (string) - First string to compare
- `b` (string) - Second string to compare

**Returns:** The minimum number of single-character edits required to transform `a` into `b`.

### Function: calculateSimilarity

```typescript
function calculateSimilarity(str1: string, str2: string): number
```

**Parameters:**
- `str1` (string) - First string to compare
- `str2` (string) - Second string to compare

**Returns:** A normalized similarity score between 0.0 and 1.0, where 1.0 indicates identical strings.

### Function: calculateDurationSimilarity

```typescript
function calculateDurationSimilarity(
  spotifyDurationMs: number,
  navidromeDurationSeconds: number
): number
```

**Parameters:**
- `spotifyDurationMs` (number) - Duration of the Spotify track in milliseconds
- `navidromeDurationSeconds` (number) - Duration of the Navidrome song in seconds

**Returns:** A similarity score between 0.0 and 1.0:
- Returns 0.9-1.0 if duration difference is less than 3 seconds
- Returns lower values with penalty for larger differences

### Function: normalizeAlbumName

```typescript
function normalizeAlbumName(album: string): string
```

**Parameters:**
- `album` (string) - The album name to normalize

**Returns:** A normalized album name with common soundtrack words removed ("original", "soundtrack", "score", "OST", etc.)

### Function: calculateAlbumSimilarity

```typescript
function calculateAlbumSimilarity(
  spotifyAlbum: string,
  navidromeAlbum: string
): number
```

**Parameters:**
- `spotifyAlbum` (string) - The Spotify album name
- `navidromeAlbum` (string) - The Navidrome album name

**Returns:** A similarity score between 0.0 and 1.0 based on normalized album name comparison.

### Function: normalizeTitle

```typescript
function normalizeTitle(title: string): string
```

**Parameters:**
- `title` (string) - The track title to normalize

**Returns:** A normalized title with live recording indicators removed. Removes patterns like:
- ` (live)`, `- live`, ` [live]`, ` live`
- `(live)`, `-live`, `[live]`, `live`

This handles variations like:
- "Song Name - Live" → "song name"
- "Song Name (Live)" → "song name"

### Function: calculateTitleSimilarity

```typescript
function calculateTitleSimilarity(
  spotifyTitle: string,
  navidromeTitle: string
): number
```

**Parameters:**
- `spotifyTitle` (string) - The Spotify track title
- `navidromeTitle` (string) - The Navidrome song title

**Returns:** A similarity score between 0.0 and 1.0 based on normalized title comparison. Uses `normalizeTitle()` to strip live indicators before comparison.

### Function: calculateTrackSimilarity

```typescript
function calculateTrackSimilarity(
  spotifyTrack: SpotifyTrack,
  navidromeSong: NavidromeSong
): number
```

**Parameters:**
- `spotifyTrack` (SpotifyTrack) - The Spotify track to match
- `navidromeSong` (NavidromeSong) - The Navidrome song to compare

**Returns:** A weighted similarity score combining:
- Artist similarity (25%)
- Title similarity (35%)
- Duration similarity (25%)
- Album similarity (15%)

Includes boosts for exact title matches and close duration matches.

### Function: findBestMatch

```typescript
function findBestMatch(
  spotifyTrack: SpotifyTrack,
  candidates: NavidromeSong[],
  threshold: number = 0.8
): FuzzyMatchCandidateResult
```

**Parameters:**
- `spotifyTrack` (SpotifyTrack) - The Spotify track to match
- `candidates` (NavidromeSong[]) - Array of potential Navidrome matches
- `threshold` (number) - Minimum similarity score for a match (default: 0.8)

**Returns:** A `FuzzyMatchCandidateResult` object containing:
- `matches`: All matches above threshold, sorted by score
- `hasAmbiguous`: Whether multiple candidates are nearly equally good
- `bestMatch`: The highest-scoring match (undefined if no matches)

### Interface: FuzzyMatchOptions

```typescript
interface FuzzyMatchOptions {
  threshold?: number;  // Minimum similarity score (0.0-1.0)
  songCount?: number;  // Maximum candidates to consider
}
```

### Interface: FuzzyMatchResult

```typescript
interface FuzzyMatchResult {
  song: NavidromeSong;    // The matched Navidrome song
  score: number;          // Similarity score (0.0-1.0)
}
```

### Interface: FuzzyMatchCandidateResult

```typescript
interface FuzzyMatchCandidateResult {
  matches: FuzzyMatchResult[];    // All qualifying matches
  hasAmbiguous: boolean;          // Multiple close matches
  bestMatch?: FuzzyMatchResult;   // Top match if exists
}
```

## Matching Algorithm Details

### String Normalization Process

1. **Lowercase conversion**: Ensures case-insensitive comparison
2. **Unicode NFD normalization**: Separates base characters from diacritical marks
3. **Diacritic removal**: Strips accent marks, umlauts, etc.
4. **Special character removal**: Removes punctuation and symbols
5. **Whitespace normalization**: Collapses multiple spaces to single space
6. **Trim**: Removes leading/trailing whitespace

### Similarity Calculation

The similarity score is calculated as:

```
similarity = 1 - (levenshteinDistance(normalized1, normalized2) / maxLength)
```

This produces a score where:
- 1.0 = identical strings
- 0.0 = completely different strings
- Intermediate values indicate proportional similarity

### Track Matching Weights

The combined track similarity uses weighted averaging by default:

```
trackSimilarity = (artistSimilarity × 0.25) + (titleSimilarity × 0.35) + (durationSimilarity × 0.25) + (albumSimilarity × 0.15)
```

Weight distribution rationale:
- **Title (35%)**: Song titles are the most distinctive identifiers
- **Artist (25%)**: Important for differentiating between different artists' songs with similar titles
- **Duration (25%)**: Helps distinguish between different versions of the same song
- **Album (15%)**: Additional signal especially useful for soundtrack/album matching

### Duration-Based Matching

Duration similarity uses a 3-second threshold:

- **< 3 seconds difference**: High similarity (0.9-1.0), provides a boost to the overall score
- **≥ 3 seconds difference**: Penalty applied, reducing the similarity score

This helps handle cases where:
- Radio edits differ slightly from album versions
- Different pressings or remasters have slight length variations
- Live versions are clearly different from studio recordings

### Album Name Normalization

Before comparing album names, common soundtrack-related words are stripped:

```typescript
const SOUNDTRACK_WORDS = [
  'original', 'sound', 'track', 'ost', ' soundtrack', 'score',
  'complete', 'vol', 'volume', ' disc ', 'disk'
];
```

This allows matching:
- "Halo: Combat Evolved (Original Soundtrack)" with "Halo: Combat Evolved"
- "The Matrix (Original Motion Picture Score)" with "The Matrix"

### Title Normalization for Live Recordings

Track titles often have live recording indicators in different formats. The `normalizeTitle()` function standardizes these:

```typescript
const LIVE_INDICATORS = [
  ' (live)', '- live', ' [live]', ' live',
  '(live)', '-live', '[live]', 'live'
];
```

This handles variations like:
- "Bemistir Kiberign - Live" → "bemistir kiberign"
- "Bemistir Kiberign (Live)" → "bemistir kiberign"

This is especially useful for classical music, jazz, and live concert recordings where the same performance might be labeled differently across sources.

### Ambiguity Detection

A match is considered ambiguous when:
- Multiple candidates score within 0.05 of the best score
- This indicates similar quality alternatives exist
- User intervention may be needed for best selection

## Dependencies

This feature depends on **F1.5 (Search Functionality)** for:
- `NavidromeSong` type definitions
- Integration with the search API for candidate retrieval

The Fuzzy Matching feature is in turn a dependency for:
- **F2.4 Matching Orchestrator** - Uses fuzzy matching in the fallback chain
- **F2.7 Batch Matcher** - Applies matching to all tracks in a playlist

## Performance Considerations

- String normalization is O(n) where n is string length
- Levenshtein distance is O(m×n) for two strings of lengths m and n
- Track matching combines two similarity calculations
- For batch operations, consider caching normalized strings
- The default threshold of 0.8 balances precision and recall

## Testing Recommendations

1. **Exact matches**: Verify 1.0 score for identical strings
2. **Case differences**: Test case-insensitive matching
3. **Diacritics**: Verify accent stripping works (e.g., "Naïve" vs "Naive")
4. **Punctuation**: Ensure special characters are ignored
5. **Typos**: Test edit distance with common typos
6. **Ambiguity**: Verify ambiguous detection with close candidates
7. **Empty strings**: Handle edge cases gracefully
8. **Performance**: Test with long artist/title strings
9. **Exact title match with different artists**: Verify boost is applied correctly
   - Same title, very different artists should get boosted score
   - Example: "Halo" by "Martin O'Donnell" vs "Halo" by "Halo"
10. **Classical/Soundtrack matching**: Test tracks where composer differs from performer
11. **Duration matching**: Test that tracks within 3 seconds get boosted
    - Example: "Hey Jude" (431s) vs "Hey Jude" (428s) should have high duration similarity
12. **Album name normalization**: Test soundtrack album matching
    - Example: "The Matrix (Original Soundtrack)" vs "The Matrix" should match
13. **Title live indicator normalization**: Test that live variants are matched
    - Example: "Bemistir Kiberign - Live" vs "Bemistir Kiberign (Live)" should match

## Verification Results

### TypeScript Compilation

The TypeScript implementation compiles successfully with the project's TypeScript configuration. All type definitions for the fuzzy matching module are correctly exported and the interfaces match the expected data structures from Spotify and Navidrome types.

### ESLint Checks

The code passes all ESLint checks with the project's configuration. This includes proper use of TypeScript types, consistent code style, and adherence to best practices for function implementation.

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Completed

**Last Updated:** February 9, 2026

**Update Notes (January 4, 2026):**
- Added exact title match boost to handle cases where artist names differ significantly
- Added duration-based matching with 3-second threshold for better track version detection
- Added album name normalization to handle soundtrack naming conventions
- Added album similarity scoring to improve soundtrack/classical music matching
- Added title normalization to handle live recording indicator variations
- Added debug logging for troubleshooting matching issues
- Updated testing recommendations to cover all new matching scenarios

**Update Notes (February 9, 2026):**
- Fixed bug in `stripTitleSuffix()` where greedy regex matching caused titles with parentheses like "(I Just) Died In Your Arms" to be completely stripped to empty string
- Changed `TITLE_SUFFIX_PATTERN` from `/[\(\[].*[\)\]].*$|[-–—~/].*$/` to `/[\(\[].*?[\)\]]\s*$|[-–—~/].*$/` to use non-greedy matching and properly handle trailing whitespace
- This fix ensures only suffixes (like " - Remastered 2024") are stripped, not content within the main title
