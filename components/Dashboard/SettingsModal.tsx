"use client"

import React, { useState } from "react"
import { NavidromeApiClient } from "@/lib/navidrome/client"
import { useAuth } from "@/lib/auth/auth-context"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsSection = "data"

interface UnstarProgress {
  processed: number
  total: number
}

type ActionStatus =
  | { kind: "idle" }
  | { kind: "running"; progress: UnstarProgress | null }
  | { kind: "success"; removed: number }
  | { kind: "error"; message: string; partiallyRemoved: number }

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
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
        return
      }

      setStatus({ kind: "success", removed: result.processed })
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
