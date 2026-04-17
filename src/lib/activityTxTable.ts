/** Shared explorer-style activity tables (session swaps + wallet on-chain). */

export const activityTableScrollClass =
  'max-h-[min(75vh,720px)] min-h-0 flex-1 overflow-x-auto overflow-y-auto overscroll-contain'

export const activityTableClass =
  'w-full min-w-[960px] border-collapse text-left text-[12px]'

export const activityTheadRowClass =
  'sticky top-0 z-[1] border-b border-uni-border bg-uni-bg/98 backdrop-blur-md'

export const activityThClass =
  'whitespace-nowrap px-3 py-3 font-semibold uppercase tracking-[0.08em] text-neutral-500'

export const activityTdClass = 'align-middle px-3 py-3'

export const activityTrClass =
  'border-b border-uni-border transition-colors hover:bg-white/[0.02]'

export const activityCardShellClass =
  'flex min-w-0 w-full max-w-full flex-col overflow-hidden rounded-3xl border border-uni-border bg-uni-surface shadow-uni-card'

export const activityTableToolbarClass =
  'flex min-w-0 flex-col gap-2 border-b border-uni-border bg-uni-bg/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-5'

export const activityToolbarTitleClass =
  'text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500'

export const activityToolbarMetaClass =
  'font-mono text-[11px] text-neutral-600'

/** Same short hash in both tables (8 + … + 6). */
export function shortTxHash(hash: string) {
  if (hash.length < 18) return hash
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

/** Relative age from event time in milliseconds (live clock). */
export function formatActivityAge(eventMs: number, nowMs: number) {
  const sec = Math.floor((nowMs - eventMs) / 1000)
  if (sec < 8) return 'just now'
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`
  return new Date(eventMs).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function methodPillClass() {
  return 'inline-flex rounded-md border border-uni-border bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-neutral-400'
}

export function networkPillClass() {
  return 'whitespace-nowrap rounded-lg border border-uni-border bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-neutral-400'
}
