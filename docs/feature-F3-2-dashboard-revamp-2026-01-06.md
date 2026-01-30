# Feature F3.2 Dashboard UI Revamp Plan

**Date:** January 6, 2026
**Status:** ✅ Completed with UI Improvements
**Implementation Date:** January 11, 2026
**UI Improvements Date:** January 15, 2026
**Previous Implementation:** Grid-based card layout (feature-F3-2-dashboard.md)

---

## Overview

Revamp the dashboard UI from a grid-based card layout to a table-based layout with advanced filtering, sorting, and search capabilities. This revamp improves playlist management for bulk export operations while maintaining visual consistency with the login page design language.

✅ **COMPLETED:** The Dashboard component has been updated to use the table-based layout with all features implemented.

---

## UI Flow Stages

The dashboard export workflow is divided into three stages with a consistent layout:

| Stage | Description |
|-------|-------------|
| **Before Exporting** | Browse, filter, search, and select playlists in a data table |
| **During Exporting** | Track export progress with real-time status updates |
| **After Exporting** | View export results, statistics, and options to export again |

**Layout:** Consistent 50/50 vertical split across all stages:
- **Top Half (50%):** Two-column layout - Left (Selected Playlists) + Right (Songs/Unmatched)
- **Bottom Half (50%):** Main playlist table (scrollable)

Only dynamic UI elements change between stages (progress bars, status badges, button state).

---

## Stage 1: Before Exporting (Table View)

### Table Layout Requirements

| Column | Width | Content | Sortable | Filterable |
|--------|-------|---------|----------|------------|
| Select | 60px | Checkbox for individual + "Select All" header | No | No |
| Cover | 80px | Playlist cover image (Next.js Image) | No | No |
| Name | Auto | Playlist name (truncated with tooltip) | Yes | Yes |
| Tracks | 120px | Total track count | Yes | No |
| Owner | 200px | Owner display name | Yes | Yes |
| Status | 120px | Export status badge | No | **No** |

**Container:** `max-h-[70vh]` with inner scrollable content and sticky header
**Table Row Order:**
1. Header Row (sticky) - Column titles with sort indicators
2. Loved Songs Row - Liked Songs playlist as first playlist row
3. Playlist Rows - Remaining playlists scrollable

### Functional Requirements

**Sorting:** Click column headers to toggle ascending/descending (Name, Tracks, Owner)
**Filtering:** Filter dropdown per column + quick filter chips (All, Selected Only, Not Selected, Liked Songs, Exported, Not Exported)
**Searching:** Global search across Playlist name and Owner name (debounced 300ms)
**Selection:** Individual checkboxes + "Select All" header (selects filtered/visible only)
**Real-time Selected Playlists Table:** Selected playlists immediately appear in top-left panel when selected

### Export Button (Fixed Footer)

Position: Fixed at bottom-right of screen (like cookie banner)

| State | Button Text | Color | Behavior |
|-------|-------------|-------|----------|
| Before Export | "Export Selected (n)" | Blue | Shows confirmation popup |
| During Export | "Cancel Export" | Red | Stops export process |

**Confirmation Popup:** Lists selected playlists with track counts before export begins

```tsx
<div className="fixed bottom-6 right-6 z-50">
  <button
    onClick={isExporting ? onCancel : onShowConfirmation}
    disabled={!isExporting && selectedIds.size === 0}
    className="rounded-lg px-6 py-3 text-sm font-medium shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg
      {isExporting 
        ? 'bg-red-500 hover:bg-red-600 text-white'
        : 'bg-blue-500 hover:bg-blue-600 text-white'}"
  >
    {isExporting ? 'Cancel Export' : `Export Selected (${selectedIds.size})`}
  </button>
</div>
```

### Visual Design (Login Page Theme)

**Statistics Display:** Inline badges in Selected Playlists panel header
| Badge | Icon | Color | Description |
|-------|------|-------|-------------|
| Total | ≡ | Gray `bg-zinc-100 text-zinc-700` | Total tracks across selected playlists |
| Matched | ✓ | Green `bg-green-100 text-green-800` | Successfully matched tracks |
| Unmatched | ✗ | Red `bg-red-100 text-red-800` | Unmatched tracks |

**Color Scheme:**
- Page background: `bg-zinc-50 dark:bg-black`
- Card/container: `rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900`
- Headings: `text-zinc-900 dark:text-zinc-100`
- Body text: `text-sm text-zinc-600 dark:text-zinc-400`
- Section borders: `border-b border-zinc-200 dark:border-zinc-800`

**Typography:** Geist Sans font, medium weight headers, regular body

**Component Styles:**
```tsx
{/* Table Container */}
<div className="w-full max-w-6xl mx-auto">
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
    {/* Table content */}
  </div>
</div>

{/* Header Row (Sticky) */}
<thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">

{/* Row Hover Effects */}
<tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">

{/* Selected Row */}
<tr className="bg-zinc-100 dark:bg-zinc-800 border-l-4 border-l-green-500">

{/* Zebra Striping */}
<tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
  {/* Even: bg-white dark:bg-zinc-900 */}
  {/* Odd: bg-zinc-50 dark:bg-zinc-800/50 */}
</tbody>
```

---

## Stage 2: During Exporting (Progress View)

### Layout & Dynamic Elements

Layout remains identical to before/after export. Only these dynamic elements change:

**Selected Playlists Table (Left Column):**
- Progress bars appear for each playlist and update live from 0% → 100%
- Status badges update in real-time (Pending → Exporting → Exported)
- Statistics badges (Total, Matched, Unmatched) update live during both matching and exporting phases
- Currently exporting playlist highlighted

**Songs/Unmatched Panel (Right Column):**
- Shows tracks from current playlist being exported
- Updates as export progresses

