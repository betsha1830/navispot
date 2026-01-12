'use client';

import { useState } from 'react';

export interface SelectedPlaylist {
  id: string;
  name: string;
  matched: number;
  unmatched: number;
  exported: number;
  failed: number;
  total: number;
  status: 'exported' | 'exporting' | 'pending';
  progress: number;
  isCurrent?: boolean;
}

interface SelectedPlaylistsPanelProps {
  selectedPlaylists: SelectedPlaylist[];
  onPlaylistClick: (id: string) => void;
  currentPlaylistId: string | null;
  isExporting: boolean;
  statistics?: {
    matched: number;
    unmatched: number;
    total: number;
    failed?: number;
  };
}

const statusColors = {
  exported: 'bg-green-100 text-green-800 border-green-200',
  exporting: 'bg-blue-100 text-blue-800 border-blue-200',
  pending: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const statusLabels = {
  exported: 'Exported',
  exporting: 'Exporting',
  pending: 'Pending',
};

export function SelectedPlaylistsPanel({
  selectedPlaylists,
  onPlaylistClick,
  currentPlaylistId,
  isExporting,
  statistics,
}: SelectedPlaylistsPanelProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Selected Playlists ({selectedPlaylists.length})
        </h2>
        {statistics && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {statistics.total}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {statistics.matched}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {statistics.unmatched}
            </span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Status
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Progress
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {selectedPlaylists.map((playlist) => (
              <>
                <tr
                  key={playlist.id}
                  onClick={() => onPlaylistClick(playlist.id)}
                  className={`
                    cursor-pointer transition-colors
                    ${currentPlaylistId === playlist.id 
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-l-4 border-l-green-500' 
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                  `}
                >
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                    {playlist.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[playlist.status]}`}>
                      {statusLabels[playlist.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      <div className="w-24">
                        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                          <span>{playlist.progress}%</span>
                        </div>
                        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              playlist.status === 'exported' 
                                ? 'bg-green-500' 
                                : playlist.status === 'exporting'
                                ? 'bg-blue-500'
                                : 'bg-zinc-300 dark:bg-zinc-700'
                            }`}
                            style={{ width: `${playlist.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                </tr>
              </>
            ))}
            {selectedPlaylists.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  No playlists selected. Select playlists from the table below to export.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
