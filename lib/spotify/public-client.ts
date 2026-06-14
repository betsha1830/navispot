import https from 'node:https';
import type { SpotifyTrack } from '@/types/spotify';
import type { ImportedPlaylist } from '@/types/public-playlist';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_BASE = 'https://accounts.spotify.com/api/token';
const REQUEST_TIMEOUT_MS = 15_000;

let cachedToken: { value: string; expiresAt: number } | null = null;

interface HttpResponse<T> {
  status: number;
  body: T;
  rawText: string;
}

function httpsRequest<T = unknown>(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        family: 4,
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let rawText = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          rawText += chunk;
        });
        res.on('end', () => {
          let body: T;
          try {
            body = rawText ? (JSON.parse(rawText) as T) : ({} as T);
          } catch {
            body = rawText as unknown as T;
          }
          resolve({ status: res.statusCode || 0, body, rawText });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(
        new Error(`Request to ${parsed.hostname} timed out after ${REQUEST_TIMEOUT_MS}ms`),
      );
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getClientCredentialsToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials are not configured');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = 'grant_type=client_credentials';
  const res = await httpsRequest<{ access_token: string; expires_in: number }>(
    SPOTIFY_AUTH_BASE,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body).toString(),
      },
      body,
    },
  );

  if (res.status !== 200) {
    throw new Error(
      `Spotify token request failed (${res.status}): ${res.rawText.slice(0, 200)}`,
    );
  }

  cachedToken = {
    value: res.body.access_token,
    expiresAt: now + res.body.expires_in * 1000,
  };
  return res.body.access_token;
}

export function extractPlaylistId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/playlist\/([A-Za-z0-9]{22})/);
  if (match) return match[1];
  if (/^[A-Za-z0-9]{22}$/.test(trimmed)) return trimmed;
  return null;
}

async function spotifyGet<T>(token: string, path: string): Promise<T> {
  const res = await httpsRequest<T>(`${SPOTIFY_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status !== 200) {
    const err = new Error(
      `Spotify ${res.status}: ${res.rawText.slice(0, 200)}`,
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.body;
}

interface PlaylistMeta {
  id: string;
  name: string;
  owner: { display_name: string };
  images: { url: string }[];
  tracks: { total: number };
}

interface PlaylistTracksPage {
  items: Array<{ track: SpotifyTrack | null; is_local?: boolean }>;
  next: string | null;
}

export async function getPublicPlaylist(
  playlistId: string,
): Promise<ImportedPlaylist> {
  const token = await getClientCredentialsToken();

  const meta = await spotifyGet<PlaylistMeta>(
    token,
    `/playlists/${playlistId}?fields=id,name,owner(display_name),images,tracks(total)`,
  );

  const tracks: SpotifyTrack[] = [];
  let nextPath: string | null =
    `/playlists/${playlistId}/tracks?fields=items(track(id,name,artists(id,name),album(id,name,release_date),duration_ms,external_ids,external_urls),is_local,added_at),next&limit=100`;
  while (nextPath) {
    const page: PlaylistTracksPage = await spotifyGet<PlaylistTracksPage>(token, nextPath);
    for (const item of page.items) {
      if (item.is_local) continue;
      if (item.track) tracks.push(item.track);
    }
    nextPath = page.next;
  }

  return {
    id: meta.id,
    name: meta.name,
    owner: meta.owner.display_name,
    trackCount: tracks.length,
    imageUrl: meta.images?.[0]?.url,
    tracks,
    importedAt: new Date().toISOString(),
  };
}
