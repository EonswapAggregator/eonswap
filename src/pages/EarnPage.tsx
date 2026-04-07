import { motion } from 'framer-motion'
import {
  ArrowRight,
  Coins,
  Layers3,
  Percent,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export function EarnPage() {
  return (
    <section className="scroll-mt-24 border-t border-white/[0.08] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
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
                Yield hub preview
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Yield
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Earn strategy desk
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Standard earn layout is ready. The feature is currently placeholder
              only and not processing deposits yet.
            </p>
          </div>
          <Link
            to="/swap"
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            Back to swap
          </Link>
        </motion.div>

        <div className="grid min-w-0 items-stretch gap-5 lg:grid-cols-[minmax(0,392px)_minmax(0,1fr)] lg:gap-6 xl:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="order-1 flex min-w-0 justify-center lg:justify-start"
          >
            <div className="relative w-full max-w-[min(100%,392px)] overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#12142e] to-[#0a0b1c] shadow-[0_20px_64px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(0,210,255,0.06)]">
              <div className="relative flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold tracking-tight text-white">
                    Earn
                  </h2>
                  <p className="truncate text-[11px] leading-tight text-slate-500">
                    Placeholder mode
                  </p>
                </div>
                <Sparkles
                  className="h-4 w-4 text-eon-blue/80"
                  strokeWidth={1.8}
                  aria-hidden
                />
              </div>

              <div className="flex flex-col gap-2.5 px-4 pb-3.5 pt-2.5">
                <div className="rounded-xl border border-white/[0.08] bg-[#070818]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Pool
                  </span>
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                    <span className="font-mono text-sm text-white">USDC / ETH</span>
                    <span className="text-xs text-slate-500">v3</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.08] bg-[#070818]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                    APR (preview)
                  </span>
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                    <span className="font-mono text-sm text-white">--.--%</span>
                    <span className="text-xs text-slate-500">est.</span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-1 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue py-2.5 text-sm font-semibold text-[#05060f] opacity-70"
                >
                  Earn coming soon
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="order-2 flex min-h-0 min-w-0 w-full max-w-full flex-col gap-4"
          >
            <div className="rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914]/90 p-6 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]">
              <h3 className="text-base font-semibold text-white">Earn overview</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Coins className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Positions</p>
                  <p className="text-sm font-semibold text-slate-100">0 active</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Percent className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Average APR</p>
                  <p className="text-sm font-semibold text-slate-100">Preview only</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <Layers3 className="h-4 w-4 text-eon-blue" aria-hidden />
                  <p className="mt-2 text-xs text-slate-500">Network scope</p>
                  <p className="text-sm font-semibold text-slate-100">Multi-chain</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/90 via-[#0c0e22]/90 to-[#080914]/90 p-6 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)]">
              <h3 className="text-base font-semibold text-white">Safety notes</h3>
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-eon-blue" aria-hidden />
                <p className="text-sm leading-relaxed text-slate-400">
                  This page is placeholder-only. Once live, it will include explicit
                  risk disclosure for impermanent loss, smart-contract risk, and reward
                  variability.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/swap"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue px-4 py-2.5 text-sm font-semibold text-[#05060f]"
                >
                  Go to swap
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  to="/contact-support"
                  className="inline-flex items-center rounded-xl border border-white/[0.12] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/[0.18] hover:text-white"
                >
                  Contact support
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
