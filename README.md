# NaviSpot

## Spotify to Navidrome Playlist Exporter

A Next.js web application that exports playlists from Spotify to Navidrome music server with flexible matching strategies. Transfer your Spotify playlists to your self-hosted Navidrome music library with intelligent track matching.

## What the project is trying to achieve

This project enables you to export your Spotify playlists to Navidrome, your self-hosted music server. It bridges the gap between streaming services and personal music libraries by:

- **Exporting Spotify playlists** → Navidrome (one-way sync)
- **Intelligent track matching** using multiple strategies
- **Batch operations** for multiple playlists
- **Flexible export options** (create new and append to existing)

## Features

- **Spotify Integration**: Connect to your Spotify account and browse your playlists
- **Navidrome Support**: Export matched tracks to your self-hosted Navidrome server
- **Multiple Matching Strategies**: ISRC matching, fuzzy matching, and strict title/artist matching
- **Progress Tracking**: Real-time progress updates during export operations
- **Export Preview**: Review matches before committing to export
- **Batch Export**: Select multiple playlists for bulk export

## How to use

1. **Login to Spotify and Navidrome**:
   - Click the "Connect Spotify" button to authenticate with your Spotify account
   - Enter your Navidrome server URL, username, and password

2. **Select Playlists**:
   - Browse your Spotify playlists in the dashboard
   - Check the boxes next to playlists you want to export
   - View playlist details in the table above: cover art, name, track count, owner, saves, and duration

3. **Start Exporting**:
   - Click the "Export Playlist(s)" button in the fixed footer
   - Review match statistics before confirming
   - Watch real-time progress during export
   - View final results with matched/unmatched track counts

## Track Matching Process

The application uses multiple strategies to match Spotify tracks with songs in your Navidrome library:

1. **ISRC Matching** (highest priority):
   - Uses International Standard Recording Code when available
   - Exact match based on unique identifier
   - Most accurate when ISRC is present in both Spotify and Navidrome

2. **Fuzzy Matching** (configurable threshold):
   - Uses Levenshtein distance for similarity scoring
   - Configurable threshold (default 0.8 = 80% similarity)
   - Handles minor differences in artist/title formatting

3. **Strict Matching** (fallback):
   - Exact string matching after normalization
   - Removes special characters and normalizes case
   - Matches when artist and title exactly match

**Fallback Chain**: The system tries ISRC → Fuzzy → Strict → Skip in order, stopping at the first successful match.

## Screenshots

### Login Page
![Login Page](public/login-page.png)

Connect to Spotify and enter Navidrome credentials.

### Main Dashboard View
![Dashboard](public/dashboard.png)

Complete dashboard interface showing all playlists and export controls.

### Dashboard with Playlist Selection
![Dashboard with Selected Playlists](public/dashboard-with-selected-playlists.png)

Browse Spotify playlists, select multiple playlists for export, and view playlist details.

### Dashboard Export Progress
![Dashboard Exporting Playlists](public/dashboard-exporting-playlists.png)

Real-time progress tracking during export with match statistics.

## Prerequisites

- Node.js 18.17 or later
- A Spotify Developer account (free)
- A running Navidrome instance (self-hosted)

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/navispot-plist.git
cd navispot-plist
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Configure environment variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Spotify Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up Spotify Developer Dashboard

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add `http://localhost:3000/api/auth/callback` to Redirect URIs
4. Copy your Client ID and Client Secret to `.env.local`

### 5. Run the development server

**Recommended**: Use bun for faster builds and better performance:

```bash
bun dev
```

Or with npm:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to deploy

**Building recommendation**: Use bun for faster builds and better performance. The project includes `bun.lock` for dependency management.
### Recommended: Deploy to a VPS with Docker

The project includes a production-ready `Dockerfile`. Build with bun for best performance:

```bash
# Deploy with docker compose
docker compose up -d
```

**Important deployment notes**:
- Copy `.env.example` to `.env.local` and populate all fields
- When deploying locally, you can use `http://127.0.0.1:3000/api/auth/callback` as the redirect URI
- For production, use your actual domain in the redirect URI

### Production Environment Variables

Update your environment variables for production:

