"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { spotifyClient } from "@/lib/spotify/client"
import { NavidromeApiClient, parseExportMetadata } from "@/lib/navidrome/client"
import { SpotifyPlaylist, SpotifyTrack } from "@/types/spotify"
import { NavidromePlaylist } from "@/types/navidrome"
import { PlaylistTable } from "@/components/Dashboard/PlaylistTable"
import { ExportLayoutManager } from "@/components/Dashboard/ExportLayoutManager"

import { ConfirmationPopup } from "@/components/Dashboard/ConfirmationPopup"
import { CancelConfirmationDialog } from "@/components/Dashboard/CancelConfirmationDialog"
import {
  SelectedPlaylistsPanel,
  SelectedPlaylist,
} from "@/components/Dashboard/SelectedPlaylistsPanel"
import {
  UnmatchedSongsPanel,
  UnmatchedSong,
} from "@/components/Dashboard/UnmatchedSongsPanel"
import {
  SongsPanel,
  PlaylistGroup,
  Song,
} from "@/components/Dashboard/SongsPanel"
import { ProgressState } from "@/components/ProgressTracker"
import {
  createBatchMatcher,
  BatchMatcherOptions,
} from "@/lib/matching/batch-matcher"
import { getMatchStatistics } from "@/lib/matching/orchestrator"
import {
  createPlaylistExporter,
  PlaylistExporterOptions,
} from "@/lib/export/playlist-exporter"
import { createFavoritesExporter } from "@/lib/export/favorites-exporter"
import {
  loadPlaylistExportData,
  savePlaylistExportData,
  getAllExportData,
  isPlaylistUpToDate,
  type PlaylistExportData,
  type TrackExportStatus,
} from "@/lib/export/track-export-cache"
import { PlaylistTableItem, PlaylistInfo } from "@/types/playlist-table"
import { TrackMatch } from "@/types/matching"
import Image from "next/image"
import NavispotLogo from "@/public/navispot.png"

const LIKED_SONGS_ID = "liked-songs"

interface PlaylistItem {
  id: string
  name: string
  description?: string
  images: { url: string }[]
  owner: { id: string; display_name: string }
  tracks: { total: number }
  snapshot_id?: string
  isLikedSongs?: boolean
}

