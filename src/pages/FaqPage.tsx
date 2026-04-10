import { motion } from 'framer-motion'
import { ChevronDown, HelpCircle, LifeBuoy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { uiButtonSecondary } from '../lib/uiButtonClasses'

const FAQ_CATEGORIES = [
  'Wallet & access',
  'Quotes & routing',
  'Execution & status',
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
    a: 'Swap routing uses Kyber aggregator APIs, and bridge routing uses LI.FI APIs. EonSwap displays route context before wallet confirmation.',
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
    a: 'For most ERC-20 swaps/bridges, yes. Native token routes typically do not require approval.',
  },
  {
    category: 'Execution & status',
    q: 'Can I track bridge progress after page reload?',
    a: 'Yes. Bridge pending state is persisted and status polling resumes when you reopen the page within the recovery window.',
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
                Quick answers
              </span>
            </div>
            <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              Resources
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Frequently asked questions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
              Essential guidance for wallet connection, quote behavior, transaction flow,
              and troubleshooting.
            </p>
          </div>
          <Link
            to="/contact-support"
            className={`${uiButtonSecondary} shrink-0`}
          >
            Contact support
          </Link>
        </motion.div>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="self-start rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
          >
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-300">
              Categories
            </h2>
            <div className="mt-2 space-y-2">
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
                  className={`flex h-10 min-h-10 max-h-10 w-full min-w-0 items-center justify-between overflow-hidden rounded-lg border px-3 py-0 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f1e] ${
                    activeCategory === item
                      ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
                      : 'border-white/[0.08] bg-white/[0.02] text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate whitespace-nowrap pr-2 leading-none">
                    {item}
                  </span>
                  <span className="w-4 shrink-0 text-right text-[10px] leading-none text-slate-500">
                    {FAQ_ITEMS.filter((x) => x.category === item).length}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
              <div className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.1] bg-white/[0.03]">
                <LifeBuoy className="h-3.5 w-3.5 text-eon-blue" aria-hidden />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Need deeper investigation? Use Status page and include tx hash when contacting support.
              </p>
            </div>
          </motion.aside>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.04 }}
            className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-eon-blue" aria-hidden />
              <p className="text-sm font-semibold text-white">FAQ entries</p>
            </div>
            <div className="mt-3">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search questions or answers..."
                className="w-full rounded-lg border border-white/[0.12] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-eon-blue/40"
              />
            </div>
            <div className="mt-3 space-y-2">
              {filteredItems.length === 0 ? (
                <p className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-slate-400">
                  No FAQ entries found for this category and search keyword.
                </p>
              ) : null}
              {filteredItems.map((item) => {
                const open = openQuestion === item.q
                return (
                  <div
                    key={item.q}
                    className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenQuestion((prev) => (prev === item.q ? null : item.q))
                      }
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                    >
                      <span className="text-sm font-medium text-slate-200">{item.q}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>
                    {open ? (
                      <div className="border-t border-white/[0.08] px-3 py-2.5">
                        <p className="text-sm leading-relaxed text-slate-400">{item.a}</p>
                        {item.links?.length ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {item.links.map((faqLink) => (
                              <Link
                                key={`${faqLink.to}-${faqLink.label}`}
                                to={faqLink.to}
                                className="text-slate-300 underline decoration-white/20 underline-offset-2 transition hover:text-white hover:decoration-white/40"
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
