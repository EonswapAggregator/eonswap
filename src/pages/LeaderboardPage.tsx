import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, Copy, Loader2, RefreshCw, Sparkles, Trophy, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePublicClient } from 'wagmi'
import {
  fetchRelayLeaderboard,
  type LeaderboardEntry,
} from '../lib/activityRelay'
import {
  fetchBlockchainSwapLeaderboard,
  fetchEonAmmPairAddresses,
} from '../lib/blockchainActivity'
import { EON_BASE_MAINNET } from '../lib/eonBaseMainnet'
import {
  LEADERBOARD_SKELETON_ROWS,
  formatLeaderboardAddressShort,
  formatLeaderboardRelativeTime,
  leaderboardCardShellClass,
  leaderboardTableClass,
  leaderboardTableScrollClass,
  leaderboardTableToolbarClass,
  leaderboardTdClass,
  leaderboardThClass,
  leaderboardTheadRowClass,
  leaderboardToolbarMetaClass,
  leaderboardToolbarTitleClass,
  leaderboardTrClass,
} from '../lib/leaderboard'
import { fetchSimplePricesUsd } from '../lib/coingecko'
import { getMonitorRelayBaseUrl } from '../lib/monitorRelayUrl'
import { useEonAmmSwapRealtime } from '../hooks/useEonRealtimeEvents'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.06 * i,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en', {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value)
}

function formatBigIntMetric(value?: string): string {
  if (!value) return '0'
  let raw = 0n
  try {
    raw = BigInt(value)
  } catch {
    return '0'
  }
  if (raw === 0n) return '0'
  if (raw < 1000000000000n) return raw.toString()

  const base = 1000000000000000000n
  const whole = raw / base
  const fraction = raw % base
  const fractionText = ((fraction * 10000n) / base)
    .toString()
    .padStart(4, '0')
    .replace(/0+$/u, '')
  return fractionText ? `${whole}.${fractionText}` : whole.toString()
}

function parseWethVolume(value?: string): number {
  if (!value) return 0
  try {
    const raw = BigInt(value)
    if (raw === 0n) return 0
    return Number(raw) / 1e18
  } catch {
    return 0
  }
}

function formatUsdVolume(value: string | undefined, ethUsd: number | null): string {
  const weth = parseWethVolume(value)
  if (weth <= 0) return '$0'
  if (ethUsd == null || ethUsd <= 0) return '...'
  const usd = weth * ethUsd
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    notation: usd >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  }).format(usd)
}

function getActivityTotal(row: LeaderboardEntry): number {
  return row.activityCount ?? row.successCount
}

function getTierClass(tier?: string): string {
  switch ((tier || '').toLowerCase()) {
    case 'diamond':
      return 'border-cyan-300/45 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]'
    case 'platinum':
      return 'border-fuchsia-300/40 bg-fuchsia-400/15 text-fuchsia-100 shadow-[0_0_18px_rgba(217,70,239,0.12)]'
    case 'gold':
      return 'border-amber-300/45 bg-amber-400/15 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.12)]'
    case 'silver':
      return 'border-slate-200/40 bg-slate-300/15 text-slate-100 shadow-[0_0_18px_rgba(203,213,225,0.08)]'
    default:
      return 'border-orange-300/40 bg-orange-400/15 text-orange-100 shadow-[0_0_18px_rgba(251,146,60,0.12)]'
  }
}

function formatActivityBreakdown(row: LeaderboardEntry): string {
  const parts = [
    `Swap ${row.successCount}`,
    `LP ${row.liquidityEventCount ?? 0}`,
    `Farm ${row.farmEventCount ?? 0}`,
  ]
  if ((row.referralCount ?? 0) > 0) parts.push(`Referral ${row.referralCount}`)
  return parts.join(' / ')
}

