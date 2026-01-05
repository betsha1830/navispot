# Feature F1.4: Navidrome API Client

## Feature Overview

The Navidrome API Client is a TypeScript library that provides a structured interface for interacting with Navidrome music servers through the Subsonic API protocol. This client enables the NaviSpot-Plist application to authenticate with Navidrome, manage playlists, and perform server health checks.

### Purpose and Functionality

The Navidrome API Client serves as the foundational layer for all Navidrome-related operations within the application. It handles the complexities of the Subsonic API, including authentication, request formatting, and response parsing. The client provides high-level methods that abstract away the underlying HTTP requests and allow components to easily interact with a Navidrome server to retrieve playlist information, create new playlists, and update existing ones.

## Sub-tasks Implemented

### Basic Auth Header Generation

The client implements Base64 encoding for Basic Authentication, which is the required authentication method for the Subsonic API. The `generateAuthHeader` function takes a username and password, combines them with a colon separator, encodes the result in Base64, and prepends the `Basic ` prefix to create the authentication header value used in all API requests.

### Subsonic Ping Endpoint Test

The `ping` method provides a way to verify connectivity and authentication with the Navidrome server. It calls the `/rest/ping` endpoint with required Subsonic API parameters (username, password, version, client) and returns a result indicating whether the server is reachable and authenticated. The method returns an object containing a success flag, the server version when successful, and an error message when failed. This is typically used during the initial setup to validate user credentials before attempting other operations.

**Note:** The Subsonic API requires authentication parameters even for the ping endpoint. The client stores username and password as instance properties to include `u` (username), `p` (password), `v` (API version), and `c` (client name) parameters in all requests.

### getPlaylists Wrapper

The `getPlaylists` method retrieves all playlists from the Navidrome server by calling the `/rest/getPlaylists` endpoint. It returns an array of `NavidromePlaylist` objects containing playlist metadata such as ID, name, comment, song count, duration, and creation/update timestamps. The method handles the Subsonic response structure and maps the raw server response to a clean TypeScript interface.

### createPlaylist Wrapper

The `createPlaylist` method enables creation of new playlists on the Navidrome server via the `/rest/createPlaylist` endpoint. It accepts a playlist name and an optional array of song IDs to include in the new playlist. The method returns an object containing the new playlist's ID and a success flag, allowing the application to track the created playlist for subsequent operations.

### updatePlaylist Wrapper

The `updatePlaylist` method provides functionality to modify existing playlists by adding or removing songs through the `/rest/updatePlaylist` endpoint. It accepts a playlist ID, an array of song IDs to add, and an optional array of song IDs to remove (by entry index). This method is essential for the playlist export functionality when appending tracks to existing playlists or building playlists incrementally.

## File Structure

```
types/navidrome.ts          # Type definitions and interfaces
lib/navidrome/client.ts     # API client implementation
```

### types/navidrome.ts

This file contains all TypeScript type definitions for the Navidrome API client:

- `NavidromeSong` - Interface representing a song in the Navidrome library with ID, title, artist, album, duration, and optional ISRC code (returned as array by Navidrome)
- `NavidromePlaylist` - Interface representing a playlist with ID, name, comment, song count, duration, and timestamps
- `NavidromeCredentials` - Interface for storing connection credentials (URL, username, password)
- `NavidromeApiConfig` - Interface representing the client configuration (base URL and auth header)
- `SubsonicResponse` - Generic interface for Subsonic API responses with status, version, and error information
- `PlaylistItem` - Interface for individual playlist items in list responses
- `PlaylistsResponse` - Interface for the playlists list endpoint response
- `CreatePlaylistRequest` - Interface for playlist creation parameters
- `UpdatePlaylistRequest` - Interface for playlist update parameters
- `SearchResponse` - Interface for search endpoint responses

### lib/navidrome/client.ts

This file contains the complete implementation of the Navidrome API client:

- `generateAuthHeader` - Standalone function for creating Base64 auth headers
- `NavidromeApiClient` - Main class encapsulating all client functionality
  - Constructor - Initializes base URL and auth header from credentials, stores username/password for API requests
  - `ping` - Tests server connectivity and authentication with required Subsonic parameters
  - `getPlaylists` - Retrieves all playlists from the server
  - `getPlaylist` - Retrieves a single playlist with its tracks
  - `createPlaylist` - Creates a new playlist with optional initial songs
  - `updatePlaylist` - Adds or removes songs from an existing playlist
  - `search` - Searches for songs by query
  - `searchByISRC` - Searches for songs by ISRC code
  - `replacePlaylistSongs` - Replaces all songs in a playlist
  - Private helper methods for URL building (includes `f=json` for JSON responses), request execution, response handling, and data mapping

## Usage Examples

### How to Create the Client

```typescript
import { NavidromeApiClient } from '@/lib/navidrome/client';

const client = new NavidromeApiClient(
  'https://navidrome.example.com',
  'myusername',
  'mypassword'
);
```

The client constructor takes three parameters: the Navidrome server URL, the username, and the password. The URL is normalized to remove any trailing slashes to ensure consistent endpoint construction.

