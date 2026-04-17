/** Slippage tolerance uses basis points (100 = 1%). */
export const DEFAULT_SLIPPAGE_BPS = 50

export const SLIPPAGE_PRESETS_BPS = [10, 50, 100] as const

/** Max slippage allowed (10% = 1000 bps) - protects against catastrophic trades */
export const MAX_SLIPPAGE_BPS = 1000

/** Transaction deadline in minutes */
export const DEFAULT_DEADLINE_MINUTES = 20
export const MIN_DEADLINE_MINUTES = 1
export const MAX_DEADLINE_MINUTES = 60
export const DEADLINE_PRESETS_MINUTES = [10, 20, 30] as const

/** Clamp deadline to valid range (1-60 minutes). */
export function clampDeadlineMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_DEADLINE_MINUTES
  return Math.min(MAX_DEADLINE_MINUTES, Math.max(MIN_DEADLINE_MINUTES, Math.round(minutes)))
}

/** Price impact warning threshold (percentage) */
export const DEFAULT_PRICE_IMPACT_WARN_PCT = 5
export const MIN_PRICE_IMPACT_WARN_PCT = 1
export const MAX_PRICE_IMPACT_WARN_PCT = 20
export const PRICE_IMPACT_PRESETS_PCT = [3, 5, 10] as const

/** Clamp price impact warning to valid range (1-20%). */
export function clampPriceImpactWarnPct(pct: number): number {
  if (!Number.isFinite(pct)) return DEFAULT_PRICE_IMPACT_WARN_PCT
  return Math.min(MAX_PRICE_IMPACT_WARN_PCT, Math.max(MIN_PRICE_IMPACT_WARN_PCT, Math.round(pct)))
}

/** Clamp to a sane range for the UI (0.05% … 10%). */
export function clampSlippageBps(bps: number): number {
  if (!Number.isFinite(bps)) return DEFAULT_SLIPPAGE_BPS
  return Math.min(MAX_SLIPPAGE_BPS, Math.max(5, Math.round(bps)))
}

export function formatSlippagePercent(bps: number): string {
  const pct = bps / 100
  if (pct >= 1) return `${pct.toFixed(pct % 1 === 0 ? 0 : 1)}%`
  if (pct >= 0.1) return `${pct.toFixed(1)}%`
  return `${pct.toFixed(2)}%`
}

/** Parse user input like "0.5" or "1" (percent) → bps */
export function percentInputToBps(raw: string): number | null {
  const t = raw.trim().replace(/%/g, '')
  if (!t) return null
  const n = Number.parseFloat(t)
  if (!Number.isFinite(n) || n <= 0) return null
  return clampSlippageBps(Math.round(n * 100))
}

/** Safer defaults by chain + token class (native/native generally needs wider tolerance). */
export function defaultSlippageBpsByContext(params: {
  chainId?: number
  sellIsNative: boolean
  buyIsNative: boolean
}): number {
  const { chainId, sellIsNative, buyIsNative } = params
  const isBaseChain = chainId === 8453
  if (sellIsNative && buyIsNative) return isBaseChain ? 35 : 50
  if (sellIsNative || buyIsNative) return 50
  return isBaseChain ? 30 : 40
}
