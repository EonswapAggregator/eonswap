import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.08] py-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_12%_0%,rgba(34,211,238,0.09),transparent_60%),radial-gradient(55%_45%_at_88%_8%,rgba(59,130,246,0.08),transparent_70%)]"
      />
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#12142e]/95 via-[#0c0e22]/95 to-[#080914] p-6 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.75)] md:p-8"
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
              Error 404
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
              This route is unavailable
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              The page may have moved, been removed, or the URL may be incorrect. Continue to a
              verified workspace below.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              to="/swap"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue px-4 text-sm font-semibold text-[#05060f] shadow-[0_0_24px_-10px_rgba(34,211,238,0.5)]"
            >
              Go to Swap
            </Link>
            <Link
              to="/"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.03] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.06]"
            >
              Back to Home
            </Link>
            <Link
              to="/status"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.03] px-4 text-sm font-semibold text-slate-200 transition hover:border-white/[0.2] hover:bg-white/[0.06]"
            >
              Open Status
            </Link>
          </div>

          <div className="mt-6 grid gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-slate-400 md:grid-cols-3">
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              Tip: check URL spelling and route path.
            </p>
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              Use status page to verify transaction links.
            </p>
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              If issue persists, open support from footer.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
