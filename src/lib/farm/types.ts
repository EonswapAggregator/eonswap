import type { Address } from 'viem'

/**
 * Farm pool information from MasterChef contract
 */
export interface EonFarmPool {
  pid: number
  lpToken: Address
  allocPoint: bigint
  lastRewardTime: bigint
  accEonPerShare: bigint
  rewarder: Address | null
  // Derived info
  lpSymbol0: string
  lpSymbol1: string
  lpDecimals: number
  totalStaked: bigint
  // Token addresses for logo display
  token0Address: Address
  token1Address: Address
  // Emission info
  eonPerSecond: bigint
  poolShare: number // allocPoint / totalAllocPoint
  aprEstimate: number // Estimated APR as decimal (e.g., 0.15 = 15%)
}

/**
 * User's position in a farm pool
 */
export interface EonFarmUserPosition {
  pid: number
  stakedAmount: bigint
  pendingEon: bigint
  pendingExtraRewards: {
    token: Address
    amount: bigint
    symbol: string
  }[]
  stakedValueUsd: number
  pendingValueUsd: number
}

/**
 * Farm action types
 */
export type FarmAction = 'deposit' | 'withdraw' | 'harvest' | 'emergency-withdraw'

/**
 * MasterChef global state
 */
export interface MasterChefState {
  eonToken: Address
  eonPerSecond: bigint
  totalAllocPoint: bigint
  startTime: bigint
  paused: boolean
}
