import { motion } from 'framer-motion'
import { ArrowDownUp, ChevronDown, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseUnits } from 'viem'
import { useAccount, useBalance, useChainId, useEstimateFeesPerGas } from 'wagmi'
import { useSwapQuote } from '../hooks/useSwapQuote'
import { useSwapSubmit } from '../hooks/useSwapSubmit'
import { chainWrappedNative } from '../lib/amm/config'
import { formatBalanceCompact, formatMaxSellInput } from '../lib/format'
import { isEonAmmSwapChain } from '../lib/chains'
import { isNativeToken } from '../lib/tokens'
import { base } from 'viem/chains'
import { useEonSwapStore } from '../store/useEonSwapStore'
import { parsePriceImpactPercent, priceImpactPercentFromUsd } from '../lib/quoteDisplay'
import { defaultSlippageBpsByContext } from '../lib/slippage'
import { BestRoute } from './BestRoute'
import { SlippageSettings } from './SlippageSettings'
import { SwapConfirmModal } from './SwapConfirmModal'
import { SwapQuoteDetails } from './SwapQuoteDetails'
import { TokenLogo } from './TokenLogo'
import { TokenSelector } from './TokenSelector'

const SWAP_GAS_LIMIT_ESTIMATE = 300_000n
const DEFAULT_RESERVE_WEI = 1_500_000_000_000_000n // 0.0015
const DEFAULT_GAS_BUFFER_BPS = 11_000n // 110%

function envBigInt(name: string): bigint | null {
  const raw = String((import.meta.env as Record<string, unknown>)[name] ?? '').trim()
  if (!raw) return null
  try {
    const n = BigInt(raw)
    return n >= 0n ? n : null
  } catch {
    return null
  }
}

function nativeReserveFloorWei(chainId?: number): bigint {
  const byChain =
    chainId != null
      ? envBigInt(`VITE_SWAP_NATIVE_RESERVE_WEI_${chainId}`)
      : null
  if (byChain != null && byChain > 0n) return byChain
  const common = envBigInt('VITE_SWAP_NATIVE_RESERVE_WEI')
  if (common != null && common > 0n) return common

  if (chainId === 8453) return 150_000_000_000_000n // Base
  return DEFAULT_RESERVE_WEI
}

