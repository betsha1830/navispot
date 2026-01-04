'use client';

import { useAuth } from '@/lib/auth/auth-context';
import { Dashboard } from '@/components/Dashboard';
import { SpotifyConnectButton } from '@/components/spotify-connect-button';
import { NavidromeCredentialsForm } from '@/components/navidrome-credentials-form';

export default function Home() {
  const { isLoading, spotify, navidrome } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = spotify.isAuthenticated && navidrome.isConnected;

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-6 lg:px-8">
        <main className="mx-auto max-w-6xl">
          <Dashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black sm:px-6 lg:px-8">
      <main className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            NaviSpot-Plist
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Export your Spotify playlists to Navidrome
          </p>
        </div>

        <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Spotify
              </h2>
              <SpotifyConnectButton />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Connect your Spotify account to access your playlists
            </p>
          </div>

          <div>
            <NavidromeCredentialsForm />
          </div>
        </div>
      </main>
    </div>
  );
}
