import type { Address } from 'viem'
import { EON_BASE_MAINNET } from '../eonBaseMainnet'

/**
 * MasterChef contract addresses by chainId
 */
export const EON_MASTER_CHEF: Record<number, Address> = {
  [EON_BASE_MAINNET.chainId]: EON_BASE_MAINNET.farm.masterChef,
}

/**
 * Reward token (ESTF) addresses by chainId
 */
export const EON_REWARD_TOKEN: Record<number, Address> = {
  [EON_BASE_MAINNET.chainId]: EON_BASE_MAINNET.token.address,
}

/**
 * Extra reward token (ESR) addresses by chainId
 */
export const EON_EXTRA_REWARD_TOKEN: Record<number, Address> = {
  [EON_BASE_MAINNET.chainId]: EON_BASE_MAINNET.extraRewardToken.address,
}

/**
 * Get MasterChef address for a chain
 */
export function getMasterChefAddress(chainId: number): Address | null {
  return EON_MASTER_CHEF[chainId] ?? null
}
