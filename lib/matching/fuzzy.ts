export interface FuzzyMatchOptions {
  threshold?: number;
  songCount?: number;
}

export interface FuzzyMatchResult {
  song: import('@/types/navidrome').NavidromeSong;
  score: number;
  details?: {
    durationDiff: number;
    albumSimilarity: number;
  };
}

export interface FuzzyMatchCandidateResult {
  matches: FuzzyMatchResult[];
  hasAmbiguous: boolean;
  bestMatch?: FuzzyMatchResult;
}

export function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  if (normalized1 === normalized2) return 1.0;

  const maxLength = Math.max(normalized1.length, normalized2.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(normalized1, normalized2);
  return 1.0 - distance / maxLength;
}

export function calculateArtistSimilarity(
  spotifyArtist: string,
  navidromeArtist: string
): number {
  const normalizedSpotify = normalizeArtistName(spotifyArtist);
  const normalizedNavidrome = normalizeArtistName(navidromeArtist);

  if (normalizedSpotify === normalizedNavidrome) return 1.0;

  const maxLength = Math.max(normalizedSpotify.length, normalizedNavidrome.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(normalizedSpotify, normalizedNavidrome);
  return 1.0 - distance / maxLength;
}

const DURATION_THRESHOLD_MS = 3000;

export function calculateDurationSimilarity(
  spotifyDurationMs: number,
  navidromeDurationSeconds: number
): number {
  const navidromeDurationMs = navidromeDurationSeconds * 1000;
  const diff = Math.abs(spotifyDurationMs - navidromeDurationMs);

  if (diff < DURATION_THRESHOLD_MS) {
    const similarity = 1.0 - (diff / DURATION_THRESHOLD_MS);
    return Math.max(similarity, 0.9);
  }

  const penalty = Math.min(diff / 60000, 1);
  return 1.0 - penalty;
}

const SOUNDTRACK_WORDS = [
  'original', 'sound', 'track', 'ost', ' soundtrack', 'score',
  'complete', 'vol', 'volume', ' disc ', 'disk'
];

const LIVE_INDICATORS = [
  ' (live)',
  '- live',
  ' [live]',
  ' live',
  '(live)',
  '-live',
  '[live]',
  'live'
];

const COLLABORATION_INDICATORS = [
  'feat', 'feat.', 'ft', 'ft.',
  'with', ' x ', ' X ',
  ' and ', ' & ',
  ' vs ', ' versus ',
  ' presents ', ' presenting ',
  ' pres. ', ' pres ',
  ' prod ', ' produced by ',
  'DJ '
];

const TITLE_SUFFIX_PATTERN = /[\(\[].*?[\)\]]\s*$|[-–—~/].*$/;

export function stripTitleSuffix(title: string): string {
  return title.replace(TITLE_SUFFIX_PATTERN, '').trim();
}

export function normalizeAlbumName(album: string): string {
  let normalized = album.toLowerCase();
  for (const word of SOUNDTRACK_WORDS) {
    normalized = normalized.replace(new RegExp(word, 'gi'), ' ');
  }
  normalized = normalizeString(normalized);
  return normalized.replace(/\s+/g, ' ').trim();
}

export function normalizeTitle(title: string): string {
  let normalized = title.toLowerCase();
  for (const indicator of LIVE_INDICATORS) {
    normalized = normalized.replace(new RegExp(indicator.replace(/[()]/g, '\\$&'), 'gi'), ' ');
  }
  normalized = normalizeString(normalized);
  return normalized.replace(/\s+/g, ' ').trim();
}

export function normalizeArtistName(artist: string): string {
  let normalized = artist.toLowerCase();
  for (const indicator of COLLABORATION_INDICATORS) {
    normalized = normalized.replace(new RegExp(indicator.replace(/[()]/g, '\\$&'), 'gi'), ' ');
  }
  normalized = normalizeString(normalized);
  return normalized.replace(/\s+/g, ' ').trim();
}

export function calculateAlbumSimilarity(
  spotifyAlbum: string,
  navidromeAlbum: string
): number {
  const normalizedSpotify = normalizeAlbumName(spotifyAlbum);
  const normalizedNavidrome = normalizeAlbumName(navidromeAlbum);

  if (normalizedSpotify === normalizedNavidrome) return 1.0;

  const spotifyParts = normalizedSpotify.split(' ').filter(p => p.length > 0);
  const navidromeParts = normalizedNavidrome.split(' ').filter(p => p.length > 0);

  if (spotifyParts.length === 0 || navidromeParts.length === 0) return 0;

  const matchingParts = spotifyParts.filter(part =>
    navidromeParts.some(nPart => nPart.includes(part) || part.includes(nPart))
  );

  const similarity = matchingParts.length / Math.max(spotifyParts.length, navidromeParts.length);
  return similarity * 0.8;
}

export function calculateTitleSimilarity(
  spotifyTitle: string,
  navidromeTitle: string
): number {
  const normalizedSpotify = normalizeTitle(spotifyTitle);
  const normalizedNavidrome = normalizeTitle(navidromeTitle);

  if (normalizedSpotify === normalizedNavidrome) {
    return 1.0;
  }

  const maxLength = Math.max(normalizedSpotify.length, normalizedNavidrome.length);
  if (maxLength === 0) return 1.0;

  const distance = levenshteinDistance(normalizedSpotify, normalizedNavidrome);
  return 1.0 - distance / maxLength;
}

export function calculateTrackSimilarity(
  spotifyTrack: import('@/types/spotify').SpotifyTrack,
  navidromeSong: import('@/types/navidrome').NavidromeSong
): number {
  const artistSimilarity = calculateArtistSimilarity(
    spotifyTrack.artists.map((a) => a.name).join(' '),
    navidromeSong.artist
  );

  const titleSimilarity = calculateTitleSimilarity(
    spotifyTrack.name,
    navidromeSong.title
  );

  const durationSimilarity = calculateDurationSimilarity(
    spotifyTrack.duration_ms,
    navidromeSong.duration
  );

  const albumSimilarity = calculateAlbumSimilarity(
    spotifyTrack.album.name,
    navidromeSong.album
  );

  let baseSimilarity = artistSimilarity * 0.25 + titleSimilarity * 0.35 + durationSimilarity * 0.25 + albumSimilarity * 0.15;

  if (titleSimilarity === 1.0) {
    if (artistSimilarity >= 0.3) {
      return Math.max(artistSimilarity * 0.2 + titleSimilarity * 0.4 + durationSimilarity * 0.3 + albumSimilarity * 0.1, 0.85);
    }
    return Math.max(artistSimilarity * 0.15 + titleSimilarity * 0.45 + durationSimilarity * 0.3 + albumSimilarity * 0.1, 0.75);
  }

  if (durationSimilarity >= 0.9) {
    baseSimilarity = Math.min(baseSimilarity + 0.1, 0.95);
  }

  if (albumSimilarity >= 0.8 && (titleSimilarity >= 0.6 || artistSimilarity >= 0.4)) {
    baseSimilarity = Math.min(baseSimilarity + 0.05, 0.95);
  }

  return baseSimilarity;
}

export function findBestMatch(
  spotifyTrack: import('@/types/spotify').SpotifyTrack,
  candidates: import('@/types/navidrome').NavidromeSong[],
  threshold: number = 0.8
): FuzzyMatchCandidateResult {
  if (candidates.length === 0) {
    return { matches: [], hasAmbiguous: false };
  }

  const scoredMatches: FuzzyMatchResult[] = candidates
    .map((song) => {
      const albumSim = calculateAlbumSimilarity(
        spotifyTrack.album.name,
        song.album
      );
      const score = calculateTrackSimilarity(spotifyTrack, song);

      return {
        song,
        score,
        details: {
          durationDiff: Math.abs(spotifyTrack.duration_ms - song.duration * 1000),
          albumSimilarity: albumSim,
        }
      };
    })
    .filter((match) => match.score >= threshold)
    .sort((a, b) => b.score - a.score);

  if (scoredMatches.length === 0) {
    return { matches: [], hasAmbiguous: false };
  }

  const bestScore = scoredMatches[0].score;
  const thresholdMatches = scoredMatches.filter(
    (m) => m.score >= bestScore - 0.05
  );

  const hasAmbiguous = thresholdMatches.length > 1;

  return {
    matches: scoredMatches,
    hasAmbiguous,
    bestMatch: scoredMatches[0],
  };
}
