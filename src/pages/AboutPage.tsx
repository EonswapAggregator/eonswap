import { motion } from 'framer-motion'
import { Compass, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { uiButtonGhost, uiButtonSecondary } from '../lib/uiButtonClasses'

export function AboutPage() {
  const networks = [
    {
      id: 'ethereum',
      name: 'Ethereum',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    },
    {
      id: 'arbitrum',
      name: 'Arbitrum',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    },
    {
      id: 'base',
      name: 'Base',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    },
    {
      id: 'optimism',
      name: 'Optimism',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    },
    {
      id: 'polygon',
      name: 'Polygon',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    },
    {
      id: 'bnb',
      name: 'BNB Chain',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png',
    },
  ] as const

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
                Company profile
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Company
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              About EonSwap
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              EonSwap is built to make multi-chain swaps and bridge execution clearer, faster,
              and fully non-custodial for everyday on-chain users.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              to="/swap"
              className={uiButtonSecondary}
            >
              Open swap
            </Link>
            <a
              href="/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className={uiButtonGhost}
            >
              Read docs
            </a>
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Compass,
              title: 'Our mission',
              text: 'Simplify route-aware execution across supported chains while keeping users in full control of wallet custody.',
            },
            {
              icon: Sparkles,
              title: 'What we build',
              text: 'A practical execution interface for swap, bridge, activity, and status diagnostics with transparent route context.',
            },
            {
              icon: ShieldCheck,
              title: 'Principles',
              text: 'Security-first, non-custodial design, clear risk communication, and low-friction UX for confident execution.',
            },
          ].map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.03]">
                <item.icon className="h-4 w-4 text-eon-blue" aria-hidden />
              </div>
              <h2 className="mt-3 text-base font-semibold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.text}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
            Trust and transparency
          </h2>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {[
              'Non-custodial by default: you sign from your own wallet.',
              'Route context is shown before execution.',
              'No hidden interface fee added by default.',
            ].map((item) => (
              <p
                key={item}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-slate-400"
              >
                {item}
              </p>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
            Supported networks
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {networks.map((network) => (
              <span
                key={network.id}
                className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300"
              >
                <img
                  src={network.iconUrl}
                  alt={network.name}
                  className="mr-1.5 h-3.5 w-3.5 rounded-full object-contain"
                />
                {network.name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
