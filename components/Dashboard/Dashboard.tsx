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
import { SettingsModal } from "@/components/Dashboard/SettingsModal"
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
import { incrementExportCount, shouldShowSupportBubble } from "@/lib/support/export-tracker"
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
  DashboardLayout,
  loadDashboardLayout,
  saveDashboardLayout,
} from "@/lib/layout/dashboard-layout"
import {
  loadForceExportPlaylists,
  saveForceExportPlaylists,
} from "@/lib/settings/export-settings"
import {
  loadPlaylistExportData,
  savePlaylistExportData,
  getAllExportData,
  isPlaylistUpToDate,
  deletePlaylistExportData,
  type PlaylistExportData,
  type TrackExportStatus,
} from "@/lib/export/track-export-cache"
import { PlaylistTableItem, PlaylistInfo } from "@/types/playlist-table"
import { TrackMatch } from "@/types/matching"
import { ImportedPlaylist } from "@/types/public-playlist"
import { useToast } from "@/components/Toast"
import { getJSON, setJSON } from "@/lib/storage"
import Image from "next/image"
import NavispotLogo from "@/public/navispot.png"

const LIKED_SONGS_ID = "liked-songs"
const IMPORTED_STORAGE_KEY = "navispot_imported_public_playlists"

type ExportableItem =
  | PlaylistItem
  | SpotifyPlaylist
  | (ImportedPlaylist & { isImported: true; items: { total: number } })

interface PlaylistItem {
  id: string
  name: string
  description?: string
  images: { url: string }[]
  owner: { id: string; display_name: string }
  items: { total: number }
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
  items: { total: 0 },
  isLikedSongs: true,
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function Dashboard() {
  const { spotify, navidrome, spotifyLogout, setSkipSpotify } = useAuth()
  const toast = useToast()
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [tableItems, setTableItems] = useState<PlaylistTableItem[]>([])
  const [importedPlaylists, setImportedPlaylists] = useState<ImportedPlaylist[]>(() =>
    getJSON<ImportedPlaylist[]>(IMPORTED_STORAGE_KEY, []),
  )
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
  const [showSettings, setShowSettings] = useState(false)
  const [layout, setLayout] = useState<DashboardLayout>(() =>
    loadDashboardLayout(),
  )
  const [forceExportPlaylists, setForceExportPlaylists] = useState<boolean>(() =>
    loadForceExportPlaylists(),
  )
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
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false)
  const [ownerFilter, setOwnerFilter] = useState("")
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "public" | "private">("all")
  const [dateAfterFilter, setDateAfterFilter] = useState("")
  const [dateBeforeFilter, setDateBeforeFilter] = useState("")
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
  const [playlistCreatedDates, setPlaylistCreatedDates] = useState<Map<string, string>>(new Map())
  const [fetchingDates, setFetchingDates] = useState(false)
  const [datesLoadedCount, setDatesLoadedCount] = useState(0)

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

  useEffect(() => {
    setJSON(IMPORTED_STORAGE_KEY, importedPlaylists)
  }, [importedPlaylists])

  const handlePlaylistImported = useCallback((playlist: ImportedPlaylist) => {
    setImportedPlaylists((prev) => {
      const filtered = prev.filter((p) => p.id !== playlist.id)
      return [...filtered, playlist]
    })
  }, [])

  const [importingUrl, setImportingUrl] = useState(false)

