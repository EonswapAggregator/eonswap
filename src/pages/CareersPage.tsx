import { motion } from 'framer-motion'
import { Briefcase, Mail, Rocket, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { roleEmail } from '../lib/site'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
}

export function CareersPage() {
  const careersEmail = roleEmail('careers')

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
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
              Join the team
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              Hiring
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl"
          >
            Careers at <span className="text-uni-pink">EonSwap</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-neutral-400 md:text-lg"
          >
            Build route-aware trading experiences used by real on-chain participants.
            We value ownership, clarity, and high execution speed.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`mailto:${careersEmail}`}
              className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-5 py-2.5 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
            >
              <Mail className="h-4 w-4 text-uni-pink" aria-hidden />
              Apply via email
            </a>
          </motion.div>
        </motion.div>

        {/* Info Cards */}
        <div className="grid gap-5 lg:grid-cols-3">
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

        {/* Application Flow Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 md:p-8">
            <div
              className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-uni-pink/[0.06] blur-3xl"
              aria-hidden
            />
            <div className="relative">
              <h3 className="text-lg font-semibold text-white">Application flow</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  'Send introduction + CV/portfolio',
                  'Initial screening and fit check',
                  'Role-focused technical/product interview',
                  'Final decision and onboarding plan',
                ].map((step, idx) => (
                  <div
                    key={step}
                    className="flex items-start gap-3 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-uni-pink/10 text-xs font-bold text-uni-pink">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-neutral-400">{step}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-neutral-500">
                Submit applications to <span className="font-medium text-white">{careersEmail}</span>.
                Typical response time is 5-7 business days.
              </p>
              <div className="mt-4">
                <Link
                  to="/contact-support"
                  className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
                >
                  Company contact
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
