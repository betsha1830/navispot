"use client"

import { useAuth } from "@/lib/auth/auth-context"

export function SkipSpotifyButton() {
  const { skipSpotify, setSkipSpotify, navidrome } = useAuth()

  const handleClick = () => {
    setSkipSpotify(true)
  }

  const handleUndo = () => {
    setSkipSpotify(false)
  }

  if (skipSpotify) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          You&apos;re using NaviSpot without Spotify. You can paste public Spotify
          playlist URLs on the dashboard.
        </p>
        <button
          type="button"
          onClick={handleUndo}
          className="text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
        >
          Connect Spotify instead
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={!navidrome.isConnected}
        className="text-sm text-zinc-600 underline hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Continue without Spotify
      </button>
      {!navidrome.isConnected && (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Connect Navidrome first
        </p>
      )}
    </div>
  )
}
