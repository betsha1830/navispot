# F1.2 Spotify OAuth Client

## Overview

This document describes the implementation of the Spotify OAuth Client feature for NaviSpot-Plist.

## Feature Requirements

- Implement authorization URL generation
- Handle callback and token exchange
- Token refresh logic
- Store encrypted tokens in localStorage

## Dependencies

- F1.1 Project Setup

## Implementation Summary

### 1. Type Definitions (`types/spotify-auth.ts`)

Created type definitions for Spotify OAuth tokens, user data, and authentication state.

**Key Types:**
- `SpotifyToken`: Access token, refresh token, expiry timestamp, token type, and scope
- `SpotifyUser`: User profile information (id, display_name, email, images, etc.)
- `AuthState`: Combined authentication state for React context
- Constants: Auth URL, token URL, and required scopes

### 2. Authorization URL Generation (`lib/spotify/auth-url.ts`)

Implemented PKCE (Proof Key for Code Exchange) flow for secure OAuth:

- `generateCodeVerifier()`: Creates a cryptographically secure 32-byte verifier
- `generateCodeChallenge()`: Creates SHA-256 hash of verifier for PKCE
- `generateState()`: Creates random state parameter for CSRF protection
- `createAuthorizationUrl()`: Generates full authorization URL with PKCE parameters

**Security Features:**
- PKCE flow prevents authorization code interception attacks
- State parameter prevents CSRF attacks
- Code verifier stored in sessionStorage for callback validation

### 3. Token Storage & Encryption (`lib/spotify/token-storage.ts`)

Implemented secure token storage using AES-256-CBC encryption:

- `encryptToken()`: Encrypts token data using AES-CBC with random IV
- `decryptToken()`: Decrypts stored tokens
- `isTokenExpired()`: Checks if token needs refresh (with 60-second buffer)

**Security Features:**
- AES-256-CBC encryption for stored tokens
- Random IV for each encryption operation
- 60-second buffer before expiry to ensure smooth API calls

### 4. Spotify API Client (`lib/spotify/client.ts`)

Created comprehensive API client with token management:

- `setToken()` / `getToken()`: Token state management
- `getCurrentUser()`: Fetch authenticated user profile
- `getPlaylists()`: Fetch user playlists with pagination
- `getPlaylistTracks()`: Fetch tracks for a specific playlist
- `refreshAccessToken()`: Automatic token refresh before expiry
- `persistToken()` / `loadToken()`: Encrypted localStorage operations
- `clearToken()`: Secure token removal

**Token Management Features:**
- Automatic token refresh on 401 responses
- Pre-emptive refresh when token is near expiry
- Encrypted persistence to localStorage
- Seamless integration with API routes

### 5. Authentication API Routes

#### `app/api/auth/spotify/route.ts`

Initiates OAuth flow:
- Generates PKCE code verifier and challenge
- Creates state parameter for CSRF protection
- Sets secure cookies for code verifier and state
- Returns authorization URL to client

#### `app/api/auth/callback/route.ts`

Handles OAuth callback:
- Validates state parameter against cookie
- Verifies code verifier matches
- Exchanges authorization code for tokens
- Sets encrypted token cookie
- Redirects to success/error page
- Uses `x-forwarded-host` and `x-forwarded-proto` headers for correct redirect URLs behind reverse proxies

**Reverse Proxy Handling:**
When deployed behind a reverse proxy (e.g., Cloudflare Tunnel, nginx, traefik), the callback route extracts the original host and protocol from headers:
```typescript
const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
const protocol = request.headers.get('x-forwarded-proto') || 'https';
```
This ensures redirects use the external URL (e.g., `https://navispot.queen.pro.et`) instead of the internal container URL (e.g., `0.0.0.0:3000`).

#### `app/api/auth/refresh/route.ts`

Refreshes access tokens:
- Accepts refresh token
- Calls Spotify token endpoint
- Returns new access token
- Handles refresh failures gracefully

## Security Considerations

### OAuth Flow Security
1. **PKCE Protection**: All OAuth flows use PKCE to prevent code interception
2. **State Validation**: State parameter validated against `spotify_auth_state` cookie to prevent CSRF attacks
3. **Code Verifier Validation**: PKCE code verifier validated against `spotify_code_verifier` cookie
4. **Secure Cookies**: Tokens stored in httpOnly, secure, sameSite cookies
5. **Server-Side Token Exchange**: Token exchange happens on server, not client

