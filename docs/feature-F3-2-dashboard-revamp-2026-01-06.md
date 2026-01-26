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
}
```

**Internal Components:** SortIcon, StatusBadge, PlaylistRow, LovedSongsRow

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
