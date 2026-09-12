"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"

/**
 * Friendly explanations for the error codes the OAuth callback appends to
 * the URL (app/api/auth/callback/route.ts redirects to /?error=<code>), plus
 * the codes Spotify itself reports (e.g. access_denied).
 */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch:
    "Spotify login could not be verified (state mismatch). This can happen if the login took too long or cookies were cleared — please try connecting again.",
  no_verifier:
    "Spotify login session data was missing. Please try connecting again.",
  missing_params:
    "Spotify did not return a valid login response. Please try connecting again.",
  token_exchange_failed:
    "Spotify rejected the login. If it keeps failing, check that the redirect URI in your Spotify app settings matches this server exactly.",
  access_denied:
    "You declined the Spotify permission request. You can connect again anytime.",
  invalid_client:
    "This server's Spotify credentials (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET) were rejected. Contact the person hosting this instance.",
}

function messageFor(code: string): string {
  return (
    OAUTH_ERROR_MESSAGES[code] ??
    `Spotify login failed (${code}). Please try connecting again.`
  )
}

/**
 * Dismissible banner shown on the login screen when the OAuth callback or the
 * stored session reports a failure. Reads the ?error= query param once on
 * mount, then strips it from the URL so a refresh doesn't re-show it.
 * Also surfaces the auth context's fetchError (e.g. "session expired —
 * reconnect") when present.
 */
export function AuthErrorBanner() {
  const { fetchError } = useAuth()
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get("error")
    if (code) {
      setOauthError(messageFor(code))
      // Strip the param so a page refresh doesn't re-show the banner.
      params.delete("error")
    }
    const authSuccess = params.has("auth")
    if (code || authSuccess) {
      const qs = params.toString()
      const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`
      window.history.replaceState(window.history.state, "", nextUrl)
    }
  }, [])

  if (dismissed) return null

  const message = oauthError ?? fetchError
  if (!message) return null

  const isNotice = message.toLowerCase().includes("session has expired")

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 ${
        isNotice
          ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40"
          : "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/40"
      }`}
    >
      <div
        className={`flex items-start gap-2 text-sm ${
          isNotice
            ? "text-amber-700 dark:text-amber-300"
            : "text-red-700 dark:text-red-300"
        }`}
      >
        <svg
          className="mt-0.5 h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z"
          />
        </svg>
        <span>{message}</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className={`shrink-0 rounded-md p-1 transition ${
          isNotice
            ? "text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/40"
            : "text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40"
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
