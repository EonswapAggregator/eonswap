import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  Droplets,
  Plus,
  RefreshCw,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { base } from 'viem/chains'

import { useEonPools } from '../hooks/useEonPools'
import { PoolGrid } from '../components/pool/PoolGrid'
import { CreatePoolModal } from '../components/pool/CreatePoolModal'

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

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0.00'
  if (value < 1) return `$${value.toFixed(4)}`
  if (value < 1000) return `$${value.toFixed(2)}`
  if (value < 1_000_000) return `$${(value / 1000).toFixed(2)}K`
  if (value < 1_000_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  return `$${(value / 1_000_000_000).toFixed(2)}B`
}

const stats = [
  {
    icon: Droplets,
    label: 'Active Pools',
    getValue: (pools: number) => String(pools),
    color: 'text-uni-pink',
  },
  {
    icon: TrendingUp,
    label: 'Total Liquidity',
    getValue: (_: number, tvl: number) => formatUsd(tvl),
    color: 'text-uni-pink',
  },
  {
    icon: Wallet,
    label: 'Your Positions',
    getValue: (_: number, __: number, positions: number) => formatUsd(positions),
    color: 'text-uni-pink',
  },
] as const

export function PoolPage() {
  const prefersReducedMotion = useReducedMotion()
  const { isConnected } = useAccount()

  const { pools, userPositions, loading, error, refresh } = useEonPools(base.id)
  const [showCreatePool, setShowCreatePool] = useState(false)

  const totalTvl = pools.reduce((sum, p) => sum + p.tvlUsd, 0)
  const totalPositionValue = userPositions.reduce((sum, p) => sum + p.valueUsd, 0)

  const handleCreateSuccess = () => {
    setShowCreatePool(false)
    void refresh()
  }

  return (
    <div className="relative min-w-0 max-w-full overflow-hidden">
      {/* Gradient backdrop - matching landing page */}
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
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              <Droplets className="h-3.5 w-3.5 text-uni-pink" />
              Liquidity Pools
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-uni-pink/80" aria-hidden />
              Powered by Eon AMM
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-white"
          >
            <span className="block">Provide liquidity,</span>
            <span className="mt-1 block text-uni-pink">earn fees.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Add liquidity to Eon AMM pools and earn a share of trading fees. 
            Your tokens work for you while you maintain full custody.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <button
              type="button"
              onClick={() => setShowCreatePool(true)}
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white shadow-glow transition duration-300 hover:bg-uni-pink-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uni-pink/70 focus-visible:ring-offset-2 focus-visible:ring-offset-uni-bg"
            >
              <span className="relative flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Pool
              </span>
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-uni-border bg-transparent px-6 py-3 text-sm font-medium text-white transition hover:bg-uni-surface disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative mx-auto max-w-5xl px-4 pb-10 md:px-6">
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
                    {loading
                      ? '...'
                      : stat.getValue(
                          pools.length,
                          totalTvl,
                          isConnected ? totalPositionValue : 0
                        )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Pools Grid Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20 md:px-6 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                Available Pools
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white md:text-2xl">
                Liquidity Pools
              </h2>
            </div>
            <Link
              to="/swap"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-uni-pink transition hover:text-uni-pink-light"
            >
              Go to Swap
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-sm text-rose-300">
              {error}
            </div>
          )}

          <PoolGrid
            pools={pools}
            userPositions={userPositions}
            loading={loading}
            onRefresh={refresh}
          />
        </motion.div>
      </section>

      {/* Create Pool Modal */}
      {showCreatePool && (
        <CreatePoolModal
          chainId={base.id}
          onClose={() => setShowCreatePool(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  )
}
