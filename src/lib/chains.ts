import { arbitrum, base, bsc, mainnet, optimism, polygon } from 'viem/chains'

/** Networks enabled in the app (RainbowKit + Kyber routes) */
const ethereumChain = { ...mainnet, name: 'Ethereum', shortName: 'Ethereum' }
const bnbSmartChain = { ...bsc, name: 'BNB Smart Chain', shortName: 'BNB Smart Chain' }
const arbitrumOne = { ...arbitrum, name: 'Arbitrum One', shortName: 'Arbitrum One' }
const baseChain = { ...base, name: 'Base', shortName: 'Base' }
const polygonPos = { ...polygon, name: 'Polygon PoS', shortName: 'Polygon PoS' }
const opMainnet = { ...optimism, name: 'OP Mainnet', shortName: 'OP Mainnet' }

export const eonChains = [
  ethereumChain,
  bnbSmartChain,
  arbitrumOne,
  baseChain,
  polygonPos,
  opMainnet,
] as const

export type EonChain = (typeof eonChains)[number]

export const EON_CHAIN_IDS = new Set<number>(eonChains.map((c) => c.id))

/** Kyber Aggregator API path segment per chain */
export const KYBER_CHAIN_SLUG: Record<number, string> = {
  [mainnet.id]: 'ethereum',
  [bsc.id]: 'bsc',
  [polygon.id]: 'polygon',
  [arbitrum.id]: 'arbitrum',
  [optimism.id]: 'optimism',
  [base.id]: 'base',
}

export function isSupportedChain(chainId: number | undefined): chainId is number {
  return chainId != null && EON_CHAIN_IDS.has(chainId)
}

export function getEonChain(chainId: number): EonChain | undefined {
  return eonChains.find((c) => c.id === chainId)
}

/** Block explorer base URL for transaction paths */
export const EXPLORER_TX_PREFIX: Record<number, string> = {
  [mainnet.id]: 'https://etherscan.io/tx/',
  [arbitrum.id]: 'https://arbiscan.io/tx/',
  [base.id]: 'https://basescan.org/tx/',
  [optimism.id]: 'https://optimistic.etherscan.io/tx/',
  [polygon.id]: 'https://polygonscan.com/tx/',
  [bsc.id]: 'https://bscscan.com/tx/',
}

export function explorerTxUrl(chainId: number, txHash: string): string | null {
  const prefix = EXPLORER_TX_PREFIX[chainId]
  if (!prefix) return null
  return `${prefix}${txHash}`
}
