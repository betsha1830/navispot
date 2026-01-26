'use client';

import React from 'react';

export interface Song {
  title: string;
  album: string;
  artist: string;
  duration: string;
  exportStatus?: 'waiting' | 'exported' | 'failed';
}

export interface PlaylistGroup {
  playlistId: string;
  playlistName: string;
  songs: Song[];
  isLoading?: boolean;
}

interface SongsPanelProps {
  playlistGroups: PlaylistGroup[];
  isLoading?: boolean;
}

export function SongsPanel({ playlistGroups, isLoading = false }: SongsPanelProps) {
  if (playlistGroups.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col h-full">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Songs
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center flex-1">
          {isLoading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 dark:border-zinc-700 border-t-blue-500 mb-4"></div>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                Loading Tracks...
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Fetching tracks from Spotify
              </p>
            </>
          ) : (
            <>
              <svg
                className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
                />
              </svg>
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                No Playlists Checked
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Check playlists in the left panel to view their tracks here.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Songs
        </h2>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50 sticky top-0">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[5%]">
                #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[40%]">
                Title
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[25%]">
                Album
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[20%]">
                Artist
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[10%]">
                Duration
              </th>
            </tr>
          </thead>
          <tbody>
            {playlistGroups.map((group) => (
              <React.Fragment key={group.playlistId}>
                {/* Section Header */}
                <tr>
                  <td colSpan={5} className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 font-semibold text-sm border-t-2 border-zinc-300 dark:border-zinc-700">
                    <div className="flex items-center gap-2">
                      <span className={group.isLoading ? 'animate-spin inline-block' : ''}>
                        💿
                      </span>
                      <span>{group.playlistName}</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-normal">
                        ({group.songs.length} tracks)
                      </span>
                      {group.isLoading && (
                        <span className="ml-auto text-blue-500 text-xs font-normal flex items-center gap-1">
                          <span className="animate-pulse">Fetching...</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
                {/* Tracks */}
                {group.songs.map((song, index) => (
                  <tr
                    key={`${group.playlistId}-${index}`}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-200 dark:border-zinc-800 ${
                      song.exportStatus === 'exported'
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : song.exportStatus === 'failed'
                        ? 'bg-red-50 dark:bg-red-900/20'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]" title={song.title}>
                      {song.title}
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]" title={song.album}>
                      {song.album}
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]" title={song.artist}>
                      {song.artist}
                    </td>
                    <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {song.duration}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