**Bottom Table:**
- Remains visible and scrollable
- Interactions disabled (selection, sort, filter)

**Export Button:**
- Changes to "Cancel Export" (red)
- Stops export process with confirmation

**Progress Bar Implementation:**
```tsx
<div className="w-full">
  <div className="flex items-center justify-between mb-1">
    <span className="text-xs text-zinc-500 dark:text-zinc-400">
      {progress.current}/{progress.total} tracks
    </span>
    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
      {progress.percent}%
    </span>
  </div>
  <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
    <div 
      className="h-full bg-green-500 transition-all duration-300"
      style={{ width: `${progress.percent}%` }}
    />
  </div>
</div>
```

### Export Flow Sequence

**Before Export:**
1. User selects playlists in main table → appear in top-left panel
2. Click playlist row in Selected Playlists table → see tracks in top-right panel
3. Click "Export Selected" → confirmation popup
4. Confirm export

**During Export:**
1. Layout unchanged, button changes to "Cancel Export" (red)
2. Status badge changes to "Exporting" at start of each playlist
3. **Matching Phase:** Progress bars update from 0% → 100% as tracks are matched
4. **Matching Phase:** Statistics badges (Matched, Unmatched) update incrementally as each track is processed
5. **Export Phase:** Progress bars continue updating from 0% → 100% as tracks are exported to Navidrome
6. **Export Phase:** Exported count updates incrementally as tracks are written to Navidrome
7. Bottom table interactions disabled
8. User can click "Cancel Export" to abort

**After Export:**
1. Layout unchanged, button reverts to "Export Selected" (blue)
2. Status badges update to "Exported"
3. Bottom table interactions re-enabled

### Cancel Export Behavior

- Click "Cancel Export" → confirmation: "Cancel export? Progress will be lost."
- If confirmed → stop export, show "Export cancelled" status
- Previously exported playlists retain "Exported" status
- In-progress playlist remains with previous status
- Button reverts to "Export Selected" (blue)
- Bottom table interactions re-enabled

---

## Selected Playlists Table Features

**Real-time Population:** Playlists appear immediately when selected in main table
**Auto-Check by Default:** All playlists checked when added
**Playlist Checkboxes:** Select All header + individual checkboxes
**Row Click Selection:** Clicking row toggles checkbox
**Status Column:** Pending / Exporting (during both matching and exporting) / Exported / Failed
**Progress Bar:** Live updates 0% → 100% during BOTH matching and exporting phases
**Aggregate Statistics:** Live incremental updates (Total, Matched, Unmatched) during matching and export phases

### Real-time Update Implementation

**During Matching Phase:**
- Progress bar updates incrementally as each track is matched: `Math.round((current / total) * 100)`
- Matched count updates as tracks are successfully matched (status: 'matched' or 'ambiguous')
- Unmatched count updates as tracks fail to match (status: 'unmatched')
- Status badge shows "Exporting" (blue) during matching to indicate active processing

**During Export Phase:**
- Progress bar updates as each track is written to Navidrome: `exportProgress.percent`
- Matched and Unmatched counts remain constant from matching phase
- Exported count increments as each track is successfully exported to Navidrome
- Status badge remains "Exporting" (blue) during export

**Data Flow:**
```
BatchMatcher.matchTracks()
  → onProgress callback with { current, total, percent, matched, unmatched }
    → setSelectedPlaylistsStats() updates UI components
      → SelectedPlaylistsPanel recalculates badge totals from all playlists
```

**Implementation Details:**
- `selectedPlaylistsStats` state stores per-playlist progress and statistics
- Statistics badges calculated as aggregates: `reduce((sum, s) => sum + s.matched, 0)`
- Progress callbacks update the specific playlist by index in the array
- All state updates trigger re-renders ensuring UI stays synchronized

---

## Songs Detail Panel

**Location:** Right section (Before/During Export)
**Panel Name:** "Songs" (shows all tracks from checked playlists in left panel)

**Display Behavior:**
- Shows tracks from **checked playlists** in Selected Playlists table
- All playlists checked by default when added
- Tracks **grouped by playlist** with visual separators
- Row numbering resets to 1 for each playlist group
- Loading animation while fetching from Spotify
- Empty state when no playlists checked
- **Track export status** shown via row color coding (real-time updates)

**Columns:**
| Column | Width | Content |
|--------|-------|---------|
| # | 5% | Row number (resets per playlist group) |
| Title | 40% | Song title (truncated with tooltip) |
| Album | 25% | Album name (truncated with tooltip) |
| Artist | 20% | Artist name (truncated with tooltip) |
| Duration | 10% | Track duration (mm:ss) |

**Track Export Status Indicators (Row Colors):**
| Status | Row Color (Light Mode) | Row Color (Dark Mode) | Meaning |
|--------|------------------------|----------------------|---------|
| Waiting | Default (grayish/white) | Default (dark) | Track not yet processed |
| Exported | Green `bg-green-50` | Green `bg-green-900/20` | Track successfully matched during matching phase |
| Failed | Red `bg-red-50` | Red `bg-red-900/20` | Track failed to match (unmatched) |

**Real-Time Status Updates:**
- Status updates **live during matching phase** as each track is processed
- Tracks turn green when `status === 'matched'` or `status === 'ambiguous'`
- Tracks turn red when `status === 'unmatched'`
- Updates synchronized with Selected Playlists Panel statistics badges
- Color persists after export completes (no export-phase status updates)

