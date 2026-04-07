import { formatUnits, parseUnits } from 'viem'

/** Fractional digits shown after `.` for token amounts and balances in the UI */
export const BALANCE_FRACTION_DIGITS = 8

/**
 * Format a wei amount with exactly `fractionDigits` digits after the decimal
 * point (truncate excess; pad with zeros).
 */
export function formatTokenAmountUi(
  value: bigint,
  decimals: number,
  fractionDigits: number = BALANCE_FRACTION_DIGITS,
): string {
  const s = formatUnits(value, decimals)
  const neg = s.startsWith('-')
  const abs = neg ? s.slice(1) : s
  const [whole, frac = ''] = abs.split('.')
  const pad = '0'.repeat(fractionDigits)
  const fracFixed = (frac + pad).slice(0, fractionDigits)
  const out = `${whole}.${fracFixed}`
  return neg ? `-${out}` : out
}

/** Wallet / token balance label (fixed fractional width). */
export function formatBalanceLabel(
  value: bigint,
  decimals: number,
  fractionDigits: number = BALANCE_FRACTION_DIGITS,
): string {
  return formatTokenAmountUi(value, decimals, fractionDigits)
}

/** Fill swap input with wallet balance using the same fractional format. */
export function formatMaxSellInput(
  value: bigint,
  decimals: number,
  fractionDigits: number = BALANCE_FRACTION_DIGITS,
): string {
  return formatTokenAmountUi(value, decimals, fractionDigits)
}

/**
 * Parse a decimal string with `decimals` token decimals; return UI-fixed
 * string, or `null` if invalid.
 */
export function formatParsedAmountInput(
  raw: string,
  decimals: number,
  fractionDigits: number = BALANCE_FRACTION_DIGITS,
): string | null {
  const t = raw.trim()
  if (!t) return null
  try {
    const w = parseUnits(t, decimals)
    return formatTokenAmountUi(w, decimals, fractionDigits)
  } catch {
    return null
  }
}

export function truncateAddress(addr: string, left = 6, right = 4): string {
  if (!addr || addr.length < left + right + 2) return addr
  return `${addr.slice(0, left)}…${addr.slice(-right)}`
}
