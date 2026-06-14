"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"

export type ToastType = "success" | "error" | "info" | "warning"

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

const TYPE_STYLES: Record<ToastType, { bg: string; icon: string }> = {
  success: {
    bg: "bg-green-500",
    icon: "M5 13l4 4L19 7",
  },
  error: {
    bg: "bg-red-500",
    icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  info: {
    bg: "bg-blue-500",
    icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  warning: {
    bg: "bg-yellow-500",
    icon: "M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z",
  },
}

function ToastView({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: () => void
}) {
  const style = TYPE_STYLES[toast.type]
  return (
    <div
      role="status"
      className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg ${style.bg} px-4 py-3 text-white shadow-lg animate-fade-in`}
    >
      <svg
        className="h-5 w-5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={style.icon}
        />
      </svg>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="text-white/80 hover:text-white"
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
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback<ToastContextType["showToast"]>(
    (type, message, duration = 5000) => {
      counter.current += 1
      const id = `toast-${counter.current}`
      setToasts((prev) => [...prev, { id, type, message, duration }])
    },
    [],
  )

  const value: ToastContextType = {
    showToast,
    showSuccess: (msg, dur) => showToast("success", msg, dur),
    showError: (msg, dur) => showToast("error", msg, dur),
    showInfo: (msg, dur) => showToast("info", msg, dur),
    showWarning: (msg, dur) => showToast("warning", msg, dur),
    dismiss,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2"
      >
        {toasts.map((toast) => (
          <AutoDismiss
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function AutoDismiss({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: () => void
}) {
  useEffect(() => {
    if (toast.duration <= 0) return
    const timer = setTimeout(onDismiss, toast.duration)
    return () => clearTimeout(timer)
  }, [toast.duration, onDismiss])

  return <ToastView toast={toast} onDismiss={onDismiss} />
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return ctx
}
