import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getRedisJson, isRedisCacheConfigured, setRedisJson } from '../lib/serverRedisCache'

const COINGECKO_API = 'https://api.coingecko.com/api/v3'

// Token address → CoinGecko ID mapping
const TOKEN_TO_COINGECKO: Record<string, string> = {
  // Native ETH
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'ethereum',
  // WETH on Base
  '0x4200000000000000000000000000000000000006': 'ethereum',
  // USDC on Base
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'usd-coin',
  // USDbC (bridged USDC)
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

type PriceCacheEntry = { price: number; timestamp: number }

const PRICE_CACHE_NAMESPACE = 'eonswap:prices:v1'
// Shared memory cache for warm instances; Redis extends this across instances.
const priceCache = new Map<string, PriceCacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_TTL_SECONDS = Math.floor(CACHE_TTL_MS / 1000)

function buildCacheKey(id: string, vsCurrency: string): string {
  return `${PRICE_CACHE_NAMESPACE}:${vsCurrency}:${id}`
}

function isFresh(entry: PriceCacheEntry | null | undefined, now: number): entry is PriceCacheEntry {
  return Boolean(entry && now - entry.timestamp < CACHE_TTL_MS)
}

/**
 * GET /api/prices
 * Get token prices in USD
 * 
 * Query params:
 * - tokens: Comma-separated token addresses or symbols
 * - vs: Currency (default: usd)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { tokens, vs = 'usd' } = req.query
  const vsCurrency = String(vs).toLowerCase()

  if (!tokens) {
    return res.status(400).json({
      error: 'Missing required parameter: tokens',
      example: '/api/prices?tokens=ETH,USDC',
      examples: [
        '/api/prices?tokens=ETH,USDC',
        '/api/prices?tokens=0x4200000000000000000000000000000000000006',
      ],
    })
  }

  const tokenList = String(tokens)
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)

  if (tokenList.length === 0) {
    return res.status(400).json({ error: 'No valid tokens provided' })
  }

  if (tokenList.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 tokens per request' })
  }

  try {
    // Map tokens to CoinGecko IDs
    const coingeckoIds = new Set<string>()
    const tokenToId = new Map<string, string>()

    for (const token of tokenList) {
      let id: string | undefined

      // Check if it's an address
      if (token.startsWith('0x')) {
        id = TOKEN_TO_COINGECKO[token]
      } else {
        // Try as symbol
        id = SYMBOL_TO_COINGECKO[token.toUpperCase()]
      }

      if (id) {
        coingeckoIds.add(id)
        tokenToId.set(token, id)
      }
    }

    if (coingeckoIds.size === 0) {
      return res.status(400).json({
        error: 'No supported tokens found',
        supported: Object.keys(SYMBOL_TO_COINGECKO),
      })
    }

    // Check cache first
    const now = Date.now()
    const prices: Record<string, number> = {}
    const idsToFetch: string[] = []
    let cacheStatus = isRedisCacheConfigured() ? 'MISS' : 'LOCAL_ONLY'

    for (const id of coingeckoIds) {
      const cacheKey = buildCacheKey(id, vsCurrency)
      const cached = priceCache.get(cacheKey)
      if (isFresh(cached, now)) {
        prices[id] = cached.price
        cacheStatus = cacheStatus === 'MISS' ? 'LOCAL_HIT' : cacheStatus
      } else {
        const redisCached = await getRedisJson<PriceCacheEntry>(cacheKey)
        if (isFresh(redisCached, now)) {
          prices[id] = redisCached.price
          priceCache.set(cacheKey, redisCached)
          cacheStatus = 'REDIS_HIT'
        } else {
          idsToFetch.push(id)
        }
      }
    }

    // Fetch missing prices from CoinGecko
    if (idsToFetch.length > 0) {
      const freshPrices = await fetchCoinGeckoPrices(idsToFetch, vsCurrency)
      
      await Promise.all(Object.entries(freshPrices).map(async ([id, price]) => {
        prices[id] = price
        const entry = { price, timestamp: now }
        const cacheKey = buildCacheKey(id, vsCurrency)
        priceCache.set(cacheKey, entry)
        await setRedisJson(cacheKey, entry, CACHE_TTL_SECONDS)
      }))
    }

    res.setHeader('X-Cache', cacheStatus)

    // Build response with original token identifiers
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

    return res.status(200).json({
      data: result,
      timestamp: new Date().toISOString(),
      source: 'coingecko',
    })
  } catch (error) {
    console.error('Prices error:', error)
    return res.status(500).json({
      error: 'Failed to fetch prices',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CoinGecko API
// ─────────────────────────────────────────────────────────────────────────────

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
