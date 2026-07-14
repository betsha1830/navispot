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
    .trim()
    .replace(/^(the|a|an)\s+/, '');
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

export function calculateBestArtistSimilarity(
  spotifyArtists: string[],
  navidromeArtist: string
): number {
  let best = 0;
  for (const artist of spotifyArtists) {
    const score = calculateArtistSimilarity(artist, navidromeArtist);
    if (score > best) best = score;
    if (best === 1.0) break;
  }
  return best;
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

const TITLE_SUFFIX_PATTERN = /[\(\[].*?[\)\]]\s*$|[-–—~/].*$/;

export function stripTitleSuffix(title: string): string {
  let result = title;
  let prev = '';
  while (result !== prev) {
    prev = result;
    result = result.replace(TITLE_SUFFIX_PATTERN, '').trim();
  }
  return result;
}

export function normalizeAlbumName(album: string): string {
  let normalized = album.toLowerCase();
  for (const word of SOUNDTRACK_WORDS) {
    normalized = normalized.replace(new RegExp(word, 'gi'), ' ');
  }
  normalized = normalizeString(normalized);
  return normalized.replace(/\s+/g, ' ').trim();
}

const FEATURED_ARTIST_PATTERN = /[\(\[]\s*(?:feat\.?|ft\.?|featuring)\s+[^\)\]]*[\)\]]/gi;

export function normalizeTitle(title: string): string {
  let normalized = title.toLowerCase();
  // Remove parenthetical/bracket groups containing featured artists
  // e.g. "(feat. Kehlani & Lil Yachty)", "[ft. Someone]"
  normalized = normalized.replace(FEATURED_ARTIST_PATTERN, ' ');
  normalized = normalizeString(normalized);
  return normalized.replace(/\s+/g, ' ').trim();
}

const COLLABORATION_INDICATORS_AMBIGUOUS = /\s+[xX]\s+|\s+&\s+|\s+and\s+/g;

export function normalizeArtistName(artist: string): string {
  let normalized = artist.toLowerCase();
  // Strip clear collaboration indicators and everything after them
  // e.g. "Kendrick Lamar feat. SZA" → "kendrick lamar"
  normalized = normalized.replace(/\s+(?:feat\.?|ft\.?|featuring|with|vs\.?|versus|presents?\.?|presenting|prod\.?|produced by)\s.*$/gi, '');
  // Remove ambiguous collaboration indicators (keep surrounding text)
  normalized = normalized.replace(COLLABORATION_INDICATORS_AMBIGUOUS, ' ');
  // Remove "DJ " prefix
  normalized = normalized.replace(/^dj\s+/gi, '');
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
  return similarity;
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

const VERSION_KEYWORDS = /\b(?:remix|rmxx|acoustic|instrumental|radio\s*edit|extended|dub|vip|rework|bootleg|karaoke|demo|unplugged|stripped|live|mix|edit|cover)\b/gi;

export function extractVersionMarkers(title: string): Set<string> {
  const markers = new Set<string>();
  const groups = title.match(/[\(\[][^\)\]]*[\)\]]/g) || [];
  for (const group of groups) {
    const matches = group.match(VERSION_KEYWORDS);
    if (matches) matches.forEach(m => markers.add(m.toLowerCase()));
  }
  const dashParts = title.split(/[-–—]/);
  if (dashParts.length > 1) {
    for (let i = 1; i < dashParts.length; i++) {
      const matches = dashParts[i].match(VERSION_KEYWORDS);
      if (matches) matches.forEach(m => markers.add(m.toLowerCase()));
    }
  }
  return markers;
}

export function hasVersionMismatch(spotifyTitle: string, navidromeTitle: string): boolean {
  const spotifyMarkers = extractVersionMarkers(spotifyTitle);
  const navidromeMarkers = extractVersionMarkers(navidromeTitle);

  if (spotifyMarkers.size === 0 && navidromeMarkers.size === 0) return false;
  if (spotifyMarkers.size === 0 || navidromeMarkers.size === 0) return true;

  for (const m of spotifyMarkers) {
    if (navidromeMarkers.has(m)) return false;
  }
  return true;
}

