import type { ReactNode } from 'react'
import { parseUnits } from 'viem'
import { formatTokenAmountUi } from '../lib/format'
import {
  formatPriceImpactLabel,
  formatUsdApprox,
  parsePriceImpactPercent,
  priceImpactLabelFromPercent,
  priceImpactPercentFromAmounts,
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
      <span className="shrink-0 text-neutral-500">{label}</span>
      <span
        className={`min-w-0 truncate text-right font-medium tabular-nums text-neutral-100 ${valueClassName ?? ''} ${loading ? 'animate-pulse text-neutral-500' : ''}`}
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
  const sellToken = useEonSwapStore((s) => s.sellToken)
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
  const quotePriceImpact = useEonSwapStore((s) => s.quotePriceImpact)

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

  // Calculate price impact - prefer router-calculated (from reserves), then USD, then token amounts
  const impactPct = (() => {
    if (!hasResolvedQuote) return null
    
    // Method 1: Router-calculated from reserves (most accurate for AMM)
    if (quotePriceImpact) {
      const parsed = parsePriceImpactPercent(quotePriceImpact)
      if (parsed != null) return parsed
    }
    
    // Method 2: USD-based calculation (accurate when prices available)
    if (quoteAmountInUsd && quoteAmountOutUsd) {
      return priceImpactPercentFromUsd(quoteAmountInUsd, quoteAmountOutUsd)
    }
    
    // Method 3: Token amount-based calculation (fallback)
    // ✅ FIX (L-1): Convert formatted input to wei string
    if (sellToken.address.toLowerCase() === buyToken.address.toLowerCase() && sellAmountInput && quoteAmountOutWei) {
      try {
        const sellAmountWei = parseUnits(sellAmountInput.trim(), sellToken.decimals)
        return priceImpactPercentFromAmounts(
          sellAmountWei.toString(),
          quoteAmountOutWei,
          sellToken.decimals,
          buyToken.decimals,
        )
      } catch {
        return null
      }
    }
    
    return null
  })()

  const priceImpactLabel =
    impactPct != null
      ? priceImpactLabelFromPercent(impactPct)
      : hasResolvedQuote && quoteAmountInUsd && quoteAmountOutUsd
        ? formatPriceImpactLabel(quoteAmountInUsd, quoteAmountOutUsd)
        : null

  const networkTotal =
    hasResolvedQuote && quoteGasUsd
      ? formatUsdApprox(totalNetworkFeeUsd(quoteGasUsd, quoteL1FeeUsd))
      : null

  return (
    <div className="rounded-xl border border-uni-border bg-uni-surface-2 px-3 py-2.5">
      <div className="flex items-center justify-between border-b border-uni-border pb-2 pt-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
          Trade details
        </p>
        {wrongNetwork && (
          <span className="text-[10px] font-medium text-amber-400/90">
            Wrong network
          </span>
        )}
      </div>
      <div className="divide-y divide-uni-border">
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
        <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[10px] leading-snug text-rose-200">
          {quoteError}
        </p>
      )}
      <p className="mt-2 min-h-[2.75rem] text-[10px] leading-snug text-neutral-600">
        {showEnterAmountHint && (
          <>
            Enter an amount to see impact, network cost, and minimum received.
            {' '}
          </>
        )}
        Price impact uses route reserves when available, then USD notionals as
        fallback. Network cost is an estimate and can change with gas conditions.
      </p>
    </div>
  )
}
