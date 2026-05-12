import { motion } from 'framer-motion'
import { CheckCircle2, Database, EyeOff, Network, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
}

export function PrivacyPage() {
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
              <Shield className="h-3.5 w-3.5" aria-hidden />
              Privacy & data
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl"
          >
            Privacy <span className="text-uni-pink">policy</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-neutral-400 md:text-lg"
          >
            This policy explains what information may be processed when using EonSwap
            and how it is used for product operation and reliability.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/terms"
              className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-5 py-2.5 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
            >
              Terms of use
            </Link>
          </motion.div>
        </motion.div>

        {/* Info Cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              icon: Database,
              title: 'Data processed',
              text: 'Wallet addresses, selected chain IDs, token selections, and transaction metadata required for routing and status features.',
            },
            {
              icon: EyeOff,
              title: 'How data is used',
              text: 'To provide quoting/execution flows, diagnose errors, improve uptime, and reduce abuse against public infrastructure.',
            },
            {
              icon: Network,
              title: 'Third-party services',
              text: 'RPC, routing, explorer, and market-data providers may process requests under their own privacy terms.',
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

        {/* Privacy Notes Section */}
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
              <h3 className="text-lg font-semibold text-white">Privacy notes</h3>
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  'EonSwap is non-custodial and does not store private keys or seed phrases.',
                  'On-chain data is public by nature and can be indexed by third-party explorers.',
                  'Use this interface only if you accept third-party provider processing requirements.',
                  'Operational logs are retained only as needed for service reliability and abuse prevention.',
                  'You may request privacy-related support, including access or correction requests.',
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-uni-pink" aria-hidden />
                    <span className="text-sm text-neutral-400">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Cookies Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 md:p-8">
            <div className="relative">
              <h3 className="text-lg font-semibold text-white">Cookies and controls</h3>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                EonSwap may use essential and optional analytics cookies for reliability and product
                improvement. You can update your consent preferences at any time from the footer.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
