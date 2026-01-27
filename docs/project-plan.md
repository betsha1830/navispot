# NaviSpot-Plist: Spotify to Navidrome Playlist Exporter

## Project Overview

A Next.js web application that exports playlists from Spotify to Navidrome music server with flexible matching strategies.

## Architecture

- **Frontend**: Next.js 16 (React 19) + Tailwind CSS
- **Backend**: Next.js API Routes
- **Authentication**: Spotify OAuth 2.0 + Navidrome Basic Auth
- **State Management**: React Context + localStorage

## Authentication

### Spotify OAuth 2.0
- Flow: Authorization Code with PKCE (recommended for client-side) or standard flow
- Scopes: `playlist-read-private`, `playlist-read-collaborative`
- Token storage: In-memory + localStorage (encrypted)
- Refresh token handling: Automatic refresh before expiry

### Navidrome Authentication
- Method: Subsonic API Basic Auth
- Credentials: Username + Password stored in localStorage
- No server-side credential storage

## Features

### 1. Playlist Export
- One-way sync: Spotify → Navidrome
- Export modes:
  - Append to existing playlist
  - Create new playlist
  - Overwrite existing playlist

### 2. Track Matching Strategies
- **Strict Matching**: Exact match on artist + title
- **Fuzzy Matching**: Levenshtein distance with configurable threshold (0.0-1.0)
- **ISRC Matching**: Use International Standard Recording Code when available
- **Manual Review**: User selects from multiple candidates
- **Fallback Chain**: Try ISRC → Fuzzy → Strict → Skip

### 3. Batch Operations
- Export all playlists at once
- Select individual playlists
- Filter by playlist name/date

## API Design

### Spotify API Routes
```
GET  /api/auth/spotify          - Initiate OAuth flow
DELETE /api/auth/spotify        - Clear Spotify auth cookies (logout)
GET  /api/auth/callback         - Handle OAuth callback
GET  /api/spotify/playlists     - List user playlists
GET  /api/spotify/playlists/:id - Get playlist details
GET  /api/spotify/tracks/:id    - Get playlist tracks (paginated)
```

### Navidrome API Routes
```
POST /api/navidrome/auth        - Test/store credentials
GET  /api/navidrome/playlists   - List existing playlists
POST /api/navidrome/search      - Search songs
POST /api/navidrome/playlist    - Create new playlist
PUT  /api/navidrome/playlist    - Update playlist (add tracks)
DELETE /api/navidrome/playlist  - Delete playlist
```

## Data Models

### Spotify Track
```typescript
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string; release_date: string };
  duration_ms: number;
  external_ids: { isrc?: string };
  external_urls: { spotify: string };
}
```

### Spotify Playlist
```typescript
interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  owner: { id: string; display_name: string };
  tracks: { total: number };
  snapshot_id: string;
}
```

### Navidrome Song
```typescript
interface NavidromeSong {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  isrc?: string;
}
```

### Navidrome Playlist
```typescript
interface NavidromePlaylist {
  id: string;
  name: string;
  comment?: string;
  songCount: number;
  duration: number;
  createdAt: string;
  updatedAt: string;
}
```

### Track Match Result
```typescript
interface TrackMatch {
  spotifyTrack: SpotifyTrack;
  navidromeSong?: NavidromeSong;
  matchScore: number;
  matchStrategy: 'isrc' | 'fuzzy' | 'strict' | 'none';
  status: 'matched' | 'ambiguous' | 'unmatched';
  candidates?: NavidromeSong[];
}
```

## Matching Algorithm

### ISRC Matching
1. Extract ISRC from Spotify `external_ids`
2. Search Navidrome for songs with matching ISRC
3. Return exact match if found

### Fuzzy Matching
1. Create search query: `${artist} ${title}`
2. Search Navidrome using `search3` endpoint
3. Calculate similarity score for each result
4. Apply threshold (default 0.8)
5. If multiple results above threshold → ambiguous

### Strict Matching
1. Normalize strings (lowercase, remove special chars)
2. Exact match on artist + title
3. Return single match or none

### Priority Order
1. ISRC (highest priority - most accurate)
2. Fuzzy matching (configurable threshold)
3. Strict matching (fallback)
4. Skip unmatched tracks

