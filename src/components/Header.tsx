import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Droplets, Menu, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { uiButtonHeaderIcon } from '../lib/uiButtonClasses'
import { EstfPriceChip, HeaderWalletAside } from './HeaderWalletAside'
import { WalletConnectDropdown } from './WalletConnectDropdown'

const navTextClass =
  'rounded-full px-3 py-1.5 text-sm font-medium text-neutral-400 transition duration-200 hover:bg-uni-pink/10 hover:text-uni-pink'

type NavLeaf = { readonly to: string; readonly label: string; readonly end?: boolean }

type NavGroup = {
  readonly id: 'trade' | 'earn' | 'more'
  readonly label: string
  readonly items: readonly NavLeaf[]
}

const NAV_GROUPS: readonly NavGroup[] = [
  {
    id: 'trade',
    label: 'Trade',
    items: [
      { to: '/swap', label: 'Swap', end: true },
    ],
  },
  {
    id: 'earn',
    label: 'Earn',
    items: [
      { to: '/liquidity', label: 'Liquidity' },
      { to: '/farm', label: 'Farm' },
      { to: '/stake', label: 'Stake' },
    ],
  },
  {
    id: 'more',
    label: 'Explore',
    items: [
      { to: '/activity', label: 'Activity' },
      { to: '/leaderboard', label: 'Leaderboard' },
      { to: '/referral', label: 'Referral' },
      { to: '/faq', label: 'FAQ' },
      { to: '/status', label: 'Status' },
    ],
  },
] as const

const docsHref = '/docs/'

function pathMatchesLeaf(pathname: string, item: NavLeaf): boolean {
  const key = pathname.replace(/\/+$/, '') || '/'
  if (item.end) return key === item.to
  return key === item.to || key.startsWith(`${item.to}/`)
}

function groupIsActive(pathname: string, items: readonly NavLeaf[]): boolean {
  return items.some((item) => pathMatchesLeaf(pathname, item))
}

const dropdownLinkClass =
  'block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-neutral-300 transition hover:bg-uni-pink/10 hover:text-uni-pink'

export function Header() {
  const { pathname, hash } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<NavGroup['id'] | null>(null)
  const desktopNavRef = useRef<HTMLDivElement>(null)
  const baseId = useId()

  useEffect(() => {
    setMobileOpen(false)
    setOpenMenu(null)
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

  useEffect(() => {
    if (!openMenu) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openMenu])

  useEffect(() => {
    if (!openMenu) return
    const onDoc = (e: MouseEvent) => {
      const el = desktopNavRef.current
      if (!el || !(e.target instanceof Node) || el.contains(e.target)) return
      setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [openMenu])

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
                  className="mx-2 mt-[4.25rem] max-h-[min(32rem,calc(100vh-5.5rem))] overflow-y-auto rounded-2xl border border-uni-border/70 bg-uni-surface/98 p-2 shadow-2xl shadow-uni-pink/5 backdrop-blur-xl md:hidden"
                >
                  <div className="mb-1 px-2 pb-2 pt-1">
                    <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                      Navigation
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 p-1.5">
                    {NAV_GROUPS.map((group) => (
                      <div key={group.id}>
                        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                          {group.label}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {group.items.map((item) => (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              end={item.end ?? false}
                              onClick={() => setMobileOpen(false)}
                              className={({ isActive }) =>
                                `rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                                  isActive
                                    ? 'bg-uni-pink/10 text-uni-pink'
                                    : 'text-neutral-300 hover:bg-uni-pink/10 hover:text-uni-pink'
                                }`
                              }
                            >
                              {item.label}
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div>
                      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                        ESTF
                      </p>
                      <div className="px-3">
                        <EstfPriceChip className="w-full justify-between" />
                      </div>
                    </div>
                    <div>
                      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                        Resources
                      </p>
                      <div className="flex flex-col gap-0.5">
                        <NavLink
                          to="/airdrop"
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            `rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                              isActive
                                ? 'bg-uni-pink/10 text-uni-pink'
                                : 'text-neutral-300 hover:bg-uni-pink/10 hover:text-uni-pink'
                            }`
                          }
                        >
                          Airdrop
                        </NavLink>
                        <a
                          href={docsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setMobileOpen(false)}
                          className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-300 transition hover:bg-uni-pink/10 hover:text-uni-pink"
                        >
                          Docs
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 border-t border-uni-border px-3 py-2">
                    <p className="text-xs text-neutral-500">EonSwap</p>
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
        className="sticky top-0 z-50 border-b border-uni-border/50 bg-uni-bg/90 backdrop-blur-xl"
      >
        {/* Subtle bottom glow accent */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-uni-pink/20 to-transparent" aria-hidden />
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
          <Link
            to="/"
            className="relative z-[60] flex shrink-0 items-center gap-2.5 text-left transition hover:opacity-90 md:z-10"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-uni-pink/20 ring-1 ring-uni-pink/30 shadow-[0_0_12px_rgba(255,0,199,0.15)]">
              <Droplets className="h-5 w-5 text-uni-pink" aria-hidden />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-lg font-semibold tracking-tight text-white">
                EonSwap
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-widest text-neutral-500 sm:block">
                Execution desk
              </span>
            </span>
          </Link>

          <nav
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block"
            aria-label="Main"
          >
            <div
              ref={desktopNavRef}
              className="flex items-center gap-1"
            >
              {NAV_GROUPS.map((group) => {
                const menuId = `${baseId}-${group.id}-menu`
                const active = groupIsActive(pathname, group.items)
                const isOpen = openMenu === group.id
                return (
                  <div key={group.id} className="relative">
                    <button
                      type="button"
                      className={`flex items-center gap-0.5 rounded-full px-3 py-2 text-sm font-medium transition duration-200 hover:bg-uni-pink/10 hover:text-uni-pink ${
                        active || isOpen ? 'text-white' : 'text-neutral-400'
                      }`}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                      aria-controls={menuId}
                      id={`${baseId}-${group.id}-trigger`}
                      onClick={() => setOpenMenu((m) => (m === group.id ? null : group.id))}
                    >
                      {group.label}
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          key={menuId}
                          id={menuId}
                          role="menu"
                          aria-labelledby={`${baseId}-${group.id}-trigger`}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 top-[calc(100%+0.35rem)] z-[70] min-w-[11.5rem] rounded-2xl border border-uni-border/70 bg-uni-surface/95 py-1.5 shadow-xl shadow-uni-pink/5 backdrop-blur-xl"
                        >
                          {group.items.map((item) => (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              end={item.end ?? false}
                              role="menuitem"
                              onClick={() => setOpenMenu(null)}
                              className={({ isActive }) =>
                                `${dropdownLinkClass} ${isActive ? 'bg-uni-pink/10 text-uni-pink' : ''}`
                              }
                            >
                              {item.label}
                            </NavLink>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
              <NavLink
                to="/airdrop"
                className={({ isActive }) =>
                  `${navTextClass} ${isActive ? 'bg-white/[0.08] text-white' : ''}`
                }
              >
                Airdrop
              </NavLink>
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

          <div className="relative z-[60] flex min-w-0 flex-shrink-0 items-center gap-1.5 sm:gap-2">
            <HeaderWalletAside />
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
