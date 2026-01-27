# Feature F3.1: Login Page

## Overview

This document describes the Login Page implementation for the NaviSpot-Plist application. The login page serves as the entry point where users connect their Spotify account and configure their Navidrome server credentials.

## File Location

- **Main Page**: `app/page.tsx`
- **Spotify Connect Button**: `components/spotify-connect-button.tsx`
- **Navidrome Credentials Form**: `components/navidrome-credentials-form.tsx`

## Features

### 1. Spotify Connect Button

The `SpotifyConnectButton` component handles Spotify OAuth authentication:

- **Connect State**: Displays "Connect Spotify" button with Spotify green (#1DB954) branding and Spotify logo
- **Authenticated State**: Shows user avatar, display name, and "Disconnect" button
- **Loading States**: Skeleton loader during initial auth check, disabled button during auth operations
- **Dark Mode**: Full dark mode support with Tailwind CSS

#### Integration
```tsx
import { SpotifyConnectButton } from '@/components/spotify-connect-button';

<SpotifyConnectButton />
```

Uses the `useAuth` hook:
- `spotify.isAuthenticated` - Check if user is logged in
- `spotify.user` - Display user information
- `spotifyLogin()` - Initiate OAuth flow
- `spotifyLogout()` - Clear server cookies, localStorage tokens, and disconnect
- `isLoading` - Handle initial loading state

#### Logout Process
When the user clicks the Disconnect button:
1. Button shows "Disconnecting..." and becomes disabled
2. Makes DELETE request to `/api/auth/spotify` to clear server-side cookies
3. Removes Spotify tokens from localStorage
4. Resets authentication state
5. Returns to "Connect Spotify" button state

### 2. Navidrome Credentials Form

The `NavidromeCredentialsForm` component handles Navidrome server connection:

- **Form Fields**:
  - Server URL (with URL validation)
  - Username
  - Password (with visibility toggle)

- **Validation**:
  - URL format validation using the URL constructor
  - Required field validation for all fields
  - Error messages displayed below each field

- **Connection Management**:
  - Connect button that tests and saves credentials
  - Disconnect button that clears stored credentials
  - Loading spinner during connection testing
  - Pre-fills form with stored credentials on mount

- **Status Indicators**:
  - Green dot + "Connected (version)" when connected
  - Gray dot + "Not connected" when disconnected
  - Error messages for failed connections

#### Integration
```tsx
import { NavidromeCredentialsForm } from '@/components/navidrome-credentials-form';

<NavidromeCredentialsForm />
```

Uses the `useAuth` hook:
- `navidrome.isConnected` - Display connection status
- `navidrome.credentials` - Pre-fill form values
- `navidrome.serverVersion` - Show server version
- `navidrome.error` - Display error messages
- `setNavidromeCredentials()` - Test and save credentials
- `clearNavidromeCredentials()` - Clear stored credentials
- `isLoading` - Handle initial loading state

### 3. Login Page Layout

The main page (`app/page.tsx`) combines both components in a clean, centered layout:

- **Header**: Application title and description
- **Content Card**: Two sections (Spotify + Navidrome) separated by a border
- **Loading State**: Loading spinner while auth context initializes
- **Responsive Design**: Works on mobile and desktop

## Technical Details

### Page Flow

1. On mount, `AuthProvider` loads stored credentials from localStorage
2. While loading, shows a centered loading spinner
3. Once loaded, displays the login page with:
   - Spotify section: Connect button or user profile
   - Navidrome section: Credentials form or connection status

### Authentication Requirements

The login page requires both services to be connected before proceeding to the dashboard:
- Spotify: Required for accessing playlists
- Navidrome: Required for exporting playlists

### Dependencies

- **F1.6 Auth Context**: Provides authentication state and methods
- **F1.2 Spotify OAuth**: Handles OAuth flow
- **F1.4 Navidrome API Client**: Tests server connection

## Component Structure

```
app/
├── page.tsx                    # Main login page
└── globals.css                 # Global styles

components/
├── spotify-connect-button.tsx  # Spotify OAuth button
└── navidrome-credentials-form.tsx  # Navidrome connection form

lib/
└── auth/
    └── auth-context.tsx        # AuthProvider with auth state

types/
├── auth-context.ts             # Auth type definitions
└── navidrome.ts                # Navidrome type definitions
```

## Styling

- **Tailwind CSS** for all styling
- **Dark mode** support via `dark:` modifier
- **Responsive** design with mobile-first approach
- **Consistent** color scheme using green (#1DB954) for primary actions

## Future Enhancements

- Add "Remember me" checkbox for credentials
- Show connection tips for first-time users
- Add keyboard navigation support
- Add accessibility labels for screen readers
