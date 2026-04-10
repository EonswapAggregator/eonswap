import { motion } from 'framer-motion'
import { AlertOctagon, BadgeInfo, CheckCircle2, Scale } from 'lucide-react'
import { Link } from 'react-router-dom'
import { uiButtonSecondary } from '../lib/uiButtonClasses'

export function DisclaimerPage() {
  return (
    <section className="scroll-mt-24 border-t border-white/[0.08] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] via-white/[0.015] to-transparent p-4 sm:flex-row sm:items-center sm:justify-between md:mb-7 md:p-5"
        >
          <div
            className="pointer-events-none absolute -right-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-eon-blue/[0.12] blur-2xl"
            aria-hidden
          />
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                Legal notice
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Legal
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Disclaimer
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Information and route displays on EonSwap are for interface and
              informational use only and should not be treated as professional advice.
            </p>
          </div>
          <Link
            to="/risk-disclosure"
            className={`${uiButtonSecondary} shrink-0`}
          >
            Risk disclosure
          </Link>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: BadgeInfo,
              title: 'No financial advice',
              text: 'Interface data and route outputs are not investment, legal, tax, or accounting advice. Seek independent professional guidance where needed.',
            },
            {
              icon: AlertOctagon,
              title: 'No guarantee',
              text: 'EonSwap does not guarantee uninterrupted service, provider uptime, or successful execution under all market/network conditions.',
            },
            {
              icon: Scale,
              title: 'Liability limitation',
              text: 'To the extent permitted by law, indirect or consequential losses from use of decentralized infrastructure are outside platform liability.',
            },
          ].map((card, i) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="group rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4 transition duration-200 hover:border-white/[0.18] hover:bg-white/[0.03]"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]">
                <card.icon className="h-4 w-4 text-eon-blue" aria-hidden />
              </div>
              <h2 className="mt-3 text-base font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.text}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
            Final reminder
          </h3>
          <ul className="mt-2 grid gap-2 text-sm text-slate-400 md:grid-cols-2">
            {[
              'You remain fully responsible for wallet custody and signing decisions.',
              'Third-party protocol behavior, pricing, and liquidity are outside direct platform control.',
              'On-chain execution is final after confirmation and generally cannot be reversed.',
              'Confirm every transaction payload in your wallet before signing.',
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-eon-blue/90" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
