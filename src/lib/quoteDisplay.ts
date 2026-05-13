/** Price impact from route USD notionals: how much less $ you receive vs pay. */
export function priceImpactPercentFromUsd(
  amountInUsd: string,
  amountOutUsd: string,
): number | null {
  const a = Number.parseFloat(amountInUsd)
  const b = Number.parseFloat(amountOutUsd)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0) return null
  return ((a - b) / a) * 100
}

/** Calculate price impact from token amounts (decimal-normalized).
 * This works for any token pair regardless of whether USD prices are available.
 * Price impact = deviation from no-slippage price due to liquidity depletion
 * Fee (~0.3%) is NOT included in price impact, only execution slippage
 */
export function priceImpactPercentFromAmounts(
  amountIn: string,
  amountOut: string,
  decimalsIn: number,
  decimalsOut: number,
): number | null {
  try {
    const inBig = BigInt(amountIn)
    const outBig = BigInt(amountOut)
    if (inBig <= 0n || outBig <= 0n) return null
    
    // Normalize both to same decimal for fair ratio
    const inNormalized = Number(inBig) * Math.pow(10, Math.max(0, decimalsOut - decimalsIn))
    const outNormalized = Number(outBig)
    
    // Price impact should be 0% if we're getting the expected amount
    // For Uniswap v2 with 0.3% fee: expectedOut = amountIn * 0.997 in same units
    // If output < expectedOut, there's additional slippage beyond the fee
    
    const feeRate = 0.003 // 0.3% for Uniswap v2
    const feeAdjustedInput = inNormalized * (1 - feeRate)
    
    // Price impact = (expectedOutput - actualOutput) / expectedOutput * 100
    // If actualOutput >= expectedOutput, impact = 0 (shouldn't happen, but...)
    const impact = Math.max(0, (feeAdjustedInput - outNormalized) / feeAdjustedInput * 100)
    
    return Number.isFinite(impact) ? impact : null
  } catch {
    return null
  }
}

export function parsePriceImpactPercent(value: string): number | null {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function priceImpactLabelFromPercent(value: number): string {
  const v = Math.max(0, value)
  if (v < 0.005) return '<0.01%'
  return `${v.toFixed(2)}%`
}

export function formatPriceImpactLabel(
  amountInUsd: string,
  amountOutUsd: string,
): string | null {
  const impact = priceImpactPercentFromUsd(amountInUsd, amountOutUsd)
  if (impact == null) return null
  return priceImpactLabelFromPercent(impact)
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
