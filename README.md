# NaviSpot-Plist

A web application that exports Spotify playlists to Navidrome, your self-hosted music server. Match and transfer your favorite Spotify playlists to your personal music collection with intelligent track matching.

## Features

- **Spotify Integration**: Connect to your Spotify account and browse your playlists
- **Navidrome Support**: Export matched tracks to your self-hosted Navidrome server
- **Multiple Matching Strategies**: ISRC matching, fuzzy matching, and strict title/artist matching
- **Progress Tracking**: Real-time progress updates during export operations
- **Export Preview**: Review matches before committing to export

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

# Navidrome Configuration (optional - can configure via UI)
# NAVIDROME_URL=http://localhost:4533
# NAVIDROME_USERNAME=
# NAVIDROME_PASSWORD=
```

### 4. Set up Spotify Developer Dashboard

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add `http://localhost:3000/api/auth/callback` to Redirect URIs
4. Copy your Client ID and Client Secret to `.env.local`

### 5. Run the development server

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Option 1: Deploy to Vercel (Recommended)

1. Push your code to a GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project" and select your repository
4. Add environment variables in the Vercel project settings:
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REDIRECT_URI` (e.g., `https://your-domain.com/api/auth/callback`)
   - `NEXT_PUBLIC_APP_URL` (e.g., `https://your-domain.com`)
5. Click "Deploy"

### Option 2: Deploy to Railway

1. Create a [Railway](https://railway.app) account
2. Connect your GitHub repository
3. Add environment variables in the Railway dashboard
4. Deploy

### Option 3: Deploy to a VPS with Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t navispot-plist .
docker run -p 3000:3000 --env-file .env.local navispot-plist
```

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
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   └── page.tsx           # Main page
├── components/            # React components
├── lib/                   # Core utilities and clients
│   ├── auth/             # Authentication logic
│   ├── matching/         # Track matching algorithms
│   ├── navidrome/        # Navidrome API client
│   └── spotify/          # Spotify API client
├── types/                 # TypeScript type definitions
└── docs/                  # Feature documentation
```

## Documentation

Detailed documentation is available in the `docs/` directory:

- [Project Plan](docs/project-plan.md) - Complete architecture, feature breakdown, and implementation roadmap
- [To-Do List](docs/to-do.md) - Current and planned improvements

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

MIT