**Visual Grouping:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💿 Liked Songs (150 tracks)                    Fetching...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# | Title          | Album        | Artist      | Duration
1  | [GREEN] Song A | Album X      | Artist 1    | 3:45
2  | [GREEN] Song B | Album Y      | Artist 2    | 4:20
3  | [RED]   Song C | Album Z      | Artist 3    | 2:55
```

**Track Fetching & Caching:**
- **Automatic:** Fetches when playlists checked
- **Caching:** Map<string, Song[]> prevents redundant API calls
- **Parallel Loading:** Promise.all() for multiple playlists
- **Per-Playlist Loading Indicator:** Spinning CD (💿) + "Fetching..."
- **API Calls:** `getAllSavedTracks()` for Liked Songs, `getAllPlaylistTracks()` for playlists
- **Data Conversion:** Spotify format → Song format with mm:ss duration
- **Error Handling:** Logged to console, empty array fallback

**Implementation:**
```typescript
const [playlistTracksCache, setPlaylistTracksCache] = useState<Map<string, Song[]>>(new Map());
const [loadingTracks, setLoadingTracks] = useState(false);

useEffect(() => {
  async function fetchTracks() {
    const uncachedIds = Array.from(checkedPlaylistIds).filter(id => !playlistTracksCache.has(id));
    if (uncachedIds.length === 0) return;
    
    setLoadingTracks(true);
    await Promise.all(uncachedIds.map(async (id) => {
      // Fetch from Spotify API, convert to Song format, update cache
    }));
    setLoadingTracks(false);
  }
  fetchTracks();
}, [checkedPlaylistIds, spotify.token]);

const playlistGroups = useMemo(() => {
  return selectedPlaylistsStats
    .filter(p => checkedPlaylistIds.has(p.id))
    .map(playlist => ({
      playlistId: playlist.id,
      playlistName: playlist.name,
      songs: playlistTracksCache.get(playlist.id) || [],
    }));
}, [selectedPlaylistsStats, checkedPlaylistIds, playlistTracksCache]);
```

**Loading States:**
- Empty (no playlists checked): ♫ Icon + "No Playlists Checked"
- Loading: ⟳ Spinner + "Loading Tracks..."
- Loaded: Grouped track list with section headers

---

## Stage 3: After Exporting (Results View)

### Results Report Components

Uses `ResultsReport` component with:
- **Summary Cards:** Total Tracks, Matched, Unmatched, Ambiguous, Exported, Failed
- **Action Buttons:** Export Again, Back to Dashboard
- **Match Details:** Expandable sections with match status breakdown

---

## Export Tracking & Sync Mechanism

### Overview

Export status tracked using Navidrome's `comment` field for cross-device sync and change detection.

### Comment Metadata Format

```json
{
  "spotifyPlaylistId": "abc123",
  "navidromePlaylistId": "nav123",
  "spotifySnapshotId": "xyz789",
  "exportedAt": "2026-01-06T10:30:00Z",
  "trackCount": 42
}
```

### Export Status States

| Status | Condition | Badge Style |
|--------|-----------|-------------|
| Not Exported | No matching Navidrome playlist | Gray `bg-zinc-100 text-zinc-600` |
| Exported | Navidrome exists with matching `snapshotId` | Green `bg-green-100 text-green-700` |
| Out of Sync | Navidrome exists but `snapshotId` differs | Orange `bg-orange-100 text-orange-700` |

### Sync Detection

1. On Dashboard Load: Fetch Navidrome playlists, parse `comment` field, match by `spotifyPlaylistId`
2. Status Determination:
   - No match → `not-exported`
   - Match + `snapshotId` matches → `exported`
   - Match + `snapshotId` differs → `out-of-sync`
3. Sync Actions:
   - `out-of-sync` shows warning icon
   - Re-export updates existing Navidrome playlist
   - New exports create new Navidrome playlists

### Liked Songs Tracking

- First export: Create Navidrome playlist "Liked Songs" with metadata in comment
- Subsequent exports: Compare saved tracks count with stored `trackCount`
- Out of Sync: Show status when count differs

---

## Data Models

```typescript
interface PlaylistTableItem {
  id: string;
  name: string;
  images: { url: string }[];
  owner: { display_name: string };
  tracks: { total: number };
  snapshot_id: string;
  isLikedSongs: boolean;
  selected: boolean;
  exportStatus: 'none' | 'exported' | 'out-of-sync';
  navidromePlaylistId?: string;
  lastExportedAt?: string;
}

export interface ExportMetadata {
  spotifyPlaylistId: string;
  navidromePlaylistId?: string;
  spotifySnapshotId: string;
  exportedAt: string;
  trackCount: number;
}

export interface TableState {
  sortColumn: 'name' | 'tracks' | 'owner';
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  filters: {
    status: 'all' | 'selected' | 'not-selected' | 'exported' | 'not-exported';
    source: 'all' | 'liked-songs' | 'playlists';
  };
  selectedIds: Set<string>;
}

export interface SongItem {
  id: string;
  title: string;
  album: string;
  artist: string;
  duration: string;
}

