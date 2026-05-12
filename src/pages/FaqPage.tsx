import { motion } from 'framer-motion'
import { ChevronDown, HelpCircle, LifeBuoy, Shield } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
  }),
}

const FAQ_CATEGORIES = [
  'Wallet & access',
  'Quotes & routing',
  'Execution & status',
  'Platform features',
  'Safety & support',
] as const

type FaqCategory = (typeof FAQ_CATEGORIES)[number]

type FaqLink = { readonly label: string; readonly to: string }

type FaqItem = {
  readonly category: FaqCategory
  readonly q: string
  readonly a: string
  readonly links?: readonly FaqLink[]
}

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    category: 'Wallet & access',
    q: 'Is EonSwap custodial?',
    a: 'No. EonSwap is non-custodial. You keep control of wallet keys and each transaction is signed from your wallet.',
  },
  {
    category: 'Wallet & access',
    q: 'Which wallets are supported?',
    a: 'Any wallet compatible with WalletConnect and injected EVM providers can connect. Support may vary by browser and wallet version.',
  },
  {
    category: 'Wallet & access',
    q: 'Why can’t I see my token balance?',
    a: 'Make sure wallet is connected on the selected source chain. Unsupported chain selection or temporary RPC issues can delay balance reads.',
  },
  {
    category: 'Wallet & access',
    q: 'How do I create a MetaMask wallet from scratch?',
    a: 'Install MetaMask from the official site/store, create a new wallet, back up your Secret Recovery Phrase offline, set a strong password, then connect MetaMask to EonSwap.',
  },
  {
    category: 'Quotes & routing',
    q: 'Why did my quote change before I signed?',
    a: 'Quotes update with market volatility, route liquidity changes, and gas conditions. Refresh and verify final details before signing.',
  },
  {
    category: 'Quotes & routing',
    q: 'Where does route data come from?',
    a: 'Swap routing uses EonSwap liquidity data. EonSwap displays route context before wallet confirmation.',
  },
  {
    category: 'Quotes & routing',
    q: 'Does EonSwap add extra hidden fees?',
    a: 'Interface-level fee settings are explicit in configuration. You still pay network gas and any route/provider-level costs shown in details.',
  },
  {
    category: 'Execution & status',
    q: 'Why is my transaction pending?',
    a: 'Pending usually means network congestion or gas competition. Use Status/Activity to monitor latest confirmation state.',
    links: [
      { label: 'Status', to: '/status' },
      { label: 'Activity', to: '/activity' },
    ],
  },
  {
    category: 'Execution & status',
    q: 'Do I need token approval first?',
    a: 'For most ERC-20 swaps, yes. Native token routes typically do not require approval.',
  },
  {
    category: 'Execution & status',
    q: 'Why does status show NOT_FOUND?',
    a: 'Usually this means the tx hash is not yet indexed on the selected chain or the wrong chain/mode is selected in tracker form.',
  },
  {
    category: 'Safety & support',
    q: 'Can support reverse a confirmed transaction?',
    a: 'No. Confirmed on-chain transactions are irreversible. Support can help investigate route/status behavior only.',
  },
  {
    category: 'Safety & support',
    q: 'How do I report an issue quickly?',
    a: 'Share chain, wallet type, token pair, amount, tx hash, and timestamp in Contact Support for faster triage.',
    links: [{ label: 'Contact support', to: '/contact-support' }],
  },
  {
    category: 'Safety & support',
    q: 'What should I include in a security report?',
    a: 'Include reproducible steps, affected chain, expected vs actual behavior, and potential impact. Send reports via the security contact channel.',
    links: [{ label: 'Contact support', to: '/contact-support' }],
  },
  {
    category: 'Safety & support',
    q: 'Can support help recover seed phrase or private key?',
    a: 'No. EonSwap never has access to your seed phrase/private keys and cannot recover or reset wallet credentials.',
  },
  {
    category: 'Safety & support',
    q: 'Where are the official EonSwap channels?',
    a: 'Official channels include X, Telegram, Medium, Discord, and GitHub. Always verify links from the website footer before interacting.',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Press kit', to: '/press-kit' },
    ],
  },
  {
    category: 'Safety & support',
    q: 'Where can I read legal and risk documents?',
    a: 'Legal pages are available directly on the website and include Terms, Privacy Policy, Risk Disclosure, Disclaimer, and AML Policy.',
    links: [
      { label: 'Terms', to: '/terms' },
      { label: 'Privacy', to: '/privacy' },
      { label: 'Risk disclosure', to: '/risk-disclosure' },
      { label: 'Disclaimer', to: '/disclaimer' },
      { label: 'AML policy', to: '/aml-policy' },
    ],
  },
  {
    category: 'Execution & status',
    q: 'Where should I check before swapping during outages?',
    a: 'Check system health first, then review route details and only sign when chain, amount, and destination are correct.',
    links: [
      { label: 'Status', to: '/status' },
      { label: 'Risk disclosure', to: '/risk-disclosure' },
    ],
  },
  // Platform features
  {
    category: 'Platform features',
    q: 'How do I provide liquidity?',
    a: 'Go to the Liquidity page, click "Create Pool" to start a new pair or select an existing pool and click "Add Liquidity". You\'ll receive LP tokens representing your share of the pool.',
    links: [{ label: 'Liquidity', to: '/liquidity' }],
  },
  {
    category: 'Platform features',
    q: 'What is the auto-price feature when creating a pool?',
    a: 'When creating a new pool with tokens that have public market prices (via CoinGecko), EonSwap automatically suggests the current market price ratio. You can toggle auto-link to manually set a custom price.',
    links: [{ label: 'Liquidity', to: '/liquidity' }],
  },
  {
    category: 'Platform features',
    q: 'What are LP tokens?',
    a: 'LP (Liquidity Provider) tokens represent your share of a liquidity pool. When you add liquidity, you receive LP tokens. These can be staked in farms to earn additional rewards.',
    links: [
      { label: 'Liquidity', to: '/liquidity' },
      { label: 'Farm', to: '/farm' },
    ],
  },
  {
    category: 'Platform features',
    q: 'How does farming work?',
    a: 'Farming allows you to stake your LP tokens to earn ESTF rewards. Visit the Farm page, select a pool, and stake your LP tokens. Rewards accumulate over time and can be harvested anytime.',
    links: [{ label: 'Farm', to: '/farm' }],
  },
  {
    category: 'Platform features',
    q: 'What staking options are available?',
    a: 'The Stake page will offer xESTF staking for passive rewards and veESTF for governance voting power. These features are coming soon. Currently, you can earn by providing liquidity and farming.',
    links: [
      { label: 'Stake', to: '/stake' },
      { label: 'Farm', to: '/farm' },
    ],
  },
  {
    category: 'Platform features',
    q: 'What does the Leaderboard show?',
    a: 'The Leaderboard displays top traders and liquidity providers ranked by volume, fees earned, or other metrics. It updates periodically and shows your ranking if connected.',
    links: [{ label: 'Leaderboard', to: '/leaderboard' }],
  },
  {
    category: 'Platform features',
    q: 'How does the Referral program work?',
    a: 'Connect your wallet on the Referral page to get your unique referral link. Share it with friends - when they trade, you earn a percentage of their trading fees as rewards.',
    links: [{ label: 'Referral', to: '/referral' }],
  },
  {
    category: 'Platform features',
    q: 'What does the Status page monitor?',
    a: 'The Status page shows real-time health of RPC endpoints, API services, and blockchain connectivity. Use it to check system status before making transactions or to troubleshoot issues.',
    links: [{ label: 'Status', to: '/status' }],
  },
  {
    category: 'Platform features',
    q: 'How do I track my swap history?',
    a: 'Visit the Activity page to see your recent swaps, their status, and transaction details. You can also use the Status page to look up specific transaction hashes.',
    links: [
      { label: 'Activity', to: '/activity' },
      { label: 'Status', to: '/status' },
    ],
  },
]

