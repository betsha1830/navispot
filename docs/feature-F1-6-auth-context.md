# F1.6 Auth Context

## Feature Overview

The Auth Context feature provides a unified authentication management system for both Spotify and Navidrome services. It uses React Context to expose authentication state and methods to all components in the application, with automatic persistence to localStorage for a seamless user experience across sessions.

## Sub-tasks Implemented

### Create AuthContext for Global State

The `AuthContext` centralizes all authentication-related state and methods, eliminating the need for individual components to manage authentication independently. This includes:
- **Spotify authentication state**: Token, user information, and authentication status
- **Navidrome connection state**: Credentials, connection status, server version, and error state
- **Loading state**: Tracks initial auth data loading to prevent premature renders

### Persist Spotify Tokens to localStorage

Spotify authentication tokens are persisted with the following behavior:
- Tokens are stored in localStorage under the key `navispot_spotify_auth`
- On initialization, the context loads stored tokens and validates their expiry
- Expired tokens are automatically refreshed using the refresh token before use
- If refresh fails, the token is cleared and the user must re-authenticate
- Tokens include access token, refresh token, expiry timestamp, token type, and scope

**Token Refresh on Load:**
When the app initializes and a stored token is expired:
1. The `loadStoredAuth` function checks the token expiry
2. If expired, it calls `refreshSpotifyTokenFromStorage` to attempt a refresh
3. The refresh token is sent to the `/api/auth/refresh` endpoint
4. If successful, the new access token is stored and user stays authenticated
5. If refresh fails (e.g., refresh token expired), the token is cleared and user is logged out

### Persist Navidrome Credentials to localStorage

Navidrome credentials are securely stored with the following features:
- Credentials are stored in localStorage under the key `navispot_navidrome_auth`
- The credentials object contains URL, username, password, token, and clientId
- On initialization, the context loads stored credentials and attempts to reconnect
- The token and clientId are required for the native Navidrome API authentication
- Credentials can be cleared through the provided method for logout functionality

**localStorage Structure:**
```json
{
  "url": "https://navidrome.example.com",
  "username": "admin",
  "password": "securepassword",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "clientId": "8dd4svE3aTcpFM1iJJupf0"
}
```

**Note:** The Navidrome native API requires both `token` (JWT) and `clientId` for authentication. These are obtained from the `/auth/login` endpoint response, where `clientId` is returned in the `id` field.

### Provide Auth Status and Methods to Components

The context exposes a comprehensive API for authentication management:

**Spotify Methods:**
- `spotifyLogin()`: Initiates the Spotify OAuth flow by redirecting to the authorization endpoint
- `spotifyLogout()`: Calls DELETE /api/auth/spotify to clear server cookies, clears Spotify tokens from localStorage and state
- `refreshSpotifyToken()`: Refreshes the access token using the refresh token (public method)
- `refreshSpotifyTokenFromStorage()`: Internal helper that refreshes expired tokens during initial load (private)

**Navidrome Methods:**
- `setNavidromeCredentials()`: Saves credentials and tests the connection
- `testNavidromeConnection()`: Verifies connectivity to the Navidrome server
- `clearNavidromeCredentials()`: Removes credentials from storage and state

## File Structure

```
types/auth-context.ts           # Auth context type definitions
lib/auth/auth-context.tsx       # AuthProvider component and useAuth hook
```

### types/auth-context.ts

This file contains all TypeScript interfaces and constants for the auth context:

- `SpotifyAuthState`: Interface for Spotify authentication state (isAuthenticated, user, token)
- `NavidromeAuthState`: Interface for Navidrome connection state (isConnected, credentials, serverVersion, error)
- `AuthContextType`: Complete interface for the context value including both auth states and all methods
- Constants for localStorage keys: `SPOTIFY_STORAGE_KEY` and `NAVIDROME_STORAGE_KEY`

### lib/auth/auth-context.tsx

This file contains the complete implementation of the authentication context:

- `AuthProvider`: React context provider component that manages all auth state
- `useAuth`: Custom hook for accessing auth context in components
- Internal state management for both Spotify and Navidrome
- localStorage persistence logic
- Connection testing for Navidrome
- `refreshSpotifyTokenFromStorage`: Internal helper function that refreshes expired Spotify tokens during initial app load
- `loadStoredAuth`: Loads and validates stored auth data, attempting to refresh expired Spotify tokens before clearing them

