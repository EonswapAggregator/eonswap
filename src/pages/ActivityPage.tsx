import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ActivityLiveBanner } from "../components/ActivityLiveBanner";
import { useEonSwapStore } from "../store/useEonSwapStore";
import { explorerTxUrl } from "../lib/chains";
import { usePublicClient } from "wagmi";
import {
  fetchBlockchainSwapActivities,
  formatSwapActivity,
  type BlockchainSwapActivity,
} from "../lib/blockchainActivity";

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

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
};

export function ActivityPage() {
  const prefersReducedMotion = useReducedMotion();
  const history = useEonSwapStore((s) => s.history);
  const clearHistory = useEonSwapStore((s) => s.clearHistory);
  const [viewMode, setViewMode] = useState<"my" | "global">("global");
  const [globalActivities, setGlobalActivities] = useState<
    BlockchainSwapActivity[]
  >([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const publicClient = usePublicClient();

  const loadGlobalActivities = useCallback(async () => {
    if (!publicClient) {
      setGlobalError("Client not connected");
      return;
    }
    setGlobalLoading(true);
    setGlobalError(null);
    const result = await fetchBlockchainSwapActivities(publicClient, 100);
    if (result.ok) {
      setGlobalActivities(result.activities);
    } else {
      setGlobalError(result.error);
    }
    setGlobalLoading(false);
  }, [publicClient]);

  useEffect(() => {
    if (viewMode === "global") {
      loadGlobalActivities();
    }
  }, [viewMode, loadGlobalActivities]);

  const stats = useMemo(() => {
    const success = history.filter((h) => h.status === "success").length;
    const pending = history.filter((h) => h.status === "pending").length;
    const failed = history.filter((h) => h.status === "failed").length;
    return { total: history.length, success, pending, failed };
  }, [history]);

  // Filter only swap activities from website for "My Activity" table
  const mySwaps = useMemo(() => {
    return history
      .filter((h) => h.kind === "swap")
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [history]);

  const statCards = [
    {
      label: "Total Swaps",
      value: stats.total,
      sub: "This session",
      icon: TrendingUp,
      color: "text-uni-pink",
      bgGlow: "bg-uni-pink/20",
      ringColor: "ring-uni-pink/30",
    },
    {
      label: "Confirmed",
      value: stats.success,
      sub: "Completed",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgGlow: "bg-emerald-500/20",
      ringColor: "ring-emerald-500/30",
    },
    {
      label: "Pending",
      value: stats.pending,
      sub: "Awaiting",
      icon: Clock,
      color: "text-amber-400",
      bgGlow: "bg-amber-500/20",
      ringColor: "ring-amber-500/30",
    },
    {
      label: "Failed",
      value: stats.failed,
      sub: "Reverted",
      icon: XCircle,
      color: "text-rose-400",
      bgGlow: "bg-rose-500/20",
      ringColor: "ring-rose-500/30",
    },
  ] as const;

  const successRate =
    stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      {/* Gradient backdrop - matching liquidity page */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,0,122,0.12),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-uni-bg" />
        <div
          className="absolute -left-32 top-[-10%] h-[min(420px,45vw)] w-[min(420px,45vw)] rounded-full bg-uni-pink/10 blur-[100px]"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "eon-gradient-drift 22s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -right-24 top-[30%] h-[min(360px,40vw)] w-[min(360px,40vw)] rounded-full bg-uni-purple/[0.08] blur-[90px]"
          style={{
            animation: prefersReducedMotion
              ? "none"
              : "eon-gradient-drift 28s ease-in-out infinite reverse",
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
            <span className="mt-1 block bg-gradient-to-r from-uni-pink to-uni-pink-light bg-clip-text text-transparent">
              History
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Track all your EonSwap transactions from this session. View status,
            details, and explore on-chain.
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
                <div
                  className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${stat.bgGlow} blur-3xl opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                      {stat.label}
                    </p>
                    <p
                      className={`mt-2 text-3xl font-bold tabular-nums ${stat.color}`}
                    >
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">{stat.sub}</p>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgGlow} ring-1 ${stat.ringColor}`}
                  >
                    <stat.icon
                      className={`h-6 w-6 ${stat.color}`}
                      strokeWidth={1.75}
                      aria-hidden
                    />
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
                    <p className="text-sm font-semibold text-white">
                      Success Rate
                    </p>
                    <p className="text-xs text-neutral-500">
                      {stats.success} of {stats.total} swaps completed
                    </p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {successRate}%
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-uni-bg">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${successRate}%` }}
                  transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Session Swaps Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 md:px-6 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
        >
          {viewMode === "global" ? (
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/10 ring-1 ring-uni-pink/20">
                <Globe className="h-5 w-5 text-uni-pink" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Global Swaps</h2>
                <p className="text-sm text-neutral-500">
                  {globalActivities.length} swaps · realtime from blockchain
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uni-pink/10 ring-1 ring-uni-pink/20">
                <History className="h-5 w-5 text-uni-pink" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">My Swaps</h2>
                <p className="text-sm text-neutral-500">
                  {stats.total} swaps · activity from this website
                </p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <ActivityLiveBanner
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              stats={stats}
              onRefresh={
                viewMode === "global" ? loadGlobalActivities : undefined
              }
              refreshLoading={globalLoading}
            />
          </div>

          {/* Global Activity View */}
          {viewMode === "global" && (
            <>
              {globalLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-uni-pink" />
                </div>
              )}

              {globalError && !globalLoading && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
                  <XCircle className="mx-auto h-8 w-8 text-rose-400" />
                  <p className="mt-2 text-sm text-rose-300">{globalError}</p>
                  <button
                    type="button"
                    onClick={loadGlobalActivities}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/30"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              )}

              {!globalLoading &&
                !globalError &&
                globalActivities.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-uni-border bg-uni-surface/50 p-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-uni-surface-2">
                      <Globe className="h-8 w-8 text-neutral-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">
                      No recent swaps
                    </h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                      No swap transactions found in the last ~3 hours. Be the
                      first to trade!
                    </p>
                  </div>
                )}

              {!globalLoading &&
                !globalError &&
                globalActivities.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-uni-border bg-uni-surface">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-uni-border bg-uni-surface-2">
                            <th className="px-4 py-3 font-semibold text-neutral-400">
                              Time
                            </th>
                            <th className="px-4 py-3 font-semibold text-neutral-400">
                              Wallet
                            </th>
                            <th className="px-4 py-3 font-semibold text-neutral-400">
                              Action
                            </th>
                            <th className="px-4 py-3 font-semibold text-neutral-400 text-right">
                              Tx
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {globalActivities.map((activity) => {
                            const timeAgo = formatTimeAgo(activity.timestamp);
                            const shortAddr = activity.from
                              ? `${activity.from.slice(0, 6)}...${activity.from.slice(-4)}`
                              : "—";
                            const txUrl = explorerTxUrl(8453, activity.txHash);
                            const summary = formatSwapActivity(activity);

                            return (
                              <tr
                                key={activity.id}
                                className="border-b border-uni-border/50 transition hover:bg-uni-surface-2"
                              >
                                <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                                  {timeAgo}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 font-mono text-neutral-300">
                                  {shortAddr}
                                </td>
                                <td className="px-4 py-3 text-white">
                                  {summary}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right">
                                  {txUrl ? (
                                    <a
                                      href={txUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-uni-pink transition hover:text-uni-pink-light"
                                    >
                                      View
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  ) : (
                                    <span className="text-neutral-600">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </>
          )}

          {/* My Activity View */}
          {viewMode === "my" && (
            <>
              {/* Empty State */}
              {mySwaps.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mb-8 overflow-hidden rounded-3xl border border-dashed border-uni-border bg-uni-surface/50 p-10 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-uni-surface-2">
                    <History className="h-8 w-8 text-neutral-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    No swaps yet
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                    Your swap history will appear here once you make your first
                    trade on this website. Get started now!
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/swap"
                      className="inline-flex items-center gap-2 rounded-xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-uni-pink-light"
                    >
                      <Zap className="h-4 w-4" />
                      Start Swapping
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* My Swaps Table */}
              {mySwaps.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-uni-border bg-uni-surface">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-uni-border bg-uni-surface-2">
                          <th className="px-4 py-3 font-semibold text-neutral-400">
                            Time
                          </th>
                          <th className="px-4 py-3 font-semibold text-neutral-400">
                            Action
                          </th>
                          <th className="px-4 py-3 font-semibold text-neutral-400">
                            Status
                          </th>
                          <th className="px-4 py-3 font-semibold text-neutral-400 text-right">
                            Tx
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mySwaps.map((swap) => {
                          const timeAgo = formatTimeAgo(swap.createdAt);
                          const txUrl = swap.txHash
                            ? explorerTxUrl(swap.chainId, swap.txHash)
                            : null;

                          return (
                            <tr
                              key={swap.id}
                              className="border-b border-uni-border/50 transition hover:bg-uni-surface-2"
                            >
                              <td className="whitespace-nowrap px-4 py-3 text-neutral-500">
                                {timeAgo}
                              </td>
                              <td className="px-4 py-3 text-white">
                                {swap.summary}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3">
                                {swap.status === "success" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-200 ring-1 ring-emerald-500/20">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Success
                                  </span>
                                )}
                                {swap.status === "pending" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-uni-pink/12 px-2.5 py-1 text-xs font-medium text-uni-pink ring-1 ring-uni-pink/25">
                                    <Clock className="h-3.5 w-3.5" />
                                    Pending
                                  </span>
                                )}
                                {swap.status === "failed" && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/12 px-2.5 py-1 text-xs font-medium text-red-200 ring-1 ring-red-500/20">
                                    <XCircle className="h-3.5 w-3.5" />
                                    Failed
                                  </span>
                                )}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-right">
                                {txUrl ? (
                                  <a
                                    href={txUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-uni-pink transition hover:text-uni-pink-light"
                                  >
                                    View
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : (
                                  <span className="text-neutral-600">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </section>
    </div>
  );
}
