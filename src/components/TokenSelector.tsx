import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { erc20Abi, formatUnits, getAddress, parseUnits } from 'viem'
import { getPublicClient } from 'wagmi/actions'
import { useAccount } from 'wagmi'
import { getEonChain } from '../lib/chains'
import { coingeckoIdForToken, fetchSimplePricesUsd } from '../lib/coingecko'
import { fetchEonAmmQuote } from '../lib/eonAmm'
import { formatBalanceCompact } from '../lib/format'
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
const STABLE_USD_BY_SYMBOL: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  DAI: 1,
}

export function TokenSelector({
  open,
  onClose,
  onSelect,
  exclude,
  chainId,
}: Props) {
  const { address } = useAccount()
  const [q, setQ] = useState('')
  const [balancesByAddress, setBalancesByAddress] = useState<Record<string, bigint>>({})
  const [usdByAddress, setUsdByAddress] = useState<Record<string, number>>({})
  const [usdPriceFetchedAt, setUsdPriceFetchedAt] = useState<Record<string, number>>({})
  const [debouncedNeedleLc, setDebouncedNeedleLc] = useState('')
  const [resolvedAddressToken, setResolvedAddressToken] = useState<Token | null>(null)
  const [resolvingAddressToken, setResolvingAddressToken] = useState(false)
  const stalePriceMs = Number(import.meta.env.VITE_PRICE_STALE_MS ?? 120000)
  const nowMs = Date.now()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const fullCatalog = useMemo(() => tokensForChain(chainId), [chainId])

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
    setResolvedAddressToken(null)
    setResolvingAddressToken(false)
    if (!open || !ADDR_40.test(needle) || isNativeToken(needle)) return

    const lower = needle.toLowerCase()
    const existing = fullCatalog.find((t) => t.address.toLowerCase() === lower)
    if (existing) {
      setResolvedAddressToken(existing)
      return
    }

    const chain = getEonChain(chainId)
    if (!chain) return
    const client = getPublicClient(wagmiConfig, { chainId: chain.id })
    if (!client) return

    let cancelled = false
    setResolvingAddressToken(true)
    void (async () => {
      try {
        const address = getAddress(needle)
        const [symbolRes, nameRes, decimalsRes] = await Promise.all([
          client.readContract({
            address,
            abi: erc20Abi,
            functionName: 'symbol',
          }),
          client.readContract({
            address,
            abi: erc20Abi,
            functionName: 'name',
          }),
          client.readContract({
            address,
            abi: erc20Abi,
            functionName: 'decimals',
          }),
        ])
        if (cancelled) return

        const symbol = String(symbolRes ?? '').trim()
        const name = String(nameRes ?? '').trim()
        const decimals = Number(decimalsRes ?? 18)
        if (!symbol || !Number.isFinite(decimals) || decimals < 0 || decimals > 36) {
          setResolvedAddressToken(null)
          return
        }
        setResolvedAddressToken({
          address,
          symbol,
          name: name || symbol,
          decimals,
        })
      } catch {
        if (!cancelled) setResolvedAddressToken(null)
      } finally {
        if (!cancelled) setResolvingAddressToken(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, needle, chainId, fullCatalog])

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
      needleLc &&
      ADDR_40.test(needle) &&
      resolvedAddressToken &&
      (excludeLc == null || resolvedAddressToken.address.toLowerCase() !== excludeLc)
    ) {
      const key = resolvedAddressToken.address.toLowerCase()
      if (!out.some((t) => t.address.toLowerCase() === key)) {
        out = [resolvedAddressToken, ...out]
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
    resolvedAddressToken,
  ])

  useEffect(() => {
    if (!open || !address) {
      setBalancesByAddress({})
      setUsdByAddress({})
      setUsdPriceFetchedAt({})
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
        const priceByAddress: Record<string, number> = {}
        for (const t of current) {
          const key = t.address.toLowerCase()
          const stableUsd = STABLE_USD_BY_SYMBOL[t.symbol.toUpperCase()] ?? 0
          const id = coingeckoIdForToken(t)
          const p = id ? (prices[id] ?? stableUsd) : stableUsd
          if (Number.isFinite(p) && p > 0) priceByAddress[key] = p
        }

        // Fallback: derive missing token USD from on-chain Eon AMM quote against a stable coin.
        const usdcOrUsdtQuoteToken =
          current.find((t) => t.symbol.toUpperCase() === 'USDC') ??
          current.find((t) => t.symbol.toUpperCase() === 'USDT') ??
          null
        const wethQuoteToken =
          current.find((t) => t.symbol.toUpperCase() === 'WETH') ??
          null
        const usdcOrUsdtQuoteUsd =
          usdcOrUsdtQuoteToken != null
            ? (priceByAddress[usdcOrUsdtQuoteToken.address.toLowerCase()] ??
              STABLE_USD_BY_SYMBOL[usdcOrUsdtQuoteToken.symbol.toUpperCase()] ??
              0)
            : 0
        const wethQuoteUsd =
          wethQuoteToken != null
            ? (priceByAddress[wethQuoteToken.address.toLowerCase()] ??
              prices.ethereum ??
              0)
            : 0
        const quoteToken = usdcOrUsdtQuoteUsd > 0
          ? usdcOrUsdtQuoteToken
          : wethQuoteUsd > 0
            ? wethQuoteToken
            : null
        const quoteUsd = usdcOrUsdtQuoteUsd > 0 ? usdcOrUsdtQuoteUsd : wethQuoteUsd

        if (quoteToken && quoteUsd > 0) {
          const missingWithBalance = current
            .filter((t) => {
              if (t.address.toLowerCase() === quoteToken.address.toLowerCase()) return false
              if (isNativeToken(t.address)) return false
              const key = t.address.toLowerCase()
              const bal = balanceMap[key] ?? 0n
              return bal > 0n && (priceByAddress[key] ?? 0) <= 0
            })
            .sort((a, b) => {
              const aBal = balanceMap[a.address.toLowerCase()] ?? 0n
              const bBal = balanceMap[b.address.toLowerCase()] ?? 0n
              if (aBal === bBal) return 0
              return aBal > bBal ? -1 : 1
            })
            .slice(0, 8)

          for (const t of missingWithBalance) {
            try {
              const oneIn = parseUnits('1', t.decimals).toString()
              const q = await fetchEonAmmQuote({
                chainId,
                tokenIn: t.address,
                tokenOut: quoteToken.address,
                amountIn: oneIn,
                sender: address,
              })
              const outQuote = Number(formatUnits(BigInt(q.amountOut), quoteToken.decimals))
              if (Number.isFinite(outQuote) && outQuote > 0) {
                priceByAddress[t.address.toLowerCase()] = outQuote * quoteUsd
              }
            } catch {
              // keep missing if no route/liquidity for this token
            }
          }
        }

        const fetchedAt = Date.now()

        for (const t of current) {
          const bal = balanceMap[t.address.toLowerCase()] ?? 0n
          if (bal <= 0n) continue
          const price = priceByAddress[t.address.toLowerCase()] ?? 0
          if (price <= 0) continue
          const uiAmount = Number(formatUnits(bal, t.decimals))
          if (!Number.isFinite(uiAmount) || uiAmount <= 0) continue
          usdMap[t.address.toLowerCase()] = uiAmount * price
        }

        if (!cancelled) {
          setBalancesByAddress(balanceMap)
          setUsdByAddress(usdMap)
          const tsMap: Record<string, number> = {}
          for (const t of current) {
            if ((priceByAddress[t.address.toLowerCase()] ?? 0) <= 0) continue
            tsMap[t.address.toLowerCase()] = fetchedAt
          }
          setUsdPriceFetchedAt(tsMap)
        }
      } catch {
        if (!cancelled) {
          setBalancesByAddress({})
          setUsdByAddress({})
          setUsdPriceFetchedAt({})
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, address, chainId, filtered, debouncedNeedleLc])

  const ranked = useMemo(() => {
    const relevanceRank = (token: Token, queryLc: string): number => {
      if (!queryLc) return 99
      const symbolLc = token.symbol.toLowerCase()
      const nameLc = token.name.toLowerCase()
      const addressLc = token.address.toLowerCase()

      if (symbolLc === queryLc) return 0
      if (nameLc === queryLc) return 1
      if (addressLc === queryLc) return 2
      if (symbolLc.startsWith(queryLc)) return 3
      if (nameLc.startsWith(queryLc)) return 4
      if (addressLc.startsWith(queryLc)) return 5
      if (symbolLc.includes(queryLc)) return 6
      if (nameLc.includes(queryLc)) return 7
      if (addressLc.includes(queryLc)) return 8
      return 99
    }

    const list = [...filtered]
    list.sort((a, b) => {
      if (needleLc) {
        const aRelevance = relevanceRank(a, needleLc)
        const bRelevance = relevanceRank(b, needleLc)
        if (aRelevance !== bRelevance) return aRelevance - bRelevance
      }

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
  }, [filtered, needleLc, usdByAddress, balancesByAddress])

  const catalogHint = `${fullCatalog.length.toLocaleString()} curated tokens`

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
                      {(() => {
                        const ts = usdPriceFetchedAt[t.address.toLowerCase()] ?? 0
                        const stale = ts > 0 && nowMs - ts > stalePriceMs
                        if (!stale) return null
                        return (
                          <div className="mt-0.5 inline-flex rounded-md border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-300">
                            stale price
                          </div>
                        )
                      })()}
                    </div>
                  </button>
                </li>
              ))}
              {searchTruncated && (
                <li className="px-3 py-2 text-center text-xs text-slate-500">
                  Showing first {MAX_SEARCH_ROWS} matches — refine your search.
                </li>
              )}
              {resolvingAddressToken && ADDR_40.test(needle) && (
                <li className="px-3 py-2 text-center text-xs text-slate-500">
                  Resolving token from contract address...
                </li>
              )}
              {ranked.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-slate-500">
                  {needleLc && ADDR_40.test(needle)
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
