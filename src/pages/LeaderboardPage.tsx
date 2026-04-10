import { motion } from 'framer-motion'
import { Copy, Loader2, RefreshCw, Trophy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchRelayLeaderboard,
  type LeaderboardEntry,
} from '../lib/activityRelay'
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
import { getMonitorRelayBaseUrl } from '../lib/monitorRelayUrl'

export function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const relayConfigured = Boolean(getMonitorRelayBaseUrl())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetchRelayLeaderboard(50)
    if (!res.ok) {
      setEntries([])
      setError(res.error)
    } else {
      setEntries(res.entries)
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
                Rankings
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Leaderboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Ranks reflect swaps and bridges that fully complete. Anything still
              open or that failed never hits this list.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              to="/activity"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
            >
              Activity
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
          className="mt-8"
        >
          <h2 className="text-lg font-semibold text-white">Live rankings</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Higher rank means more swaps and bridges that actually finished.
          </p>

          <div className="mt-4">
            <div className={leaderboardCardShellClass}>
              <div className={leaderboardTableToolbarClass}>
                <div className="min-w-0 flex-1">
                  <p className={leaderboardToolbarTitleClass}>Results</p>
                  <p className={`mt-0.5 ${leaderboardToolbarMetaClass}`}>
                    {relayConfigured
                      ? loading
                        ? 'Loading…'
                        : 'Settled trades only'
                      : 'Service not configured'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
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
                  <div className="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center text-sm text-slate-500">
                    <p>Select Refresh to retry.</p>
                  </div>
                ) : loading && entries.length === 0 ? (
                  <div className="min-w-[min(100%,520px)]">
                    <table className={leaderboardTableClass}>
                      <caption className="sr-only">Loading rankings</caption>
                      <thead>
                        <tr className={leaderboardTheadRowClass}>
                          <th
                            scope="col"
                            className={`${leaderboardThClass} pl-4 md:pl-5`}
                          >
                            Rank
                          </th>
                          <th scope="col" className={leaderboardThClass}>
                            Address
                          </th>
                          <th
                            scope="col"
                            className={`${leaderboardThClass} text-right`}
                          >
                            Completed
                          </th>
                          <th
                            scope="col"
                            className={`${leaderboardThClass} pr-4 text-right md:pr-5`}
                          >
                            Last success
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: LEADERBOARD_SKELETON_ROWS }, (_, i) => (
                          <tr key={i} className={leaderboardTrClass}>
                            <td
                              className={`${leaderboardTdClass} pl-4 md:pl-5`}
                            >
                              <div className="h-4 w-6 animate-pulse rounded bg-white/[0.08]" />
                            </td>
                            <td className={leaderboardTdClass}>
                              <div className="h-4 w-36 max-w-full animate-pulse rounded bg-white/[0.08]" />
                            </td>
                            <td className={`${leaderboardTdClass} text-right`}>
                              <div className="ml-auto h-4 w-10 animate-pulse rounded bg-white/[0.08]" />
                            </td>
                            <td
                              className={`${leaderboardTdClass} pr-4 text-right md:pr-5`}
                            >
                              <div className="ml-auto h-4 w-16 animate-pulse rounded bg-white/[0.08]" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-center gap-2 border-t border-white/[0.06] py-4 text-slate-500">
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                      <span className="text-sm">Loading…</span>
                    </div>
                  </div>
                ) : !error ? (
                  <table className={`${leaderboardTableClass} min-w-[520px]`}>
                    <caption className="sr-only">
                      Top addresses by confirmed swap and bridge count
                    </caption>
                    <thead>
                      <tr className={leaderboardTheadRowClass}>
                        <th
                          scope="col"
                          className={`${leaderboardThClass} pl-4 md:pl-5`}
                        >
                          Rank
                        </th>
                        <th scope="col" className={leaderboardThClass}>
                          Address
                        </th>
                        <th
                          scope="col"
                          className={`${leaderboardThClass} text-right`}
                        >
                          Completed
                        </th>
                        <th
                          scope="col"
                          className={`${leaderboardThClass} pr-4 text-right md:pr-5`}
                        >
                          Last success
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {!error && entries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-12 text-center text-sm text-slate-500 md:px-6"
                          >
                            No results yet. Confirmed swaps and bridges will
                            appear here when the service is available.
                          </td>
                        </tr>
                      ) : null}
                      {entries.map((row) => (
                        <tr key={row.address} className={leaderboardTrClass}>
                          <td
                            className={`${leaderboardTdClass} pl-4 font-mono text-slate-400 md:pl-5`}
                          >
                            {row.rank}
                          </td>
                          <td className={`max-w-[220px] ${leaderboardTdClass}`}>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[11px] text-slate-200 sm:text-[12px]">
                                {formatLeaderboardAddressShort(row.address)}
                              </span>
                              <button
                                type="button"
                                onClick={() => copy(row.address)}
                                className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
                                title="Copy address"
                                aria-label={`Copy ${row.address}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td
                            className={`${leaderboardTdClass} text-right font-semibold tabular-nums text-cyan-200/95`}
                          >
                            {row.successCount}
                          </td>
                          <td
                            className={`${leaderboardTdClass} pr-4 text-right text-slate-400 tabular-nums md:pr-5`}
                          >
                            {formatLeaderboardRelativeTime(row.lastSuccessAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
