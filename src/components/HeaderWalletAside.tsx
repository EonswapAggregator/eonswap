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
  }, [])

  const label =
    usd != null
      ? formatEstfUsd(usd)
      : err
        ? '—'
        : '…'

  return (
    <a
      href={ESTF_BASESCAN_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="View ESTF on BaseScan"
      className={`inline-flex items-center gap-1.5 rounded-lg border border-uni-border bg-uni-surface px-2 py-1.5 text-xs tabular-nums text-slate-200 transition hover:border-uni-pink/40 hover:bg-uni-pink/10 ${className}`}
    >
      <span className="font-semibold text-uni-pink">{ESTF_SYMBOL}</span>
      <span className="text-slate-400">{label}</span>
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
