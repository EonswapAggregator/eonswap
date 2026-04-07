import { motion } from 'framer-motion'
import { BookOpen, Link2, LifeBuoy, RadioTower } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DocsPage() {
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
                Product docs
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Resources
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              EonSwap documentation
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Operational reference for swap, bridge, status tracking, and support workflows.
              All routes remain non-custodial and wallet-signed.
            </p>
          </div>
          <Link
            to="/status"
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            Open diagnostics
          </Link>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: 'Core flow',
              lines: [
                'Connect wallet -> choose pair -> get quote -> sign transaction.',
                'Swap uses Kyber route/build endpoints; Bridge uses LI.FI quote/status.',
              ],
            },
            {
              icon: RadioTower,
              title: 'Realtime checks',
              lines: [
                'Status page supports auto refresh and block-based updates for pending swap tx.',
                'API health panel tracks Kyber, LI.FI, CoinGecko, and Etherscan reachability.',
              ],
            },
            {
              icon: LifeBuoy,
              title: 'Support path',
              lines: [
                'Use Contact Support for wallet, quote, and tracking issues.',
                'Include chain, token pair, amount, tx hash, and timestamp for faster triage.',
              ],
            },
          ].map((card, i) => (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]">
                <card.icon className="h-4 w-4 text-eon-blue" aria-hidden />
              </div>
              <h2 className="mt-3 text-base font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{card.lines[0]}</p>
              <p className="mt-1 text-sm text-slate-400">{card.lines[1]}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
            MetaMask setup (from zero)
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {[
              'Install MetaMask from official source (extension/app store).',
              'Create a new wallet and set a strong local password.',
              'Back up Secret Recovery Phrase offline, never share it.',
              'Open MetaMask and switch/add supported EVM network.',
              'Go to Swap/Bridge in EonSwap and connect wallet.',
            ].map((step, idx) => (
              <div
                key={step}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-400"
              >
                <span className="mr-1 font-semibold text-slate-300">{idx + 1}.</span>
                {step}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-amber-200/90">
            Security note: EonSwap support will never ask for your seed phrase or private keys.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
            API endpoints in use
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              'Kyber: /api/v1/routes and /api/v1/route/build',
              'LI.FI: /v1/quote and /v1/status',
              'CoinGecko: /api/v3/coins/{id}/market_chart',
              'Etherscan V2: /v2/api (wallet tx history)',
            ].map((text) => (
              <div
                key={text}
                className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-400"
              >
                <Link2 className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                <span>{text}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Note: frontend health checks are browser-mode diagnostics. For stronger production
            reliability, add server-side relay and monitoring.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
