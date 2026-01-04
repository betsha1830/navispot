'use client';

import Image from 'next/image';
import { SpotifyPlaylist } from '@/types/spotify';

interface PlaylistCardProps {
  playlist: SpotifyPlaylist;
  isSelected: boolean;
  onToggle: () => void;
}

export function PlaylistCard({ playlist, isSelected, onToggle }: PlaylistCardProps) {
  const coverImage = playlist.images[0]?.url || '/file.svg';
  const trackCount = playlist.tracks.total;

  return (
    <div
      className={`relative overflow-hidden rounded-lg border bg-white shadow-sm transition-all hover:shadow-md ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'
      }`}
    >
      <div className="flex p-4">
        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md">
          <Image
            src={coverImage}
            alt={`${playlist.name} cover`}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>

        <div className="ml-4 flex flex-1 flex-col justify-between">
          <div>
            <h3 className="line-clamp-1 text-sm font-medium text-gray-900">
              {playlist.name}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              by {playlist.owner.display_name}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
            </p>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`flex h-5 w-5 items-center justify-center rounded border text-xs transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-300 bg-white text-transparent hover:border-blue-400'
              }`}
            >
              ✓
            </button>
            <span className="text-xs text-gray-500">
              {isSelected ? 'Selected' : 'Select'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-2">
        <span className="text-xs font-medium text-gray-600">Export Status</span>
        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          Not Exported
        </span>
      </div>
    </div>
  );
}
