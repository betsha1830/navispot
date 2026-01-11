# Feature F3.2 Dashboard UI Revamp Plan

**Date:** January 6, 2026
**Status:** Planning
**Previous Implementation:** Grid-based card layout (feature-F3-2-dashboard.md)

---

## Overview

Revamp the dashboard UI from a grid-based card layout to a table-based layout with advanced filtering, sorting, and search capabilities. This revamp improves playlist management for bulk export operations while maintaining visual consistency with the login page design language.

---

## UI Flow Stages

The dashboard export workflow is divided into three distinct stages:

| Stage | Description |
|-------|-------------|
| **Before Exporting** | Browse, filter, search, and select playlists in a data table |
| **During Exporting** | Track export progress with real-time status updates |
| **After Exporting** | View export results, statistics, and options to export again or return to dashboard |

---

## Stage 1: Before Exporting (Table View)

### 1.1 Table Layout Requirements

#### Container Properties
- **Height:** Responsive to viewport (`max-h-[70vh]` or `h-[calc(100vh-250px)]`)
- **Width:** Full width appropriate for data display (not constrained like login card)
- **Overflow:** Inner scrollable content with sticky header
- **Pagination:** None - all playlists loaded at once for simplicity
- **Loved Songs Row:** Second row (after header) - visible at beginning of table, scrolls with content

#### Header Row Behavior
- **Sticky positioning:** Header row sticks to top when scrolling
- **Background:** Semi-transparent backdrop with blur effect
- **Z-index:** Higher than table body content

#### Column Structure

| Column | Width | Content | Sortable | Filterable |
|--------|-------|---------|----------|------------|
| Select | 60px | Checkbox for individual + "Select All" header checkbox | No | No |
| Cover | 80px | Playlist cover image (Next.js Image) | No | No |
| Name | Auto | Playlist name (truncated with tooltip) | Yes | Yes |
| Tracks | 120px | Total track count | Yes | No |
| Owner | 200px | Owner display name | Yes | Yes |
| Status | 120px | Export status badge | No | **No** (non-filterable) |

**Table Row Order:**
1. **Header Row** (sticky) - Column titles with sort indicators
2. **Loved Songs Row** - Liked Songs playlist as the first playlist row
3. **Playlist Rows** - Remaining playlists scrollable within table body

**Note:** The Status column is explicitly non-filterable to maintain focus on selection and export actions.

### 1.2 Functional Requirements

#### Sorting
- Click column headers to toggle ascending/descending sort
- Visual indicator (arrow icon) showing sort direction
- Default sort: Name (A-Z)
- Sortable columns: Name, Tracks, Owner

#### Filtering
- Filter dropdown per applicable column (Name, Owner)
- Quick filter chips above table for common filters
- Filters act on the full playlist list (no pagination)
- Filter options:
  - All Playlists
  - Selected Only
  - Not Selected
  - Liked Songs
  - Exported
  - Not Exported

#### Searching
- Global search bar above table
- Searches across: Playlist name, Owner name
- Debounced search (300ms delay)
- Clear search button with icon

#### Selection
- Individual row checkbox selection
- Header checkbox for "Select All" (selects filtered/visible playlists only)
- "Select All" selects only playlists matching current filters and search criteria
- Selection state persists during session
- Visual indicator for selected rows (row highlight)

### 1.3 Visual Design (Login Page Theme)

The table inherits visual style elements from the login page but not its layout/sizing constraints.

#### Color Scheme (from login page)

```css
/* Page background */
bg-zinc-50 dark:bg-black

/* Card/container */
rounded-lg border border-zinc-200 dark:border-zinc-800
bg-white dark:bg-zinc-900

/* Headings */
text-zinc-900 dark:text-zinc-100

/* Body text */
text-sm text-zinc-600 dark:text-zinc-400

/* Section borders */
border-b border-zinc-200 dark:border-zinc-800

/* Loading spinner */
border-4 border-green-500 border-t-transparent
```

#### Typography
- Font: Geist Sans (consistent with login page)
- Header: Medium weight, uppercase, tracking-wide, smaller font size
- Body: Regular weight, appropriate line height

#### Component Styles

**Table Container:**
```tsx
<div className="w-full max-w-6xl mx-auto">
  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
    {/* Table content */}
  </div>
</div>
```

**Header Row (Sticky):**
```tsx
<thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">
  <tr className="border-b border-zinc-200 dark:border-zinc-800">
    {/* Headers */}
  </tr>
</thead>
```

