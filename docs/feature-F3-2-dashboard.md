# Feature F3.2: Dashboard

## Overview

Displays a grid/list of Spotify playlists with thumbnails, metadata, and export status badges. Allows users to select multiple playlists for bulk export.

## Requirements Met

| Requirement | Status | Location |
|-------------|--------|----------|
| Grid/list view | ✅ | `components/Dashboard/Dashboard.tsx:96-105` |
| Playlist thumbnails | ✅ | `components/Dashboard/PlaylistCard.tsx:23-31` |
| Metadata display | ✅ | `components/Dashboard/PlaylistCard.tsx:34-43` |
| Export status badges | ✅ | `components/Dashboard/PlaylistCard.tsx:67-72` |
| Bulk selection | ✅ | `components/Dashboard/Dashboard.tsx:40-50` |
| Bulk export action | ✅ | `components/Dashboard/Dashboard.tsx:88-93` |

## Implementation Details

### Files Modified/Created

| File | Action | Status |
|------|--------|--------|
| `app/layout.tsx` | Added AuthProvider | ✅ |
| `app/page.tsx` | Conditionally render Dashboard or login | ✅ |
| `components/Dashboard/Dashboard.tsx` | Created | ✅ |
| `components/Dashboard/PlaylistCard.tsx` | Created | ✅ |
| `components/Dashboard/index.ts` | Created | ✅ |
| `docs/feature-F3-2-dashboard.md` | Created | ✅ |

## Dependencies

- **F2.5 Playlist Fetching**: `lib/spotify/client.ts` - `getAllPlaylists()` method
- **F1.6 Auth Context**: `lib/auth/auth-context.tsx` - Authentication state

## Data Model

### DashboardPlaylist

```typescript
interface DashboardPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  owner: { id: string; display_name: string };
  tracks: { total: number };
  snapshot_id: string;
  selected?: boolean;
  exportStatus?: 'none' | 'pending' | 'exported';
}
```

## Components

### Dashboard (main component)

- Uses `useAuth()` to get Spotify authentication state
- Fetches playlists using `spotifyClient.getAllPlaylists()`
- Manages selection state for bulk export
- Renders playlist grid
- Shows loading state while fetching playlists

### PlaylistCard (sub-component)

- Displays playlist thumbnail (or placeholder)
- Shows playlist name and track count
- Shows owner information
- Checkbox for selection
- Export status badge

## UI Layout

```
+------------------------------------------------------+
|  NaviSpot-Plist                              [User] |
+------------------------------------------------------+
|  Your Playlists                              [Export Selected] |
+------------------------------------------------------+
|  +------------+    +------------+    +------------+  |
|  |            |    |            |    |            |  |
|  |  [Image]   |    |  [Image]   |    |  [Image]   |  |
|  |            |    |            |    |            |  |
|  +------------+    +------------+    +------------+  |
|  Playlist A        Playlist B        Playlist C      |
|  42 tracks         128 tracks        15 tracks       |
|  [x] selected      [x] selected      [ ] selected    |
|  +------------+    +------------+    +------------+  |
|  |            |    |            |    |            |  |
|  |  [Image]   |    |  [Image]   |    |  [Image]   |  |
|  |            |    |            |    |            |  |
|  +------------+    +------------+    +------------+  |
|  Playlist D        Playlist E        Playlist F      |
|  67 tracks         89 tracks         234 tracks      |
|  [ ] selected      [ ] selected      [x] selected    |
+------------------------------------------------------+
```

## Export Status Badge Colors

| Status | Color | Description |
|--------|-------|-------------|
| none | Gray | Playlist not yet exported |
| pending | Yellow | Export in progress |
| exported | Green | Successfully exported |

## Implementation Plan

1. Update `app/layout.tsx` to include `AuthProvider`
2. Create `components/Dashboard/Dashboard.tsx` - main dashboard component
3. Create `components/Dashboard/PlaylistCard.tsx` - playlist card component
4. Create `components/Dashboard/index.ts` - exports
5. Update `app/page.tsx` to render Dashboard
6. Add dashboard-specific types if needed
7. Run lint and typecheck

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/layout.tsx` | Add AuthProvider |
| `components/Dashboard/Dashboard.tsx` | Create |
| `components/Dashboard/PlaylistCard.tsx` | Create |
| `components/Dashboard/index.ts` | Create |
| `app/page.tsx` | Replace with Dashboard |
| `docs/feature-F3-2-dashboard.md` | Create (this file) |

## Usage Example

```tsx
import { Dashboard } from '@/components/Dashboard';

export default function HomePage() {
  return <Dashboard />;
}
```

## Testing

Run the following to verify the implementation:

```bash
# Type check
npm run typecheck

# Lint
npm run lint
```

## Notes

- Playlist images use Next.js Image component for optimization
- Selection state persists during session
- Empty state shown when no playlists found
- Error state shown if fetch fails
