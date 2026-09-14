import { SpotifyToken } from '@/types';

// NOTE: There is no client-side "encryption" of tokens in localStorage
// here, and there never can be — any key shipped to the browser is
// readable by the browser. A previous version of this file carried an
// unused AES-CBC implementation with a hardcoded key, which only gave a
// false sense of security. Tokens are stored as plain JSON; the app's
// real protections are httpOnly cookies (server-side flows) and OAuth
// scopes being read-only.

export const isTokenExpired = (token: SpotifyToken): boolean => {
  const bufferMs = 60 * 1000;
  return Date.now() + bufferMs >= token.expiresAt;
};
