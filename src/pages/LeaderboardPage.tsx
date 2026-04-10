import { motion } from 'framer-motion'
import { Copy, RefreshCw, Trophy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchRelayLeaderboard,
  type LeaderboardEntry,
} from '../lib/activityRelay'

function shortAddress(addr: string) {
  const a = addr.trim()
  if (a.length < 12) return a
  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

function formatRelativeTime(ts: number) {
  if (!ts) return '—'
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchRelayLeaderboard(50)
    if (!res.ok) {
      setEntries([])
      setGeneratedAt(null)
      setError(res.error)
    } else {
      setEntries(res.entries)
      setGeneratedAt(res.generatedAt)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const copy = (addr: string) => {
    void navigator.clipboard.writeText(addr)
  }

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
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1">
              <Trophy className="h-3.5 w-3.5 text-amber-200" aria-hidden />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-100/90">
                Community activity
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Leaderboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Top wallets by completed trades
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Ranks addresses by successful swap and bridge executions recorded
              through this app when the monitoring relay is enabled. Pending or
              failed attempts are not counted.
            </p>
            {generatedAt != null && !error && (
              <p className="mt-2 text-xs text-slate-500">
                Updated {formatRelativeTime(generatedAt)} ·{' '}
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="inline-flex items-center gap-1 font-medium text-cyan-300/90 underline-offset-2 hover:underline disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`}
                    aria-hidden
                  />
                  Refresh
                </button>
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              to="/activity"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
            >
              Your activity
            </Link>
            <Link
              to="/swap"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 text-sm font-medium text-cyan-100 transition hover:border-cyan-400/45 hover:bg-cyan-500/15"
            >
              Swap
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.04 }}
          className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] p-5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.75)] sm:p-6 md:p-8"
        >
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-500/[0.06] blur-3xl"
            aria-hidden
          />
          {error ? (
            <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
              <p className="text-sm font-medium text-slate-200">
                Leaderboard unavailable
              </p>
              <p className="mt-2 text-sm text-slate-400">{error}</p>
              <p className="mt-4 text-xs text-slate-500">
                Production uses <code className="text-slate-400">VITE_MONITOR_RELAY_URL</code>{' '}
                pointing at a relay that stores activity. Local dev can use the
                Vite proxy to a running relay.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/[0.14] bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Try again
              </button>
            </div>
          ) : loading && entries.length === 0 ? (
            <p className="relative text-center text-sm text-slate-400">
              Loading leaderboard…
            </p>
          ) : entries.length === 0 ? (
            <p className="relative text-center text-sm text-slate-400">
              No successful trades in relay data yet. Complete a swap or bridge
              with the relay configured to appear here.
            </p>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[320px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    <th className="pb-3 pr-4">Rank</th>
                    <th className="pb-3 pr-4">Address</th>
                    <th className="pb-3 pr-4 text-right">Completed</th>
                    <th className="pb-3 text-right">Last success</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((row) => (
                    <tr
                      key={row.address}
                      className="border-b border-white/[0.05] text-slate-200 last:border-0"
                    >
                      <td className="py-3 pr-4 font-mono text-slate-400">
                        {row.rank}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[13px] text-white">
                            {shortAddress(row.address)}
                          </span>
                          <button
                            type="button"
                            onClick={() => copy(row.address)}
                            className="inline-flex rounded-lg border border-white/[0.1] p-1.5 text-slate-400 transition hover:border-white/[0.18] hover:text-white"
                            title="Copy address"
                            aria-label={`Copy ${row.address}`}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums text-cyan-100/90">
                        {row.successCount}
                      </td>
                      <td className="py-3 text-right text-slate-400 tabular-nums">
                        {formatRelativeTime(row.lastSuccessAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
