import { base } from 'viem/chains'

import { EON_BASE_MAINNET } from './eonBaseMainnet'

/** Native token sentinel used by EVM swap adapters. */
export const NATIVE_AGGREGATOR =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as const

export type Token = {
  address: string
  symbol: string
  name: string
  decimals: number
}

const N = NATIVE_AGGREGATOR

export const TOKENS_BY_CHAIN: Record<number, Token[]> = {
  [base.id]: [
    { address: N, symbol: 'ETH', name: 'Ether', decimals: 18 },
    {
      address: EON_BASE_MAINNET.amm.weth,
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
    },
    {
      address: EON_BASE_MAINNET.token.address,
      symbol: EON_BASE_MAINNET.token.symbol,
      name: EON_BASE_MAINNET.token.name,
      decimals: 18,
    },
    {
      address: EON_BASE_MAINNET.extraRewardToken.address,
      symbol: EON_BASE_MAINNET.extraRewardToken.symbol,
      name: EON_BASE_MAINNET.extraRewardToken.name,
      decimals: 18,
    },
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    },
  ],
}

export const MAINNET_TOKENS = TOKENS_BY_CHAIN[base.id]!

export function tokensForChain(chainId: number): Token[] {
  return TOKENS_BY_CHAIN[chainId] ?? MAINNET_TOKENS
}

export function isNativeToken(address: string): boolean {
  return address.toLowerCase() === NATIVE_AGGREGATOR.toLowerCase()
}

export function tokenByAddress(chainId: number, addr: string): Token | undefined {
  const a = addr.toLowerCase()
  return tokensForChain(chainId).find((t) => t.address.toLowerCase() === a)
}

/** @deprecated use NATIVE_AGGREGATOR */
export const NATIVE_0X = NATIVE_AGGREGATOR