**Row Hover Effects:**
```tsx
<tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
```

**Selected Row:**
```tsx
<tr className="bg-zinc-100 dark:bg-zinc-800 border-l-4 border-l-green-500">
```

**Zebra Striping (Row Visual Separation):**
```tsx
<tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
  {/* Even rows: Standard background */}
  <tr className="bg-white dark:bg-zinc-900">
  
  {/* Odd rows: Slightly darker for visual separation */}
  <tr className="bg-zinc-50 dark:bg-zinc-800/50">
</tbody>
```

**Row Alternating Pattern:**
| Row Type | Light Mode | Dark Mode |
|----------|------------|-----------|
| Even | `bg-white` | `bg-zinc-900` |
| Odd | `bg-zinc-50` | `bg-zinc-800/50` |
---

## Stage 2: During Exporting (Progress View)

### 2.1 Progress Display Components

#### Progress Tracker (Existing)
- Uses `ProgressTracker` component
- Shows current phase: matching → exporting → completed
- Real-time progress bar with percentage
- Statistics: matched, unmatched, exported, failed
- Current track display with name and artist

#### Export Progress Features
- Cancel export button
- Pause/Resume capability (optional)
- Time elapsed/remaining estimates

### 2.2 Visual Layout

```
+------------------------------------------------------+
|  [Back to Dashboard]                                 |
+------------------------------------------------------+
|  Exporting: Playlist Name                            |
+------------------------------------------------------+
|  [==================== 45% ================]         |
|  Phase: Matching | Matching 45 of 100 tracks         |
+------------------------------------------------------+
|  Current: "Song Title" by "Artist Name"              |
+------------------------------------------------------+
|  Statistics:                                         |
|  [Matched: 40] [Unmatched: 5] [Exported: 35]         |
+------------------------------------------------------+
|                        [Cancel Export]               |
+------------------------------------------------------+
```

---

## Stage 3: After Exporting (Results View)

### 3.1 Results Report Components

#### Results Report (Existing)
- Uses `ResultsReport` component
- Summary cards with statistics
- Match status breakdown
- Export options

#### Results Features
- **Summary Cards:**
  - Total Tracks
  - Matched
  - Unmatched
  - Ambiguous
  - Exported
  - Failed

- **Action Buttons:**
  - Export Again (repeats export)
  - Back to Dashboard (returns to table view)

### 3.2 Results Layout

```
+------------------------------------------------------+
|  Export Complete: Playlist Name                      |
+------------------------------------------------------+
|  [==========] Total    [====] Matched   [==] Unmatched|
|  [==] Ambiguous [====] Exported  [=] Failed          |
+------------------------------------------------------+
|  Match Details (expandable sections)                 |
+------------------------------------------------------+
|                  [Export Again]  [Back to Dashboard] |
+------------------------------------------------------+
```

---

## Export Tracking & Sync Mechanism

### Overview

Export status is tracked using Navidrome's `comment` field on playlists. This enables cross-device sync and change detection.

### Comment Metadata Format

When a playlist is exported, store JSON metadata in Navidrome's `comment` field:

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
| **Not Exported** | No matching Navidrome playlist found | Gray `bg-zinc-100 text-zinc-600` |
| **Exported** | Navidrome playlist exists with matching `snapshotId` | Green `bg-green-100 text-green-700` |
| **Out of Sync** | Navidrome exists but `snapshotId` differs | Orange `bg-orange-100 text-orange-700` |

### Sync Detection

1. **On Dashboard Load:**
   - Fetch all Navidrome playlists
   - Parse `comment` field for metadata
   - Match with Spotify playlists by `spotifyPlaylistId`
   - Compare current Spotify `snapshot_id` with stored `snapshotId`

2. **Status Determination:**
   - No match found → `not-exported`
   - Match found + `snapshotId` matches → `exported`
   - Match found + `snapshotId` differs → `out-of-sync`

3. **Sync Actions:**
   - `out-of-sync` playlists show warning icon
   - Re-export updates existing Navidrome playlist (using `navidromePlaylistId`)
   - New exports create new Navidrome playlists

### Liked Songs Tracking

Liked Songs sync uses a special approach:

- **First Export:** Create Navidrome playlist named "Liked Songs" with metadata in comment
- **Subsequent Exports:** Compare saved tracks count with stored `trackCount`
- **Out of Sync:** Show status when count differs from stored value
- **Fallback:** If no matching playlist found, treat as not exported