### How to Ping the Server

```typescript
const result = await client.ping();

if (result.success) {
  console.log(`Server version: ${result.serverVersion}`);
} else {
  console.error(`Ping failed: ${result.error}`);
}
```

The ping method is typically used during initial setup or when testing credentials. It provides a quick way to verify that the server is reachable and the provided credentials are valid without performing any destructive operations.

### How to Get Playlists

```typescript
const playlists = await client.getPlaylists();

playlists.forEach((playlist) => {
  console.log(`${playlist.name}: ${playlist.songCount} songs`);
});
```

The getPlaylists method returns an array of all playlists available to the authenticated user. This is useful for displaying a list of existing playlists in the UI or checking whether a playlist already exists before creating a new one.

### How to Create a Playlist

```typescript
const result = await client.createPlaylist('My New Playlist', ['song-id-1', 'song-id-2']);

if (result.success) {
  console.log(`Playlist created with ID: ${result.id}`);
}
```

The createPlaylist method creates a new playlist on the Navidrome server. The songIds parameter is optional and can be omitted for an empty playlist or provided to populate the playlist with initial tracks. The returned ID can be used for subsequent operations like adding more tracks.

### How to Update a Playlist

```typescript
const result = await client.updatePlaylist(
  'playlist-id-123',
  ['new-song-id-1', 'new-song-id-2'],
  [0, 1]  // Optional: remove songs at positions 0 and 1
);

if (result.success) {
  console.log('Playlist updated successfully');
}
```

The updatePlaylist method modifies an existing playlist. The songIdsToAdd parameter specifies which song IDs to append to the playlist, while the optional songIdsToRemove parameter specifies the indices of songs to remove. This enables full playlist modification capabilities needed for the export functionality.

## API Reference

### Function: generateAuthHeader

```typescript
function generateAuthHeader(username: string, password: string): string
```

**Parameters:**
- `username` (string) - The Navidrome username
- `password` (string) - The Navidrome password

**Returns:** A string containing the Base64-encoded Basic authentication header value

**Error Handling:** This function does not throw errors but returns an empty string if either parameter is empty

### Class: NavidromeApiClient

#### Constructor

```typescript
constructor(url: string, username: string, password: string)
```

**Parameters:**
- `url` (string) - The base URL of the Navidrome server
- `username` (string) - The username for authentication
- `password` (string) - The password for authentication

**Behavior:** Normalizes the URL by removing trailing slashes, generates the auth header for all subsequent requests, and stores the username and password as instance properties for use in Subsonic API parameters.

#### Method: ping

```typescript
async ping(): Promise<{
  success: boolean;
  serverVersion?: string;
  error?: string;
}>
```

**Returns:** An object with success status, server version on success, or error message on failure

**Error Handling:** Catches all exceptions and returns a structured error result instead of throwing

#### Method: getPlaylists

```typescript
async getPlaylists(): Promise<NavidromePlaylist[]>
```

**Returns:** An array of NavidromePlaylist objects, or an empty array if no playlists exist

**Error Handling:** Throws an error if the HTTP request fails or returns a non-OK status

#### Method: getPlaylist

```typescript
async getPlaylist(playlistId: string): Promise<{
  playlist: NavidromePlaylist;
  tracks: NavidromeSong[];
}>
```

**Parameters:**
- `playlistId` (string) - The ID of the playlist to retrieve

**Returns:** An object containing the playlist metadata and array of tracks

**Error Handling:** Throws an error if the playlist is not found or the request fails

#### Method: createPlaylist

```typescript
async createPlaylist(name: string, songIds: string[]): Promise<{
  id: string;
  success: boolean;
}>
```

**Parameters:**
- `name` (string) - The name for the new playlist
- `songIds` (string[]) - Array of song IDs to add to the playlist

**Returns:** An object with the new playlist's ID and a success flag

**Error Handling:** Throws an error if the request fails

#### Method: updatePlaylist

```typescript
async updatePlaylist(
  playlistId: string,
  songIdsToAdd: string[],
  songIdsToRemove?: number[]
): Promise<{ success: boolean }>
```

**Parameters:**
- `playlistId` (string) - The ID of the playlist to update
- `songIdsToAdd` (string[]) - Array of song IDs to append to the playlist
- `songIdsToRemove` (number[], optional) - Array of indices of songs to remove

**Returns:** An object with a success flag

**Error Handling:** Throws an error if the request fails

## Implementation Details

### Subsonic Response Wrapper Handling

The Subsonic API wraps all responses in a `subsonic-response` object. The client handles this transparently:

```json
{"subsonic-response":{"status":"ok","version":"1.16.1","type":"navidrome","serverVersion":"0.59.0","openSubsonic":true}}
```

The ping method extracts data from the `subsonic-response` wrapper if present, otherwise uses the response directly. This ensures the code works with both wrapped and unwrapped response formats.

### Subsonic API Parameter Support

The Subsonic API requires authentication parameters (`u`, `p`, `v`, `c`) even for the ping endpoint. The client stores username and password as instance properties and includes them in all API requests.

