import { motion } from 'framer-motion'
import { Ban, Scale, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AmlPolicyPage() {
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
                Compliance policy
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Legal
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              AML policy
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              This policy summarizes anti-money laundering and sanctions principles
              relevant to use of the EonSwap interface.
            </p>
          </div>
          <Link
            to="/terms"
            className="inline-flex h-10 w-fit shrink-0 items-center justify-center rounded-xl border border-white/[0.14] bg-white/[0.04] px-4 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/[0.2] hover:bg-white/[0.07] hover:text-white"
          >
            Terms of use
          </Link>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Shield,
              title: 'Compliance commitment',
              text: 'EonSwap discourages unlawful use and may apply technical/operational controls when abuse or sanctions risk is detected.',
            },
            {
              icon: Ban,
              title: 'Prohibited conduct',
              text: 'Use for money laundering, terrorist financing, fraud, or sanctions evasion is prohibited under this policy framework.',
            },
            {
              icon: Scale,
              title: 'Enforcement',
              text: 'Access may be limited where required for legal compliance, user safety, and infrastructure integrity.',
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
            User obligations
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-400">
            <li>Comply with all laws and obligations applicable in your jurisdiction.</li>
            <li>Do not attempt to bypass sanctions, geofencing, or abuse prevention controls.</li>
            <li>Understand that policy terms may change in line with regulatory requirements.</li>
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
