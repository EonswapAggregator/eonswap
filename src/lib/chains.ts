import { base } from 'viem/chains'

/** Networks enabled in the app: Base mainnet only */
const baseChain = { ...base, name: 'Base', shortName: 'Base' }

export const eonChains = [baseChain] as const

export const eonBridgeChains = eonChains
export const EON_LLAMA_CHAIN_IDS = new Set<number>([base.id])
export const eonEarnChains = eonChains

export type EonChain = (typeof eonChains)[number]

export const EON_CHAIN_IDS = new Set<number>(eonChains.map((c) => c.id))

export function isSupportedChain(chainId: number | undefined): chainId is number {
  return chainId != null && EON_CHAIN_IDS.has(chainId)
}

/** Swap uses Eon AMM on Base mainnet only */
export function isEonAmmSwapChain(chainId: number): boolean {
  return chainId === base.id
}

export function getEonChain(chainId: number): EonChain | undefined {
  return eonChains.find((c) => c.id === chainId)
}

/** Block explorer base URL for transaction paths */
export const EXPLORER_TX_PREFIX: Record<number, string> = {
  [base.id]: 'https://basescan.org/tx/',
}

export function explorerTxUrl(chainId: number, txHash: string): string | null {
  const prefix = EXPLORER_TX_PREFIX[chainId]
  if (!prefix) return null
  return `${prefix}${txHash}`
}