## Export Process

### Step-by-Step Flow
1. User authenticates with Spotify
2. User enters Navidrome credentials (stored in localStorage)
3. Fetch Spotify playlists
4. For each selected playlist:
   a. Fetch all tracks (handle pagination)
   b. For each track:
      - Try matching strategies in order
      - Record match status
   c. Show preview with match results
   d. User confirms export options
   e. Create/update Navidrome playlist
   f. Add matched song IDs
5. Show final report (success/fail counts)

### Error Handling
- Spotify token expired → refresh automatically
- Navidrome auth failed → prompt for credentials again
- Network errors → retry with exponential backoff
- Rate limiting → implement delays between requests
- Large playlists → process in batches of 100 tracks

## UI Components

### Pages
1. **Login Page**: Spotify Connect button + Navidrome credentials form
2. **Dashboard**: List Spotify playlists with export status
3. **Playlist Detail**: Track list with match status indicators
4. **Export Progress**: Real-time progress with cancel option
5. **Results Report**: Summary of successful/failed matches

### Key Components
- `PlaylistCard`: Display playlist with track count, image
- `TrackList`: Table of tracks with match status
- `MatchIndicator`: Color-coded match status (green/yellow/red)
- `CandidateSelector`: Modal for manual match selection
- `MatchSettings`: Configure matching strategies and thresholds
- `ExportControls`: Export options and progress display

## Environment Variables

```env
# Spotify (required)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Navidrome (configured via UI, stored in localStorage)
# NAVIDROME_URL
# NAVIDROME_USERNAME
# NAVIDROME_PASSWORD

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Dashboard UI Specification

### Playlist Data Table

| Column | Description |
|--------|-------------|
| ☐ | Checkbox for multi-select |
| Cover Art | Thumbnail (50×50px) |
| Playlist Name | Title of playlist |
| Number of Tracks | Total track count |
| Owner Name | Creator username |
| Saves | Follower/like count from Spotify |
| Duration | Total duration (e.g., "1h 23m") |

#### Visual Representation

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  PLAYLIST DATA TABLE                                                                │
├────────────────────────────────────────────────────────────────────────────────────┤
│  ☐    │  <img>  │  Playlist Name        │  # Tracks │  Owner Name    │  Saves    │  Duration  │
├───────┼─────────┼───────────────────────┼───────────┼────────────────┼───────────┼────────────┤
│  ☑    │  <img>  │  Synthwave Mix 2024   │    142    │  DJ Neon       │  2,431    │  2h 15m    │
├───────┼─────────┼───────────────────────┼───────────┼────────────────┼───────────┼────────────┤
│  ☑    │  <img>  │  Morning Coffee       │     87    │  sarah_music   │  15.8k    │  45m       │
├───────┼─────────┼───────────────────────┼───────────┼────────────────┼───────────┼────────────┤
│  ☐    │  <img>  │  Rock Classics Vol.5  │    203    │  metalhead99   │  8,762    │  3h 42m    │
├───────┼─────────┼───────────────────────┼───────────┼────────────────┼───────────┼────────────┤
│  ☐    │  <img>  │  Lo-Fi Study Beats    │     56    │  chill_guy     │  45.2k    │  1h 30m    │
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                    │
│  number of playlists to be exported: 2           [ EXPORT PLAYLIST(S) ]            │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
                              ↑ Fixed Footer (position: fixed, bottom: 0)
```

#### Column Layout (7 columns)

| # | Column | Content | Example |
|---|--------|---------|---------|
| 1 | Checkbox | Selection state (☐/☑) | ☑ |
| 2 | Cover Art | Thumbnail image (50×50px) | playlist-cover.jpg |
| 3 | Playlist Name | Title of playlist | Synthwave Mix 2024 |
| 4 | Number of Tracks | Total track count | 142 |
| 5 | Owner Name | Creator username | DJ Neon |
| 6 | Saves | Follower/like count | 2,431 |
| 7 | Duration | Total duration | 2h 15m |

### Fixed Footer (Position: Fixed)

| Position | Content |
|----------|---------|
| Left | `number of playlists to be exported: {n}` |
| Right | `[export playlist(s)]` CTA button |

