import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, TrendingUp } from 'lucide-react'
import {
  coingeckoIdForSymbol,
  fetchMarketChartUsd,
  type MarketChartPoint,
} from '../lib/coingecko'
import {
  readChartHistoryCache,
  readLiveChartCache,
  writeChartHistoryCache,
  writeLiveChartCache,
} from '../lib/chartHistoryCache'

const VB_W = 560
const VB_H = 200
const PAD = 10
const MAX_POINTS = 90
const CHART_HISTORY_RETRY_DELAYS_MS = [120, 250]
const GRID_ROWS = 4
const GRID_COLS = 6
const MIN_ZOOM_POINTS = 12

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

type TimePreset = '1H' | '4H' | '1D' | '1W' | 'ALL'

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

function formatTooltipDate(ms: number) {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatAxisTime(ms: number) {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function ratioSeries(base: MarketChartPoint[], quote: MarketChartPoint[]) {
  const len = Math.min(base.length, quote.length)
  if (len < 2) return []
  const out: MarketChartPoint[] = []
  
  for (let i = 0; i < len; i += 1) {
    const b = base[base.length - len + i]
    const q = quote[quote.length - len + i]
    if (!b || !q || q.price <= 0 || b.price <= 0) continue
    
    const ratio = b.price / q.price
    
    // Validate ratio is reasonable (prevent division errors)
    if (!Number.isFinite(ratio) || ratio <= 0) continue
    
    // Filter out extreme outliers (likely data errors)
    // Most crypto pairs won't have ratios > 1,000,000 or < 0.000001
    if (ratio > 1_000_000 || ratio < 0.000001) continue
    
    out.push({ t: Math.min(b.t, q.t), price: ratio })
  }
  
  return out
}

function mergeSeries(
  first: MarketChartPoint[],
  second: MarketChartPoint[],
  maxAgeMs: number,
): MarketChartPoint[] {
  const now = Date.now()
  const byTs = new Map<number, number>()
  for (const p of [...first, ...second]) {
    if (!Number.isFinite(p.t) || !Number.isFinite(p.price) || p.price <= 0) continue
    if (now - p.t > maxAgeMs) continue
    byTs.set(p.t, p.price)
  }
  return [...byTs.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, price]) => ({ t, price }))
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
  
  // Prevent extreme scaling (max 10x up or down)
  // If alignment factor is too extreme, don't align
  if (factor > 10 || factor < 0.1) return series
  
  // Also check if the absolute price difference is reasonable
  const priceDiff = Math.abs(targetPrice! - last)
  const avgPrice = (targetPrice! + last) / 2
  const diffPercent = (priceDiff / avgPrice) * 100
  
  // If prices differ by more than 500%, don't align (likely data issue)
  if (diffPercent > 500) return series
  
  return series.map((p) => ({ t: p.t, price: p.price * factor }))
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
      ? [points[0]!, { t: points[0]!.t + 1, price: points[0]!.price }]
      : points
  const prices = normalized.map((p) => p.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const span = maxP - minP || 1
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const coords = normalized.map((p, i) => {
    const x = pad + (i / (normalized.length - 1)) * innerW
    const y = pad + innerH - ((p.price - minP) / span) * innerH
    return { x, y }
  })
  const d = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')
  return { d, minP, maxP }
}

function chartCoords(
  points: { t: number; price: number }[],
  width: number,
  height: number,
  pad: number,
): { x: number; y: number; t: number; price: number }[] {
  if (points.length < 1) return []
  const normalized =
    points.length === 1
      ? [points[0]!, { t: points[0]!.t + 1, price: points[0]!.price }]
      : points
  const prices = normalized.map((p) => p.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const span = maxP - minP || 1
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  return normalized.map((p, i) => ({
    x: pad + (i / (normalized.length - 1)) * innerW,
    y: pad + innerH - ((p.price - minP) / span) * innerH,
    t: p.t,
    price: p.price,
  }))
}

function movingAverage(
  points: { t: number; price: number }[],
  windowSize: number,
): { t: number; price: number }[] {
  if (points.length < windowSize) return []
  const out: { t: number; price: number }[] = []
  let sum = 0
  for (let i = 0; i < points.length; i += 1) {
    sum += points[i]!.price
    if (i >= windowSize) {
      sum -= points[i - windowSize]!.price
    }
    if (i >= windowSize - 1) {
      out.push({
        t: points[i]!.t,
        price: sum / windowSize,
      })
    }
  }
  return out
}

function yFromPrice(price: number, minP: number, maxP: number) {
  const span = maxP - minP || 1
  const innerH = VB_H - PAD * 2
  return PAD + innerH - ((price - minP) / span) * innerH
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function formatRangeDuration(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60000))
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h`
  const days = Math.round(hours / 24)
  return `${days}d`
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
  routePairPrice,
  routeLoading,
  routeError,
  onDaysChange,
  days = 7,
}: Props) {
  const pairLabelQuote = quoteSymbol
  const baseId = coingeckoIdForSymbol(baseSymbol)
  const quoteId = coingeckoIdForSymbol(quoteSymbol)
  const pairKey = `${chainId}:${baseAddress.toLowerCase()}-${quoteAddress.toLowerCase()}`
  const usdLike = quoteSymbol.toUpperCase().includes('USD')

  const [points, setPoints] = useState<{ t: number; price: number }[]>([])
  const [historySource, setHistorySource] = useState<'coingecko' | 'live'>('live')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [hasCoinGeckoData, setHasCoinGeckoData] = useState(false)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [chartMode, setChartMode] = useState<'line' | 'candle'>('line')
  const [showMa7, setShowMa7] = useState(true)
  const [showMa25, setShowMa25] = useState(true)
  const [timePreset, setTimePreset] = useState<TimePreset>('ALL')
  const [zoomRange, setZoomRange] = useState<{ start: number; end: number } | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)

  // Auto-reset state when pair or timeframe changes
  useEffect(() => {
    console.log('Chart: Pair/timeframe changed, resetting state...')
    setPoints([])
    setHistorySource('live')
    setHasCoinGeckoData(false)
    setHistoryLoading(false)
    setLastFetchTime(0)
    setHoverIdx(null)
    setZoomRange(null)
  }, [pairKey, days])

  useEffect(() => {
    let cancelled = false
    const ttlMs = days * 24 * 60 * 60 * 1000
    const liveCached = readLiveChartCache(pairKey, days)
    
    // Show live data immediately if available
    if (!cancelled && liveCached.length > 1) {
      setPoints(liveCached.slice(-MAX_POINTS).map((p) => ({ t: p.t, price: p.price })))
      setHistorySource('live')
      setHasCoinGeckoData(false)
    }
    
    // If either token has no CoinGecko ID, use live data only
    if (!baseId || !quoteId) {
      if (!cancelled) {
        setHistoryLoading(false)
        setHasCoinGeckoData(false)
      }
      return
    }
    
    setHistoryLoading(true)
    
    ;(async () => {
      try {
        // Check cache first (instant if available)
        const cached = readChartHistoryCache(pairKey, days)
        if (!cancelled && cached.length > 1) {
          const mergedCached = mergeSeries(cached, liveCached, ttlMs)
          const aligned = alignSeriesToTarget(mergedCached, routePairPrice)
          if (aligned.length > 0) {
            setPoints(aligned.slice(-MAX_POINTS).map((p) => ({ t: p.t, price: p.price })))
            setHistorySource('coingecko')
            setHasCoinGeckoData(true)
          }
        }

        // Fetch fresh data in background
        const [baseSeries, quoteSeries] = await Promise.all([
          fetchMarketChartWithRetry(baseId, days),
          fetchMarketChartWithRetry(quoteId, days),
        ])
        if (cancelled) return
        
        const ratio = ratioSeries(baseSeries, quoteSeries)
        
        // Only use CoinGecko data if we got meaningful results
        if (ratio.length > 1) {
          writeChartHistoryCache(pairKey, days, ratio)
          const merged = mergeSeries(ratio, liveCached, ttlMs)
          const aligned = alignSeriesToTarget(merged, routePairPrice)
          
          // Final validation: ensure aligned data looks reasonable
          if (aligned.length > 0) {
            const prices = aligned.map((p) => p.price)
            const minPrice = Math.min(...prices)
            const maxPrice = Math.max(...prices)
            
            // If range is too extreme (>1000x), use live data only
            if (maxPrice / minPrice < 1000) {
              if (!cancelled) {
                setPoints(aligned.slice(-MAX_POINTS).map((p) => ({ t: p.t, price: p.price })))
                setHistorySource('coingecko')
                setHasCoinGeckoData(true)
                setLastFetchTime(Date.now())
              }
            } else {
              console.warn('Chart: CoinGecko data too volatile, using live only')
              if (!cancelled) setHasCoinGeckoData(false)
            }
          }
        } else {
          if (!cancelled) setHasCoinGeckoData(false)
        }
      } catch (err) {
        // keep live source only
        if (!cancelled) setHasCoinGeckoData(false)
        console.warn('Chart: CoinGecko fetch failed, using live only', err)
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    })()
    
    return () => {
      cancelled = true
    }
  }, [baseId, quoteId, pairKey, days, routePairPrice])

  useEffect(() => {
    if (!Number.isFinite(routePairPrice ?? NaN) || (routePairPrice ?? 0) <= 0) return
    
    setPoints((prev) => {
      const now = Date.now()
      const ttlMs = days * 24 * 60 * 60 * 1000
      
      // Validate against previous points to prevent outliers
      if (prev.length > 0) {
        const recentPoints = prev.slice(-5) // Check last 5 points
        const avgRecent = recentPoints.reduce((sum, p) => sum + p.price, 0) / recentPoints.length
        
        // Reject price if it's more than 10x different from recent average
        // This prevents erratic jumps from bad quotes
        if (Math.abs(routePairPrice! - avgRecent) > avgRecent * 10) {
          console.warn('Chart: Rejecting outlier price', { 
            new: routePairPrice, 
            avg: avgRecent 
          })
          return prev // Keep existing points
        }
      }
      
      const next = [...prev, { t: now, price: routePairPrice as number }]
        .filter((p) => now - p.t <= ttlMs)
        .slice(-MAX_POINTS)
      const deduped = mergeSeries(next, [], ttlMs).slice(-MAX_POINTS)
      writeLiveChartCache(pairKey, days, deduped)
      
      // Update source to live if no CoinGecko data yet or if live is fresher
      if (!hasCoinGeckoData) {
        setHistorySource('live')
      }
      
      return deduped
    })
  }, [routePairPrice, days, pairKey, hasCoinGeckoData])

  // Auto-refresh CoinGecko data periodically (every 3 minutes)
  useEffect(() => {
    if (!baseId || !quoteId || !hasCoinGeckoData) return
    
    const AUTO_REFRESH_MS = 3 * 60 * 1000 // 3 minutes
    const timeSinceLastFetch = Date.now() - lastFetchTime
    
    if (timeSinceLastFetch < AUTO_REFRESH_MS) {
      // Schedule refresh when needed
      const timer = setTimeout(() => {
        console.log('Chart: Auto-refreshing CoinGecko data')
        setLastFetchTime(0) // Trigger re-fetch in main useEffect
      }, AUTO_REFRESH_MS - timeSinceLastFetch)
      
      return () => clearTimeout(timer)
    }
  }, [baseId, quoteId, hasCoinGeckoData, lastFetchTime])

  const basePoints = useMemo(() => {
    if (points.length < 2 || timePreset === 'ALL') return points
    const now = points[points.length - 1]?.t ?? Date.now()
    const presetMs: Record<Exclude<TimePreset, 'ALL'>, number> = {
      '1H': 60 * 60 * 1000,
      '4H': 4 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000,
    }
    const threshold = now - presetMs[timePreset]
    const filtered = points.filter((p) => p.t >= threshold)
    return filtered.length >= 2 ? filtered : points
  }, [points, timePreset])

  useEffect(() => {
    if (!zoomRange) return
    const maxIdx = Math.max(0, basePoints.length - 1)
    if (zoomRange.start > maxIdx) {
      setZoomRange(null)
      return
    }
    if (zoomRange.end > maxIdx) {
      setZoomRange({ start: zoomRange.start, end: maxIdx })
    }
  }, [basePoints, zoomRange])

  const zoomIn = () => {
    if (basePoints.length <= MIN_ZOOM_POINTS) return
    const current = zoomRange ?? { start: 0, end: basePoints.length - 1 }
    const len = current.end - current.start + 1
    if (len <= MIN_ZOOM_POINTS) return
    const nextLen = Math.max(MIN_ZOOM_POINTS, Math.floor(len * 0.7))
    const end = current.end
    const start = clamp(end - nextLen + 1, 0, Math.max(0, basePoints.length - nextLen))
    setZoomRange({ start, end: start + nextLen - 1 })
  }

  const zoomOut = () => {
    if (basePoints.length <= MIN_ZOOM_POINTS) {
      setZoomRange(null)
      return
    }
    if (!zoomRange) return
    const len = zoomRange.end - zoomRange.start + 1
    const nextLen = Math.min(basePoints.length, Math.ceil(len / 0.7))
    if (nextLen >= basePoints.length) {
      setZoomRange(null)
      return
    }
    const end = zoomRange.end
    const start = clamp(end - nextLen + 1, 0, Math.max(0, basePoints.length - nextLen))
    setZoomRange({ start, end: start + nextLen - 1 })
  }

  const renderPoints = useMemo(() => {
    if (!zoomRange) return basePoints
    return basePoints.slice(zoomRange.start, zoomRange.end + 1)
  }, [basePoints, zoomRange])

  const ma7 = useMemo(() => movingAverage(renderPoints, 7), [renderPoints])
  const ma25 = useMemo(() => movingAverage(renderPoints, 25), [renderPoints])
  const path = useMemo(() => buildPath(renderPoints, VB_W, VB_H, PAD), [renderPoints])
  const coords = useMemo(() => chartCoords(renderPoints, VB_W, VB_H, PAD), [renderPoints])
  const ma7Path = useMemo(
    () => (showMa7 ? buildPath(ma7, VB_W, VB_H, PAD) : null),
    [ma7, showMa7],
  )
  const ma25Path = useMemo(
    () => (showMa25 ? buildPath(ma25, VB_W, VB_H, PAD) : null),
    [ma25, showMa25],
  )
  const candleSeries = useMemo<{
    data: Array<{
      x: number
      openY: number
      closeY: number
      highY: number
      lowY: number
      up: boolean
    }>
    candleWidth: number
  } | null>(() => {
    if (!path || renderPoints.length < 2) return null
    const innerW = VB_W - PAD * 2
    const step = innerW / Math.max(1, renderPoints.length - 1)
    const candleWidth = Math.max(2, Math.min(8, step * 0.6))
    const out: Array<{
      x: number
      openY: number
      closeY: number
      highY: number
      lowY: number
      up: boolean
    }> = []
    for (let i = 1; i < renderPoints.length; i += 1) {
      const prev = renderPoints[i - 1]!
      const cur = renderPoints[i]!
      const open = prev.price
      const close = cur.price
      const high = Math.max(open, close)
      const low = Math.min(open, close)
      out.push({
        x: PAD + i * step,
        openY: yFromPrice(open, path.minP, path.maxP),
        closeY: yFromPrice(close, path.minP, path.maxP),
        highY: yFromPrice(high, path.minP, path.maxP),
        lowY: yFromPrice(low, path.minP, path.maxP),
        up: close >= open,
      })
    }
    return { data: out, candleWidth }
  }, [renderPoints, path])
  const loading = (routeLoading || historyLoading) && renderPoints.length === 0
  const error = renderPoints.length === 0 ? routeError : null
  const latest = renderPoints[renderPoints.length - 1]?.price ?? null
  const sourceLabel = historySource === 'coingecko' ? 'CoinGecko market' : 'Live route'
  const activeIdx = hoverIdx != null ? Math.max(0, Math.min(hoverIdx, coords.length - 1)) : null
  const activePoint = activeIdx != null ? coords[activeIdx] : null
  const activePrice = activePoint?.price ?? latest
  const rangeLabel = useMemo(() => {
    if (renderPoints.length < 2) return `${days}D`
    const first = renderPoints[0]!.t
    const last = renderPoints[renderPoints.length - 1]!.t
    return formatRangeDuration(Math.max(0, last - first))
  }, [renderPoints, days])
  const intervalLabel = useMemo(() => {
    if (renderPoints.length < 2) return '—'
    const total = renderPoints[renderPoints.length - 1]!.t - renderPoints[0]!.t
    const avg = total / Math.max(1, renderPoints.length - 1)
    return formatRangeDuration(Math.max(60000, avg))
  }, [renderPoints])
  const yTicks = useMemo(() => {
    if (!path) return []
    return Array.from({ length: GRID_ROWS }).map((_, i) => {
      const ratio = i / (GRID_ROWS - 1)
      const price = path.maxP - (path.maxP - path.minP) * ratio
      const y = PAD + ((VB_H - PAD * 2) * i) / (GRID_ROWS - 1)
      return { y, price }
    })
  }, [path])
  const timeTicks = useMemo(() => {
    if (renderPoints.length < 2) return []
    const idxs = [0, Math.floor((renderPoints.length - 1) / 2), renderPoints.length - 1]
    return idxs.map((idx) => ({
      idx,
      label: formatAxisTime(renderPoints[idx]!.t),
    }))
  }, [renderPoints])
  const overviewPath = useMemo(() => buildPath(basePoints, VB_W, 56, 6), [basePoints])

  return (
    <section className="rounded-3xl border border-uni-border bg-uni-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 shrink-0">
          <p className="text-xs uppercase tracking-widest text-neutral-500">Pair chart</p>
          <p
            className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
              historySource === 'coingecko' 
                ? 'bg-emerald-500/15 text-emerald-300' 
                : 'bg-uni-pink/15 text-uni-pink'
            }`}
          >
            {historyLoading && '⟳ '}
            {baseSymbol}/{quoteSymbol}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="rounded-full bg-uni-surface-2 px-2 py-0.5 text-[10px] text-neutral-400">
            {historySource === 'coingecko' ? 'CoinGecko' : 'Live'}
          </span>
          <div className="inline-flex rounded-lg border border-uni-border bg-uni-surface-2 p-0.5">
            {(['line', 'candle'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setChartMode(m)}
                className={`rounded-md px-1.5 py-1 text-[10px] uppercase sm:px-2 ${
                  chartMode === m ? 'bg-uni-pink/20 text-uni-pink' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-uni-border bg-uni-surface-2 p-0.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDaysChange?.(d as 7 | 30 | 90)}
                className={`rounded-md px-1.5 py-1 text-[10px] uppercase sm:px-2 ${
                  days === d ? 'bg-uni-pink/20 text-uni-pink' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-uni-border bg-uni-surface-2 p-0.5">
            {(['1H', '4H', '1D', '1W', 'ALL'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setTimePreset(preset)
                  setZoomRange(null)
                }}
                className={`rounded-md px-1 py-1 text-[10px] uppercase sm:px-2 ${
                  timePreset === preset
                    ? 'bg-uni-pink/20 text-uni-pink'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-uni-border bg-uni-surface-2 p-0.5">
            <button
              type="button"
              onClick={zoomOut}
              className="rounded-md px-2 py-1 text-[10px] text-neutral-300 hover:text-white"
            >
              -
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className="rounded-md px-2 py-1 text-[10px] text-neutral-300 hover:text-white"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-400 sm:gap-2">
        <button
          type="button"
          onClick={() => setShowMa7((v) => !v)}
          className={`shrink-0 rounded-md border border-uni-border px-2 py-0.5 ${showMa7 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-uni-surface-2 text-neutral-500'}`}
        >
          MA7
        </button>
        <button
          type="button"
          onClick={() => setShowMa25((v) => !v)}
          className={`shrink-0 rounded-md border border-uni-border px-2 py-0.5 ${showMa25 ? 'bg-fuchsia-500/15 text-fuchsia-300' : 'bg-uni-surface-2 text-neutral-500'}`}
        >
          MA25
        </button>
        <span className="min-w-0 break-words text-neutral-500">
          Data {days}D · View {timePreset} · Range {rangeLabel} · Interval ~{intervalLabel}
        </span>
      </div>

      {loading ? (
        <div className="flex h-44 items-center justify-center text-neutral-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading chart...
        </div>
      ) : error ? (
        <div className="flex h-44 items-center justify-center text-center text-sm text-rose-300">
          {error}
        </div>
      ) : path ? (
        <div className="relative">
          <motion.svg
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-44 w-full"
            onMouseLeave={() => setHoverIdx(null)}
            onMouseMove={(e) => {
              if (coords.length === 0) return
              const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
              const x = ((e.clientX - rect.left) / rect.width) * VB_W
              const idx = Math.round(((x - PAD) / (VB_W - PAD * 2)) * (coords.length - 1))
              setHoverIdx(idx)
            }}
          >
            <defs>
              <linearGradient id="chart-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff6b9d" />
                <stop offset="100%" stopColor="#ff007a" />
              </linearGradient>
              <linearGradient id="chart-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,0,122,0.28)" />
                <stop offset="100%" stopColor="rgba(255,0,122,0.02)" />
              </linearGradient>
            </defs>

            {Array.from({ length: GRID_ROWS }).map((_, i) => {
              const y = PAD + ((VB_H - PAD * 2) * i) / (GRID_ROWS - 1)
              return (
                <line
                  key={`gy-${i}`}
                  x1={PAD}
                  y1={y}
                  x2={VB_W - PAD}
                  y2={y}
                  stroke="rgba(148,163,184,0.15)"
                  strokeWidth="1"
                />
              )
            })}
            {Array.from({ length: GRID_COLS }).map((_, i) => {
              const x = PAD + ((VB_W - PAD * 2) * i) / (GRID_COLS - 1)
              return (
                <line
                  key={`gx-${i}`}
                  x1={x}
                  y1={PAD}
                  x2={x}
                  y2={VB_H - PAD}
                  stroke="rgba(148,163,184,0.08)"
                  strokeWidth="1"
                />
              )
            })}

            <path
              d={`${path.d} L ${VB_W - PAD} ${VB_H - PAD} L ${PAD} ${VB_H - PAD} Z`}
              fill="url(#chart-fill)"
              stroke="none"
            />
            {chartMode === 'line' ? (
              <path d={path.d} fill="none" stroke="url(#chart-stroke)" strokeWidth="2.2" strokeLinecap="round" />
            ) : (
              candleSeries &&
              candleSeries.data.map((c, i) => (
                <g key={`c-${i}`}>
                  <line x1={c.x} y1={c.highY} x2={c.x} y2={c.lowY} stroke={c.up ? '#00d38b' : '#ff4d7d'} strokeWidth="1.3" />
                  <rect
                    x={c.x - candleSeries.candleWidth / 2}
                    y={Math.min(c.openY, c.closeY)}
                    width={candleSeries.candleWidth}
                    height={Math.max(1.2, Math.abs(c.closeY - c.openY))}
                    fill={c.up ? 'rgba(0,211,139,0.88)' : 'rgba(255,77,125,0.88)'}
                  />
                </g>
              ))
            )}

            {ma7Path ? (
              <path d={ma7Path.d} fill="none" stroke="rgba(52,211,153,0.9)" strokeWidth="1.3" strokeDasharray="3 3" />
            ) : null}
            {ma25Path ? (
              <path d={ma25Path.d} fill="none" stroke="rgba(217,70,239,0.9)" strokeWidth="1.3" strokeDasharray="5 4" />
            ) : null}

            {activePoint ? (
              <>
                <line
                  x1={activePoint.x}
                  y1={PAD}
                  x2={activePoint.x}
                  y2={VB_H - PAD}
                  stroke="rgba(255,0,122,0.6)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <circle cx={activePoint.x} cy={activePoint.y} r="3.5" fill="#FF007A" />
                <circle cx={activePoint.x} cy={activePoint.y} r="7" fill="rgba(255,0,122,0.2)" />
              </>
            ) : null}
          </motion.svg>

          {activePoint ? (
            <div className="pointer-events-none absolute left-2 top-2 rounded-md border border-uni-pink/25 bg-uni-surface/95 px-2 py-1 text-[10px] text-neutral-200">
              <div className="font-semibold">{formatHeadlinePrice(activePoint.price, usdLike)}</div>
              <div className="text-neutral-400">{formatTooltipDate(activePoint.t)}</div>
            </div>
          ) : null}

          {yTicks.length > 0 ? (
            <div className="pointer-events-none absolute right-1 top-1 flex h-[calc(100%-0.5rem)] flex-col justify-between">
              {yTicks.map((tick) => (
                <span
                  key={`yt-${tick.y}`}
                  className="rounded bg-uni-surface/80 px-1 py-0.5 text-[10px] text-neutral-400"
                >
                  {formatAxisPrice(tick.price, usdLike)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex h-44 items-center justify-center text-neutral-400">No data</div>
      )}

      {timeTicks.length > 0 ? (
        <div className="mt-1 flex items-center justify-between text-[10px] text-neutral-500">
          {timeTicks.map((tick, i) => (
            <span key={`tt-${i}-${tick.idx}-${tick.label}`}>{tick.label}</span>
          ))}
        </div>
      ) : null}

      {overviewPath && basePoints.length > 8 ? (
        <div className="mt-2 rounded-md border border-uni-border bg-uni-surface-2 p-1.5">
          <svg viewBox={`0 0 ${VB_W} 56`} className="h-12 w-full">
            <path
              d={`${overviewPath.d} L ${VB_W - 6} 50 L 6 50 Z`}
              fill="rgba(255,0,122,0.12)"
            />
            <path d={overviewPath.d} fill="none" stroke="rgba(255,107,157,0.9)" strokeWidth="1.5" />
            {zoomRange ? (
              (() => {
                const innerW = VB_W - 12
                const maxIdx = Math.max(1, basePoints.length - 1)
                const x1 = 6 + (zoomRange.start / maxIdx) * innerW
                const x2 = 6 + (zoomRange.end / maxIdx) * innerW
                return (
                  <rect
                    x={x1}
                    y={6}
                    width={Math.max(1, x2 - x1)}
                    height={44}
                    fill="rgba(255,0,122,0.18)"
                    stroke="rgba(255,0,122,0.7)"
                  />
                )
              })()
            ) : null}
          </svg>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${historySource === 'coingecko' ? 'bg-emerald-400' : 'bg-uni-pink animate-pulse'}`} />
          Source: {sourceLabel}
          {historyLoading && <span className="text-[10px] text-neutral-500">(updating...)</span>}
        </span>
        <span>
          {activePrice == null ? '—' : formatHeadlinePrice(activePrice, usdLike)} ({pairLabelQuote})
        </span>
      </div>

      {path ? (
        <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Low {formatAxisPrice(path.minP, usdLike)}</span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            High {formatAxisPrice(path.maxP, usdLike)}
          </span>
        </div>
      ) : null}
    </section>
  )
}
