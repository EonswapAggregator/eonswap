import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  ChevronRight,
  Globe2,
  Percent,
  Route,
  Shield,
  Wallet,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

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

const networks = [
  'Ethereum',
  'Arbitrum',
  'Base',
  'Optimism',
  'Polygon',
  'BNB Chain',
] as const

/** Verifiable product facts — no vanity metrics */
const glance = [
  {
    title: 'Six chains in one screen',
    body: 'Ethereum, Arbitrum, Base, Optimism, Polygon, and BNB Smart Chain. Pick the active network in wallet; token lists and quotes follow that chain.',
  },
  {
    title: 'Quote, then sign',
    body: 'Review estimated output and route context before a transaction is built. Nothing is submitted until you approve in wallet.',
  },
  {
    title: 'Clear fee surface',
    body: 'This interface does not add an additional EonSwap fee by default. Network gas and routing or pool fees still apply.',
  },
] as const

const workflow = [
  {
    icon: Wallet,
    step: '01',
    title: 'Connect',
    body: 'Use a normal browser wallet. Keys stay on your device; we never hold balances.',
  },
  {
    icon: Route,
    step: '02',
    title: 'Get a quote',
    body: 'Choose tokens and an amount. The app asks a router for paths and shows what you would roughly receive.',
  },
  {
    icon: Zap,
    step: '03',
    title: 'Send the swap',
    body: 'If the numbers look right, submit. Track the tx in your wallet and on the Activity page.',
  },
] as const

const features = [
  {
    icon: Percent,
    title: 'Fees',
    body: 'We do not stack a separate EonSwap fee on trades. Gas and DEX/aggregator costs still apply like anywhere else.',
  },
  {
    icon: Globe2,
    title: 'Networks',
    body: 'Same swap flow on Ethereum, Arbitrum, Base, Optimism, Polygon, and BNB Smart Chain. Change chain in the wallet when you need to.',
  },
  {
    icon: BarChart3,
    title: 'Routing',
    body: 'Liquidity is sourced through an aggregator API, so one request can touch many pools. You see summary info before you commit.',
  },
] as const

