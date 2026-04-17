import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ArrowRightLeft,
  ArrowUpDown,
  BarChart3,
  ChevronRight,
  Coins,
  Droplets,
  Globe2,
  Percent,
  Route,
  Shield,
  Sprout,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.06 * i,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const networks = [
  {
    name: 'Base',
    iconUrl:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  },
] as const

const networkFaviconFallback: Record<string, string> = {
  Base: 'base.org',
}

function NetworkLogo({
  name,
  iconUrl,
}: {
  name: (typeof networks)[number]['name']
  iconUrl: string
}) {
  const [activeSrc, setActiveSrc] = useState(iconUrl)
  const domain = networkFaviconFallback[name]

  return (
    <img
      src={activeSrc}
      alt=""
      className="h-4 w-4 shrink-0 rounded-full object-contain"
      referrerPolicy="no-referrer"
      loading="lazy"
      width={16}
      height={16}
      onError={() => {
        if (domain && activeSrc === iconUrl) {
          setActiveSrc(`https://www.google.com/s2/favicons?sz=64&domain=${domain}`)
        }
      }}
    />
  )
}

function PartnerLogo({ src, name, href }: { src: string; name: string; href: string }) {
  const [activeSrc, setActiveSrc] = useState(src)
  const domain = (() => {
    try {
      return new URL(href).hostname
    } catch {
      return ''
    }
  })()

  return (
    <img
      src={activeSrc}
      alt={name}
      className="h-7 w-7 object-contain opacity-90 transition group-hover:scale-105 group-hover:opacity-100"
      referrerPolicy="no-referrer"
      loading="lazy"
      width={28}
      height={28}
      onError={() => {
        if (domain && activeSrc === src) {
          setActiveSrc(`https://www.google.com/s2/favicons?sz=64&domain=${domain}`)
        }
      }}
    />
  )
}

const products = [
  {
    icon: ArrowUpDown,
    title: 'Swap',
    description: 'Trade tokens instantly with optimal routing through liquidity pools.',
    href: '/swap',
    color: 'uni-pink',
  },
  {
    icon: Droplets,
    title: 'Liquidity',
    description: 'Provide liquidity and earn trading fees from every swap.',
    href: '/liquidity',
    color: 'uni-purple',
  },
  {
    icon: Sprout,
    title: 'Farm',
    description: 'Stake LP tokens to earn additional ESTF rewards.',
    href: '/farm',
    color: 'emerald',
  },
  {
    icon: Coins,
    title: 'Stake',
    description: 'Lock tokens for governance power and passive rewards.',
    href: '/stake',
    color: 'amber',
  },
] as const

const stats = [
  { label: 'Trading pairs', value: '50+', icon: ArrowRightLeft },
  { label: 'Supported chain', value: 'Base', icon: Globe2 },
  { label: 'Non-custodial', value: '100%', icon: Shield },
  { label: 'Swap fee', value: '0.3%', icon: Percent },
] as const

const workflow = [
  {
    icon: Wallet,
    step: '01',
    title: 'Connect wallet',
    body: 'Link your browser wallet. Your private keys never leave your device.',
  },
  {
    icon: Route,
    step: '02',
    title: 'Choose tokens',
    body: 'Select which tokens to swap and enter the amount. Get instant quotes.',
  },
  {
    icon: Zap,
    step: '03',
    title: 'Execute swap',
    body: 'Review the quote, confirm in your wallet, and receive tokens instantly.',
  },
] as const

const features = [
  {
    icon: Shield,
    title: 'Non-custodial',
    body: 'You keep full control of your assets. We never hold your tokens or private keys.',
  },
  {
    icon: TrendingUp,
    title: 'Best prices',
    body: 'Smart routing finds optimal paths through our liquidity pools for every trade.',
  },
  {
    icon: BarChart3,
    title: 'Transparent fees',
    body: 'Clear 0.3% pool fee on swaps. No hidden charges. Gas costs shown upfront.',
  },
] as const

const partners = [
  {
    name: 'WalletConnect',
    logoUrl: 'https://cdn.simpleicons.org/walletconnect/3B99FC',
    href: 'https://walletconnect.com/',
  },
  {
    name: 'CoinGecko',
    logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain=coingecko.com',
    href: 'https://www.coingecko.com/',
  },
  {
    name: 'DappRadar',
    logoUrl: 'https://www.google.com/s2/favicons?sz=64&domain=dappradar.com',
    href: 'https://dappradar.com/',
  },
] as const

