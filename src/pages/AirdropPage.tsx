import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Gift,
  Shield,
  Clock,
  Users,
  Coins,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  Calendar,
  Target,
  Wallet,
} from 'lucide-react'
import { useAccount } from 'wagmi'

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

const stats = [
  {
    icon: Coins,
    label: 'Total Allocation',
    value: '10,000,000 ESTF',
    color: 'text-uni-pink',
  },
  {
    icon: Users,
    label: 'Eligible Wallets',
    value: 'TBA',
    color: 'text-emerald-400',
  },
  {
    icon: Calendar,
    label: 'Snapshot Date',
    value: 'TBA',
    color: 'text-amber-400',
  },
] as const

const eligibilityCriteria = [
  {
    title: 'Early Liquidity Providers',
    description: 'Users who provided liquidity in the first 30 days',
    icon: Target,
  },
  {
    title: 'Active Traders',
    description: 'Minimum 10 swaps with total volume > $1,000',
    icon: Sparkles,
  },
  {
    title: 'Community Members',
    description: 'Discord/Twitter verified community contributors',
    icon: Users,
  },
] as const

const timeline: Array<{ phase: string; title: string; status: 'upcoming' | 'active' | 'completed'; date: string }> = [
  { phase: 'Phase 1', title: 'Snapshot', status: 'upcoming', date: 'TBA' },
  { phase: 'Phase 2', title: 'Eligibility Check', status: 'upcoming', date: 'TBA' },
  { phase: 'Phase 3', title: 'Claim Period', status: 'upcoming', date: 'TBA' },
]

export function AirdropPage() {
  const prefersReducedMotion = useReducedMotion()
  const { isConnected, address: _address } = useAccount()

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
          className="absolute -right-24 top-[30%] h-[min(360px,40vw)] w-[min(360px,40vw)] rounded-full bg-amber-500/[0.06] blur-[90px]"
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
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-medium uppercase tracking-widest text-amber-300">
              <Gift className="h-3.5 w-3.5" />
              Airdrop Program
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-uni-pink/80" aria-hidden />
              Official EonSwap Campaign
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-white"
          >
            <span className="block">ESTF Token</span>
            <span className="mt-1 block bg-gradient-to-r from-amber-400 to-uni-pink bg-clip-text text-transparent">
              Airdrop
            </span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Early supporters and active community members will receive ESTF tokens. 
            Check your eligibility and claim your rewards.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            {isConnected ? (
              <button
                type="button"
                disabled
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-400 cursor-not-allowed"
              >
                <Clock className="mr-2 h-4 w-4" />
                Claim Coming Soon
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-uni-pink/50 px-6 py-3 text-sm font-semibold text-white/70 cursor-not-allowed"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Check
              </button>
            )}
            <Link
              to="/liquidity"
              className="inline-flex items-center gap-2 rounded-2xl border border-uni-border bg-uni-surface px-6 py-3 text-sm font-medium text-neutral-300 transition hover:border-uni-pink/40 hover:bg-uni-surface-2 hover:text-white"
            >
              Provide Liquidity
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid gap-4 sm:grid-cols-3"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                custom={i + 4}
                variants={fadeUp}
                className="rounded-2xl border border-uni-border bg-uni-surface/60 p-5 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl bg-white/[0.04] p-2.5 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500">{stat.label}</p>
                    <p className="text-lg font-semibold text-white">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Eligibility Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="mb-6 text-xl font-semibold text-white">Eligibility Criteria</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {eligibilityCriteria.map((criteria, i) => {
              const Icon = criteria.icon
              return (
                <motion.div
                  key={criteria.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="group rounded-2xl border border-uni-border bg-uni-surface/60 p-5 transition hover:border-uni-pink/30 hover:bg-uni-surface"
                >
                  <div className="mb-3 inline-flex rounded-xl bg-uni-pink/10 p-2.5">
                    <Icon className="h-5 w-5 text-uni-pink" />
                  </div>
                  <h3 className="font-semibold text-white">{criteria.title}</h3>
                  <p className="mt-1.5 text-sm text-neutral-400">{criteria.description}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </section>

      {/* Timeline Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="mb-6 text-xl font-semibold text-white">Airdrop Timeline</h2>
          <div className="rounded-2xl border border-uni-border bg-uni-surface/60 p-5 md:p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              {timeline.map((item, i) => (
                <div key={item.phase} className="flex items-center gap-4 md:flex-1">
                  <div className="relative">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        item.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.status === 'active'
                            ? 'bg-uni-pink/20 text-uni-pink'
                            : 'bg-neutral-700/50 text-neutral-500'
                      }`}
                    >
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{i + 1}</span>
                      )}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className="absolute left-1/2 top-full hidden h-6 w-px -translate-x-1/2 bg-uni-border md:block md:left-full md:top-1/2 md:h-px md:w-full md:-translate-y-1/2 md:translate-x-0" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-neutral-500">{item.phase}</p>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-neutral-500">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Warning Notice */}
      <section className="relative mx-auto max-w-7xl px-4 pb-12 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 md:p-6"
        >
          <div className="flex gap-4">
            <div className="rounded-xl bg-amber-500/10 p-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-300">Security Notice</h3>
              <p className="mt-1.5 text-sm text-amber-200/70">
                Only trust official announcements from EonSwap channels. Never share your seed phrase 
                or private keys. The airdrop will never require you to send tokens first.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/faq"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20"
                >
                  Read FAQ
                </Link>
                <a
                  href="https://twitter.com/EonSwap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20"
                >
                  Official Twitter
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-3xl border border-uni-border bg-gradient-to-br from-uni-surface via-uni-surface to-uni-pink/5 p-8 text-center md:p-12"
        >
          <h2 className="text-2xl font-semibold text-white md:text-3xl">
            Start earning while you wait
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-neutral-400">
            Provide liquidity and trade on EonSwap to maximize your potential airdrop allocation. 
            Active users receive bonus multipliers.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/swap"
              className="inline-flex items-center gap-2 rounded-2xl bg-uni-pink px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-uni-pink-light"
            >
              <Sparkles className="h-4 w-4" />
              Start Trading
            </Link>
            <Link
              to="/liquidity"
              className="inline-flex items-center gap-2 rounded-2xl border border-uni-border bg-uni-surface px-6 py-3 text-sm font-medium text-neutral-300 transition hover:border-uni-pink/40 hover:bg-uni-surface-2 hover:text-white"
            >
              Add Liquidity
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