function LeaderboardColGroup() {
  return (
    <colgroup>
      <col className="w-16" />
      <col className="w-44" />
      <col className="w-28" />
      <col className="w-28" />
      <col className="w-28" />
      <col className="w-32" />
      <col />
      <col className="w-32" />
    </colgroup>
  )
}

const LEADERBOARD_PAGE_SIZE = 10

function LeaderboardLoadingCards() {
  return (
    <div className="divide-y divide-uni-border/60 md:hidden">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="h-4 w-20 animate-pulse rounded bg-uni-surface-2" />
              <div className="mt-3 h-4 w-40 max-w-full animate-pulse rounded bg-uni-surface-2" />
            </div>
            <div className="h-7 w-20 animate-pulse rounded-full bg-uni-surface-2" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="h-14 animate-pulse rounded-xl bg-uni-surface-2" />
            <div className="h-14 animate-pulse rounded-xl bg-uni-surface-2" />
            <div className="h-14 animate-pulse rounded-xl bg-uni-surface-2" />
          </div>
          <div className="mt-3 h-4 w-48 max-w-full animate-pulse rounded bg-uni-surface-2" />
        </div>
      ))}
    </div>
  )
}

function LeaderboardPaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(totalItems, currentPage * pageSize)

  return (
    <div className="hidden items-center justify-between border-t border-uni-border bg-uni-bg/50 px-5 py-3 md:flex">
      <p className="text-xs text-neutral-500">
        Showing <span className="font-medium text-neutral-300">{start}</span>-
        <span className="font-medium text-neutral-300">{end}</span> of{' '}
        <span className="font-medium text-neutral-300">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-uni-border bg-uni-surface text-neutral-300 transition hover:border-uni-pink/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous leaderboard page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-20 text-center text-xs font-medium text-neutral-400">
          Page {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-uni-border bg-uni-surface text-neutral-300 transition hover:border-uni-pink/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next leaderboard page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function LeaderboardPage() {
  const prefersReducedMotion = useReducedMotion()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [leaderboardPage, setLeaderboardPage] = useState(1)
  const [ethUsd, setEthUsd] = useState<number | null>(null)
  const [sourceLabel, setSourceLabel] = useState('Indexed on-chain activity')
  const [watchedPairAddresses, setWatchedPairAddresses] = useState<
    `0x${string}`[]
  >([])
  const publicClient = usePublicClient({ chainId: EON_BASE_MAINNET.chainId })
  const relayConfigured = Boolean(getMonitorRelayBaseUrl())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    let relayError: string | null = null
    if (relayConfigured) {
      const relay = await fetchRelayLeaderboard(50)
      if (relay.ok && relay.entries.length > 0) {
        setEntries(relay.entries)
        setLeaderboardPage(1)
        setSourceLabel('Indexed on-chain activity')
        setLoading(false)
        return
      }
      if (!relay.ok) {
        relayError = relay.error
      } else if (!publicClient) {
        setEntries(relay.entries)
        setLeaderboardPage(1)
        setSourceLabel('Indexed on-chain activity')
        setLoading(false)
        return
      }
    }

    if (publicClient) {
      const pairAddresses = await fetchEonAmmPairAddresses(publicClient)
      setWatchedPairAddresses(pairAddresses)
      const onChain = await fetchBlockchainSwapLeaderboard(publicClient, 50)
      if (onChain.ok && onChain.entries.length > 0) {
        setEntries(onChain.entries)
        setLeaderboardPage(1)
        setSourceLabel('Direct on-chain fallback')
        setLoading(false)
        return
      }
      setEntries([])
      setLeaderboardPage(1)
      setError(onChain.ok ? relayError : relayError || onChain.error)
      setSourceLabel(
        relayConfigured ? 'Indexed activity fallback' : 'Direct on-chain fallback',
      )
      setLoading(false)
      return
    }

    setEntries([])
    setLeaderboardPage(1)
    setError(relayError)
    setLoading(false)
  }, [publicClient, relayConfigured])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let alive = true
    fetchSimplePricesUsd(['ethereum'])
      .then((prices) => {
        const price = Number(prices.ethereum ?? 0)
        if (alive && Number.isFinite(price) && price > 0) {
          setEthUsd(price)
        }
      })
      .catch(() => {
        if (alive) setEthUsd(null)
      })
    return () => {
      alive = false
    }
  }, [])

  useEonAmmSwapRealtime({
    chainId: EON_BASE_MAINNET.chainId,
    pairAddresses: watchedPairAddresses,
    onRefresh: () => {
      void load()
    },
  })

  const copy = (addr: string) => {
    void navigator.clipboard.writeText(addr)
  }

  const totalPoints = entries.reduce((sum, row) => {
    try {
      return sum + BigInt(row.totalPoints || '0')
    } catch {
      return sum
    }
  }, 0n)

  const stats = [
    {
      label: 'Total Traders',
      value: entries.length,
      sub: 'Active addresses',
      icon: Users,
      color: 'text-uni-pink',
    },
    {
      label: 'Top Trader',
      value: entries[0] ? getActivityTotal(entries[0]) : 0,
      sub: 'Most activity',
      icon: Trophy,
      color: 'text-amber-400',
    },
    {
      label: 'Total Points',
      value: formatBigIntMetric(totalPoints.toString()),
      sub: 'Top wallets shown',
      icon: Sparkles,
      color: 'text-emerald-400',
    },
  ] as const

  const desktopTotalPages = Math.max(
    1,
    Math.ceil(entries.length / LEADERBOARD_PAGE_SIZE),
  )
  const safeLeaderboardPage = Math.min(leaderboardPage, desktopTotalPages)
  const desktopEntries = useMemo(
    () =>
      entries.slice(
        (safeLeaderboardPage - 1) * LEADERBOARD_PAGE_SIZE,
        safeLeaderboardPage * LEADERBOARD_PAGE_SIZE,
      ),
    [entries, safeLeaderboardPage],
  )

  useEffect(() => {
    if (leaderboardPage > desktopTotalPages) {
      setLeaderboardPage(desktopTotalPages)
    }
  }, [desktopTotalPages, leaderboardPage])

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      {/* Gradient backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,0,122,0.12),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-uni-bg" />
        <div
          className="absolute -left-32 top-[-10%] h-[min(420px,45vw)] w-[min(420px,45vw)] rounded-full bg-uni-pink/10 blur-[100px]"
          style={{
            animation: prefersReducedMotion ? 'none' : 'eon-gradient-drift 22s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -right-24 top-[30%] h-[min(360px,40vw)] w-[min(360px,40vw)] rounded-full bg-uni-purple/[0.08] blur-[90px]"
          style={{
            animation: prefersReducedMotion ? 'none' : 'eon-gradient-drift 28s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-6xl px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.08 } },
          }}
          className="text-center"
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              <Trophy className="h-3.5 w-3.5 text-uni-pink" />
              Rankings
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <RefreshCw className="h-3.5 w-3.5 text-uni-pink/80" aria-hidden />
              Live updates
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-white"
          >
            <span className="block">Top traders,</span>
            <span className="mt-1 block text-uni-pink">ranked by activity.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Follow the most active wallets across EonSwap. Rankings update from
            indexed on-chain activity as users trade and participate.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/swap"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-uni-pink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uni-pink/70 focus-visible:ring-offset-2 focus-visible:ring-offset-uni-bg"
            >
              <span className="relative flex items-center gap-2">
                Start Trading
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/activity"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-uni-border bg-transparent px-6 py-3 text-sm font-medium text-white transition hover:bg-uni-surface"
            >
              View Activity
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      {!error && entries.length > 0 && (
        <section className="relative mx-auto max-w-6xl px-4 pb-10 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="relative"
          >
            <div
              className="absolute -inset-px rounded-[1.25rem] bg-gradient-to-b from-white/[0.06] via-uni-pink/10 to-transparent opacity-45 blur-sm"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface shadow-uni-card">
              <div className="grid divide-y divide-uni-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="group px-6 py-6 text-center transition duration-200 hover:bg-uni-surface-2"
                  >
                    <div className="mb-3 flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                        <stat.icon className={`h-5 w-5 ${stat.color}`} aria-hidden />
                      </div>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {loading ? '...' : stat.value}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-600">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Leaderboard Table Section */}
      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-4 md:px-6 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Live Rankings</h2>
            <p className="mt-1 text-pretty text-sm text-neutral-500">
              Higher rank means more confirmed EonSwap activity found on-chain.
            </p>
          </div>

          <div className={leaderboardCardShellClass}>
            <div className={leaderboardTableToolbarClass}>
              <div className="min-w-0 flex-1">
                <p className={leaderboardToolbarTitleClass}>Trader Rankings</p>
                <p className={`mt-0.5 ${leaderboardToolbarMetaClass}`}>
                  {loading ? 'Loading...' : sourceLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-uni-border bg-uni-surface px-3 py-2 text-xs font-semibold text-neutral-300 transition hover:bg-uni-surface-2 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                  aria-hidden
                />
                Refresh
              </button>
            </div>

            {error ? (
              <div className="border-b border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200/95 md:px-5">
                <p className="font-medium">Unable to load rankings</p>
                <p className="mt-1 opacity-90">{error}</p>
                <p className="mt-2 text-xs text-red-200/70">
                  If you operate this deployment, confirm the monitoring
                  service URL is set for the frontend. Users can try again
                  later or contact support.
                </p>
              </div>
            ) : null}

            <div className={`${leaderboardTableScrollClass} min-w-0`}>
              {error && !loading ? (
                <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center text-sm text-neutral-500">
                  <p>Select Refresh to retry.</p>
                </div>
              ) : loading && entries.length === 0 ? (
                <>
                  <LeaderboardLoadingCards />
                  <div className="hidden md:block">
                  <table className={`${leaderboardTableClass} table-fixed`}>
                    <LeaderboardColGroup />
                    <caption className="sr-only">Loading rankings</caption>
                    <thead>
                      <tr className={leaderboardTheadRowClass}>
                        <th
                          scope="col"
                          className={`${leaderboardThClass} pl-4 text-center md:pl-5`}
                        >
                          Rank
                        </th>
                        <th scope="col" className={leaderboardThClass}>
                          Wallet
                        </th>
                        <th
                          scope="col"
                          className={`${leaderboardThClass} text-center`}
                        >
                          Tier
                        </th>
                        <th
                          scope="col"
                          className={`${leaderboardThClass} text-center`}
                        >
                          Points
                        </th>
                        <th
                          scope="col"
                          className={`${leaderboardThClass} text-center`}
                        >
                          Activity
                        </th>
                        <th
                          scope="col"
                          className={leaderboardThClass}
                        >
                          Volume
                        </th>
                        <th scope="col" className={leaderboardThClass}>
                          Breakdown
                        </th>
                        <th
                          scope="col"
                          className={`${leaderboardThClass} pr-4 text-right md:pr-5`}
                        >
                          Last seen
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: LEADERBOARD_SKELETON_ROWS }, (_, i) => (
                        <tr key={i} className={leaderboardTrClass}>
                          <td
                            className={`${leaderboardTdClass} pl-4 text-center md:pl-5`}
                          >
                            <div className="mx-auto h-4 w-6 animate-pulse rounded bg-uni-surface" />
                          </td>
                          <td className={leaderboardTdClass}>
                            <div className="h-4 w-36 max-w-full animate-pulse rounded bg-uni-surface" />
                          </td>
                          <td className={`${leaderboardTdClass} text-center`}>
                            <div className="mx-auto h-5 w-16 animate-pulse rounded-full bg-uni-surface" />
                          </td>
                          <td className={`${leaderboardTdClass} text-center`}>
                            <div className="mx-auto h-4 w-14 animate-pulse rounded bg-uni-surface" />
                          </td>
                          <td className={`${leaderboardTdClass} text-center`}>
                            <div className="mx-auto h-4 w-10 animate-pulse rounded bg-uni-surface" />
                          </td>
                          <td className={leaderboardTdClass}>
                            <div className="h-4 w-14 animate-pulse rounded bg-uni-surface" />
                          </td>
                          <td className={leaderboardTdClass}>
                            <div className="h-4 w-32 animate-pulse rounded bg-uni-surface" />
                          </td>
                          <td
                            className={`${leaderboardTdClass} pr-4 text-right md:pr-5`}
                          >
                            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-uni-surface" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-center gap-2 border-t border-uni-border py-4 text-neutral-500">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                    <span className="text-sm">Loading...</span>
                  </div>
                  </div>
                </>
              ) : !error ? (
                <>
                  <div className="divide-y divide-uni-border/60 md:hidden">
                    {entries.length === 0 ? (
                      <div className="px-5 py-12 text-center text-sm text-neutral-500">
                        No results yet. Wallets will appear here after confirmed
                        EonSwap activity is indexed.
                      </div>
                    ) : null}
                    {entries.map((row, index) => (
                      <article key={row.address} className="min-w-0 px-4 py-4">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={`font-mono text-sm font-semibold ${
                                  index < 3
                                    ? 'text-uni-pink'
                                    : 'text-neutral-400'
                                }`}
                              >
                                #{row.rank}
                              </span>
                              <span className="h-1 w-1 shrink-0 rounded-full bg-neutral-700" />
                              <span className="min-w-0 truncate font-mono text-xs text-neutral-200">
                                {formatLeaderboardAddressShort(row.address)}
                              </span>
                              <button
                                type="button"
                                onClick={() => copy(row.address)}
                                className="shrink-0 rounded-md p-1 text-neutral-500 transition hover:bg-white/10 hover:text-neutral-200"
                                title="Copy address"
                                aria-label={`Copy ${row.address}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-neutral-500">
                              Last seen{' '}
                              {formatLeaderboardRelativeTime(row.lastSuccessAt)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 justify-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getTierClass(row.tier)}`}
                          >
                            {row.tier || 'Bronze'}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                          <div className="min-w-0 rounded-xl border border-uni-border/70 bg-uni-surface-2 px-2.5 py-2">
                            <p className="font-semibold uppercase tracking-wide text-neutral-600">
                              Points
                            </p>
                            <p className="mt-1 truncate font-semibold tabular-nums text-emerald-300">
                              {formatBigIntMetric(row.totalPoints)}
                            </p>
                          </div>
                          <div className="min-w-0 rounded-xl border border-uni-border/70 bg-uni-surface-2 px-2.5 py-2">
                            <p className="font-semibold uppercase tracking-wide text-neutral-600">
                              Activity
                            </p>
                            <p className="mt-1 truncate font-semibold tabular-nums text-uni-pink">
                              {formatCompactNumber(getActivityTotal(row))}
                            </p>
                          </div>
                          <div className="min-w-0 rounded-xl border border-uni-border/70 bg-uni-surface-2 px-2.5 py-2">
                            <p className="font-semibold uppercase tracking-wide text-neutral-600">
                              Volume
                            </p>
                            <p className="mt-1 truncate tabular-nums text-neutral-300">
                              {formatUsdVolume(row.totalWethVolume, ethUsd)}
                            </p>
                          </div>
                        </div>

                        <p className="mt-3 truncate text-xs text-neutral-400">
                          {formatActivityBreakdown(row)}
                        </p>
                      </article>
                    ))}
                  </div>

                  <table className={`${leaderboardTableClass} hidden table-fixed md:table`}>
                  <LeaderboardColGroup />
                  <caption className="sr-only">
                    Top addresses by confirmed EonSwap activity
                  </caption>
                  <thead>
                    <tr className={leaderboardTheadRowClass}>
                      <th
                        scope="col"
                        className={`${leaderboardThClass} pl-4 text-center md:pl-5`}
                      >
                        Rank
                      </th>
                      <th scope="col" className={leaderboardThClass}>
                        Wallet
                      </th>
                      <th
                        scope="col"
                        className={`${leaderboardThClass} text-center`}
                      >
                        Tier
                      </th>
                      <th
                        scope="col"
                        className={`${leaderboardThClass} text-center`}
                      >
                        Points
                      </th>
                      <th
                        scope="col"
                        className={`${leaderboardThClass} text-center`}
                      >
                        Activity
                      </th>
                      <th
                        scope="col"
                        className={leaderboardThClass}
                      >
                        Volume
                      </th>
                      <th scope="col" className={leaderboardThClass}>
                        Breakdown
                      </th>
                      <th
                        scope="col"
                        className={`${leaderboardThClass} pr-4 text-right md:pr-5`}
                      >
                        Last seen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!error && entries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-12 text-center text-sm text-neutral-500 md:px-6"
                        >
                          No results yet. Wallets will appear here after
                          confirmed EonSwap activity is indexed.
                        </td>
                      </tr>
                    ) : null}
                      {desktopEntries.map((row) => (
                        <tr key={row.address} className={leaderboardTrClass}>
                          <td
                            className={`${leaderboardTdClass} pl-4 text-center font-mono md:pl-5`}
                          >
                          <span className={row.rank <= 3 ? 'text-uni-pink font-semibold' : 'text-neutral-400'}>
                            {row.rank}
                          </span>
                        </td>
                        <td className={leaderboardTdClass}>
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="min-w-0 truncate font-mono text-[11px] text-neutral-200 sm:text-[12px]">
                              {formatLeaderboardAddressShort(row.address)}
                            </span>
                            <button
                              type="button"
                              onClick={() => copy(row.address)}
                              className="rounded-md p-1 text-neutral-500 transition hover:bg-white/10 hover:text-neutral-200"
                              title="Copy address"
                              aria-label={`Copy ${row.address}`}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className={`${leaderboardTdClass} text-center`}>
                          <span
                            className={`inline-flex min-w-16 justify-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getTierClass(row.tier)}`}
                          >
                            {row.tier || 'Bronze'}
                          </span>
                        </td>
                        <td
                          className={`${leaderboardTdClass} text-center font-semibold tabular-nums text-emerald-300`}
                        >
                          {formatBigIntMetric(row.totalPoints)}
                        </td>
                        <td
                          className={`${leaderboardTdClass} text-center font-semibold tabular-nums text-uni-pink`}
                        >
                          {formatCompactNumber(getActivityTotal(row))}
                        </td>
                        <td
                          className={`${leaderboardTdClass} tabular-nums text-neutral-300`}
                        >
                          {formatUsdVolume(row.totalWethVolume, ethUsd)}
                        </td>
                        <td className={`${leaderboardTdClass} text-neutral-400`}>
                          <span className="block truncate">
                            {formatActivityBreakdown(row)}
                          </span>
                        </td>
                        <td
                          className={`${leaderboardTdClass} pr-4 text-right text-neutral-400 tabular-nums md:pr-5`}
                        >
                          {formatLeaderboardRelativeTime(row.lastSuccessAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </>
              ) : null}
            </div>
            {!error && !loading && entries.length > 0 && (
              <LeaderboardPaginationControls
                currentPage={safeLeaderboardPage}
                totalPages={desktopTotalPages}
                totalItems={entries.length}
                pageSize={LEADERBOARD_PAGE_SIZE}
                onPageChange={setLeaderboardPage}
              />
            )}
          </div>
        </motion.div>
      </section>
    </div>
  )
}
