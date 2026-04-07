import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { formatParsedAmountInput, formatTokenAmountUi } from '../lib/format'
import { formatUsdApprox, totalNetworkFeeUsd } from '../lib/quoteDisplay'
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
  const sellToken = useEonSwapStore((s) => s.sellToken)
  const buyToken = useEonSwapStore((s) => s.buyToken)
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const receiveFormatted = useEonSwapStore((s) => s.receiveFormatted)
  const slippageToleranceBps = useEonSwapStore((s) => s.slippageToleranceBps)
  const quoteAmountOutWei = useEonSwapStore((s) => s.quoteAmountOutWei)
  const quoteGasUsd = useEonSwapStore((s) => s.quoteGasUsd)
  const quoteL1FeeUsd = useEonSwapStore((s) => s.quoteL1FeeUsd)
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
            className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[#0f1028]/98 shadow-2xl shadow-black/50 backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2
                id="swap-confirm-title"
                className="text-sm font-semibold text-white"
              >
                Confirm swap
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[min(70vh,420px)] overflow-y-auto px-4 py-4">
              <div className="flex items-center justify-center gap-3 py-2">
                <div className="flex flex-col items-center gap-1">
                  <TokenLogo chainId={chainId} token={sellToken} size="md" />
                  <span className="text-xs font-medium text-slate-400">
                    {sellToken.symbol}
                  </span>
                </div>
                <span className="text-lg text-slate-600">→</span>
                <div className="flex flex-col items-center gap-1">
                  <TokenLogo chainId={chainId} token={buyToken} size="md" />
                  <span className="text-xs font-medium text-slate-400">
                    {buyToken.symbol}
                  </span>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3 text-[13px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">You pay</dt>
                  <dd className="text-right font-medium tabular-nums text-white">
                    {formatParsedAmountInput(
                      sellAmountInput,
                      sellToken.decimals,
                    ) ?? sellAmountInput.trim()}{' '}
                    {sellToken.symbol}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">You receive (est.)</dt>
                  <dd className="text-right font-medium tabular-nums text-cyan-200/95">
                    {receiveFormatted} {buyToken.symbol}
                  </dd>
                </div>
                {minReceivedLabel ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Min. received</dt>
                    <dd className="text-right font-medium tabular-nums text-slate-200">
                      {minReceivedLabel}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Max. slippage</dt>
                  <dd className="text-right font-medium text-slate-200">
                    {formatSlippagePercent(slippageToleranceBps)}
                  </dd>
                </div>
                {networkFeeLabel ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Network cost (est.)</dt>
                    <dd className="text-right font-medium tabular-nums text-slate-200">
                      {networkFeeLabel}
                    </dd>
                  </div>
                ) : null}
                {routeSources.length > 0 ? (
                  <div className="border-t border-white/[0.06] pt-2.5">
                    <p className="text-slate-500">Route</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      {routeSources.join(' · ')}
                    </p>
                  </div>
                ) : null}
              </dl>

              <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-100/90">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" />
                <p>
                  After you confirm, your wallet will open for approval and/or
                  the swap transaction. You can reject there to cancel. Network:{' '}
                  <span className="font-medium text-white">{chainName}</span>.
                </p>
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/10 bg-black/20 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08]"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-500 to-eon-blue py-3 text-sm font-semibold text-[#05060f] transition hover:brightness-[1.05]"
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
