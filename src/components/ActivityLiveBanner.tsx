import { useAccount, useBlockNumber } from 'wagmi'
import { getEonChain, isSupportedChain } from '../lib/chains'

export function ActivityLiveBanner() {
  const { address, chainId, isConnected } = useAccount()
  const ok =
    isConnected &&
    address &&
    chainId != null &&
    isSupportedChain(chainId)

  const { data: block } = useBlockNumber({
    chainId: ok ? chainId : undefined,
    watch: true,
    query: { enabled: ok },
  })

  if (!ok) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#070818]/80 px-4 py-3 text-pretty text-sm leading-relaxed text-slate-500">
        Connect your wallet on a supported network to see the live chain head
        (like a wallet activity feed).
      </div>
    )
  }

  const name = getEonChain(chainId)?.name ?? `Chain ${chainId}`

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.06] px-4 py-3 text-[13px] text-slate-300">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
      </span>
      <span className="font-semibold text-emerald-200/95">Live</span>
      <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
      <span className="text-slate-400">
        <span className="text-slate-500">Network</span>{' '}
        <span className="font-medium text-slate-200">{name}</span>
      </span>
      <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
      <span className="font-mono tabular-nums text-slate-200">
        <span className="text-slate-500">Latest block</span>{' '}
        {block != null ? (
          <span className="text-eon-blue">#{block.toString()}</span>
        ) : (
          <span className="text-slate-500">…</span>
        )}
      </span>
    </div>
  )
}
