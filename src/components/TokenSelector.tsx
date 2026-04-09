import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { erc20Abi, formatUnits } from 'viem'
import { getPublicClient } from 'wagmi/actions'
import { useAccount } from 'wagmi'
import { useTokenCatalog } from '../hooks/useTokenCatalog'
import { getEonChain } from '../lib/chains'
import { coingeckoIdForToken, fetchSimplePricesUsd } from '../lib/coingecko'
import { formatBalanceCompact } from '../lib/format'
import { fetchKyberTokensByIds } from '../lib/kyber'
import { mergeTokenCatalog } from '../lib/remoteTokenList'
import { isNativeToken, tokensForChain, type Token } from '../lib/tokens'
import { wagmiConfig } from '../wagmi'
import { TokenLogo } from './TokenLogo'

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (t: Token) => void
  exclude?: string
  chainId: number
}

const ADDR_40 = /^0x[a-fA-F0-9]{40}$/
const MAX_IDLE_ROWS = 100
/** Avoid rendering thousands of rows when the query is very broad */
const MAX_SEARCH_ROWS = 280

export function TokenSelector({
  open,
  onClose,
  onSelect,
  exclude,
  chainId,
}: Props) {
  const { address } = useAccount()
  const [q, setQ] = useState('')
  const { data: remoteList, isLoading, isError } = useTokenCatalog(chainId)
  const [kyberExtra, setKyberExtra] = useState<Token | null>(null)
  const [kyberLoading, setKyberLoading] = useState(false)
  const [balancesByAddress, setBalancesByAddress] = useState<Record<string, bigint>>({})
  const [usdByAddress, setUsdByAddress] = useState<Record<string, number>>({})
  const [debouncedNeedleLc, setDebouncedNeedleLc] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const fullCatalog = useMemo(
    () => mergeTokenCatalog(chainId, remoteList),
    [chainId, remoteList],
  )

  const needle = q.trim()
  const needleLc = needle.toLowerCase()
  const excludeLc = exclude?.toLowerCase() ?? null

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedNeedleLc(needleLc)
    }, 220)
    return () => window.clearTimeout(t)
  }, [needleLc])

  useEffect(() => {
    setKyberExtra(null)
    if (!needle || !ADDR_40.test(needle)) return

    const ac = new AbortController()
    const t = window.setTimeout(() => {
      ;(async () => {
        if (isNativeToken(needle)) {
          const native = tokensForChain(chainId).find((x) => isNativeToken(x.address))
          if (native && !ac.signal.aborted) setKyberExtra(native)
          return
        }
        setKyberLoading(true)
        try {
          const found = await fetchKyberTokensByIds(chainId, [needle])
          if (!ac.signal.aborted && found[0]) setKyberExtra(found[0]!)
        } catch {
          if (!ac.signal.aborted) setKyberExtra(null)
        } finally {
          if (!ac.signal.aborted) setKyberLoading(false)
        }
      })()
    }, 350)

    return () => {
      ac.abort()
      window.clearTimeout(t)
      setKyberLoading(false)
    }
  }, [needle, chainId])

  const { list: filtered, searchTruncated } = useMemo(() => {
    const base = (() => {
      if (!needleLc) {
        const seeds = tokensForChain(chainId)
        const seedSet = new Set(seeds.map((t) => t.address.toLowerCase()))
        const more = fullCatalog.filter((t) => !seedSet.has(t.address.toLowerCase()))
        const cap = Math.max(0, MAX_IDLE_ROWS - seeds.length)
        return [...seeds, ...more.slice(0, cap)]
      }

      return fullCatalog.filter((t) => {
        if (excludeLc != null && t.address.toLowerCase() === excludeLc) {
          return false
        }
        return (
          t.symbol.toLowerCase().includes(needleLc) ||
          t.name.toLowerCase().includes(needleLc) ||
          t.address.toLowerCase().includes(needleLc)
        )
      })
    })()

    let out = base.filter(
      (t) => excludeLc == null || t.address.toLowerCase() !== excludeLc,
    )

    if (
      kyberExtra &&
      (excludeLc == null ||
        kyberExtra.address.toLowerCase() !== excludeLc) &&
      needleLc &&
      ADDR_40.test(needle) &&
      !isNativeToken(needle)
    ) {
      const k = kyberExtra.address.toLowerCase()
      if (!out.some((t) => t.address.toLowerCase() === k)) {
        out = [kyberExtra, ...out]
      }
    }

    if (
      needleLc &&
      ADDR_40.test(needle) &&
      isNativeToken(needle) &&
      !out.some((t) => isNativeToken(t.address))
    ) {
      const native = tokensForChain(chainId).find((x) => isNativeToken(x.address))
      if (
        native &&
        (excludeLc == null || native.address.toLowerCase() !== excludeLc)
      ) {
        out = [native, ...out]
      }
    }

    let searchTruncated = false
    if (needleLc && out.length > MAX_SEARCH_ROWS) {
      searchTruncated = true
      out = out.slice(0, MAX_SEARCH_ROWS)
    }

    return { list: out, searchTruncated }
  }, [
    needle,
    needleLc,
    excludeLc,
    chainId,
    fullCatalog,
    kyberExtra,
  ])

  useEffect(() => {
    if (!open || !address) {
      setBalancesByAddress({})
      setUsdByAddress({})
      return
    }

    const chain = getEonChain(chainId)
    if (!chain) return
    const client = getPublicClient(wagmiConfig, { chainId: chain.id })
    if (!client) return

    const current = debouncedNeedleLc ? filtered.slice(0, 90) : filtered
    let cancelled = false

    void (async () => {
      try {
        const balanceMap: Record<string, bigint> = {}
        const usdMap: Record<string, number> = {}

        const native = current.find((t) => isNativeToken(t.address))
        if (native) {
          const nativeBal = await client.getBalance({ address: address as `0x${string}` })
          balanceMap[native.address.toLowerCase()] = nativeBal
        }

        const erc20Tokens = current.filter((t) => !isNativeToken(t.address))
        if (erc20Tokens.length > 0) {
          const calls = erc20Tokens.map((t) => ({
            address: t.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [address as `0x${string}`],
          }))
          const results = await client.multicall({
            contracts: calls,
            allowFailure: true,
          })
          for (let i = 0; i < erc20Tokens.length; i += 1) {
            const t = erc20Tokens[i]!
            const r = results[i]
            if (r?.status === 'success' && typeof r.result === 'bigint') {
              balanceMap[t.address.toLowerCase()] = r.result
            }
          }
        }

        const ids = current
          .map((t) => coingeckoIdForToken(t))
          .filter((id): id is string => Boolean(id))
        const prices: Record<string, number> = await fetchSimplePricesUsd(ids).catch(
          () => ({} as Record<string, number>),
        )

        for (const t of current) {
          const bal = balanceMap[t.address.toLowerCase()] ?? 0n
          if (bal <= 0n) continue
          const id = coingeckoIdForToken(t)
          if (!id) continue
          const price = prices[id] ?? 0
          if (price <= 0) continue
          const uiAmount = Number(formatUnits(bal, t.decimals))
          if (!Number.isFinite(uiAmount) || uiAmount <= 0) continue
          usdMap[t.address.toLowerCase()] = uiAmount * price
        }

        if (!cancelled) {
          setBalancesByAddress(balanceMap)
          setUsdByAddress(usdMap)
        }
      } catch {
        if (!cancelled) {
          setBalancesByAddress({})
          setUsdByAddress({})
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, address, chainId, filtered, debouncedNeedleLc])

  const ranked = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const aAddr = a.address.toLowerCase()
      const bAddr = b.address.toLowerCase()
      const aUsd = usdByAddress[aAddr] ?? 0
      const bUsd = usdByAddress[bAddr] ?? 0
      if (aUsd !== bUsd) return bUsd - aUsd

      const aBal = balancesByAddress[aAddr] ?? 0n
      const bBal = balancesByAddress[bAddr] ?? 0n
      if (aBal !== bBal) {
        const aNorm = Number(formatUnits(aBal, a.decimals))
        const bNorm = Number(formatUnits(bBal, b.decimals))
        if (Number.isFinite(aNorm) && Number.isFinite(bNorm) && aNorm !== bNorm) {
          return bNorm - aNorm
        }
      }

      return a.symbol.localeCompare(b.symbol)
    })
    return list
  }, [filtered, usdByAddress, balancesByAddress])

  const catalogHint =
    remoteList != null
      ? `${fullCatalog.length.toLocaleString()} tokens — type to search`
      : isLoading
        ? 'Loading token list…'
        : isError
          ? 'Using short list (token catalog unavailable)'
          : null

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="token-selector-root"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="token-select-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[min(85vh,540px)] w-full max-w-[400px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1028]/98 shadow-2xl shadow-eon-blue/10 backdrop-blur-2xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
              <h2
                id="token-select-title"
                className="text-sm font-semibold text-white"
              >
                Select token
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="shrink-0 space-y-1 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, symbol, or paste address"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.05] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-500 outline-none ring-eon-blue/40 focus:border-eon-blue/40 focus:ring-2"
                  autoFocus
                />
              </div>
              {catalogHint && (
                <p className="px-1 text-xs text-slate-500">{catalogHint}</p>
              )}
            </div>
            <div className="shrink-0 border-y border-white/10 bg-white/[0.02] px-5 py-1.5">
              <div className="flex items-center">
                <div className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Token
                </div>
                <div className="w-[8.5rem] text-right text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Balance / USD
                </div>
              </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
              {ranked.map((t) => (
                <li key={t.address}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(t)
                      setQ('')
                      onClose()
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
                  >
                    <TokenLogo chainId={chainId} token={t} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white">{t.symbol}</div>
                      <div className="truncate text-xs text-slate-500">
                        {t.name}
                      </div>
                    </div>
                    <div className="w-[8.5rem] shrink-0 text-right">
                      <div className="text-xs font-semibold tabular-nums text-slate-300">
                        {formatBalanceCompact(
                          balancesByAddress[t.address.toLowerCase()] ?? 0n,
                          t.decimals,
                          8,
                        )}
                      </div>
                      <div className="text-[11px] tabular-nums text-slate-500">
                        {(usdByAddress[t.address.toLowerCase()] ?? 0) > 0
                          ? `$${(usdByAddress[t.address.toLowerCase()] ?? 0).toFixed(2)}`
                          : '—'}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
              {searchTruncated && (
                <li className="px-3 py-2 text-center text-xs text-slate-500">
                  Showing first {MAX_SEARCH_ROWS} matches — refine your search.
                </li>
              )}
              {kyberLoading && ADDR_40.test(needle) && (
                <li className="px-3 py-3 text-center text-xs text-slate-500">
                  Resolving token via Kyber…
                </li>
              )}
              {ranked.length === 0 && !kyberLoading && (
                <li className="px-3 py-8 text-center text-sm text-slate-500">
                  {needleLc && ADDR_40.test(needle) && !kyberExtra
                    ? 'No token found for this address on this network.'
                    : 'No tokens match your search.'}
                </li>
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
