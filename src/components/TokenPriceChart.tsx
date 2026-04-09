import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, TrendingUp } from 'lucide-react'
import { formatUnits, parseUnits } from 'viem'
import {
  coingeckoIdForSymbol,
  fetchMarketChartUsd,
  type MarketChartPoint,
} from '../lib/coingecko'
import { fetchKyberPairHistory } from '../lib/kyberHistory'
import { fetchKyberRoute } from '../lib/kyber'
import {
  readChartHistoryCache,
  writeChartHistoryCache,
} from '../lib/chartHistoryCache'

const VB_W = 560
const VB_H = 200
const PAD = 10
const innerH = VB_H - PAD * 2
const MAX_POINTS = 90
/** Live-only: faster updates so the line feels responsive (still one Kyber route per tick). */
const LIVE_ONLY_POLL_MS = 1_500
/** Kyber history anchor: slower to limit route API load while shape is mostly historical. */
const LIVE_POLL_KYBER_MS = 3_000
const HISTORY_REVALIDATE_MS = 4_000
const CHART_HISTORY_RETRY_DELAYS_MS = [80, 180]

function formatAxisPrice(p: number, usdLike: boolean) {
  const prefix = usdLike ? '$' : ''
  if (p >= 1_000_000) return `${prefix}${(p / 1_000_000).toFixed(2)}M`
  if (p >= 1_000) return `${prefix}${(p / 1_000).toFixed(2)}K`
  if (p >= 1) return `${prefix}${p.toFixed(2)}`
  if (p >= 0.01) return `${prefix}${p.toFixed(4)}`
  return `${prefix}${p.toFixed(6)}`
}

function formatHeadlinePrice(p: number, usdLike: boolean) {
  if (usdLike) {
    return p.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: p >= 1 ? 2 : p >= 0.01 ? 4 : 6,
    })
  }
  return p.toLocaleString('en-US', {
    maximumFractionDigits: p >= 1 ? 6 : 8,
  })
}