export function Landing() {
  return (
    <div id="top" className="relative min-w-0 max-w-full overflow-hidden">
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(148,163,184,0.11) 1px, transparent 0)`,
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,210,255,0.12),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-[#0a0b1e]" />
        <div
          className="absolute -left-32 top-[-10%] h-[min(520px,55vw)] w-[min(520px,55vw)] rounded-full bg-eon-blue/12 blur-[100px]"
          style={{
            animation: 'eon-gradient-drift 22s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -right-24 top-[20%] h-[min(440px,50vw)] w-[min(440px,50vw)] rounded-full bg-cyan-500/[0.09] blur-[110px]"
          style={{
            animation: 'eon-gradient-drift 28s ease-in-out infinite reverse',
          }}
        />
        <div className="absolute bottom-0 left-1/2 h-px w-[min(100%,56rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
      </div>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pb-16 pt-14 md:px-6 md:pb-24 md:pt-20 lg:pt-24">
        {/* Hero-only accent */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[min(70vh,520px)] w-[min(90vw,680px)] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(0,210,255,0.07),transparent)] blur-2xl md:left-[28%] md:translate-x-0"
          aria-hidden
        />

        <div className="relative grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(280px,440px)] lg:gap-16 xl:gap-20">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: 0.08 } },
            }}
            className="text-center lg:text-left"
          >
            <motion.div
              custom={0}
              variants={fadeUp}
              className="mb-7 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start"
            >
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                EonSwap
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Shield className="h-3.5 w-3.5 text-eon-blue/80" aria-hidden />
                Non-custodial · Keys stay in your wallet
              </span>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="text-balance text-[clamp(1.85rem,9.5vw,2.35rem)] font-semibold leading-[1.08] tracking-[-0.038em] text-white sm:text-5xl sm:leading-[1.06] lg:text-[3.25rem] xl:text-[3.5rem]"
            >
              <span className="block text-white">Multi-chain</span>
              <span className="mt-1 block bg-gradient-to-r from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
                execution desk
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="mx-auto mt-7 max-w-xl text-pretty text-[15px] leading-[1.65] text-slate-400 lg:mx-0 lg:max-w-[34rem] sm:text-[17px]"
            >
              Find the best path, verify the quote, and trade confidently -
              always non-custodial, always in your control.
            </motion.p>

            <motion.p
              custom={3}
              variants={fadeUp}
              className="mx-auto mt-5 max-w-xl text-center text-[13px] leading-relaxed text-slate-600 lg:mx-0 lg:text-left"
            >
              <span className="text-slate-500">Supported networks</span>
              <span className="mx-2 hidden text-slate-700 sm:inline" aria-hidden>
                ·
              </span>
              <br className="sm:hidden" />
              <span className="break-words">{networks.join(' · ')}</span>
            </motion.p>

            <motion.div
              custom={4}
              variants={fadeUp}
              className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            >
              <Link
                to="/swap"
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-8 py-4 text-sm font-semibold text-[#03040a] shadow-[0_0_0_1px_rgba(255,255,255,0.12)_inset,0_2px_8px_rgba(0,0,0,0.25),0_24px_48px_-16px_rgba(0,210,255,0.45)] transition duration-300 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18)_inset,0_28px_56px_-16px_rgba(0,210,255,0.5)]"
              >
                <span
                  className="absolute inset-0 bg-gradient-to-r from-eon-blue via-cyan-300 to-cyan-400"
                  aria-hidden
                />
                <span
                  className="absolute inset-0 bg-gradient-to-r from-white/25 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
                  aria-hidden
                />
                <span className="relative flex items-center gap-2">
                  Launch swap
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
              <button
                type="button"
                onClick={() =>
                  document.getElementById('how-it-works')?.scrollIntoView({
                    behavior: 'smooth',
                  })
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-white/[0.12] bg-white/[0.03] px-8 py-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md transition hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white"
              >
                How it works
                <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden />
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.2,
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none"
          >
            <div
              className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-b from-white/[0.12] via-eon-blue/20 to-transparent opacity-60 blur-sm"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] p-6 shadow-[0_32px_64px_-24px_rgba(0,0,0,0.55)] md:p-7">
              <div
                className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-eon-blue/[0.12] blur-3xl"
                aria-hidden
              />
              <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5" aria-hidden>
                    <span className="h-2 w-2 rounded-full bg-white/15" />
                    <span className="h-2 w-2 rounded-full bg-white/10" />
                    <span className="h-2 w-2 rounded-full bg-white/10" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    Quote preview
                  </span>
                </div>
                <ArrowRightLeft
                  className="h-4 w-4 text-eon-blue/70"
                  strokeWidth={1.75}
                  aria-hidden
                />
              </div>
              <div className="relative mt-5 space-y-3">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Sell
                  </p>
                  <p className="mt-2 font-mono text-lg font-medium tabular-nums text-white">
                    1.00
                    <span className="ml-2 text-sm font-sans font-medium text-slate-400">
                      ETH
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Buy (est.)
                  </p>
                  <p className="mt-2 font-mono text-lg font-medium tabular-nums text-slate-200">
                    3,842.06
                    <span className="ml-2 text-sm font-sans font-medium text-slate-500">
                      USDC
                    </span>
                  </p>
                </div>
              </div>
              <div className="relative mt-5 flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                <span className="text-xs text-slate-500">Route</span>
                <span className="text-xs font-medium text-eon-blue/90">
                  Ready to review
                </span>
              </div>
              <p className="relative mt-4 text-center text-[11px] leading-relaxed text-slate-600">
                Illustrative only. Live numbers appear after you connect and
                request a quote.
              </p>
            </div>
          </motion.div>
        </div>

        {/* At a glance */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-20 max-w-5xl md:mt-28"
        >
          <div className="mb-8 max-w-xl text-left lg:mx-auto lg:text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Overview
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              At a glance
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 md:text-[15px]">
              Plain product facts only. No vanity TVL or volume claims.
            </p>
          </div>
          <div className="relative">
            <div
              className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-b from-white/[0.1] via-eon-blue/15 to-transparent opacity-50 blur-sm"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] shadow-[0_32px_64px_-28px_rgba(0,0,0,0.5)]">
              <div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-eon-blue/45 to-transparent"
                aria-hidden
              />
              <div className="grid divide-y divide-white/[0.06] md:grid-cols-3 md:divide-x md:divide-y-0">
                {glance.map((item, i) => (
                  <div
                    key={item.title}
                    className="group px-5 py-8 text-left md:px-7 md:py-9"
                  >
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 className="text-[15px] font-semibold text-slate-100 transition group-hover:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-400">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Workflow */}
      <section
        id="how-it-works"
        className="relative scroll-mt-24 border-t border-white/[0.08] py-20 md:py-24"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                Process
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                How it works
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-slate-500 md:text-right md:text-[15px]">
              Three steps. No account on our side.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3 md:gap-6">
            {workflow.map((w, i) => (
              <motion.div
                key={w.step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.07, duration: 0.45 }}
                className="relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914]/90 p-6 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] md:p-7"
              >
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
                  aria-hidden
                />
                <div className="relative mb-5 flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600">
                    {w.step}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-eon-blue/[0.1] text-eon-blue shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-eon-blue/20">
                    <w.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </div>
                </div>
                <h3 className="relative text-base font-semibold text-white">
                  {w.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-500">
                  {w.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative border-t border-white/[0.08] bg-gradient-to-b from-[#080914]/90 to-[#060714]/95 py-20 md:py-28"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-eon-blue/30 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Reference
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Details
            </h2>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-500 md:text-base">
              What people usually ask before trying a swap.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-3 md:gap-6">
            {features.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.06, duration: 0.45 }}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/85 via-[#0c0e22]/85 to-[#080914]/90 p-7 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.4)] transition duration-300 hover:border-eon-blue/25 hover:shadow-[0_28px_56px_-20px_rgba(0,210,255,0.14)] md:p-8"
              >
                <div
                  className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent opacity-80"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-eon-blue/[0.06] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-eon-blue/15 to-transparent text-eon-blue shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.1]">
                    <f.icon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-white">
                    {f.title}
                  </h3>
                  <p className="mt-3 text-sm leading-[1.65] text-slate-500">
                    {f.body}
                  </p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-white/[0.08] py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="relative">
            <div
              className="absolute -inset-px rounded-[1.35rem] bg-gradient-to-b from-white/[0.12] via-eon-blue/20 to-transparent opacity-50 blur-sm"
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] p-8 shadow-[0_32px_64px_-28px_rgba(0,0,0,0.55)] md:p-12"
            >
              <div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-eon-blue/40 to-transparent"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-eon-blue/[0.12] blur-[90px]"
                aria-hidden
              />
              <div className="relative flex flex-col items-center justify-between gap-8 md:flex-row md:gap-12">
                <div className="max-w-lg text-center md:text-left">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    Next step
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-[1.75rem]">
                    Open the swap page
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-slate-500 md:text-[15px]">
                    If you already use a wallet, jump in. For risks and
                    disclaimers, see the footer.
                  </p>
                </div>
                <div className="flex w-full shrink-0 flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <Link
                    to="/swap"
                    className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-8 py-4 text-sm font-semibold text-[#03040a] shadow-[0_0_0_1px_rgba(255,255,255,0.1)_inset,0_20px_40px_-14px_rgba(0,210,255,0.4)] transition duration-300 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.14)_inset,0_24px_48px_-14px_rgba(0,210,255,0.45)]"
                  >
                    <span
                      className="absolute inset-0 bg-gradient-to-r from-eon-blue via-cyan-300 to-cyan-400"
                      aria-hidden
                    />
                    <span
                      className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
                      aria-hidden
                    />
                    <span className="relative flex items-center gap-2">
                      Go to swap
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById('top')?.scrollIntoView({
                        behavior: 'smooth',
                      })
                    }
                    className="inline-flex items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.03] px-6 py-4 text-sm font-medium text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-white/[0.16] hover:bg-white/[0.05] hover:text-white"
                  >
                    Back to top
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
