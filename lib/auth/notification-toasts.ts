import { toast } from 'sonner';

const OAUTH_ERROR_TOAST_ID = 'spotify-oauth-error';
const FETCH_ERROR_TOAST_ID = 'fetch-error';

/**
 * Friendly explanations for the error codes the OAuth callback appends to
 * the URL (app/api/auth/callback/route.ts redirects to /?error=<code>), plus
 * the codes Spotify itself reports (e.g. access_denied).
 */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch:
    'Spotify login could not be verified (state mismatch). This can happen if the login took too long or cookies were cleared — please try connecting again.',
  no_verifier:
    'Spotify login session data was missing. Please try connecting again.',
  missing_params:
    'Spotify did not return a valid login response. Please try connecting again.',
  token_exchange_failed:
    'Spotify rejected the login. If it keeps failing, check that the redirect URI in your Spotify app settings matches this server exactly.',
  access_denied:
    'You declined the Spotify permission request. You can connect again anytime.',
  invalid_client:
    "This server's Spotify credentials (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET) were rejected. Contact the person hosting this instance.",
};

export function messageForOAuthError(code: string): string {
  return (
    OAUTH_ERROR_MESSAGES[code] ??
    `Spotify login failed (${code}). Please try connecting again.`
  );
}

/**
 * Reads the ?error= query param once and strips it from the URL so a refresh
 * doesn't repeat the notification. Returns the raw code, or null when the URL
 * carries no error.
 */
export function consumeOAuthErrorFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('error');
  if (!code) return null;

  params.delete('error');
  const qs = params.toString();
  const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);
  return code;
}

/**
 * Persistent error toast for OAuth callback failures. Same id dedupes
 * repeats; the Toaster's close button dismisses it.
 */
export function notifyOAuthError(code: string): void {
  toast.error(messageForOAuthError(code), {
    id: OAUTH_ERROR_TOAST_ID,
    duration: Infinity,
  });
}

/**
 * Mirrors the auth context's fetchError into a single persistent toast with
 * a Retry action — the replacement for the old login/Dashboard fetch-error
 * banners. Passing null dismisses it (fetchError clears when a retry
 * succeeds).
 */
export function syncFetchErrorToast(
  message: string | null,
  retry: () => void,
): void {
  if (!message) {
    toast.dismiss(FETCH_ERROR_TOAST_ID);
    return;
  }
  toast.error(message, {
    id: FETCH_ERROR_TOAST_ID,
    duration: Infinity,
    action: {
      label: 'Retry',
      onClick: retry,
    },
  });
}
