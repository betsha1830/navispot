'use client';

import { SpotifyPlaylistTrack, SpotifyTrack } from '@/types/spotify';
import { TrackMatch } from '@/types/matching';
import { MatchStatusBadge } from './MatchStatusBadge';

interface TrackListProps {
  tracks: SpotifyPlaylistTrack[];
  matches: TrackMatch[];
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getMatchForTrack(track: SpotifyTrack, matches: TrackMatch[]): TrackMatch | undefined {
  return matches.find((m) => m.spotifyTrack === track || m.trackKey === (track.uri || `spotify:track:${track.id}`));
}

export function TrackList({ tracks, matches }: TrackListProps) {
  const allMatches = matches;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            <th className="py-3 px-4 font-medium">#</th>
            <th className="py-3 px-4 font-medium">Title</th>
            <th className="py-3 px-4 font-medium hidden md:table-cell">Artist</th>
            <th className="py-3 px-4 font-medium hidden lg:table-cell">Album</th>
            <th className="py-3 px-4 font-medium text-right">Duration</th>
            <th className="py-3 px-4 font-medium text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {tracks.map((trackWrapper, index) => {
            const track: SpotifyTrack | null = trackWrapper.track;
            if (!track) return null;
            const match = getMatchForTrack(track, allMatches);

            const artistNames = track.artists.map((a) => a.name).join(', ');

            return (
              <tr
                key={track.uri || track.id || index}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <td className="py-3 px-4 text-zinc-500 dark:text-zinc-400">
                  {index + 1}
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-[250px]">
                    {track.name}
                  </div>
                </td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <div className="text-zinc-600 dark:text-zinc-400 truncate max-w-[180px]">
                    {artistNames}
                  </div>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <div className="text-zinc-600 dark:text-zinc-400 truncate max-w-[180px]">
                    {track.album.name}
                  </div>
                </td>
                <td className="py-3 px-4 text-right text-zinc-500 dark:text-zinc-400">
                  {formatDuration(track.duration_ms)}
                </td>
                <td className="py-3 px-4 text-center">
                  {match ? (
                    <MatchStatusBadge
                      status={match.status}
                      strategy={match.matchStrategy}
                      candidates={match.candidates?.length}
                      navidromeTitle={match.navidromeSong?.title}
                      navidromeArtist={match.navidromeSong?.artist}
                    />
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-zinc-500/10 text-zinc-500 border-zinc-500/20">
                      <span>-</span>
                      <span className="hidden sm:inline">Pending</span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tracks.length === 0 && (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
          No tracks found in this playlist
        </div>
      )}
    </div>
  );
}
