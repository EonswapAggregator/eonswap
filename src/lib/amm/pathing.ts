import { getAddress, type Address } from 'viem'

import { isNativeToken } from '../tokens'
import { chainWrappedNative } from './config'

export function toRouterToken(addr: string, chainId: number): Address {
  if (isNativeToken(addr)) return chainWrappedNative(chainId)
  return getAddress(addr)
}

export function routePath(tokenIn: string, tokenOut: string, chainId: number): Address[] {
  const weth = chainWrappedNative(chainId)
  const inAddr = toRouterToken(tokenIn, chainId)
  const outAddr = toRouterToken(tokenOut, chainId)
  if (inAddr === outAddr) throw new Error('Sell and buy token are identical.')
  if (inAddr === weth || outAddr === weth) return [inAddr, outAddr]
  return [inAddr, weth, outAddr]
}
