import type { ReactNode } from 'react'
import { formatTokenAmountUi } from '../lib/format'
import {
  formatPriceImpactLabel,
  formatUsdApprox,
  priceImpactPercentFromUsd,
  totalNetworkFeeUsd,
} from '../lib/quoteDisplay'
import { formatSlippagePercent } from '../lib/slippage'
import { useEonSwapStore } from '../store/useEonSwapStore'

function Row({
  label,
  value,
  loading,
  valueClassName,
}: {
  label: string
  value: ReactNode
  loading?: boolean
  valueClassName?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span
        className={`min-w-0 truncate text-right font-medium tabular-nums text-slate-100 ${valueClassName ?? ''} ${loading ? 'animate-pulse text-slate-500' : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

type Props = {
  wrongNetwork: boolean
}

export function SwapQuoteDetails({ wrongNetwork }: Props) {
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const receiveFormatted = useEonSwapStore((s) => s.receiveFormatted)
  const quoteLoading = useEonSwapStore((s) => s.quoteLoading)
  const quoteError = useEonSwapStore((s) => s.quoteError)
  const slippageToleranceBps = useEonSwapStore((s) => s.slippageToleranceBps)
  const buyToken = useEonSwapStore((s) => s.buyToken)
  const quoteAmountInUsd = useEonSwapStore((s) => s.quoteAmountInUsd)
  const quoteAmountOutUsd = useEonSwapStore((s) => s.quoteAmountOutUsd)
  const quoteGasUsd = useEonSwapStore((s) => s.quoteGasUsd)
  const quoteL1FeeUsd = useEonSwapStore((s) => s.quoteL1FeeUsd)
  const quoteAmountOutWei = useEonSwapStore((s) => s.quoteAmountOutWei)

  const hasInput = sellAmountInput.trim().length > 0
  const showLoading = quoteLoading && hasInput && !receiveFormatted
  const showEnterAmountHint = !wrongNetwork && !hasInput
  const hasResolvedQuote =
    hasInput && !!receiveFormatted && !quoteLoading && !quoteError

  let minReceivedLabel: string | null = null
  if (hasResolvedQuote && quoteAmountOutWei) {
    try {
      const out = BigInt(quoteAmountOutWei)
      const bps = BigInt(slippageToleranceBps)
      const minWei = (out * (10000n - bps)) / 10000n
      minReceivedLabel = `${formatTokenAmountUi(minWei, buyToken.decimals)} ${buyToken.symbol}`
    } catch {
      minReceivedLabel = null
    }
  }

  const impactPct =
    hasResolvedQuote && quoteAmountInUsd && quoteAmountOutUsd
      ? priceImpactPercentFromUsd(quoteAmountInUsd, quoteAmountOutUsd)
      : null

  const priceImpactLabel =
    hasResolvedQuote && quoteAmountInUsd && quoteAmountOutUsd
      ? formatPriceImpactLabel(quoteAmountInUsd, quoteAmountOutUsd)
      : null

  const networkTotal =
    hasResolvedQuote && quoteGasUsd
      ? formatUsdApprox(totalNetworkFeeUsd(quoteGasUsd, quoteL1FeeUsd))
      : null

  return (
    <div className="rounded-lg border border-white/[0.07] bg-[#080918]/80 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 pt-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Trade details
        </p>
        {wrongNetwork && (
          <span className="text-[10px] font-medium text-amber-400/90">
            Wrong network
          </span>
        )}
      </div>
      <div className="divide-y divide-white/[0.05]">
        <Row
          label="Price impact"
          loading={showLoading}
          value={
            wrongNetwork || !hasInput
              ? '—'
              : showLoading
                ? '…'
                : quoteError
                  ? '—'
                  : priceImpactLabel ?? '—'
          }
          valueClassName={
            impactPct != null && impactPct > 1
              ? 'text-amber-400/95'
              : undefined
          }
        />
        <Row
          label="Max. slippage"
          loading={false}
          value={
            wrongNetwork ? '—' : formatSlippagePercent(slippageToleranceBps)
          }
        />
        <Row
          label="Network cost (est.)"
          loading={showLoading}
          value={
            wrongNetwork || !hasInput
              ? '—'
              : showLoading
                ? '…'
                : quoteError
                  ? '—'
                  : networkTotal ?? '—'
          }
        />
        <Row
          label="Min. received"
          loading={showLoading}
          value={
            wrongNetwork || !hasInput
              ? '—'
              : showLoading
                ? '…'
                : quoteError
                  ? '—'
                  : minReceivedLabel ?? '—'
          }
        />
      </div>
      {quoteError && !quoteLoading && hasInput && !wrongNetwork && (
        <p className="mt-2 rounded-md border border-red-500/15 bg-red-500/[0.08] px-2.5 py-1.5 text-[10px] leading-snug text-red-200/90">
          {quoteError}
        </p>
      )}
      <p className="mt-2 min-h-[2.75rem] text-[10px] leading-snug text-slate-600">
        {showEnterAmountHint && (
          <>
            Enter an amount to see impact, network cost, and minimum received.
            {' '}
          </>
        )}
        Price impact uses Kyber USD notionals. Network cost is an estimate and
        can change with gas.
      </p>
    </div>
  )
}
