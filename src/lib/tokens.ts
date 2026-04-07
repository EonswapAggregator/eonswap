import { arbitrum, base, bsc, mainnet, optimism, polygon } from 'viem/chains'

/** Native token sentinel for Kyber / EVM aggregators */
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
  [mainnet.id]: [
    { address: N, symbol: 'ETH', name: 'Ether', decimals: 18 },
    {
      address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      symbol: 'DAI',
      name: 'Dai Stablecoin',
      decimals: 18,
    },
    {
      address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    },
  ],
  [arbitrum.id]: [
    { address: N, symbol: 'ETH', name: 'Ether', decimals: 18 },
    {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
    },
    {
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    },
    {
      address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
      symbol: 'WBTC',
      name: 'Wrapped BTC',
      decimals: 8,
    },
  ],
  [base.id]: [
    { address: N, symbol: 'ETH', name: 'Ether', decimals: 18 },
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
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
  [optimism.id]: [
    { address: N, symbol: 'ETH', name: 'Ether', decimals: 18 },
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
    },
    {
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    },
  ],
  [polygon.id]: [
    { address: N, symbol: 'POL', name: 'Polygon', decimals: 18 },
    {
      address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
    },
    {
      address: '0x3c499c542cEF5E3811e1192ce70d8e03C23edb7d',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
    },
  ],
  [bsc.id]: [
    { address: N, symbol: 'BNB', name: 'BNB', decimals: 18 },
    {
      address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      symbol: 'WBNB',
      name: 'Wrapped BNB',
      decimals: 18,
    },
    {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
    },
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 18,
    },
  ],
}

export const MAINNET_TOKENS = TOKENS_BY_CHAIN[mainnet.id]!

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