## Usage Examples

### Basic Usage in Components

```typescript
import { useAuth } from '@/lib/auth/auth-context';

function MyComponent() {
  const { spotify, navidrome, spotifyLogin, spotifyLogout } = useAuth();

  if (!spotify.isAuthenticated) {
    return <button onClick={spotifyLogin}>Connect Spotify</button>;
  }

  return (
    <div>
      <p>Welcome, {spotify.user?.display_name}</p>
      <button onClick={spotifyLogout}>Logout</button>
    </div>
  );
}
```

### Setting Navidrome Credentials

```typescript
import { useAuth } from '@/lib/auth/auth-context';

function NavidromeSetup() {
  const { setNavidromeCredentials, navidrome } = useAuth();

  const handleConnect = async (url: string, username: string, password: string) => {
    const success = await setNavidromeCredentials({ url, username, password });
    if (success) {
      console.log('Connected to Navidrome:', navidrome.serverVersion);
    } else {
      console.error('Connection failed:', navidrome.error);
    }
  };
}
```

### Checking Authentication Status

```typescript
import { useAuth } from '@/lib/auth/auth-context';

function App() {
  const { isLoading, spotify, navidrome } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const isFullyAuthenticated = spotify.isAuthenticated && navidrome.isConnected;

  return isFullyAuthenticated ? <Dashboard /> : <LoginPage />;
}
```

## API Reference

### Context Value

```typescript
interface AuthContextType {
  spotify: SpotifyAuthState;
  navidrome: NavidromeAuthState;
  spotifyLogin: () => Promise<void>;
  spotifyLogout: () => Promise<void>;
  refreshSpotifyToken: () => Promise<boolean>;
  setNavidromeCredentials: (credentials: NavidromeCredentials) => Promise<boolean>;
  testNavidromeConnection: () => Promise<boolean>;
  clearNavidromeCredentials: () => void;
  isLoading: boolean;
}
```

### SpotifyAuthState

```typescript
interface SpotifyAuthState {
  isAuthenticated: boolean;
  user: SpotifyUser | null;
  token: SpotifyToken | null;
}
```

### NavidromeAuthState

```typescript
interface NavidromeAuthState {
  isConnected: boolean;
  credentials: NavidromeCredentials | null;
  serverVersion: string | null;
  error: string | null;
  token: string | null;
  clientId: string | null;
}
```

**Note:** The `token` and `clientId` fields store the authentication credentials for the Navidrome native API. These are used by the `NavidromeApiClient` to authenticate requests without requiring re-login on every API call. The `clientId` is extracted from the `id` field of the `/auth/login` response.

## Integration with App

### Provider Setup

Wrap the application with the AuthProvider in the root layout:

