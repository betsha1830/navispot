"use client"

import React, { useState, useMemo } from "react"

export interface Song {
  spotifyTrackId: string
  title: string
  album: string
  artist: string
  duration: string
  exportStatus?: "waiting" | "exported" | "failed"
}

export interface PlaylistGroup {
  playlistId: string
  playlistName: string
  songs: Song[]
  isLoading?: boolean
}

interface SongsPanelProps {
  playlistGroups: PlaylistGroup[]
  isLoading?: boolean
  statistics?: {
    matched: number
    unmatched: number
    total: number
    failed?: number
  }
}

export function SongsPanel({
  playlistGroups,
  isLoading = false,
  statistics,
}: SongsPanelProps) {
  const [showUnmatchedOnly, setShowUnmatchedOnly] = useState(false)

  const filteredGroups = useMemo(() => {
    if (!showUnmatchedOnly) {
      return playlistGroups
    }

    return playlistGroups.map((group) => ({
      ...group,
      songs: group.songs.filter(
        (song) => song.exportStatus === "failed"
      ),
    }))
  }, [playlistGroups, showUnmatchedOnly])

  const handleDownloadUnmatched = () => {
    const unmatchedSongs: Array<{
      title: string
      artist: string
      album: string
      duration: string
      playlistName: string
    }> = []

    playlistGroups.forEach((group) => {
      group.songs.forEach((song) => {
        if (song.exportStatus === "failed") {
          unmatchedSongs.push({
            title: song.title,
            artist: song.artist,
            album: song.album,
            duration: song.duration,
            playlistName: group.playlistName,
          })
        }
      })
    })

    if (unmatchedSongs.length === 0) {
      alert("No unmatched songs to download")
      return
    }

    const totalTracks = playlistGroups.reduce((sum, g) => sum + g.songs.length, 0)
    const unmatchedCount = unmatchedSongs.length
    const matchRate = totalTracks > 0 ? Math.round(((totalTracks - unmatchedCount) / totalTracks) * 100) : 0

    const exportData = {
      metadata: {
        unmatchedCount,
        totalTracks,
        matchRate,
        exportedAt: new Date().toISOString(),
      },
      songs: unmatchedSongs,
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `unmatched-songs-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  if (filteredGroups.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Songs
            </h2>
            {statistics && (
              <div className="flex items-center gap-2">
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
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Songs
            </h2>
            {statistics && (
              <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnmatchedOnly}
                onChange={(e) => setShowUnmatchedOnly(e.target.checked)}
                className="rounded border-zinc-300 dark:border-zinc-600 text-blue-500 focus:ring-blue-500 dark:bg-zinc-700"
              />
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                Unmatched Songs
              </span>
            </label>
            <button
              onClick={handleDownloadUnmatched}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Download unmatched songs as JSON"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
      <div className="overflow-auto flex-1">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-800/95 sticky top-0">
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
            {filteredGroups.map((group) => (
              <React.Fragment key={group.playlistId}>
                {/* Section Header */}
                <tr>
                  <td
                    colSpan={5}
                    className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 font-semibold text-sm border-t-2 border-zinc-300 dark:border-zinc-700"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          group.isLoading ? "animate-spin inline-block" : ""
                        }
                      >
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
                      song.exportStatus === "exported"
                        ? "bg-green-50 dark:bg-green-900/20"
                        : song.exportStatus === "failed"
                          ? "bg-red-50 dark:bg-red-900/20"
                          : ""
                    }`}
                  >
                    <td className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                      {index + 1}
                    </td>
                    <td
                      className="px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]"
                      title={song.title}
                    >
                      {song.title}
                    </td>
                    <td
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]"
                      title={song.album}
                    >
                      {song.album}
                    </td>
                    <td
                      className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]"
                      title={song.artist}
                    >
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
  )
}
