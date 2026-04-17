import { motion } from 'framer-motion'
import { ArrowRight, Compass, Globe2, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
}

export function AboutPage() {
  const networks = [
    {
      id: 'base',
      name: 'Base',
      iconUrl:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    },
  ] as const

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
              <Compass className="h-3.5 w-3.5" aria-hidden />
              Company
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl"
          >
            About <span className="text-uni-pink">EonSwap</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-4 max-w-2xl text-neutral-400 md:text-lg"
          >
            Built to make swaps and transaction execution clearer, faster, 
            and fully non-custodial for everyday on-chain users.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/swap"
              className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-5 py-2.5 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
            >
              Open swap
              <ArrowRight className="h-4 w-4 text-uni-pink" aria-hidden />
            </Link>
          </motion.div>
        </motion.div>

        {/* Mission Cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          {[
            {
              icon: Compass,
              title: 'Our mission',
              text: 'Simplify route-aware execution across supported chains while keeping users in full control of wallet custody.',
            },
            {
              icon: Sparkles,
              title: 'What we build',
              text: 'A practical execution interface for swap, activity, and status diagnostics with transparent route context.',
            },
            {
              icon: ShieldCheck,
              title: 'Principles',
              text: 'Security-first, non-custodial design, clear risk communication, and low-friction UX for confident execution.',
            },
          ].map((item, i) => (
            <motion.article
              key={item.title}
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
                  <item.icon className="h-6 w-6" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.text}</p>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Trust Section */}
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
              <h3 className="text-lg font-semibold text-white">Trust and transparency</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  'Non-custodial by default: you sign from your own wallet.',
                  'Route context is shown before execution.',
                  'No hidden interface fee added by default.',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3 text-sm text-neutral-400"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Networks Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 md:p-8">
            <div className="relative">
              <h3 className="text-lg font-semibold text-white">
                <Globe2 className="mr-2 inline-block h-5 w-5 text-uni-pink" aria-hidden />
                Supported networks
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {networks.map((network) => (
                  <span
                    key={network.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-2 text-sm font-medium text-white"
                  >
                    <img
                      src={network.iconUrl}
                      alt={network.name}
                      className="h-5 w-5 rounded-full object-contain"
                    />
                    {network.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