export function calculateTrackSimilarity(
  spotifyTrack: import('@/types/spotify').SpotifyTrack,
  navidromeSong: import('@/types/navidrome').NavidromeSong
): number {
  const hasSpotifyArtist = spotifyTrack.artists && spotifyTrack.artists.length > 0;
  const hasSpotifyAlbum = spotifyTrack.album && spotifyTrack.album.name && spotifyTrack.album.name.length > 0;

  const artistSimilarity = hasSpotifyArtist
    ? calculateBestArtistSimilarity(
        spotifyTrack.artists.map((a) => a.name),
        navidromeSong.artist
      )
    : -1;

  const titleSimilarity = calculateTitleSimilarity(
    spotifyTrack.name,
    navidromeSong.title
  );

  const durationSimilarity = calculateDurationSimilarity(
    spotifyTrack.duration_ms,
    navidromeSong.duration
  );

  const albumSimilarity = hasSpotifyAlbum
    ? calculateAlbumSimilarity(spotifyTrack.album.name, navidromeSong.album)
    : -1;

  let availableWeight = 0;
  let weightedSum = 0;

  if (artistSimilarity >= 0) {
    weightedSum += artistSimilarity * 0.25;
    availableWeight += 0.25;
  }
  weightedSum += titleSimilarity * 0.35;
  availableWeight += 0.35;
  weightedSum += durationSimilarity * 0.25;
  availableWeight += 0.25;

  if (albumSimilarity >= 0) {
    weightedSum += albumSimilarity * 0.15;
    availableWeight += 0.15;
  }

  let baseSimilarity = availableWeight > 0 ? weightedSum / availableWeight : titleSimilarity;

  if (titleSimilarity === 1.0 && (artistSimilarity < 0 || artistSimilarity >= 0.6)) {
    baseSimilarity = (artistSimilarity >= 0 ? artistSimilarity * 0.2 : 0) + titleSimilarity * 0.4 + durationSimilarity * 0.3 + (albumSimilarity >= 0 ? albumSimilarity * 0.1 : 0);
  }

  if (durationSimilarity >= 0.9 && (artistSimilarity < 0 || artistSimilarity >= 0.6)) {
    baseSimilarity = Math.min(baseSimilarity + 0.1, 0.95);
  }

  if (albumSimilarity >= 0.8 && titleSimilarity >= 0.6 && (artistSimilarity < 0 || artistSimilarity >= 0.6)) {
    baseSimilarity = Math.min(baseSimilarity + 0.05, 0.95);
  }

  // Artist gate: reject candidates with significantly different artists
  if (artistSimilarity >= 0 && artistSimilarity < 0.6) {
    baseSimilarity = Math.min(baseSimilarity, 0.5);
  }

  // Version mismatch penalty: reject different versions (remix vs original, live vs original, etc.)
  if (hasVersionMismatch(spotifyTrack.name, navidromeSong.title)) {
    baseSimilarity = Math.min(baseSimilarity, 0.5);
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
      const albumSim = spotifyTrack.album?.name
        ? calculateAlbumSimilarity(spotifyTrack.album.name, song.album)
        : -1;
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

  // When all top candidates are the same song (duplicates), it's not truly ambiguous
  const firstMatch = thresholdMatches[0];
  const allSameSong = thresholdMatches.length > 1 && thresholdMatches.every(
    (m) => m.song.title === firstMatch.song.title && m.song.artist === firstMatch.song.artist
  );

  const hasAmbiguous = thresholdMatches.length > 1 && !allSameSong;

  return {
    matches: scoredMatches,
    hasAmbiguous,
    bestMatch: scoredMatches[0],
  };
}