- Fixed at bottom of viewport (position: fixed; bottom: 0)
- Button disabled when n=0
- No Select All checkbox (individual selection only)
- No filters or search in footer

### Export State Transition

When export begins, the Playlist Data Table transforms to show real-time progress:

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  PLAYLIST DATA TABLE (Export Mode)                                                 │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  Now Exporting: Synthwave Mix 2024                                                │
│  [█████████████████████████████....] 73%                                           │
│                                                                                    │
│  Matched: 138  │  Unmatched: 4  │  Total: 142                                     │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

| Element | Description |
|---------|-------------|
| Header | Shows current playlist being exported |
| Progress Bar | Visual progress with percentage indicator |
| Matched | Count of successfully matched tracks |
| Unmatched | Count of tracks with no match |
| Total | Total tracks in current playlist |

#### Export State Elements

| State | Element | Description |
|-------|---------|-------------|
| Pre-Export | Checkbox | Select/deselect playlist for export |
| Pre-Export | Playlist Name | Display name of playlist |
| Pre-Export | Track metadata | Owner, saves, duration, track count |
| During Export | Now Exporting | Current playlist name |
| During Export | Progress Bar | Visual progress (matched/total ratio) |
| During Export | Matched | Count of matched tracks |
| During Export | Unmatched | Count of unmatched tracks |
| During Export | Total | Total tracks to export |

### Interactions

| Action | Result |
|--------|--------|
| Click playlist checkbox | Adds/removes from selection, updates cover grid and track tables |
| Click cover art | Right panel scrolls to corresponding track table |
| Click table row | Right panel scrolls to corresponding track table |
| Click Export button | Opens export preview modal |

### Design Decisions

1. **No text overlay** on cover art (images only)
2. **No Select All checkbox** (individual selection)
3. **No filters/search** in footer (minimal design)
4. **Scroll-based navigation** (no zoom/scale animations)
5. **No placeholder images** in empty grid cells

---

## Security Considerations

- Spotify tokens: Encrypt before storing in localStorage
- Navidrome credentials: Simple base64 encoding (Subsonic requirement)
- HTTPS required in production
- No server-side credential storage
- CSRF protection on API routes

## Future Enhancements (Post-MVP)

- Bidirectional sync (Navidrome → Spotify)
- Sync scheduling (automatic periodic export)
- Webhook integration for real-time updates
- Multiple Navidrome server support
- Playlist templates and presets
- Advanced filtering and rules
- Export history and versioning
- Rate limit visualization
- Dark/light theme

## Development Phases

### Phase 1: Foundation
- Project setup and configuration
- Spotify OAuth implementation
- Navidrome API client

### Phase 2: Core Features
- Playlist fetching (Spotify)
- Track matching algorithms
- Basic export functionality

### Phase 3: UI/UX
- Dashboard and playlist views
- Match status visualization
- Progress tracking

### Phase 4: Polish
- Error handling and retries
- Match settings UI
- Export options
- Results reporting

---

## Features Breakdown by Phase

### Phase 1: Foundation
*Goal: Set up infrastructure and authentication*

| Feature | Sub-tasks | Dependencies |
|---------|-----------|--------------|
| **F1.1 Project Setup** | - Configure TypeScript, ESLint, Tailwind<br>- Create folder structure<br>- Set up environment variables template | None |
| **F1.2 Spotify OAuth Client** | - Implement authorization URL generation<br>- Handle callback and token exchange<br>- Token refresh logic<br>- Store encrypted tokens in localStorage | F1.1 |
| **F1.3 Spotify API Client** | - GET `/v1/me/playlists` endpoint wrapper<br>- GET `/v1/playlists/{id}/tracks` with pagination<br>- Rate limiting utilities | F1.2 |
| **F1.4 Navidrome API Client** | - Basic Auth header generation<br>- Subsonic `ping` endpoint test<br>- `getPlaylists` wrapper<br>- `createPlaylist` / `updatePlaylist` wrappers | F1.1 |
| **F1.5 Search Functionality** | - Implement `search3` endpoint wrapper<br>- Song search utility function | F1.4 |
| **F1.6 Auth Context** | - Create AuthContext for global state<br>- Persist Spotify tokens to localStorage<br>- Persist Navidrome credentials to localStorage<br>- Provide auth status and methods to components | F1.2, F1.4 |