export function SwapWidget() {
  useSwapQuote()
  const { submitSwap, isWorking } = useSwapSubmit()
  const { address, isConnected, chainId: accountChainId } = useAccount()
  const walletDefaultChain = useChainId()

  const sellToken = useEonSwapStore((s) => s.sellToken)
  const buyToken = useEonSwapStore((s) => s.buyToken)
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const receiveFormatted = useEonSwapStore((s) => s.receiveFormatted)
  const quoteError = useEonSwapStore((s) => s.quoteError)
  const quoteAmountInUsd = useEonSwapStore((s) => s.quoteAmountInUsd)
  const quoteAmountOutUsd = useEonSwapStore((s) => s.quoteAmountOutUsd)
  const quotePriceImpact = useEonSwapStore((s) => s.quotePriceImpact)
  const quoteLoading = useEonSwapStore((s) => s.quoteLoading)
  const priceImpactWarnPct = useEonSwapStore((s) => s.priceImpactWarnPct)
  const setSellAmountInput = useEonSwapStore((s) => s.setSellAmountInput)
  const setSellToken = useEonSwapStore((s) => s.setSellToken)
  const setBuyToken = useEonSwapStore((s) => s.setBuyToken)
  const flipTokens = useEonSwapStore((s) => s.flipTokens)
  const slippageToleranceBps = useEonSwapStore((s) => s.slippageToleranceBps)
  const setSlippageToleranceBps = useEonSwapStore((s) => s.setSlippageToleranceBps)

  const [sellPicker, setSellPicker] = useState(false)
  const [buyPicker, setBuyPicker] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const wrongNetwork =
    isConnected &&
    accountChainId != null &&
    !isEonAmmSwapChain(accountChainId)

  const chainIdForTokens =
    isConnected && accountChainId != null && isEonAmmSwapChain(accountChainId)
      ? accountChainId
      : isEonAmmSwapChain(walletDefaultChain)
        ? walletDefaultChain
        : base.id

  const balanceChainId =
    isConnected && accountChainId != null && isEonAmmSwapChain(accountChainId)
      ? accountChainId
      : isConnected && isEonAmmSwapChain(walletDefaultChain)
        ? walletDefaultChain
        : undefined

  const sellIsNative = isNativeToken(sellToken.address)
  const buyIsNative = isNativeToken(buyToken.address)
  const wrappedNative =
    balanceChainId != null ? chainWrappedNative(balanceChainId).toLowerCase() : null
  const sellIsWeth = wrappedNative != null && sellToken.address.toLowerCase() === wrappedNative
  const buyIsWeth = wrappedNative != null && buyToken.address.toLowerCase() === wrappedNative
  const actionLabel = sellIsNative && buyIsWeth ? 'Wrap' : sellIsWeth && buyIsNative ? 'Unwrap' : 'Swap'
  const lastAutoSlippageRef = useRef<number | null>(null)

  useEffect(() => {
    const recommended = defaultSlippageBpsByContext({
      chainId: chainIdForTokens,
      sellIsNative,
      buyIsNative,
    })
    const prevAuto = lastAutoSlippageRef.current
    const shouldAutoApply =
      slippageToleranceBps === 50 || // legacy default
      (prevAuto != null && slippageToleranceBps === prevAuto)
    if (!shouldAutoApply) return
    if (slippageToleranceBps !== recommended) {
      setSlippageToleranceBps(recommended)
    }
    lastAutoSlippageRef.current = recommended
  }, [
    chainIdForTokens,
    sellIsNative,
    buyIsNative,
    slippageToleranceBps,
    setSlippageToleranceBps,
  ])

  const { data: walletBalance, isFetching: balanceLoading } = useBalance({
    address,
    chainId: balanceChainId,
    token: sellIsNative
      ? undefined
      : (sellToken.address as `0x${string}`),
    query: {
      enabled:
        Boolean(address) && balanceChainId != null && !wrongNetwork,
    },
  })

  const { data: nativeGasBalance, isFetching: nativeGasLoading } = useBalance({
    address,
    chainId: balanceChainId,
    token: undefined,
    query: {
      enabled:
        Boolean(address) && balanceChainId != null && !wrongNetwork,
    },
  })

  const { data: feeData } = useEstimateFeesPerGas({
    chainId: balanceChainId,
    query: {
      enabled: Boolean(isConnected && balanceChainId != null && !wrongNetwork),
    },
  })

  const dynamicNativeReserveWei = useMemo(() => {
    const floor = nativeReserveFloorWei(balanceChainId)
    const feePerGas = feeData?.maxFeePerGas ?? feeData?.gasPrice ?? 0n
    if (feePerGas <= 0n) return floor
    const bufferBps = envBigInt('VITE_SWAP_GAS_BUFFER_BPS') ?? DEFAULT_GAS_BUFFER_BPS
    const estimated = (feePerGas * SWAP_GAS_LIMIT_ESTIMATE * bufferBps) / 10_000n
    return estimated > floor ? estimated : floor
  }, [balanceChainId, feeData?.gasPrice, feeData?.maxFeePerGas])

  const maxInputWei =
    sellIsNative && walletBalance?.value
      ? walletBalance.value > dynamicNativeReserveWei
        ? walletBalance.value - dynamicNativeReserveWei
        : 0n
      : (walletBalance?.value ?? 0n)

  const applyMaxSell = useCallback(() => {
    if (!walletBalance?.value || maxInputWei <= 0n) return
    setSellAmountInput(
      formatMaxSellInput(maxInputWei, walletBalance.decimals),
    )
  }, [walletBalance, maxInputWei, setSellAmountInput])

  const maxDisabled =
    !isConnected ||
    wrongNetwork ||
    balanceLoading ||
    !walletBalance?.value ||
    maxInputWei <= 0n

  const maxBtnClass = maxDisabled
    ? 'cursor-not-allowed border-white/[0.06] text-neutral-600'
    : 'border-uni-pink/30 text-uni-pink hover:border-uni-pink/50 hover:bg-uni-pink/10'

  const balanceDisplay = (() => {
    if (!isConnected) return '—'
    if (wrongNetwork) return '—'
    if (balanceLoading) return '…'
    if (!walletBalance?.value) {
      return `0 ${walletBalance?.symbol ?? sellToken.symbol}`
    }
    const sym = walletBalance.symbol ?? sellToken.symbol
    return `${formatBalanceCompact(walletBalance.value, walletBalance.decimals)} ${sym}`
  })()

  const canSwap =
    isConnected &&
    !wrongNetwork &&
    !quoteLoading &&
    !!receiveFormatted &&
    !!sellAmountInput.trim()

  const sellAmountWei = (() => {
    const raw = sellAmountInput.trim()
    if (!raw) return null
    try {
      return parseUnits(raw, sellToken.decimals)
    } catch {
      return null
    }
  })()

  const tokenBalanceWei = walletBalance?.value ?? 0n
  const gasBalanceWei = nativeGasBalance?.value ?? 0n
  const missingAmount = !sellAmountInput.trim() || sellAmountWei == null || sellAmountWei <= 0n
  const insufficientTokenBalance =
    !missingAmount && sellAmountWei != null && tokenBalanceWei < sellAmountWei
  const insufficientGasFee = sellIsNative
    ? !missingAmount &&
      sellAmountWei != null &&
      gasBalanceWei < sellAmountWei + dynamicNativeReserveWei
    : gasBalanceWei < dynamicNativeReserveWei

  const highPriceImpactThresholdPct = priceImpactWarnPct
  const maxSwapUsd = Number(import.meta.env.VITE_SWAP_MAX_USD ?? 100000)
  const quoteInUsdNum = Number.parseFloat(quoteAmountInUsd || '')
  const abnormalTxValue =
    Number.isFinite(quoteInUsdNum) &&
    quoteInUsdNum > 0 &&
    Number.isFinite(maxSwapUsd) &&
    maxSwapUsd > 0 &&
    quoteInUsdNum > maxSwapUsd
  
  // Calculate price impact - prefer router-calculated reserves, then USD notionals.
  // Raw token amount fallback is intentionally avoided for different assets because
  // it compares nominal units (e.g. ETH vs ESTF) and can hide real pool depletion.
  const impactPct = useMemo(() => {
    if (quotePriceImpact) {
      const parsed = parsePriceImpactPercent(quotePriceImpact)
      if (parsed != null) return parsed
    }
    
    if (quoteAmountInUsd && quoteAmountOutUsd) {
      return priceImpactPercentFromUsd(quoteAmountInUsd, quoteAmountOutUsd)
    }

    return null
  }, [quotePriceImpact, quoteAmountInUsd, quoteAmountOutUsd])
      
  const extremePriceImpact =
    impactPct != null &&
    Number.isFinite(impactPct) &&
    impactPct >= 50
  const highPriceImpact =
    impactPct != null &&
    Number.isFinite(impactPct) &&
    impactPct >= highPriceImpactThresholdPct

  const preflightError = missingAmount
    ? 'Enter amount'
    : !isConnected
      ? 'Connect wallet'
      : wrongNetwork
      ? 'Switch network'
      : insufficientTokenBalance
          ? `Insufficient ${sellToken.symbol}`
          : insufficientGasFee
            ? 'Insufficient gas'
            : abnormalTxValue
              ? 'Amount too large'
              : extremePriceImpact
                ? 'Price impact too high'
                : highPriceImpact
                  ? `Price impact: ${impactPct?.toFixed(2)}%`
                  : quoteError?.toLowerCase().includes('degraded')
                    ? 'Provider degraded'
                    : null

  const canSwapFinal = canSwap && !preflightError && !nativeGasLoading

  /** Uniswap-style token selector button */
  const tokenSelectorBtnClass =
    'group flex h-9 shrink-0 items-center gap-1.5 rounded-2xl bg-uni-surface-3 px-2 pr-2.5 text-base font-semibold text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40'

  /** Uniswap-style input shell */
  const shell =
    'rounded-2xl bg-uni-surface p-4'

  const receiveMetaRight = quoteLoading ? (
    <span className="flex items-center gap-1 text-[11px] font-medium text-uni-pink/90">
      <Loader2 className="h-3 w-3 animate-spin" />
      Quoting
    </span>
  ) : null

  const openConfirm = useCallback(() => {
    if (!canSwapFinal || isWorking) return
    setConfirmOpen(true)
  }, [canSwapFinal, isWorking])

  const handleConfirmSwap = useCallback(() => {
    setConfirmOpen(false)
    void submitSwap()
  }, [submitSwap])

  return (
    <>
      <SwapConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSwap}
        chainId={chainIdForTokens}
      />
      <TokenSelector
        open={sellPicker}
        onClose={() => setSellPicker(false)}
        onSelect={setSellToken}
        exclude={buyToken.address}
        chainId={chainIdForTokens}
      />
      <TokenSelector
        open={buyPicker}
        onClose={() => setBuyPicker(false)}
        onSelect={setBuyToken}
        exclude={sellToken.address}
        chainId={chainIdForTokens}
      />

      <motion.div
        layoutId="eonswap-card"
        className="relative w-full max-w-[min(100%,420px)] overflow-hidden rounded-3xl border border-uni-border bg-uni-bg shadow-uni-card"
      >
        {/* Uniswap-style gradient glow */}
        <div
          className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-uni-pink/[0.08] blur-[100px]"
          aria-hidden
        />

        <header className="relative flex items-center justify-between gap-3 px-4 py-4">
          <h2 className="text-lg font-medium text-white">
            Swap
          </h2>
          <SlippageSettings disabled={wrongNetwork} />
        </header>

        <div className="flex flex-col gap-1 px-2 pb-2">
          <div className={shell}>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  You pay
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-x-2 overflow-hidden text-right">
                  <span
                    className={`min-w-0 truncate text-sm text-neutral-400 ${balanceLoading ? 'animate-pulse' : ''}`}
                    title={balanceDisplay}
                  >
                    Balance: {balanceDisplay}
                  </span>
                  <button
                    type="button"
                    disabled={maxDisabled}
                    onClick={applyMaxSell}
                    className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-semibold uppercase transition ${maxBtnClass}`}
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={sellAmountInput}
                  onChange={(e) => setSellAmountInput(e.target.value)}
                  disabled={wrongNetwork}
                  className="min-h-[2.5rem] min-w-0 flex-1 truncate bg-transparent text-[2rem] font-medium leading-none text-white placeholder:text-neutral-600 outline-none disabled:opacity-40"
                />
                <button
                  type="button"
                  disabled={wrongNetwork}
                  onClick={() => setSellPicker(true)}
                  className={tokenSelectorBtnClass}
                >
                  <TokenLogo
                    chainId={chainIdForTokens}
                    token={sellToken}
                    size="sm"
                  />
                  <span className="min-w-0 truncate">
                    {sellToken.symbol}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center py-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <button
                type="button"
                disabled={wrongNetwork}
                onClick={flipTokens}
                className="flex h-10 w-10 items-center justify-center rounded-xl border-4 border-uni-bg bg-uni-surface-2 text-neutral-400 transition hover:bg-uni-surface-3 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Flip tokens"
              >
                <ArrowDownUp className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className={shell}>
            <div className="flex flex-col gap-2">
              <div className="flex min-h-[22px] items-center justify-between gap-2">
                <span className="text-sm text-neutral-400">
                  You receive
                </span>
                <div className="flex items-center justify-end text-sm">
                  {receiveMetaRight}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex min-h-[2.5rem] min-w-0 flex-1 items-center truncate text-[2rem] font-medium leading-none text-white">
                  {receiveFormatted || (
                    <span className="text-neutral-600">0</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={wrongNetwork}
                  onClick={() => setBuyPicker(true)}
                  className={tokenSelectorBtnClass}
                >
                  <TokenLogo
                    chainId={chainIdForTokens}
                    token={buyToken}
                    size="sm"
                  />
                  <span className="min-w-0 truncate">
                    {buyToken.symbol}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Quote details section */}
          <div className="flex min-h-[18rem] flex-col gap-2 px-2 pt-1">
            {quoteError?.toLowerCase().includes('degraded') ? (
              <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
                Routing provider is degraded. Retry policy applied automatically.
              </p>
            ) : null}
            <div className="min-h-[5rem] shrink-0">
              <BestRoute />
            </div>
            <div className="max-h-[12rem] min-h-[12rem] flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
              <SwapQuoteDetails wrongNetwork={wrongNetwork} />
            </div>
          </div>

          {/* Uniswap-style pink CTA button */}
          <div className="px-2 pb-6 pt-5">
            <button
              type="button"
              disabled={!canSwapFinal || isWorking}
              onClick={openConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-uni-pink py-4 text-lg font-semibold text-white shadow-glow transition enabled:hover:bg-uni-pink-light enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-uni-surface-3 disabled:text-neutral-500 disabled:shadow-none"
            >
              {isWorking ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Working…
                </>
              ) : wrongNetwork ? (
                `Switch to ${base.name}`
              ) : preflightError ? (
                preflightError
              ) : (
                actionLabel
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
