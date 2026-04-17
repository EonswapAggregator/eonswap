import { motion } from 'framer-motion'
import { ArrowRight, Clock3, HeadphonesIcon, LifeBuoy, Mail, MessageSquare, ShieldAlert } from 'lucide-react'
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

export function ContactSupportPage() {
  const supportEmail = roleEmail('support')
  const securityEmail = roleEmail('security')

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
              <HeadphonesIcon className="h-3.5 w-3.5" aria-hidden />
              Support
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium text-neutral-400">
              <Clock3 className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
              24-48h response
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl"
          >
            How can we <span className="text-uni-pink">help?</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-neutral-400 md:text-lg"
          >
            Need help with wallet connection, swap execution, or transaction tracking? 
            Share details and our team will investigate.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/faq"
              className="inline-flex items-center gap-2 rounded-2xl border border-uni-border bg-uni-surface px-6 py-3 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-2"
            >
              <MessageSquare className="h-4 w-4 text-uni-pink" aria-hidden />
              Browse FAQ
            </Link>
            <Link
              to="/status"
              className="inline-flex items-center gap-2 rounded-2xl border border-uni-border bg-uni-surface px-6 py-3 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-2"
            >
              System status
              <ArrowRight className="h-4 w-4 text-neutral-500" aria-hidden />
            </Link>
          </motion.div>
        </motion.div>

        {/* Contact Cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 transition duration-300 hover:border-uni-pink/30"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-uni-pink/[0.03] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
              aria-hidden
            />
            <div className="relative flex h-full flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-uni-pink/10 text-uni-pink ring-1 ring-uni-pink/20">
                <LifeBuoy className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-white">General support</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Wallet connection, quote mismatch, route behavior, pending transaction diagnostics.
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                Best for: swap/transaction execution and tracker issues.
              </p>
              <a
                href={`mailto:${supportEmail}`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2.5 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
              >
                <Mail className="h-4 w-4 text-uni-pink" aria-hidden />
                {supportEmail}
              </a>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 transition duration-300 hover:border-uni-pink/30"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-uni-pink/[0.03] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
              aria-hidden
            />
            <div className="relative flex h-full flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
                <ShieldAlert className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-white">Security reports</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Found a vulnerability? Send reproducible details and impact scope via the dedicated channel.
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                Best for: security bugs, exploit paths, and abuse reports.
              </p>
              <a
                href={`mailto:${securityEmail}`}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2.5 text-sm font-medium text-white transition hover:border-rose-500/30 hover:bg-uni-surface-3"
              >
                <Mail className="h-4 w-4 text-rose-400" aria-hidden />
                {securityEmail}
              </a>
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 transition duration-300 hover:border-uni-pink/30"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-uni-pink/[0.03] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
              aria-hidden
            />
            <div className="relative flex h-full flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                <Clock3 className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-white">Response scope</h2>
              <ul className="mt-3 space-y-2 text-left text-sm text-neutral-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-uni-pink" />
                  Typical first response: 24-48 hours (business days)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-uni-pink" />
                  Support clarifies interface and status behavior
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-uni-pink" />
                  Cannot reverse confirmed on-chain transactions
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-uni-pink" />
                  Critical issues prioritized in queue order
                </li>
              </ul>
            </div>
          </motion.article>
        </div>

        {/* Report Template */}
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
              <h3 className="text-lg font-semibold text-white">
                Include this in your report
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                Providing these details helps us investigate faster.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Wallet address', hint: 'shortened is okay' },
                  { label: 'Source / destination chain', hint: 'e.g. Base' },
                  { label: 'Token pair and amount', hint: 'e.g. ETH → USDC' },
                  { label: 'Transaction hash', hint: 'with timestamp' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3"
                  >
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{item.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
