'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { spotifyClient } from '@/lib/spotify/client';
import { SpotifyPlaylist } from '@/types/spotify';
import { PlaylistCard } from './PlaylistCard';

export function Dashboard() {
  const { spotify } = useAuth();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlaylists() {
      if (!spotify.isAuthenticated || !spotify.token) {
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        spotifyClient.setToken(spotify.token);
        const fetchedPlaylists = await spotifyClient.getAllPlaylists();
        setPlaylists(fetchedPlaylists);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch playlists');
      } finally {
        setLoading(false);
      }
    }

    fetchPlaylists();
  }, [spotify.isAuthenticated, spotify.token]);

  const handleToggle = (playlistId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  if (!spotify.isAuthenticated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500">Please connect your Spotify account to view playlists.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500">No playlists found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          disabled={selectedIds.size === 0}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export Selected ({selectedIds.size})
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {playlists.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            isSelected={selectedIds.has(playlist.id)}
            onToggle={() => handleToggle(playlist.id)}
          />
        ))}
      </div>
    </div>
  );
}
