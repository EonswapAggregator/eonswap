import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Copy, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatParsedAmountInput, formatTokenAmountUi } from '../lib/format'
import {
  formatUsdApprox,
  parsePriceImpactPercent,
  priceImpactLabelFromPercent,
  priceImpactPercentFromUsd,
  totalNetworkFeeUsd,
} from '../lib/quoteDisplay'
import { formatSlippagePercent } from '../lib/slippage'
import { getEonChain } from '../lib/chains'
import { useEonSwapStore } from '../store/useEonSwapStore'
import { TokenLogo } from './TokenLogo'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  chainId: number
}

export function SwapConfirmModal({
  open,
  onClose,
  onConfirm,
  chainId,
}: Props) {
  const [copiedAddress, setCopiedAddress] = useState(false)
  const sellToken = useEonSwapStore((s) => s.sellToken)
  const buyToken = useEonSwapStore((s) => s.buyToken)
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const receiveFormatted = useEonSwapStore((s) => s.receiveFormatted)
  const slippageToleranceBps = useEonSwapStore((s) => s.slippageToleranceBps)
  const quoteRouterAddress = useEonSwapStore((s) => s.quoteRouterAddress)
  const quoteAmountInUsd = useEonSwapStore((s) => s.quoteAmountInUsd)
  const quoteAmountOutUsd = useEonSwapStore((s) => s.quoteAmountOutUsd)
  const quoteAmountOutWei = useEonSwapStore((s) => s.quoteAmountOutWei)
  const quoteGasUsd = useEonSwapStore((s) => s.quoteGasUsd)
  const quoteL1FeeUsd = useEonSwapStore((s) => s.quoteL1FeeUsd)
  const quotePriceImpact = useEonSwapStore((s) => s.quotePriceImpact)
  const routeSources = useEonSwapStore((s) => s.routeSources)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const minReceivedLabel = useMemo(() => {
    if (!quoteAmountOutWei) return null
    try {
      const out = BigInt(quoteAmountOutWei)
      const bps = BigInt(slippageToleranceBps)
      const minWei = (out * (10000n - bps)) / 10000n
      return `${formatTokenAmountUi(minWei, buyToken.decimals)} ${buyToken.symbol}`
    } catch {
      return null
    }
  }, [quoteAmountOutWei, slippageToleranceBps, buyToken.decimals, buyToken.symbol])

  const networkFeeLabel = useMemo(() => {
    if (!quoteGasUsd) return null
    return formatUsdApprox(totalNetworkFeeUsd(quoteGasUsd, quoteL1FeeUsd))
  }, [quoteGasUsd, quoteL1FeeUsd])

  const priceImpactPct = useMemo(() => {
    if (quotePriceImpact) {
      const parsed = parsePriceImpactPercent(quotePriceImpact)
      if (parsed != null) return parsed
    }

    if (quoteAmountInUsd && quoteAmountOutUsd) {
      return priceImpactPercentFromUsd(quoteAmountInUsd, quoteAmountOutUsd)
    }

    return null
  }, [quotePriceImpact, quoteAmountInUsd, quoteAmountOutUsd])

  const priceImpactLabel = useMemo(() => {
    if (priceImpactPct == null) return null
    return priceImpactLabelFromPercent(priceImpactPct)
  }, [priceImpactPct])

  const isHighPriceImpact = priceImpactPct != null && priceImpactPct >= 5
  const isExtremeImpact = priceImpactPct != null && priceImpactPct >= 50

  const chainName = getEonChain(chainId)?.name ?? `Chain ${chainId}`

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="swap-confirm-root"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-confirm-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-uni-border bg-uni-surface shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-uni-border px-4 py-3">
              <h2
                id="swap-confirm-title"
                className="text-sm font-semibold text-white"
              >
                Confirm swap
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-neutral-400 transition hover:bg-uni-surface-2 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[min(70vh,420px)] overflow-y-auto px-4 py-4">
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex flex-col items-center gap-1">
                  <TokenLogo chainId={chainId} token={sellToken} size="md" />
                  <span className="text-xs font-medium text-neutral-400">
                    {sellToken.symbol}
                  </span>
                </div>
                <span className="text-lg text-neutral-600">→</span>
                <div className="flex flex-col items-center gap-1">
                  <TokenLogo chainId={chainId} token={buyToken} size="md" />
                  <span className="text-xs font-medium text-neutral-400">
                    {buyToken.symbol}
                  </span>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 rounded-xl border border-uni-border bg-uni-surface-2 px-3 py-3 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">You pay</dt>
                  <dd className="text-right font-medium tabular-nums text-white">
                    {formatParsedAmountInput(
                      sellAmountInput,
                      sellToken.decimals,
                    ) ?? sellAmountInput.trim()}{' '}
                    {sellToken.symbol}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">You receive (est.)</dt>
                  <dd className="text-right font-medium tabular-nums text-uni-pink-light">
                    {receiveFormatted} {buyToken.symbol}
                  </dd>
                </div>
                {minReceivedLabel ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-500">Min. received</dt>
                    <dd className="text-right font-medium tabular-nums text-neutral-200">
                      {minReceivedLabel}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-neutral-500">Max. slippage</dt>
                  <dd className="text-right font-medium text-neutral-200">
                    {formatSlippagePercent(slippageToleranceBps)}
                  </dd>
                </div>
                {priceImpactLabel ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-500">Price impact</dt>
                    <dd
                      className={`text-right font-medium tabular-nums ${
                        isHighPriceImpact
                          ? 'text-amber-400/90'
                          : 'text-neutral-200'
                      }`}
                    >
                      {priceImpactLabel}
                    </dd>
                  </div>
                ) : null}
                {networkFeeLabel ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-500">Network cost (est.)</dt>
                    <dd className="text-right font-medium tabular-nums text-neutral-200">
                      {networkFeeLabel}
                    </dd>
                  </div>
                ) : null}
                {routeSources.length > 0 ? (
                  <div className="border-t border-uni-border pt-2.5">
                    <p className="text-neutral-500">Route</p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                      {routeSources.join(' · ')}
                    </p>
                  </div>
                ) : null}
                {quoteRouterAddress ? (
                  <div className="border-t border-uni-border pt-2.5">
                    <p className="text-neutral-500">Router</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <code className="flex-1 truncate rounded bg-uni-bg px-2 py-1.5 text-[11px] font-mono text-neutral-300 leading-none">
                        {quoteRouterAddress}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(quoteRouterAddress)
                          setCopiedAddress(true)
                          setTimeout(() => setCopiedAddress(false), 1500)
                        }}
                        className="shrink-0 rounded p-1 text-neutral-400 transition hover:bg-uni-surface-3 hover:text-white"
                        title="Copy address"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    {copiedAddress ? (
                      <p className="mt-1 text-[10px] text-emerald-400">Copied!</p>
                    ) : null}
                  </div>
                ) : null}
              </dl>

              {isExtremeImpact ? (
                <div className="mt-3 flex gap-2 rounded-lg border border-red-600/40 bg-red-600/15 px-3 py-2 text-[11px] leading-snug text-red-200/95">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500/90" />
                  <p>
                    <span className="font-semibold">Extreme price impact ({priceImpactLabel})!</span>{' '}
                    This trade may be impossible or result in significant loss. The pool may not
                    have sufficient liquidity. <span className="font-semibold">Do not proceed unless you understand the risk.</span>
                  </p>
                </div>
              ) : isHighPriceImpact ? (
                <div className="mt-3 flex gap-2 rounded-lg border border-orange-500/30 bg-orange-500/15 px-3 py-2 text-[11px] leading-snug text-orange-100/90">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400/90" />
                  <p>
                    High price impact detected ({priceImpactLabel}). Review the
                    route and consider adjusting your trade amount.
                  </p>
                </div>
              ) : null}

              <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-100/90">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" />
                <p>
                  After you confirm, your wallet will open for approval and/or
                  the swap transaction. You can reject there to cancel. Network:{' '}
                  <span className="font-medium text-white">{chainName}</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-2 border-t border-uni-border bg-uni-surface-2 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-uni-border bg-uni-surface py-3 text-sm font-semibold text-neutral-200 transition hover:bg-uni-surface-3"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-uni-pink py-3 text-sm font-semibold text-white transition hover:bg-uni-pink-light"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
