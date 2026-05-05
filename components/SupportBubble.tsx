"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import HeartIcon from "@/public/heart.svg"
import PatreonIcon from "@/public/patreon.svg"
import BitcoinIcon from "@/public/bitcoin.svg"

const PATREON_URL =
  "https://www.patreon.com/posts/one-time-support-153508783?utm_medium=clipboard_copy&utm_source=copyLink&utm_campaign=postshare_creator&utm_content=join_link"

const CRYPTO_ADDRESSES: Record<string, string> = {
  BTC: "bc1q8madmx95n2ve8e7xr38d2fyldafxjg25ffeuts",
  ETH: "0xFee844879Bd716BE64580b8D2B8835ff76622671",
  BCH: "qqep38q5t9fm3kxe96pek4cr49xz3u4exsq0x9t4xe",
  TRX: "TM5evHNFfcy2WbrDbMpUMZdKotZw958WcG",
  SOL: "9tXhy1xhs1MkXVonNkozwxwYHHwH4iifjrFakeY5wS55",
  "XNO (NANO)": "nano_371m8ijecct9csm18eubojmfkf7rt1bxq4frs43bo5ybmsbpwxyywhqz9wh3",
  POL: "0xFee844879Bd716BE64580b8D2B8835ff76622671",
  LTC: "ltc1qaf5an5qultyw47xjees3d7uwnext2rszg93njj",
  XMR: "84euv4YWNe4WGBm8hrPWKV8PSQpGvRzsFB9jyWhSCs45Z13mfU8qAyARaiqjc9CPCcSspyprd4Qv1KfbSVaHwxH9HRNmTjC",
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-white/10 text-zinc-400 hover:text-zinc-200"
      title={copied ? "Copied!" : "Copy address"}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

export function SupportBubble() {
  const [isOpen, setIsOpen] = useState(false)
  const [showCrypto, setShowCrypto] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setShowCrypto(false)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        handleClose()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose()
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, handleClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        <div
          ref={popupRef}
          className="support-popup-enter w-80 rounded-xl border border-zinc-700/50 bg-zinc-900/95 p-5 shadow-2xl backdrop-blur-sm sm:w-96"
        >
          <div className="mb-4 flex items-center gap-2">
            {showCrypto ? (
              <button
                onClick={() => setShowCrypto(false)}
                className="flex items-center gap-2 text-zinc-400 transition-colors hover:text-zinc-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <Image src={BitcoinIcon} alt="" width={18} height={18} className="invert" />
                <h3 className="text-base font-semibold text-zinc-100">
                  Crypto Addresses
                </h3>
              </button>
            ) : (
              <>
                <Image src={HeartIcon} alt="Heart" width={20} height={20} />
                <h3 className="text-base font-semibold text-zinc-100">
                  Support NaviSpot
                </h3>
              </>
            )}
          </div>

          {showCrypto ? (
            <div className="support-crypto-enter max-h-72 space-y-2 overflow-y-auto">
              {Object.entries(CRYPTO_ADDRESSES).map(([coin, address]) => (
                <div
                  key={coin}
                  className="flex items-start justify-between gap-2 rounded-md bg-zinc-800 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-zinc-300">
                      {coin}
                    </span>
                    <p className="truncate text-[11px] text-zinc-500">
                      {address}
                    </p>
                  </div>
                  <CopyButton text={address} />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
                <p>
                  Thank you for being here! It means a lot that you use NaviSpot.
                  We&apos;re truly grateful for every user who finds value in what
                  we&apos;ve built.
                </p>
                <p>
                  If NaviSpot has helped you, consider a donation to help it keep
                  growing. Even a small contribution goes a long way.
                </p>
                <p className="text-zinc-400">
                  Your support is deeply appreciated. ❤️
                </p>
              </div>

              <div className="mt-5 space-y-3">
                <a
                  href={PATREON_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF424D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#FF424D]/90"
                >
                  <Image src={PatreonIcon} alt="" width={18} height={18} className="invert" />
                  Support on Patreon
                </a>

                <button
                  onClick={() => setShowCrypto(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  <Image
                    src={BitcoinIcon}
                    alt=""
                    width={18}
                    height={18}
                    className="invert"
                  />
                  Donate with Crypto
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={() => setIsOpen((prev) => !prev)}
        className="support-heartbeat group flex size-14 items-center justify-center rounded-full bg-zinc-800 shadow-lg shadow-black/20 transition-all hover:bg-zinc-700 hover:shadow-xl hover:shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F8312F]/50"
        aria-label="Support NaviSpot"
      >
        <Image
          src={HeartIcon}
          alt=""
          width={36}
          height={36}
          className="transition-transform group-hover:scale-110"
        />
      </button>
    </div>
  )
}
