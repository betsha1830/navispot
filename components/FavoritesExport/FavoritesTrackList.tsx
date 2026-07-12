'use client';

import { SpotifySavedTrack } from '@/types/spotify';
import { TrackMatch } from '@/types/matching';
import { trackKey as getTrackKey } from '@/lib/spotify/track-identity';

interface FavoritesTrackListProps {
  tracks: SpotifySavedTrack[];
  matches: TrackMatch[];
  isLoading: boolean;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function TrackItem({ track, status, matchInfo }: { track: SpotifySavedTrack; status: 'matched' | 'ambiguous' | 'unmatched' | null; matchInfo: { strategy: string; songTitle?: string } | null }) {
  const statusColors = {
    matched: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    ambiguous: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    unmatched: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusIcons = {
    matched: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    ambiguous: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    unmatched: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };

  const artists = track.track.artists?.map(a => a.name).join(', ') || 'Unknown Artist';

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg">
      <div className="flex-shrink-0">
        {status && statusColors[status] ? (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusColors[status]}`}>
            {statusIcons[status]}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {track.track.name}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {artists}
        </div>
        {matchInfo && matchInfo.songTitle && (
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
            → {matchInfo.songTitle}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-400">
          {formatDuration(track.track.duration_ms)}
        </span>
        {status && statusColors[status] && (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}>
            {status === 'matched' && matchInfo?.strategy && (
              <span className="mr-1 capitalize">{matchInfo.strategy}</span>
            )}
            {status === 'matched' ? 'Matched' : status === 'ambiguous' ? 'Ambiguous' : 'Unmatched'}
          </span>
        )}
      </div>
    </div>
  );
}

export function FavoritesTrackList({ tracks, matches, isLoading }: FavoritesTrackListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const matchedIds = new Set(matches.filter(m => m.status === 'matched').map(m => m.trackKey));
  const ambiguousIds = new Set(matches.filter(m => m.status === 'ambiguous').map(m => m.trackKey));
  const unmatchedIds = new Set(matches.filter(m => m.status === 'unmatched').map(m => m.trackKey));

  const getStatusForTrack = (track: SpotifySavedTrack): 'matched' | 'ambiguous' | 'unmatched' | null => {
    const tk = getTrackKey(track.track);
    if (matchedIds.has(tk)) return 'matched';
    if (ambiguousIds.has(tk)) return 'ambiguous';
    if (unmatchedIds.has(tk)) return 'unmatched';
    return null;
  };

  const getMatchInfoForTrack = (track: SpotifySavedTrack): { strategy: string; songTitle?: string } | null => {
    const tk = getTrackKey(track.track);
    const match = matches.find(m => m.trackKey === tk);
    if (!match || match.status !== 'matched') return null;
    return {
      strategy: match.matchStrategy,
      songTitle: match.navidromeSong?.title,
    };
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          All Saved Tracks
        </h3>
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        {tracks.map((savedTrack, index) => (
          <TrackItem
            key={`${savedTrack.track.id}-${index}`}
            track={savedTrack}
            status={getStatusForTrack(savedTrack)}
            matchInfo={getMatchInfoForTrack(savedTrack)}
          />
        ))}
      </div>
    </div>
  );
}

export default FavoritesTrackList;
