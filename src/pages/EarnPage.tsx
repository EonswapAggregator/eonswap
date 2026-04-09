import { motion } from 'framer-motion'
import {
  ArrowRight,
  ChevronDown,
  Coins,
  ExternalLink,
  Layers3,
  Loader2,
  Percent,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { eonChains } from '../lib/chains'
import { NATIVE_AGGREGATOR, tokensForChain } from '../lib/tokens'
import { trustWalletTokenLogoUrl } from '../lib/tokenLogos'

type LlamaPool = {
  pool: string
  chain: string
  project: string
  symbol: string
  apy?: number
  tvlUsd?: number
  stablecoin?: boolean
  exposure?: string
  ilRisk?: string
  url?: string
}

const CHAIN_ID_TO_LLAMA: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  56: 'BSC',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
}

const FETCH_TIMEOUT_MS = 12000
const FETCH_RETRY_DELAYS_MS = [450, 1000]
const STALE_MS = 5 * 60 * 1000
const EARN_FILTERS_STORAGE_KEY = 'eonswap.earn.filters.v1'

async function fetchEarnPools(): Promise<LlamaPool[]> {
  const url = 'https://yields.llama.fi/pools'
  let lastError: unknown = null
  for (let i = 0; i <= FETCH_RETRY_DELAYS_MS.length; i += 1) {
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: 'application/json' },
      })
      const json = (await res.json().catch(() => null)) as { data?: LlamaPool[] } | null
      if (!res.ok || !Array.isArray(json?.data)) {
        if (i < FETCH_RETRY_DELAYS_MS.length) {
          await new Promise((r) => window.setTimeout(r, FETCH_RETRY_DELAYS_MS[i]))
          continue
        }
        throw new Error(`Pool API failed (${res.status})`)
      }
      return json.data
    } catch (e) {
      lastError = e
      if (i < FETCH_RETRY_DELAYS_MS.length) {
        await new Promise((r) => window.setTimeout(r, FETCH_RETRY_DELAYS_MS[i]))
        continue
      }
    } finally {
      window.clearTimeout(timer)
    }
  }
  const msg = String(lastError instanceof Error ? lastError.message : lastError ?? '')
  throw new Error(msg || 'Failed to fetch pools')
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '—'
  if (value < 1000) return `$${value.toFixed(0)}`
  if (value < 1_000_000) return `$${(value / 1000).toFixed(1)}K`
  if (value < 1_000_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  return `$${(value / 1_000_000_000).toFixed(2)}B`
}

function formatApy(value?: number): string {
  if (!Number.isFinite(value) || value == null) return '—'
  if (value < 0) return '0.00%'
  if (value > 9999) return '>9999%'
  return `${value.toFixed(2)}%`
}

function defaultTokenSymbolForChain(chainId: number): string {
  const symbols = new Set(tokensForChain(chainId).map((t) => t.symbol.toUpperCase()))
  if (symbols.has('USDC')) return 'USDC'
  if (symbols.has('USDT')) return 'USDT'
  if (symbols.has('ETH')) return 'ETH'
  if (symbols.has('WETH')) return 'WETH'
  return 'ALL'
}

function ilRiskLabel(value?: string): string {
  const v = String(value ?? '').trim().toLowerCase()
  if (!v) return 'IL: n/a'
  if (v === 'yes') return 'IL: yes'
  if (v === 'no') return 'IL: no'
  return `IL: ${v}`
}

function exposureLabel(value?: string): string {
  const v = String(value ?? '').trim()
  if (!v) return ''
  if (v.toLowerCase() === 'multi') return 'Multi'
  return v
}

type SelectorOption = {
  value: string
  label: string
  iconUrl: string | null
}

function poolPairSymbols(symbol: string): [string, string] {
  const parts = symbol
    .split(/[/\-\s]/u)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
  const a = parts[0] ?? 'TKN'
  const b = parts[1] ?? 'TKN'
  return [a, b]
}

function tokenLogoUrlBySymbol(chainId: number, symbol: string): string | null {
  const token = tokensForChain(chainId).find((t) => t.symbol.toUpperCase() === symbol.toUpperCase())
  if (!token) return null
  return trustWalletTokenLogoUrl(chainId, token.address)
}