### Token Storage Security
1. **Encryption at Rest**: Tokens encrypted before localStorage
2. **Client-Side Keys**: Encryption key derived from known constant
3. **IV Randomization**: Each encryption uses fresh random IV
4. **Buffer Before Expiry**: Refresh 60 seconds before actual expiry

### API Security
1. **Token Refresh on 401**: Automatic refresh when Spotify returns 401
2. **Pre-emptive Refresh**: Refresh before expiry to avoid API failures
3. **Secure Headers**: All API requests include proper authorization

### Deployment Considerations

**Environment Variables:**
The following environment variables must be set correctly for the OAuth flow to work:
- `SPOTIFY_REDIRECT_URI`: Must match the Spotify app's configured redirect URI
- `NEXT_PUBLIC_APP_URL`: The external URL of the application

**Important:** These values are read at build time, not runtime. Rebuild the Docker image after changing `.env.local`.

**Reverse Proxy Configuration:**
When deploying behind a reverse proxy, ensure the proxy forwards the `x-forwarded-host` and `x-forwarded-proto` headers. The callback route uses these headers to construct correct redirect URLs.

Example nginx config snippet:
```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
```

For Cloudflare Tunnel, these headers are typically forwarded automatically.

## Files Created

| File | Purpose |
|------|---------|
| `types/spotify-auth.ts` | OAuth-related type definitions |
| `types/spotify.ts` | Spotify API type definitions |
| `types/index.ts` | Type exports |
| `lib/spotify/auth-url.ts` | Authorization URL generation (PKCE) |
| `lib/spotify/token-storage.ts` | Token encryption and storage |
| `lib/spotify/client.ts` | Spotify API client with token management |
| `app/api/auth/spotify/route.ts` | OAuth initiation endpoint |
| `app/api/auth/callback/route.ts` | OAuth callback handler |
| `app/api/auth/refresh/route.ts` | Token refresh endpoint |

## API Endpoints

### GET /api/auth/spotify
Initiates Spotify OAuth flow.

**Response:**
```json
{
  "authUrl": "https://accounts.spotify.com/authorize?...",
  "state": "random_state_string"
}
```

**Cookies Set:**
- `spotify_code_verifier`: PKCE code verifier (httpOnly, 10 min expiry)
- `spotify_auth_state`: State parameter for CSRF validation (httpOnly, 10 min expiry)

### GET /api/auth/callback
Handles OAuth callback from Spotify.

**Query Parameters:**
- `code`: Authorization code
- `state`: State parameter
- `error`: Error code (if auth failed)

**Cookies Set:**
- `spotify_token`: Encrypted token data (httpOnly, 7 day expiry)

**Cookies Deleted:**
- `spotify_code_verifier`
- `spotify_auth_state`

### POST /api/auth/refresh
Refreshes access token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "playlist-read-private playlist-read-collaborative"
}
```

## Testing

### Manual Testing Steps

1. **OAuth Flow Test**
   - Call `GET /api/auth/spotify`
   - Redirect user to returned `authUrl`
   - Complete authorization on Spotify
   - Verify callback redirects to `/?auth=success`

2. **Token Storage Test**
   - After successful auth, check `document.cookie`
   - Verify `spotify_token` exists and is encrypted

3. **Token Refresh Test**
   - Let token approach expiry
   - Make API call that requires valid token
   - Verify automatic refresh occurs

4. **Logout Test**
   - Call token clear method
   - Verify token removed from storage
   - Verify API calls fail appropriately

## Integration with F1.3 Spotify API Client

The OAuth client provides the foundation for F1.3 (Spotify API Client):

```typescript
import { spotifyClient } from '@/lib/spotify/client';

// Load token from storage
const token = await spotifyClient.loadToken();
if (token) {
  spotifyClient.setToken(token);
}

// Use authenticated endpoints
const user = await spotifyClient.getCurrentUser();
const playlists = await spotifyClient.getPlaylists();
```

## Future Enhancements

- Implement token rotation (refresh token refresh)
- Add token migration for key changes
- Implement secure token transfer between devices
- Add token introspection endpoint

## Status

✅ Authorization URL generation implemented (PKCE flow)
✅ Callback handling and token exchange implemented
✅ Token refresh logic implemented (automatic + manual)
✅ Encrypted token storage in localStorage implemented
✅ Reverse proxy redirect URL handling fixed

## References

- [Spotify Web API Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
