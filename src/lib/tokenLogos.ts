import { getAddress } from 'viem'

import { isNativeToken, NATIVE_AGGREGATOR, tokensForChain, type Token } from './tokens'

/**
 * Trust Wallet Assets — on-chain contract logos mirrored on GitHub.
 * @see https://github.com/trustwallet/assets
 */
const TW =
  'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains'

/** Trust Wallet folder name per chain id */
const CHAIN_FOLDER: Record<number, string> = {
  8453: 'base',
}

/**
 * Files under `public/tokens/{0xaddress_lowercase}{ext}` — keyed by contract, not symbol.
 * JPEG / JPG are intentionally not used (policy).
 */
/** Kept in sync with `scripts/validate-token-logos.ts` (`public/tokens/`). PNG before WebP so `tokenDisplayLogoUrl` [0] matches shipped files. */
export const LOCAL_LOGO_EXTENSIONS = ['.png', '.webp', '.gif', '.svg', '.avif', '.ico'] as const

/** Stable lowercase key for native sentinel + all ERC-20s (42-char 0x + hex). */
export function logoFileKeyForAddress(tokenAddress: string): string | null {
  const raw = tokenAddress.trim()
  if (isNativeToken(raw)) {
    return NATIVE_AGGREGATOR.toLowerCase()
  }
  let a = raw.toLowerCase()
  if (!a.startsWith('0x')) return null
  try {
    a = getAddress(a).toLowerCase()
  } catch {
    if (!/^0x[0-9a-f]{40}$/.test(a)) return null
  }
  return a
}

function localPublicPathsForAddressKey(addrKey: string): string[] {
  const k = addrKey.trim().toLowerCase()
  if (!k) return []
  return LOCAL_LOGO_EXTENSIONS.map((ext) => `/tokens/${k}${ext}`)
}

/** JPEG/JPG and unsafe schemes are rejected for env-driven or external logos. */
export function isDisallowedLogoUrl(url: string): boolean {
  const u = url.trim().toLowerCase()
  if (!u) return true
  if (u.startsWith('javascript:') || u.startsWith('data:')) return true
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return true
  if (/\.(jpe?g)(\?|#|$)/i.test(u)) return true
  return false
}

function isAllowedLogoUrl(url: string): boolean {
  const t = url.trim()
  if (!t || isDisallowedLogoUrl(t)) return false
  if (t.startsWith('/')) return true
  return /^https?:\/\//i.test(t)
}

/**
 * Optional `VITE_TOKEN_LOGO_0x{40_hex_lowercase}` — full URL or site path.
 * Example: `VITE_TOKEN_LOGO_0x7bd09674b3c721e35973993d5b6a79cda7da9c7f=https://cdn.example/estf.webp`
 */
function viteTokenLogoOverrideForAddress(addrKey: string): string | null {
  const key = `VITE_TOKEN_LOGO_${addrKey.toLowerCase()}`
  const raw = String((import.meta.env as Record<string, unknown>)[key] ?? '').trim()
  if (!raw) return null
  if (!isAllowedLogoUrl(raw)) return null
  return raw
}

/**
 * Ordered logo URLs: env override by **contract address**, then `public/tokens/0x….ext`.
 */
export function publicTokenLogoCandidates(
  _chainId: number,
  token: Pick<Token, 'address'>,
): string[] {
  const addrKey = logoFileKeyForAddress(token.address)
  if (!addrKey) return []

  const fromEnv = viteTokenLogoOverrideForAddress(addrKey)
  const fromDisk = localPublicPathsForAddressKey(addrKey)
  const out: string[] = []
  const seen = new Set<string>()
  const push = (u: string | null | undefined) => {
    if (!u) return
    const x = u.trim()
    if (!x || seen.has(x)) return
    seen.add(x)
    out.push(x)
  }
  push(fromEnv)
  for (const p of fromDisk) push(p)
  return out
}

/** @deprecated Prefer `publicTokenLogoCandidates`; first match for simple callers. */
export function publicTokenLogoUrl(
  chainId: number,
  token: Pick<Token, 'address'>,
): string | null {
  return publicTokenLogoCandidates(chainId, token)[0] ?? null
}

function dedupeUrls(urls: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const u of urls) {
    if (!u) continue
    const x = u.trim()
    if (!x || seen.has(x)) continue
    seen.add(x)
    out.push(x)
  }
  return out
}

/** All image sources to try: address-keyed public/env logos, then Trust Wallet. */
export function tokenLogoCandidateUrls(chainId: number, token: Token): string[] {
  return dedupeUrls([
    ...publicTokenLogoCandidates(chainId, token),
    trustWalletTokenLogoUrl(chainId, token.address),
  ])
}

/**
 * URLs for the **chain** row in a network switcher: Trust Wallet `info/logo.png` first (correct per chainId),
 * then the same fallbacks as the native gas token (`tokenLogoCandidateUrls`).
 */
export function switchNetworkLogoCandidates(chainId: number): string[] {
  const native = tokensForChain(chainId)[0]
  if (!native) return []
  const tw = trustWalletTokenLogoUrl(chainId, native.address)
  const rest = tokenLogoCandidateUrls(chainId, native)
  if (!tw) return rest
  return dedupeUrls([tw, ...rest.filter((u) => u !== tw)])
}

export function tokenDisplayLogoUrl(chainId: number, token: Token): string | null {
  return tokenLogoCandidateUrls(chainId, token)[0] ?? null
}

/** Chain native (first entry in `tokensForChain` is ETH-style sentinel token). */
export function nativeChainDisplayLogoUrl(chainId: number): string | null {
  const native = tokensForChain(chainId)[0]
  return native ? tokenDisplayLogoUrl(chainId, native) : null
}

/**
 * Trust Wallet public URL for a token logo on the given chain.
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
