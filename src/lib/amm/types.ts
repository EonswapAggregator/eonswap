import type { Address } from 'viem'

export type EonAmmQuote = {
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  routeId: string
  routerAddress: Address
  amountInUsd?: string
  amountOutUsd?: string
  gasUsd?: string
  /** Estimated price impact percentage. */
  priceImpact?: string
  /** Opaque payload from API route quote. */
  buildPayload?: Record<string, unknown>
}

export type EonAmmBuildResult = {
  routerAddress: Address
  data: `0x${string}`
  transactionValue: string
  gas: string
}

export type EonAmmQuoteParams = {
  chainId: number
  tokenIn: string
  tokenOut: string
  amountIn: string
  sender?: string
}

export type EonAmmBuildParams = {
  chainId: number
  quote: EonAmmQuote
  sender: string
  recipient: string
  slippageToleranceBps: number
  /** Transaction deadline in minutes. */
  deadlineMinutes: number
}