### Phase 2: Core Features
*Goal: Implement matching algorithms and export logic*

| Feature | Sub-tasks | Dependencies |
|---------|-----------|--------------|
| **F2.1 Track Matching - ISRC** | - Extract ISRC from Spotify track<br>- Search Navidrome by ISRC<br>- Return match or null | F1.5 |
| **F2.2 Track Matching - Fuzzy** | - Implement string normalization<br>- Calculate Levenshtein distance<br>- Implement similarity scoring (0-1)<br>- Apply configurable threshold | F1.5 |
| **F2.3 Track Matching - Strict** | - Normalize artist and title strings<br>- Exact match comparison<br>- Return single match or none | F1.5 |
| **F2.4 Matching Orchestrator** | - Chain matching strategies (ISRC → Fuzzy → Strict)<br>- Track which strategy succeeded<br>- Collect ambiguous matches for review | F2.1, F2.2, F2.3 |
| **F2.5 Playlist Fetching** | - Fetch all user playlists from Spotify<br>- Calculate total tracks per playlist<br>- Handle pagination for large playlists | F1.3 |
| **F2.6 Track Fetcher** | - Fetch all tracks for a playlist<br>- Handle Spotify pagination (100 tracks/page)<br>- Store track data structure | F1.3 |
| **F2.7 Batch Matcher** | - Process all tracks in playlist<br>- Show progress during matching<br>- Collect match results with statistics | F2.4, F2.6 |
| **F2.8 Playlist Exporter** | - Create new playlist in Navidrome<br>- Add matched tracks via `updatePlaylist`<br>- Handle partial failures gracefully | F1.4, F2.7 |

### Phase 3: UI/UX
*Goal: Build user interface for authentication and export*

| Feature | Sub-tasks | Dependencies |
|---------|-----------|--------------|
| **F3.1 Login Page** | - Spotify "Connect" button<br>- Navidrome credentials form<br>- Connection status indicators | F1.6 |
| **F3.2 Dashboard** | - Grid/list of Spotify playlists<br>- Playlist thumbnails and metadata<br>- Export status badges<br>- Select multiple playlists for bulk export | F2.5 |
| **F3.3 Playlist Detail View** | - Track list with columns (title, artist, album)<br>- Match status column (color-coded)<br>- Matched/unmatched counts summary | F2.7 |
| **F3.4 Match Status Indicators** | - Green: matched (with match type)<br>- Yellow: ambiguous (show candidate count)<br>- Red: unmatched<br>- Tooltip with match details | F2.7 |
| **F3.5 Export Preview** | - Show export options (create/append/overwrite)<br>- Preview of matched vs unmatched count<br>- Confirm dialog with statistics | F2.8 |
| **F3.6 Progress Tracker** | - Real-time progress bar<br>- Current track being processed<br>- Success/fail counters<br>- Cancel export button | F2.7, F2.8 |
| **F3.7 Results Report** | - Summary cards (total, matched, unmatched)<br>- List of unmatched tracks<br>- Export log download option<br>- "Export again" quick action | F2.8 |

### Phase 4: Polish
*Goal: Error handling, settings, and refinements*

| Feature | Sub-tasks | Dependencies |
|---------|-----------|--------------|
| **F4.1 Error Boundary** | - Global error boundary component<br>- Graceful error display<br>- Retry actions for transient errors | F3.1 |
| **F4.2 Retry Logic** | - Implement exponential backoff<br>- Auto-retry failed API calls<br>- Manual retry for user-initiated actions | F1.3, F1.4 |
| **F4.3 Rate Limiter** | - Queue API requests<br>- Delay between requests<br>- Progress indicator during rate limit wait | F1.3, F1.4 |
| **F4.4 Match Settings Panel** | - Toggle strategies on/off<br>- Fuzzy threshold slider (0.5-1.0)<br>- Preferred strategy order<br>- Save settings to localStorage | F2.4 |
| **F4.5 Export Options UI** | - Radio buttons for mode (create/append/overwrite)<br>- "Skip unmatched" toggle<br>- "Keep existing matches" toggle<br>- Save as default preferences | F3.5 |
| **F4.6 Ambiguous Match Resolver** | - Modal showing all candidates<br>- Candidate preview (play snippet?)<br>- Select best match or skip<br>- "Remember choice" checkbox | F2.4, F3.4 |
| **F4.7 Toast Notifications** | - Success notifications<br>- Error notifications<br>- Info notifications (e.g., "3 tracks matched via ISRC")<br>- Notification queue with dismissal | All Phase 3 |
| **F4.8 Loading States** | - Skeleton loaders for playlist grid<br>- Spinners for API calls<br>- Progress bars for long operations<br>- Disable interactions during loading | All Phase 3 |
| **F4.9 Accessibility** | - Keyboard navigation<br>- ARIA labels for status indicators<br>- Focus management in modals<br>- Screen reader support | All Phase 3 |
| **F4.10 Responsive Design** | - Mobile-friendly playlist grid<br>- Collapsible track list on small screens<br>- Touch-friendly buttons | All Phase 3 |

