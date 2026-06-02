"use client"

import React, { useState } from "react"
import { NavidromeApiClient } from "@/lib/navidrome/client"
import { useAuth } from "@/lib/auth/auth-context"
import {
  DashboardLayout,
  DASHBOARD_LAYOUT_OPTIONS,
} from "@/lib/layout/dashboard-layout"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onLikedSongsCacheInvalidated?: () => void
  layout: DashboardLayout
  onLayoutChange: (layout: DashboardLayout) => void
}

type SettingsSection = "data" | "layout"

interface UnstarProgress {
  processed: number
  total: number
}

type ActionStatus =
  | { kind: "idle" }
  | { kind: "running"; progress: UnstarProgress | null }
  | { kind: "success"; removed: number }
  | { kind: "error"; message: string; partiallyRemoved: number }

export function SettingsModal({
  isOpen,
  onClose,
  onLikedSongsCacheInvalidated,
  layout,
  onLayoutChange,
}: SettingsModalProps) {
  const { navidrome } = useAuth()
  const [activeSection, setActiveSection] = useState<SettingsSection>("data")
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState<ActionStatus>({ kind: "idle" })

  const isConnected =
    navidrome.isConnected &&
    !!navidrome.credentials &&
    !!navidrome.token &&
    !!navidrome.clientId

  const isRunning = status.kind === "running"

  const handleClose = () => {
    if (isRunning) return
    setShowConfirm(false)
    setStatus({ kind: "idle" })
    onClose()
  }

  const handleRequestRemoveFavorites = () => {
    if (!isConnected || isRunning) return
    setShowConfirm(true)
  }

  const handleConfirmRemoveFavorites = async () => {
    if (
      !navidrome.credentials ||
      !navidrome.token ||
      !navidrome.clientId
    ) {
      setStatus({
        kind: "error",
        message: "Not connected to Navidrome.",
        partiallyRemoved: 0,
      })
      setShowConfirm(false)
      return
    }

    setShowConfirm(false)
    setStatus({ kind: "running", progress: null })

    try {
      const client = new NavidromeApiClient(
        navidrome.credentials.url,
        navidrome.credentials.username,
        navidrome.credentials.password,
        navidrome.token,
        navidrome.clientId,
      )

      const starred = await client.getStarredSongs()

      if (starred.length === 0) {
        setStatus({ kind: "success", removed: 0 })
        onLikedSongsCacheInvalidated?.()
        return
      }

      const ids = starred.map((s) => s.id)
      setStatus({
        kind: "running",
        progress: { processed: 0, total: ids.length },
      })

      const result = await client.unstarSongs(ids, (processed, total) => {
        setStatus({ kind: "running", progress: { processed, total } })
      })

      if (!result.success) {
        setStatus({
          kind: "error",
          message: result.error || "Failed to remove favorites.",
          partiallyRemoved: result.processed,
        })
        if (result.processed > 0) {
          onLikedSongsCacheInvalidated?.()
        }
        return
      }

      setStatus({ kind: "success", removed: result.processed })
      onLikedSongsCacheInvalidated?.()
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : "Unknown error",
        partiallyRemoved: 0,
      })
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-2xl mx-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
          <h2
            id="settings-modal-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Settings
          </h2>
          <button
            onClick={handleClose}
            disabled={isRunning}
            aria-label="Close settings"
            className="rounded-md p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className="w-5 h-5"
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
        </div>

        <div className="flex flex-col min-h-[20rem]">
          <div className="px-6 pt-5">
            <div
              role="tablist"
              aria-label="Settings sections"
              className="inline-flex items-center gap-1 p-1 -ml-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/60"
            >
              <button
                role="tab"
                aria-selected={activeSection === "data"}
                aria-controls="settings-panel-data"
                id="settings-tab-data"
                onClick={() => setActiveSection("data")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  activeSection === "data"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Data
              </button>
              <button
                role="tab"
                aria-selected={activeSection === "layout"}
                aria-controls="settings-panel-layout"
                id="settings-tab-layout"
                onClick={() => setActiveSection("layout")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  activeSection === "layout"
                    ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                Layout
              </button>
            </div>
          </div>

          <div className="flex-1 px-6 pt-5 pb-6">
            {activeSection === "data" && (
              <div
                role="tabpanel"
                id="settings-panel-data"
                aria-labelledby="settings-tab-data"
                className="space-y-6"
              >
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Data
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Manage data stored in your Navidrome library.
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Remove all favorited songs
                      </h4>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        Unstars every song currently marked as a favorite in
                        Navidrome. This cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={handleRequestRemoveFavorites}
                      disabled={!isConnected || isRunning}
                      className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-500"
                    >
                      {isRunning ? "Removing..." : "Remove all"}
                    </button>
                  </div>

                  {!isConnected && (
                    <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                      Connect Navidrome to enable this action.
                    </p>
                  )}

                  {status.kind === "running" && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1.5">
                        <span>
                          {status.progress
                            ? `Removing ${status.progress.processed} of ${status.progress.total}...`
                            : "Loading favorited songs..."}
                        </span>
                        {status.progress && (
                          <span>
                            {Math.round(
                              (status.progress.processed /
                                Math.max(status.progress.total, 1)) *
                                100,
                            )}
                            %
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all duration-200"
                          style={{
                            width: status.progress
                              ? `${
                                  (status.progress.processed /
                                    Math.max(status.progress.total, 1)) *
                                  100
                                }%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {status.kind === "success" && (
                    <div className="mt-4 rounded-md border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                      {status.removed === 0
                        ? "No favorited songs to remove."
                        : `Removed ${status.removed} favorited ${
                            status.removed === 1 ? "song" : "songs"
                          }.`}
                    </div>
                  )}

                  {status.kind === "error" && (
                    <div className="mt-4 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                      <p className="font-medium">Failed to remove favorites.</p>
                      <p className="mt-0.5 text-xs">{status.message}</p>
                      {status.partiallyRemoved > 0 && (
                        <p className="mt-0.5 text-xs">
                          {status.partiallyRemoved}{" "}
                          {status.partiallyRemoved === 1 ? "song" : "songs"}{" "}
                          removed before the error.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === "layout" && (
              <div
                role="tabpanel"
                id="settings-panel-layout"
                aria-labelledby="settings-tab-layout"
                className="space-y-5"
              >
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Layout
                  </h3>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Choose how the three tables are arranged on the dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {DASHBOARD_LAYOUT_OPTIONS.map((option) => {
                    const isSelected = layout === option.id
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onLayoutChange(option.id)}
                        className={`group text-left rounded-lg border p-3 transition-all cursor-pointer ${
                          isSelected
                            ? "border-green-500 dark:border-green-500 ring-2 ring-green-500/30 bg-green-50/50 dark:bg-green-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        <div className="aspect-[4/3] w-full rounded-md bg-zinc-100 dark:bg-zinc-800/60 p-2 mb-2">
                          <LayoutPreview id={option.id} highlighted={isSelected} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {option.name}
                          </span>
                          {isSelected && (
                            <svg
                              className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-snug">
                          {option.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="remove-favorites-confirm-title"
        >
          <div
            className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          <div className="relative w-full max-w-md mx-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl">
            <div className="p-6">
              <h3
                id="remove-favorites-confirm-title"
                className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2"
              >
                Remove all favorited songs?
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                This will unstar every song currently marked as a favorite in
                your Navidrome library. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer hover:shadow-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRemoveFavorites}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer hover:shadow-md"
                >
                  Remove all
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface LayoutPreviewProps {
  id: DashboardLayout
  highlighted: boolean
}

function LayoutPreview({ id, highlighted }: LayoutPreviewProps) {
  const cellBase = "rounded-sm"
  const cellColor = highlighted
    ? "bg-green-500/70 dark:bg-green-400/70"
    : "bg-zinc-300 dark:bg-zinc-600"
  const muted = highlighted
    ? "bg-green-500/30 dark:bg-green-400/30"
    : "bg-zinc-300/60 dark:bg-zinc-600/60"

  if (id === "default") {
    return (
      <div className="h-full w-full flex flex-col gap-1">
        <div className="h-[40%] flex gap-1">
          <div className={`${cellBase} ${cellColor} flex-1`} />
          <div className={`${cellBase} ${cellColor} flex-1`} />
        </div>
        <div className={`${cellBase} ${cellColor} flex-1`} />
      </div>
    )
  }

  if (id === "horizontal") {
    return (
      <div className="h-full w-full flex flex-col gap-1">
        <div className={`${cellBase} ${cellColor} h-[40%]`} />
        <div className={`${cellBase} ${cellColor} flex-1`} />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex gap-1">
      <div className={`${cellBase} ${cellColor} w-1/2`} />
      <div className={`${cellBase} ${cellColor} w-1/2`} />
    </div>
  )
}