  const handleImportFromUrl = useCallback(
    async (url: string): Promise<boolean> => {
      setImportingUrl(true)
      try {
        const res = await fetch("/api/spotify/public-playlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.showError(data?.error?.message ?? `Request failed (${res.status})`)
          return false
        }
        const playlist: ImportedPlaylist = data.playlist
        setImportedPlaylists((prev) => {
          const filtered = prev.filter((p) => p.id !== playlist.id)
          return [...filtered, playlist]
        })
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.add(playlist.id)
          return next
        })
        toast.showSuccess(`Imported "${playlist.name}" (${playlist.trackCount} tracks)`)
        return true
      } catch (err) {
        toast.showError(err instanceof Error ? err.message : "Network error")
        return false
      } finally {
        setImportingUrl(false)
      }
    },
    [toast],
  )

  const handleLogout = useCallback(async () => {
    try {
      if (spotify.isAuthenticated) {
        await spotifyLogout()
      }
    } catch (err) {
      console.error("Spotify logout failed:", err)
    }
    setSkipSpotify(false)
    toast.showInfo("Signed out")
  }, [spotify.isAuthenticated, spotifyLogout, setSkipSpotify, toast])

  const handleClearImported = useCallback(() => {
    const count = importedPlaylists.length
    setImportedPlaylists([])
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const p of importedPlaylists) next.delete(p.id)
      return next
    })
    if (count > 0) {
      toast.showSuccess(`Cleared ${count} imported ${count === 1 ? "playlist" : "playlists"}`)
    }
  }, [importedPlaylists, toast])

  const handleRefreshPlaylists = async () => {
    setRefreshing(true)
    setError(null)

    try {
      if (spotify.isAuthenticated && spotify.token) {
        spotifyClient.setToken(spotify.token)

        // Capture old track counts AND snapshot IDs for comparison
        const oldTrackCounts = new Map(
          playlists.map(p => [p.id, p.items.total])
        )
        const oldSnapshots = new Map(
          playlists.map(p => [p.id, p.snapshot_id])
        )

        const fetchedPlaylists = await spotifyClient.getAllPlaylists(undefined, true)

        // Compare both track counts AND snapshot IDs - playlist changed if either is different
        const changedPlaylistIds = fetchedPlaylists
          .filter(p => oldSnapshots.has(p.id))
          .filter(p => {
            const trackCountChanged = oldTrackCounts.get(p.id) !== p.items.total
            const snapshotChanged = oldSnapshots.get(p.id) !== p.snapshot_id
            return trackCountChanged || snapshotChanged
          })
          .map(p => p.id)

        if (changedPlaylistIds.length > 0) {
          setPlaylistTracksCache(prev => {
            const newCache = new Map(prev)
            changedPlaylistIds.forEach(id => newCache.delete(id))
            return newCache
          })
        }

        setPlaylists(fetchedPlaylists)

        try {
          const count = await spotifyClient.getSavedTracksCount(undefined, true)
          setLikedSongsCount(count)
        } catch {
          setLikedSongsCount(0)
        }
      }

      // Re-fetch each imported playlist to pick up the latest tracks/metadata
      if (importedPlaylists.length > 0) {
        const updated: ImportedPlaylist[] = []
        for (const existing of importedPlaylists) {
          try {
            const res = await fetch("/api/spotify/public-playlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: `https://open.spotify.com/playlist/${existing.id}`,
              }),
            })
            if (res.ok) {
              const data = await res.json()
              updated.push(data.playlist as ImportedPlaylist)
            } else {
              updated.push(existing)
            }
          } catch {
            updated.push(existing)
          }
        }
        setImportedPlaylists(updated)
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
    const playlistItems: PlaylistTableItem[] = playlists.map((playlist) => {
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
        items: playlist.items,
        snapshot_id: playlist.snapshot_id || "",
        isLikedSongs: false,
        selected: selectedIds.has(playlist.id),
        exportStatus,
        navidromePlaylistId,
        lastExportedAt,
        public: playlist.public,
        createdAt: playlistCreatedDates.get(playlist.id),
      }
    })

    const importedItems: PlaylistTableItem[] = importedPlaylists.map((p) => {
      const cachedData = trackExportCache.get(p.id)
      return {
        id: p.id,
        name: p.name,
        images: p.imageUrl ? [{ url: p.imageUrl }] : [],
        owner: { display_name: p.owner },
        items: { total: p.trackCount },
        snapshot_id: "",
        isLikedSongs: false,
        selected: selectedIds.has(p.id),
        exportStatus: cachedData?.exportedAt ? "exported" : "none",
        navidromePlaylistId: cachedData?.navidromePlaylistId,
        lastExportedAt: cachedData?.exportedAt,
        isImported: true,
        trackCount: p.trackCount,
      }
    })

    const allItems = [...playlistItems, ...importedItems]
    setTableItems(allItems)
  }, [playlists, navidromePlaylists, selectedIds, likedSongsCount, trackExportCache, playlistCreatedDates, importedPlaylists])

  // Background fetch of playlist created dates (earliest added_at)
  // Fetches progressively — updates state after each playlist for immediate UI feedback
  // Caches dates in localStorage to avoid re-fetching on every page load
  useEffect(() => {
    if (!spotify.isAuthenticated || !spotify.token || playlists.length === 0) return

    const CACHE_KEY = 'navispot-playlist-created-dates'
    let cancelled = false

    // Load cached dates from localStorage
    function loadCachedDates(): Map<string, string> {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as Record<string, string>
          return new Map(Object.entries(parsed))
        }
      } catch {
        // Ignore parse errors
      }
      return new Map()
    }

    // Save dates to localStorage
    function saveCachedDates(dates: Map<string, string>) {
      try {
        const obj: Record<string, string> = {}
        dates.forEach((v, k) => { obj[k] = v })
        localStorage.setItem(CACHE_KEY, JSON.stringify(obj))
      } catch {
        // Ignore storage errors
      }
    }

    async function fetchDates() {
      // First, load any cached dates
      const cachedDates = loadCachedDates()
      if (cachedDates.size > 0) {
        setPlaylistCreatedDates(cachedDates)
        setDatesLoadedCount(cachedDates.size)
      }

      // Find playlists that still need dates
      const currentDates = cachedDates.size > 0 ? cachedDates : playlistCreatedDates
      const missingIds = playlists
        .filter((p) => !currentDates.has(p.id))
        .map((p) => p.id)

      if (missingIds.length === 0) return

      setFetchingDates(true)
      try {
        spotifyClient.setToken(spotify.token!)

        const CONCURRENCY = 3
        for (let i = 0; i < missingIds.length; i += CONCURRENCY) {
          if (cancelled) break

          const batch = missingIds.slice(i, i + CONCURRENCY)
          const results = await Promise.all(
            batch.map(async (playlistId) => {
              try {
                const createdDate = await spotifyClient.getPlaylistCreatedDate(playlistId)
                return { playlistId, createdDate }
              } catch {
                return { playlistId, createdDate: undefined }
              }
            })
          )

          if (!cancelled) {
            const newDatesInBatch = results.filter(r => r.createdDate).length
            setPlaylistCreatedDates((prev: Map<string, string>) => {
              const next = new Map(prev)
              for (const { playlistId, createdDate } of results) {
                if (createdDate) {
                  next.set(playlistId, createdDate)
                }
              }
              saveCachedDates(next)
              return next
            })
            setDatesLoadedCount(prev => prev + newDatesInBatch)
          }
        }

      } catch (err) {
        console.warn("Failed to fetch playlist created dates:", err)
      } finally {
        if (!cancelled) setFetchingDates(false)
      }
    }

    fetchDates()
    return () => { cancelled = true }
  }, [spotify.isAuthenticated, spotify.token, playlists])

  // Sync selectedIds with selectedPlaylistsStats for real-time population.
  // Triggered when the user checks/unchecks a row in the main table — the
  // corresponding playlist appears in the Selected Playlists panel (auto-checked)
  // and its tracks become available in the Songs panel.
  useEffect(() => {
    if (isExporting) return // Don't update during export to preserve progress data

    const selectedPlaylists: SelectedPlaylist[] = []

    playlists
      .filter((p) => selectedIds.has(p.id))
      .forEach((p) => {
        const cachedData = trackExportCache.get(p.id)
        const hasCachedExport = !!cachedData?.navidromePlaylistId

        selectedPlaylists.push({
          id: p.id,
          name: p.name,
          total: p.items.total,
          matched: cachedData?.statistics.matched ?? 0,
          unmatched: cachedData?.statistics.unmatched ?? 0,
          exported: cachedData?.statistics.matched ?? 0,
          failed: cachedData?.statistics.unmatched ?? 0,
          status: hasCachedExport ? "exported" : "pending",
          progress: hasCachedExport ? 100 : 0,
        })
      })

    for (const p of importedPlaylists) {
      if (!selectedIds.has(p.id)) continue
      const cachedData = trackExportCache.get(p.id)
      const hasCachedExport = !!cachedData?.navidromePlaylistId

      selectedPlaylists.push({
        id: p.id,
        name: p.name,
        total: p.trackCount,
        matched: cachedData?.statistics.matched ?? 0,
        unmatched: cachedData?.statistics.unmatched ?? 0,
        exported: cachedData?.statistics.matched ?? 0,
        failed: cachedData?.statistics.unmatched ?? 0,
        status: hasCachedExport ? "exported" : "pending",
        progress: hasCachedExport ? 100 : 0,
      })
    }

    setSelectedPlaylistsStats(selectedPlaylists)

    // Auto-check all selected playlists by default
    if (selectedPlaylists.length > 0) {
      setCheckedPlaylistIds(new Set(selectedPlaylists.map((p) => p.id)))
    }
  }, [selectedIds, playlists, importedPlaylists, isExporting, trackExportCache])

  // Fetch tracks for checked playlists
  // Fetch tracks for checked Spotify-owned playlists that aren't cached.
  // Imported playlists already have their tracks in memory (importedPlaylists),
  // so we skip them here and source directly in playlistGroups below.
  useEffect(() => {
    async function fetchTracks() {
      if (!spotify.token) return

      const importedIds = new Set(importedPlaylists.map((p) => p.id))
      const uncachedIds = Array.from(checkedPlaylistIds).filter(
        (id) => !playlistTracksCache.has(id) && !importedIds.has(id),
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
              const playlistTracks = await spotifyClient.getAllPlaylistTracks(id)
              const tracks = playlistTracks.map((t) => t.track)

              const songs: Song[] = tracks.filter((t) => t != null).map((track) => ({
                spotifyTrackId: track.id,
                title: track.name,
                album: track.album?.name || "Unknown",
                artist:
                  track.artists?.map((a) => a.name).join(", ") || "Unknown",
                duration: formatDuration(track.duration_ms),
              }))

              newCache.set(id, songs)
            } catch (error) {
              console.error(`Failed to fetch tracks for playlist ${id}:`, error)
              newCache.set(id, [])
            } finally {
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
        if (loadingPlaylistIds.size > 0) {
          setLoadingPlaylistIds(new Set())
        }
      }
    }

    fetchTracks()
  }, [checkedPlaylistIds, spotify.token, playlistTracksCache, importedPlaylists, loadingPlaylistIds])

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

  // Compute unique owners from all playlists for the filter dropdown
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>()
    tableItems.forEach((item) => {
      if (!item.isLikedSongs) {
        owners.add(item.owner.display_name)
      }
    })
    return Array.from(owners).sort((a, b) => a.localeCompare(b))
  }, [tableItems])

  // Track whether any filters are active (for clear-all button)
  const hasActiveFilters = ownerFilter !== "" || visibilityFilter !== "all" || dateAfterFilter !== "" || dateBeforeFilter !== ""

  const clearAllFilters = useCallback(() => {
    setOwnerFilter("")
    setVisibilityFilter("all")
    setDateAfterFilter("")
    setDateBeforeFilter("")
  }, [])

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

    // Owner filter
    if (ownerFilter) {
      result = result.filter(
        (item) => item.owner.display_name === ownerFilter,
      )
    }

    // Visibility filter (public/private)
    if (visibilityFilter !== "all") {
      result = result.filter((item) => {
        if (item.isLikedSongs) return visibilityFilter === "private"
        if (visibilityFilter === "public") return item.public === true
        if (visibilityFilter === "private") return item.public === false || item.public === null
        return true
      })
    }

    // Date filters (created date)
    if (dateAfterFilter) {
      const afterDate = new Date(dateAfterFilter)
      result = result.filter((item) => {
        if (!item.createdAt) return false
        return new Date(item.createdAt) >= afterDate
      })
    }

    if (dateBeforeFilter) {
      const beforeDate = new Date(dateBeforeFilter)
      // Set to end of day
      beforeDate.setHours(23, 59, 59, 999)
      result = result.filter((item) => {
        if (!item.createdAt) return false
        return new Date(item.createdAt) <= beforeDate
      })
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "tracks":
          comparison = a.items.total - b.items.total
          break
        case "owner":
          comparison = a.owner.display_name.localeCompare(b.owner.display_name)
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [tableItems, searchQuery, sortColumn, sortDirection, ownerFilter, visibilityFilter, dateAfterFilter, dateBeforeFilter, playlistCreatedDates])

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
    if (!navidrome.credentials) {
      setError("Please connect Navidrome to export playlists.")
      return
    }
    const needsSpotify = selectedIds.has(LIKED_SONGS_ID) || playlists.some((p) => selectedIds.has(p.id))
    if (needsSpotify && (!spotify.isAuthenticated || !spotify.token)) {
      setError("Please connect Spotify to export your own playlists.")
      return
    }

    const hasLikedSongs = selectedIds.has(LIKED_SONGS_ID)
    const selectedPlaylists = playlists.filter((p) => selectedIds.has(p.id))
    const selectedImported = importedPlaylists.filter((p) => selectedIds.has(p.id))
    const itemsToExport: ExportableItem[] = []

    if (hasLikedSongs) {
      itemsToExport.push({
        ...LIKED_SONGS_ITEM,
        items: { total: likedSongsCount },
      })
    }
    itemsToExport.push(...selectedPlaylists)
    for (const p of selectedImported) {
      itemsToExport.push({ ...p, isImported: true, items: { total: p.trackCount } })
    }

    if (itemsToExport.length === 0) {
      return
    }

    isExportingRef.current = true
    setIsExporting(true)
    setShowConfirmation(false)
    setError(null)

    const newCount = incrementExportCount()
    if (newCount >= 5 && shouldShowSupportBubble()) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("navispot-show-support"))
      }, 1500)
    }

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
        total: "items" in item ? item.items.total : (item as ImportedPlaylist).trackCount,
        status: "pending" as const,
        progress: 0,
      })),
    )
    setCurrentUnmatchedPlaylistId(null)
    setUnmatchedSongs([])

    try {
      if (spotify.token) {
        spotifyClient.setToken(spotify.token)
      }
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
        const itemSnapshotId = "snapshot_id" in item ? (item.snapshot_id || "") : ""
        let progress = createInitialProgressState(0)
        setProgressState(progress)

        setSongExportStatus((prev) => {
          const newStatus = new Map(prev)
          const playlistStatus = new Map()
          let songs: Song[] = playlistTracksCache.get(item.id) || []
          if (songs.length === 0 && "isImported" in item && item.isImported) {
            songs = item.tracks.map((t) => ({
              spotifyTrackId: t.id,
              title: t.name,
              artist: t.artists.map((a) => a.name).join(", "),
              album: t.album.name,
              duration: formatDuration(t.duration_ms),
            }))
          }
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
          tracks = savedTracks.map((t) => t.track).filter((t) => t != null)
          isLikedSongs = true

          // Check for cached export data (favorites have no navidromePlaylistId,
          // so differential matching engages purely on cache presence)
          cachedData = loadPlaylistExportData(item.id)
          useDifferentialMatching = !forceExportPlaylists && !!cachedData?.exportedAt
        } else if ("isImported" in item && item.isImported) {
          tracks = item.tracks
          isLikedSongs = false
          cachedData = loadPlaylistExportData(item.id)
          useDifferentialMatching = false
        } else {
          tracks = (await spotifyClient.getAllPlaylistTracks(item.id, signal)).map(
            (t) => t.track,
          ).filter((t) => t != null)

          // Check for cached export data
          cachedData = loadPlaylistExportData(item.id)
          const upToDate = cachedData
            ? isPlaylistUpToDate(cachedData, itemSnapshotId)
            : false
          const hasNavidromePlaylist = !!cachedData?.navidromePlaylistId
          useDifferentialMatching = !forceExportPlaylists && hasNavidromePlaylist
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
            spotifySnapshotId: itemSnapshotId,
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

          // Persist full export cache for liked songs (mirrors regular
          // playlist branch but with no navidromePlaylistId since favorites
          // are starred individually rather than collected into a playlist)
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
            spotifySnapshotId: "",
            playlistName: item.name,
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

          if (i === itemsToExport.length - 1) {
            toast.showSuccess("Export completed successfully!")
            isExportingRef.current = false
            setIsExporting(false)
          }
        } else {
          const forceCreate = forceExportPlaylists
          const exporterOptions: PlaylistExporterOptions = {
            mode:
              !forceCreate && useDifferentialMatching && cachedData?.navidromePlaylistId
                ? "update"
                : "create",
            existingPlaylistId:
              !forceCreate ? cachedData?.navidromePlaylistId : undefined,
            skipUnmatched: false,
            cachedData:
              !forceCreate && useDifferentialMatching ? cachedData : undefined,
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
              spotifySnapshotId: itemSnapshotId,
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
          toast.showSuccess("Export completed successfully!")
          isExportingRef.current = false
          setIsExporting(false)
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Export failed"

      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.showWarning("Export was cancelled")
      } else {
        setError(errorMessage)
        setProgressState({
          phase: "error",
          progress: { current: 0, total: 0, percent: 0 },
          statistics: { matched: 0, unmatched: 0, exported: 0, failed: 0 },
          error: errorMessage,
        })
        toast.showError(errorMessage)
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

  // Invoked by SettingsModal after a successful "Remove all favorites"
  // (or any operation that mutates the actual Navidrome favorites state
  // out-of-band). Clears the Liked Songs export cache so the next export
  // re-matches and re-stars from scratch instead of skipping tracks the
  // diff matcher still believes are matched.
  const handleLikedSongsCacheInvalidated = useCallback(() => {
    deletePlaylistExportData(LIKED_SONGS_ID)
    setTrackExportCache((prev) => {
      if (!prev.has(LIKED_SONGS_ID)) return prev
      const next = new Map(prev)
      next.delete(LIKED_SONGS_ID)
      return next
    })
  }, [])

  const handleLayoutChange = useCallback((next: DashboardLayout) => {
    setLayout(next)
    saveDashboardLayout(next)
  }, [])

  const handleForceExportChange = useCallback((enabled: boolean) => {
    setForceExportPlaylists(enabled)
    saveForceExportPlaylists(enabled)
  }, [])

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
        result.push({ name: p.name, trackCount: p.items.total })
      })

    importedPlaylists
      .filter((p) => selectedIds.has(p.id))
      .forEach((p) => {
        result.push({ name: p.name, trackCount: p.trackCount })
      })

    return result
  }, [selectedIds, likedSongsCount, playlists, importedPlaylists])

  const playlistGroups: PlaylistGroup[] = useMemo(() => {
    const importedById = new Map(importedPlaylists.map((p) => [p.id, p]))
    return selectedPlaylistsStats
      .filter((p) => checkedPlaylistIds.has(p.id))
      .map((playlist) => {
        let songs = playlistTracksCache.get(playlist.id)

        // Imported playlists have their tracks in memory (from the import
        // API), so build the Song list on demand from that data.
        if (!songs) {
          const imported = importedById.get(playlist.id)
          if (imported) {
            songs = imported.tracks.map((t) => ({
              spotifyTrackId: t.id,
              title: t.name,
              album: t.album.name,
              artist: t.artists.map((a) => a.name).join(", "),
              duration: formatDuration(t.duration_ms),
            }))
          } else {
            songs = []
          }
        }

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
    importedPlaylists,
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isExporting}
            aria-label="Log out and return to login"
            title="Log out / Back to login"
            className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 shadow-sm hover:bg-zinc-50 hover:border-zinc-300 hover:text-red-600 hover:border-red-300 dark:hover:bg-zinc-700 dark:hover:border-red-700 dark:hover:text-red-400 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:border-zinc-200 disabled:hover:text-zinc-700 dark:disabled:hover:bg-zinc-800 dark:disabled:hover:border-zinc-700 dark:disabled:hover:text-zinc-200"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Log out</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            disabled={isExporting}
            aria-label="Open settings"
            title="Settings"
            className="rounded-lg p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg cursor-pointer"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button
            onClick={
              isExporting ? handleCancelExport : () => setShowConfirmation(true)
            }
            disabled={!isExporting && selectedIds.size === 0}
            className={`rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg hover:shadow-xl cursor-pointer ${
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
    />
  )

  const songsSection = (
    <SongsPanel
      playlistGroups={playlistGroups}
      isLoading={loadingTracks}
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
      onImportClick={handleImportFromUrl}
      isImporting={importingUrl}
      isExporting={isExporting}
      onRefresh={handleRefreshPlaylists}
      isRefreshing={refreshing}
      loading={loading}
      onClear={handleClearImported}
      canClear={importedPlaylists.length > 0}
      ownerFilter={ownerFilter}
      onOwnerFilterChange={setOwnerFilter}
      visibilityFilter={visibilityFilter}
      onVisibilityFilterChange={setVisibilityFilter}
      dateAfterFilter={dateAfterFilter}
      onDateAfterFilterChange={setDateAfterFilter}
      dateBeforeFilter={dateBeforeFilter}
      onDateBeforeFilterChange={setDateBeforeFilter}
      uniqueOwners={uniqueOwners}
      hasActiveFilters={hasActiveFilters}
      onClearAllFilters={clearAllFilters}
      fetchingDates={fetchingDates}
      datesLoadedCount={datesLoadedCount}
      totalCount={tableItems.length}
    />
  )

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

  return (
    <div>
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
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onLikedSongsCacheInvalidated={handleLikedSongsCacheInvalidated}
        layout={layout}
        onLayoutChange={handleLayoutChange}
        forceExportPlaylists={forceExportPlaylists}
        onForceExportChange={handleForceExportChange}
      />
      
      <ExportLayoutManager
        layout={layout}
        selectedPlaylistsSection={selectedPlaylistsSection}
        unmatchedSongsSection={songsSection}
        mainTableSection={mainTableSection}
        fixedExportButton={fixedExportButton}
      />
    </div>
  )
}
