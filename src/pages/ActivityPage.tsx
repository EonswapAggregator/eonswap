import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  RefreshCw,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivityLiveBanner } from '../components/ActivityLiveBanner'
import { TransactionHistoryPanel } from '../components/TransactionHistoryPanel'
import { useEonSwapStore, type TxStatus } from '../store/useEonSwapStore'

const FILTERS: { key: 'all' | TxStatus; label: string; icon: React.ElementType }[] = [
  { key: 'all', label: 'All', icon: History },
  { key: 'success', label: 'Confirmed', icon: CheckCircle2 },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'failed', label: 'Failed', icon: XCircle },
]

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

export function ActivityPage() {
  const prefersReducedMotion = useReducedMotion()
  const history = useEonSwapStore((s) => s.history)
  const clearHistory = useEonSwapStore((s) => s.clearHistory)
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all')

  const stats = useMemo(() => {
    const success = history.filter((h) => h.status === 'success').length
    const pending = history.filter((h) => h.status === 'pending').length
    const failed = history.filter((h) => h.status === 'failed').length
    return { total: history.length, success, pending, failed }
  }, [history])

  const statCards = [
    {
      label: 'Total Swaps',
      value: stats.total,
      sub: 'This session',
      icon: TrendingUp,
      color: 'text-uni-pink',
      bgGlow: 'bg-uni-pink/20',
      ringColor: 'ring-uni-pink/30',
    },
    {
      label: 'Confirmed',
      value: stats.success,
      sub: 'Completed',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bgGlow: 'bg-emerald-500/20',
      ringColor: 'ring-emerald-500/30',
    },
    {
      label: 'Pending',
      value: stats.pending,
      sub: 'Awaiting',
      icon: Clock,
      color: 'text-amber-400',
      bgGlow: 'bg-amber-500/20',
      ringColor: 'ring-amber-500/30',
    },
    {
      label: 'Failed',
      value: stats.failed,
      sub: 'Reverted',
      icon: XCircle,
      color: 'text-rose-400',
      bgGlow: 'bg-rose-500/20',
      ringColor: 'ring-rose-500/30',
    },
  ] as const

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      {/* Gradient backdrop - matching liquidity page */}
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
      <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14">
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
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-pink/30 bg-uni-pink/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-uni-pink">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              Activity Feed
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium text-neutral-400">
              <RefreshCw className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
              Real-time updates
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-white"
          >
            <span className="block">Transaction</span>
            <span className="mt-1 block bg-gradient-to-r from-uni-pink to-uni-pink-light bg-clip-text text-transparent">History</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Track all your EonSwap transactions from this session. 
            View status, details, and explore on-chain.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/swap"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-uni-pink to-uni-pink-light px-8 py-3.5 text-sm font-semibold text-white shadow-glow transition duration-300 hover:shadow-[0_0_40px_rgba(255,0,122,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uni-pink/70 focus-visible:ring-offset-2 focus-visible:ring-offset-uni-bg"
            >
              <span className="relative flex items-center gap-2">
                New Swap
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            {stats.total > 0 && (
              <button
                type="button"
                onClick={() => clearHistory()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-uni-border bg-transparent px-6 py-3 text-sm font-medium text-white transition hover:bg-uni-surface"
              >
                Clear History
              </button>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative mx-auto max-w-6xl px-4 pb-10 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.08, duration: 0.4 }}
                className="group relative overflow-hidden rounded-2xl border border-uni-border bg-uni-surface p-5 transition duration-300 hover:border-uni-pink/30 hover:bg-uni-surface-2"
              >
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${stat.bgGlow} blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100`} aria-hidden />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{stat.label}</p>
                    <p className={`mt-2 text-3xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                    <p className="mt-1 text-xs text-neutral-600">{stat.sub}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgGlow} ring-1 ${stat.ringColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} strokeWidth={1.75} aria-hidden />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Success Rate Bar */}
          {stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="mt-6 overflow-hidden rounded-2xl border border-uni-border bg-uni-surface p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Success Rate</p>
                    <p className="text-xs text-neutral-500">{stats.success} of {stats.total} swaps completed</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-400">{successRate}%</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-uni-bg">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${successRate}%` }}
                  transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Live Banner */}
      <section className="relative mx-auto max-w-6xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <ActivityLiveBanner />
        </motion.div>
      </section>

      {/* Session Swaps Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/10 ring-1 ring-uni-pink/20">
                  <History className="h-5 w-5 text-uni-pink" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Session Swaps</h2>
                  <p className="text-sm text-neutral-500">{stats.total} transactions · newest first</p>
                </div>
              </div>
            </div>
            <div
              className="flex min-w-0 flex-wrap gap-1 rounded-2xl border border-uni-border bg-uni-surface p-1 sm:shrink-0"
              role="tablist"
              aria-label="Filter by status"
            >
              {FILTERS.map(({ key, label, icon: Icon }) => {
                const active = statusFilter === key
                const count = key === 'all' ? stats.total : key === 'success' ? stats.success : key === 'pending' ? stats.pending : stats.failed
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(key)}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition sm:min-h-0 ${
                      active
                        ? 'bg-uni-pink text-white shadow-glow'
                        : 'text-neutral-500 hover:bg-white/[0.05] hover:text-neutral-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-uni-surface-2'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quick Links */}
          {stats.total === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8 overflow-hidden rounded-3xl border border-dashed border-uni-border bg-uni-surface/50 p-10 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-uni-surface-2">
                <History className="h-8 w-8 text-neutral-600" />
              </div>
              <h3 className="text-lg font-semibold text-white">No transactions yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                Your swap history will appear here once you make your first trade. 
                Get started by swapping some tokens!
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/swap"
                  className="inline-flex items-center gap-2 rounded-xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-uni-pink-light"
                >
                  <Zap className="h-4 w-4" />
                  Start Swapping
                </Link>
                <Link
                  to="/liquidity"
                  className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface px-6 py-3 text-sm font-medium text-neutral-300 transition hover:bg-uni-surface-2"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  Add Liquidity
                </Link>
              </div>
            </motion.div>
          )}

          <TransactionHistoryPanel
            variant="page"
            statusFilter={statusFilter}
          />

          {/* Explorer Link */}
          {stats.total > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center"
            >
              <a
                href="https://basescan.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-neutral-500 transition hover:text-uni-pink"
              >
                View all on BaseScan
                <ExternalLink className="h-4 w-4" />
              </a>
            </motion.div>
          )}
        </motion.div>
      </section>
    </div>
  )
}
