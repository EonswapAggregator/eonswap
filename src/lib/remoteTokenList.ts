import { EON_CHAIN_IDS } from './chains'
import { NATIVE_AGGREGATOR, tokensForChain, type Token } from './tokens'

type OneInchRow = {
  chainId: number
  symbol: string
  name: string
  address: string
  decimals: number
}

/** Public per-chain token map — Kyber has no “list all tokens”; this backs the selector catalog. */
export async function fetch1inchTokenList(chainId: number): Promise<Token[]> {
  if (!EON_CHAIN_IDS.has(chainId)) {
    return tokensForChain(chainId)
  }

  const res = await fetch(`https://tokens.1inch.io/v1.2/${chainId}`)
  if (!res.ok) {
    throw new Error(`Token list failed (${res.status})`)
  }

  const raw = (await res.json()) as Record<string, OneInchRow>
  const nativeLc = NATIVE_AGGREGATOR.toLowerCase()
  const out: Token[] = []

  for (const row of Object.values(raw)) {
    if (row.chainId !== chainId) continue
    const addr = row.address
    if (!addr || addr.toLowerCase() === nativeLc) continue
    const sym = row.symbol?.trim()
    if (!sym) continue
    out.push({
      address: addr,
      symbol: sym,
      name: row.name?.trim() || sym,
      decimals: row.decimals,
    })
  }

  return out
}

/** Native + curated seeds first, then remote tokens sorted by symbol; deduped by address. */
export function mergeTokenCatalog(chainId: number, remote: Token[] | undefined): Token[] {
  const seeds = tokensForChain(chainId)
  const seen = new Set<string>()
  const ordered: Token[] = []

  for (const t of seeds) {
    const k = t.address.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    ordered.push(t)
  }

  const rest: Token[] = []
  for (const t of remote ?? []) {
    const k = t.address.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    rest.push(t)
  }
  rest.sort((a, b) => a.symbol.localeCompare(b.symbol))
  return ordered.concat(rest)
}
