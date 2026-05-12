import { useEffect, useState } from 'react'
import { fetchSimplePricesUsd } from '../lib/coingecko'
import { fetchEstfUsdFromEstfWethPair } from '../lib/estfUsdFromPair'
import { EON_BASE_MAINNET } from '../lib/eonBaseMainnet'

const ESTF_SYMBOL =
  String(import.meta.env.VITE_ESTF_SYMBOL ?? 'ESTF').trim() || 'ESTF'
/** Fallback when Base ESTF/WETH pool pricing is unavailable. */
const ESTF_COINGECKO_ID = String(import.meta.env.VITE_ESTF_COINGECKO_ID ?? '').trim()
const ESTF_HARDCODED_USD = Number(import.meta.env.VITE_ESTF_HARDCODED_USD ?? '0')

/** BaseScan token page for ESTF */
const ESTF_BASESCAN_URL = `https://basescan.org/token/${EON_BASE_MAINNET.token.address}`

function formatEstfUsd(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n >= 1)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(n)
}

export function EstfPriceChip({ className = '' }: { className?: string }) {
  const [usd, setUsd] = useState<number | null>(null)
  const [prevUsd, setPrevUsd] = useState<number | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let cancelled = false
    const tick = () => {
      void (async () => {
        try {
          let v: number | null = await fetchEstfUsdFromEstfWethPair()
          if (v == null || !Number.isFinite(v) || v <= 0) {
            if (Number.isFinite(ESTF_HARDCODED_USD) && ESTF_HARDCODED_USD > 0) {
              v = ESTF_HARDCODED_USD
            }
          }
          if ((v == null || !Number.isFinite(v) || v <= 0) && ESTF_COINGECKO_ID) {
            const map = await fetchSimplePricesUsd([ESTF_COINGECKO_ID])
            const cg = map[ESTF_COINGECKO_ID]
            v = typeof cg === 'number' && cg > 0 ? cg : null
          }
          if (!cancelled) {
            setPrevUsd(usd)
            setUsd(v)
            setErr(false)
          }
        } catch {
          if (!cancelled) {
            setErr(true)
            setUsd(null)
          }
        }
      })()
    }
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [usd])

  const label =
    usd != null
      ? formatEstfUsd(usd)
      : err
        ? '—'
        : '…'

  // Determine price direction
  const isUp = usd != null && prevUsd != null && usd > prevUsd
  const isDown = usd != null && prevUsd != null && usd < prevUsd

  return (
    <a
      href={ESTF_BASESCAN_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="View ESTF on BaseScan"
      className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-uni-pink/30 bg-gradient-to-r from-uni-pink/10 via-purple-500/10 to-blue-500/10 px-3 py-1.5 text-sm tabular-nums transition-all duration-300 hover:border-uni-pink/60 hover:shadow-[0_0_20px_rgba(252,114,255,0.25)] ${className}`}
    >
      {/* Animated glow effect */}
      <span className="absolute inset-0 -z-10 bg-gradient-to-r from-uni-pink/20 via-purple-500/20 to-uni-pink/20 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* ESTF Logo */}
      <img 
        src="/tokens/0x7bd09674b3c721e35973993d5b6a79cda7da9c7f.svg" 
        alt="ESTF"
        className="h-5 w-5 shrink-0 rounded-full"
      />
      
      {/* Symbol */}
      <span className="font-bold tracking-wide text-white">{ESTF_SYMBOL}</span>
      
      {/* Price with direction indicator */}
      <span className="flex items-center gap-1">
        {isUp && (
          <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )}
        {isDown && (
          <svg className="h-3 w-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        <span className={`font-semibold ${isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-slate-200'}`}>
          {label}
        </span>
      </span>
      
      {/* Live indicator dot */}
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
    </a>
  )
}

export function HeaderWalletAside() {
  return (
    <div className="mr-1 hidden min-w-0 shrink-0 items-center gap-1 lg:flex">
      <EstfPriceChip />
    </div>
  )
}