function PoolPairIcon({
  chainId,
  symbol,
}: {
  chainId: number
  symbol: string
}) {
  const [a, b] = poolPairSymbols(symbol)
  const aLogo = tokenLogoUrlBySymbol(chainId, a)
  const bLogo = tokenLogoUrlBySymbol(chainId, b)

  const iconClass = 'h-7 w-7 rounded-full object-cover ring-1 ring-white/20'
  const placeholderClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-slate-300 ring-1 ring-white/20'

  return (
    <span className="inline-flex items-center shrink-0">
      {aLogo ? (
        <img src={aLogo} alt={a} className={iconClass} loading="lazy" />
      ) : (
        <span className={placeholderClass}>{a.slice(0, 1)}</span>
      )}
      <span className="-ml-2.5">
        {bLogo ? (
          <img src={bLogo} alt={b} className={iconClass} loading="lazy" />
        ) : (
          <span className={placeholderClass}>{b.slice(0, 1)}</span>
        )}
      </span>
    </span>
  )
}

function IconSelect({
  options,
  value,
  onChange,
  fallbackIcon,
  open,
  onOpenChange,
}: {
  options: SelectorOption[]
  value: string
  onChange: (next: string) => void
  fallbackIcon?: string
  open: boolean
  onOpenChange: (next: boolean) => void
}) {
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-icon-select-root]')) onOpenChange(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onOpenChange])

  if (!selected) return null

  return (
    <div className="relative" data-icon-select-root>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-200 outline-none"
      >
        {selected.iconUrl ? (
          <img
            src={selected.iconUrl}
            alt={selected.label}
            className="h-4 w-4 rounded-full object-cover ring-1 ring-white/15"
            loading="lazy"
          />
        ) : (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/[0.08] text-[9px] text-slate-400 ring-1 ring-white/15">
            {fallbackIcon ?? '*'}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-left">{selected.label}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-lg border border-white/[0.14] bg-[#0c1027] p-1.5 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.9)]">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                onOpenChange(false)
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                opt.value === value
                  ? 'bg-cyan-400/15 text-cyan-100'
                  : 'text-slate-200 hover:bg-white/[0.06]'
              }`}
            >
              {opt.iconUrl ? (
                <img
                  src={opt.iconUrl}
                  alt={opt.label}
                  className="h-4 w-4 rounded-full object-cover ring-1 ring-white/15"
                  loading="lazy"
                />
              ) : (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/[0.08] text-[9px] text-slate-400 ring-1 ring-white/15">
                  {fallbackIcon ?? '*'}
                </span>
              )}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function EarnPage() {
  const [chainId, setChainId] = useState<number>(1)
  const [tokenSymbol, setTokenSymbol] = useState<string>(defaultTokenSymbolForChain(1))
  const [query, setQuery] = useState('')
  const [pools, setPools] = useState<LlamaPool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number>(0)
  const [openSelect, setOpenSelect] = useState<'chain' | 'token' | null>(null)

  const tokenOptions = useMemo(() => {
    const symbols = ['ALL', ...new Set(tokensForChain(chainId).map((t) => t.symbol.toUpperCase()))]
    return symbols
  }, [chainId])
  const chainSelectOptions = useMemo<SelectorOption[]>(
    () =>
      eonChains.map((c) => ({
        value: String(c.id),
        label: c.name,
        iconUrl: trustWalletTokenLogoUrl(c.id, NATIVE_AGGREGATOR),
      })),
    [],
  )
  const tokenSelectOptions = useMemo<SelectorOption[]>(
    () =>
      tokenOptions.map((sym) => {
        const token = tokensForChain(chainId).find((t) => t.symbol.toUpperCase() === sym)
        return {
          value: sym,
          label: sym === 'ALL' ? 'All tracked tokens' : sym,
          iconUrl: sym === 'ALL' || !token ? null : trustWalletTokenLogoUrl(chainId, token.address),
        }
      }),
    [tokenOptions, chainId],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(EARN_FILTERS_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as { chainId?: number; tokenSymbol?: string }
      if (
        typeof parsed.chainId === 'number' &&
        eonChains.some((c) => c.id === parsed.chainId)
      ) {
        setChainId(parsed.chainId)
      }
      if (typeof parsed.tokenSymbol === 'string' && parsed.tokenSymbol.trim()) {
        setTokenSymbol(parsed.tokenSymbol.trim().toUpperCase())
      }
    } catch {
      // ignore invalid persisted value
    }
  }, [])

  useEffect(() => {
    if (!tokenOptions.includes(tokenSymbol)) {
      setTokenSymbol(defaultTokenSymbolForChain(chainId))
    }
  }, [chainId, tokenOptions, tokenSymbol])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const tokenValid = tokenOptions.includes(tokenSymbol) ? tokenSymbol : 'ALL'
    try {
      window.localStorage.setItem(
        EARN_FILTERS_STORAGE_KEY,
        JSON.stringify({
          chainId,
          tokenSymbol: tokenValid,
        }),
      )
    } catch {
      // ignore storage errors
    }
  }, [chainId, tokenSymbol, tokenOptions])

  const fetchNow = async () => {
    setLoading(true)
    setError(null)
    try {
      const all = await fetchEarnPools()
      setPools(all)
      setFetchedAt(Date.now())
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e || 'Unknown error'))
      setPools([])
      setFetchedAt(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchNow()
  }, [])

  const filtered = useMemo(() => {
    const chainName = CHAIN_ID_TO_LLAMA[chainId]
    const needle = query.trim().toLowerCase()
    return pools
      .filter((p) => p.chain === chainName)
      .filter((p) => (tokenSymbol === 'ALL' ? true : p.symbol.toUpperCase().includes(tokenSymbol)))
      .filter((p) =>
        needle
          ? p.symbol.toLowerCase().includes(needle) ||
            p.project.toLowerCase().includes(needle)
          : true,
      )
      .filter((p) => (p.tvlUsd ?? 0) >= 50_000)
      .map((p) => {
        const apy = Number(p.apy ?? 0)
        const tvl = Number(p.tvlUsd ?? 0)
        const score = (apy > 0 ? apy : 0) * Math.log10(Math.max(10, tvl))
        return { ...p, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 60)
  }, [pools, chainId, tokenSymbol, query])

  const topPool = filtered[0] ?? null
  const avgApy =
    filtered.length > 0
      ? filtered.reduce((sum, p) => sum + (Number(p.apy) || 0), 0) / filtered.length
      : 0
  const stale = fetchedAt > 0 && Date.now() - fetchedAt > STALE_MS

  return (
    <section className="scroll-mt-24 overflow-x-hidden border-t border-white/[0.08] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] via-white/[0.015] to-transparent p-4 sm:flex-row sm:items-center sm:justify-between md:mb-7 md:p-5"
        >
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                Live pool discovery
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Yield
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Earn strategy desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Live pool intelligence for EonSwap's upcoming native Earn engine.
              We are currently collecting market signals while execution controls
              remain intentionally inactive.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchNow()}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh pools
            </button>
            <Link
              to="/swap"
              className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
            >
              Back to swap
            </Link>
          </div>
        </motion.div>

        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,392px)_minmax(0,1fr)] lg:gap-6 xl:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="order-1 flex min-w-0 justify-center lg:justify-start"
          >
            <div className="relative w-full max-w-[min(100%,392px)] overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#12142e] to-[#0a0b1c] shadow-[0_20px_64px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(0,210,255,0.06)]">
              <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold tracking-tight text-white">
                    Earn
                  </h2>
                  <p className="truncate text-[11px] leading-tight text-slate-500">
                    Monitoring only
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">
                  <Sparkles
                    className="h-3.5 w-3.5 text-amber-200/90"
                    strokeWidth={1.8}
                    aria-hidden
                  />
                  View-only
                </div>
              </div>

              <div className="flex flex-col gap-2.5 px-4 pb-3.5 pt-2.5">
                <div className="rounded-xl border border-white/[0.08] bg-[#070818]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Chain
                  </span>
                  <div className="mt-2">
                    <IconSelect
                      options={chainSelectOptions}
                      value={String(chainId)}
                      onChange={(next) => setChainId(Number(next))}
                      open={openSelect === 'chain'}
                      onOpenChange={(next) => setOpenSelect(next ? 'chain' : null)}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#070818]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Token filter
                  </span>
                  <div className="mt-2">
                    <IconSelect
                      options={tokenSelectOptions}
                      value={tokenSymbol}
                      onChange={setTokenSymbol}
                      fallbackIcon="*"
                      open={openSelect === 'token'}
                      onOpenChange={(next) => setOpenSelect(next ? 'token' : null)}
                    />
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#070818]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Search pool
                  </span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Pair or protocol"
                    className="mt-2 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-500"
                  />
                </div>

                {topPool ? (
                  <button
                    type="button"
                    disabled
                    className="mt-1 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue py-2.5 text-sm font-semibold text-[#05060f] opacity-70"
                  >
                    Open best pool (disabled)
                    <ExternalLink className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-1 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue py-2.5 text-sm font-semibold text-[#05060f] opacity-70"
                  >
                    No pool match
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="order-2 flex min-h-0 min-w-0 w-full max-w-full flex-col gap-4"
          >
            <div className="rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914]/90 p-6 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]">
              <h3 className="text-base font-semibold text-white">Earn overview</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Coins className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Pools listed</p>
                  <p className="text-sm font-semibold text-slate-100">
                    {loading ? '...' : filtered.length}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Percent className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Average APR</p>
                  <p className="text-sm font-semibold text-slate-100">{formatApy(avgApy)}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Layers3 className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Data freshness</p>
                  <p className="text-sm font-semibold text-slate-100">
                    {fetchedAt ? (stale ? 'Stale' : 'Fresh') : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914]/90 p-6 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]">
              <h3 className="text-base font-semibold text-white">Pool opportunities</h3>
              <p className="mt-1 text-xs text-slate-500">
                Sorted by APR and liquidity score. Minimum TVL filter: $50K.
              </p>
              {error ? (
                <p className="mt-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </p>
              ) : null}
              <div className="mt-3 max-h-[28rem] overflow-y-auto overflow-x-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                {loading ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading pools...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-slate-400">
                    No pools found for this filter.
                  </div>
                ) : (
                  <ul>
                    <li className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_5rem_5.5rem_4rem] gap-2 border-b border-white/[0.08] bg-[#0d1027]/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 backdrop-blur md:grid">
                      <span>Pool</span>
                      <span>Details</span>
                      <span className="text-right">APR</span>
                      <span className="text-right">TVL</span>
                      <span className="text-right">Action</span>
                    </li>
                    {filtered.map((p) => (
                      <li
                        key={p.pool}
                        className="border-b border-white/[0.06] px-3 py-2.5 last:border-b-0 hover:bg-white/[0.02] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_5rem_5.5rem_4rem] md:items-center md:gap-2"
                      >
                        <div className="min-w-0 flex items-start gap-3 md:items-center">
                          <PoolPairIcon chainId={chainId} symbol={p.symbol} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-100">
                              {p.symbol}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {p.project} · {p.chain}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1 md:mt-0 md:justify-start">
                          <span
                            title="Stable: pool pair mostly tracks stable-priced assets (for example, stablecoins)."
                            className="inline-flex rounded-md border border-white/[0.1] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-400"
                          >
                            {p.stablecoin ? 'Stable' : 'Volatile'}
                          </span>
                          <span
                            title="IL (Impermanent Loss): risk of value difference versus simply holding tokens when prices move."
                            className="inline-flex rounded-md border border-white/[0.1] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-400"
                          >
                            {ilRiskLabel(p.ilRisk)}
                          </span>
                          {p.exposure ? (
                            <span
                              title="Exposure: strategy exposure pattern. Multi means spread across multiple assets or pools."
                              className="inline-flex max-w-[10rem] truncate rounded-md border border-white/[0.1] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-400"
                            >
                              {exposureLabel(p.exposure)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 md:mt-0 md:block">
                          <span className="text-[10px] uppercase tracking-[0.08em] text-slate-500 md:hidden">APR</span>
                          <p className="text-right text-xs font-semibold text-emerald-300 md:text-right">
                            {formatApy(p.apy)}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 md:mt-0 md:block">
                          <span className="text-[10px] uppercase tracking-[0.08em] text-slate-500 md:hidden">TVL</span>
                          <p className="text-right text-[11px] text-slate-400 md:text-right">
                            {formatUsd(Number(p.tvlUsd ?? 0))}
                          </p>
                        </div>
                        <div className="mt-2 md:mt-0 md:text-right">
                          <button
                            type="button"
                            disabled
                            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1 rounded-md border border-white/[0.1] bg-white/[0.03] px-2 py-1 text-[11px] text-slate-200 opacity-55 md:w-auto"
                          >
                            Go
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-eon-blue" aria-hidden />
                <p className="text-sm leading-relaxed text-slate-400">
                  Always verify IL risk, strategy logic, and protocol risk before
                  depositing. This page is a monitoring dashboard; actions are currently disabled.
                </p>
              </div>
              <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-400">Tag guide:</span>{' '}
                IL = impermanent loss risk, Volatile = non-stable pair (higher price swings), Multi = exposure spread across multiple assets/pools.
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/swap"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue px-4 py-2.5 text-sm font-semibold text-[#05060f]"
                >
                  Go to swap
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/contact-support"
                  className="inline-flex items-center rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/[0.18] hover:text-white"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