```typescript
// app/layout.tsx
import { AuthProvider } from '@/lib/auth/auth-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## Dependencies

This feature depends on:
- **F1.2 Spotify OAuth Client**: For token management and refresh logic
- **F1.4 Navidrome API Client**: For connection testing and server verification

The Auth Context is in turn a dependency for:
- **F3.1 Login Page**: Uses auth context for login/logout UI
- **F3.2 Dashboard**: Displays authentication status and playlists
- All features requiring authentication state access

## Security Considerations

### Token Storage
- Spotify tokens are stored in localStorage (encrypted by the OAuth client)
- Navidrome credentials are stored in localStorage as plain JSON
- Consider adding encryption for Navidrome credentials in production

### Initialization
- Auth state is loaded asynchronously on app initialization
- Loading state prevents premature rendering of unauthenticated views
- Expired tokens are automatically detected and refreshed using the refresh token
- If refresh fails (e.g., refresh token expired), token is cleared and user must re-authenticate
- This provides seamless user experience while maintaining security

### Error Handling
- Connection failures are captured and exposed through the error state
- Graceful degradation when credentials are invalid
- Clear methods for both logout and credential clearing

## Verification Results

### TypeScript Compilation

The TypeScript implementation compiles successfully with the project's TypeScript configuration. All type definitions are correctly exported and used throughout the context implementation.

### ESLint Checks

The code passes all ESLint checks with the project's configuration. This includes proper use of React hooks, TypeScript types, and consistent code style.

### Integration Testing

The auth context properly integrates with:
- Spotify OAuth client for token management
- Navidrome API client for connection testing
- localStorage for persistence across sessions

## Date and Status

**Date Implemented:** January 4, 2026

**Status:** Completed

**Last Verified:** January 4, 2026

**Last Updated:** January 5, 2026

The Auth Context feature is fully implemented and verified. All sub-tasks have been completed, the code passes static analysis checks, and the implementation is ready for use by dependent features.

## Update Notes

### January 5, 2026 - Native API Authentication

**Changes Made:**

1. **Added Native API Token Storage**
   - Added `token` and `clientId` fields to `NavidromeAuthState` interface
   - Token and clientId are now persisted to localStorage under `navispot_navidrome_auth`
   - This eliminates the need for re-login on every API request

2. **Updated `setNavidromeCredentials` Method**
   - Now performs direct login using `NavidromeApiClient.login()`
   - Saves both token and clientId to localStorage after successful authentication
   - Updates auth state with token and clientId for immediate use

3. **Updated `testNavidromeConnection` Method**
   - Reads stored token and clientId from localStorage before attempting connection
   - Passes stored credentials to `NavidromeApiClient` constructor
   - Saves new token/clientId if authentication was needed

4. **Fixed Client ID Extraction**
   - Navidrome API returns client ID in the `id` field of the login response
   - Updated `NavidromeApiClient.login()` to extract `clientId` from `data.id`
   - Previously incorrectly expected `clientUniqueId` field

**Benefits:**
- Reduced authentication overhead by reusing stored tokens
- Prevents 429 "Too Many Requests" errors from excessive re-logins
- Faster API request handling with pre-authenticated client

**Migration Note:**
- Users must re-login after this update to generate new localStorage entry with `clientId`
- Old localStorage entries without `clientId` will trigger automatic re-login

### January 26, 2026 - Automatic Spotify Token Refresh on App Load

**Issue Fixed:**
When Spotify access tokens expired during app initialization, users were automatically logged out instead of having their tokens refreshed. This caused poor user experience as users had to re-authenticate frequently.

**Changes Made:**

1. **Added `refreshSpotifyTokenFromStorage` Helper Function**
   - New internal helper function in `lib/auth/auth-context.tsx`
   - Accepts an expired token and user information
   - Attempts to refresh the token using the `/api/auth/refresh` endpoint
   - Returns `true` on successful refresh, `false` on failure
   - On success: Updates localStorage with new token and sets authenticated state
   - On failure: Returns `false` so caller can clear the invalid token

2. **Updated `loadStoredAuth` Function**
   - Modified token expiry handling to attempt refresh before clearing
   - Changed logic: Instead of immediately removing expired tokens, now tries to refresh first
   - If refresh succeeds, user stays authenticated seamlessly
   - If refresh fails (e.g., refresh token expired), then token is removed and user must re-authenticate

**Behavior Changes:**
- **Before:** Expired tokens → immediate removal → user logged out → must re-login
- **After:** Expired tokens → attempt refresh → if success, user stays logged in → if fail, user logged out

**Code Changes:**
```typescript
// Old behavior:
if (parsed.token && parsed.token.expiresAt > Date.now()) {
  setSpotify({ isAuthenticated: true, token: parsed.token, user: parsed.user });
} else {
  localStorage.removeItem(SPOTIFY_STORAGE_KEY); // Removes without attempting refresh!
}

// New behavior:
if (parsed.token) {
  const isExpired = parsed.token.expiresAt <= Date.now();
  
  if (isExpired) {
    const refreshed = await refreshSpotifyTokenFromStorage(parsed.token, parsed.user);
    if (refreshed) {
      return; // Successfully refreshed, user stays authenticated
    }
    localStorage.removeItem(SPOTIFY_STORAGE_KEY); // Only remove if refresh failed
  } else {
    setSpotify({ isAuthenticated: true, token: parsed.token, user: parsed.user });
  }
}
```

**Benefits:**
- Improved user experience - users stay logged in across sessions
- Reduced need for manual re-authentication
- Seamless token renewal during app initialization
- Maintains security by logging out only when refresh truly fails (e.g., revoked refresh token)

**Edge Cases Handled:**
- Refresh token expired → User logged out (expected behavior)
- Network error during refresh → User logged out (fallback to safe state)
- Missing refresh token → User logged out (invalid token state)
- Refresh endpoint unavailable → User logged out (fallback to safe state)
