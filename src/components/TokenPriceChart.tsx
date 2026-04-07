import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Loader2, TrendingUp } from 'lucide-react'
import { useMarketChart } from '../hooks/useMarketChart'
import { coingeckoIdForSymbol } from '../lib/coingecko'

const VB_W = 560
const VB_H = 200
const PAD = 10
const innerH = VB_H - PAD * 2

function formatAxisPrice(p: number) {
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(2)}M`
  if (p >= 1_000) return `$${(p / 1_000).toFixed(2)}K`
  if (p >= 1) return `$${p.toFixed(2)}`
  if (p >= 0.01) return `$${p.toFixed(4)}`
  return `$${p.toFixed(6)}`
}

function formatChartDate(ms: number, compact: boolean) {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(compact ? {} : { year: 'numeric' }),
  })
}

type Props = {
  symbol: string
  days?: 7 | 30
}

function buildPath(
  points: { t: number; price: number }[],
  width: number,
  height: number,
  pad: number,
): { d: string; minP: number; maxP: number } | null {
  if (points.length < 2) return null
  const prices = points.map((p) => p.price)
  const minP = Math.min(...prices)
  const maxP = Math.max(...prices)
  const span = maxP - minP || 1
  const innerW = width - pad * 2
  const innerHH = height - pad * 2
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * innerW
    const y = pad + innerHH - ((p.price - minP) / span) * innerHH
    return { x, y }
  })
  const d = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')
  return { d, minP, maxP }
}

export function TokenPriceChart({ symbol, days = 7 }: Props) {
  const coinId = coingeckoIdForSymbol(symbol)
  const { data, isLoading, isError } = useMarketChart(symbol, days)

  const path = useMemo(() => {
    if (!data?.length) return null
    return buildPath(data, VB_W, VB_H, PAD)
  }, [data])

  const lastPrice = data?.length ? data[data.length - 1]!.price : null
  const firstT = data?.length ? data[0]!.t : null
  const midT =
    data && data.length > 0
      ? data[Math.floor((data.length - 1) / 2)]!.t
      : null
  const lastT = data?.length ? data[data.length - 1]!.t : null

  const rangeBarPct = useMemo(() => {
    if (lastPrice == null || !path) return 50
    const { minP, maxP } = path
    const span = maxP - minP
    if (span <= 0) return 50
    return Math.min(100, Math.max(0, ((lastPrice - minP) / span) * 100))
  }, [lastPrice, path])

  const changePct = useMemo(() => {
    if (!data || data.length < 2) return null
    const a = data[0]!.price
    const b = data[data.length - 1]!.price
    if (a === 0) return null
    return ((b - a) / a) * 100
  }, [data])

  const dateCompact = days <= 7

  if (!coinId) {
    return (
      <div className="flex min-h-[200px] min-w-0 w-full max-w-full flex-col justify-center rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914] p-5 text-center md:p-6">
        <p className="text-sm font-medium text-slate-400">{symbol}</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-600">
          No public price feed is mapped for this token yet. Try a major pair
          (ETH, USDC, etc.) to see a chart.
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
                {symbol}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  / USD
                </span>
              </h3>
            </div>
            {lastPrice != null && (
              <p className="mt-1 font-mono text-lg font-medium tabular-nums text-eon-blue md:text-xl">
                {lastPrice.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits:
                    lastPrice >= 1 ? 2 : lastPrice >= 0.01 ? 4 : 6,
                })}
              </p>
            )}
          </div>
          {changePct != null && (
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

        {!isLoading && !isError && path && lastPrice != null && (
          <div
            className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            aria-label="Price range for selected period"
          >
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Range ({days}d)
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
                {formatAxisPrice(path.minP)}
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
                {formatAxisPrice(path.maxP)}
              </span>
            </div>
            <p className="mt-1.5 text-center font-mono text-[11px] tabular-nums text-slate-500">
              Now{' '}
              <span className="text-slate-300">{formatAxisPrice(lastPrice)}</span>
            </p>
          </div>
        )}

        <div className="relative mt-4 h-[148px] w-full md:h-[160px]">
          {isLoading && (
            <div className="flex h-full items-center justify-center text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
            </div>
          )}
          {isError && !isLoading && (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-500">
              Chart could not be loaded. CoinGecko may be rate-limiting; try
              again shortly.
            </div>
          )}
          {!isLoading && !isError && path && data && (
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
          )}
        </div>

        {!isLoading &&
          !isError &&
          data?.length &&
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
          Indicative USD prices from CoinGecko · Not a trading signal
        </p>
      </div>
    </motion.div>
  )
}
