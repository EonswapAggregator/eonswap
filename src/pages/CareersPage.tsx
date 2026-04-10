import { motion } from 'framer-motion'
import { Briefcase, Rocket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { roleEmail } from '../lib/site'
import { uiButtonCompact, uiButtonPrimary } from '../lib/uiButtonClasses'

export function CareersPage() {
  const careersEmail = roleEmail('careers')

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
                Join the team
              </span>
            </div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
                Currently hiring
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Company
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Careers at EonSwap
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Build route-aware trading experiences used by real on-chain participants.
              We value ownership, clarity, and high execution speed.
            </p>
          </div>
          <a
            href={`mailto:${careersEmail}`}
            className={`${uiButtonPrimary} shrink-0`}
          >
            Apply via email
          </a>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Briefcase,
              title: 'Open roles',
              text: 'Current focus: Frontend Engineer (React), Full-stack Engineer (routing/integration), Product Designer, and DevRel/Growth.',
            },
            {
              icon: Users,
              title: 'How we work',
              text: 'Small teams, clear ownership, and async-first collaboration. We optimize for fast decisions and measurable shipping.',
            },
            {
              icon: Rocket,
              title: 'What to send',
              text: 'Include profile, portfolio, role preference, and relevant shipped work in web3 or high-scale frontend systems.',
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
          transition={{ duration: 0.4, delay: 0.09 }}
          className="mt-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
            Application flow
          </h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              'Send introduction + CV/portfolio',
              'Initial screening and fit check',
              'Role-focused technical/product interview',
              'Final decision and onboarding plan',
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
          <p className="mt-3 text-xs text-slate-500">
            Submit applications to <span className="font-medium text-slate-300">{careersEmail}</span>.
            Typical response time is 5-7 business days. For non-career inquiries, use Contact
            Support.
          </p>
          <Link
            to="/contact-support"
            className={`${uiButtonCompact} mt-3 h-9 text-xs font-semibold`}
          >
            Company contact
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
