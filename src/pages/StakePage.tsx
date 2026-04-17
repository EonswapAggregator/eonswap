import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Lock, Sprout, ArrowRight, Shield, Coins, Clock } from 'lucide-react'

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

export function StakePage() {
  const prefersReducedMotion = useReducedMotion()

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
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              <Lock className="h-3.5 w-3.5 text-uni-pink" />
              Single-Sided Staking
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-uni-pink/80" aria-hidden />
              Secure & Non-custodial
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-white"
          >
            <span className="block">Stake ESTF,</span>
            <span className="mt-1 block text-uni-pink">earn rewards.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Stake your ESTF tokens to earn protocol rewards and participate in governance. 
            Coming soon with xESTF staking and veESTF voting.
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
                Get ESTF
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/farm"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-uni-border bg-transparent px-6 py-3 text-sm font-medium text-white transition hover:bg-uni-surface"
            >
              <Sprout className="h-4 w-4" />
              Farm LP Tokens
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Coming Soon Panel */}
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
              {/* xESTF Staking */}
              <div className="group px-6 py-8 text-center transition duration-200 hover:bg-uni-surface-2">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                    <Coins className="h-6 w-6 text-uni-pink" aria-hidden />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white">xESTF Staking</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Stake ESTF to receive xESTF and earn protocol revenue share
                </p>
                <span className="mt-4 inline-block rounded-full border border-uni-pink/30 bg-uni-pink/[0.08] px-3 py-1 text-xs font-medium text-uni-pink">
                  Coming Soon
                </span>
              </div>

              {/* veESTF Voting */}
              <div className="group px-6 py-8 text-center transition duration-200 hover:bg-uni-surface-2">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                    <Lock className="h-6 w-6 text-uni-pink" aria-hidden />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white">veESTF Voting</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Lock ESTF to get veESTF and vote on emission gauges
                </p>
                <span className="mt-4 inline-block rounded-full border border-uni-pink/30 bg-uni-pink/[0.08] px-3 py-1 text-xs font-medium text-uni-pink">
                  Coming Soon
                </span>
              </div>

              {/* Governance */}
              <div className="group px-6 py-8 text-center transition duration-200 hover:bg-uni-surface-2">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-uni-pink/[0.1] ring-1 ring-uni-pink/20">
                    <Clock className="h-6 w-6 text-uni-pink" aria-hidden />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white">Governance</h3>
                <p className="mt-2 text-sm text-neutral-400">
                  Participate in protocol governance with your staked tokens
                </p>
                <span className="mt-4 inline-block rounded-full border border-uni-pink/30 bg-uni-pink/[0.08] px-3 py-1 text-xs font-medium text-uni-pink">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Info Section */}
      <section className="relative mx-auto max-w-3xl px-4 pb-16 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="rounded-2xl border border-uni-border bg-uni-surface p-6 text-center"
        >
          <p className="text-sm leading-relaxed text-neutral-400">
            While staking features are being developed, you can earn rewards by providing liquidity
            and staking LP tokens in the{' '}
            <Link to="/farm" className="text-uni-pink hover:underline">
              Farm
            </Link>
            . Get LP tokens by adding liquidity on the{' '}
            <Link to="/liquidity" className="text-uni-pink hover:underline">
              Liquidity
            </Link>{' '}
            page.
          </p>
        </motion.div>
      </section>
    </div>
  )
}
