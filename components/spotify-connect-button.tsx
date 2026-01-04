'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

export function SpotifyConnectButton() {
  const { spotify, spotifyLogin, spotifyLogout, isLoading } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogin = async () => {
    try {
      await spotifyLogin();
    } catch (error) {
      console.error('Failed to initiate Spotify login:', error);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await spotifyLogout();
    } catch (error) {
      console.error('Failed to logout from Spotify:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-10 w-32 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (spotify.isAuthenticated && spotify.user) {
    return (
      <div className="flex items-center gap-3">
        {spotify.user.images && spotify.user.images.length > 0 ? (
          <Image
            src={spotify.user.images[0].url}
            alt={spotify.user.display_name}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium dark:bg-zinc-800">
            {spotify.user.display_name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {spotify.user.display_name}
        </span>
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {isLoggingOut ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="flex h-10 items-center justify-center gap-2 rounded-full bg-[#1DB954] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#1ed760] disabled:opacity-50 disabled:hover:bg-[#1DB954]"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
      Connect Spotify
    </button>
  );
}
