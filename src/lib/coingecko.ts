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

export function coingeckoIdForSymbol(symbol: string): string | null {
  return SYMBOL_TO_ID[symbol.trim().toUpperCase()] ?? null
}

export type MarketChartPoint = { t: number; price: number }

export async function fetchMarketChartUsd(
  coinId: string,
  days: 7 | 30 = 7,
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
