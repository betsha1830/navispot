'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { spotifyClient } from '@/lib/spotify/client';
import { NavidromeApiClient } from '@/lib/navidrome/client';
import { SpotifyPlaylist } from '@/types/spotify';
import { PlaylistCard } from './PlaylistCard';
import { ProgressTracker, ProgressState } from '@/components/ProgressTracker';
import { ResultsReport, ExportResult } from '@/components/ResultsReport';
import { createBatchMatcher, BatchMatcherOptions } from '@/lib/matching/batch-matcher';
import { getMatchStatistics } from '@/lib/matching/orchestrator';
import { createPlaylistExporter, PlaylistExporterOptions } from '@/lib/export/playlist-exporter';

export function Dashboard() {
  const { spotify, navidrome } = useAuth();
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressState, setProgressState] = useState<ProgressState | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

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

  const createInitialProgressState = (total: number): ProgressState => ({
    phase: 'matching',
    progress: { current: 0, total, percent: 0 },
    statistics: { matched: 0, unmatched: 0, exported: 0, failed: 0 },
  });

  const updateProgress = useCallback((
    state: ProgressState,
    updates: Partial<ProgressState>
  ): ProgressState => ({
    ...state,
    ...updates,
    progress: { ...state.progress, ...(updates.progress || {}) },
    statistics: { ...state.statistics, ...(updates.statistics || {}) },
  }), []);

  const handleExport = async () => {
    if (!spotify.isAuthenticated || !spotify.token || !navidrome.credentials) {
      setError('Please connect both Spotify and Navidrome to export playlists.');
      return;
    }

    const selectedPlaylists = playlists.filter(p => selectedIds.has(p.id));
    if (selectedPlaylists.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);
    setExportResult(null);

    try {
      spotifyClient.setToken(spotify.token);
      const navidromeClient = new NavidromeApiClient(
        navidrome.credentials.url,
        navidrome.credentials.username,
        navidrome.credentials.password,
        navidrome.token ?? undefined,
        navidrome.clientId ?? undefined
      );

      const batchMatcher = createBatchMatcher(spotifyClient, navidromeClient);
      const playlistExporter = createPlaylistExporter(navidromeClient);

      const matcherOptions: BatchMatcherOptions = {
        enableISRC: true,
        enableFuzzy: true,
        enableStrict: true,
        fuzzyThreshold: 0.8,
      };

      for (const playlist of selectedPlaylists) {
        let progress = createInitialProgressState(0);

        setProgressState(progress);

        const tracks = await spotifyClient.getAllPlaylistTracks(playlist.id);
        progress = updateProgress(progress, {
          progress: { current: 0, total: tracks.length, percent: 0 },
        });
        setProgressState(progress);

        const { matches } = await batchMatcher.matchTracks(
          tracks.map(t => t.track),
          matcherOptions,
          async (batchProgress) => {
            progress = updateProgress(progress, {
              phase: 'matching',
              currentTrack: batchProgress.currentTrack ? {
                name: batchProgress.currentTrack.name,
                artist: batchProgress.currentTrack.artists?.map(a => a.name).join(', ') || 'Unknown',
                index: batchProgress.current - 1,
                total: batchProgress.total,
              } : undefined,
              progress: {
                current: batchProgress.current,
                total: batchProgress.total,
                percent: batchProgress.percent,
              },
            });
            setProgressState({ ...progress });
          }
        );
        
        const statistics = getMatchStatistics(matches);

        progress = updateProgress(progress, {
          phase: 'exporting',
          progress: { current: 0, total: matches.length, percent: 0 },
        });
        setProgressState(progress);

        const exporterOptions: PlaylistExporterOptions = {
          mode: 'create',
          skipUnmatched: false,
          onProgress: async (exportProgress) => {
            progress = updateProgress(progress, {
              phase: exportProgress.status === 'completed' ? 'completed' : 'exporting',
              progress: {
                current: exportProgress.current,
                total: exportProgress.total,
                percent: exportProgress.percent,
              },
              statistics: {
                matched: statistics.matched,
                unmatched: statistics.unmatched,
                exported: exportProgress.current,
                failed: 0,
              },
            });
            setProgressState({ ...progress });
          },
        };

        const result = await playlistExporter.exportPlaylist(playlist.name, matches, exporterOptions);

        setProgressState({
          phase: 'completed',
          progress: { current: result.statistics.total, total: result.statistics.total, percent: 100 },
          statistics: {
            matched: result.statistics.exported,
            unmatched: result.statistics.skipped,
            exported: result.statistics.exported,
            failed: result.statistics.failed,
          },
        });

        setExportResult({
          playlistName: playlist.name,
          timestamp: new Date(),
          statistics: {
            total: result.statistics.total,
            matched: statistics.matched,
            unmatched: result.statistics.skipped,
            ambiguous: statistics.ambiguous,
            exported: result.statistics.exported,
            failed: result.statistics.failed,
          },
          matches: matches,
          options: { mode: 'create', skipUnmatched: false },
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setError(errorMessage);
      setProgressState({
        phase: 'error',
        progress: { current: 0, total: 0, percent: 0 },
        statistics: { matched: 0, unmatched: 0, exported: 0, failed: 0 },
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelExport = () => {
    setProgressState(null);
    setExportResult(null);
  };

  const handleCompleteExport = () => {
    setLoading(false);
  };

  const handleExportAgain = () => {
    setProgressState(null);
    setExportResult(null);
    handleExport();
  };

  const handleBackToDashboard = () => {
    setProgressState(null);
    setExportResult(null);
  };

  if (!spotify.isAuthenticated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500">Please connect your Spotify account to view playlists.</p>
      </div>
    );
  }

  if (progressState) {
    return (
      <div className="py-8">
        <div className="mb-6">
          <button
            onClick={handleCancelExport}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>
        <ProgressTracker
          state={progressState}
          onCancel={handleCancelExport}
          onComplete={handleCompleteExport}
        />
        {exportResult && progressState.phase === 'completed' && (
          <div className="mt-6">
            <ResultsReport
              result={exportResult}
              onExportAgain={handleExportAgain}
              onBackToDashboard={handleBackToDashboard}
            />
          </div>
        )}
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
          onClick={handleExport}
          disabled={selectedIds.size === 0 || loading}
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
