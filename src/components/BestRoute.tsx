import { GitBranch } from 'lucide-react'
import { useEonSwapStore } from '../store/useEonSwapStore'

export function BestRoute() {
  const routeSources = useEonSwapStore((s) => s.routeSources)
  const quoteLoading = useEonSwapStore((s) => s.quoteLoading)
  const quoteError = useEonSwapStore((s) => s.quoteError)
  const sellAmountInput = useEonSwapStore((s) => s.sellAmountInput)
  const hasInput = sellAmountInput.trim().length > 0

  if (quoteError && !quoteLoading) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
        <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-300">
          <GitBranch className="h-3 w-3" />
          Route
        </div>
        <p className="line-clamp-3 text-[12px] leading-snug text-rose-200">
          No quote for this trade. See trade details below for the full message.
        </p>
      </div>
    )
  }

  if (quoteLoading) {
    return (
      <div className="rounded-xl border border-uni-border bg-uni-surface-2 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <GitBranch className="h-3 w-3 text-uni-pink" />
          Best route
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-neutral-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-uni-pink" />
          Fetching route…
        </div>
      </div>
    )
  }

  if (!routeSources.length) {
    return (
      <div className="rounded-xl border border-uni-border bg-uni-surface-2 px-3 py-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          <GitBranch className="h-3 w-3" />
          Best route
        </div>
        <p className="mt-2 line-clamp-3 text-[12px] leading-snug text-neutral-600">
          {hasInput
            ? 'No route returned for this pair or amount. Try another token or size.'
            : 'Liquidity path appears here once you enter an amount to swap.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-uni-pink/20 bg-uni-pink/5 px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-uni-pink-light">
        <GitBranch className="h-3 w-3" />
        Best route
      </div>
      <p
        className="line-clamp-2 text-[12px] leading-snug text-neutral-200"
        title={routeSources.join(' · ')}
      >
        <span className="text-neutral-500">Liquidity: </span>
        {routeSources.join(' · ')}
      </p>
    </div>
  )
}
