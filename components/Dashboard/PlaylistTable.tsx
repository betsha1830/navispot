"use client"

import { useState } from "react"
import Image from "next/image"
import {
  PlaylistTableItem,
  ExportStatus,
  getExportStatusBadgeColor,
  getExportStatusLabel,
} from "@/types/playlist-table"

interface PlaylistTableProps {
  items: PlaylistTableItem[]
  totalCount: number
  likedSongsCount: number
  selectedIds: Set<string>
  onToggleSelection: (id: string) => void
  onToggleSelectAll: () => void
  sortColumn: "name" | "tracks" | "owner" | null
  sortDirection: "asc" | "desc" | null
  onSort: (column: "name" | "tracks" | "owner") => void
  searchQuery: string
  onSearchChange: (query: string) => void
  isExporting?: boolean
  onRefresh?: () => void
  isRefreshing?: boolean
  loading?: boolean
  // Filter props
  ownerFilter: string
  onOwnerFilterChange: (owner: string) => void
  visibilityFilter: "all" | "public" | "private"
  onVisibilityFilterChange: (visibility: "all" | "public" | "private") => void
  dateAfterFilter: string
  onDateAfterFilterChange: (date: string) => void
  dateBeforeFilter: string
  onDateBeforeFilterChange: (date: string) => void
  uniqueOwners: string[]
  hasActiveFilters: boolean
  onClearAllFilters: () => void
  fetchingDates?: boolean
  datesLoadedCount?: number
}

const LIKED_SONGS_ID = "liked-songs"

