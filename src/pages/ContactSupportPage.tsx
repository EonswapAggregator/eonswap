import { motion } from 'framer-motion'
import { Clock3, LifeBuoy, Mail, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { roleEmail } from '../lib/site'

export function ContactSupportPage() {
  const supportEmail = roleEmail('support')
  const securityEmail = roleEmail('security')

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
                Support operations
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Resources
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Contact support
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Need help with wallet connection, quote behavior, swap execution, or bridge tracking?
              Share details and our team can investigate faster.
            </p>
          </div>
          <Link
            to="/status"
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            Open status tracker
          </Link>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-3">
          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
          >
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]">
              <LifeBuoy className="h-4 w-4 text-eon-blue" aria-hidden />
            </div>
            <h2 className="mt-3 text-base font-semibold text-white">General support</h2>
            <p className="mt-1 text-sm text-slate-400">
              Wallet connection, quote mismatch, route behavior, pending transaction diagnostics.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-white/[0.2]"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {supportEmail}
            </a>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04 }}
            className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
          >
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]">
              <ShieldAlert className="h-4 w-4 text-eon-blue" aria-hidden />
            </div>
            <h2 className="mt-3 text-base font-semibold text-white">Security reports</h2>
            <p className="mt-1 text-sm text-slate-400">
              Found a vulnerability? Send reproducible details and impact scope via the dedicated channel.
            </p>
            <a
              href={`mailto:${securityEmail}`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.12] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition hover:border-white/[0.2]"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {securityEmail}
            </a>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
          >
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]">
              <Clock3 className="h-4 w-4 text-eon-blue" aria-hidden />
            </div>
            <h2 className="mt-3 text-base font-semibold text-white">Response scope</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
              <li>Support clarifies interface and status behavior.</li>
              <li>Support cannot reverse confirmed on-chain transactions.</li>
              <li>Critical issues are prioritized in queue order.</li>
            </ul>
          </motion.article>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
            Include this in your report
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Wallet address (shortened is okay)',
              'Source / destination chain',
              'Token pair and input amount',
              'Transaction hash + timestamp',
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-400"
              >
                {item}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