function formatChartDate(ms: number, compact: boolean) {
  const d = new Date(ms)
  if (compact) {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

type Props = {
  baseSymbol: string
  quoteSymbol: string
  chainId: number
  baseAddress: string
  quoteAddress: string
  baseDecimals: number
  quoteDecimals: number
  routePairPrice: number | null
  routeLoading: boolean
  routeError: string | null
  days?: 7 | 30 | 90
  onDaysChange?: (days: 7 | 30 | 90) => void
}

function buildPath(
  points: { t: number; price: number }[],
  width: number,
  height: number,
  pad: number,
): { d: string; minP: number; maxP: number } | null {
  if (points.length < 1) return null
  const normalized =
    points.length === 1
      ? [
          points[0]!,
          { t: points[0]!.t + 1, price: points[0]!.price },
        ]
      : points
  const prices = normalized.map((p) => p.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const span = maxP - minP || 1
  const innerW = width - pad * 2
  const innerHH = height - pad * 2
  const coords = normalized.map((p, i) => {
    const x = pad + (i / (normalized.length - 1)) * innerW
    const y = pad + innerHH - ((p.price - minP) / span) * innerHH
    return { x, y }
  })
  const d = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')
  return { d, minP, maxP }
}

function ratioSeries(base: MarketChartPoint[], quote: MarketChartPoint[]) {
  const len = Math.min(base.length, quote.length)
  if (len < 2) return []
  const out: MarketChartPoint[] = []
  for (let i = 0; i < len; i += 1) {
    const b = base[base.length - len + i]
    const q = quote[quote.length - len + i]
    if (!b || !q || q.price <= 0) continue
    out.push({ t: Math.min(b.t, q.t), price: b.price / q.price })
  }
  return out
}

function alignSeriesToTarget(
  series: MarketChartPoint[],
  targetPrice: number | null,
): MarketChartPoint[] {
  if (!series.length) return []
  if (!Number.isFinite(targetPrice ?? NaN) || (targetPrice ?? 0) <= 0) return series
  const last = series[series.length - 1]?.price ?? 0
  if (!Number.isFinite(last) || last <= 0) return series
  const factor = (targetPrice ?? 0) / last
  if (!Number.isFinite(factor) || factor <= 0) return series
  return series.map((p) => ({ t: p.t, price: p.price * factor }))
}

async function fetchMarketChartWithRetry(
  coinId: string,
  days: 7 | 30 | 90,
): Promise<MarketChartPoint[]> {
  let lastErr: unknown = null
  for (let i = 0; i <= CHART_HISTORY_RETRY_DELAYS_MS.length; i += 1) {
    try {
      return await fetchMarketChartUsd(coinId, days)
    } catch (e) {
      lastErr = e
      if (i < CHART_HISTORY_RETRY_DELAYS_MS.length) {
        await new Promise((r) => window.setTimeout(r, CHART_HISTORY_RETRY_DELAYS_MS[i]))
        continue
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Chart fetch failed')
}

export function TokenPriceChart({
  baseSymbol,
  quoteSymbol,
  chainId,
  baseAddress,
  quoteAddress,
  baseDecimals,
  quoteDecimals,
  routePairPrice,
  routeLoading,
  routeError,
  onDaysChange,
  days = 7,
}: Props) {
  const baseId = coingeckoIdForSymbol(baseSymbol)
  const quoteId = coingeckoIdForSymbol(quoteSymbol)
  const pairLabelQuote = quoteSymbol
  const [points, setPoints] = useState<{ t: number; price: number }[]>([])
  const [historyPoints, setHistoryPoints] = useState<MarketChartPoint[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [historySource, setHistorySource] = useState<'kyber' | 'coingecko' | 'live'>('live')
  const [defaultLoading, setDefaultLoading] = useState(false)
  const [marketReady, setMarketReady] = useState(false)
  const [routeSeedPrice, setRouteSeedPrice] = useState<number | null>(null)
  const [historyReloadTick, setHistoryReloadTick] = useState(0)
  const lastPairKeyRef = useRef<string>('')

  const pairKey = `${chainId}:${baseAddress.toLowerCase()}-${quoteAddress.toLowerCase()}`
  useEffect(() => {
    if (lastPairKeyRef.current === pairKey) return
    lastPairKeyRef.current = pairKey
    setPoints([])
    setHistoryPoints([])
    setHistoryLoaded(false)
    setHistorySource('live')
    setRouteSeedPrice(null)
    setMarketReady(false)
  }, [pairKey])

  useEffect(() => {
    const cached = readChartHistoryCache(pairKey, days)
    if (cached.length > 1) {
      setHistoryPoints(cached)
      setHistoryLoaded(true)
      setHistorySource('coingecko')
      setMarketReady(true)
    }
  }, [pairKey, days])

  useEffect(() => {
    // If this pair should have public history but is not on CoinGecko yet
    // (live-only or kyber fallback), periodically retry to upgrade source.
    if (!baseId || !quoteId) return
    if (historySource === 'coingecko') return
    const id = window.setInterval(() => {
      setHistoryReloadTick((n) => n + 1)
    }, HISTORY_REVALIDATE_MS)
    return () => window.clearInterval(id)
  }, [baseId, quoteId, historySource])

  useEffect(() => {
    let cancelled = false
    setDefaultLoading(true)
    void (async () => {
      try {
        const amountIn = parseUnits('1', baseDecimals).toString()
        const { routeSummary } = await fetchKyberRoute({
          chainId,
          tokenIn: baseAddress,
          tokenOut: quoteAddress,
          amountIn,
        })
        const out = Number(formatUnits(BigInt(routeSummary.amountOut), quoteDecimals))
        if (!cancelled && Number.isFinite(out) && out > 0) {
          setRouteSeedPrice(out)
          setPoints((prev) => {
            if (prev.length > 0) return prev
            const now = Date.now()
            return [
              { t: now - 1, price: out },
              { t: now, price: out },
            ]
          })
        }
      } catch {
        // no-op: keep empty state
      } finally {
        if (!cancelled) setDefaultLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chainId, baseAddress, quoteAddress, baseDecimals, quoteDecimals, days])

  useEffect(() => {
    // Keep chart responsive with periodic best-route snapshots:
    // - always in live mode
    // - also in Kyber-history mode to keep the anchor fresh
    if (historyLoaded && historySource !== 'kyber') return
    let stopped = false

    const pollMs =
      historyLoaded && historySource === 'kyber'
        ? LIVE_POLL_KYBER_MS
        : LIVE_ONLY_POLL_MS
    const dedupeMinGapMs = Math.min(600, Math.floor(pollMs * 0.4))

    const tick = async () => {
      try {
        const amountIn = parseUnits('1', baseDecimals).toString()
        const { routeSummary } = await fetchKyberRoute({
          chainId,
          tokenIn: baseAddress,
          tokenOut: quoteAddress,
          amountIn,
        })
        const out = Number(formatUnits(BigInt(routeSummary.amountOut), quoteDecimals))
        if (!Number.isFinite(out) || out <= 0 || stopped) return
        setRouteSeedPrice(out)
        if (historyLoaded && historySource === 'kyber' && historyPoints.length > 1) {
          setPoints(alignSeriesToTarget(historyPoints, out))
          return
        }
        const now = Date.now()
        setPoints((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (
            last &&
            Math.abs(last.price - out) < 1e-12 &&
            now - last.t < dedupeMinGapMs
          ) {
            return next
          }
          next.push({ t: now, price: out })
          if (next.length > MAX_POINTS) next.splice(0, next.length - MAX_POINTS)
          return next
        })
      } catch {
        // Ignore intermittent polling failures in live-only mode.
      }
    }

    const timer = window.setInterval(() => {
      void tick()
    }, pollMs)
    void tick()

    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [
    historyLoaded,
    historySource,
    historyPoints,
    chainId,
    baseAddress,
    quoteAddress,
    baseDecimals,
    quoteDecimals,
  ])

  useEffect(() => {
    let cancelled = false
    const hadCachedCoingecko = historyLoaded && historySource === 'coingecko'
    // Live route + interval run immediately (separate effects). Do not block the card on history APIs.
    setMarketReady(true)

    void (async () => {
      // Served from cache first (other effect): only refresh CoinGecko, never downgrade on error.
      if (hadCachedCoingecko) {
        if (!(baseId && quoteId)) return
        try {
          const [base, quote] = await Promise.all([
            fetchMarketChartWithRetry(baseId, days),
            fetchMarketChartWithRetry(quoteId, days),
          ])
          const series: MarketChartPoint[] = ratioSeries(base, quote)
          if (!cancelled && series.length > 1) {
            writeChartHistoryCache(pairKey, days, series)
            setHistoryPoints(series)
            setHistoryLoaded(true)
            setHistorySource('coingecko')
          }
        } catch {
          // keep existing cached series
        }
        return
      }

      // Perceived pipeline: Live (instant) → Kyber history when ready → CoinGecko replaces when ready.
      // Network: fetch Kyber + CoinGecko in parallel; final winner CoinGecko > Kyber > Live.
      let coingeckoApplied = false
      let kyberApplied = false

      const tryApplyCoingecko = (series: MarketChartPoint[]) => {
        if (cancelled || series.length <= 1) return
        coingeckoApplied = true
        kyberApplied = true
        writeChartHistoryCache(pairKey, days, series)
        setHistoryPoints(series)
        setHistoryLoaded(true)
        setHistorySource('coingecko')
      }

      const tryApplyKyber = (series: MarketChartPoint[]) => {
        if (cancelled || coingeckoApplied || series.length <= 1) return
        kyberApplied = true
        setHistoryPoints(series)
        setHistoryLoaded(true)
        setHistorySource('kyber')
      }

      const runCoingecko = async () => {
        if (!(baseId && quoteId)) return
        try {
          const [base, quote] = await Promise.all([
            fetchMarketChartWithRetry(baseId, days),
            fetchMarketChartWithRetry(quoteId, days),
          ])
          tryApplyCoingecko(ratioSeries(base, quote))
        } catch {
          // Kyber / live remain
        }
      }

      const runKyber = async () => {
        try {
          const kyberSeries = await fetchKyberPairHistory({
            baseSymbol,
            quoteSymbol,
            days,
          })
          tryApplyKyber(kyberSeries)
        } catch {
          // live remains
        }
      }

      await Promise.all([runKyber(), runCoingecko()])

      if (!cancelled && !coingeckoApplied && !kyberApplied) {
        setHistoryPoints([])
        setHistoryLoaded(false)
        setHistorySource('live')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    pairKey,
    baseSymbol,
    quoteSymbol,
    baseId,
    quoteId,
    days,
    historyReloadTick,
    historyLoaded,
    historySource,
  ])

  useEffect(() => {
    if (historyPoints.length > 0) {
      const target = routePairPrice ?? routeSeedPrice
      setPoints(alignSeriesToTarget(historyPoints, target))
      return
    }
    if (!Number.isFinite(routePairPrice ?? NaN) || (routePairPrice ?? 0) <= 0) return
    const now = Date.now()
    setPoints((prev) => {
      const next = [...prev]
      const last = next[next.length - 1]
      if (last && Math.abs(last.price - (routePairPrice ?? 0)) < 1e-12) {
        if (now - last.t < 8_000) return next
      }
      next.push({ t: now, price: routePairPrice! })
      if (next.length > MAX_POINTS) next.splice(0, next.length - MAX_POINTS)
      return next
    })
  }, [historyPoints, routePairPrice, routeSeedPrice])

  const path = useMemo(() => {
    if (!points.length) return null
    return buildPath(points, VB_W, VB_H, PAD)
  }, [points])

  const lastPrice = points.length ? points[points.length - 1]!.price : null
  const firstT = points.length ? points[0]!.t : null
  const midT =
    points.length > 0
      ? points[Math.floor((points.length - 1) / 2)]!.t
      : null
  const lastT = points.length ? points[points.length - 1]!.t : null

  const rangeBarPct = useMemo(() => {
    if (lastPrice == null || !path) return 50
    const { minP, maxP } = path
    const span = maxP - minP
    if (span <= 0) return 50
    return Math.min(100, Math.max(0, ((lastPrice - minP) / span) * 100))
  }, [lastPrice, path])

  const yAxisTicks = useMemo(() => {
    if (!path) return null
    const mid = (path.minP + path.maxP) / 2
    return [path.maxP, mid, path.minP]
  }, [path])

  const changePct = useMemo(() => {
    if (points.length < 2) return null
    const a = points[0]!.price
    const b = points[points.length - 1]!.price
    if (a === 0) return null
    return ((b - a) / a) * 100
  }, [points])

  const dateCompact = days <= 7

  if (marketReady && !routeLoading && !defaultLoading && points.length === 0) {
    return (
      <div className="flex min-h-[200px] min-w-0 w-full max-w-full flex-col justify-center rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914] p-5 text-center md:p-6">
        <p className="text-sm font-medium text-slate-400">
          {baseSymbol} / {pairLabelQuote}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          Waiting for best route quote for this pair. Enter an amount to load
          route-based pricing.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative min-w-0 w-full max-w-full overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]"
    >
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-eon-blue/35 to-transparent"
        aria-hidden
      />
      <div className="relative p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Price
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <h3 className="text-lg font-semibold text-white">
                {baseSymbol}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  / {pairLabelQuote}
                </span>
              </h3>
            </div>
            {lastPrice != null && (
              <p className="mt-1 font-mono text-lg font-medium tabular-nums text-eon-blue md:text-xl">
                {formatHeadlinePrice(lastPrice, false)}
              </p>
            )}
            <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
              {([7, 30, 90] as const).map((opt) => {
                const active = days === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => onDaysChange?.(opt)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                      active
                        ? 'bg-cyan-400 text-[#04111c]'
                        : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                    }`}
                    aria-pressed={active}
                  >
                    {opt === 90 ? '3M' : `${opt}D`}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                historySource === 'kyber'
                  ? 'bg-cyan-500/12 text-cyan-300 ring-cyan-500/25'
                  : historySource === 'coingecko'
                    ? 'bg-indigo-500/12 text-indigo-300 ring-indigo-500/25'
                    : 'bg-slate-500/12 text-slate-300 ring-slate-500/25'
              }`}
            >
              {historySource === 'kyber'
                ? 'Kyber History'
                : historySource === 'coingecko'
                  ? 'CoinGecko'
                  : 'Live Only'}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium ring-1 ${
                historyLoaded
                  ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
              }`}
            >
              {historyLoaded ? 'Market Trend Reference' : 'Execution Reference'}
            </span>
            {historyLoaded && changePct != null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                  changePct >= 0
                    ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
                    : 'bg-red-500/10 text-red-300 ring-red-500/20'
                }`}
              >
                <TrendingUp
                  className={`h-3.5 w-3.5 ${changePct < 0 ? 'rotate-180' : ''}`}
                  aria-hidden
                />
                {changePct >= 0 ? '+' : ''}
                {changePct.toFixed(2)}% ({days}d)
              </span>
            )}
          </div>
        </div>

        {path && lastPrice != null && (
          <div
            className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            aria-label="Price range for selected period"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Range ({days}d)
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
                {formatAxisPrice(path.minP, false)}
              </span>
              <div className="relative h-2 min-w-0 flex-1 rounded-full bg-slate-800/90">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-eon-blue/35"
                  style={{ width: `${rangeBarPct}%` }}
                  aria-hidden
                />
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0c0e22] bg-eon-blue shadow-[0_0_0_1px_rgba(0,210,255,0.35)]"
                  style={{ left: `${rangeBarPct}%` }}
                  title="Latest in range"
                />
              </div>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
                {formatAxisPrice(path.maxP, false)}
              </span>
            </div>
            <p className="mt-1.5 text-center font-mono text-[11px] tabular-nums text-slate-500">
              Now{' '}
              <span className="text-slate-300">
                {formatAxisPrice(lastPrice, false)}
              </span>
            </p>
          </div>
        )}

        <div className="relative mt-4 h-[148px] w-full md:h-[160px]">
          {(routeLoading || defaultLoading) && points.length === 0 && (
            <div className="flex h-full items-center justify-center text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
            </div>
          )}
          {!routeLoading && !defaultLoading && routeError && points.length === 0 && (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
              Route quote is unavailable right now. Try another amount or pair.
            </div>
          )}
          {path && points.length > 0 && (
            <div className="relative h-full w-full">
              <svg
                className="h-full w-full"
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <linearGradient
                    id="eon-chart-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="rgb(0, 210, 255)" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="rgb(0, 210, 255)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((t) => (
                  <line
                    key={t}
                    x1={PAD}
                    x2={VB_W - PAD}
                    y1={PAD + t * innerH}
                    y2={PAD + t * innerH}
                    stroke="rgba(148,163,184,0.08)"
                    strokeWidth="1"
                  />
                ))}
                <path
                  d={`${path.d} L ${VB_W - PAD} ${PAD + innerH} L ${PAD} ${PAD + innerH} Z`}
                  fill="url(#eon-chart-fill)"
                />
                <path
                  d={path.d}
                  fill="none"
                  stroke="rgb(0, 210, 255)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {yAxisTicks && (
                <div className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-between pr-1 pt-1 pb-1 font-mono text-[10px] tabular-nums text-slate-500">
                  {yAxisTicks.map((v, idx) => (
                    <span key={idx}>{formatAxisPrice(v, false)}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {!routeLoading &&
          points.length > 0 &&
          firstT != null &&
          lastT != null && (
            <div
              className="mt-2 flex items-center gap-1 border-t border-white/[0.06] pt-2 font-mono text-[10px] tabular-nums text-slate-500 md:gap-2 md:text-[11px]"
              aria-label="Chart time range"
            >
              <span className="min-w-0 flex-1 truncate text-left">
                {formatChartDate(firstT, dateCompact)}
              </span>
              {midT != null && (
                <span className="min-w-0 flex-1 truncate text-center text-slate-600">
                  {formatChartDate(midT, dateCompact)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-right">
                {formatChartDate(lastT, dateCompact)}
              </span>
            </div>
          )}

        <p className="mt-2 text-center text-[10px] text-slate-600">
          {historySource === 'kyber'
            ? `${days}d pair trend from Kyber market history, anchored to current best-route price`
            : historySource === 'coingecko'
              ? `${days}d pair trend from CoinGecko, anchored to current best-route price`
              : `Live route price only for ${baseSymbol}/${quoteSymbol}; ${days}d history unavailable now`}
        </p>
      </div>
    </motion.div>
  )
}