---

## Feature Dependency Graph

```
Phase 1 (Foundation)
├── F1.1 Project Setup
├── F1.2 Spotify OAuth Client
│   └── F1.3 Spotify API Client
│       └── F2.5 Playlist Fetching
│           └── F3.2 Dashboard
├── F1.4 Navidrome API Client
│   ├── F1.5 Search Functionality
│   │   ├── F2.1 ISRC Matching
│   │   ├── F2.2 Fuzzy Matching
│   │   └── F2.3 Strict Matching
│   └── F2.4 Matching Orchestrator
└── F1.6 Auth Context
    └── F3.1 Login Page

Phase 2 (Core)
├── F2.1 ISRC Matching
├── F2.2 Fuzzy Matching
├── F2.3 Strict Matching
├── F2.4 Matching Orchestrator
│   └── F2.7 Batch Matcher
│       ├── F3.3 Playlist Detail View
│       └── F3.4 Match Status Indicators
├── F2.5 Playlist Fetching
│   └── F3.2 Dashboard
├── F2.6 Track Fetcher
├── F2.7 Batch Matcher
│   └── F2.8 Playlist Exporter
│       ├── F3.5 Export Preview
│       ├── F3.6 Progress Tracker
│       └── F3.7 Results Report

Phase 3 (UI/UX)
├── F3.1 Login Page
├── F3.2 Dashboard
├── F3.3 Playlist Detail View
├── F3.4 Match Status Indicators
├── F3.5 Export Preview
├── F3.6 Progress Tracker
└── F3.7 Results Report

Phase 4 (Polish)
├── F4.1 Error Boundary
├── F4.2 Retry Logic
├── F4.3 Rate Limiter
├── F4.4 Match Settings Panel
├── F4.5 Export Options UI
├── F4.6 Ambiguous Match Resolver
├── F4.7 Toast Notifications
├── F4.8 Loading States
├── F4.9 Accessibility
└── F4.10 Responsive Design
```

---

## Estimated Effort

| Phase | Features | Complexity |
|-------|----------|------------|
| Phase 1 | 6 features | Medium |
| Phase 2 | 8 features | High (matching algorithms) |
| Phase 3 | 7 features | Medium |
| Phase 4 | 10 features | Low-Medium |

---

## Recommended Implementation Order

1. **Start with Phase 1 + Phase 2** (core functionality)
   - API clients and matching algorithms form the foundation
   - Can test via Postman/curl before UI exists

2. **Then Phase 3** (UI layer)
   - Build interfaces to exercise the core logic
   - Create user-facing workflow

3. **Finally Phase 4** (Polish)
   - Refine UX and handle edge cases
   - Accessibility and responsiveness

## Testing Strategy

- Unit tests for matching algorithms
- Integration tests for API routes
- E2E tests for export flow
- Manual testing with real Spotify/Navidrome instances

## Deployment Options

- Vercel (frontend-heavy, API routes)
- Docker container
- Standalone Node.js server
- Same host as Navidrome

## References

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Navidrome Subsonic API](https://navidrome.org/docs/developers/subsonic-api/)
- [Subsonic API Reference](http://www.subsonic.org/pages/api.jsp)
- [OpenSubsonic Extensions](https://opensubsonic.netlify.app/)