export function FaqPage() {
  const [activeCategory, setActiveCategory] =
    useState<(typeof FAQ_CATEGORIES)[number]>('Wallet & access')
  const [openQuestion, setOpenQuestion] = useState<string | null>(
    FAQ_ITEMS.find((item) => item.category === 'Wallet & access')?.q ?? null,
  )
  const [searchQuery, setSearchQuery] = useState('')
  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredItems = FAQ_ITEMS.filter(
    (item) =>
      item.category === activeCategory &&
      (normalizedQuery.length === 0 ||
        item.q.toLowerCase().includes(normalizedQuery) ||
        item.a.toLowerCase().includes(normalizedQuery)),
  )

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

      {/* Hero Section */}
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-10 md:px-6 md:pb-12 md:pt-14">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            show: { transition: { staggerChildren: 0.08 } },
          }}
          className="text-center"
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-uni-border bg-uni-surface px-4 py-2 text-xs font-medium uppercase tracking-widest text-neutral-400">
              <HelpCircle className="h-3.5 w-3.5 text-uni-pink" />
              FAQ
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
              <Shield className="h-3.5 w-3.5 text-uni-pink/80" aria-hidden />
              Quick answers
            </span>
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            className="text-balance text-[clamp(1.75rem,8vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-white"
          >
            <span className="block">Frequently asked</span>
            <span className="mt-1 block text-uni-pink">questions.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            Essential guidance for wallet connection, quote behavior, transaction flow,
            and troubleshooting.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              to="/contact-support"
              className="inline-flex items-center gap-2 rounded-xl border border-uni-border bg-uni-surface-2 px-5 py-2.5 text-sm font-medium text-white transition hover:border-uni-pink/30 hover:bg-uni-surface-3"
            >
              <LifeBuoy className="h-4 w-4 text-uni-pink" />
              Contact Support
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Main content */}
      <div className="relative mx-auto max-w-7xl px-4 pb-16 md:px-6">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="self-start rounded-2xl border border-uni-border bg-uni-surface p-4"
          >
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-300">
              Categories
            </h2>
            <div className="mt-3 space-y-2">
              {FAQ_CATEGORIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={activeCategory === item}
                  onClick={() => {
                    setActiveCategory(item)
                    setSearchQuery('')
                    setOpenQuestion(FAQ_ITEMS.find((x) => x.category === item)?.q ?? null)
                  }}
                  className={`flex h-10 min-h-10 max-h-10 w-full min-w-0 items-center justify-between overflow-hidden rounded-xl border px-3 py-0 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uni-pink/70 focus-visible:ring-offset-2 focus-visible:ring-offset-uni-bg ${
                    activeCategory === item
                      ? 'border-uni-pink/40 bg-uni-pink/15 text-uni-pink'
                      : 'border-uni-border bg-uni-surface-2 text-neutral-400 hover:text-neutral-300 hover:bg-uni-surface-3'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap pr-2 leading-none">
                    {item}
                  </span>
                  <span className="w-4 shrink-0 text-right text-[10px] leading-none text-neutral-500">
                    {FAQ_ITEMS.filter((x) => x.category === item).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-uni-border bg-uni-surface-2 p-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-uni-pink/30 bg-uni-pink/10">
                <LifeBuoy className="h-4 w-4 text-uni-pink" aria-hidden />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                Need deeper investigation? Use Status page and include tx hash when contacting support.
              </p>
              <Link
                to="/status"
                className="mt-2 inline-flex text-xs text-uni-pink hover:underline"
              >
                Go to Status →
              </Link>
            </div>
          </motion.aside>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04 }}
            className="rounded-2xl border border-uni-border bg-uni-surface p-4"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-uni-pink" aria-hidden />
              <p className="text-sm font-semibold text-white">FAQ entries</p>
            </div>
            <div className="mt-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search questions or answers..."
                className="w-full rounded-xl border border-uni-border bg-uni-surface-2 px-3 py-2.5 text-sm text-neutral-200 outline-none transition placeholder:text-neutral-500 focus:border-uni-pink/40"
              />
            </div>
            <div className="mt-3 space-y-2">
              {filteredItems.length === 0 ? (
                <p className="rounded-xl border border-uni-border bg-uni-surface-2 px-3 py-3 text-sm text-neutral-400">
                  No FAQ entries found for this category and search keyword.
                </p>
              ) : null}
              {filteredItems.map((item) => {
                const open = openQuestion === item.q
                return (
                  <div
                    key={item.q}
                    className="overflow-hidden rounded-xl border border-uni-border bg-uni-surface-2"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenQuestion((prev) => (prev === item.q ? null : item.q))
                      }
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-uni-surface-3"
                    >
                      <span className="text-sm font-medium text-neutral-200">{item.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-neutral-400 transition ${open ? 'rotate-180 text-uni-pink' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {open ? (
                      <div className="border-t border-uni-border px-4 py-3">
                        <p className="text-sm leading-relaxed text-neutral-400">{item.a}</p>
                        {item.links?.length ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            {item.links.map((faqLink) => (
                              <Link
                                key={`${faqLink.to}-${faqLink.label}`}
                                to={faqLink.to}
                                className="rounded-lg border border-uni-pink/30 bg-uni-pink/10 px-2.5 py-1 text-uni-pink transition hover:bg-uni-pink/20"
                              >
                                {faqLink.label}
                              </Link>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
