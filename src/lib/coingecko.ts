/** CoinGecko API ids for common swap tokens (symbol → id) */
const SYMBOL_TO_ID: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  WBTC: 'wrapped-bitcoin',
  BTC: 'bitcoin',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  BNB: 'binancecoin',
  WBNB: 'binancecoin',
  POL: 'matic-network',
  MATIC: 'matic-network',
}

/** Address-level mappings (lowercase) to improve pricing coverage per chain. */
const ADDRESS_TO_ID: Record<string, string> = {
  // Ethereum
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'ethereum',
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'ethereum',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'usd-coin',
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 'tether',
  '0x6b175474e89094c44da98b954eedeac495271d0f': 'dai',
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'wrapped-bitcoin',
  // Arbitrum
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'ethereum',
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'usd-coin',
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'tether',
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 'wrapped-bitcoin',
  // Base
  '0x4200000000000000000000000000000000000006': 'ethereum',
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'usd-coin',
  '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': 'tether',
  // Optimism
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': 'usd-coin',
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 'tether',
  // Polygon
  '0x3c499c542cef5e3811e1192ce70d8e03c23edb7d': 'usd-coin',
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 'tether',
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'ethereum',
  // BSC
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c': 'binancecoin',
  '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 'usd-coin',
  '0x55d398326f99059ff775485246999027b3197955': 'tether',
}

export function coingeckoIdForSymbol(symbol: string): string | null {
  return SYMBOL_TO_ID[symbol.trim().toUpperCase()] ?? null
}

export function coingeckoIdForToken(token: {
  symbol: string
  address?: string
}): string | null {
  const byAddress = token.address
    ? ADDRESS_TO_ID[token.address.trim().toLowerCase()]
    : null
  if (byAddress) return byAddress
  return coingeckoIdForSymbol(token.symbol)
}

export type MarketChartPoint = { t: number; price: number }

export async function fetchSimplePricesUsd(
  coinIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(coinIds.map((id) => id.trim()).filter(Boolean))]
  if (ids.length === 0) return {}

  const url = new URL('https://api.coingecko.com/api/v3/simple/price')
  url.searchParams.set('ids', ids.join(','))
  url.searchParams.set('vs_currencies', 'usd')

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}`)
  }
  const json = (await res.json()) as Record<string, { usd?: number }>
  const out: Record<string, number> = {}
  for (const id of ids) {
    const v = Number(json[id]?.usd ?? 0)
    if (Number.isFinite(v) && v > 0) out[id] = v
  }
  return out
}

export async function fetchMarketChartUsd(
  coinId: string,
  days: 7 | 30 | 90 = 7,
): Promise<MarketChartPoint[]> {
  const url = new URL(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`)
  url.searchParams.set('vs_currency', 'usd')
  url.searchParams.set('days', String(days))

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}`)
  }
  const data = (await res.json()) as { prices?: [number, number][] }
  const prices = data.prices
  if (!Array.isArray(prices) || prices.length === 0) return []
  return prices.map(([t, price]) => ({ t, price }))
}
