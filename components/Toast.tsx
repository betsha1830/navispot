"use client"

import { createContext, useContext, useEffect, useMemo } from "react"
import { Toaster, toast as sonnerToast } from "sonner"

export type ToastType = "success" | "error" | "info" | "warning"

declare global {
  interface Window {
    /** Dev-only trigger — see ToastProvider below. Stripped from prod builds. */
    __toasts?: (type?: ToastType) => void
  }
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => string | number
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  dismiss: (id?: string | number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const DEFAULT_DURATION = 5000

// Real strings from the app so the dev preview matches what users see.
const SAMPLE_MESSAGES: Record<ToastType, string> = {
  success: "Export completed successfully!",
  error: "Network error",
  info: "Signed out",
  warning: "Export was cancelled",
}

const TYPE_ORDER: ToastType[] = ["success", "error", "info", "warning"]

export function ToastProvider({ children }: { children: React.ReactNode }) {
  // Memoize the context value once: an unmemoized object (with fresh arrow
  // functions) changes identity on every provider render, which re-triggers
  // any effect with `toast` in its deps whenever a toast appears or
  // disappears — including an infinite write→toast→rerender loop in the
  // quota-fallback persistence path. Sonner holds toast state outside
  // React, so the provider itself never re-renders on show/dismiss.
  // Regression guard: components/Toast.test.tsx.
  const value = useMemo<ToastContextType>(() => {
    const showToast: ToastContextType["showToast"] = (
      type,
      message,
      duration = DEFAULT_DURATION,
    ) =>
      sonnerToast[type](message, {
        duration: duration > 0 ? duration : Infinity,
      })

    return {
      showToast,
      showSuccess: (msg, dur) => showToast("success", msg, dur),
      showError: (msg, dur) => showToast("error", msg, dur),
      showInfo: (msg, dur) => showToast("info", msg, dur),
      showWarning: (msg, dur) => showToast("warning", msg, dur),
      dismiss: (id) => sonnerToast.dismiss(id),
    }
  }, [])

  // Dev-only: fires every toast variant from the browser console so the
  // notification styles can be reviewed without contriving app states.
  //   window.__toasts()           → all four, staggered
  //   window.__toasts('error')    → a single variant
  // process.env.NODE_ENV is inlined by the bundler, so this whole block
  // is dead code (and removed) in production builds.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return

    window.__toasts = (type) => {
      if (type) {
        sonnerToast[type](SAMPLE_MESSAGES[type])
        return
      }
      TYPE_ORDER.forEach((t, i) => {
        setTimeout(() => sonnerToast[t](SAMPLE_MESSAGES[t]), i * 400)
      })
    }

    return () => {
      delete window.__toasts
    }
  }, [])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster
        position="top-right"
        // The app hardcodes the dark palette on <html class="dark">, so
        // match it explicitly instead of following the OS preference.
        theme="dark"
        richColors
        closeButton
        gap={8}
        duration={DEFAULT_DURATION}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return ctx
}
