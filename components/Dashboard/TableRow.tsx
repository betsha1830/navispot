'use client';

import { ExportStatus, getExportStatusBadgeColor, getExportStatusLabel } from '@/types/playlist-table';
import Image from 'next/image';

export interface PlaylistTableItem {
  id: string;
  name: string;
  images: { url: string }[];
  owner: { display_name: string };
  tracks: { total: number };
  snapshot_id: string;
  isLikedSongs: boolean;
  selected: boolean;
  exportStatus: ExportStatus;
  navidromePlaylistId?: string;
  lastExportedAt?: string;
}

interface TableRowProps {
  playlist: PlaylistTableItem;
  isSelected: boolean;
  onToggle: () => void;
  isExporting?: boolean;
  rowIndex: number;
}

const StatusBadge = ({ status }: { status: ExportStatus }) => {
  const colors = getExportStatusBadgeColor(status);
  const label = getExportStatusLabel(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}>
      {status === 'out-of-sync' && (
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      {label}
    </span>
  );
};

export function TableRow({ playlist, isSelected, onToggle, isExporting = false, rowIndex }: TableRowProps) {
  const isEven = rowIndex % 2 === 0;

  return (
    <tr
      className={`
        border-b border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer
        ${isExporting
          ? 'opacity-50 cursor-not-allowed'
          : isSelected
            ? 'bg-zinc-100 dark:bg-zinc-800 border-l-4 border-l-green-500'
            : isEven
              ? 'bg-white dark:bg-zinc-900'
              : 'bg-zinc-50 dark:bg-zinc-800/50'
        }
        hover:bg-zinc-50 dark:hover:bg-zinc-800/50
      `}
      onClick={onToggle}
    >
      <td className="px-4 py-3 w-[60px]">
        <div className="relative">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            onClick={(e) => e.stopPropagation()}
            disabled={isExporting}
            className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </td>
      <td className="px-4 py-3 w-[80px]">
        <div className="relative h-12 w-12 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
          {playlist.images?.[0]?.url ? (
            <Image
              src={playlist.images[0].url}
              alt={playlist.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg className="h-6 w-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 min-w-0">
        <div className="flex items-center gap-2">
          {playlist.isLikedSongs && (
            <svg className="h-4 w-4 text-pink-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          )}
          <span className="truncate font-medium text-zinc-900 dark:text-zinc-100" title={playlist.name}>
            {playlist.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 w-[120px] text-sm text-zinc-600 dark:text-zinc-400">
        {playlist.tracks.total.toLocaleString()} tracks
      </td>
      <td className="px-4 py-3 w-[200px]">
        <span className="truncate text-sm text-zinc-600 dark:text-zinc-400 block" title={playlist.owner.display_name}>
          {playlist.owner.display_name}
        </span>
      </td>
      <td className="px-4 py-3 w-[120px]">
        <StatusBadge status={playlist.exportStatus} />
      </td>
    </tr>
  );
}
