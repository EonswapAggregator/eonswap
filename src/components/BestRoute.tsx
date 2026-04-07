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
      <div className="rounded-lg border border-red-500/20 bg-red-500/[0.07] px-3 py-2.5">
        <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-300/90">
          <GitBranch className="h-3 w-3" />
          Route
        </div>
        <p className="line-clamp-3 text-[12px] leading-snug text-red-200/90">
          No quote for this trade. See trade details below for the full message.
        </p>
      </div>
    )
  }

  if (quoteLoading) {
    return (
      <div className="rounded-lg border border-white/[0.07] bg-[#080918]/80 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <GitBranch className="h-3 w-3 text-eon-blue" />
          Best route
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-[12px] text-slate-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-eon-blue" />
          Fetching route…
        </div>
      </div>
    )
  }

  if (!routeSources.length) {
    return (
      <div className="rounded-lg border border-white/[0.07] bg-[#080918]/80 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <GitBranch className="h-3 w-3" />
          Best route
        </div>
        <p className="mt-2 line-clamp-3 text-[12px] leading-snug text-slate-600">
          {hasInput
            ? 'No route returned for this pair or amount. Try another token or size.'
            : 'Liquidity path appears here once you enter an amount to swap.'}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-cyan-500/15 bg-gradient-to-br from-cyan-500/[0.06] to-eon-blue/[0.04] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300/90">
        <GitBranch className="h-3 w-3" />
        Best route
      </div>
      <p
        className="line-clamp-2 text-[12px] leading-snug text-slate-200/95"
        title={routeSources.join(' · ')}
      >
        <span className="text-slate-500">Liquidity: </span>
        {routeSources.join(' · ')}
      </p>
    </div>
  )
}
