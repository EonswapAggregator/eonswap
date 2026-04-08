import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  History,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ActivityLiveBanner } from '../components/ActivityLiveBanner'
import { TransactionHistoryPanel } from '../components/TransactionHistoryPanel'
import { WalletOnChainTable } from '../components/WalletOnChainTable'
import { useEonSwapStore, type TxStatus } from '../store/useEonSwapStore'

const FILTERS: { key: 'all' | TxStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Confirmed' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
]

export function ActivityPage() {
  const history = useEonSwapStore((s) => s.history)
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all')

  const stats = useMemo(() => {
    const success = history.filter((h) => h.status === 'success').length
    const pending = history.filter((h) => h.status === 'pending').length
    const failed = history.filter((h) => h.status === 'failed').length
    return { total: history.length, success, pending, failed }
  }, [history])

  return (
    <section className="min-w-0 scroll-mt-24 border-t border-white/[0.08] py-16 md:py-24">
      <div className="mx-auto min-w-0 max-w-7xl px-4 md:px-6">
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
                Live transaction feed
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Activity
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Activity command center
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Monitor session swap/bridge activity and wallet history in one
              place, then drill into transaction-level details when needed.
            </p>
          </div>
          <Link
            to="/swap"
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            Back to swap
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.04 }}
          className="relative mt-6 min-w-0 overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] p-5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.75)] sm:p-6 md:p-8"
        >
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/[0.09] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-eon-blue/[0.07] blur-3xl"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-eon-blue/30 to-transparent"
            aria-hidden
          />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
                <History className="h-3.5 w-3.5 text-eon-blue" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Session log
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Activity
              </h1>
              <p className="mt-3 text-pretty text-[15px] leading-relaxed text-slate-500 md:text-base">
                On-chain history from the explorer API for your address, plus
                session activity from this tab. Wallet-wide transactions load when
                the host has configured a block-explorer API key — not listed on
                this page.
              </p>
            </div>
            <Link
              to="/swap"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue px-5 py-2.5 text-sm font-semibold text-[#05060f] shadow-[0_0_24px_-4px_rgba(34,211,238,0.35)] transition hover:brightness-[1.06] active:scale-[0.99] lg:self-auto"
            >
              New swap
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div className="relative mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Total',
                value: stats.total,
                sub: 'Recorded events',
                icon: History,
                tone: 'text-slate-200',
              },
              {
                label: 'Confirmed',
                value: stats.success,
                sub: 'On-chain success',
                icon: CheckCircle2,
                tone: 'text-emerald-300/95',
              },
              {
                label: 'Pending',
                value: stats.pending,
                sub: 'Awaiting finality',
                icon: Clock,
                tone: 'text-eon-blue',
              },
              {
                label: 'Failed',
                value: stats.failed,
                sub: 'Reverted or dropped',
                icon: XCircle,
                tone: 'text-red-300/95',
              },
            ].map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 + i * 0.05 }}
                className="rounded-2xl border border-white/[0.08] bg-black/25 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {card.label}
                  </span>
                  <card.icon className={`h-4 w-4 shrink-0 opacity-90 ${card.tone}`} />
                </div>
                <p
                  className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${card.tone}`}
                >
                  {card.value}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">{card.sub}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mt-8"
        >
          <ActivityLiveBanner />

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-white">Wallet (on-chain)</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Same table layout as session swaps: normal txs from the explorer
              API (not ERC-20 transfer list).
            </p>
            <div className="mt-4">
              <WalletOnChainTable />
            </div>
          </div>

          <div className="mb-4 mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white">Session swaps</h2>
              <p className="mt-0.5 text-pretty text-sm text-slate-500">
                Swaps and bridges via EonSwap in this browser · newest first ·{' '}
                {stats.total} total · scroll table sideways on small screens
              </p>
            </div>
            <div
              className="flex min-w-0 flex-wrap gap-1.5 rounded-2xl border border-white/[0.08] bg-[#070818]/60 p-1 sm:shrink-0"
              role="tablist"
              aria-label="Filter by status"
            >
              {FILTERS.map(({ key, label }) => {
                const active = statusFilter === key
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setStatusFilter(key)}
                    className={`min-h-[44px] rounded-xl px-3.5 py-2.5 text-xs font-semibold transition sm:min-h-0 sm:py-2 ${
                      active
                        ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                        : 'text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <TransactionHistoryPanel
            variant="page"
            statusFilter={statusFilter}
          />
        </motion.div>
      </div>
    </section>
  )
}
