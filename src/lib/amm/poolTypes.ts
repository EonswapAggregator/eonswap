import type { Address } from 'viem'

/** Pool data fetched from on-chain EonAmmFactory + EonAmmPair */
export type EonAmmPool = {
  /** Pair contract address */
  address: Address
  /** Token0 address (sorted) */
  token0: Address
  /** Token1 address (sorted) */
  token1: Address
  /** Token0 symbol */
  symbol0: string
  /** Token1 symbol */
  symbol1: string
  /** Token0 decimals */
  decimals0: number
  /** Token1 decimals */
  decimals1: number
  /** Reserve0 as bigint */
  reserve0: bigint
  /** Reserve1 as bigint */
  reserve1: bigint
  /** Total LP token supply */
  totalSupply: bigint
  /** Last block timestamp of reserves update */
  blockTimestampLast: number
  /** TVL in USD (calculated from reserves) */
  tvlUsd: number
  /** 24h volume in USD (from events or API) */
  volume24hUsd?: number
  /** Estimated APR based on trading fees */
  aprEstimate?: number
}

/** User's position in a pool */
export type EonAmmUserPosition = {
  /** Pool address */
  poolAddress: Address
  /** User's LP token balance */
  lpBalance: bigint
  /** User's share of pool (0-1) */
  shareOfPool: number
  /** User's share of token0 */
  token0Amount: bigint
  /** User's share of token1 */
  token1Amount: bigint
  /** USD value of user's position */
  valueUsd: number
}

/** Add liquidity params */
export type AddLiquidityParams = {
  tokenA: Address
  tokenB: Address
  amountADesired: bigint
  amountBDesired: bigint
  amountAMin: bigint
  amountBMin: bigint
  to: Address
  deadline: bigint
}

/** Add liquidity with ETH params */
export type AddLiquidityETHParams = {
  token: Address
  amountTokenDesired: bigint
  amountTokenMin: bigint
  amountETHMin: bigint
  to: Address
  deadline: bigint
  value: bigint // ETH to send
}

/** Remove liquidity params */
export type RemoveLiquidityParams = {
  tokenA: Address
  tokenB: Address
  liquidity: bigint
  amountAMin: bigint
  amountBMin: bigint
  to: Address
  deadline: bigint
}

/** Remove liquidity ETH params */
export type RemoveLiquidityETHParams = {
  token: Address
  liquidity: bigint
  amountTokenMin: bigint
  amountETHMin: bigint
  to: Address
  deadline: bigint
}
