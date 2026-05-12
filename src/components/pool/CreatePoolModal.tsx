import {
  AlertCircle,
  Check,
  ChevronDown,
  Droplets,
  Link2,
  Link2Off,
  Loader2,
  Plus,
  X,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatUnits, parseUnits, type Address } from 'viem'
import { useAccount, useBalance, usePublicClient } from 'wagmi'

import { useEonLiquidity } from '../../hooks/useEonLiquidity'
import { TokenLogo } from '../TokenLogo'
import { tokensForChain, type Token } from '../../lib/tokens'
import { EON_AMM_ROUTER_FALLBACK, EON_AMM_FACTORY } from '../../lib/amm/config'
import { eonAmmFactoryAbi } from '../../lib/amm/abis'
import { coingeckoIdForToken, fetchSimplePricesUsd } from '../../lib/coingecko'

type CreatePoolModalProps = {
  chainId: number
  onClose: () => void
  onSuccess: () => void
}

export function CreatePoolModal({ chainId, onClose, onSuccess }: CreatePoolModalProps) {
  const { address: userAddress } = useAccount()
  const publicClient = usePublicClient({ chainId })
  const routerAddress = EON_AMM_ROUTER_FALLBACK[chainId]
  const factoryAddress = EON_AMM_FACTORY[chainId]

  const availableTokens = useMemo(() => {
    return tokensForChain(chainId).filter((t) => t.symbol !== 'ETH') // Exclude native ETH, use WETH
  }, [chainId])

  const [tokenA, setTokenA] = useState<Token | null>(null)
  const [tokenB, setTokenB] = useState<Token | null>(null)
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [slippage, setSlippage] = useState(0.5)
  const [showTokenSelectA, setShowTokenSelectA] = useState(false)
  const [showTokenSelectB, setShowTokenSelectB] = useState(false)
  const [pairExists, setPairExists] = useState<boolean | null>(null)
  const [checkingPair, setCheckingPair] = useState(false)

  const [approving0, setApproving0] = useState(false)
  const [approving1, setApproving1] = useState(false)
  const [needsApproval0, setNeedsApproval0] = useState(true)
  const [needsApproval1, setNeedsApproval1] = useState(true)

  // Auto-price feature
  const [priceA, setPriceA] = useState<number | null>(null)
  const [priceB, setPriceB] = useState<number | null>(null)
  const [fetchingPrices, setFetchingPrices] = useState(false)
  const [autoLinkEnabled, setAutoLinkEnabled] = useState(true)

  const {
    addLiquidity,
    addLiquidityETH,
    approveToken,
    checkAllowance,
    status,
    error: txError,
    hash,
  } = useEonLiquidity(chainId)

  const isTokenANative = tokenA?.symbol === 'WETH'
  const isTokenBNative = tokenB?.symbol === 'WETH'

  const { data: balanceA } = useBalance({
    address: userAddress,
    token: isTokenANative ? undefined : (tokenA?.address as Address),
    chainId,
    query: { enabled: !!tokenA },
  })
  const { data: balanceB } = useBalance({
    address: userAddress,
    token: isTokenBNative ? undefined : (tokenB?.address as Address),
    chainId,
    query: { enabled: !!tokenB },
  })

  const decimalsA = tokenA?.decimals ?? 18
  const decimalsB = tokenB?.decimals ?? 18

  const parsedAmountA = useMemo(() => {
    try {
      return parseUnits(amountA || '0', decimalsA)
    } catch {
      return 0n
    }
  }, [amountA, decimalsA])

  const parsedAmountB = useMemo(() => {
    try {
      return parseUnits(amountB || '0', decimalsB)
    } catch {
      return 0n
    }
  }, [amountB, decimalsB])

  // Fetch USD prices from CoinGecko for both tokens
  useEffect(() => {
    if (!tokenA || !tokenB) {
      setPriceA(null)
      setPriceB(null)
      return
    }

    const idA = coingeckoIdForToken({ symbol: tokenA.symbol, address: tokenA.address })
    const idB = coingeckoIdForToken({ symbol: tokenB.symbol, address: tokenB.address })

    if (!idA && !idB) {
      setPriceA(null)
      setPriceB(null)
      return
    }

    const fetchPrices = async () => {
      setFetchingPrices(true)
      try {
        const ids = [idA, idB].filter(Boolean) as string[]
        const prices = await fetchSimplePricesUsd(ids)
        setPriceA(idA ? prices[idA] ?? null : null)
        setPriceB(idB ? prices[idB] ?? null : null)
      } catch {
        setPriceA(null)
        setPriceB(null)
      } finally {
        setFetchingPrices(false)
      }
    }

    void fetchPrices()
  }, [tokenA, tokenB])

  // Calculate price ratio (how much B per 1 A)
  const priceRatio = useMemo(() => {
    if (!priceA || !priceB || priceB === 0) return null
    return priceA / priceB
  }, [priceA, priceB])

  // Auto-calculate linked amount
  const calculateLinkedAmount = useCallback(
    (value: string, from: 'A' | 'B'): string => {
      if (!priceRatio || !value || value === '0') return ''
      const numValue = parseFloat(value)
      if (isNaN(numValue) || numValue <= 0) return ''

      if (from === 'A') {
        // User entered A, calculate B
        const bAmount = numValue * priceRatio
        return bAmount.toFixed(Math.min(decimalsB, 8))
      } else {
        // User entered B, calculate A
        const aAmount = numValue / priceRatio
        return aAmount.toFixed(Math.min(decimalsA, 8))
      }
    },
    [priceRatio, decimalsA, decimalsB]
  )

  // Handle amount A change with auto-link
  const handleAmountAChange = (value: string) => {
    setAmountA(value)
    if (autoLinkEnabled && priceRatio && !pairExists) {
      const linkedB = calculateLinkedAmount(value, 'A')
      if (linkedB) setAmountB(linkedB)
    }
  }

  // Handle amount B change with auto-link
  const handleAmountBChange = (value: string) => {
    setAmountB(value)
    if (autoLinkEnabled && priceRatio && !pairExists) {
      const linkedA = calculateLinkedAmount(value, 'B')
      if (linkedA) setAmountA(linkedA)
    }
  }

  // Check if pair already exists
  useEffect(() => {
    if (!tokenA || !tokenB || !publicClient || !factoryAddress) {
      setPairExists(null)
      return
    }

    const checkPair = async () => {
      setCheckingPair(true)
      try {
        const pairAddress = await publicClient.readContract({
          address: factoryAddress,
          abi: eonAmmFactoryAbi,
          functionName: 'getPair',
          args: [tokenA.address as Address, tokenB.address as Address],
        })
        setPairExists(pairAddress !== '0x0000000000000000000000000000000000000000')
      } catch {
        setPairExists(null)
      } finally {
        setCheckingPair(false)
      }
    }

    void checkPair()
  }, [tokenA, tokenB, publicClient, factoryAddress])

  // Check allowances
  useEffect(() => {
    if (!userAddress || !routerAddress) return
    const check = async () => {
      if (tokenA && !isTokenANative && parsedAmountA > 0n) {
        const has = await checkAllowance(tokenA.address as Address, routerAddress, parsedAmountA)
        setNeedsApproval0(!has)
      } else {
        setNeedsApproval0(false)
      }
      if (tokenB && !isTokenBNative && parsedAmountB > 0n) {
        const has = await checkAllowance(tokenB.address as Address, routerAddress, parsedAmountB)
        setNeedsApproval1(!has)
      } else {
        setNeedsApproval1(false)
      }
    }
    void check()
  }, [
    userAddress,
    routerAddress,
    tokenA,
    tokenB,
    parsedAmountA,
    parsedAmountB,
    checkAllowance,
    isTokenANative,
    isTokenBNative,
  ])

  const handleApproveA = async () => {
    if (!routerAddress || !tokenA) return
    setApproving0(true)
    await approveToken(tokenA.address as Address, routerAddress, parsedAmountA)
    setNeedsApproval0(false)
    setApproving0(false)
  }

  const handleApproveB = async () => {
    if (!routerAddress || !tokenB) return
    setApproving1(true)
    await approveToken(tokenB.address as Address, routerAddress, parsedAmountB)
    setNeedsApproval1(false)
    setApproving1(false)
  }

  const handleCreate = async () => {
    if (!userAddress || !tokenA || !tokenB) return

    const slippageFactor = BigInt(Math.floor((1 - slippage / 100) * 10000))
    const amountAMin = (parsedAmountA * slippageFactor) / 10000n
    const amountBMin = (parsedAmountB * slippageFactor) / 10000n

    let result
    if (isTokenANative) {
      result = await addLiquidityETH({
        token: tokenB.address as Address,
        amountTokenDesired: parsedAmountB,
        amountTokenMin: amountBMin,
        amountETHMin: amountAMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        value: parsedAmountA,
      })
    } else if (isTokenBNative) {
      result = await addLiquidityETH({
        token: tokenA.address as Address,
        amountTokenDesired: parsedAmountA,
        amountTokenMin: amountAMin,
        amountETHMin: amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        value: parsedAmountB,
      })
    } else {
      result = await addLiquidity({
        tokenA: tokenA.address as Address,
        tokenB: tokenB.address as Address,
        amountADesired: parsedAmountA,
        amountBDesired: parsedAmountB,
        amountAMin,
        amountBMin,
        to: userAddress,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
      })
    }

    if (result) {
      onSuccess()
    }
  }

  const insufficientA =
    balanceA && parsedAmountA > 0n && parsedAmountA > balanceA.value
  const insufficientB =
    balanceB && parsedAmountB > 0n && parsedAmountB > balanceB.value

  const canCreate =
    tokenA &&
    tokenB &&
    tokenA.address !== tokenB.address &&
    parsedAmountA > 0n &&
    parsedAmountB > 0n &&
    !insufficientA &&
    !insufficientB &&
    !needsApproval0 &&
    !needsApproval1 &&
    status !== 'pending'

  const filteredTokensA = availableTokens.filter(
    (t) => t.address !== tokenB?.address
  )
  const filteredTokensB = availableTokens.filter(
    (t) => t.address !== tokenA?.address
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[400px] max-h-[85vh] overflow-y-auto rounded-2xl border border-uni-border bg-uni-surface p-5 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 hover:bg-uni-surface-2 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-uni-pink/20">
            <Plus className="h-5 w-5 text-uni-pink" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Create New Pool</h2>
            <p className="text-xs text-neutral-400">Add initial liquidity to create a new pair</p>
          </div>
        </div>

        {/* Token A Selection */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-neutral-400">
            Token A
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTokenSelectA(!showTokenSelectA)}
              className="flex w-full items-center justify-between rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3 text-left transition hover:border-uni-pink/50"
            >
              {tokenA ? (
                <div className="flex items-center gap-3">
                  <TokenLogo chainId={chainId} token={tokenA} size="sm" />
                  <span className="font-medium text-white">{tokenA.symbol}</span>
                </div>
              ) : (
                <span className="text-neutral-400">Select token</span>
              )}
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            </button>

            {showTokenSelectA && (
              <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-48 overflow-y-auto rounded-xl border border-uni-border bg-uni-surface shadow-lg">
                {filteredTokensA.map((t) => (
                  <button
                    key={t.address}
                    type="button"
                    onClick={() => {
                      setTokenA(t)
                      setShowTokenSelectA(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-uni-surface-2"
                  >
                    <TokenLogo chainId={chainId} token={t} size="sm" />
                    <span className="text-white">{t.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {tokenA && (
            <div className="mt-2 rounded-xl border border-uni-border bg-uni-surface-2 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-500">{tokenA.symbol}</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amountA}
                onChange={(e) => handleAmountAChange(e.target.value)}
                className="w-full bg-transparent text-xl font-medium text-white outline-none placeholder:text-neutral-600"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  Balance:{' '}
                  {balanceA
                    ? Number(formatUnits(balanceA.value, balanceA.decimals)).toFixed(4)
                    : '0.0000'}
                </span>
                {balanceA && (
                  <button
                    type="button"
                    onClick={() => {
                      const maxVal = formatUnits(balanceA.value, balanceA.decimals)
                      handleAmountAChange(maxVal)
                    }}
                    className="text-uni-pink hover:underline"
                  >
                    MAX
                  </button>
                )}
              </div>
              {insufficientA && (
                <p className="mt-1 text-xs text-rose-400">Insufficient balance</p>
              )}
            </div>
          )}
        </div>

        {/* Token B Selection */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-neutral-400">
            Token B
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTokenSelectB(!showTokenSelectB)}
              className="flex w-full items-center justify-between rounded-xl border border-uni-border bg-uni-surface-2 px-4 py-3 text-left transition hover:border-uni-pink/50"
            >
              {tokenB ? (
                <div className="flex items-center gap-3">
                  <TokenLogo chainId={chainId} token={tokenB} size="sm" />
                  <span className="font-medium text-white">{tokenB.symbol}</span>
                </div>
              ) : (
                <span className="text-neutral-400">Select token</span>
              )}
              <ChevronDown className="h-4 w-4 text-neutral-400" />
            </button>

            {showTokenSelectB && (
              <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-48 overflow-y-auto rounded-xl border border-uni-border bg-uni-surface shadow-lg">
                {filteredTokensB.map((t) => (
                  <button
                    key={t.address}
                    type="button"
                    onClick={() => {
                      setTokenB(t)
                      setShowTokenSelectB(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-uni-surface-2"
                  >
                    <TokenLogo chainId={chainId} token={t} size="sm" />
                    <span className="text-white">{t.symbol}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {tokenB && (
            <div className="mt-2 rounded-xl border border-uni-border bg-uni-surface-2 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-neutral-500">{tokenB.symbol}</span>
              </div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amountB}
                onChange={(e) => handleAmountBChange(e.target.value)}
                className="w-full bg-transparent text-xl font-medium text-white outline-none placeholder:text-neutral-600"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                <span>
                  Balance:{' '}
                  {balanceB
                    ? Number(formatUnits(balanceB.value, balanceB.decimals)).toFixed(4)
                    : '0.0000'}
                </span>
                {balanceB && (
                  <button
                    type="button"
                    onClick={() => {
                      const maxVal = formatUnits(balanceB.value, balanceB.decimals)
                      handleAmountBChange(maxVal)
                    }}
                    className="text-uni-pink hover:underline"
                  >
                    MAX
                  </button>
                )}
              </div>
              {insufficientB && (
                <p className="mt-1 text-xs text-rose-400">Insufficient balance</p>
              )}
            </div>
          )}
        </div>

        {/* Auto-price Info */}
        {tokenA && tokenB && !pairExists && (
          <div className="mb-4 rounded-xl border border-uni-border bg-uni-bg p-3">
            {fetchingPrices ? (
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching market prices...
              </div>
            ) : priceRatio ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <Zap className="h-4 w-4" />
                    <span>Market price available</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoLinkEnabled(!autoLinkEnabled)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      autoLinkEnabled
                        ? 'border-uni-pink/50 bg-uni-pink/10 text-uni-pink'
                        : 'border-uni-border text-neutral-500 hover:border-uni-pink/30'
                    }`}
                  >
                    {autoLinkEnabled ? (
                      <><Link2 className="h-3 w-3" />Auto-link ON</>
                    ) : (
                      <><Link2Off className="h-3 w-3" />Auto-link OFF</>
                    )}
                  </button>
                </div>
                <div className="text-xs text-neutral-400">
                  1 {tokenA.symbol} ≈ {priceRatio.toFixed(6)} {tokenB.symbol}
                  {priceA && priceB && (
                    <span className="ml-2 text-neutral-500">
                      (${priceA.toFixed(4)} / ${priceB.toFixed(4)})
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <AlertCircle className="h-4 w-4" />
                No public price data. Set ratio manually.
              </div>
            )}
          </div>
        )}

        {/* Pair Status */}
        {tokenA && tokenB && (
          <div className="mb-4 rounded-xl border border-uni-border bg-uni-bg p-3">
            {checkingPair ? (
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking pair...
              </div>
            ) : pairExists ? (
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <AlertCircle className="h-4 w-4" />
                Pair already exists. You'll add to existing pool.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <Droplets className="h-4 w-4" />
                New pair! You'll be the first liquidity provider.
              </div>
            )}
          </div>
        )}

        {/* Slippage */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-neutral-400">
            Slippage Tolerance
          </label>
          <div className="flex gap-2">
            {[0.5, 1, 2].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlippage(s)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  slippage === s
                    ? 'border-uni-pink bg-uni-pink/20 text-uni-pink'
                    : 'border-uni-border text-neutral-400 hover:border-uni-pink/50'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* Approvals */}
        {(needsApproval0 || needsApproval1) && (
          <div className="mb-4 space-y-2">
            {needsApproval0 && tokenA && (
              <button
                type="button"
                onClick={handleApproveA}
                disabled={approving0}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-uni-pink bg-uni-pink/10 px-4 py-3 font-medium text-uni-pink transition hover:bg-uni-pink/20 disabled:opacity-50"
              >
                {approving0 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Approving {tokenA.symbol}...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Approve {tokenA.symbol}
                  </>
                )}
              </button>
            )}
            {needsApproval1 && tokenB && (
              <button
                type="button"
                onClick={handleApproveB}
                disabled={approving1}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-uni-pink bg-uni-pink/10 px-4 py-3 font-medium text-uni-pink transition hover:bg-uni-pink/20 disabled:opacity-50"
              >
                {approving1 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Approving {tokenB.symbol}...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Approve {tokenB.symbol}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Status Messages */}
        {status === 'pending' && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Transaction pending...
          </div>
        )}
        {status === 'success' && hash && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-3 text-sm text-green-400">
            <Check className="h-4 w-4" />
            Pool created!{' '}
            <a
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View tx
            </a>
          </div>
        )}
        {txError && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span className="break-all">{txError}</span>
          </div>
        )}

        {/* Create Button */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full rounded-2xl bg-uni-pink px-6 py-3.5 font-semibold text-white transition hover:bg-uni-pink-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'pending' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Pool...
            </span>
          ) : pairExists ? (
            'Add Liquidity'
          ) : (
            'Create Pool & Add Liquidity'
          )}
        </button>
      </div>
    </div>
  )
}
