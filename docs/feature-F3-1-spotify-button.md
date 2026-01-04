# F3.1 Spotify Connect Button

## Overview

This document describes the Spotify Connect Button component implementation for the NaviSpot-Plist application.

## Implementation

### File Location
- `app/components/spotify-connect-button.tsx`

### Component Features

1. **Authentication State Display**
   - Shows "Connect Spotify" button when user is not authenticated
   - Displays user info (name, avatar) and "Disconnect" button when authenticated

2. **Loading States**
   - Loading skeleton while initial auth state is being determined
   - "Disconnecting..." text during logout process
   - Button disabled state during login initiation

3. **Styling**
   - Uses Spotify green (#1DB954) for the connect button
   - Spotify logo SVG icon included
   - Rounded full buttons matching Spotify's design language
   - Dark mode support via Tailwind's dark: modifier
   - Hover and disabled state transitions

4. **Integration**
   - Uses `useAuth` hook from `@/lib/auth/auth-context`
   - Accesses `spotify.isAuthenticated`, `spotify.user`, `spotifyLogin`, `spotifyLogout`, and `isLoading`

### Component Usage

```tsx
import { SpotifyConnectButton } from '@/components/spotify-connect-button';

// Use within AuthProvider
<SpotifyConnectButton />
```

## Technical Details

### Props
None - the component reads all state from the auth context.

### State Management
- `isLoggingOut` - local state to track logout process for UI feedback

### Authentication Flow
1. On mount, checks `isLoading` from auth context
2. If loading, shows skeleton placeholder
3. If authenticated, displays user profile and disconnect button
4. If not authenticated, displays connect button with Spotify branding

## Related Documentation

- [Auth Context](../lib/auth/auth-context.tsx) - Authentication state management
- [Auth Types](../../types/auth-context.ts) - TypeScript interfaces
