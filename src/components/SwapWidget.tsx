import { motion } from 'framer-motion'
import { ArrowDownUp, ChevronDown, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { parseUnits } from 'viem'
import { useAccount, useBalance, useChainId, useEstimateFeesPerGas } from 'wagmi'
import { useKyberQuote } from '../hooks/useKyberQuote'
import { useSwapSubmit } from '../hooks/useSwapSubmit'
import { formatBalanceCompact, formatMaxSellInput } from '../lib/format'
import { getEonChain, isSupportedChain } from '../lib/chains'
import { isNativeToken } from '../lib/tokens'
import { mainnet } from 'wagmi/chains'
import { useEonSwapStore } from '../store/useEonSwapStore'
import { priceImpactPercentFromUsd } from '../lib/quoteDisplay'
import { defaultSlippageBpsByContext } from '../lib/slippage'
import { BestRoute } from './BestRoute'
import { SlippageSettings } from './SlippageSettings'
import { SwapConfirmModal } from './SwapConfirmModal'
import { SwapQuoteDetails } from './SwapQuoteDetails'
import { TokenLogo } from './TokenLogo'
import { TokenSelector } from './TokenSelector'

const SWAP_GAS_LIMIT_ESTIMATE = 300_000n
const DEFAULT_RESERVE_WEI = 1_500_000_000_000_000n // 0.0015

function nativeReserveFloorWei(chainId?: number): bigint {
  switch (chainId) {
    case 56: // BSC
    case 137: // Polygon
      return 300_000_000_000_000n // 0.0003
    case 8453: // Base
    case 42161: // Arbitrum
    case 10: // Optimism
      return 500_000_000_000_000n // 0.0005
    case 1: // Ethereum
    default:
      return DEFAULT_RESERVE_WEI
  }
}

export function SwapWidget() {
  useKyberQuote()
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
  const quoteLoading = useEonSwapStore((s) => s.quoteLoading)
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
    !isSupportedChain(accountChainId)

  const chainIdForTokens =
    isConnected && accountChainId != null && isSupportedChain(accountChainId)
      ? accountChainId
      : isSupportedChain(walletDefaultChain)
        ? walletDefaultChain
        : mainnet.id

  const balanceChainId =
    isConnected && accountChainId != null && isSupportedChain(accountChainId)
      ? accountChainId
      : undefined

  const sellIsNative = isNativeToken(sellToken.address)
  const activeChain = balanceChainId != null ? getEonChain(balanceChainId) : null
  const lastAutoSlippageRef = useRef<number | null>(null)

  useEffect(() => {
    const recommended = defaultSlippageBpsByContext({
      chainId: chainIdForTokens,
      sellIsNative,
      buyIsNative: isNativeToken(buyToken.address),
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
    buyToken.address,
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
    const estimated = (feePerGas * SWAP_GAS_LIMIT_ESTIMATE * 12n) / 10n // +20% buffer
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
    ? 'cursor-not-allowed border-white/[0.06] text-slate-600'
    : 'border-cyan-500/30 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/10'

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

  const gasSymbol =
    nativeGasBalance?.symbol ??
    activeChain?.nativeCurrency.symbol ??
    'native token'

  const highPriceImpactThresholdPct = Number(import.meta.env.VITE_PRICE_IMPACT_WARN_PCT ?? 5)
  const maxSwapUsd = Number(import.meta.env.VITE_SWAP_MAX_USD ?? 100000)
  const quoteInUsdNum = Number.parseFloat(quoteAmountInUsd || '')
  const abnormalTxValue =
    Number.isFinite(quoteInUsdNum) &&
    quoteInUsdNum > 0 &&
    Number.isFinite(maxSwapUsd) &&
    maxSwapUsd > 0 &&
    quoteInUsdNum > maxSwapUsd
  const impactPct = priceImpactPercentFromUsd(quoteAmountInUsd, quoteAmountOutUsd)
  const highPriceImpact =
    impactPct != null &&
    Number.isFinite(impactPct) &&
    impactPct >= highPriceImpactThresholdPct

  const preflightError = !isConnected
    ? 'Connect wallet'
    : wrongNetwork
      ? 'Wrong network'
      : missingAmount
        ? 'Enter amount'
        : insufficientTokenBalance
          ? `Insufficient ${sellToken.symbol} balance`
          : insufficientGasFee
            ? `Insufficient ${gasSymbol} for gas`
            : abnormalTxValue
              ? `Tx exceeds safety limit ($${maxSwapUsd.toLocaleString('en-US')})`
              : highPriceImpact
                ? `High price impact (${impactPct?.toFixed(2)}%)`
                : quoteError?.toLowerCase().includes('degraded')
                  ? 'Provider degraded, retry in a moment'
            : null

  const canSwapFinal = canSwap && !preflightError && !nativeGasLoading

  /** Fixed size so pay / receive selectors match regardless of symbol length */
  const tokenSelectorBtnClass =
    'group flex h-10 w-[7.25rem] shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] px-1.5 text-[13px] font-semibold text-white transition hover:border-cyan-500/30 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40'

  const shell =
    'rounded-xl border border-white/[0.08] bg-[#070818]/95 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'

  const receiveMetaRight = quoteLoading ? (
    <span className="flex items-center gap-1 text-[11px] font-medium text-cyan-400/90">
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
        className="relative w-full max-w-[min(100%,392px)] overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#12142e] to-[#0a0b1c] shadow-[0_20px_64px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(0,210,255,0.06)]"
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/[0.07] blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-eon-blue/[0.06] blur-3xl"
          aria-hidden
        />

        <header className="relative flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-white">
              Swap
            </h2>
            <p className="truncate text-[11px] leading-tight text-slate-500">
              Aggregated liquidity
            </p>
          </div>
          <SlippageSettings disabled={wrongNetwork} />
        </header>

        <div className="flex flex-col gap-2.5 px-4 pb-3.5 pt-2.5">
          <div className={shell}>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  You pay
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-x-1.5 overflow-hidden text-right">
                  <span className="shrink-0 text-[11px] text-slate-500">
                    Balance
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[11px] font-semibold tabular-nums text-slate-300 ${balanceLoading ? 'animate-pulse text-slate-500' : ''}`}
                    title={balanceDisplay}
                  >
                    {balanceDisplay}
                  </span>
                  <button
                    type="button"
                    disabled={maxDisabled}
                    onClick={applyMaxSell}
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition ${maxBtnClass}`}
                  >
                    Max
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={sellAmountInput}
                  onChange={(e) => setSellAmountInput(e.target.value)}
                  disabled={wrongNetwork}
                  className="min-h-[2.25rem] min-w-0 flex-1 truncate bg-transparent text-[1.25rem] font-semibold leading-none tracking-tight text-white placeholder:text-slate-600 outline-none disabled:opacity-40"
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
                  <span className="min-w-0 flex-1 truncate text-left">
                    {sellToken.symbol}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-center py-0.5">
            <button
              type="button"
              disabled={wrongNetwork}
              onClick={flipTokens}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.12] bg-[#12142a] text-cyan-400 shadow-md ring-2 ring-[#0a0b1c] transition hover:border-cyan-500/35 hover:bg-[#1a1c36] hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Flip tokens"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          <div className={shell}>
            <div className="flex flex-col gap-1.5">
              <div className="flex min-h-[22px] items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                  You receive
                </span>
                <div className="flex items-center justify-end text-[11px]">
                  {receiveMetaRight}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex min-h-[2.25rem] min-w-0 flex-1 items-center truncate text-[1.25rem] font-semibold leading-none tracking-tight text-slate-100">
                  {receiveFormatted || (
                    <span className="text-slate-600">0</span>
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
                  <span className="min-w-0 flex-1 truncate text-left">
                    {buyToken.symbol}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 group-hover:text-slate-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Reserved height + scroll so filling the form does not grow the card */}
          <div className="flex min-h-[20rem] flex-col gap-1.5 pt-0.5">
            {quoteError?.toLowerCase().includes('degraded') ? (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                Routing provider is degraded. Retry policy applied automatically.
              </p>
            ) : null}
            <div className="min-h-[5.5rem] shrink-0">
              <BestRoute />
            </div>
            <div className="max-h-[15rem] min-h-[14rem] flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
              <SwapQuoteDetails wrongNetwork={wrongNetwork} />
            </div>
          </div>

          <button
            type="button"
            disabled={!canSwapFinal || isWorking}
            onClick={openConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue py-2.5 text-sm font-semibold text-[#05060f] shadow-[0_0_24px_-4px_rgba(34,211,238,0.3)] transition enabled:hover:brightness-[1.05] enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {isWorking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Working…
              </>
            ) : !isConnected ? (
              'Connect wallet'
            ) : wrongNetwork ? (
              'Wrong network'
            ) : preflightError ? (
              preflightError
            ) : (
              'Swap'
            )}
          </button>
        </div>
      </motion.div>
    </>
  )
}