export function Landing() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div id="top" className="relative min-w-0 max-w-full overflow-hidden">
      {/* Global gradient backdrop */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,0,122,0.18),transparent)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-uni-bg" />
        <div
          className="absolute -left-32 top-[-10%] h-[min(600px,65vw)] w-[min(600px,65vw)] rounded-full bg-uni-pink/12 blur-[140px]"
          style={{
            animation: prefersReducedMotion ? 'none' : 'eon-gradient-drift 22s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -right-24 top-[15%] h-[min(500px,55vw)] w-[min(500px,55vw)] rounded-full bg-uni-purple/10 blur-[120px]"
          style={{
            animation: prefersReducedMotion ? 'none' : 'eon-gradient-drift 28s ease-in-out infinite reverse',
          }}
        />
      </div>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-4 pb-12 pt-12 md:px-6 md:pb-16 md:pt-16 lg:pt-20">
        <motion.div
          initial="hidden"
          animate="show"
          variants={staggerContainer}
          className="text-center"
        >
          {/* Badge */}
          <motion.div custom={0} variants={fadeUp} className="mb-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-pink/30 bg-uni-pink/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-uni-pink">
              <Zap className="h-3.5 w-3.5" aria-hidden />
              Live on Base
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium text-neutral-400">
              <Shield className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
              Non-custodial
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={1}
            variants={fadeUp}
            className="mx-auto max-w-4xl text-balance text-[clamp(2.25rem,8vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-white"
          >
            Trade crypto with
            <span className="relative mx-2 inline-block text-uni-pink">
              confidence
              <svg
                className="absolute -bottom-1 left-0 w-full"
                viewBox="0 0 200 8"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2 6c40-4 80-4 120-2s56 2 76 0"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-uni-pink/60"
                />
              </svg>
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-neutral-400 md:text-xl"
          >
            Swap, provide liquidity, and earn rewards on Base network. 
            Your keys, your crypto, your control.
          </motion.p>

          {/* Network badge */}
          <motion.div custom={3} variants={fadeUp} className="mt-6 flex items-center justify-center gap-2">
            <span className="text-sm text-neutral-500">Powered by</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-3 py-1.5">
              {networks.map((network) => (
                <Fragment key={network.name}>
                  <NetworkLogo name={network.name} iconUrl={network.iconUrl} />
                  <span className="text-sm font-medium text-white">{network.name}</span>
                </Fragment>
              ))}
            </span>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            custom={4}
            variants={fadeUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              to="/swap"
              className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-uni-pink px-10 py-4 text-base font-semibold text-white shadow-glow transition duration-300 hover:bg-uni-pink-light hover:shadow-[0_0_40px_rgba(255,0,122,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uni-pink/70 focus-visible:ring-offset-2 focus-visible:ring-offset-uni-bg"
            >
              <span className="relative flex items-center gap-2">
                Start trading
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
            </Link>
            <Link
              to="/liquidity"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-uni-border bg-uni-surface px-8 py-4 text-base font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-2"
            >
              <Droplets className="h-4 w-4 text-uni-pink" aria-hidden />
              Add liquidity
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="relative">
            <div
              className="absolute -inset-px rounded-2xl bg-gradient-to-r from-uni-pink/20 via-uni-purple/10 to-uni-pink/20 opacity-60 blur-sm"
              aria-hidden
            />
            <div className="relative grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-uni-border bg-uni-border md:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center justify-center bg-uni-surface px-4 py-6 text-center"
                >
                  <stat.icon className="mb-2 h-5 w-5 text-uni-pink" aria-hidden />
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Products Section */}
      <section className="relative border-t border-uni-border py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              Ecosystem
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Everything you need to <span className="text-uni-pink">DeFi</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-neutral-500">
              A complete suite of decentralized finance tools built for the Base ecosystem.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, i) => (
              <motion.div
                key={product.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
              >
                <Link
                  to={product.href}
                  className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-6 transition duration-300 hover:border-uni-pink/30 hover:shadow-[0_0_40px_rgba(255,0,122,0.08)]"
                >
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-uni-pink/[0.03] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="relative">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-uni-pink/10 text-uni-pink ring-1 ring-uni-pink/20 transition group-hover:bg-uni-pink/15 group-hover:ring-uni-pink/30">
                      <product.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{product.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                      {product.description}
                    </p>
                    <div className="mt-4 flex items-center gap-1 text-sm font-medium text-uni-pink transition group-hover:gap-2">
                      Explore
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section
        id="how-it-works"
        className="relative scroll-mt-24 border-t border-uni-border bg-uni-bg py-20 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end"
          >
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
                Simple process
              </span>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-white md:text-4xl">
                Start in <span className="text-uni-pink">3 steps</span>
              </h2>
            </div>
            <p className="max-w-md text-neutral-500 md:text-right">
              No account needed. Connect your wallet and start trading in seconds.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection line */}
            <div
              className="absolute left-1/2 top-16 hidden h-px w-[calc(100%-8rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-uni-pink/30 to-transparent md:block"
              aria-hidden
            />
            
            <div className="grid gap-6 md:grid-cols-3">
              {workflow.map((w, i) => (
                <motion.div
                  key={w.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.1, duration: 0.45 }}
                  className="group relative"
                >
                  <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-7 transition duration-300 hover:border-uni-pink/30">
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-b from-uni-pink/[0.04] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
                      aria-hidden
                    />
                    <div className="relative">
                      <div className="mb-5 flex items-center justify-between">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-uni-pink/10 font-mono text-lg font-bold text-uni-pink ring-1 ring-uni-pink/20">
                          {i + 1}
                        </span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-uni-border bg-uni-surface-2 text-neutral-400 transition group-hover:border-uni-pink/30 group-hover:text-uni-pink">
                          <w.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-white">{w.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-neutral-500">{w.body}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section id="features" className="relative border-t border-uni-border py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              Why EonSwap
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Built for <span className="text-uni-pink">trust</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-neutral-500">
              Trade with confidence knowing your assets remain in your control at all times.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.article
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="group relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-7 transition duration-300 hover:border-uni-pink/30"
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-b from-uni-pink/[0.04] via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100"
                  aria-hidden
                />
                <div className="relative">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-uni-pink/10 text-uni-pink ring-1 ring-uni-pink/20">
                    <f.icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-neutral-500">{f.body}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Partners */}
      <section className="relative border-t border-uni-border bg-uni-bg py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div
              className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/[0.05] via-uni-pink/10 to-transparent opacity-40 blur-sm"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface px-6 py-10 sm:px-10">
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
                  Integrated with
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
                  Industry-leading partners for wallets, data, and discovery.
                </p>
              </div>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-4">
                {partners.map((partner) => (
                  <li key={partner.name}>
                    <a
                      href={partner.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-uni-border bg-uni-surface-2 transition duration-200 hover:border-uni-pink/30 hover:bg-uni-surface-3 sm:h-[4.5rem] sm:w-[4.5rem]"
                      aria-label={partner.name}
                      title={partner.name}
                    >
                      <PartnerLogo src={partner.logoUrl} name={partner.name} href={partner.href} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative border-t border-uni-border py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div
              className="absolute -inset-px rounded-[1.5rem] bg-gradient-to-r from-uni-pink/30 via-uni-purple/20 to-uni-pink/30 opacity-60 blur-sm"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-3xl border border-uni-border bg-uni-surface p-10 md:p-14">
              <div
                className="pointer-events-none absolute -right-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-uni-pink/10 blur-[100px]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -left-24 top-1/2 h-60 w-60 -translate-y-1/2 rounded-full bg-uni-purple/10 blur-[80px]"
                aria-hidden
              />
              <div className="relative text-center">
                <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Ready to start trading?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-neutral-400">
                  Connect your wallet and experience decentralized trading on Base. 
                  No registration, no middlemen, just crypto.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    to="/swap"
                    className="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl bg-uni-pink px-10 py-4 text-base font-semibold text-white shadow-glow transition duration-300 hover:bg-uni-pink-light hover:shadow-[0_0_40px_rgba(255,0,122,0.4)]"
                  >
                    <span className="relative flex items-center gap-2">
                      Launch app
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                  <Link
                    to="/faq"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-uni-border bg-transparent px-8 py-4 text-base font-medium text-neutral-300 transition hover:bg-uni-surface-2"
                  >
                    Learn more
                    <ChevronRight className="h-4 w-4 text-neutral-500" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