### Data Model Updates

#### PlaylistTableItem (Updated)

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
```

#### ExportMetadata

```typescript
interface ExportMetadata {
  spotifyPlaylistId: string;
  navidromePlaylistId?: string;
  spotifySnapshotId: string;
  exportedAt: string;
  trackCount: number;
}
```

### Navidrome Client Updates

| Task | File | Description |
|------|------|-------------|
| Add `getPlaylistByComment` method | `lib/navidrome/client.ts` | Find playlists with matching Spotify ID |
| Add `updatePlaylistComment` method | `lib/navidrome/client.ts` | Update comment with new metadata |
| Add `findOrCreateLikedSongsPlaylist` method | `lib/navidrome/client.ts` | Special handling for Liked Songs |

### UI Updates for Sync

**Status Badge with Sync Indicator:**
```tsx
{exportStatus === 'out-of-sync' && (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
    Out of Sync
  </span>
)}
```

### Testing Requirements (Updated)

- [ ] Export creates Navidrome playlist with metadata in comment
- [ ] Dashboard loads and matches Navidrome playlists with Spotify playlists
- [ ] Export status shows correctly (none/exported/out-of-sync)
- [ ] Out of sync badge appears when snapshot IDs differ
- [ ] Re-export updates existing Navidrome playlist
- [ ] Liked Songs tracking works correctly
- [ ] Cross-device sync status loads correctly

### Phase 1: Core Table Structure

| Task | File | Description |
|------|------|-------------|
| Create `PlaylistTable` component | `components/Dashboard/PlaylistTable.tsx` | Main table with sticky header, Loved Songs row |
| Create `TableHeader` component | `components/Dashboard/TableHeader.tsx` | Sortable column headers |
| Create `TableRow` component | `components/Dashboard/TableRow.tsx` | Individual playlist row |
| Create `LovedSongsRow` component | `components/Dashboard/LovedSongsRow.tsx` | Fixed second row for Liked Songs |
| Update `Dashboard` component | `components/Dashboard/Dashboard.tsx` | Integrate table view |

### Phase 2: Sorting, Filtering, Search

| Task | File | Description |
|------|------|-------------|
| Implement sort logic | `PlaylistTable.tsx` | State for sort column/direction |
| Implement filter UI | `PlaylistTable.tsx` | Filter dropdowns and chips |
| Implement search | `PlaylistTable.tsx` | Debounced search input |
| Create hook for table state | `hooks/usePlaylistTable.ts` | Reusable table logic |

### Phase 3: Selection and Export Flow

| Task | File | Description |
|------|------|-------------|
| Implement selection | `Dashboard.tsx` | Multi-select with "Select All" (filtered playlists only) |
| Update export flow | `Dashboard.tsx` | Connect selection to export |
| Preserve selection state | `Dashboard.tsx` | Session persistence |
| Implement export tracking | `lib/navidrome/client.ts` | Add methods to read/update comment metadata |
| Implement sync detection | `Dashboard.tsx` | Match Navidrome playlists with Spotify playlists |

### Phase 4: Visual Polish

| Task | File | Description |
|------|------|-------------|
| Apply login page style | Global CSS | Consistent design language |
| Sticky header | `PlaylistTable.tsx` | CSS position: sticky |
| Loading states | `PlaylistTable.tsx` | Skeleton loaders |
| Empty states | `PlaylistTable.tsx` | No results found |
| Status badges | `TableRow.tsx` | Export status with out-of-sync indicator |

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `components/Dashboard/PlaylistTable.tsx` | Main table component |
| `components/Dashboard/TableHeader.tsx` | Sortable header cells |
| `components/Dashboard/TableRow.tsx` | Playlist row component |
| `components/Dashboard/LovedSongsRow.tsx` | Fixed second row for Liked Songs |
| `components/Dashboard/TableFilters.tsx` | Filter controls |
| `components/Dashboard/TableSearch.tsx` | Search input component |
| `hooks/usePlaylistTable.ts` | Custom hook for table state |
| `types/playlist-table.ts` | Table-specific types |
| `types/export.ts` | Export metadata types |

### Files to Modify

| File | Changes |
|------|---------|
| `components/Dashboard/Dashboard.tsx` | Replace grid with table, update export flow |
| `components/Dashboard/PlaylistCard.tsx` | May be deprecated or refactored |
| `app/globals.css` | Add table-specific styles if needed |

### Files to Remove (Optional)

| File | Reason |
|------|--------|
| `components/Dashboard/PlaylistCard.tsx` | Replaced by table rows |

---

## Data Model

### PlaylistTableItem

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
```

