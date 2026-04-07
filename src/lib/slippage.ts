/** Kyber `slippageTolerance`: same as basis points (100 = 1%). */
export const DEFAULT_SLIPPAGE_BPS = 50

export const SLIPPAGE_PRESETS_BPS = [10, 50, 100] as const

/** Clamp to a sane range for the UI (0.05% … 50%). */
export function clampSlippageBps(bps: number): number {
  if (!Number.isFinite(bps)) return DEFAULT_SLIPPAGE_BPS
  return Math.min(5000, Math.max(5, Math.round(bps)))
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
