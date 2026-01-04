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
- Sets encrypted token in httpOnly cookie
- Redirects to success/error page
- Uses `x-forwarded-host` and `x-forwarded-proto` headers for correct redirect URLs behind reverse proxies

#### `app/api/auth/session/route.ts`

Client-side session sync endpoint:
- Reads the httpOnly `spotify_token` cookie server-side
- Returns authentication state and token to authenticated client
- Used by auth context to sync state after OAuth callback redirect
- Validates token expiry and cleans up expired cookies

**Why this endpoint is needed:**
After OAuth callback redirects to `/?auth=success`, the browser has the httpOnly cookie set but the client-side auth context has no localStorage data (the token was never written there). This endpoint allows the client to sync its state by:
1. Calling the endpoint which reads the httpOnly cookie server-side
2. Fetching the user profile with the access token
3. Persisting to localStorage for subsequent page loads
4. Updating the React state to reflect authenticated status

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
1. **HTTP-Only Cookies**: Tokens stored in httpOnly cookies, inaccessible to JavaScript (XSS protection)
2. **Client-Side Sync**: After OAuth callback, client syncs via `/api/auth/session` endpoint
3. **localStorage Fallback**: Synced token persisted to localStorage for subsequent page loads
4. **IV Randomization**: Each encryption uses fresh random IV
5. **Buffer Before Expiry**: Refresh 60 seconds before actual expiry

### Client-Side Session Sync Security

The session sync pattern maintains security while enabling UI updates:

```
OAuth Callback → httpOnly Cookie Set → Client Calls /api/auth/session → 
Server Reads Cookie → Returns Token to Client → Client Fetches User Profile → 
Persists to localStorage → Updates UI State
```

**Security Properties:**
- Token never directly accessible to JavaScript (httpOnly cookie)
- Server-side validation before returning token to client
- User profile fetch requires valid access token (proves authenticity)
- Subsequent page loads use localStorage (cached copy)
- Logout clears both cookie and localStorage

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
| `app/api/auth/session/route.ts` | Session sync endpoint (client-side auth sync) |
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

### GET /api/auth/session
Client-side session sync endpoint.

**Purpose:**
Reads the httpOnly `spotify_token` cookie server-side and returns auth state to the client. Used after OAuth callback redirect to sync the client-side auth context with the cookie-based session.

**Response:**
```json
{
  "authenticated": true,
  "token": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresAt": 1234567890,
    "tokenType": "Bearer",
    "scope": "string"
  }
}
```

Or if not authenticated:
```json
{
  "authenticated": false,
  "error": "expired" | "invalid_token"
}
```

**Security:**
- Reads httpOnly cookie server-side, token never exposed directly
- Validates token expiry and cleans up expired cookies
- Client receives token only after server-side validation

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
   - Verify UI updates to show user profile (not "Connect Spotify" button)

2. **Token Storage Test**
   - After successful auth, check `document.cookie`
   - Verify `spotify_token` exists and is encrypted
   - Check localStorage for `spotify_auth` key with user data

3. **Session Sync Test**
   - After OAuth callback, clear localStorage
   - Refresh page
   - Verify `/api/auth/session` returns authenticated=true
   - Verify user profile is fetched and localStorage is repopulated

4. **Token Refresh Test**
   - Let token approach expiry
   - Make API call that requires valid token
   - Verify automatic refresh occurs

5. **Logout Test**
   - Call token clear method
   - Verify token removed from storage
   - Verify API calls fail appropriately

## Integration with Auth Context

The OAuth client integrates with the auth context (`lib/auth/auth-context.tsx`) for session management:

```typescript
// Auth context flow after OAuth callback:
// 1. loadStoredAuth() checks localStorage first
// 2. If no localStorage data, calls /api/auth/session endpoint
// 3. Endpoint reads httpOnly cookie server-side
// 4. If authenticated, client fetches user profile
// 5. Persists to localStorage for subsequent page loads
// 6. Updates React state to reflect authenticated status

import { useAuth } from '@/lib/auth/auth-context';

function SpotifyConnectButton() {
  const { spotify, spotifyLogin, spotifyLogout, isLoading } = useAuth();
  
  if (isLoading) return <Loading />;
  
  if (spotify.isAuthenticated && spotify.user) {
    return <UserDisplay user={spotify.user} onLogout={spotifyLogout} />;
  }
  
  return <ConnectButton onLogin={spotifyLogin} />;
}
```

The auth context ensures:
- Initial load checks both localStorage and session cookie
- UI always reflects current authentication state
- Tokens are refreshed automatically before expiry
- Logout clears all stored credentials

## Future Enhancements

- Implement token rotation (refresh token refresh)
- Add token migration for key changes
- Implement secure token transfer between devices
- Add token introspection endpoint
- Support multiple Spotify accounts

## Status

✅ Authorization URL generation implemented (PKCE flow)
✅ Callback handling and token exchange implemented
✅ Token refresh logic implemented (automatic + manual)
✅ Encrypted token storage in httpOnly cookies
✅ Client-side session sync via `/api/auth/session` endpoint
✅ Reverse proxy support: Extracts `x-forwarded-host` and `x-forwarded-proto` headers for correct redirect URLs in containerized deployments
✅ UI properly updates after OAuth callback redirect

## References

- [Spotify Web API Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
