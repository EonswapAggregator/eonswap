import { createPublicClient, http } from 'viem'

import { getEonChain } from './chains'

export function createEonPublicClient(chainId: number) {
  const chain = getEonChain(chainId)
  if (!chain) throw new Error(`Unsupported chain: ${chainId}`)

  const rpcUrl = chain.rpcUrls.default.http[0]
  if (!rpcUrl) throw new Error(`No RPC URL configured for chain: ${chainId}`)

  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  })
}

export function getEonMulticallSnapshot(chainId: number) {
  const chain = getEonChain(chainId)
  if (!chain) return null

  const multicall3 = chain.contracts?.multicall3
  if (!multicall3?.address) return null

  return {
    address: multicall3.address,
    blockCreated: multicall3.blockCreated ?? null,
  }
}
