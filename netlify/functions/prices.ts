import type { Handler, HandlerEvent } from '@netlify/functions'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

// Token address → CoinGecko ID mapping
const TOKEN_TO_COINGECKO: Record<string, string> = {
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'ethereum',
  '0x4200000000000000000000000000000000000006': 'ethereum',
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'usd-coin',
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': 'usd-coin',
}

// Symbol → CoinGecko ID
const SYMBOL_TO_COINGECKO: Record<string, string> = {
  ETH: 'ethereum',
  WETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WBTC: 'wrapped-bitcoin',
}

// Cache for prices (5 minute TTL)
const priceCache = new Map<string, { price: number; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
}

/**
 * GET /api/prices
 * Get token prices in USD
 */
export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  const params = event.queryStringParameters || {}
  const tokens = params.tokens
  const vsCurrency = (params.vs || 'usd').toLowerCase()

  if (!tokens) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Missing required parameter: tokens',
        example: '/api/prices?tokens=ETH,USDC',
        examples: [
          '/api/prices?tokens=ETH,USDC',
          '/api/prices?tokens=0x4200000000000000000000000000000000000006',
        ],
      }),
    }
  }

  const tokenList = tokens
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  if (tokenList.length === 0) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'No valid tokens provided' }),
    }
  }

  if (tokenList.length > 10) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Maximum 10 tokens per request' }),
    }
  }

  try {
    const coingeckoIds = new Set<string>()
    const tokenToId = new Map<string, string>()

    for (const token of tokenList) {
      let id: string | undefined

      if (token.startsWith('0x')) {
        id = TOKEN_TO_COINGECKO[token]
      } else {
        id = SYMBOL_TO_COINGECKO[token.toUpperCase()]
      }

      if (id) {
        coingeckoIds.add(id)
        tokenToId.set(token, id)
      }
    }

    if (coingeckoIds.size === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No supported tokens found',
          supported: Object.keys(SYMBOL_TO_COINGECKO),
        }),
      }
    }

    const now = Date.now()
    const prices: Record<string, number> = {}
    const idsToFetch: string[] = []

    for (const id of coingeckoIds) {
      const cacheKey = `${id}:${vsCurrency}`
      const cached = priceCache.get(cacheKey)
      if (cached && now - cached.timestamp < CACHE_TTL) {
        prices[id] = cached.price
      } else {
        idsToFetch.push(id)
      }
    }

    if (idsToFetch.length > 0) {
      const freshPrices = await fetchCoinGeckoPrices(idsToFetch, vsCurrency)

      for (const [id, price] of Object.entries(freshPrices)) {
        prices[id] = price
        priceCache.set(`${id}:${vsCurrency}`, { price, timestamp: now })
      }
    }

    const result: Record<string, { price: number; currency: string }> = {}

    for (const token of tokenList) {
      const id = tokenToId.get(token)
      if (id && prices[id] !== undefined) {
        result[token] = {
          price: prices[id],
          currency: vsCurrency.toUpperCase(),
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: result,
        timestamp: new Date().toISOString(),
        source: 'coingecko',
      }),
    }
  } catch (error) {
    console.error('Prices error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    }
  }
}

async function fetchCoinGeckoPrices(
  ids: string[],
  vsCurrency: string
): Promise<Record<string, number>> {
  const url = `${COINGECKO_API}/simple/price?ids=${ids.join(',')}&vs_currencies=${vsCurrency}`

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`)
  }

  const data = await response.json()
  const result: Record<string, number> = {}

  for (const id of ids) {
    if (data[id]?.[vsCurrency]) {
      result[id] = data[id][vsCurrency]
    }
  }

  return result
}