### JSON Response Format

The Subsonic API returns XML by default. The client requests JSON format by adding the `f=json` parameter to all requests via the `_buildUrl` method.

### Stable Callback Dependencies

The `testNavidromeConnection` function accepts credentials as a parameter instead of capturing them from closure, using an empty dependency array `[]` to maintain callback stability. The `setNavidromeCredentials` and `loadStoredAuth` functions pass credentials directly to the test function, preventing circular dependencies and infinite re-render loops.

```typescript
testNavidromeConnection: (credentials: NavidromeCredentials) => Promise<boolean>
```

### Unified Authentication Parameters

All Subsonic API methods include required authentication parameters via the `_getAuthParams()` helper method:

```typescript
private _getAuthParams(): Record<string, string> {
  return {
    u: this.username,
    p: this.password,
    v: '1.16.1',
    c: 'navispot-plist',
  };
}
```

This ensures `getPlaylists`, `getPlaylist`, `createPlaylist`, `updatePlaylist`, `replacePlaylistSongs`, `search`, and `searchByISRC` all include `u`, `p`, `v`, and `c` parameters required by the Subsonic API.

## Dependencies

This feature depends on **F1.1 (Project Setup)** for:
- TypeScript configuration
- Project folder structure
- Import aliases and path mappings
- ESLint configuration

The Navidrome API Client is in turn a dependency for:
- **F1.5 Search Functionality** - Uses the client for song search operations
- **F2.8 Playlist Exporter** - Uses the client for creating and updating playlists during export

## Verification Results

### TypeScript Compilation

The TypeScript implementation compiles successfully with the project's TypeScript configuration. All type definitions are correctly exported and used throughout the client implementation. The interface contracts between the types and the client implementation are fully validated by the TypeScript compiler.

### ESLint Checks

The code passes all ESLint checks with the project's configuration. This includes proper use of TypeScript types, consistent code style, and adherence to best practices for async/await usage and error handling.

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Completed

**Last Verified:** January 4, 2026

**Last Updated:** January 5, 2026

The Navidrome API Client feature is fully implemented and verified. All sub-tasks have been completed, the code passes static analysis checks, and the implementation is ready for use by dependent features.

## Update Notes

### January 5, 2026 - Native API Migration

**Major Changes:**

1. **Migrated from Subsonic API to Native Navidrome API**
   - All methods now use Navidrome's native REST API (`/api/*` endpoints) instead of Subsonic wrappers (`/rest/*`)
   - Native API provides better pagination support and access to all song data
   - See [Feature F1.5 Search Functionality](feature-F1-5-search.md) for details

2. **Added Token-Based Authentication**
   - Constructor now accepts optional `ndToken` and `ndClientId` parameters for native API authentication
   - Added `login()` method to authenticate and obtain JWT token and client ID
   - Added `getToken()` and `getClientId()` getter methods
   - Added `_ensureAuthenticated()` private method to auto-authenticate before API calls

3. **Native API Authentication Headers**
   - All native API requests include required headers:
     - `x-nd-authorization`: `Bearer ${token}`
     - `x-nd-client-unique-id`: `${clientId}`

4. **Fixed Client ID Extraction**
   - Navidrome's `/auth/login` endpoint returns the client ID in the `id` field of the response
   - Updated `login()` method to extract `clientId` from `data.id`
   - Previous implementation incorrectly expected `clientUniqueId` field

**Updated Constructor:**
```typescript
constructor(
  url: string, 
  username: string, 
  password: string, 
  ndToken?: string,           // NEW: Optional JWT token
  ndClientId?: string         // NEW: Optional client ID
)
```

**New Methods:**
```typescript
async login(username: string, password: string): Promise<{
  success: boolean;
  token?: string;
  clientId?: string;
  isAdmin?: boolean;
  error?: string;
}>

getToken(): string
getClientId(): string
```

**Benefits:**
- Eliminates re-login on every API request by caching tokens
- Uses native API for comprehensive song search (100+ songs per artist)
- Prevents 429 "Too Many Requests" errors from excessive authentication attempts

**Migration Note:**
- Existing localStorage entries without `clientId` will trigger automatic re-login
- Users must re-login after this update to generate proper authentication tokens

## ISRC Response Handling

The Navidrome API client handles ISRC search responses correctly:

**Subsonic Response Wrapper**: The Subsonic API wraps responses in a `subsonic-response` object. The search methods access the nested data correctly:

```typescript
const response = await this._makeRequest<{ 'subsonic-response': { searchResult3: SearchResult3 }>(url);
return response['subsonic-response']?.searchResult3?.song || [];
```

**ISRC Array Format**: Navidrome returns ISRC as an array (`string[]`). The matching logic uses `.includes()` for robust comparison:

```typescript
// types/navidrome.ts
isrc?: string[];

// lib/navidrome/client.ts
const match = songs.find((song) => song.isrc?.includes(isrc));
```

This ensures ISRC-based track matching works with Navidrome's actual API response format.
