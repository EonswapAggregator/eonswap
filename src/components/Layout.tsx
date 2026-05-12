import { motion } from 'framer-motion'
import { FaDiscord, FaGithub, FaMedium, FaTelegram, FaXTwitter } from 'react-icons/fa6'
import { Link, Outlet } from 'react-router-dom'
import {
  ArrowUp,
  Briefcase,
  Droplets,
  FileText,
  HelpCircle,
  Info,
  Newspaper,
  Route,
  Send,
  ShieldCheck,
  Trophy,
  Sprout,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useActivityReceiptSync } from '../hooks/useActivityReceiptSync'
import { ChainTokenSync } from './ChainTokenSync'
import { FooterMonitorStatus } from './FooterMonitorStatus'
import { GdprConsentBanner } from './GdprConsentBanner'
import { Header } from './Header'

const footerHeading =
  'text-xs font-semibold uppercase tracking-widest text-neutral-500'
const footerItemClass =
  'group inline-flex items-center gap-2 text-sm text-neutral-400 transition duration-200 hover:text-uni-pink'

const supportedNetworks = [
  {
    id: 'base',
    name: 'Base',
    iconUrl:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  },
] as const

export function Layout() {
  useActivityReceiptSync()
  const [showJumpTop, setShowJumpTop] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setShowJumpTop(window.scrollY > 320)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const openCookieSettings = () => {
    window.dispatchEvent(new Event('eonswap:open-cookie-consent'))
  }

  return (
    <motion.div
      className="min-h-screen min-w-0 overflow-x-hidden bg-uni-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Header />
      <ChainTokenSync />
      <main className="min-w-0 [overflow-wrap:anywhere]">
        <Outlet />
      </main>
      <footer className="relative border-t border-uni-border/50 bg-gradient-to-b from-uni-bg via-uni-bg to-uni-surface/20">
        {/* Subtle top glow accent */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-uni-pink/20 to-transparent" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-16">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2.5 text-left text-white transition hover:opacity-90"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-uni-pink/20 ring-1 ring-uni-pink/30 shadow-[0_0_12px_rgba(255,0,199,0.15)]">
                  <Droplets className="h-5 w-5 text-uni-pink" aria-hidden />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-lg font-semibold tracking-tight text-white">
                    EonSwap
                  </span>
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-neutral-500">
                    Execution desk
                  </span>
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-500">
                EonSwap is a non-custodial swap interface on Base that helps
                you find efficient routes and execute trades directly from your
                wallet.
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Supported networks
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {supportedNetworks.map((network) => (
                  <span
                    key={network.id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-uni-border bg-uni-surface transition hover:border-uni-pink/40 hover:bg-uni-pink/10"
                    title={network.name}
                  >
                    <img
                      src={network.iconUrl}
                      alt={network.name}
                      className="h-5 w-5 rounded-full object-contain"
                    />
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-7 sm:grid-cols-3 lg:col-span-8 lg:gap-7">
              <div>
                <h3 className={footerHeading}>Quick Links</h3>
                <ul className="mt-2.5 space-y-1.5">
                  <li>
                    <Link to="/swap" className={footerItemClass}>
                      <Route className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Swap
                    </Link>
                  </li>
                  <li>
                    <Link to="/liquidity" className={footerItemClass}>
                      <Droplets className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Liquidity
                    </Link>
                  </li>
                  <li>
                    <Link to="/farm" className={footerItemClass}>
                      <Sprout className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Farm
                    </Link>
                  </li>
                  <li>
                    <Link to="/activity" className={footerItemClass}>
                      <FileText className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Activity
                    </Link>
                  </li>
                  <li>
                    <Link to="/leaderboard" className={footerItemClass}>
                      <Trophy className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Leaderboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/status" className={footerItemClass}>
                      <ShieldCheck className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Status
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className={footerHeading}>Resources</h3>
                <ul className="mt-2.5 space-y-1.5">
                  <li>
                    <a
                      href="/docs/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={footerItemClass}
                    >
                      <FileText className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Docs
                    </a>
                  </li>
                  <li>
                    <Link to="/faq" className={footerItemClass}>
                      <HelpCircle className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact-support" className={footerItemClass}>
                      <Send className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Contact Support
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className={footerHeading}>Company</h3>
                <ul className="mt-2.5 space-y-1.5">
                  <li>
                    <Link to="/about" className={footerItemClass}>
                      <Info className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      About
                    </Link>
                  </li>
                  <li>
                    <Link to="/careers" className={footerItemClass}>
                      <Briefcase className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link to="/press-kit" className={footerItemClass}>
                      <Newspaper className="h-3.5 w-3.5 text-neutral-500 transition group-hover:text-uni-pink" aria-hidden />
                      Press Kit
                    </Link>
                  </li>
                </ul>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                    Follow
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href="https://x.com/eonswapus"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="EonSwap on X"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-uni-border bg-uni-surface text-neutral-400 transition hover:border-uni-pink/40 hover:bg-uni-pink/10 hover:text-uni-pink"
                    >
                      <FaXTwitter className="h-4 w-4" aria-hidden />
                    </a>
                    <a
                      href="https://t.me/eonswap"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="EonSwap on Telegram"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-uni-border bg-uni-surface text-neutral-400 transition hover:border-uni-pink/40 hover:bg-uni-pink/10 hover:text-uni-pink"
                    >
                      <FaTelegram className="h-4 w-4" aria-hidden />
                    </a>
                    <a
                      href="https://medium.com/@eonswap"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="EonSwap on Medium"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-uni-border bg-uni-surface text-neutral-400 transition hover:border-uni-pink/40 hover:bg-uni-pink/10 hover:text-uni-pink"
                    >
                      <FaMedium className="h-4 w-4" aria-hidden />
                    </a>
                    <a
                      href="https://discord.gg/AAEq22Sqng"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="EonSwap on Discord"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-uni-border bg-uni-surface text-neutral-400 transition hover:border-uni-pink/40 hover:bg-uni-pink/10 hover:text-uni-pink"
                    >
                      <FaDiscord className="h-4 w-4" aria-hidden />
                    </a>
                    <a
                      href="https://github.com/EonswapAggregator/eonswap"
                      target="_blank"
                      rel="noreferrer"
                      aria-label="EonSwap on GitHub"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-uni-border bg-uni-surface text-neutral-400 transition hover:border-uni-pink/40 hover:bg-uni-pink/10 hover:text-uni-pink"
                    >
                      <FaGithub className="h-4 w-4" aria-hidden />
                    </a>
                  </div>
                  <FooterMonitorStatus />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-11 flex flex-col gap-4 border-t border-uni-border pt-7 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-neutral-500">
              © {new Date().getFullYear()} EonSwap. All rights reserved.
            </p>
            <nav
              className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
              aria-label="Legalitas"
            >
              <Link to="/terms" className="text-neutral-500 transition hover:text-uni-pink">
                Terms of Use
              </Link>
              <span className="text-neutral-700" aria-hidden>·</span>
              <Link to="/privacy" className="text-neutral-500 transition hover:text-uni-pink">
                Privacy Policy
              </Link>
              <span className="text-neutral-700" aria-hidden>·</span>
              <Link
                to="/risk-disclosure"
                className="text-neutral-500 transition hover:text-uni-pink"
              >
                Risk Disclosure
              </Link>
              <span className="text-neutral-700" aria-hidden>·</span>
              <Link
                to="/disclaimer"
                className="text-neutral-500 transition hover:text-uni-pink"
              >
                Disclaimer
              </Link>
              <span className="text-neutral-700" aria-hidden>·</span>
              <Link
                to="/aml-policy"
                className="text-neutral-500 transition hover:text-uni-pink"
              >
                AML Policy
              </Link>
              <span className="text-neutral-700" aria-hidden>·</span>
              <button
                type="button"
                onClick={openCookieSettings}
                className="text-neutral-500 transition hover:text-uni-pink"
              >
                Manage Cookies
              </button>
            </nav>
          </div>
        </div>
      </footer>
      <button
        type="button"
        aria-label="Jump to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className={`fixed bottom-5 right-5 z-[120] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-uni-border bg-uni-surface text-neutral-200 shadow-uni-card backdrop-blur-xl transition duration-200 hover:border-uni-pink/45 hover:text-white ${showJumpTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
      >
        <ArrowUp className="h-4.5 w-4.5" aria-hidden />
      </button>
      <GdprConsentBanner />
    </motion.div>
  )
}
