'use client';

export interface UnmatchedSong {
  title: string;
  album: string;
  artist: string;
  duration: string;
}

interface UnmatchedSongsPanelProps {
  unmatchedSongs: UnmatchedSong[];
  isEmpty: boolean;
}

export function UnmatchedSongsPanel({ unmatchedSongs, isEmpty }: UnmatchedSongsPanelProps) {
  if (isEmpty) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Unmatched Songs
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
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
            No Playlist Selected
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Select a playlist from the left panel to view unmatched songs.
          </p>
        </div>
      </div>
    );
  }

  if (unmatchedSongs.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Unmatched Songs
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <svg
            className="w-12 h-12 text-green-300 dark:text-green-600 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
            All Songs Matched!
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No unmatched songs found for this playlist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Unmatched Songs ({unmatchedSongs.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[40%]">
                Title
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[25%]">
                Album
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[25%]">
                Artist
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-[10%]">
                Duration
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {unmatchedSongs.map((song, index) => (
              <tr
                key={index}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <td className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                  {song.title}
                </td>
                <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">
                  {song.album}
                </td>
                <td className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">
                  {song.artist}
                </td>
                <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {song.duration}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
