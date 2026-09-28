import { toast } from 'sonner';

export const SESSION_EXPIRED_MESSAGE =
  'Your Spotify session has expired. Please reconnect Spotify.';

const SESSION_EXPIRED_ID = 'spotify-session-expired';

async function redirectToSpotifyLogin(): Promise<void> {
  try {
    const response = await fetch('/api/auth/spotify');
    const data = await response.json();
    if (data.authUrl) {
      window.location.href = data.authUrl;
      return;
    }
  } catch {
    // Fall through to the login page below.
  }
  window.location.href = '/';
}

/**
 * Replaces the old session-expired banner (AuthErrorBanner's amber notice /
 * the Dashboard fetchError alert) with a sonner toast.
 *
 * The <Toaster> is mounted by ToastProvider in app/layout.tsx, so this is
 * safe to call from auth-context — including the boot path, since the
 * network round-trip that discovers the expired session always resolves
 * after mount. A fixed id dedupes repeated failures into one toast, and
 * duration: Infinity keeps it on screen until dismissed or reconnected.
 */
export function notifySpotifySessionExpired(): void {
  toast.warning(SESSION_EXPIRED_MESSAGE, {
    id: SESSION_EXPIRED_ID,
    duration: Infinity,
    action: {
      label: 'Reconnect',
      onClick: () => {
        void redirectToSpotifyLogin();
      },
    },
  });
}
