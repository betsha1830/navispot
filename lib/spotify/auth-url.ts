const base64URLEncode = (buffer: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary = binary + String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const generateState = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
};

// NOTE: The old client-side `createAuthorizationUrl` (which stashed the
// PKCE verifier in sessionStorage) and the `*ForServer` re-export wrappers
// were dead code — the real PKCE flow lives in app/api/auth/spotify/route.ts
// with httpOnly cookies. Removed to avoid the appearance of a second,
// insecure auth path.
