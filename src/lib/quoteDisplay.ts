/** Price impact from Kyber USD notionals: how much less $ you receive vs pay. */
export function priceImpactPercentFromUsd(
  amountInUsd: string,
  amountOutUsd: string,
): number | null {
  const a = Number.parseFloat(amountInUsd)
  const b = Number.parseFloat(amountOutUsd)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0) return null
  return ((a - b) / a) * 100
}

export function formatPriceImpactLabel(
  amountInUsd: string,
  amountOutUsd: string,
): string | null {
  const impact = priceImpactPercentFromUsd(amountInUsd, amountOutUsd)
  if (impact == null) return null
  const v = Math.max(0, impact)
  if (v < 0.005) return '<0.01%'
  if (v < 0.1) return `${v.toFixed(2)}%`
  return `${v.toFixed(2)}%`
}

export function formatUsdApprox(value: string): string | null {
  const n = Number.parseFloat(value)
  if (!Number.isFinite(n) || n < 0) return null
  if (n < 0.0001) return '<$0.0001'
  if (n < 0.01) return `~$${n.toFixed(4)}`
  if (n < 1) return `~$${n.toFixed(3)}`
  if (n < 1000) return `~$${n.toFixed(2)}`
  return `~$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function totalNetworkFeeUsd(gasUsd: string, l1FeeUsd?: string): string {
  const g = Number.parseFloat(gasUsd) || 0
  const l1 = l1FeeUsd ? Number.parseFloat(l1FeeUsd) || 0 : 0
  const t = g + l1
  return String(t)
}
