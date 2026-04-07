import { getAddress } from 'viem'
import { isNativeToken } from './tokens'

/**
 * Trust Wallet Assets — on-chain contract logos mirrored on GitHub.
 * @see https://github.com/trustwallet/assets
 */
const TW =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains'

/** Trust Wallet folder name per chain id */
const CHAIN_FOLDER: Record<number, string> = {
  1: 'ethereum',
  42161: 'arbitrum',
  8453: 'base',
  10: 'optimism',
  137: 'polygon',
  56: 'smartchain',
}

/**
 * Public URL for a token logo on the given chain.
 * Native token uses `info/logo.png`; ERC-20 uses `assets/{checksummed}/logo.png`.
 */
export function trustWalletTokenLogoUrl(
  chainId: number,
  tokenAddress: string,
): string | null {
  const folder = CHAIN_FOLDER[chainId]
  if (!folder) return null

  if (isNativeToken(tokenAddress)) {
    return `${TW}/${folder}/info/logo.png`
  }

  try {
    const checksummed = getAddress(tokenAddress)
    return `${TW}/${folder}/assets/${checksummed}/logo.png`
  } catch {
    return null
  }
}

export function isLogoChainSupported(chainId: number): boolean {
  return chainId in CHAIN_FOLDER
}
