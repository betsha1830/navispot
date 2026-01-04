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

## License

MIT
