import { getAddress, type Address } from 'viem'
import { base } from 'viem/chains'

import { EON_BASE_MAINNET } from '../eonBaseMainnet'
import { tokensForChain } from '../tokens'

export const EON_AMM_TIMEOUT_MS = 15_000

/** Known routers from `eon-protocol/deployments` — used when API omits routerAddress. */
export const EON_AMM_ROUTER_FALLBACK: Partial<Record<number, Address>> = {
  [base.id]: EON_BASE_MAINNET.amm.router,
}

/** Known factories from `eon-protocol/deployments`. */
export const EON_AMM_FACTORY: Partial<Record<number, Address>> = {
  [base.id]: EON_BASE_MAINNET.amm.factory,
}

export function eonAmmApiBaseUrl(): string {
  return (import.meta.env.VITE_EON_AMM_API_BASE_URL ?? '').trim().replace(/\/$/, '')
}

export function isEonAmmApiConfigured(): boolean {
  return eonAmmApiBaseUrl().length > 0
}

export function eonAmmClientHeaders(): HeadersInit {
  const key = import.meta.env.VITE_EON_AMM_API_KEY?.trim()
  const h: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  if (key) h.Authorization = `Bearer ${key}`
  return h
}

export function pickRouter(chainId: number, fromQuote?: string): Address {
  const q = fromQuote?.trim()
  if (q?.startsWith('0x') && q.length >= 42) {
    return q as Address
  }
  const fb = EON_AMM_ROUTER_FALLBACK[chainId]
  if (fb) return fb
  throw new Error('Eon AMM quote did not include routerAddress and no fallback is configured.')
}

export function chainWrappedNative(chainId: number): Address {
  const wrapped = tokensForChain(chainId).find((t) => t.symbol.toUpperCase() === 'WETH')
  if (!wrapped) {
    throw new Error(`No wrapped native token configured for chain ${chainId}.`)
  }
  return getAddress(wrapped.address)
}
