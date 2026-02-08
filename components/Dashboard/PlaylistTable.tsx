"use client"

import { useState, useRef, useEffect, useMemo, memo, useCallback } from "react"
import { createPortal } from "react-dom"
import Image from "next/image"
import { Calendar } from "@/components/ui/calendar"
import {
  PlaylistTableItem,
  ExportStatus,
  getExportStatusBadgeColor,
  getExportStatusLabel,
} from "@/types/playlist-table"

// DatePicker component using shadcn Calendar with portal
function DatePicker({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (date: string) => void
  placeholder: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [calendarPosition, setCalendarPosition] = useState({ top: 0, left: 0, ready: false })
  const pickerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Calculate calendar position when opening - centered above button
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const calendarWidth = 280
      const calendarHeight = 280
      const margin = 4
      
      // Center horizontally relative to button
      const buttonCenter = rect.left + rect.width / 2
      let left = buttonCenter - calendarWidth / 2
      left = Math.max(margin, Math.min(left, window.innerWidth - calendarWidth - margin))
      
      // Check available space
      const spaceAbove = rect.top
      const spaceBelow = window.innerHeight - rect.bottom
      
      // Position: top center if space, otherwise bottom center
      let top
      if (spaceAbove >= calendarHeight + margin) {
        top = rect.top - calendarHeight - margin
      } else {
        top = rect.bottom + margin
      }
      
      setCalendarPosition({ top, left, ready: true })
    } else if (!isOpen) {
      setCalendarPosition(prev => ({ ...prev, ready: false }))
    }
  }, [isOpen])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-calendar-portal]')
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const date = value ? new Date(value) : undefined

  const handleSelect = useCallback((selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(selectedDate.toISOString().split("T")[0])
    } else {
      onChange("")
    }
    setIsOpen(false)
  }, [onChange])

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange("")
  }

  const calendarPortal = useMemo(() => {
    if (!isOpen || !calendarPosition.ready) return null
    return createPortal(
      <div 
        data-calendar-portal
        className="fixed z-[99999] bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg shadow-zinc-200/50 dark:shadow-black/50 p-2"
        style={{
          top: `${calendarPosition.top}px`,
          left: `${calendarPosition.left}px`,
          maxWidth: 'calc(100vw - 16px)',
          maxHeight: 'calc(100vh - 16px)',
          overflow: 'auto',
          willChange: 'transform'
        }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          className="rounded-md"
        />
      </div>,
      document.body
    )
  }, [isOpen, calendarPosition.ready, calendarPosition.top, calendarPosition.left, date])

  return (
    <div ref={pickerRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-left text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-zinc-300 dark:hover:border-zinc-500 transition-all flex items-center justify-between"
      >
        <span className={value ? "" : "text-zinc-400 dark:text-zinc-500"}>
          {value ? new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : placeholder}
        </span>
        {value ? (
          <span
            onClick={clearDate}
            className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <svg className="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {calendarPortal}
    </div>
  )
}

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
      {label}
    </span>
  )
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
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
  const [popoverPosition, setPopoverPosition] = useState<"below" | "above">("below")
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const filterPanelRef = useRef<HTMLDivElement>(null)

  // Calculate popover position based on viewport space
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number; isReady: boolean }>({ top: 0, left: 0, isReady: false })
  
  useEffect(() => {
    if (showFilters && filterButtonRef.current) {
      const buttonRect = filterButtonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
      const popoverHeight = Math.min(400, window.innerHeight * 0.7)
      const popoverWidth = window.innerWidth < 640 ? 320 : 384 // w-80 or w-96

      // Determine position (above or below)
      let position: "above" | "below" = "below"
      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        position = "above"
        setPopoverPosition("above")
      } else {
        setPopoverPosition("below")
      }

      // Calculate vertical position
      let top = position === "below"
        ? buttonRect.bottom + 8
        : buttonRect.top - popoverHeight - 8

      // Ensure it doesn't go above viewport
      if (top < 8) {
        top = 8
        // If we can't fit above, force below
        if (position === "above") {
          top = buttonRect.bottom + 8
          setPopoverPosition("below")
        }
      }

      // Calculate horizontal position (centered under the button)
      const buttonCenter = buttonRect.left + (buttonRect.width / 2)
      let left = buttonCenter - (popoverWidth / 2)

      // Ensure it doesn't go off left edge
      if (left < 8) {
        left = 8
      }
      // Ensure it doesn't go off right edge
      if (left + popoverWidth > window.innerWidth - 8) {
        left = window.innerWidth - popoverWidth - 8
      }

      setPopoverStyle({ top, left, isReady: true })
    }
  }, [showFilters])

  // Recalculate position on window resize
  useEffect(() => {
    function handleResize() {
      if (showFilters && filterButtonRef.current) {
        const buttonRect = filterButtonRef.current.getBoundingClientRect()
        const popoverHeight = Math.min(400, window.innerHeight * 0.7)
        const popoverWidth = window.innerWidth < 640 ? 320 : 384

        let top = popoverPosition === "below"
          ? buttonRect.bottom + 8
          : buttonRect.top - popoverHeight - 8

        if (top < 8) top = 8

        // Center horizontally
        const buttonCenter = buttonRect.left + (buttonRect.width / 2)
        let left = buttonCenter - (popoverWidth / 2)

        if (left < 8) left = 8
        if (left + popoverWidth > window.innerWidth - 8) {
          left = window.innerWidth - popoverWidth - 8
        }

        setPopoverStyle({ top, left, isReady: true })
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [showFilters, popoverPosition])

  // Close filter panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-calendar-portal]')
      ) {
        setShowFilters(false)
      }
    }

    if (showFilters) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showFilters])

  // items are already filtered, sorted, and include Liked Songs from Dashboard
  const visibleCount = items.length
  const selectedCount = items.filter((item) =>
    selectedIds.has(item.id),
  ).length
  const allVisibleSelected = visibleCount > 0 && selectedCount === visibleCount

  // Count active filters
  const activeFilterCount = [
    ownerFilter,
    visibilityFilter !== "all" ? visibilityFilter : null,
    dateAfterFilter,
    dateBeforeFilter,
  ].filter(Boolean).length

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-4 mb-3 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={isExporting}
            className="w-full pl-9 pr-10 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
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
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 flex-shrink-0">
          {/* Filter Toggle Button */}
          <div className="relative">
            <button
              ref={filterButtonRef}
              onClick={() => setShowFilters((prev) => !prev)}
              disabled={isExporting}
              className={`group relative flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                hasActiveFilters || showFilters
                  ? "border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 dark:border-blue-600 dark:from-blue-900/30 dark:to-indigo-900/20 dark:text-blue-300 shadow-sm shadow-blue-100 dark:shadow-none"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/50"
              }`}
            >
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full shadow-sm">
                  {activeFilterCount}
                </span>
              )}
              <svg 
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${showFilters ? "rotate-180" : ""}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Filter Popover Portal */}
            {showFilters && popoverStyle.isReady && typeof document !== 'undefined' && createPortal(
              <div
                ref={filterPanelRef}
                className={`fixed z-[9999] popover-enter ${popoverPosition === "below" ? "popover-enter-below" : "popover-enter-above"}`}
                style={{
                  top: `${popoverStyle.top}px`,
                  left: `${popoverStyle.left}px`
                }}
              >
                <div className="flex flex-col max-h-[70vh] w-80 sm:w-96 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-black/50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      Filter Playlists
                    </h3>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Scrollable Filter Fields */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {/* Owner Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Owner
                      </label>
                      <div className="relative">
                        <select
                          value={ownerFilter}
                          onChange={(e) => onOwnerFilterChange(e.target.value)}
                          className="w-full appearance-none px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                        >
                          <option value="">All owners</option>
                          {uniqueOwners.map((owner) => (
                            <option key={owner} value={owner}>{owner}</option>
                          ))}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Visibility Filter */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Visibility
                      </label>
                      <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 p-1 bg-zinc-50 dark:bg-zinc-800/50">
                        {(["all", "public", "private"] as const).map((option) => (
                          <button
                            key={option}
                            onClick={() => onVisibilityFilterChange(option)}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                              visibilityFilter === option
                                ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-600"
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                            }`}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                        <span>Date Range</span>
                        {fetchingDates && (
                          <span className="text-blue-500 flex items-center gap-1">
                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-[10px]">{datesLoadedCount}/{totalCount - 1}</span>
                          </span>
                        )}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <DatePicker
                          value={dateAfterFilter}
                          onChange={onDateAfterFilterChange}
                          placeholder="From"
                        />
                        <DatePicker
                          value={dateBeforeFilter}
                          onChange={onDateBeforeFilterChange}
                          placeholder="To"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-shrink-0 bg-zinc-50/50 dark:bg-zinc-800/50">
                    <span className="text-xs text-zinc-500">
                      {items.length} of {totalCount} playlists
                    </span>
                    <div className="flex gap-2">
                      {hasActiveFilters && (
                        <button
                          onClick={onClearAllFilters}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        >
                          Clear all
                        </button>
                      )}
                      <button
                        onClick={() => setShowFilters(false)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading || isRefreshing || isExporting}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-700 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            title="Refresh playlists"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
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
        </div>

        {/* Active Filter Pills */}
        {hasActiveFilters && (
          <div className="hidden md:flex items-center gap-2 flex-nowrap">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Active:</span>
            {ownerFilter && (
              <button
                onClick={() => onOwnerFilterChange("")}
                className="group inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-all dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-blue-900/50"
              >
                <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="truncate max-w-[100px]">{ownerFilter}</span>
                <svg className="w-3 h-3 text-blue-400 group-hover:text-blue-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {visibilityFilter !== "all" && (
              <button
                onClick={() => onVisibilityFilterChange("all")}
                className="group inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 hover:border-emerald-300 transition-all dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-900/50"
              >
                <svg className="w-3 h-3 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{visibilityFilter === "public" ? "Public" : "Private"}</span>
                <svg className="w-3 h-3 text-emerald-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {(dateAfterFilter || dateBeforeFilter) && (
              <button
                onClick={() => {
                  onDateAfterFilterChange("")
                  onDateBeforeFilterChange("")
                }}
                className="group inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 hover:border-purple-300 transition-all dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/50"
              >
                <svg className="w-3 h-3 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="truncate max-w-[100px]">
                  {dateAfterFilter && dateBeforeFilter 
                    ? `${formatDate(dateAfterFilter)} – ${formatDate(dateBeforeFilter)}`
                    : dateAfterFilter 
                      ? `After ${formatDate(dateAfterFilter)}`
                      : `Before ${formatDate(dateBeforeFilter)}`}
                </span>
                <svg className="w-3 h-3 text-purple-400 group-hover:text-purple-600 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div
        className={`rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden flex-1 transition-all ${
          isExporting ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        <div className="overflow-auto h-full">
          <table className="w-full divide-y divide-zinc-200 dark:divide-zinc-800 table-fixed">
            <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-3 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={onToggleSelectAll}
                    disabled={isExporting || visibleCount === 0}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </th>
                <th className="px-2 py-3 text-left w-14 hidden sm:table-cell">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Art
                  </span>
                </th>
                <th
                  className={`px-2 py-3 text-left min-w-0 select-none ${
                    isExporting ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onClick={() => !isExporting && onSort("name")}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
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
                  className={`px-2 py-3 text-left w-24 select-none ${
                    isExporting ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onClick={() => !isExporting && onSort("tracks")}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isExporting
                          ? "text-zinc-400 dark:text-zinc-500"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      Tracks
                    </span>
                    {!isExporting && (
                      <SortIcon
                        direction={sortColumn === "tracks" ? sortDirection : null}
                      />
                    )}
                  </div>
                </th>
                <th
                  className={`px-2 py-3 text-left w-28 select-none ${
                    isExporting ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                  onClick={() => !isExporting && onSort("owner")}
                >
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${
                        isExporting
                          ? "text-zinc-400 dark:text-zinc-500"
                          : "text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      Owner
                    </span>
                    {!isExporting && (
                      <SortIcon
                        direction={sortColumn === "owner" ? sortDirection : null}
                      />
                    )}
                  </div>
                </th>
                <th className="px-2 py-3 text-left w-24 hidden md:table-cell">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Visibility
                  </span>
                </th>
                <th className="px-2 py-3 text-left w-28 hidden lg:table-cell">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Created
                  </span>
                </th>
                <th className="px-2 py-3 text-left w-28 hidden sm:table-cell">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Status
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    No playlists found
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => !isExporting && onToggleSelection(item.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedIds.has(item.id)
                        ? "bg-blue-50/50 dark:bg-blue-900/10"
                        : index % 2 === 0
                          ? "bg-white dark:bg-zinc-900"
                          : "bg-zinc-50 dark:bg-zinc-800/50"
                    } hover:bg-blue-50/30 dark:hover:bg-blue-900/5`}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => onToggleSelection(item.id)}
                        disabled={isExporting}
                        className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-2 hidden sm:table-cell">
                      {item.isLikedSongs ? (
                        <div className="w-10 h-10 rounded-md bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </div>
                      ) : item.images?.[0]?.url ? (
                        <Image
                          src={item.images[0].url}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-zinc-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate" title={item.name}>
                        {item.name}
                      </div>
                      {item.id === LIKED_SONGS_ID && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {likedSongsCount} tracks
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {item.tracks.total.toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate" title={item.owner.display_name}>
                        {item.owner.display_name}
                      </div>
                    </td>
                    <td className="px-2 py-2 hidden md:table-cell">
                      {item.isLikedSongs ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                          Private
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          item.public === true
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : item.public === false
                            ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                        }`}>
                          {item.public === true ? "Public" : item.public === false ? "Private" : "Unknown"}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 hidden lg:table-cell">
                      <div className="text-sm text-zinc-600 dark:text-zinc-400" title={item.createdAt ? formatDate(item.createdAt) : undefined}>
                        {item.createdAt ? formatDate(item.createdAt) : "—"}
                      </div>
                    </td>
                    <td className="px-2 py-2 hidden sm:table-cell">
                      <StatusBadge status={item.exportStatus || "none"} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