const LIKED_SONGS_ITEM: PlaylistItem = {
  id: LIKED_SONGS_ID,
  name: "Liked Songs",
  description: "Your liked tracks from Spotify",
  images: [
    {
      url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23E91E63"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    },
  ],
  owner: { id: "user", display_name: "You" },
  tracks: { total: 0 },
  isLikedSongs: true,
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function Dashboard() {
  const { spotify, navidrome } = useAuth()
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [tableItems, setTableItems] = useState<PlaylistTableItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressState, setProgressState] = useState<ProgressState | null>(null)
  const [likedSongsCount, setLikedSongsCount] = useState<number>(0)
  const [refreshing, setRefreshing] = useState(false)
  const [navidromePlaylists, setNavidromePlaylists] = useState<
    NavidromePlaylist[]
  >([])

  const [isExporting, setIsExporting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [currentUnmatchedPlaylistId, setCurrentUnmatchedPlaylistId] = useState<
    string | null
  >(null)
  const [unmatchedSongs, setUnmatchedSongs] = useState<UnmatchedSong[]>([])
  const [selectedPlaylistsStats, setSelectedPlaylistsStats] = useState<
    SelectedPlaylist[]
  >([])
  const [sortColumn, setSortColumn] = useState<"name" | "tracks" | "owner">(
    "name",
  )
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [checkedPlaylistIds, setCheckedPlaylistIds] = useState<Set<string>>(
    new Set(),
  )
  const [playlistTracksCache, setPlaylistTracksCache] = useState<
    Map<string, Song[]>
  >(new Map())
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [loadingPlaylistIds, setLoadingPlaylistIds] = useState<Set<string>>(
    new Set(),
  )
  const [songExportStatus, setSongExportStatus] = useState<
    Map<string, Map<string, "waiting" | "exported" | "failed">>
  >(new Map())
  const [trackExportCache, setTrackExportCache] = useState<
    Map<string, PlaylistExportData>
  >(new Map())

  const isExportingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!spotify.isAuthenticated || !spotify.token) {
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        spotifyClient.setToken(spotify.token)
        const fetchedPlaylists = await spotifyClient.getAllPlaylists()
        setPlaylists(fetchedPlaylists)

        try {
          const count = await spotifyClient.getSavedTracksCount()
          setLikedSongsCount(count)
        } catch {
          setLikedSongsCount(0)
        }

        if (
          navidrome.isConnected &&
          navidrome.credentials &&
          navidrome.token &&
          navidrome.clientId
        ) {
          const navidromeClient = new NavidromeApiClient(
            navidrome.credentials.url,
            navidrome.credentials.username,
            navidrome.credentials.password,
            navidrome.token,
            navidrome.clientId,
          )
          try {
            const navPlaylists = await navidromeClient.getPlaylists()
            setNavidromePlaylists(navPlaylists)
          } catch (navErr) {
            console.warn("Failed to fetch Navidrome playlists:", navErr)
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch playlists",
        )
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [
    spotify.isAuthenticated,
    spotify.token,
    navidrome.isConnected,
    navidrome.credentials,
    navidrome.token,
    navidrome.clientId,
  ])

  const handleRefreshPlaylists = async () => {
    if (!spotify.isAuthenticated || !spotify.token) {
      setError("Please connect to Spotify to refresh playlists.")
      return
    }

    setRefreshing(true)
    setError(null)

    try {
      spotifyClient.setToken(spotify.token)
      const fetchedPlaylists = await spotifyClient.getAllPlaylists(undefined, true)
      setPlaylists(fetchedPlaylists)

      try {
        const count = await spotifyClient.getSavedTracksCount(undefined, true)
        setLikedSongsCount(count)
      } catch {
        setLikedSongsCount(0)
      }

      if (
        navidrome.isConnected &&
        navidrome.credentials &&
        navidrome.token &&
        navidrome.clientId
      ) {
        const navidromeClient = new NavidromeApiClient(
          navidrome.credentials.url,
          navidrome.credentials.username,
          navidrome.credentials.password,
          navidrome.token,
          navidrome.clientId,
        )
        try {
          const navPlaylists = await navidromeClient.getPlaylists()
          setNavidromePlaylists(navPlaylists)
        } catch (navErr) {
          console.warn("Failed to fetch Navidrome playlists:", navErr)
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh playlists",
      )
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!spotify.isAuthenticated) return
    const allData = getAllExportData()
    setTrackExportCache(allData)
  }, [spotify.isAuthenticated])

  useEffect(() => {
    const items: PlaylistTableItem[] = playlists.map((playlist) => {
      let exportStatus: "none" | "exported" | "out-of-sync" = "none"
      let navidromePlaylistId: string | undefined
      let lastExportedAt: string | undefined

      const cachedData = trackExportCache.get(playlist.id)
      const hasCachedExport = cachedData && cachedData.navidromePlaylistId

      if (navidromePlaylists.length > 0) {
        const navPlaylist = navidromePlaylists.find((np) => {
          const metadata = parseExportMetadata(np.comment)
          return metadata?.spotifyPlaylistId === playlist.id
        })

        if (navPlaylist) {
          const metadata = parseExportMetadata(navPlaylist.comment)
          if (metadata) {
            navidromePlaylistId = metadata.navidromePlaylistId
            lastExportedAt = metadata.exportedAt

            if (
              playlist.snapshot_id &&
              metadata.spotifySnapshotId === playlist.snapshot_id
            ) {
              exportStatus = "exported"
            } else {
              exportStatus = "out-of-sync"
            }
          }
        } else if (hasCachedExport) {
          exportStatus = "exported"
          navidromePlaylistId = cachedData.navidromePlaylistId
          lastExportedAt = cachedData.exportedAt
        }
      }

      if (navidromePlaylists.length === 0 && hasCachedExport) {
        exportStatus = "exported"
        navidromePlaylistId = cachedData.navidromePlaylistId
        lastExportedAt = cachedData.exportedAt
      }

      return {
        id: playlist.id,
        name: playlist.name,
        images: playlist.images,
        owner: { display_name: playlist.owner.display_name },
        tracks: playlist.tracks,
        snapshot_id: playlist.snapshot_id || "",
        isLikedSongs: false,
        selected: selectedIds.has(playlist.id),
        exportStatus,
        navidromePlaylistId,
        lastExportedAt,
      }
    })

    setTableItems(items)
  }, [playlists, navidromePlaylists, selectedIds, trackExportCache])

  useEffect(() => {
    if (isExportingRef.current) {
      return
    }
    const likedSongsItem: PlaylistTableItem = {
      id: LIKED_SONGS_ID,
      name: "Liked Songs",
      images: [{ url: "" }],
      owner: { display_name: "You" },
      tracks: { total: likedSongsCount },
      snapshot_id: "",
      isLikedSongs: true,
      selected: selectedIds.has(LIKED_SONGS_ID),
      exportStatus: "none",
    }

    setTableItems((prev) => {
      const withoutLiked = prev.filter((item) => !item.isLikedSongs)
      return [likedSongsItem, ...withoutLiked]
    })
  }, [likedSongsCount, selectedIds])

  // Sync selectedIds with selectedPlaylistsStats for real-time population
  useEffect(() => {
    if (isExporting) return // Don't update during export to preserve progress data

    const selectedPlaylists: SelectedPlaylist[] = []

    if (selectedIds.has(LIKED_SONGS_ID)) {
      const likedSongsCachedData = trackExportCache.get(LIKED_SONGS_ID)
      const hasCachedExport = likedSongsCachedData?.navidromePlaylistId

      selectedPlaylists.push({
        id: LIKED_SONGS_ID,
        name: "Liked Songs",
        total: likedSongsCount,
        matched: likedSongsCachedData?.statistics.matched ?? 0,
        unmatched: likedSongsCachedData?.statistics.unmatched ?? 0,
        exported: likedSongsCachedData?.statistics.matched ?? 0,
        failed: 0,
        status: hasCachedExport ? "exported" : "pending",
        progress: hasCachedExport ? 100 : 0,
      })
    }

    playlists
      .filter((p) => selectedIds.has(p.id))
      .forEach((p) => {
        const cachedData = trackExportCache.get(p.id)
        const hasCachedExport = cachedData?.navidromePlaylistId

        selectedPlaylists.push({
          id: p.id,
          name: p.name,
          total: p.tracks.total,
          matched: cachedData?.statistics.matched ?? 0,
          unmatched: cachedData?.statistics.unmatched ?? 0,
          exported: cachedData?.statistics.matched ?? 0,
          failed: cachedData?.statistics.unmatched ?? 0,
          status: hasCachedExport ? "exported" : "pending",
          progress: hasCachedExport ? 100 : 0,
        })
      })

    setSelectedPlaylistsStats(selectedPlaylists)

    // Auto-check all selected playlists by default
    if (selectedPlaylists.length > 0) {
      setCheckedPlaylistIds(new Set(selectedPlaylists.map((p) => p.id)))
    }
  }, [selectedIds, playlists, likedSongsCount, isExporting, trackExportCache])

  // Fetch tracks for checked playlists
  useEffect(() => {
    async function fetchTracks() {
      if (!spotify.token) return

      const uncachedIds = Array.from(checkedPlaylistIds).filter(
        (id) => !playlistTracksCache.has(id),
      )
      if (uncachedIds.length === 0) return

      setLoadingTracks(true)
      setLoadingPlaylistIds(new Set(uncachedIds))

      try {
        spotifyClient.setToken(spotify.token)
        const newCache = new Map(playlistTracksCache)

        await Promise.all(
          uncachedIds.map(async (id) => {
            try {
              let tracks
              if (id === LIKED_SONGS_ID) {
                const savedTracks = await spotifyClient.getAllSavedTracks()
                tracks = savedTracks.map((t) => t.track)
              } else {
                const playlistTracks =
                  await spotifyClient.getAllPlaylistTracks(id)
                tracks = playlistTracks.map((t) => t.track)
              }

              const songs: Song[] = tracks.map((track) => ({
                spotifyTrackId: track.id,
                title: track.name,
                album: track.album?.name || "Unknown",
                artist:
                  track.artists?.map((a) => a.name).join(", ") || "Unknown",
                duration: formatDuration(track.duration_ms),
              }))

              newCache.set(id, songs)

              // Remove from loading set as soon as this playlist is done
              setLoadingPlaylistIds((prev) => {
                const updated = new Set(prev)
                updated.delete(id)
                return updated
              })
            } catch (error) {
              console.error(`Failed to fetch tracks for playlist ${id}:`, error)
              newCache.set(id, [])

              // Remove from loading set on error too
              setLoadingPlaylistIds((prev) => {
                const updated = new Set(prev)
                updated.delete(id)
                return updated
              })
            }
          }),
        )

        setPlaylistTracksCache(newCache)
      } catch (error) {
        console.error("Failed to fetch tracks:", error)
      } finally {
        setLoadingTracks(false)
        setLoadingPlaylistIds(new Set())
      }
    }

    fetchTracks()
  }, [checkedPlaylistIds, spotify.token, playlistTracksCache])

  useEffect(() => {
    if (selectedIds.size === 0) return

    const newStatus = new Map<
      string,
      Map<string, "waiting" | "exported" | "failed">
    >()

    selectedIds.forEach((playlistId) => {
      const cachedData = loadPlaylistExportData(playlistId)
      if (cachedData) {
        const playlistStatus = new Map()
        const songs = playlistTracksCache.get(playlistId)
        if (songs) {
          songs.forEach((song) => {
            const trackId = song.spotifyTrackId
            if (cachedData.tracks[trackId]) {
              const cachedStatus = cachedData.tracks[trackId]
              playlistStatus.set(
                trackId,
                cachedStatus.status === "matched" ? "exported" : "failed",
              )
            } else {
              playlistStatus.set(trackId, "waiting")
            }
          })
        }
        newStatus.set(playlistId, playlistStatus)
      }
    })

    if (newStatus.size > 0) {
      setSongExportStatus(newStatus)
    }
  }, [selectedIds, playlistTracksCache])

  const filteredItems = useMemo(() => {
    let result = [...tableItems]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.owner.display_name.toLowerCase().includes(query),
      )
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "tracks":
          comparison = a.tracks.total - b.tracks.total
          break
        case "owner":
          comparison = a.owner.display_name.localeCompare(b.owner.display_name)
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [tableItems, searchQuery, sortColumn, sortDirection])

  const handleSort = (column: "name" | "tracks" | "owner") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const handleToggleSelection = (playlistId: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId)
      } else {
        newSet.add(playlistId)
      }
      return newSet
    })
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)))
    }
  }

  const handleTogglePlaylistCheck = (playlistId: string) => {
    setCheckedPlaylistIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId)
      } else {
        newSet.add(playlistId)
      }
      return newSet
    })
  }

  const handleToggleCheckAllPlaylists = () => {
    if (
      checkedPlaylistIds.size === selectedPlaylistsStats.length &&
      selectedPlaylistsStats.length > 0
    ) {
      setCheckedPlaylistIds(new Set())
    } else {
      setCheckedPlaylistIds(new Set(selectedPlaylistsStats.map((p) => p.id)))
    }
  }

  const createInitialProgressState = (total: number): ProgressState => ({
    phase: "matching",
    progress: { current: 0, total, percent: 0 },
    statistics: { matched: 0, unmatched: 0, exported: 0, failed: 0 },
  })

  const updateProgress = useCallback(
    (state: ProgressState, updates: Partial<ProgressState>): ProgressState => ({
      ...state,
      ...updates,
      progress: { ...state.progress, ...(updates.progress || {}) },
      statistics: { ...state.statistics, ...(updates.statistics || {}) },
    }),
    [],
  )

  const handleStartExport = async () => {
    if (!spotify.isAuthenticated || !spotify.token || !navidrome.credentials) {
      setError("Please connect both Spotify and Navidrome to export playlists.")
      return
    }

    const hasLikedSongs = selectedIds.has(LIKED_SONGS_ID)
    const selectedPlaylists = playlists.filter((p) => selectedIds.has(p.id))
    const itemsToExport: (PlaylistItem | SpotifyPlaylist)[] = []

    if (hasLikedSongs) {
      itemsToExport.push({
        ...LIKED_SONGS_ITEM,
        tracks: { total: likedSongsCount },
      })
    }
    itemsToExport.push(...selectedPlaylists)

    if (itemsToExport.length === 0) {
      return
    }

    isExportingRef.current = true
    setIsExporting(true)
    setShowConfirmation(false)
    setError(null)

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    const signal = abortController.signal

    setSelectedPlaylistsStats(
      itemsToExport.map((item) => ({
        id: item.id,
        name: item.name,
        matched: 0,
        unmatched: 0,
        exported: 0,
        failed: 0,
        total: item.tracks.total,
        status: "pending" as const,
        progress: 0,
      })),
    )
    setCurrentUnmatchedPlaylistId(null)
    setUnmatchedSongs([])

    try {
      spotifyClient.setToken(spotify.token)
      const navidromeClient = new NavidromeApiClient(
        navidrome.credentials.url,
        navidrome.credentials.username,
        navidrome.credentials.password,
        navidrome.token ?? undefined,
        navidrome.clientId ?? undefined,
      )

      const batchMatcher = createBatchMatcher(spotifyClient, navidromeClient)
      const playlistExporter = createPlaylistExporter(navidromeClient)
      const favoritesExporter = createFavoritesExporter(navidromeClient)

      const matcherOptions: BatchMatcherOptions = {
        enableISRC: true,
        enableFuzzy: true,
        enableStrict: true,
        fuzzyThreshold: 0.8,
      }

      for (let i = 0; i < itemsToExport.length; i++) {
        const item = itemsToExport[i]
        let progress = createInitialProgressState(0)
        setProgressState(progress)

        setSongExportStatus((prev) => {
          const newStatus = new Map(prev)
          const playlistStatus = new Map()
          const songs = playlistTracksCache.get(item.id) || []
          songs.forEach((song) => {
            playlistStatus.set(song.spotifyTrackId, "waiting")
          })
          newStatus.set(item.id, playlistStatus)
          return newStatus
        })

        // Update status to 'exporting' at the start of processing each playlist
        setSelectedPlaylistsStats((prev) =>
          prev.map((stat, idx) =>
            idx === i ? { ...stat, status: "exporting" } : stat,
          ),
        )

        let tracks: SpotifyTrack[]
        let isLikedSongs = false
        let cachedData: PlaylistExportData | undefined = undefined
        let useDifferentialMatching = false

        if ("isLikedSongs" in item && item.isLikedSongs) {
          const savedTracks = await spotifyClient.getAllSavedTracks(signal)
          tracks = savedTracks.map((t) => t.track)
          isLikedSongs = true
        } else {
          tracks = (await spotifyClient.getAllPlaylistTracks(item.id, signal)).map(
            (t) => t.track,
          )

          // Check for cached export data
          cachedData = loadPlaylistExportData(item.id)
          const upToDate = cachedData
            ? isPlaylistUpToDate(cachedData, item.snapshot_id || "")
            : false
          const hasNavidromePlaylist = !!cachedData?.navidromePlaylistId
          useDifferentialMatching = hasNavidromePlaylist
        }

        progress = updateProgress(progress, {
          progress: { current: 0, total: tracks.length, percent: 0 },
        })
        setProgressState(progress)

        let matches: TrackMatch[]
        let newTracks: SpotifyTrack[] = []

        if (useDifferentialMatching && cachedData) {
          const result = await batchMatcher.matchTracksDifferential(
            tracks,
            cachedData.tracks,
            { ...matcherOptions, signal },
            async (batchProgress) => {
              progress = updateProgress(progress, {
                phase: "matching",
                currentTrack: batchProgress.currentTrack
                  ? {
                      name: batchProgress.currentTrack.name,
                      artist:
                        batchProgress.currentTrack.artists
                          ?.map((a) => a.name)
                          .join(", ") || "Unknown",
                      index: batchProgress.current - 1,
                      total: batchProgress.total,
                    }
                  : undefined,
                progress: {
                  current: batchProgress.current,
                  total: batchProgress.total,
                  percent: batchProgress.percent,
                },
              })
              setProgressState({ ...progress })
              setSelectedPlaylistsStats((prev) =>
                prev.map((stat, idx) =>
                  idx === i
                    ? {
                        ...stat,
                        progress: batchProgress.percent,
                        matched: batchProgress.matched ?? stat.matched,
                        unmatched: batchProgress.unmatched ?? stat.unmatched,
                      }
                    : stat,
                ),
              )
              if (batchProgress.currentMatch) {
                const match = batchProgress.currentMatch
                setSongExportStatus((prev) => {
                  const newStatus = new Map(prev)
                  const playlistStatus = new Map(prev.get(item.id) || [])
                  if (
                    match.status === "matched" ||
                    match.status === "ambiguous"
                  ) {
                    playlistStatus.set(match.spotifyTrack.id, "exported")
                  } else {
                    playlistStatus.set(match.spotifyTrack.id, "failed")
                  }
                  newStatus.set(item.id, playlistStatus)
                  return newStatus
                })
              }
            },
          )
          matches = result.matches
          newTracks = result.newTracks
        } else {
          matches = (
            await batchMatcher.matchTracks(
              tracks,
              { ...matcherOptions, signal },
              async (batchProgress) => {
                progress = updateProgress(progress, {
                  phase: "matching",
                  currentTrack: batchProgress.currentTrack
                    ? {
                        name: batchProgress.currentTrack.name,
                        artist:
                          batchProgress.currentTrack.artists
                            ?.map((a) => a.name)
                            .join(", ") || "Unknown",
                        index: batchProgress.current - 1,
                        total: batchProgress.total,
                      }
                    : undefined,
                  progress: {
                    current: batchProgress.current,
                    total: batchProgress.total,
                    percent: batchProgress.percent,
                  },
                })
                setProgressState({ ...progress })
                setSelectedPlaylistsStats((prev) =>
                  prev.map((stat, idx) =>
                    idx === i
                      ? {
                          ...stat,
                          progress: batchProgress.percent,
                          matched: batchProgress.matched ?? stat.matched,
                          unmatched: batchProgress.unmatched ?? stat.unmatched,
                        }
                      : stat,
                  ),
                )
                if (batchProgress.currentMatch) {
                  const match = batchProgress.currentMatch
                  setSongExportStatus((prev) => {
                    const newStatus = new Map(prev)
                    const playlistStatus = new Map(prev.get(item.id) || [])
                    if (
                      match.status === "matched" ||
                      match.status === "ambiguous"
                    ) {
                      playlistStatus.set(match.spotifyTrack.id, "exported")
                    } else {
                      playlistStatus.set(match.spotifyTrack.id, "failed")
                    }
                    newStatus.set(item.id, playlistStatus)
                    return newStatus
                  })
                }
              },
            )
          ).matches
          newTracks = tracks
        }

        const statistics = getMatchStatistics(matches)

        setSelectedPlaylistsStats((prev) =>
          prev.map((stat, idx) =>
            idx === i
              ? {
                  ...stat,
                  status: "exporting",
                  matched: statistics.matched,
                  unmatched: statistics.unmatched,
                }
              : stat,
          ),
        )

        // Save track status to cache after matching
        if (!isLikedSongs) {
          const tracksData: Record<string, TrackExportStatus> = {}
          let matchedCount = 0
          let unmatchedCount = 0
          let ambiguousCount = 0

          if (!useDifferentialMatching && cachedData) {
            tracks.forEach((track, index) => {
              const match = matches[index]
              if (match) {
                const status: TrackExportStatus = {
                  spotifyTrackId: track.id,
                  navidromeSongId: match.navidromeSong?.id,
                  status: match.status,
                  matchStrategy: match.matchStrategy,
                  matchScore: match.matchScore,
                  matchedAt: new Date().toISOString(),
                }
                tracksData[track.id] = status

                if (match.status === "matched") {
                  matchedCount++
                } else if (match.status === "ambiguous") {
                  ambiguousCount++
                } else {
                  unmatchedCount++
                }
              }
            })
          } else if (useDifferentialMatching && cachedData) {
            Object.keys(cachedData.tracks).forEach((spotifyTrackId) => {
              tracksData[spotifyTrackId] = cachedData.tracks[spotifyTrackId]
              const cachedStatus = cachedData.tracks[spotifyTrackId]
              if (cachedStatus.status === "matched") {
                matchedCount++
              } else if (cachedStatus.status === "ambiguous") {
                ambiguousCount++
              } else {
                unmatchedCount++
              }
            })
            newTracks.forEach((track) => {
              const match = matches.find((m) => m.spotifyTrack.id === track.id)
              if (match) {
                const status: TrackExportStatus = {
                  spotifyTrackId: track.id,
                  navidromeSongId: match.navidromeSong?.id,
                  status: match.status,
                  matchStrategy: match.matchStrategy,
                  matchScore: match.matchScore,
                  matchedAt: new Date().toISOString(),
                }
                tracksData[track.id] = status
                if (match.status === "matched") {
                  matchedCount++
                } else if (match.status === "ambiguous") {
                  ambiguousCount++
                } else {
                  unmatchedCount++
                }
              }
            })
          }

          const playlistData: PlaylistExportData = {
            spotifyPlaylistId: item.id,
            spotifySnapshotId: item.snapshot_id || "",
            playlistName: item.name,
            navidromePlaylistId: cachedData?.navidromePlaylistId,
            exportedAt: new Date().toISOString(),
            trackCount: tracks.length,
            tracks: tracksData,
            statistics: {
              total: tracks.length,
              matched: matchedCount,
              unmatched: unmatchedCount,
              ambiguous: ambiguousCount,
            },
          }

          savePlaylistExportData(item.id, playlistData)
          setTrackExportCache((prev) =>
            new Map(prev).set(item.id, playlistData),
          )
        }

        const unmatchedSongsList: UnmatchedSong[] = matches
          .filter((m: TrackMatch) => m.status === "unmatched")
          .map((m: TrackMatch) => ({
            title: m.spotifyTrack.name,
            album: m.spotifyTrack.album?.name || "Unknown",
            artist:
              m.spotifyTrack.artists?.map((a) => a.name).join(", ") ||
              "Unknown",
            duration: formatDuration(m.spotifyTrack.duration_ms),
          }))

        setCurrentUnmatchedPlaylistId(item.id)
        setUnmatchedSongs(unmatchedSongsList)

        progress = updateProgress(progress, {
          phase: "exporting",
          progress: { current: 0, total: matches.length, percent: 0 },
        })
        setProgressState(progress)

        let exportResultData: {
          statistics: {
            total: number
            starred: number
            skipped: number
            failed: number
          }
        }

        if (isLikedSongs) {
          const result = await favoritesExporter.exportFavorites(matches, {
            skipUnmatched: false,
            signal,
            onProgress: async (exportProgress) => {
              progress = updateProgress(progress, {
                phase:
                  exportProgress.status === "completed"
                    ? "completed"
                    : "exporting",
                progress: {
                  current: exportProgress.current,
                  total: exportProgress.total,
                  percent: exportProgress.percent,
                },
                statistics: {
                  matched: statistics.matched,
                  unmatched: statistics.unmatched + statistics.ambiguous,
                  exported: exportProgress.current,
                  failed: 0,
                },
              })
              setProgressState({ ...progress })
              setSelectedPlaylistsStats((prev) =>
                prev.map((stat, idx) =>
                  idx === i
                    ? {
                        ...stat,
                        progress: exportProgress.percent,
                        exported: exportProgress.current,
                        matched: statistics.matched,
                        unmatched: statistics.unmatched + statistics.ambiguous,
                      }
                    : stat,
                ),
              )
            },
          })

          exportResultData = {
            statistics: {
              total: result.statistics.total,
              starred: result.statistics.starred,
              skipped: result.statistics.skipped,
              failed: result.statistics.failed,
            },
          }

          // Update cache for favorites export
          if (cachedData) {
            const updatedCache: PlaylistExportData = {
              ...cachedData,
              exportedAt: new Date().toISOString(),
            }
            savePlaylistExportData(item.id, updatedCache)
            setTrackExportCache((prev) =>
              new Map(prev).set(item.id, updatedCache),
            )
          }

          if (i === itemsToExport.length - 1) {
            setShowSuccess(true)
            setTimeout(() => {
              setShowSuccess(false)
            }, 5000)
            handleCancelExport()
          }
        } else {
          const exporterOptions: PlaylistExporterOptions = {
            mode:
              useDifferentialMatching && cachedData?.navidromePlaylistId
                ? "update"
                : "create",
            existingPlaylistId: cachedData?.navidromePlaylistId,
            skipUnmatched: false,
            cachedData: useDifferentialMatching ? cachedData : undefined,
            signal,
            onProgress: async (exportProgress) => {
              progress = updateProgress(progress, {
                phase:
                  exportProgress.status === "completed"
                    ? "completed"
                    : "exporting",
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
              })
              setProgressState({ ...progress })
              setSelectedPlaylistsStats((prev) =>
                prev.map((stat, idx) =>
                  idx === i
                    ? {
                        ...stat,
                        progress: exportProgress.percent,
                        exported: exportProgress.current,
                        matched: statistics.matched,
                        unmatched: statistics.unmatched,
                      }
                    : stat,
                ),
              )
            },
          }

          const result = await playlistExporter.exportPlaylist(
            item.name,
            matches,
            exporterOptions,
          )

          exportResultData = {
            statistics: {
              total: result.statistics.total,
              starred: result.statistics.exported,
              skipped: result.statistics.skipped,
              failed: result.statistics.failed,
            },
          }

          // Update cache with final export data
          if (result.playlistId) {
            const tracksData: Record<string, TrackExportStatus> = {}

            let matchedCount = 0
            let unmatchedCount = 0
            let ambiguousCount = 0

            matches.forEach((match) => {
              const track = match.spotifyTrack
              const isFromCache =
                cachedData?.tracks[track.id] &&
                !newTracks.some((t) => t.id === track.id)

              if (isFromCache && cachedData) {
                tracksData[track.id] = cachedData.tracks[track.id]
                const cachedStatus = cachedData.tracks[track.id]
                if (cachedStatus.status === "matched") {
                  matchedCount++
                } else if (cachedStatus.status === "ambiguous") {
                  ambiguousCount++
                } else {
                  unmatchedCount++
                }
              } else {
                tracksData[track.id] = {
                  spotifyTrackId: track.id,
                  navidromeSongId: match.navidromeSong?.id,
                  status: match.status,
                  matchStrategy: match.matchStrategy,
                  matchScore: match.matchScore,
                  matchedAt: new Date().toISOString(),
                }

                if (match.status === "matched") {
                  matchedCount++
                } else if (match.status === "ambiguous") {
                  ambiguousCount++
                } else {
                  unmatchedCount++
                }
              }
            })

            const updatedCache: PlaylistExportData = {
              spotifyPlaylistId: item.id,
              spotifySnapshotId: item.snapshot_id || "",
              playlistName: item.name,
              navidromePlaylistId: result.playlistId,
              exportedAt: new Date().toISOString(),
              trackCount: tracks.length,
              tracks: tracksData,
              statistics: {
                total: tracks.length,
                matched: matchedCount,
                unmatched: unmatchedCount,
                ambiguous: ambiguousCount,
              },
            }
            savePlaylistExportData(item.id, updatedCache)
            setTrackExportCache((prev) =>
              new Map(prev).set(item.id, updatedCache),
            )
          }
        }

        setSelectedPlaylistsStats((prev) =>
          prev.map((stat, idx) =>
            idx === i
              ? {
                  ...stat,
                  status: "exported",
                  progress: 100,
                  exported: exportResultData.statistics.starred,
                  failed: exportResultData.statistics.failed,
                }
              : stat,
          ),
        )

        if (i === itemsToExport.length - 1) {
          setShowSuccess(true)
          setTimeout(() => {
            setShowSuccess(false)
          }, 5000)
          isExportingRef.current = false
          setIsExporting(false)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Export failed"

      if (err instanceof DOMException && err.name === 'AbortError') {
        setShowCancel(true)
        setTimeout(() => {
          setShowCancel(false)
        }, 3000)
      } else {
        setError(errorMessage)
        setProgressState({
          phase: "error",
          progress: { current: 0, total: 0, percent: 0 },
          statistics: { matched: 0, unmatched: 0, exported: 0, failed: 0 },
          error: errorMessage,
        })
      }
    } finally {
      isExportingRef.current = false
      setIsExporting(false)
      abortControllerRef.current = null
    }
  }

  const handleCancelExport = () => {
    if (isExportingRef.current) {
      setShowCancelConfirmation(true)
    }
  }

  const handleConfirmCancel = () => {
    abortControllerRef.current?.abort()
    isExportingRef.current = false
    setIsExporting(false)
    setProgressState({
      phase: "cancelled",
      progress: { current: 0, total: 0, percent: 0 },
      statistics: { matched: 0, unmatched: 0, exported: 0, failed: 0 },
    })
    setSelectedPlaylistsStats([])
    setCurrentUnmatchedPlaylistId(null)
    setUnmatchedSongs([])
    setSongExportStatus(new Map())
    setShowCancelConfirmation(false)
  }

  const handleCloseCancelConfirmation = () => {
    setShowCancelConfirmation(false)
  }

  const handlePlaylistClick = (id: string) => {
    const stats = selectedPlaylistsStats.find((s) => s.id === id)
    if (stats) {
      setCurrentUnmatchedPlaylistId(id)
    }
  }

  const confirmationPlaylists: PlaylistInfo[] = useMemo(() => {
    const result: PlaylistInfo[] = []

    if (selectedIds.has(LIKED_SONGS_ID)) {
      result.push({ name: "Liked Songs", trackCount: likedSongsCount })
    }

    playlists
      .filter((p) => selectedIds.has(p.id))
      .forEach((p) => {
        result.push({ name: p.name, trackCount: p.tracks.total })
      })

    return result
  }, [selectedIds, likedSongsCount, playlists])

  const playlistGroups: PlaylistGroup[] = useMemo(() => {
    return selectedPlaylistsStats
      .filter((p) => checkedPlaylistIds.has(p.id))
      .map((playlist) => {
        const songs = playlistTracksCache.get(playlist.id) || []
        const statusMap = songExportStatus.get(playlist.id)
        const songsWithStatus = songs.map((song) => ({
          ...song,
          exportStatus: statusMap?.get(song.spotifyTrackId) || "waiting",
        }))
        return {
          playlistId: playlist.id,
          playlistName: playlist.name,
          songs: songsWithStatus,
          isLoading: loadingPlaylistIds.has(playlist.id),
        }
      })
  }, [
    selectedPlaylistsStats,
    checkedPlaylistIds,
    playlistTracksCache,
    loadingPlaylistIds,
    songExportStatus,
  ])

  const fixedExportButton = (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        {/* Logo and Project Name - Left Side */}
        <div className="flex items-center gap-3">
          <Image
            src={NavispotLogo}
            alt="NaviSpot Logo"
            height={100}
            width={100}
            className="h-8 w-8"
          />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hidden sm:inline uppercase">
            NaviSpot
          </span>
        </div>

        {/* Export Button - Right Side */}
        <button
          onClick={
            isExporting ? handleCancelExport : () => setShowConfirmation(true)
          }
          disabled={!isExporting && selectedIds.size === 0}
          className={`rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg hover:shadow-xl ${
            isExporting
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {isExporting
            ? "Cancel Export"
            : `Export Selected (${selectedIds.size})`}
        </button>
      </div>
    </div>
  )

  const selectedPlaylistsSection = (
    <SelectedPlaylistsPanel
      selectedPlaylists={selectedPlaylistsStats}
      onPlaylistClick={handlePlaylistClick}
      currentPlaylistId={currentUnmatchedPlaylistId}
      isExporting={isExporting}
      checkedPlaylistIds={checkedPlaylistIds}
      onToggleCheck={handleTogglePlaylistCheck}
      onToggleCheckAll={handleToggleCheckAllPlaylists}
      statistics={{
        matched: selectedPlaylistsStats.reduce((sum, s) => sum + s.matched, 0),
        unmatched: selectedPlaylistsStats.reduce(
          (sum, s) => sum + s.unmatched,
          0,
        ),
        total: selectedPlaylistsStats.reduce((sum, s) => sum + s.total, 0),
        failed: selectedPlaylistsStats.reduce((sum, s) => sum + s.failed, 0),
      }}
    />
  )

  const songsSection = (
    <SongsPanel playlistGroups={playlistGroups} isLoading={loadingTracks} />
  )

  const mainTableSection = (
    <PlaylistTable
      items={filteredItems}
      likedSongsCount={likedSongsCount}
      selectedIds={selectedIds}
      onToggleSelection={handleToggleSelection}
      onToggleSelectAll={handleToggleSelectAll}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSort={handleSort}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      isExporting={isExporting}
      onRefresh={handleRefreshPlaylists}
      isRefreshing={refreshing}
      loading={loading}
    />
  )

  if (!spotify.isAuthenticated) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500">
          Please connect your Spotify account to view playlists.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  if (playlists.length === 0 && likedSongsCount === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-gray-500">No playlists or saved tracks found.</p>
      </div>
    )
  }

  const successToast = showSuccess && (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="flex items-center gap-3 rounded-lg bg-green-500 px-4 py-3 text-white shadow-lg">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-sm font-medium">
          Export completed successfully!
        </span>
        <button
          onClick={() => setShowSuccess(false)}
          className="ml-2 text-white/80 hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )

  const cancelToast = showCancel && (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="flex items-center gap-3 rounded-lg bg-yellow-500 px-4 py-3 text-white shadow-lg">
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <span className="text-sm font-medium">
          Export was cancelled
        </span>
        <button
          onClick={() => setShowCancel(false)}
          className="ml-2 text-white/80 hover:text-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {successToast}
      {cancelToast}
      <CancelConfirmationDialog
        isOpen={showCancelConfirmation}
        onClose={handleCloseCancelConfirmation}
        onConfirm={handleConfirmCancel}
      />
      <ConfirmationPopup
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleStartExport}
        playlists={confirmationPlaylists}
      />
      
      <ExportLayoutManager
        selectedPlaylistsSection={selectedPlaylistsSection}
        unmatchedSongsSection={songsSection}
        mainTableSection={mainTableSection}
        fixedExportButton={fixedExportButton}
      />
    </div>
  )
}