```env
SPOTIFY_REDIRECT_URI=https://your-production-domain.com/api/auth/callback
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

Update your Spotify Developer Dashboard with the new production redirect URI.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: Spotify Web API, Navidrome API
- **Matching**: Custom matching algorithms (ISRC, fuzzy, strict)

## Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes for Spotify/Navidrome auth
│   └── page.tsx                  # Main application page
├── components/                   # React components
│   ├── Dashboard/                # Main dashboard with playlist table
│   ├── ExportPreview/            # Export confirmation dialog
│   ├── FavoritesExport/          # Favorites/saved tracks export
│   ├── ProgressTracker/          # Real-time progress display
│   ├── ResultsReport/            # Export results summary
│   └── ErrorBoundary/            # Global error handling
├── lib/                          # Core utilities and clients
│   ├── auth/                     # Authentication logic and context
│   ├── matching/                 # Track matching algorithms
│   ├── navidrome/                # Navidrome API client
│   ├── spotify/                  # Spotify API client
│   └── export/                   # Playlist export logic
├── types/                        # TypeScript type definitions
├── docs/                         # Feature documentation and plans
├── hooks/                        # Custom React hooks
├── public/                       # Static assets and screenshots
```

## Documentation

Detailed documentation is available in the `docs/` directory.

### Feature Documentation

| Phase | Feature | Description |
|-------|---------|-------------|
| **F1** | [Project Setup](docs/feature-F1-1-project-setup.md) | Initial project configuration and tooling |
| **F1** | [Spotify OAuth](docs/feature-F1-2-spotify-oauth.md) | Spotify authentication implementation |
| **F1** | [Spotify API Client](docs/feature-F1-3-spotify-api-client.md) | Spotify Web API integration |
| **F1** | [Navidrome API Client](docs/feature-F1-4-navidrome-api-client.md) | Navidrome Subsonic API integration |
| **F1** | [Search Functionality](docs/feature-F1-5-search.md) | Search utilities for both APIs |
| **F1** | [Auth Context](docs/feature-F1-6-auth-context.md) | Global authentication state management |
| **F2** | [ISRC Matching](docs/feature-F2-1-isrc.md) | ISRC-based track matching algorithm |
| **F2** | [Fuzzy Matching](docs/feature-F2-2-fuzzy-matching.md) | Fuzzy string matching algorithm |
| **F2** | [Strict Matching](docs/feature-F2-3-strict-matching.md) | Exact string matching algorithm |
| **F2** | [Matching Orchestrator](docs/feature-F2-4-matching-orchestrator.md) | Multi-strategy matching coordination |
| **F2** | [Playlist Fetching](docs/feature-F2-5-playlist-fetching.md) | Spotify playlist retrieval |
| **F2** | [Track Fetcher](docs/feature-F2-6-track-fetcher.md) | Track data retrieval with pagination |
| **F2** | [Batch Matcher](docs/feature-F2-7-batch-matcher.md) | Bulk track matching operations |
| **F2** | [Playlist Exporter](docs/feature-F2-8-playlist-exporter.md) | Navidrome playlist creation/update |
| **F2** | [Saved Tracks](docs/feature-F2-9-saved-tracks.md) | Spotify saved tracks integration |
| **F2** | [Favorites Export](docs/feature-F2-10-favorites-export.md) | Navidrome favorites synchronization |
| **F3** | [Login Page](docs/feature-F3-1-login-page.md) | Authentication interface |
| **F3** | [Spotify Connect Button](docs/feature-F3-1-spotify-button.md) | Spotify OAuth trigger component |
| **F3** | [Navidrome Form](docs/feature-F3-1-navidrome-form.md) | Navidrome credentials input |
| **F3** | [Dashboard](docs/feature-F3-2-dashboard.md) | Main playlist view and revamp details |
| **F3** | [Playlist Detail View](docs/feature-F3-3-playlist-detail-view.md) | Track-by-track breakdown |
| **F3** | [Match Status Indicators](docs/feature-F3-4-match-status-indicators.md) | Visual match feedback |
| **F3** | [Export Preview](docs/feature-F3-5-export-preview.md) | Pre-export confirmation |
| **F3** | [Progress Tracker](docs/feature-F3-6-progress-tracker.md) | Real-time export monitoring |
| **F3** | [Results Report](docs/feature-F3-7-results-report.md) | Export summary and statistics |

### Additional Resources

- [Export Views Visual Summary](docs/F3-2-export-views-visual-summary.md) - Visual guide for export workflows

## License

MIT License - Open Source

Copyright (c) 2025 NaviSpot

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
