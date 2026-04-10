import { AnimatePresence, motion } from 'framer-motion'
import { Droplets, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { uiButtonHeaderIcon } from '../lib/uiButtonClasses'
import { WalletConnectDropdown } from './WalletConnectDropdown'

const navTextClass =
  'rounded-full px-3 py-1.5 text-sm font-medium text-slate-400 transition duration-200 hover:bg-white/[0.05] hover:text-white'

const navItems = [
  { to: '/swap', label: 'Swap', end: true },
  { to: '/bridge', label: 'Bridge', end: false },
  { to: '/pool', label: 'Pool / Earn', end: false },
  { to: '/activity', label: 'Activity', end: false },
  { to: '/leaderboard', label: 'Leaderboard', end: false },
  { to: '/status', label: 'Status', end: false },
  { to: '/contact-support', label: 'Support', end: false },
] as const
const docsHref = '/docs/'

export function Header() {
  const { pathname, hash } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, hash])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  const mobileMenuPortal =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                key="mobile-nav-root"
                role="presentation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[160] bg-black/40 backdrop-blur-[2px] md:hidden"
                onClick={() => setMobileOpen(false)}
              >
                <motion.nav
                  id="mobile-nav"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Mobile main"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                  onClick={(e) => e.stopPropagation()}
                  className="mx-2 mt-[4.25rem] rounded-2xl border border-white/[0.12] bg-[#0c0e22]/98 p-2 shadow-2xl backdrop-blur-2xl md:hidden"
                >
                  <div className="mb-1 px-2 pb-2 pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Navigation
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 p-1.5">
                    {navItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                            isActive
                              ? 'border border-white/[0.14] bg-white/[0.1] text-white'
                              : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                    <a
                      href={docsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      Docs
                    </a>
                  </div>
                  <div className="mt-1 border-t border-white/[0.08] px-3 py-2">
                    <p className="text-[11px] text-slate-500">EonSwap interface menu</p>
                  </div>
                </motion.nav>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )
      : null

  return (
    <>
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] as const }}
      className="sticky top-0 z-50 border-b border-white/[0.09] bg-[#0a0b1e]/72 backdrop-blur-2xl backdrop-saturate-150 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent"
        aria-hidden
      />
      <div className="relative mx-auto flex h-[3.75rem] max-w-7xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <Link
          to="/"
          className="relative z-[60] flex shrink-0 items-center gap-2.5 text-left transition hover:opacity-90 md:z-10"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-eon-blue/25 to-cyan-500/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-eon-blue/25">
            <Droplets className="h-5 w-5 text-eon-blue" aria-hidden />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-base font-semibold tracking-tight text-white md:text-[1.05rem]">
              EonSwap
            </span>
            <span className="mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 sm:block">
              Execution desk
            </span>
          </div>
        </Link>

        <nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block"
          aria-label="Main"
        >
          <div className="flex items-center gap-0.5 rounded-full border border-white/[0.1] bg-white/[0.03] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${navTextClass} ${isActive ? 'bg-white/[0.08] text-white' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href={docsHref}
              target="_blank"
              rel="noopener noreferrer"
              className={navTextClass}
            >
              Docs
            </a>
          </div>
        </nav>

        <div className="relative z-[60] flex min-w-0 flex-shrink-0 items-center gap-1.5 sm:gap-3">
          <WalletConnectDropdown />
          <button
            type="button"
            className={`${uiButtonHeaderIcon} md:hidden`}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </motion.header>
    {mobileMenuPortal}
    </>
  )
}