const SortIcon = ({ direction }: { direction: "asc" | "desc" | null }) => {
  if (!direction) {
    return (
      <svg
        className="w-4 h-4 text-zinc-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    )
  }
  return (
    <svg
      className={`w-4 h-4 text-zinc-900 dark:text-zinc-100 ${direction === "desc" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 15l7-7 7 7"
      />
    </svg>
  )
}

const StatusBadge = ({ status }: { status: ExportStatus }) => {
  const colors = getExportStatusBadgeColor(status)
  const label = getExportStatusLabel(status)

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}
    >
      {status === "out-of-sync" && (
        <svg
          className="w-3 h-3 mr-1 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span>{label}</span>
    </span>
  )
}

const PlaylistRow = ({
  item,
  isSelected,
  onToggle,
  rowIndex,
}: {
  item: PlaylistTableItem
  isSelected: boolean
  onToggle: () => void
  rowIndex: number
}) => {
  const isEven = rowIndex % 2 === 0

  return (
    <tr
      className={`
        border-b border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer
        ${
          isSelected
            ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500"
            : isEven
              ? "bg-white dark:bg-zinc-900"
              : "bg-zinc-50 dark:bg-zinc-800/50"
        }
        hover:bg-zinc-100 dark:hover:bg-zinc-800
      `}
      onClick={onToggle}
    >
      <td className="px-3 py-2 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800"
        />
      </td>
      <td className="px-2 py-2 w-14 hidden sm:table-cell">
        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 flex-shrink-0">
          {item.images?.[0]?.url ? (
            <Image
              src={item.images[0].url}
              alt={item.name}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                className="h-5 w-5 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
                />
              </svg>
            </div>
          )}
        </div>
      </td>
      <td className="px-2 py-2 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            {item.isLikedSongs && (
              <svg
                className="h-3.5 w-3.5 text-pink-500 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span
              className="truncate font-medium text-sm text-zinc-900 dark:text-zinc-100"
              title={item.name}
            >
              {item.name}
            </span>
          </div>
          {/* Mobile: show tracks and owner inline */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:hidden mt-0.5">
            <span>{item.tracks.total.toLocaleString()} tracks</span>
            <span>•</span>
            <span className="truncate">{item.owner.display_name}</span>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 w-20 text-xs text-zinc-600 dark:text-zinc-400 hidden sm:table-cell">
        {item.tracks.total.toLocaleString()}
      </td>
      <td className="px-2 py-2 w-28 hidden md:table-cell">
        <span
          className="truncate text-xs text-zinc-600 dark:text-zinc-400 block"
          title={item.owner.display_name}
        >
          {item.owner.display_name}
        </span>
      </td>
      <td className="px-2 py-2 w-20 hidden lg:table-cell">
        {item.createdAt ? (
          <span
            className="text-xs text-zinc-500 dark:text-zinc-400"
            title={new Date(item.createdAt).toLocaleString()}
          >
            {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
          </span>
        ) : (
          <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>
        )}
      </td>
      <td className="px-2 py-2 w-16 hidden lg:table-cell">
        {item.public === true ? (
          <span className="inline-flex items-center text-xs text-green-600 dark:text-green-400" title="Public">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span>
        ) : item.public === false ? (
          <span className="inline-flex items-center text-xs text-zinc-400 dark:text-zinc-500" title="Private">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </span>
        ) : null}
      </td>
      <td className="px-2 py-2 w-24">
        <StatusBadge status={item.exportStatus} />
      </td>
    </tr>
  )
}

const LovedSongsRow = ({
  count,
  isSelected,
  onToggle,
  rowIndex,
}: {
  count: number
  isSelected: boolean
  onToggle: () => void
  rowIndex: number
}) => {
  const isEven = rowIndex % 2 === 0

  return (
    <tr
      className={`
        border-b border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer
        ${
          isSelected
            ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500"
            : isEven
              ? "bg-white dark:bg-zinc-900"
              : "bg-zinc-50 dark:bg-zinc-800/50"
        }
        hover:bg-zinc-100 dark:hover:bg-zinc-800
      `}
      onClick={onToggle}
    >
      <td className="px-3 py-2 w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800"
        />
      </td>
      <td className="px-2 py-2 w-14 hidden sm:table-cell">
        <div className="relative h-10 w-10 overflow-hidden rounded-md bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
          <svg
            className="h-5 w-5 text-pink-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </td>
      <td className="px-2 py-2 min-w-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <svg
              className="h-3.5 w-3.5 text-pink-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
              Liked Songs
            </span>
          </div>
          {/* Mobile: show tracks inline */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:hidden mt-0.5">
            <span>{count.toLocaleString()} tracks</span>
            <span>•</span>
            <span>You</span>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 w-20 text-xs text-zinc-600 dark:text-zinc-400 hidden sm:table-cell">
        {count.toLocaleString()}
      </td>
      <td className="px-2 py-2 w-28 hidden md:table-cell">
        <span className="text-xs text-zinc-600 dark:text-zinc-400">You</span>
      </td>
      <td className="px-2 py-2 w-20 hidden lg:table-cell">
        <span className="text-xs text-zinc-400 dark:text-zinc-600">—</span>
      </td>
      <td className="px-2 py-2 w-16 hidden lg:table-cell">
        <span className="inline-flex items-center text-xs text-zinc-400 dark:text-zinc-500" title="Private">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </span>
      </td>
      <td className="px-2 py-2 w-24">
        <StatusBadge status="none" />
      </td>
    </tr>
  )
}

export function PlaylistTable({
  items,
  totalCount,
  likedSongsCount,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  sortColumn,
  sortDirection,
  onSort,
  searchQuery,
  onSearchChange,
  isExporting = false,
  onRefresh,
  isRefreshing = false,
  loading = false,
  ownerFilter,
  onOwnerFilterChange,
  visibilityFilter,
  onVisibilityFilterChange,
  dateAfterFilter,
  onDateAfterFilterChange,
  dateBeforeFilter,
  onDateBeforeFilterChange,
  uniqueOwners,
  hasActiveFilters,
  onClearAllFilters,
  fetchingDates = false,
  datesLoadedCount = 0,
}: PlaylistTableProps) {
  const [showFilters, setShowFilters] = useState(false)

  // items are already filtered, sorted, and include Liked Songs from Dashboard
  const visibleCount = items.length
  const selectedCount = items.filter((item) =>
    selectedIds.has(item.id),
  ).length
  const allVisibleSelected = visibleCount > 0 && selectedCount === visibleCount

  return (
    <div className="w-full flex flex-col h-full overflow-hidden">
      <div className="mb-4 flex justify-between items-center flex-shrink-0">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={isExporting}
            className="pl-10 pr-10 py-2 w-full max-w-md rounded-lg border border-zinc-200 bg-white text-sm text-zinc-900 placeholder-zinc-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-green-500 dark:focus:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
            >
              <svg
                className="h-5 w-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            disabled={isExporting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              hasActiveFilters || showFilters
                ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading || isRefreshing || isExporting}
            className="flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className={`w-5 h-5 text-blue-500 hover:text-blue-700 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          {!isExporting && visibleCount > 0 && (
            <button
              onClick={onToggleSelectAll}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 whitespace-nowrap"
            >
              {allVisibleSelected ? "Deselect All" : "Select All"}
            </button>
          )}
          <span>
            Showing {items.length} of {totalCount} playlists
            {selectedIds.size > 0 && !isExporting && (
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                ({selectedIds.size} selected)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex-shrink-0">
          <div className="flex flex-wrap items-end gap-4">
            {/* Owner filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Owner</label>
              <select
                value={ownerFilter}
                onChange={(e) => onOwnerFilterChange(e.target.value)}
                className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[160px]"
              >
                <option value="">All owners</option>
                {uniqueOwners.map((owner) => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
              </select>
            </div>

            {/* Visibility filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Visibility</label>
              <select
                value={visibilityFilter}
                onChange={(e) => onVisibilityFilterChange(e.target.value as "all" | "public" | "private")}
                className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[120px]"
              >
                <option value="all">All</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            {/* Date range filters */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Created after
                {fetchingDates && (
                  <span className="ml-1 text-blue-500 animate-pulse" title={`Loading dates: ${datesLoadedCount}/${totalCount - 1} playlists`}>
                    ⟳ {datesLoadedCount}/{totalCount - 1}
                  </span>
                )}
              </label>
              <input
                type="date"
                value={dateAfterFilter}
                onChange={(e) => onDateAfterFilterChange(e.target.value)}
                className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Created before</label>
              <input
                type="date"
                value={dateBeforeFilter}
                onChange={(e) => onDateBeforeFilterChange(e.target.value)}
                className="px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Clear all button */}
            {hasActiveFilters && (
              <button
                onClick={onClearAllFilters}
                className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-200 dark:border-red-800 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={`rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden flex-1 transition-all ${
          isExporting ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <div className="overflow-auto h-full">
          <table className="w-full divide-y divide-zinc-200 dark:divide-zinc-800 table-fixed">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-2 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={onToggleSelectAll}
                    disabled={isExporting || visibleCount === 0}
                    className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-500 dark:border-zinc-600 dark:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </th>
                <th className="px-2 py-2 text-left w-14 hidden sm:table-cell">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Art
                  </span>
                </th>
                <th
                  className={`px-2 py-2 text-left min-w-0 select-none ${
                    isExporting ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onClick={() => !isExporting && onSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-medium uppercase tracking-wider ${
                        isExporting
                          ? "text-zinc-400 dark:text-zinc-500"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      Name
                    </span>
                    {!isExporting && (
                      <SortIcon
                        direction={sortColumn === "name" ? sortDirection : null}
                      />
                    )}
                  </div>
                </th>
                <th
                  className={`px-2 py-2 text-left w-20 select-none hidden sm:table-cell ${
                    isExporting ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onClick={() => !isExporting && onSort("tracks")}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-medium uppercase tracking-wider ${
                        isExporting
                          ? "text-zinc-400 dark:text-zinc-500"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      #
                    </span>
                    {!isExporting && (
                      <SortIcon
                        direction={
                          sortColumn === "tracks" ? sortDirection : null
                        }
                      />
                    )}
                  </div>
                </th>
                <th
                  className={`px-2 py-2 text-left w-28 select-none hidden md:table-cell ${
                    isExporting ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onClick={() => !isExporting && onSort("owner")}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-medium uppercase tracking-wider ${
                        isExporting
                          ? "text-zinc-400 dark:text-zinc-500"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      Owner
                    </span>
                    {!isExporting && (
                      <SortIcon
                        direction={
                          sortColumn === "owner" ? sortDirection : null
                        }
                      />
                    )}
                  </div>
                </th>
                <th className="px-2 py-2 text-left w-20 hidden lg:table-cell">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Date
                    {fetchingDates && (
                      <span className="ml-1 text-blue-500 animate-pulse text-[10px]">⟳</span>
                    )}
                  </span>
                </th>
                <th className="px-2 py-2 text-left w-16 hidden lg:table-cell">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400" title="Visibility">
                    Vis
                  </span>
                </th>
                <th className="px-2 py-2 text-left w-24">
                  <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Status
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {items.length > 0 ? (
                items.map((item, index) => {
                  if (item.id === LIKED_SONGS_ID) {
                    return (
                      <LovedSongsRow
                        key={item.id}
                        count={likedSongsCount}
                        isSelected={selectedIds.has(item.id)}
                        onToggle={() =>
                          !isExporting && onToggleSelection(item.id)
                        }
                        rowIndex={index}
                      />
                    )
                  }
                  return (
                    <PlaylistRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggle={() =>
                        !isExporting && onToggleSelection(item.id)
                      }
                      rowIndex={index}
                    />
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {searchQuery
                          ? "No playlists match your search"
                          : "No playlists found"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
