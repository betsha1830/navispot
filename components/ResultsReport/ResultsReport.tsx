'use client';

import { useState } from 'react';
import { ResultsReportProps } from './types';
import { TrackMatch } from '@/types/matching';

const formatNumber = (num: number): string => num.toLocaleString();

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const generateExportLog = (result: ResultsReportProps['result']): string => {
  const logData = {
    timestamp: result.timestamp.toISOString(),
    playlistName: result.playlistName,
    options: result.options,
    statistics: result.statistics,
    tracks: result.matches.map((match: TrackMatch) => ({
      name: match.spotifyTrack.name,
      artist: match.spotifyTrack.artists?.map(a => a.name).join(', ') || 'Unknown',
      album: match.spotifyTrack.album?.name || 'Unknown',
      status: match.status,
      matchStrategy: match.matchStrategy,
      matchScore: match.matchScore,
      navidromeId: match.navidromeSong?.id,
      navidromeTitle: match.navidromeSong?.title,
      navidromeArtist: match.navidromeSong?.artist,
      reason: match.status === 'unmatched' ? 'No matching track found in Navidrome' :
               match.status === 'ambiguous' ? `Multiple candidates found (${match.candidates?.length || 0})` : undefined,
      candidates: match.candidates?.map(c => ({
        id: c.id,
        title: c.title,
        artist: c.artist,
        album: c.album,
        isrc: c.isrc,
      })),
    })),
  };

  return JSON.stringify(logData, null, 2);
};

const downloadLog = (result: ResultsReportProps['result']): void => {
  const logContent = generateExportLog(result);
  const blob = new Blob([logContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fileName = `export-log-${result.playlistName.replace(/[^a-zA-Z0-9]/g, '_')}-${result.timestamp.toISOString().split('T')[0]}.json`;
  
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface SummaryCardProps {
  label: string;
  value: number;
  subValue?: string;
  color: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
  icon: React.ReactNode;
}

function SummaryCard({ label, value, subValue, color, icon }: SummaryCardProps) {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400',
    gray: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-400',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <div className="text-3xl font-bold">{formatNumber(value)}</div>
      {subValue && <div className="text-sm opacity-70 mt-1">{subValue}</div>}
    </div>
  );
}

interface UnmatchedTrackItemProps {
  match: TrackMatch;
  index: number;
  onViewDetails?: (trackId: string) => void;
}

function UnmatchedTrackItem({ match, index, onViewDetails }: UnmatchedTrackItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center text-sm font-medium">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {match.spotifyTrack.name}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {match.spotifyTrack.artists?.map(a => a.name).join(', ') || 'Unknown Artist'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            {match.matchStrategy === 'none' ? 'No match' : match.matchStrategy}
          </span>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/30 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Album:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">
                {match.spotifyTrack.album?.name || 'Unknown'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Match Score:</span>
              <span className="ml-2 text-gray-900 dark:text-gray-100">
                {match.matchScore.toFixed(2)}
              </span>
            </div>
            {match.candidates && match.candidates.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Candidates found:</span>
                <ul className="mt-2 space-y-1">
                  {match.candidates.slice(0, 3).map((candidate, i) => (
                    <li key={candidate.id || i} className="text-gray-700 dark:text-gray-300">
                      - {candidate.title} by {candidate.artist}
                    </li>
                  ))}
                  {match.candidates.length > 3 && (
                    <li className="text-gray-500 dark:text-gray-400 italic">
                      ...and {match.candidates.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(match.spotifyTrack.id || match.trackKey)}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              View Details →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ResultsReport({ result, onExportAgain, onBackToDashboard, onViewDetails }: ResultsReportProps) {
  const [showUnmatchedOnly, setShowUnmatchedOnly] = useState(true);

  const unmatchedMatches = result.matches.filter(m => m.status !== 'matched');
  const matchRate = result.statistics.total > 0
    ? Math.round((result.statistics.matched / result.statistics.total) * 100)
    : 0;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                Export Complete
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {result.playlistName} • {formatDate(result.timestamp)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {matchRate}% Match Rate
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <SummaryCard
              label="Total Tracks"
              value={result.statistics.total}
              color="gray"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              }
            />
            <SummaryCard
              label="Matched"
              value={result.statistics.matched}
              subValue={`${result.statistics.ambiguous} ambiguous`}
              color="green"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
            <SummaryCard
              label="Unmatched"
              value={result.statistics.unmatched}
              color="yellow"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
            <SummaryCard
              label="Exported"
              value={result.statistics.exported}
              color="blue"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            />
            <SummaryCard
              label="Failed"
              value={result.statistics.failed}
              color="red"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
            />
            <SummaryCard
              label="Skipped"
              value={result.statistics.unmatched - result.statistics.failed}
              color="gray"
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              }
            />
          </div>

          {unmatchedMatches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  Unmatched Tracks ({unmatchedMatches.length})
                </h3>
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                  <input
                    type="checkbox"
                    checked={showUnmatchedOnly}
                    onChange={(e) => setShowUnmatchedOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show unmatched only
                </label>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(showUnmatchedOnly ? unmatchedMatches : result.matches)
                  .filter(m => m.status !== 'matched' || !showUnmatchedOnly)
                  .slice(0, 20)
                  .map((match, index) => (
                    <UnmatchedTrackItem
                      key={match.spotifyTrack.uri || match.spotifyTrack.id || match.trackKey}
                      match={match}
                      index={index}
                      onViewDetails={onViewDetails}
                    />
                  ))}
                {result.matches.length > 20 && (
                  <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 py-2">
                    Showing 20 of {result.matches.length} tracks
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadLog(result)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Log
              </button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                JSON format
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToDashboard}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Back to Dashboard
              </button>
              <button
                onClick={onExportAgain}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Export Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsReport;