interface SelectedPlaylistItem {
  id: string;
  name: string;
  status: 'pending' | 'exporting' | 'exported' | 'failed';
  progress: {
    current: number;
    total: number;
    percent: number;
  };
  matchedCount: number;
  unmatchedCount: number;
}
```

---

## Component Implementation

### PlaylistTable Component

**File:** `components/Dashboard/PlaylistTable.tsx` (Created January 11, 2026)

**Features:**
- Container: `max-h-[calc(100vh-250px)]` with inner overflow-auto
- Sticky Header: `sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10`
- Loved Songs Row: Fixed second row with pink heart icon
- Search: Real-time filtering with clear button
- Sorting: Click column headers for Name, Tracks, Owner
- Selection: Individual checkboxes + "Select All"
- Status Badges: Exported (green), Out of Sync (yellow), Not Exported (gray)
- Zebra Striping: Even/odd row backgrounds
- Hover Effects: Visual feedback on hover
- Selected State: Green left border + background highlight
- Export Mode: Disables interactions when `isExporting=true`

**Props Interface:**
```typescript
interface PlaylistTableProps {
  items: PlaylistTableItem[];
  likedSongsCount: number;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  sortColumn: 'name' | 'tracks' | 'owner' | null;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (column: 'name' | 'tracks' | 'owner') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isExporting?: boolean;
  onRefresh?: () => void;  // Refresh callback
  isRefreshing?: boolean;  // Refresh loading state
  loading?: boolean;  // Initial loading state
}
```

**Internal Components:** SortIcon, StatusBadge, PlaylistRow, LovedSongsRow

---

## Playlist Refresh Button (January 30, 2026)

### Overview

Added a refresh button to the playlist table that allows users to refetch their Spotify playlists without refreshing the page. This is useful when users update their playlists on Spotify while the app is already running.

### Requirements

- Add a refresh button to the PlaylistTable component
- Position the button to the left of "showing x of x playlists" text
- Button should be blue colored
- Add animation to show when the playlists are being updated
- Refetch playlists without page refresh
- Button should be disabled during export and initial load

### UI Specification

```
[Refresh Button (Blue)] Showing x of x playlists
```

### Refresh Button Details

**Position:** Left of "showing x of x playlists" text in PlaylistTable stats footer

**Color:** Blue (`text-blue-500` normal, `hover:text-blue-700` hover)

**Animation:** Spin animation (`animate-spin`) when refreshing

**Disabled States:**
- During initial page load (`loading=true`)
- During refresh (`isRefreshing=true`)
- During export (`isExporting=true`)

**Icon:** Refresh/rotate icon (clockwise arrows)

### Implementation Details

#### components/Dashboard/PlaylistTable.tsx

**New Props (lines 24-26):**
```typescript
interface PlaylistTableProps {
  // ... existing props
  onRefresh?: () => void;
  isRefreshing?: boolean;
  loading?: boolean;
}
```

**Refresh Button UI (lines 426-445):**
```tsx
<div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
  <button
    onClick={onRefresh}
    disabled={loading || isRefreshing || isExporting}
    className="flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <svg
      className={`w-5 h-5 text-blue-500 hover:text-blue-700 ${isRefreshing ? "animate-spin" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  </button>
  <span>
    Showing {filteredItems.length} of {allItems.length} playlists
    {selectedIds.size > 0 && !isExporting && (
      <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
        ({selectedIds.size} selected)
      </span>
    )}
  </span>
</div>
```

#### components/Dashboard/Dashboard.tsx

**New State (line 93):**
```typescript
const [refreshing, setRefreshing] = useState(false)
```

**handleRefreshPlaylists Function (lines 195-241):**
```typescript
const handleRefreshPlaylists = async () => {
  if (!spotify.isAuthenticated || !spotify.token) return
  if (isExporting || loading) return

  setRefreshing(true)
  try {
    spotifyClient.setToken(spotify.token)

    // Refetch playlists from Spotify with cache-busting
    const fetchedPlaylists = await spotifyClient.getAllPlaylists(undefined, true)
    setPlaylists(fetchedPlaylists)

    // Update liked songs count with cache-busting
    try {
      const count = await spotifyClient.getSavedTracksCount(undefined, true)
      setLikedSongsCount(count)
    } catch {
      setLikedSongsCount(0)
    }

    // Refresh Navidrome playlists if connected
    if (navidrome.isConnected && navidrome.credentials && navidrome.token && navidrome.clientId) {
      const navidromeClient = new NavidromeApiClient(
        navidrome.credentials.url,
        navidrome.credentials.username,
        navidrome.credentials.password,
        navidrome.token,
        navidrome.clientId
      )
      try {
        const navPlaylists = await navidromeClient.getPlaylists()
        setNavidromePlaylists(navPlaylists)
      } catch (navErr) {
        console.warn("Failed to fetch Navidrome playlists:", navErr)
      }
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to refresh playlists")
  } finally {
    setRefreshing(false)
  }
}

    // Refresh Navidrome playlists if connected
    if (navidrome.isConnected && navidrome.credentials && navidrome.token && navidrome.clientId) {
      const navidromeClient = new NavidromeApiClient(
        navidrome.credentials.url,
        navidrome.credentials.username,
        navidrome.credentials.password,
        navidrome.token,
        navidrome.clientId
      )
      try {
        const navPlaylists = await navidromeClient.getPlaylists()
        setNavidromePlaylists(navPlaylists)
      } catch (navErr) {
        console.warn("Failed to refresh Navidrome playlists:", navErr)
      }
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "Failed to refresh playlists")
  } finally {
    setRefreshing(false)
  }
}
```

**PlaylistTable Props (lines 1353-1357):**
```tsx
<PlaylistTable
  // ... existing props
  onRefresh={handleRefreshPlaylists}
  isRefreshing={refreshing}
  loading={loading}
/>
```

### Testing Checklist

- [x] Refresh button appears to the left of "showing x of x playlists" text
- [x] Button is blue colored
- [x] Button spins when clicked
- [x] Playlists are refetched from Spotify when clicked
- [x] Button is disabled during export
- [x] Button is disabled during initial load
- [x] No page refresh occurs

### Bug Fixes During Testing

**Issue 1:** The refresh button was not being disabled during initial load.

**Fix:** Added `loading` prop to PlaylistTable and updated the button's disabled condition to: `disabled={loading || isRefreshing || isExporting}`

**Issue 2:** Browser was using cached responses when refreshing playlists, preventing users from seeing updated playlist data.

**Fix:** Added cache-busting to prevent browser caching:
- Modified `lib/spotify/client.ts` to accept `bypassCache` parameter
- Added timestamp query parameter (`_t=${Date.now()}`) to request URLs
- Updated `handleRefreshPlaylists` in Dashboard to pass `bypassCache: true` to Spotify API calls
- This makes each request URL unique, forcing the browser to fetch fresh data

**Implementation Details:**
- `getPlaylists()`, `getSavedTracks()`, and `getSavedTracksCount()` now accept `bypassCache` parameter
- When `bypassCache=true`, a unique timestamp is appended to the URL
- Browser treats each unique URL as a separate request, bypassing its cache
- No custom headers are added to avoid CORS issues (Spotify API doesn't support Cache-Control header in requests)

**Issue 3:** Song tracks were being refetched even when playlists hadn't changed, causing unnecessary API calls.

**Fix:** Added smart refresh using snapshot ID comparison:
- Before updating playlists, capture current `snapshot_id` values for all playlists
- After refreshing playlists, compare old and new `snapshot_id` values
- Remove changed playlists from `playlistTracksCache` to trigger automatic refetch
- Only tracks for playlists with changed content are re-fetched from Spotify
- Playlists with identical `snapshot_id` keep their cached tracks

**Why Snapshot ID?**
Spotify guarantees that `snapshot_id` changes whenever playlist content changes:
- Tracks added → `snapshot_id` changes
- Tracks removed → `snapshot_id` changes
- Track order changed → `snapshot_id` changes
- Metadata changed (playlist name, description) → `snapshot_id` does NOT change

This is the most reliable method to detect actual content changes without making unnecessary API calls.

### Benefits

✅ **User Experience**
- No need to refresh the entire page to get updated playlist data
- Instant feedback with spinning animation
- Consistent with modern app patterns

✅ **Performance**
- Only fetches updated data, doesn't reload entire application
- Preserves current selection and state
- No full page re-render

✅ **Reliability**
- Disabled during critical operations (export, initial load)
- Clear visual feedback when refreshing
- Error handling with user-friendly messages

---

## Dashboard Component Updates

**File:** `components/Dashboard/Dashboard.tsx` (Updated January 11, 2026)

**Changes Implemented:**
1. Import new components: PlaylistTable, ExportLayoutManager, ConfirmationPopup, SelectedPlaylistsPanel, SongsPanel, ProgressTracker, ResultsReport
2. Add new state: isExporting, showConfirmation, currentUnmatchedPlaylistId, unmatchedSongs, selectedPlaylistsStats, sortColumn, sortDirection, searchQuery, checkedPlaylistIds, playlistTracksCache, loadingTracks
3. Update data fetching: Fetch Navidrome playlists, match with Spotify using comment field, set exportStatus, handle Liked Songs
4. Update export flow: Use ConfirmationPopup, show progress during export, handle cancel export
5. Update render: Use ExportLayoutManager, render PlaylistTable, fixed export button, two-column layout
6. Sync detection: Compare Spotify snapshot_id with stored snapshotId
7. Real-time selected playlists: useEffect watches selectedIds changes
8. Track fetching: useEffect watches checkedPlaylistIds changes
9. **Live progress updates (January 26, 2026):**
    - Set status to 'exporting' at start of each playlist processing
    - Matching phase: Update progress bar (0% → 100%) and statistics badges (matched/unmatched) via batchProgress callback
    - Export phase (favorites): Update progress bar and exported count via onProgress callback
    - Export phase (playlists): Update progress bar and exported count via onProgress callback
    - Statistics badges calculated as aggregates from selectedPlaylistsStats
10. **Playlist refresh button (January 30, 2026):**
    - Added `refreshing` state to track when refresh is in progress
    - Added `handleRefreshPlaylists` function that refetches playlists from Spotify
    - Updated likedSongsCount during refresh
    - Pass `onRefresh` and `isRefreshing` props to PlaylistTable

---

## UI Improvements (January 15, 2026)

### Bottom Table Height Fix

**Fixed Viewport Overflow Issues:**
- PlaylistTable: Changed to `flex flex-col h-full overflow-hidden` for proper height containment
- Scrollable Table Container: Replaced fixed `max-h-[calc(100vh-250px)]` with `overflow-auto h-full`
- Search Bar: Added `flex-shrink-0` to maintain visibility
- Stats Footer: Added `flex-shrink-0` to keep visible at bottom
- Layout: Now uses flex-based layout that respects parent container's 50% height

**Benefits:**
- Table content properly constrains to allocated viewport space
- Independent scrolling without affecting other sections
- Search bar and stats footer remain accessible
- No content overflow beyond viewport
- Consistent scrolling across all dashboard sections

---

## Live Progress Update Implementation (January 26, 2026)

### Problem
Progress bars and statistics badges in the Selected Playlists Panel were not updating live during export. They only showed updates after each playlist completed processing.

### Root Cause
1. **Matching phase**: Progress updates were sent to `progressState` (unused) but not to `selectedPlaylistsStats`
2. **Statistics badges**: Matched/unmatched counts were only set after matching completed, not incrementally
3. **Export phase**: Only progress and exported counts were updated, not matched/unmatched

### Solution

#### lib/matching/batch-matcher.ts
- Extended `BatchMatcherProgress` interface to include `matched` and `unmatched` fields
- Updated `matchTracks` to calculate and include partial statistics in progress callback
- Both sequential and concurrent processing now update statistics incrementally

```typescript
interface BatchMatcherProgress {
  current: number;
  total: number;
  currentTrack?: SpotifyTrack;
  percent: number;
  matched?: number;
  unmatched?: number;
}
```

#### components/Dashboard/Dashboard.tsx
**Matching Phase (lines 468-519):**
- Set status to 'exporting' at start of each playlist
- Update `progress` field with `batchProgress.percent` 
- Update `matched` and `unmatched` fields from `batchProgress`

**Export Phase - Favorites (lines 574-583):**
- Update `progress` and `exported` from `exportProgress`
- Maintain `matched` and `unmatched` from matching phase

**Export Phase - Playlists (lines 624-632):**
- Update `progress` and `exported` from `exportProgress`
- Maintain `matched` and `unmatched` from matching phase

### Result
- Progress bars now update live 0% → 100% during BOTH matching AND exporting
- Statistics badges (Total, Matched, Unmatched) update incrementally during matching
- Status badges show "Exporting" during both phases
- All UI elements stay synchronized throughout the export process

---

## Track Export Status Display Bug Fix (January 26, 2026)

### Problem
Track export status (green for exported, red for failed) was not displaying after page reload. The Songs Panel showed all tracks with default colors regardless of actual export status stored in localStorage.

### Root Cause
1. **Key Type Mismatch**: The `songExportStatus` Map was using track indices (numbers) as keys during matching/initialization
2. **Lookup Mismatch**: When displaying tracks, the code attempted to look up status by `spotifyTrackId` (string) from a Map indexed by numbers
3. **Cache Load Logic**: The cache loading logic at line 345 used complex iteration with incorrect track ID matching that didn't properly associate cached status with songs

### Solution

#### components/Dashboard/Dashboard.tsx
**Type Definition Fix (line 85):**
- Changed `songExportStatus` Map type from `Map<string, Map<number, ...>>` to `Map<string, Map<string, ...>>`
- Now consistently uses Spotify track IDs (strings) as keys throughout

**Cache Loading Logic (lines 342-373):**
```typescript
// Before: Used index numbers and complex Object.keys().find()
songs.forEach((song, index) => {
  const spotifyTrackId = Object.keys(cachedData.tracks).find(trackId => {
    const cachedTrack = cachedData.tracks[trackId];
    return cachedTrack.spotifyTrackId === trackId;
  });
  if (spotifyTrackId) {
    const cachedStatus = cachedData.tracks[spotifyTrackId];
    playlistStatus.set(index, cachedStatus.status === 'matched' ? 'exported' : 'failed');
  } else {
    playlistStatus.set(index, 'waiting');
  }
});

// After: Direct lookup by spotifyTrackId
songs.forEach((song) => {
  const trackId = song.spotifyTrackId;
  if (cachedData.tracks[trackId]) {
    const cachedStatus = cachedData.tracks[trackId];
    playlistStatus.set(trackId, cachedStatus.status === 'matched' ? 'exported' : 'failed');
  } else {
    playlistStatus.set(trackId, 'waiting');
  }
});
```

**Status Initialization (lines 534-543):**
```typescript
// Before: Used index numbers
songs.forEach((_, idx) => {
  playlistStatus.set(idx, 'waiting');
});

// After: Uses spotifyTrackId
songs.forEach((song) => {
  playlistStatus.set(song.spotifyTrackId, 'waiting');
});
```

**Matching Progress Callbacks (lines 618-625, 668-675):**
```typescript
// Before: Used track index
const trackIndex = batchProgress.current - 1;
if (match.status === 'matched' || match.status === 'ambiguous') {
  playlistStatus.set(trackIndex, 'exported');
} else {
  playlistStatus.set(trackIndex, 'failed');
}

// After: Uses spotifyTrack.id
if (match.status === 'matched' || match.status === 'ambiguous') {
  playlistStatus.set(match.spotifyTrack.id, 'exported');
} else {
  playlistStatus.set(match.spotifyTrack.id, 'failed');
}
```

**Cache Update Logic (lines 904-970):**
Fixed bug where code was iterating over empty `tracksData` object and referencing undefined variables `match` and `track`. Updated to:
- Iterate over `matches` array instead of empty `tracksData`
- Properly handle both cached and newly matched tracks
- Correctly count statistics for each track

### Result
- Track colors (green/red) now correctly display after page reload
- Export status persists correctly across page refreshes
- All status lookups use consistent key type (spotifyTrackId strings)
- Cache loading is more efficient with direct Map lookups
- No more key type mismatches causing undefined status display

---

## Track Export Persistence & Differential Exports

### Overview

Track export status is persisted in browser localStorage to enable:
1. **Instant visual feedback** - Colors loaded immediately on dashboard mount
2. **Differential exports** - Only match/export new tracks, not entire playlist
3. **Recovery from changes** - Survive playlist reordering and additions
4. **Efficient updates** - Update existing Navidrome playlists instead of replacing

### Storage Architecture

#### localStorage Key Structure
```
Key: navispot-playlist-export-{spotifyPlaylistId}
Value: JSON string of PlaylistExportData
```

#### Data Models

```typescript
interface TrackExportStatus {
  spotifyTrackId: string;           // Primary key from Spotify
  navidromeSongId?: string;        // Matched song ID (if exported)
  status: 'matched' | 'ambiguous' | 'unmatched';
  matchStrategy: 'isrc' | 'fuzzy' | 'strict' | 'none';
  matchScore: number;              // 0-1 confidence score
  matchedAt: string;               // ISO timestamp
}

interface PlaylistExportData {
  spotifyPlaylistId: string;       // Playlist identifier
  spotifySnapshotId: string;       // Detects playlist changes
  playlistName: string;            // Display name
  navidromePlaylistId?: string;    // Created playlist in Navidrome
  exportedAt: string;              // Last export timestamp
  trackCount: number;              // Number of tracks
  tracks: Record<string, TrackExportStatus>;  // spotifyTrackId -> status
  statistics: {
    total: number;
    matched: number;
    unmatched: number;
    ambiguous: number;
  };
}
```

### Cache Management

#### Cache Invalidation Conditions
1. **Playlist snapshot_id changes** → Invalidate cache, re-match all tracks
2. **User manually clears cache** → Delete from localStorage
3. **Navidrome playlist not found** → Recreate, update cache

#### Cache Operations
```typescript
// Save playlist export data to localStorage
savePlaylistExportData(playlistId: string, data: PlaylistExportData): void

// Load playlist export data from localStorage
loadPlaylistExportData(playlistId: string): PlaylistExportData | null

// Delete playlist export data from localStorage
deletePlaylistExportData(playlistId: string): void

// Get all saved export data
getAllExportData(): Map<string, PlaylistExportData>

// Check if playlist is up-to-date (snapshot matches)
isPlaylistUpToDate(data: PlaylistExportData, currentSnapshotId: string): boolean
```

### Differential Export Algorithm

#### Diff Calculation
```typescript
function calculateDiff(
  currentTracks: SpotifyTrack[],
  cachedData: PlaylistExportData
): {
  newTracks: SpotifyTrack[];              // Not in cache
  unchangedTracks: {                      // Already exported, keep them
    spotifyTrack: SpotifyTrack;
    cachedStatus: TrackExportStatus;
  }[];
  removedTracks: string[];                // Spotify IDs no longer in playlist
}
```

**Process:**
1. Compare current Spotify tracks with cached tracks by `spotifyTrackId`
2. Identify new tracks (not in cache) → Need matching
3. Identify unchanged tracks (in cache) → Skip matching, use cached data
4. Identify removed tracks (no longer in playlist) → Mark for removal

### Export Mode Decision Tree

```
Has cached export data?
├─ No
│  └─ Use mode='create' (new export)
└─ Yes
   ├─ Snapshot matches?
   │  ├─ Yes
   │  │  ├─ Navidrome playlist exists?
   │  │  │  ├─ Yes → Use mode='update' (differential export)
   │  │  │  │        • Match only new tracks
   │  │  │  │        • Add new tracks to Navidrome playlist
   │  │  │  │        • Remove deleted tracks from Navidrome playlist
   │  │  │  │        • Update localStorage
   │  │  │  └─ No → Use mode='create' (playlist lost, recreate)
   │  └─ No → Use mode='create' (playlist changed, invalidate cache, re-export)
   └─ Snapshot mismatch → Invalidate cache, re-match all tracks
```

### Export Mode Updates

#### Updated Export Mode
```typescript
export type ExportMode = 'create' | 'append' | 'overwrite' | 'update';
```

#### New Option
```typescript
interface PlaylistExporterOptions {
  mode?: ExportMode;
  existingPlaylistId?: string;
  skipUnmatched?: boolean;
  onProgress?: ProgressCallback;
  cachedData?: PlaylistExportData;  // NEW: For differential export
}
```

### Implementation Components

#### File: `lib/export/track-export-cache.ts`

**Responsibilities:**
- Manage localStorage CRUD operations for `PlaylistExportData`
- Cache validation and expiry checks
- Diff calculation for differential exports
- Cache cleanup and maintenance

**Key Functions:**
```typescript
export function savePlaylistExportData(playlistId: string, data: PlaylistExportData): void
export function loadPlaylistExportData(playlistId: string): PlaylistExportData | null
export function deletePlaylistExportData(playlistId: string): void
export function getAllExportData(): Map<string, PlaylistExportData>
export function isPlaylistUpToDate(data: PlaylistExportData, currentSnapshotId: string): boolean
export function calculateDiff(currentTracks: SpotifyTrack[], cachedData: PlaylistExportData): DiffResult
export function clearExpiredCache(): void
```

#### File: `lib/matching/batch-matcher.ts`

**New Method:**
```typescript
async matchTracksDifferential(
  tracks: SpotifyTrack[],
  cachedTracks: Record<string, TrackExportStatus>,
  options: BatchMatcherOptions,
  onProgress?: ProgressCallback
): Promise<{
  matches: TrackMatch[];
  statistics: Statistics;
  newTracks: SpotifyTrack[];      // Tracks that needed matching
  cachedMatches: TrackMatch[];     // Tracks with cached status
}>
```

**Behavior:**
- Only match `tracks` not found in `cachedTracks`
- For cached tracks, create `TrackMatch` objects from cached status
- Combine both sets for return
- Update progress callback with combined statistics

#### File: `lib/export/playlist-exporter.ts`

**Updated `exportPlaylist` Method:**

```typescript
async exportPlaylist(
  playlistName: string,
  matches: TrackMatch[],
  options: PlaylistExporterOptions = {}
): Promise<ExportResult> {
  const mode = options.mode ?? 'create';
  const cachedData = options.cachedData;

  // Differential export mode
  if (mode === 'update' && cachedData) {
    const { newTracks, removedTracks } = calculateDiff(matches, cachedData);

    // Add new tracks to Navidrome playlist
    if (newTracks.length > 0) {
      const newSongIds = newTracks
        .filter(m => m.navidromeSong)
        .map(m => m.navidromeSong!.id);
      await this.navidromeClient.updatePlaylist(
        cachedData.navidromePlaylistId!,
        newSongIds
      );
    }

    // Remove deleted tracks from Navidrome playlist
    if (removedTracks.length > 0) {
      const entryIdsToRemove = cachedData.tracks[removedTrackId].entryId;
      await this.navidromeClient.updatePlaylist(
        cachedData.navidromePlaylistId!,
        [],
        entryIdsToRemove
      );
    }

    // Update cached data with new tracks
    const updatedData = { ...cachedData, /* updated tracks */ };
    await savePlaylistExportData(playlistName, updatedData);

    return { success: true, /* statistics */ };
  }

  // Existing create/append/overwrite logic...
}
```

#### File: `components/Dashboard/Dashboard.tsx`

**New State:**
```typescript
const [trackExportCache, setTrackExportCache] = useState<Map<string, PlaylistExportData>>(new Map());
```

**Load Cache on Mount:**
```typescript
useEffect(() => {
  const allData = getAllExportData();
  setTrackExportCache(allData);
}, []);
```

**Update Export Flow:**

1. **Before matching:**
```typescript
const cachedData = loadPlaylistExportData(item.id);
const isUpToDate = cachedData && isPlaylistUpToDate(cachedData, item.snapshot_id);
```

2. **During matching:**
```typescript
if (isUpToDate) {
  // Use differential matching
  const result = await batchMatcher.matchTracksDifferential(
    tracks,
    cachedData.tracks,
    matcherOptions,
    onProgress
  );
} else {
  // Standard matching
  const result = await batchMatcher.matchTracks(tracks, matcherOptions, onProgress);
}
```

3. **After matching:**
```typescript
// Save track status to localStorage
const playlistData: PlaylistExportData = {
  spotifyPlaylistId: item.id,
  spotifySnapshotId: item.snapshot_id,
  playlistName: item.name,
  navidromePlaylistId: existingPlaylistId,
  exportedAt: new Date().toISOString(),
  trackCount: tracks.length,
  tracks: trackStatusMap,
  statistics: { /* calculated from matches */ },
};
savePlaylistExportData(item.id, playlistData);
```

4. **During export:**
```typescript
const exporterOptions: PlaylistExporterOptions = {
  mode: isUpToDate && existingPlaylistId ? 'update' : 'create',
  existingPlaylistId: existingPlaylistId,
  cachedData: isUpToDate ? cachedData : undefined,
  skipUnmatched: false,
  onProgress,
};
```

### Visual Enhancements

#### Songs Panel
- **Row colors**: Already implemented (green = exported, red = failed, default = waiting)
- **Status persistence**: Colors loaded from localStorage on mount
- **Instant feedback**: No need to re-export to see status

#### Selected Playlists Panel
- **Existing status**: Exported badge matches cached data
- **Progress**: Reuses cached match results for speed
- **Statistics**: Aggregates from all cached playlists

### Benefits

✅ **Performance**
- Only match new tracks, not entire playlist
- Faster exports for existing playlists
- Reduced Navidrome API calls

✅ **Speed**
- Update existing playlist instead of replacing
- Batch operations for adding/removing tracks
- Instant visual feedback from cache

✅ **Reliability**
- Survives playlist reordering (uses Spotify IDs)
- Survives track additions and deletions
- Recovers from partial exports

✅ **User Experience**
- Instant track status display on dashboard mount
- Clear visual indicators for export status
- Persistent across page refreshes

✅ **Storage**
- No server-side changes required
- Pure localStorage implementation
- Works offline (cache persists)

✅ **Scalability**
- Works for playlists of any size
- Handles large playlists (>1000 tracks) with pagination
- Efficient memory usage with Map data structures

### Edge Cases

1. **Navidrome playlist deleted**
   - Detect: `getPlaylist` fails for cached `navidromePlaylistId`
   - Action: Recreate with `mode='create'`, update cache

2. **Playlist reordered in Spotify**
   - Detect: Snapshot matches, track order changed
   - Action: Differential export preserves Spotify order in Navidrome

3. **Playlist name changed in Spotify**
   - Detect: Name in cache differs from current
   - Action: Update cached name, no re-export needed

4. **Tracks removed from Spotify playlist**
   - Detect: Track in cache not in current Spotify playlist
   - Action: Remove from Navidrome playlist, update cache

5. **Tracks added to Spotify playlist**
   - Detect: Track in current Spotify playlist not in cache
   - Action: Match new tracks, add to Navidrome playlist, update cache

6. **Concurrent exports**
   - Detect: Updated timestamp in cache changes during export
   - Action: Use latest data, handle race conditions gracefully

7. **Large playlists (>1000 tracks)**
   - Action: Batch matching operations, paginated API calls
   - Navidrome: Use `_start`/`_end` parameters for pagination

8. **Failed matches persist**
   - Action: Keep failed tracks in cache
   - Benefit: Re-match on next export with updated Navidrome library

### Storage Management

#### Cache Expiry Strategy
- **Recommended**: 90-day expiry
- **Implementation**: Add `expiresAt` field to `PlaylistExportData`
- **Cleanup**: Run `clearExpiredCache()` on dashboard mount

#### Storage Size Estimation
- Per track: ~200 bytes (Spotify ID + Navidrome ID + status + metadata)
- 1000 tracks: ~200 KB
- 100 playlists: ~20 MB total
- Within typical localStorage limits (5-10 MB per domain)

#### Cleanup Strategy
```typescript
// On dashboard mount
clearExpiredCache();  // Remove expired entries

// After successful export
savePlaylistExportData(id, data);  // Update with fresh data

// On user action (optional)
deletePlaylistExportData(id);  // Manual cache clear per playlist
localStorage.clear();  // Reset all data
```

### Testing Scenarios

1. **First export**: No cache exists → Create new export, save cache
2. **Second export (same playlist)**: Cache exists, snapshot matches → Differential export
3. **Second export (changed playlist)**: Cache exists, snapshot mismatch → Invalidate, re-export
4. **Export after refresh**: Cache loaded from localStorage → Instant colors, optional differential
5. **Export deleted playlist**: Navidrome playlist missing → Recreate, update cache
6. **Large playlist export**: 1000+ tracks → Batch operations, pagination
7. **Failed track retry**: Track failed in cache → Re-match on next export
8. **Concurrent exports**: Multiple playlists at once → Race condition handling

### Future Enhancements

- **Sync to Navidrome comment**: Optional cross-device sync for small playlists
- **Export history**: Track multiple export snapshots per playlist
- **Manual cache management**: UI for clearing/expiring cached data
- **Export statistics dashboard**: Visualize export history and trends
- **Batch cache operations**: Clear multiple playlists at once
- **Import/Export cache**: Backup and restore cache data
