import React from 'react';
import type { PlaylistInfo } from '@/types/playlist-table';

export interface ConfirmationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  playlists: PlaylistInfo[];
}

export function ConfirmationPopup({
  isOpen,
  onClose,
  onConfirm,
  playlists,
}: ConfirmationPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 w-full max-w-md mx-4 shadow-xl">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Export Playlists
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Are you sure you want to export the following {playlists.length}{' '}
            {playlists.length === 1 ? 'playlist' : 'playlists'}?
          </p>
          <ul className="space-y-2 mb-6 max-h-60 overflow-y-auto">
            {playlists.map((playlist, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <span className="text-zinc-400 dark:text-zinc-500">•</span>
                <span className="truncate flex-1">{playlist.name}</span>
                <span className="text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  ({playlist.trackCount} tracks)
                </span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer hover:shadow-md"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 rounded-lg transition-colors cursor-pointer hover:shadow-md"
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
