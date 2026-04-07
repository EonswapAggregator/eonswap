import { ConnectButton } from '@rainbow-me/rainbowkit'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Copy, LogOut, Network } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { formatBalanceLabel, truncateAddress } from '../lib/format'

const triggerClass =
  'flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/[0.14] hover:bg-white/[0.06] sm:px-3'

const menuBtnClass =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/[0.06] active:scale-[0.99]'

const AVATAR_EMOJIS = ['🦊', '🐼', '🦄', '🐙', '🦁', '🐸', '🐵', '🐧', '🦉', '🐳']
const AVATAR_GRADIENTS = [
  'from-cyan-500/45 to-blue-500/35',
  'from-violet-500/45 to-fuchsia-500/35',
  'from-emerald-500/45 to-cyan-500/35',
  'from-amber-500/45 to-orange-500/35',
  'from-pink-500/45 to-rose-500/35',
  'from-indigo-500/45 to-sky-500/35',
]

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function WalletConnectDropdown() {
  const { address, chainId, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { data: bal, isFetching: balanceLoading } = useBalance({
    address,
    chainId,
    query: {
      enabled: !!address && isConnected && chainId != null,
    },
  })
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const copyAddress = useCallback(async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openConnectModal,
        openChainModal,
        authenticationStatus,
      }) => {
        const ready =
          mounted && authenticationStatus !== 'loading'
        const connected = ready && account

        if (!ready) {
          return (
            <div
              className="h-10 w-[9.5rem] animate-pulse rounded-xl bg-white/[0.05] sm:w-[11rem]"
              aria-hidden
            />
          )
        }

        if (!connected) {
          return (
            <button
              type="button"
              onClick={openConnectModal}
              className={`${triggerClass} justify-center px-4 text-sm font-semibold text-white`}
            >
              Connect Wallet
            </button>
          )
        }

        const { address, displayName, ensAvatar, displayBalance } = account
        const avatarSeed = hashString(address.toLowerCase())
        const avatarEmoji = AVATAR_EMOJIS[avatarSeed % AVATAR_EMOJIS.length]
        const avatarGradient =
          AVATAR_GRADIENTS[(avatarSeed >>> 3) % AVATAR_GRADIENTS.length]
        const accountBalance =
          account.balanceFormatted && account.balanceSymbol
            ? `${account.balanceFormatted} ${account.balanceSymbol}`
            : undefined
        const wagmiBalance =
          bal != null
            ? `${formatBalanceLabel(bal.value, bal.decimals)} ${bal.symbol}`
            : undefined
        const shownBalance = wagmiBalance ?? accountBalance ?? displayBalance

        return (
          <div ref={rootRef} className="relative">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="Wallet menu"
              onClick={() => setOpen((o) => !o)}
              className={triggerClass}
            >
              {ensAvatar ? (
                <img
                  src={ensAvatar}
                  alt=""
                  className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : (
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] ring-1 ring-white/15 ${avatarGradient}`}
                  aria-label={`Wallet avatar ${displayName}`}
                  title={`Wallet avatar ${displayName}`}
                >
                  {avatarEmoji}
                </span>
              )}
              {chain?.hasIcon && chain.iconUrl ? (
                <span
                  className="hidden h-5 w-5 shrink-0 overflow-hidden rounded-full sm:block"
                  style={{ background: chain.iconBackground }}
                >
                  <img
                    src={chain.iconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </span>
              ) : null}
              <span className="hidden max-w-[6.5rem] truncate font-mono text-xs text-slate-200 sm:inline md:max-w-[7.5rem]">
                {truncateAddress(address)}
              </span>
              <ChevronDown
                className={`ml-0.5 h-4 w-4 shrink-0 text-slate-400 transition sm:ml-auto ${open ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>

            <AnimatePresence>
              {open && (
                <motion.div
                  key="wallet-menu"
                  role="menu"
                  aria-label="Wallet"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-[100] w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-cyan-500/[0.14] bg-gradient-to-b from-[#16182f] to-[#0a0b1c] py-1 shadow-[0_28px_80px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,210,255,0.06),0_0_48px_-12px_rgba(34,211,238,0.1)]"
                >
                  <div className="border-b border-white/[0.06] px-3 py-3">
                    {chain?.unsupported ? (
                      <p className="text-xs font-medium text-amber-400/95">
                        Wrong network — switch to continue.
                      </p>
                    ) : null}
                    <p className="break-all font-mono text-[11px] leading-relaxed text-slate-300">
                      {address}
                    </p>
                    {shownBalance ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Balance{' '}
                        <span className="font-mono font-medium tabular-nums text-eon-blue">
                          {shownBalance}
                        </span>
                      </p>
                    ) : balanceLoading ? (
                      <p className="mt-2 text-xs text-slate-500">Balance loading…</p>
                    ) : null}
                  </div>
                  <div className="p-1">
                    <button
                      type="button"
                      role="menuitem"
                      className={menuBtnClass}
                      onClick={() => {
                        void copyAddress(address)
                      }}
                    >
                      <Copy className="h-4 w-4 shrink-0 text-slate-400" />
                      {copied ? 'Copied' : 'Copy address'}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={menuBtnClass}
                      onClick={() => {
                        close()
                        openChainModal()
                      }}
                    >
                      <Network className="h-4 w-4 shrink-0 text-slate-400" />
                      Switch network
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={`${menuBtnClass} text-red-400/95 hover:bg-red-500/10 hover:text-red-300`}
                      onClick={() => {
                        close()
                        disconnect()
                      }}
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      Disconnect
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
