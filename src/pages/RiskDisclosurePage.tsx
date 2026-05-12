import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Layers3, Network, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
}

export function RiskDisclosurePage() {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  return (
    <section className="relative min-h-screen overflow-hidden border-t border-uni-border">
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

      <div className="relative mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="mb-12 text-center"
        >
          <motion.div custom={0} variants={fadeUp} className="mb-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-pink/30 bg-uni-pink/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-uni-pink">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
              Risk notice
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl"
          >
            Risk <span className="text-uni-pink">disclosure</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-neutral-400 md:text-lg"
          >
            Digital asset activity involves material risk. Please review core risk dimensions
            before using swap features.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/disclaimer"
              className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-5 py-2.5 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
            >
              Disclaimer
            </Link>
          </motion.div>
        </motion.div>

        {/* Risk Cards */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: AlertTriangle,
              title: 'Market risk',
              text: 'Token prices can move rapidly. Quoted values may diverge from execution outcomes due to slippage and liquidity movement.',
            },
            {
              icon: Layers3,
              title: 'Protocol / contract risk',
              text: 'Routes interact with third-party smart contracts that may fail, be exploited, or behave unexpectedly after upgrades.',
            },
            {
              icon: Network,
              title: 'Operational risk',
              text: 'RPC instability, network congestion, chain reorgs, and wallet issues can delay confirmations or cause transaction failure.',
            },
            {
              icon: Network,
              title: 'Execution risk',
              text: 'Cross-chain transfers can be delayed by relayer downtime, destination chain finality, and temporary route unavailability.',
            },
          ].map((card, i) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              className="group relative flex flex-col items-center overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 text-center transition duration-300 hover:border-uni-pink/30"
            >
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-uni-pink/[0.03] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
                aria-hidden
              />
              <div className="relative">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-uni-pink/10 text-uni-pink ring-1 ring-uni-pink/20">
                  <card.icon className="h-6 w-6" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-white">{card.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{card.text}</p>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Checklist Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 md:p-8">
            <div
              className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-uni-pink/[0.06] blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <h3 className="text-lg font-semibold text-white">User checklist before signing</h3>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  'Confirm source/destination chain and token contract addresses.',
                  'Review quote freshness, expected output, and total fee impact.',
                  'Check approval scope and avoid unnecessary unlimited allowances.',
                  'Verify you are on the official EonSwap domain before signing any transaction.',
                  'Verify explorer links and keep tx hash records for troubleshooting.',
                  'Ensure your usage complies with local regulations and tax obligations.',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-uni-pink" aria-hidden />
                    <span className="text-sm text-neutral-400">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/status"
                  className="rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
                >
                  Check system status
                </Link>
                <Link
                  to="/disclaimer"
                  className="rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
                >
                  Read full disclaimer
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