**Note:** The `Liked Songs` playlist is positioned as the first row in the playlist list (after the header row), displayed before other user playlists.

### ExportMetadata

```typescript
interface ExportMetadata {
  spotifyPlaylistId: string;
  navidromePlaylistId?: string;
  spotifySnapshotId: string;
  exportedAt: string;
  trackCount: number;
}
```

### TableState

```typescript
interface TableState {
  sortColumn: 'name' | 'tracks' | 'owner';
  sortDirection: 'asc' | 'desc';
  searchQuery: string;
  filters: {
    status: 'all' | 'selected' | 'not-selected' | 'exported' | 'not-exported';
    source: 'all' | 'liked-songs' | 'playlists';
  };
  selectedIds: Set<string>;
}
```

---

## Design Reference: Login Page Theme

### Key Style Elements

**From login page (`app/page.tsx`):**

```tsx
// Page background
<div className="min-h-screen bg-zinc-50 dark:bg-black">

// Card container
<div className="rounded-lg border border-zinc-200 bg-white shadow-sm 
         dark:border-zinc-800 dark:bg-zinc-900">

// Heading
<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">

// Body text
<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">

// Section border
<div className="border-b border-zinc-200 dark:border-zinc-800">

// Loading spinner
<div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
```

### Table-Specific Adaptations

The table inherits the login page visual language but adapts for data display:

```tsx
// Table wrapper (full width, not constrained like login card)
<div className="w-full max-w-6xl mx-auto">

// Sticky header with backdrop blur
<thead className="sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm z-10">

// Zebra striping - odd rows darker for visual separation
<tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
  <tr className="bg-white dark:bg-zinc-900">   {/* Even row */}
  <tr className="bg-zinc-50 dark:bg-zinc-800/50"> {/* Odd row */}

// Row hover
<tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">

// Selected row highlight
<tr className="bg-zinc-100 dark:bg-zinc-800 border-l-4 border-l-green-500">
```

---

## Export Status Badge Styles

### Status Colors (Consistent with Login Page Theme)

| Status | Badge Style |
|--------|-------------|
| None | `bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400` |
| Exported | `bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400` |
| Out of Sync | `bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400` |

---

## Testing Requirements

### Manual Testing Checklist

- [ ] Table renders with all playlists loaded at once
- [ ] Sticky header works on scroll
- [ ] Loved Songs row appears as second row (after header)
- [ ] Zebra striping visible between rows (odd rows darker)
- [ ] Sorting changes order and shows direction indicator
- [ ] Search filters results in real-time (debounced)
- [ ] Individual row selection works
- [ ] "Select All" selects only filtered/visible playlists
- [ ] Export button is disabled when no selection
- [ ] Status column is visible but not filterable
- [ ] Export creates Navidrome playlist with metadata in comment
- [ ] Dashboard loads and matches Navidrome playlists with Spotify playlists
- [ ] Export status shows correctly (none/exported/out-of-sync)
- [ ] Out of sync badge appears when snapshot IDs differ
- [ ] Re-export updates existing Navidrome playlist
- [ ] Liked Songs tracking works correctly
- [ ] Progress view shows during export
- [ ] Results view shows after export
- [ ] Back to Dashboard returns to table
- [ ] Dark mode renders correctly (login page style)
- [ ] Empty state shows when no playlists
- [ ] Loading spinner displays during data fetch

### Automated Tests (TBD)

- Unit tests for sorting/filtering logic
- Integration tests for selection state
- E2E tests for export workflow

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Table render time | < 100ms |
| Search debounce | 300ms |
| Sort response | < 50ms |
| Selection toggle | Instant |
| Export flow completion | 100% success rate |

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Core Structure | 1 day | Table component with all playlists |
| Phase 2: Sort/Filter/Search | 2 days | Full table functionality |
| Phase 3: Selection & Export | 1 day | Complete export flow |
| Phase 4: Polish & Testing | 1 day | Visual polish, testing |

**Total Estimated Time:** 5 days (reduced from 6 due to no pagination)

---

## Related Documentation

- Previous implementation: `docs/feature-F3-2-dashboard.md`
- Login page reference: `docs/feature-F3-1-login-page.md`
- TO-DO item: `docs/to-do.md` ("Update dashboard UI to a table")
- TrackList reference: `app/components/TrackList.tsx`
